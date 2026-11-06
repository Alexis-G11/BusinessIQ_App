import uuid
from dataclasses import dataclass
from datetime import date, datetime
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.expenses import Expense
from app.models.payments import Payment, PaymentAllocation
from app.models.purchases import Purchase
from app.models.supplier import Supplier
from app.permissions import OrgContext, require_permission
from app.services.purchases_service import (
    PurchaseLineInput,
    create_purchase,
    purchase_details,
    record_supplier_payment,
)

router = APIRouter(prefix="/api/v1", tags=["purchases and payables"])

PaymentMethod = Literal["cash", "bank", "card", "mobile_money", "other"]


@dataclass
class _SupplierPayableTotals:
    name: str
    purchase_count: int
    expense_count: int
    balance_cents: int
    oldest_date: date


class PurchaseItemIn(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(gt=0, le=2_000_000_000)
    unit_cost_cents: int = Field(ge=0, le=2_000_000_000)


class PurchaseIn(BaseModel):
    supplier_id: uuid.UUID | None = None
    items: list[PurchaseItemIn] = Field(min_length=1, max_length=100)
    amount_paid_cents: int = Field(default=0, ge=0, le=2_000_000_000)
    payment_method: PaymentMethod | None = None
    purchase_date: date | None = None
    note: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _payment_method_matches_amount(self):
        if (self.amount_paid_cents > 0) != (self.payment_method is not None):
            raise ValueError("A payment method is required only when money is paid")
        return self


class PurchaseItemOut(BaseModel):
    product_id: uuid.UUID
    product_name: str
    quantity: int
    unit_cost_cents: int
    line_total_cents: int


class PurchaseOut(BaseModel):
    id: uuid.UUID
    reference: str
    supplier_id: uuid.UUID | None
    supplier_name: str | None
    purchase_date: date
    status: str
    total_cents: int
    amount_paid_cents: int
    balance_cents: int
    note: str | None
    created_by: uuid.UUID | None
    created_at: datetime
    items: list[PurchaseItemOut]


class PurchaseSummary(BaseModel):
    id: uuid.UUID
    reference: str
    supplier_id: uuid.UUID | None
    supplier_name: str | None
    purchase_date: date
    status: str
    total_cents: int
    amount_paid_cents: int
    balance_cents: int
    created_at: datetime


class PayableSupplier(BaseModel):
    supplier_id: uuid.UUID
    supplier_name: str
    open_purchases: int
    open_expenses: int
    balance_cents: int
    oldest_open_date: date


class PayablesOut(BaseModel):
    total_outstanding_cents: int
    suppliers: list[PayableSupplier]


class OpenPurchase(BaseModel):
    purchase_id: uuid.UUID
    reference: str
    purchase_date: date
    total_cents: int
    amount_paid_cents: int
    balance_cents: int


class SupplierPayablesOut(BaseModel):
    supplier_id: uuid.UUID
    supplier_name: str
    balance_cents: int
    open_purchases: list[OpenPurchase]
    open_expenses: list["OpenExpense"]
    open_items: list["OpenPayableItem"]


class OpenExpense(BaseModel):
    expense_id: uuid.UUID
    description: str
    incurred_at: date
    amount_cents: int
    amount_paid_cents: int
    balance_cents: int


class OpenPayableItem(BaseModel):
    reference_type: Literal["purchase", "expense"]
    reference_id: uuid.UUID
    reference: str
    due_date: date
    total_cents: int
    amount_paid_cents: int
    balance_cents: int


class SupplierPaymentIn(BaseModel):
    supplier_id: uuid.UUID
    amount_cents: int = Field(gt=0, le=2_000_000_000)
    method: PaymentMethod
    purchase_id: uuid.UUID | None = None
    expense_id: uuid.UUID | None = None
    payment_date: date | None = None
    note: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _one_chosen_payable(self):
        if self.purchase_id is not None and self.expense_id is not None:
            raise ValueError("Choose either a purchase or an expense to pay")
        return self


class PurchasePaymentAllocationOut(BaseModel):
    purchase_id: uuid.UUID
    purchase_reference: str
    amount_cents: int


class ExpensePaymentAllocationOut(BaseModel):
    expense_id: uuid.UUID
    description: str
    amount_cents: int


class SupplierPaymentOut(BaseModel):
    id: uuid.UUID
    supplier_id: uuid.UUID
    supplier_name: str
    method: str
    direction: str
    amount_cents: int
    payment_date: date
    note: str | None
    created_by: uuid.UUID | None
    created_at: datetime
    allocations: list[PurchasePaymentAllocationOut]
    expense_allocations: list[ExpensePaymentAllocationOut]


async def _purchase_out(db: AsyncSession, organization_id: uuid.UUID, purchase_id: uuid.UUID) -> PurchaseOut:
    purchase, rows = await purchase_details(db, organization_id, purchase_id)
    supplier_name = None
    if purchase.supplier_id is not None:
        supplier_name = await db.scalar(
            select(Supplier.name).where(
                Supplier.id == purchase.supplier_id,
                Supplier.organization_id == organization_id,
            )
        )
    return PurchaseOut(
        id=purchase.id,
        reference=purchase.reference,
        supplier_id=purchase.supplier_id,
        supplier_name=supplier_name,
        purchase_date=purchase.purchase_date,
        status=purchase.status,
        total_cents=purchase.total_cents,
        amount_paid_cents=purchase.amount_paid_cents,
        balance_cents=purchase.total_cents - purchase.amount_paid_cents,
        note=purchase.note,
        created_by=purchase.created_by,
        created_at=purchase.created_at,
        items=[
            PurchaseItemOut(
                product_id=item.product_id,
                product_name=product_name,
                quantity=item.quantity,
                unit_cost_cents=item.unit_cost_cents,
                line_total_cents=item.quantity * item.unit_cost_cents,
            )
            for item, product_name in rows
        ],
    )


async def _supplier_payment_out(
    db: AsyncSession, organization_id: uuid.UUID, payment_id: uuid.UUID
) -> SupplierPaymentOut:
    payment = await db.scalar(
        select(Payment).where(
            Payment.id == payment_id,
            Payment.organization_id == organization_id,
            Payment.direction == "out",
            Payment.supplier_id.is_not(None),
        )
    )
    if payment is None:
        raise HTTPException(status_code=404, detail="Supplier payment not found")
    supplier_name = await db.scalar(
        select(Supplier.name).where(
            Supplier.id == payment.supplier_id,
            Supplier.organization_id == organization_id,
        )
    )
    rows = (
        await db.execute(
            select(Purchase.id, Purchase.reference, PaymentAllocation.amount_cents)
            .join(PaymentAllocation, PaymentAllocation.reference_id == Purchase.id)
            .where(
                PaymentAllocation.payment_id == payment.id,
                PaymentAllocation.reference_type == "purchase",
                Purchase.organization_id == organization_id,
            )
            .order_by(Purchase.purchase_date, Purchase.created_at, Purchase.id)
        )
    ).all()
    expense_rows = (
        await db.execute(
            select(Expense.id, Expense.description, PaymentAllocation.amount_cents)
            .join(PaymentAllocation, PaymentAllocation.reference_id == Expense.id)
            .where(
                PaymentAllocation.payment_id == payment.id,
                PaymentAllocation.reference_type == "expense",
                Expense.organization_id == organization_id,
            )
            .order_by(Expense.incurred_at, Expense.created_at, Expense.id)
        )
    ).all()
    return SupplierPaymentOut(
        id=payment.id,
        supplier_id=payment.supplier_id,
        supplier_name=supplier_name,
        method=payment.method,
        direction=payment.direction,
        amount_cents=payment.amount_cents,
        payment_date=payment.payment_date,
        note=payment.note,
        created_by=payment.created_by,
        created_at=payment.created_at,
        allocations=[
            PurchasePaymentAllocationOut(purchase_id=pid, purchase_reference=ref, amount_cents=amount)
            for pid, ref, amount in rows
        ],
        expense_allocations=[
            ExpensePaymentAllocationOut(expense_id=eid, description=description, amount_cents=amount)
            for eid, description, amount in expense_rows
        ],
    )


@router.post("/purchases", response_model=PurchaseOut, status_code=201)
async def receive_purchase(
    body: PurchaseIn,
    response: Response,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1, max_length=128),
    ctx: OrgContext = Depends(require_permission("purchases.create")),
    db: AsyncSession = Depends(get_db),
):
    purchase, created = await create_purchase(
        db,
        organization_id=ctx.organization_id,
        user_id=ctx.user.id,
        items=[
            PurchaseLineInput(
                product_id=item.product_id,
                quantity=item.quantity,
                unit_cost_cents=item.unit_cost_cents,
            )
            for item in body.items
        ],
        supplier_id=body.supplier_id,
        amount_paid_cents=body.amount_paid_cents,
        payment_method=body.payment_method,
        purchase_date=body.purchase_date,
        note=body.note,
        idempotency_key=idempotency_key,
    )
    if not created:
        response.status_code = 200
    return await _purchase_out(db, ctx.organization_id, purchase.id)


