import uuid
from dataclasses import dataclass
from datetime import date, datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.accounting import Account
from app.models.customer import Customer
from app.models.inventory import InventoryTransaction
from app.models.organization import Organization
from app.models.payments import Payment, PaymentAllocation
from app.models.product import Product
from app.models.sales import Sale, SaleItem
from app.money import validate_currency_precision
from app.services.accounting.journal_service import JournalLineInput, create_and_post_journal_entry
from app.services.audit import record_audit_event
from app.services.sales_calc import (
    ACCOUNT_CODE,
    MAX_CENTS,
    SaleError,
    build_ledger_lines,
    compute_totals,
    payment_status,
)


@dataclass(frozen=True)
class SaleItemInput:
    product_id: uuid.UUID
    quantity: int


@dataclass(frozen=True)
class SalePaymentInput:
    method: str
    amount_cents: int


async def _find_by_key(db: AsyncSession, organization_id: uuid.UUID, key: str) -> Sale | None:
    return await db.scalar(
        select(Sale).where(Sale.organization_id == organization_id, Sale.idempotency_key == key)
    )


async def _account_ids(db: AsyncSession, organization_id: uuid.UUID) -> dict[str, uuid.UUID]:
    """Logical account name -> this business's account id."""
    rows = (
        await db.execute(
            select(Account.account_code, Account.id).where(
                Account.organization_id == organization_id,
                Account.account_code.in_(list(ACCOUNT_CODE.values())),
            )
        )
    ).all()
    by_code = {code: account_id for code, account_id in rows}
    missing = [name for name, code in ACCOUNT_CODE.items() if code not in by_code]
    if missing:
        raise HTTPException(status_code=500, detail="Accounting is not set up for this business")
    return {name: by_code[code] for name, code in ACCOUNT_CODE.items()}


