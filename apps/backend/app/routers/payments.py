import uuid
from datetime import date, datetime
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.customer import Customer
from app.models.expenses import Expense
from app.models.payments import Payment, PaymentAllocation
from app.models.purchases import Purchase
from app.models.sales import Sale
from app.models.supplier import Supplier
from app.permissions import OrgContext, require_permission
from app.services.payments_service import record_customer_payment

router = APIRouter(prefix="/api/v1", tags=["payments"])

PaymentMethod = Literal["cash", "bank", "card", "mobile_money", "other"]


class CustomerPaymentIn(BaseModel):
    customer_id: uuid.UUID
    amount_cents: int = Field(gt=0, le=2_000_000_000)
    method: PaymentMethod
    sale_id: uuid.UUID | None = None  # pay one specific sale; leave out to settle the oldest first
    note: str | None = Field(default=None, max_length=500)
    payment_date: date | None = None  # defaults to today in the business's timezone


class AllocationOut(BaseModel):
    sale_id: uuid.UUID
    sale_reference: str | None
    amount_cents: int


class PurchaseAllocationOut(BaseModel):
    purchase_id: uuid.UUID
    purchase_reference: str
    amount_cents: int


class ExpenseAllocationOut(BaseModel):
    expense_id: uuid.UUID
    description: str
    amount_cents: int