@router.get("/purchases", response_model=list[PurchaseSummary])
async def list_purchases(
    supplier_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: OrgContext = Depends(require_permission("purchases.view")),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Purchase, Supplier.name)
        .outerjoin(
            Supplier,
            (Supplier.id == Purchase.supplier_id) & (Supplier.organization_id == ctx.organization_id),
        )
        .where(Purchase.organization_id == ctx.organization_id)
    )
    if supplier_id is not None:
        stmt = stmt.where(Purchase.supplier_id == supplier_id)
    if date_from is not None:
        stmt = stmt.where(Purchase.purchase_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Purchase.purchase_date <= date_to)
    rows = (
        await db.execute(
            stmt.order_by(Purchase.purchase_date.desc(), Purchase.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    ).all()
    return [
        PurchaseSummary(
            id=purchase.id,
            reference=purchase.reference,
            supplier_id=purchase.supplier_id,
            supplier_name=name,
            purchase_date=purchase.purchase_date,
            status=purchase.status,
            total_cents=purchase.total_cents,
            amount_paid_cents=purchase.amount_paid_cents,
            balance_cents=purchase.total_cents - purchase.amount_paid_cents,
            created_at=purchase.created_at,
        )
        for purchase, name in rows
    ]


@router.get("/purchases/{purchase_id}", response_model=PurchaseOut)
async def get_purchase(
    purchase_id: uuid.UUID,
    ctx: OrgContext = Depends(require_permission("purchases.view")),
    db: AsyncSession = Depends(get_db),
):
    return await _purchase_out(db, ctx.organization_id, purchase_id)


@router.get("/payables", response_model=PayablesOut)
async def payables(
    ctx: OrgContext = Depends(require_permission("payables.view")),
    db: AsyncSession = Depends(get_db),
):
    purchase_rows = (
        await db.execute(
            select(
                Supplier.id,
                Supplier.name,
                func.count(Purchase.id),
                func.sum(Purchase.total_cents - Purchase.amount_paid_cents),
                func.min(Purchase.purchase_date),
            )
            .join(Purchase, Purchase.supplier_id == Supplier.id)
            .where(
                Supplier.organization_id == ctx.organization_id,
                Purchase.organization_id == ctx.organization_id,
                Purchase.status == "received",
                Purchase.total_cents > Purchase.amount_paid_cents,
            )
            .group_by(Supplier.id, Supplier.name)
        )
    ).all()
    expense_rows = (
        await db.execute(
            select(
                Supplier.id,
                Supplier.name,
                func.count(Expense.id),
                func.sum(Expense.amount_cents - Expense.amount_paid_cents),
                func.min(Expense.incurred_at),
            )
            .join(Expense, Expense.supplier_id == Supplier.id)
            .where(
                Supplier.organization_id == ctx.organization_id,
                Expense.organization_id == ctx.organization_id,
                Expense.amount_cents > Expense.amount_paid_cents,
            )
            .group_by(Supplier.id, Supplier.name)
        )
    ).all()
    totals: dict[uuid.UUID, _SupplierPayableTotals] = {}
    for sid, name, count, balance, oldest in purchase_rows:
        totals[sid] = _SupplierPayableTotals(name, int(count), 0, int(balance), oldest)
    for sid, name, count, balance, oldest in expense_rows:
        summary = totals.get(sid)
        if summary is None:
            totals[sid] = _SupplierPayableTotals(name, 0, int(count), int(balance), oldest)
        else:
            summary.expense_count += int(count)
            summary.balance_cents += int(balance)
            summary.oldest_date = min(summary.oldest_date, oldest)
    suppliers = [
        PayableSupplier(
            supplier_id=sid,
            supplier_name=summary.name,
            open_purchases=summary.purchase_count,
            open_expenses=summary.expense_count,
            balance_cents=summary.balance_cents,
            oldest_open_date=summary.oldest_date,
        )
        for sid, summary in sorted(totals.items(), key=lambda item: (-item[1].balance_cents, item[1].name))
    ]
    return PayablesOut(
        total_outstanding_cents=sum(supplier.balance_cents for supplier in suppliers),
        suppliers=suppliers,
    )


@router.get("/payables/{supplier_id}", response_model=SupplierPayablesOut)
async def supplier_payables(
    supplier_id: uuid.UUID,
    ctx: OrgContext = Depends(require_permission("payables.view")),
    db: AsyncSession = Depends(get_db),
):
    supplier = await db.scalar(
        select(Supplier).where(
            Supplier.id == supplier_id,
            Supplier.organization_id == ctx.organization_id,
        )
    )
    if supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    purchases = (
        await db.execute(
            select(Purchase)
            .where(
                Purchase.organization_id == ctx.organization_id,
                Purchase.supplier_id == supplier_id,
                Purchase.status == "received",
                Purchase.total_cents > Purchase.amount_paid_cents,
            )
            .order_by(Purchase.purchase_date, Purchase.created_at, Purchase.id)
        )
    ).scalars().all()
    expenses = (
        await db.execute(
            select(Expense)
            .where(
                Expense.organization_id == ctx.organization_id,
                Expense.supplier_id == supplier_id,
                Expense.amount_cents > Expense.amount_paid_cents,
            )
            .order_by(Expense.incurred_at, Expense.created_at, Expense.id)
        )
    ).scalars().all()
    open_purchases = [
        OpenPurchase(
            purchase_id=purchase.id,
            reference=purchase.reference,
            purchase_date=purchase.purchase_date,
            total_cents=purchase.total_cents,
            amount_paid_cents=purchase.amount_paid_cents,
            balance_cents=purchase.total_cents - purchase.amount_paid_cents,
        )
        for purchase in purchases
    ]
    open_expenses = [
        OpenExpense(
            expense_id=expense.id,
            description=expense.description,
            incurred_at=expense.incurred_at,
            amount_cents=expense.amount_cents,
            amount_paid_cents=expense.amount_paid_cents,
            balance_cents=expense.amount_cents - expense.amount_paid_cents,
        )
        for expense in expenses
    ]
    open_items = sorted(
        [
            OpenPayableItem(
                reference_type="purchase",
                reference_id=purchase.id,
                reference=purchase.reference,
                due_date=purchase.purchase_date,
                total_cents=purchase.total_cents,
                amount_paid_cents=purchase.amount_paid_cents,
                balance_cents=purchase.total_cents - purchase.amount_paid_cents,
            )
            for purchase in purchases
        ]
        + [
            OpenPayableItem(
                reference_type="expense",
                reference_id=expense.id,
                reference=expense.description,
                due_date=expense.incurred_at,
                total_cents=expense.amount_cents,
                amount_paid_cents=expense.amount_paid_cents,
                balance_cents=expense.amount_cents - expense.amount_paid_cents,
            )
            for expense in expenses
        ],
        key=lambda item: (item.due_date, str(item.reference_id)),
    )
    return SupplierPayablesOut(
        supplier_id=supplier.id,
        supplier_name=supplier.name,
        balance_cents=sum(item.balance_cents for item in open_items),
        open_purchases=open_purchases,
        open_expenses=open_expenses,
        open_items=open_items,
    )


@router.post("/payments/supplier", response_model=SupplierPaymentOut, status_code=201)
async def pay_supplier(
    body: SupplierPaymentIn,
    response: Response,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1, max_length=128),
    ctx: OrgContext = Depends(require_permission("payments.record")),
    db: AsyncSession = Depends(get_db),
):
    payment, created = await record_supplier_payment(
        db,
        organization_id=ctx.organization_id,
        user_id=ctx.user.id,
        supplier_id=body.supplier_id,
        amount_cents=body.amount_cents,
        method=body.method,
        purchase_id=body.purchase_id,
        expense_id=body.expense_id,
        payment_date=body.payment_date,
        note=body.note,
        idempotency_key=idempotency_key,
    )
    if not created:
        response.status_code = 200
    return await _supplier_payment_out(db, ctx.organization_id, payment.id)