async def create_sale(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    items: list[SaleItemInput],
    payments: list[SalePaymentInput],
    customer_id: uuid.UUID | None = None,
    discount_cents: int = 0,
    notes: str | None = None,
    sale_date: date | None = None,
    idempotency_key: str | None = None,
) -> tuple[Sale, bool]:
    """Record a sale: the sale, its items, stock, payments and the ledger entry, in ONE transaction.

    Returns (sale, created). created=False means this request was already processed
    (same idempotency key) and the original sale is returned instead of a duplicate.
    """
    # 0. A retry of a request we already processed?
    if idempotency_key:
        existing = await _find_by_key(db, organization_id, idempotency_key)
        if existing is not None:
            return existing, False

    org = await db.get(Organization, organization_id)
    try:
        validate_currency_precision(discount_cents, org.currency_exponent)
        for payment in payments:
            validate_currency_precision(payment.amount_cents, org.currency_exponent)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    today = datetime.now(ZoneInfo(org.timezone or "UTC")).date()  # "today" in the business's own timezone
    sale_day = sale_date or today
    if sale_day > today:
        raise HTTPException(status_code=422, detail="The sale date cannot be in the future")

    # 1. Merge repeated products into one line each
    wanted: dict[uuid.UUID, int] = {}
    for item in items:
        wanted[item.product_id] = wanted.get(item.product_id, 0) + item.quantity

    # 2. The customer must belong to this business
    if customer_id is not None:
        found = await db.scalar(
            select(Customer.id).where(Customer.id == customer_id, Customer.organization_id == organization_id)
        )
        if found is None:
            raise HTTPException(status_code=422, detail="customer_id is not valid for this business")

    # 3. Lock the products in a fixed order (prevents deadlocks and double-selling the last unit)
    rows = (
        await db.execute(
            select(Product)
            .where(Product.organization_id == organization_id, Product.id.in_(list(wanted)))
            .order_by(Product.id)
            .with_for_update()
        )
    ).scalars().all()
    products = {p.id: p for p in rows}
    if set(wanted) - set(products):
        raise HTTPException(status_code=404, detail="One or more products were not found")
    for product_id, quantity in wanted.items():
        product = products[product_id]
        try:
            validate_currency_precision(product.selling_price_cents, org.currency_exponent)
            validate_currency_precision(product.cost_price_cents or 0, org.currency_exponent)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        if not product.is_active:
            raise HTTPException(status_code=409, detail=f"'{product.name}' is archived and cannot be sold")
        available = product.stock_quantity or 0
        if available < quantity:
            raise HTTPException(
                status_code=409,
                detail=f"Not enough stock for '{product.name}': {available} available, {quantity} requested",
            )

    # 4. The server works out every number from the database's prices, never from the client
    try:
        line_totals = [wanted[pid] * products[pid].selling_price_cents for pid in wanted]
        totals = compute_totals(
            line_totals,
            discount_cents,
            org.tax_rate_bps or 0,
            org.currency_exponent,
        )
        paid_total = sum(p.amount_cents for p in payments)
        if paid_total > MAX_CENTS:
            raise SaleError("The payments are too large to record")
        status = payment_status(totals.total_cents, paid_total)
    except SaleError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    if status != "paid" and customer_id is None:
        raise HTTPException(
            status_code=422,
            detail="A sale that is not fully paid needs a customer, because the rest is owed",
        )

    # 5. Receipt number, serialised per business (the lock is released when the transaction ends)
    await db.execute(
        text("select pg_advisory_xact_lock(hashtextextended(:key, 0))"),
        {"key": f"sale:{organization_id}"},
    )
    count = await db.scalar(select(func.count()).select_from(Sale).where(Sale.organization_id == organization_id))
    reference = f"S-{count + 1:06d}"

    sale = Sale(
        organization_id=organization_id,
        customer_id=customer_id,
        reference=reference,
        sale_date=sale_day,
        status="completed",
        subtotal_cents=totals.subtotal_cents,
        discount_cents=totals.discount_cents,
        tax_cents=totals.tax_cents,
        total_cents=totals.total_cents,
        amount_paid_cents=paid_total,
        payment_status=status,
        notes=notes,
        created_by=user_id,
        idempotency_key=idempotency_key,
    )
    db.add(sale)
    await db.flush()  # gives the sale its id

    # 6. Items and stock movements, remembering price and cost as they were at this moment
    cogs_cents = 0
    for product_id, quantity in wanted.items():
        product = products[product_id]
        unit_cost = product.cost_price_cents or 0
        db.add(
            SaleItem(
                sale_id=sale.id,
                product_id=product_id,
                product_name=product.name,
                quantity=quantity,
                unit_price_cents=product.selling_price_cents,
                unit_cost_cents=unit_cost,
            )
        )
        cogs_cents += quantity * unit_cost
        new_stock = (product.stock_quantity or 0) - quantity
        product.stock_quantity = new_stock
        db.add(
            InventoryTransaction(
                organization_id=organization_id,
                product_id=product_id,
                movement_type="sale",
                quantity_change=-quantity,
                resulting_quantity=new_stock,
                reference_type="sale",
                reference_id=sale.id,
                created_by=user_id,
            )
        )

    # 7. Payments received with the sale
    paid_by_method: dict[str, int] = {}
    for number, pay in enumerate(payments, start=1):
        payment = Payment(
            organization_id=organization_id,
            customer_id=customer_id,
            method=pay.method,
            amount_cents=pay.amount_cents,
            direction="in",
            payment_date=sale_day,
            created_by=user_id,
            idempotency_key=f"{idempotency_key}:{number}" if idempotency_key else None,
        )
        db.add(payment)
        await db.flush()
        db.add(
            PaymentAllocation(
                payment_id=payment.id,
                reference_type="sale",
                reference_id=sale.id,
                amount_cents=pay.amount_cents,
            )
        )
        paid_by_method[pay.method] = paid_by_method.get(pay.method, 0) + pay.amount_cents

    # 8. The ledger entry (balanced by construction), saved by the same commit as everything above
    ledger = build_ledger_lines(totals, paid_by_method, cogs_cents)
    if len(ledger) >= 2:
        accounts = await _account_ids(db, organization_id)
        lines = [
            JournalLineInput(
                accounts[line.account],
                debit=line.debit,
                credit=line.credit,
                customer_id=customer_id if line.for_customer else None,
            )
            for line in ledger
        ]
        await create_and_post_journal_entry(
            db,
            organization_id,
            sale_day,
            lines,
            description=f"Sale {reference}",
            source_type="sale",
            source_id=sale.id,
            posted_by=user_id,
            commit=False,
        )

    record_audit_event(
        db,
        organization_id=organization_id,
        actor_user_id=user_id,
        action="sale.created",
        target_type="sale",
        target_id=sale.id,
        details={
            "reference": reference,
            "total_cents": totals.total_cents,
            "payment_status": status,
            "item_count": len(wanted),
        },
    )

    # 9. Save everything together, or nothing at all
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        if idempotency_key:  # two identical requests raced: hand back the winner
            existing = await _find_by_key(db, organization_id, idempotency_key)
            if existing is not None:
                return existing, False
        raise
    return sale, True


async def load_sale(db: AsyncSession, organization_id: uuid.UUID, sale_id: uuid.UUID):
    """A sale with its items, payments and customer name. 404 if it is not this business's."""
    sale = await db.scalar(select(Sale).where(Sale.id == sale_id, Sale.organization_id == organization_id))
    if sale is None:
        raise HTTPException(status_code=404, detail="Sale not found")
    items = (
        await db.execute(select(SaleItem).where(SaleItem.sale_id == sale.id).order_by(SaleItem.product_name))
    ).scalars().all()
    payments = (
        await db.execute(
            select(Payment)
            .join(PaymentAllocation, PaymentAllocation.payment_id == Payment.id)
            .where(
                PaymentAllocation.reference_type == "sale",
                PaymentAllocation.reference_id == sale.id,
                Payment.organization_id == organization_id,
            )
            .order_by(Payment.created_at)
        )
    ).scalars().all()
    customer_name = None
    if sale.customer_id is not None:
        customer_name = await db.scalar(select(Customer.name).where(Customer.id == sale.customer_id))
    return sale, items, payments, customer_name