class PaymentOut(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID | None
    customer_name: str | None
    supplier_id: uuid.UUID | None
    supplier_name: str | None
    method: str
    direction: str
    amount_cents: int
    payment_date: date
    note: str | None
    created_by: uuid.UUID | None
    created_at: datetime
    allocations: list[AllocationOut]
    purchase_allocations: list[PurchaseAllocationOut]
    expense_allocations: list[ExpenseAllocationOut]


class PaymentSummary(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID | None
    customer_name: str | None
    supplier_id: uuid.UUID | None
    supplier_name: str | None
    method: str
    direction: str
    amount_cents: int
    payment_date: date
    created_at: datetime


class ReceivableRow(BaseModel):
    customer_id: uuid.UUID
    customer_name: str
    open_sales: int
    balance_cents: int
    oldest_sale_date: date


class ReceivablesOut(BaseModel):
    total_outstanding_cents: int
    customers: list[ReceivableRow]


class OpenSaleOut(BaseModel):
    sale_id: uuid.UUID
    reference: str | None
    sale_date: date
    total_cents: int
    amount_paid_cents: int
    balance_cents: int


class CustomerReceivableOut(BaseModel):
    customer_id: uuid.UUID
    customer_name: str
    balance_cents: int
    open_sales: list[OpenSaleOut]


async def _payment_out(db: AsyncSession, organization_id: uuid.UUID, payment_id: uuid.UUID) -> PaymentOut:
    payment = await db.scalar(
        select(Payment).where(Payment.id == payment_id, Payment.organization_id == organization_id)
    )
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    customer_name = None
    if payment.customer_id is not None:
        customer_name = await db.scalar(
            select(Customer.name).where(
                Customer.id == payment.customer_id,
                Customer.organization_id == organization_id,
            )
        )
    supplier_name = None
    if payment.supplier_id is not None:
        supplier_name = await db.scalar(
            select(Supplier.name).where(
                Supplier.id == payment.supplier_id,
                Supplier.organization_id == organization_id,
            )
        )
    rows = (
        await db.execute(
            select(PaymentAllocation.reference_id, Sale.reference, PaymentAllocation.amount_cents)
            .join(Sale, Sale.id == PaymentAllocation.reference_id)
            .where(
                PaymentAllocation.payment_id == payment.id,
                PaymentAllocation.reference_type == "sale",
                Sale.organization_id == organization_id,
            )
            .order_by(Sale.sale_date, Sale.created_at)
        )
    ).all()
    purchase_rows = (
        await db.execute(
            select(PaymentAllocation.reference_id, Purchase.reference, PaymentAllocation.amount_cents)
            .join(Purchase, Purchase.id == PaymentAllocation.reference_id)
            .where(
                PaymentAllocation.payment_id == payment.id,
                PaymentAllocation.reference_type == "purchase",
                Purchase.organization_id == organization_id,
            )
            .order_by(Purchase.purchase_date, Purchase.created_at)
        )
    ).all()
    expense_rows = (
        await db.execute(
            select(PaymentAllocation.reference_id, Expense.description, PaymentAllocation.amount_cents)
            .join(Expense, Expense.id == PaymentAllocation.reference_id)
            .where(
                PaymentAllocation.payment_id == payment.id,
                PaymentAllocation.reference_type == "expense",
                Expense.organization_id == organization_id,
            )
            .order_by(Expense.incurred_at, Expense.created_at)
        )
    ).all()
    return PaymentOut(
        id=payment.id,
        customer_id=payment.customer_id,
        customer_name=customer_name,
        supplier_id=payment.supplier_id,
        supplier_name=supplier_name,
        method=payment.method,
        direction=payment.direction,
        amount_cents=payment.amount_cents,
        payment_date=payment.payment_date,
        note=payment.note,
        created_by=payment.created_by,
        created_at=payment.created_at,
        allocations=[AllocationOut(sale_id=sid, sale_reference=ref, amount_cents=amt) for sid, ref, amt in rows],
        purchase_allocations=[
            PurchaseAllocationOut(purchase_id=pid, purchase_reference=ref, amount_cents=amount)
            for pid, ref, amount in purchase_rows
        ],
        expense_allocations=[
            ExpenseAllocationOut(expense_id=eid, description=description, amount_cents=amount)
            for eid, description, amount in expense_rows
        ],
    )


@router.post("/payments/customer", response_model=PaymentOut, status_code=201)
async def receive_customer_payment(
    body: CustomerPaymentIn,
    response: Response,
    idempotency_key: str | None = Header(default=None, max_length=128),
    ctx: OrgContext = Depends(require_permission("payments.record")),
    db: AsyncSession = Depends(get_db),
):
    """A customer pays money they owe. Send an Idempotency-Key header so a retry cannot record it twice."""
    payment, created = await record_customer_payment(
        db,
        organization_id=ctx.organization_id,
        user_id=ctx.user.id,
        customer_id=body.customer_id,
        amount_cents=body.amount_cents,
        method=body.method,
        sale_id=body.sale_id,
        note=body.note,
        payment_date=body.payment_date,
        idempotency_key=idempotency_key,
    )
    if not created:
        response.status_code = 200  # an earlier identical request: here is the original payment
    return await _payment_out(db, ctx.organization_id, payment.id)


@router.get("/payments", response_model=list[PaymentSummary])
async def list_payments(
    customer_id: uuid.UUID | None = None,
    supplier_id: uuid.UUID | None = None,
    direction: Literal["in", "out"] | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: OrgContext = Depends(require_permission("sales.view")),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Payment, Customer.name, Supplier.name)
        .outerjoin(
            Customer,
            (Customer.id == Payment.customer_id) & (Customer.organization_id == ctx.organization_id),
        )
        .outerjoin(
            Supplier,
            (Supplier.id == Payment.supplier_id) & (Supplier.organization_id == ctx.organization_id),
        )
        .where(Payment.organization_id == ctx.organization_id)
    )
    if customer_id is not None:
        stmt = stmt.where(Payment.customer_id == customer_id)
    if direction is not None:
        stmt = stmt.where(Payment.direction == direction)
    if date_from is not None:
        stmt = stmt.where(Payment.payment_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Payment.payment_date <= date_to)
    if supplier_id is not None:
        stmt = stmt.where(Payment.supplier_id == supplier_id)
    stmt = stmt.order_by(Payment.payment_date.desc(), Payment.created_at.desc()).limit(limit).offset(offset)
    rows = (await db.execute(stmt)).all()
    return [
        PaymentSummary(
            id=p.id,
            customer_id=p.customer_id,
            customer_name=name,
            supplier_id=p.supplier_id,
            supplier_name=supplier_name,
            method=p.method,
            direction=p.direction,
            amount_cents=p.amount_cents,
            payment_date=p.payment_date,
            created_at=p.created_at,
        )
        for p, name, supplier_name in rows
    ]


@router.get("/payments/{payment_id}", response_model=PaymentOut)
async def get_payment(
    payment_id: uuid.UUID,
    ctx: OrgContext = Depends(require_permission("sales.view")),
    db: AsyncSession = Depends(get_db),
):
    return await _payment_out(db, ctx.organization_id, payment_id)


@router.get("/receivables", response_model=ReceivablesOut)
async def receivables(
    ctx: OrgContext = Depends(require_permission("customers.view")),
    db: AsyncSession = Depends(get_db),
):
    """Who owes the business money, largest balance first."""
    owed = func.sum(Sale.total_cents - Sale.amount_paid_cents)
    rows = (
        await db.execute(
            select(Customer.id, Customer.name, func.count(Sale.id), owed, func.min(Sale.sale_date))
            .join(Sale, Sale.customer_id == Customer.id)
            .where(
                Customer.organization_id == ctx.organization_id,
                Sale.organization_id == ctx.organization_id,
                Sale.status == "completed",
                Sale.total_cents > Sale.amount_paid_cents,
            )
            .group_by(Customer.id, Customer.name)
            .order_by(owed.desc(), Customer.name)
        )
    ).all()
    customers = [
        ReceivableRow(
            customer_id=cid, customer_name=name, open_sales=int(count), balance_cents=int(balance), oldest_sale_date=oldest
        )
        for cid, name, count, balance, oldest in rows
    ]
    return ReceivablesOut(total_outstanding_cents=sum(c.balance_cents for c in customers), customers=customers)


@router.get("/receivables/{customer_id}", response_model=CustomerReceivableOut)
async def customer_receivable(
    customer_id: uuid.UUID,
    ctx: OrgContext = Depends(require_permission("customers.view")),
    db: AsyncSession = Depends(get_db),
):
    """One customer's unpaid sales, oldest first."""
    name = await db.scalar(
        select(Customer.name).where(Customer.id == customer_id, Customer.organization_id == ctx.organization_id)
    )
    if name is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    sales = (
        await db.execute(
            select(Sale)
            .where(
                Sale.organization_id == ctx.organization_id,
                Sale.customer_id == customer_id,
                Sale.status == "completed",
                Sale.total_cents > Sale.amount_paid_cents,
            )
            .order_by(Sale.sale_date, Sale.created_at)
        )
    ).scalars().all()
    open_sales = [
        OpenSaleOut(
            sale_id=s.id,
            reference=s.reference,
            sale_date=s.sale_date,
            total_cents=s.total_cents,
            amount_paid_cents=s.amount_paid_cents,
            balance_cents=s.total_cents - s.amount_paid_cents,
        )
        for s in sales
    ]
    return CustomerReceivableOut(
        customer_id=customer_id,
        customer_name=name,
        balance_cents=sum(s.balance_cents for s in open_sales),
        open_sales=open_sales,
    )
