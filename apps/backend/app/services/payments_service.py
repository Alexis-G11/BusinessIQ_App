import uuid
from datetime import date, datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.organization import Organization
from app.models.payments import Payment, PaymentAllocation
from app.models.sales import Sale
from app.money import cents_to_decimal, validate_currency_precision
from app.services.accounting.journal_service import JournalLineInput, create_and_post_journal_entry
from app.services.payments_calc import PaymentError, allocate
from app.services.sales_calc import METHOD_ACCOUNT, payment_status
from app.services.sales_service import _account_ids  # shared lookup of the business's ledger accounts


async def _find_by_key(db: AsyncSession, organization_id: uuid.UUID, key: str) -> Payment | None:
    return await db.scalar(
        select(Payment).where(Payment.organization_id == organization_id, Payment.idempotency_key == key)
    )


async def record_customer_payment(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    customer_id: uuid.UUID,
    amount_cents: int,
    method: str,
    sale_id: uuid.UUID | None = None,
    note: str | None = None,
    payment_date: date | None = None,
    idempotency_key: str | None = None,
) -> tuple[Payment, bool]:
    """A customer pays money they owe. It settles their oldest unpaid sales first
    (or one chosen sale), updates those sales, and posts the ledger entry, in ONE transaction.

    Returns (payment, created). created=False means this exact request was already processed.
    """
    if idempotency_key:
        existing = await _find_by_key(db, organization_id, idempotency_key)
        if existing is not None:
            return existing, False

    found = await db.scalar(
        select(Customer.id).where(Customer.id == customer_id, Customer.organization_id == organization_id)
    )
    if found is None:
        raise HTTPException(status_code=422, detail="customer_id is not valid for this business")

    org = await db.get(Organization, organization_id)
    try:
        validate_currency_precision(amount_cents, org.currency_exponent)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    today = datetime.now(ZoneInfo(org.timezone or "UTC")).date()
    pay_day = payment_date or today
    if pay_day > today:
        raise HTTPException(status_code=422, detail="The payment date cannot be in the future")

    # Lock the customer's unpaid sales, oldest first, in a fixed order (so two payments cannot deadlock)
    stmt = select(Sale).where(
        Sale.organization_id == organization_id,
        Sale.customer_id == customer_id,
        Sale.status == "completed",
        Sale.total_cents > Sale.amount_paid_cents,
    )
    if sale_id is not None:
        stmt = stmt.where(Sale.id == sale_id)
    sales = (await db.execute(stmt.order_by(Sale.sale_date, Sale.created_at, Sale.id).with_for_update())).scalars().all()
    if not sales:
        raise HTTPException(
            status_code=422,
            detail="That sale is not found, or is already fully paid" if sale_id else "This customer has no unpaid sales",
        )

    try:
        allocations = allocate([(s.id, s.total_cents - s.amount_paid_cents) for s in sales], amount_cents)
    except PaymentError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    payment = Payment(
        organization_id=organization_id,
        customer_id=customer_id,
        method=method,
        amount_cents=amount_cents,
        direction="in",
        payment_date=pay_day,
        note=note,
        created_by=user_id,
        idempotency_key=idempotency_key,
    )
    db.add(payment)
    await db.flush()

    by_id = {s.id: s for s in sales}
    for allocated_sale_id, applied in allocations:
        sale = by_id[allocated_sale_id]
        sale.amount_paid_cents += applied
        sale.payment_status = payment_status(sale.total_cents, sale.amount_paid_cents)
        db.add(
            PaymentAllocation(
                payment_id=payment.id,
                reference_type="sale",
                reference_id=allocated_sale_id,
                amount_cents=applied,
            )
        )

    # Ledger: money in (cash or bank), and the customer's debt goes down
    accounts = await _account_ids(db, organization_id)
    amount = cents_to_decimal(amount_cents)
    await create_and_post_journal_entry(
        db,
        organization_id,
        pay_day,
        [
            JournalLineInput(accounts[METHOD_ACCOUNT[method]], debit=amount),
            JournalLineInput(accounts["receivable"], credit=amount, customer_id=customer_id),
        ],
        description="Payment received from customer",
        source_type="payment",
        source_id=payment.id,
        posted_by=user_id,
        commit=False,
    )

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        if idempotency_key:  # two identical requests raced: hand back the winner
            existing = await _find_by_key(db, organization_id, idempotency_key)
            if existing is not None:
                return existing, False
        raise
    return payment, True
