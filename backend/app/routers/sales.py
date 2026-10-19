import uuid
from datetime import date, datetime
from typing import Literal

from fastapi import APIRouter, Depends, Header, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.customer import Customer
from app.models.sales import Sale
from app.permissions import OrgContext, require_permission
from app.services.sales_service import SaleItemInput, SalePaymentInput, create_sale, load_sale

router = APIRouter(prefix="/api/v1/sales", tags=["sales"])

PaymentMethod = Literal["cash", "bank", "card", "mobile_money", "other"]


class SaleItemIn(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(ge=1, le=100000)


class SalePaymentIn(BaseModel):
    method: PaymentMethod
    amount_cents: int = Field(gt=0, le=2_000_000_000)


class SaleCreate(BaseModel):
    customer_id: uuid.UUID | None = None
    items: list[SaleItemIn] = Field(min_length=1, max_length=100)
    payments: list[SalePaymentIn] = Field(default_factory=list, max_length=10)
    discount_cents: int = Field(default=0, ge=0, le=2_000_000_000)
    notes: str | None = Field(default=None, max_length=500)
    sale_date: date | None = None  # defaults to today in the business's timezone


class SaleItemOut(BaseModel):
    product_id: uuid.UUID
    product_name: str
    quantity: int
    unit_price_cents: int
    line_total_cents: int


class SalePaymentOut(BaseModel):
    id: uuid.UUID
    method: str
    amount_cents: int
    payment_date: date


class SaleOut(BaseModel):
    id: uuid.UUID
    reference: str | None
    sale_date: date
    status: str
    customer_id: uuid.UUID | None
    customer_name: str | None
    subtotal_cents: int
    discount_cents: int
    tax_cents: int
    total_cents: int
    amount_paid_cents: int
    balance_cents: int  # what the customer still owes on this sale
    payment_status: str
    notes: str | None
    created_by: uuid.UUID | None
    created_at: datetime
    items: list[SaleItemOut]
    payments: list[SalePaymentOut]


class SaleSummary(BaseModel):
    id: uuid.UUID
    reference: str | None
    sale_date: date
    status: str
    customer_id: uuid.UUID | None
    customer_name: str | None
    total_cents: int
    amount_paid_cents: int
    balance_cents: int
    payment_status: str
    created_at: datetime


async def _sale_out(db: AsyncSession, organization_id: uuid.UUID, sale_id: uuid.UUID) -> SaleOut:
    sale, items, payments, customer_name = await load_sale(db, organization_id, sale_id)
    return SaleOut(
        id=sale.id,
        reference=sale.reference,
        sale_date=sale.sale_date,
        status=sale.status,
        customer_id=sale.customer_id,
        customer_name=customer_name,
        subtotal_cents=sale.subtotal_cents,
        discount_cents=sale.discount_cents,
        tax_cents=sale.tax_cents,
        total_cents=sale.total_cents,
        amount_paid_cents=sale.amount_paid_cents,
        balance_cents=sale.total_cents - sale.amount_paid_cents,
        payment_status=sale.payment_status,
        notes=sale.notes,
        created_by=sale.created_by,
        created_at=sale.created_at,
        items=[
            SaleItemOut(
                product_id=i.product_id,
                product_name=i.product_name,
                quantity=i.quantity,
                unit_price_cents=i.unit_price_cents,
                line_total_cents=i.quantity * i.unit_price_cents,
            )
            for i in items
        ],
        payments=[
            SalePaymentOut(id=p.id, method=p.method, amount_cents=p.amount_cents, payment_date=p.payment_date)
            for p in payments
        ],
    )


@router.post("", response_model=SaleOut, status_code=201)
async def record_sale(
    body: SaleCreate,
    response: Response,
    idempotency_key: str | None = Header(default=None, max_length=128),
    ctx: OrgContext = Depends(require_permission("sales.create")),
    db: AsyncSession = Depends(get_db),
):
    """Record a sale. Send an Idempotency-Key header so a retried request cannot create a second sale."""
    sale, created = await create_sale(
        db,
        organization_id=ctx.organization_id,
        user_id=ctx.user.id,
        items=[SaleItemInput(i.product_id, i.quantity) for i in body.items],
        payments=[SalePaymentInput(p.method, p.amount_cents) for p in body.payments],
        customer_id=body.customer_id,
        discount_cents=body.discount_cents,
        notes=body.notes,
        sale_date=body.sale_date,
        idempotency_key=idempotency_key,
    )
    if not created:
        response.status_code = 200  # an earlier identical request: here is the original sale
    return await _sale_out(db, ctx.organization_id, sale.id)


@router.get("", response_model=list[SaleSummary])
async def list_sales(
    date_from: date | None = None,
    date_to: date | None = None,
    customer_id: uuid.UUID | None = None,
    payment_status: Literal["paid", "partial", "unpaid"] | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: OrgContext = Depends(require_permission("sales.view")),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Sale, Customer.name)
        .outerjoin(Customer, Customer.id == Sale.customer_id)
        .where(Sale.organization_id == ctx.organization_id)
    )
    if date_from is not None:
        stmt = stmt.where(Sale.sale_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Sale.sale_date <= date_to)
    if customer_id is not None:
        stmt = stmt.where(Sale.customer_id == customer_id)
    if payment_status is not None:
        stmt = stmt.where(Sale.payment_status == payment_status)
    stmt = stmt.order_by(Sale.sale_date.desc(), Sale.created_at.desc()).limit(limit).offset(offset)
    rows = (await db.execute(stmt)).all()
    return [
        SaleSummary(
            id=s.id,
            reference=s.reference,
            sale_date=s.sale_date,
            status=s.status,
            customer_id=s.customer_id,
            customer_name=name,
            total_cents=s.total_cents,
            amount_paid_cents=s.amount_paid_cents,
            balance_cents=s.total_cents - s.amount_paid_cents,
            payment_status=s.payment_status,
            created_at=s.created_at,
        )
        for s, name in rows
    ]


@router.get("/{sale_id}", response_model=SaleOut)
async def get_sale(
    sale_id: uuid.UUID,
    ctx: OrgContext = Depends(require_permission("sales.view")),
    db: AsyncSession = Depends(get_db),
):
    return await _sale_out(db, ctx.organization_id, sale_id)
