import uuid
from dataclasses import dataclass
from datetime import date, datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.accounting import Account
from app.models.expenses import Expense
from app.models.inventory import InventoryTransaction
from app.models.organization import Organization
from app.models.payments import Payment, PaymentAllocation
from app.models.product import Product
from app.models.purchases import Purchase, PurchaseItem
from app.models.supplier import Supplier
from app.money import cents_to_decimal, validate_currency_precision
from app.services.accounting.journal_service import JournalLineInput, create_and_post_journal_entry
from app.services.purchases_calc import (
    MAX_CENTS,
    MAX_QUANTITY,
    PurchaseError,
    allocate_supplier_payment,
    purchase_ledger_cents,
    purchase_total,
    weighted_average_cost,
)


@dataclass(frozen=True)
class PurchaseLineInput:
    product_id: uuid.UUID
    quantity: int
    unit_cost_cents: int


async def _purchase_by_key(db: AsyncSession, organization_id: uuid.UUID, key: str) -> Purchase | None:
    return await db.scalar(
        select(Purchase).where(
            Purchase.organization_id == organization_id,
            Purchase.idempotency_key == key,
        )
    )


async def _account_ids(db: AsyncSession, organization_id: uuid.UUID, codes: set[str]) -> dict[str, uuid.UUID]:
    rows = (
        await db.execute(
            select(Account.account_code, Account.id).where(
                Account.organization_id == organization_id,
                Account.account_code.in_(codes),
            )
        )
    ).all()
    found = {code: account_id for code, account_id in rows}
    if codes - found.keys():
        raise HTTPException(status_code=500, detail="Accounting is not set up for this business")
    return found


async def create_purchase(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    items: list[PurchaseLineInput],
    supplier_id: uuid.UUID | None,
    amount_paid_cents: int,
    payment_method: str | None,
    purchase_date: date | None,
    note: str | None,
    idempotency_key: str,
) -> tuple[Purchase, bool]:
    existing = await _purchase_by_key(db, organization_id, idempotency_key)
    if existing is not None:
        return existing, False

    org = await db.scalar(select(Organization).where(Organization.id == organization_id))
    try:
        validate_currency_precision(amount_paid_cents, org.currency_exponent)
        for item in items:
            validate_currency_precision(item.unit_cost_cents, org.currency_exponent)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    today = datetime.now(ZoneInfo(org.timezone or "UTC")).date()
    purchase_day = purchase_date or today
    if purchase_day > today:
        raise HTTPException(status_code=422, detail="The purchase date cannot be in the future")

    if supplier_id is not None:
        supplier_exists = await db.scalar(
            select(Supplier.id).where(
                Supplier.id == supplier_id,
                Supplier.organization_id == organization_id,
            )
        )
        if supplier_exists is None:
            raise HTTPException(status_code=404, detail="Supplier not found")

    if not items:
        raise HTTPException(status_code=422, detail="A purchase must contain at least one item")
    quantities: dict[uuid.UUID, int] = {}
    costs_by_product: dict[uuid.UUID, int] = {}
    try:
        for item in items:
            if item.quantity <= 0 or item.quantity > MAX_QUANTITY or item.unit_cost_cents < 0:
                raise PurchaseError("A purchase line is not valid")
            quantities[item.product_id] = quantities.get(item.product_id, 0) + item.quantity
            costs_by_product[item.product_id] = (
                costs_by_product.get(item.product_id, 0) + item.quantity * item.unit_cost_cents
            )
        if any(quantity > MAX_QUANTITY for quantity in quantities.values()):
            raise PurchaseError("The quantity for a product is too large")
        total_cents = purchase_total([(item.quantity, item.unit_cost_cents) for item in items])
    except PurchaseError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    if amount_paid_cents < 0 or amount_paid_cents > total_cents:
        raise HTTPException(status_code=422, detail="The paid amount cannot exceed the purchase total")
    if amount_paid_cents and payment_method is None:
        raise HTTPException(status_code=422, detail="A payment method is required when money is paid")
    if not amount_paid_cents and payment_method is not None:
        raise HTTPException(status_code=422, detail="A payment method is only valid when money is paid")
    if amount_paid_cents < total_cents and supplier_id is None:
        raise HTTPException(status_code=422, detail="A supplier is required for a purchase on credit")

    products = (
        await db.execute(
            select(Product)
            .where(
                Product.organization_id == organization_id,
                Product.id.in_(list(quantities)),
            )
            .order_by(Product.id)
            .with_for_update()
        )
    ).scalars().all()
    product_by_id = {product.id: product for product in products}
    if set(quantities) - set(product_by_id):
        raise HTTPException(status_code=404, detail="One or more products were not found")
    for product_id, quantity in quantities.items():
        product = product_by_id[product_id]
        if not product.is_active:
            raise HTTPException(status_code=409, detail=f"'{product.name}' is archived and cannot be purchased")
        stock = product.stock_quantity or 0
        if stock < 0 or stock + quantity > 2_147_483_647:
            raise HTTPException(status_code=409, detail=f"Stock cannot be increased for '{product.name}'")

    await db.execute(
        text("select pg_advisory_xact_lock(hashtextextended(:key, 0))"),
        {"key": f"purchase:{organization_id}"},
    )
    count = await db.scalar(
        select(func.count()).select_from(Purchase).where(Purchase.organization_id == organization_id)
    )
    purchase = Purchase(
        organization_id=organization_id,
        supplier_id=supplier_id,
        reference=f"P-{count + 1:06d}",
        purchase_date=purchase_day,
        status="received",
        total_cents=total_cents,
        amount_paid_cents=amount_paid_cents,
        note=note,
        created_by=user_id,
        idempotency_key=idempotency_key,
    )
    db.add(purchase)
    await db.flush()

    for item in items:
        db.add(
            PurchaseItem(
                purchase_id=purchase.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_cost_cents=item.unit_cost_cents,
            )
        )
    for product_id, quantity in quantities.items():
        product = product_by_id[product_id]
        try:
            product.cost_price_cents = weighted_average_cost(
                product.stock_quantity or 0,
                product.cost_price_cents or 0,
                quantity,
                costs_by_product[product_id],
            )
        except PurchaseError as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        product.stock_quantity = (product.stock_quantity or 0) + quantity
        db.add(
            InventoryTransaction(
                organization_id=organization_id,
                product_id=product_id,
                movement_type="purchase",
                quantity_change=quantity,
                resulting_quantity=product.stock_quantity,
                reference_type="purchase",
                reference_id=purchase.id,
                created_by=user_id,
            )
        )

    if amount_paid_cents and payment_method is not None:
        payment = Payment(
            organization_id=organization_id,
            supplier_id=supplier_id,
            method=payment_method,
            amount_cents=amount_paid_cents,
            direction="out",
            payment_date=purchase_day,
            note=note,
            created_by=user_id,
        )
        db.add(payment)
        await db.flush()
        db.add(
            PaymentAllocation(
                payment_id=payment.id,
                reference_type="purchase",
                reference_id=purchase.id,
                amount_cents=amount_paid_cents,
            )
        )

    cash_code = "1000" if payment_method == "cash" else "1010" if payment_method else None
    purchase_ledger = purchase_ledger_cents(total_cents, amount_paid_cents, cash_code)
    if purchase_ledger:
        accounts = await _account_ids(
            db, organization_id, {account_code for account_code, _, _ in purchase_ledger}
        )
        lines = [
            JournalLineInput(
                accounts[account_code],
                debit=cents_to_decimal(debit_cents),
                credit=cents_to_decimal(credit_cents),
                supplier_id=supplier_id if account_code == "2000" else None,
            )
            for account_code, debit_cents, credit_cents in purchase_ledger
        ]
        await create_and_post_journal_entry(
            db,
            organization_id,
            purchase_day,
            lines,
            description=f"Purchase {purchase.reference}",
            source_type="purchase",
            source_id=purchase.id,
            posted_by=user_id,
            commit=False,
        )

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing = await _purchase_by_key(db, organization_id, idempotency_key)
        if existing is not None:
            return existing, False
        raise
    return purchase, True


async def record_supplier_payment(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    supplier_id: uuid.UUID,
    amount_cents: int,
    method: str,
    purchase_id: uuid.UUID | None,
    expense_id: uuid.UUID | None,
    payment_date: date | None,
    note: str | None,
    idempotency_key: str,
) -> tuple[Payment, bool]:
    existing = await db.scalar(
        select(Payment).where(
            Payment.organization_id == organization_id,
            Payment.idempotency_key == idempotency_key,
        )
    )
    if existing is not None:
        if existing.direction != "out" or existing.supplier_id != supplier_id:
            raise HTTPException(status_code=409, detail="This Idempotency-Key was used for another payment")
        return existing, False

    supplier_exists = await db.scalar(
        select(Supplier.id).where(
            Supplier.id == supplier_id,
            Supplier.organization_id == organization_id,
        )
    )
    if supplier_exists is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    org = await db.scalar(select(Organization).where(Organization.id == organization_id))
    try:
        validate_currency_precision(amount_cents, org.currency_exponent)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    today = datetime.now(ZoneInfo(org.timezone or "UTC")).date()
    pay_day = payment_date or today
    if pay_day > today:
        raise HTTPException(status_code=422, detail="The payment date cannot be in the future")
    if amount_cents <= 0 or amount_cents > MAX_CENTS:
        raise HTTPException(status_code=422, detail="The payment amount is not valid")
    if purchase_id is not None and expense_id is not None:
        raise HTTPException(status_code=422, detail="Choose either a purchase or an expense to pay")
    if purchase_id is not None:
        chosen = await db.scalar(
            select(Purchase.id).where(
                Purchase.id == purchase_id,
                Purchase.organization_id == organization_id,
                Purchase.supplier_id == supplier_id,
            )
        )
        if chosen is None:
            raise HTTPException(status_code=404, detail="Purchase not found")
    if expense_id is not None:
        chosen = await db.scalar(
            select(Expense.id).where(
                Expense.id == expense_id,
                Expense.organization_id == organization_id,
                Expense.supplier_id == supplier_id,
            )
        )
        if chosen is None:
            raise HTTPException(status_code=404, detail="Expense not found")

    purchases: list[Purchase] = []
    if expense_id is None:
        stmt = select(Purchase).where(
            Purchase.organization_id == organization_id,
            Purchase.supplier_id == supplier_id,
            Purchase.status == "received",
            Purchase.total_cents > Purchase.amount_paid_cents,
        )
        if purchase_id is not None:
            stmt = stmt.where(Purchase.id == purchase_id)
        purchases = (
            await db.execute(
                stmt.order_by(Purchase.purchase_date, Purchase.created_at, Purchase.id).with_for_update()
            )
        ).scalars().all()
    expenses: list[Expense] = []
    if purchase_id is None:
        expense_stmt = select(Expense).where(
            Expense.organization_id == organization_id,
            Expense.supplier_id == supplier_id,
            Expense.amount_cents > Expense.amount_paid_cents,
        )
        if expense_id is not None:
            expense_stmt = expense_stmt.where(Expense.id == expense_id)
        expenses = (
            await db.execute(
                expense_stmt.order_by(Expense.incurred_at, Expense.created_at, Expense.id).with_for_update()
            )
        ).scalars().all()
    if not purchases and not expenses:
        raise HTTPException(
            status_code=422,
            detail=(
                "That purchase is not found, or is already fully paid"
                if purchase_id
                else "That expense is not found, or is already fully paid"
                if expense_id
                else "This supplier has no unpaid purchases or expenses"
            ),
        )

    resources = {
        **{("purchase", purchase.id): purchase for purchase in purchases},
        **{("expense", expense.id): expense for expense in expenses},
    }
    open_items = [
        (
            ("purchase", purchase.id),
            purchase.total_cents - purchase.amount_paid_cents,
            purchase.purchase_date,
            purchase.created_at,
        )
        for purchase in purchases
    ] + [
        (
            ("expense", expense.id),
            expense.amount_cents - expense.amount_paid_cents,
            expense.incurred_at,
            expense.created_at,
        )
        for expense in expenses
    ]
    open_items.sort(key=lambda item: (item[2], item[3], item[0][1]))
    try:
        allocations = allocate_supplier_payment(
            [(reference, balance) for reference, balance, _, _ in open_items],
            amount_cents,
        )
    except PurchaseError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    payment = Payment(
        organization_id=organization_id,
        supplier_id=supplier_id,
        method=method,
        amount_cents=amount_cents,
        direction="out",
        payment_date=pay_day,
        note=note,
        created_by=user_id,
        idempotency_key=idempotency_key,
    )
    db.add(payment)
    await db.flush()
    for (reference_type, reference_id), applied in allocations:
        resources[(reference_type, reference_id)].amount_paid_cents += applied
        db.add(
            PaymentAllocation(
                payment_id=payment.id,
                reference_type=reference_type,
                reference_id=reference_id,
                amount_cents=applied,
            )
        )

    cash_code = "1000" if method == "cash" else "1010"
    codes = {"2000", cash_code}
    accounts = await _account_ids(db, organization_id, codes)
    amount = cents_to_decimal(amount_cents)
    await create_and_post_journal_entry(
        db,
        organization_id,
        pay_day,
        [
            JournalLineInput(accounts["2000"], debit=amount, supplier_id=supplier_id),
            JournalLineInput(accounts[cash_code], credit=amount),
        ],
        description="Payment made to supplier",
        source_type="payment",
        source_id=payment.id,
        posted_by=user_id,
        commit=False,
    )

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing = await db.scalar(
            select(Payment).where(
                Payment.organization_id == organization_id,
                Payment.idempotency_key == idempotency_key,
            )
        )
        if existing is not None:
            if existing.direction != "out" or existing.supplier_id != supplier_id:
                raise HTTPException(status_code=409, detail="This Idempotency-Key was used for another payment")
            return existing, False
        raise
    return payment, True


async def purchase_details(db: AsyncSession, organization_id: uuid.UUID, purchase_id: uuid.UUID):
    purchase = await db.scalar(
        select(Purchase).where(
            Purchase.id == purchase_id,
            Purchase.organization_id == organization_id,
        )
    )
    if purchase is None:
        raise HTTPException(status_code=404, detail="Purchase not found")
    rows = (
        await db.execute(
            select(PurchaseItem, Product.name)
            .join(Product, Product.id == PurchaseItem.product_id)
            .where(
                PurchaseItem.purchase_id == purchase.id,
                Product.organization_id == organization_id,
            )
            .order_by(PurchaseItem.id)
        )
    ).all()
    return purchase, rows
