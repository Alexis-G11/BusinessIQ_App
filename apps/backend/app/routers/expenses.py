import uuid
from datetime import date, datetime
from typing import Literal

from fastapi import APIRouter, Depends, Header, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.accounting import Account
from app.models.expenses import Expense, ExpenseCategory
from app.models.payments import Payment, PaymentAllocation
from app.models.supplier import Supplier
from app.permissions import OrgContext, require_permission
from app.services.expenses_service import create_expense, create_expense_category

router = APIRouter(prefix="/api/v1", tags=["expenses"])

PaymentMethod = Literal["cash", "bank", "card", "mobile_money", "other"]


class ExpenseCategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    account_id: uuid.UUID


class ExpenseCategoryOut(BaseModel):
    id: uuid.UUID
    name: str
    account_id: uuid.UUID
    account_code: str
    account_name: str


class ExpenseAccountOut(BaseModel):
    id: uuid.UUID
    account_code: str
    name: str


class ExpenseIn(BaseModel):
    category_id: uuid.UUID
    amount_cents: int = Field(gt=0, le=2_000_000_000)
    amount_paid_cents: int = Field(default=0, ge=0, le=2_000_000_000)
    payment_method: PaymentMethod | None = None
    incurred_at: date
    supplier_id: uuid.UUID | None = None
    description: str = Field(min_length=1, max_length=1000)
    notes: str | None = Field(default=None, max_length=4000)


class ExpenseOut(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    category_name: str
    supplier_id: uuid.UUID | None
    supplier_name: str | None
    amount_cents: int
    amount_paid_cents: int
    balance_cents: int
    payment_status: str
    payment_method: str | None
    incurred_at: date
    description: str
    notes: str | None
    created_by: uuid.UUID | None
    created_at: datetime


class ExpenseSummaryRow(BaseModel):
    category_id: uuid.UUID
    category_name: str
    total_cents: int
    count: int


class ExpenseSummaryOut(BaseModel):
    total_cents: int
    count: int
    categories: list[ExpenseSummaryRow]


async def _category_out(db: AsyncSession, category: ExpenseCategory) -> ExpenseCategoryOut:
    account = await db.scalar(
        select(Account).where(
            Account.id == category.account_id,
            Account.organization_id == category.organization_id,
        )
    )
    return ExpenseCategoryOut(
        id=category.id,
        name=category.name,
        account_id=account.id,
        account_code=account.account_code,
        account_name=account.name,
    )


async def _expense_out(
    db: AsyncSession,
    organization_id: uuid.UUID,
    expense: Expense,
    category_name: str | None = None,
    supplier_name: str | None = None,
) -> ExpenseOut:
    if category_name is None:
        category_name = await db.scalar(
            select(ExpenseCategory.name).where(
                ExpenseCategory.id == expense.category_id,
                ExpenseCategory.organization_id == organization_id,
            )
        )
    if expense.supplier_id is not None and supplier_name is None:
        supplier_name = await db.scalar(
            select(Supplier.name).where(
                Supplier.id == expense.supplier_id,
                Supplier.organization_id == organization_id,
            )
        )
    payment_method = await db.scalar(
        select(Payment.method)
        .join(PaymentAllocation, PaymentAllocation.payment_id == Payment.id)
        .where(
            Payment.organization_id == organization_id,
            PaymentAllocation.reference_type == "expense",
            PaymentAllocation.reference_id == expense.id,
        )
    )
    return ExpenseOut(
        id=expense.id,
        category_id=expense.category_id,
        category_name=category_name or "",
        supplier_id=expense.supplier_id,
        supplier_name=supplier_name,
        amount_cents=expense.amount_cents,
        amount_paid_cents=expense.amount_paid_cents,
        balance_cents=expense.amount_cents - expense.amount_paid_cents,
        payment_status="paid"
        if expense.amount_paid_cents == expense.amount_cents
        else "unpaid"
        if expense.amount_paid_cents == 0
        else "partial",
        payment_method=payment_method,
        incurred_at=expense.incurred_at,
        description=expense.description,
        notes=expense.notes,
        created_by=expense.created_by,
        created_at=expense.created_at,
    )


@router.get("/expense-categories", response_model=list[ExpenseCategoryOut])
async def list_expense_categories(
    ctx: OrgContext = Depends(require_permission("expenses.view")),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(ExpenseCategory, Account.account_code, Account.name)
            .join(
                Account,
                (Account.id == ExpenseCategory.account_id)
                & (Account.organization_id == ctx.organization_id)
                & (Account.account_type == "expense"),
            )
            .where(ExpenseCategory.organization_id == ctx.organization_id)
            .order_by(ExpenseCategory.name)
        )
    ).all()
    return [
        ExpenseCategoryOut(
            id=category.id,
            name=category.name,
            account_id=category.account_id,
            account_code=account_code,
            account_name=account_name,
        )
        for category, account_code, account_name in rows
    ]


@router.get("/expense-accounts", response_model=list[ExpenseAccountOut])
async def list_expense_accounts(
    ctx: OrgContext = Depends(require_permission("expenses.view")),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(Account.id, Account.account_code, Account.name)
            .where(
                Account.organization_id == ctx.organization_id,
                Account.account_type == "expense",
                Account.is_active.is_(True),
            )
            .order_by(Account.account_code)
        )
    ).all()
    return [
        ExpenseAccountOut(id=account_id, account_code=account_code, name=name)
        for account_id, account_code, name in rows
    ]


@router.post("/expense-categories", response_model=ExpenseCategoryOut, status_code=201)
async def add_expense_category(
    body: ExpenseCategoryIn,
    ctx: OrgContext = Depends(require_permission("expenses.create")),
    db: AsyncSession = Depends(get_db),
):
    category = await create_expense_category(
        db,
        organization_id=ctx.organization_id,
        name=body.name.strip(),
        account_id=body.account_id,
    )
    return await _category_out(db, category)


@router.post("/expenses", response_model=ExpenseOut, status_code=201)
async def add_expense(
    body: ExpenseIn,
    response: Response,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1, max_length=128),
    ctx: OrgContext = Depends(require_permission("expenses.create")),
    db: AsyncSession = Depends(get_db),
):
    expense, created = await create_expense(
        db,
        organization_id=ctx.organization_id,
        user_id=ctx.user.id,
        category_id=body.category_id,
        amount_cents=body.amount_cents,
        amount_paid_cents=body.amount_paid_cents,
        payment_method=body.payment_method,
        incurred_at=body.incurred_at,
        supplier_id=body.supplier_id,
        description=body.description.strip(),
        notes=body.notes.strip() if body.notes and body.notes.strip() else None,
        idempotency_key=idempotency_key,
    )
    if not created:
        response.status_code = 200

    return await _expense_out(db, ctx.organization_id, expense)


@router.get("/expenses", response_model=list[ExpenseOut])
async def list_expenses(
    category_id: uuid.UUID | None = None,
    supplier_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: OrgContext = Depends(require_permission("expenses.view")),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Expense, ExpenseCategory.name, Supplier.name)
        .join(
            ExpenseCategory,
            (ExpenseCategory.id == Expense.category_id)
            & (ExpenseCategory.organization_id == ctx.organization_id),
        )
        .outerjoin(
            Supplier,
            (Supplier.id == Expense.supplier_id)
            & (Supplier.organization_id == ctx.organization_id),
        )
        .where(Expense.organization_id == ctx.organization_id)
    )
    if category_id is not None:
        stmt = stmt.where(Expense.category_id == category_id)
    if supplier_id is not None:
        stmt = stmt.where(Expense.supplier_id == supplier_id)
    if date_from is not None:
        stmt = stmt.where(Expense.incurred_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(Expense.incurred_at <= date_to)
    rows = (
        await db.execute(
            stmt.order_by(Expense.incurred_at.desc(), Expense.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    ).all()
    return [
        await _expense_out(db, ctx.organization_id, expense, category_name, supplier_name)
        for expense, category_name, supplier_name in rows
    ]


@router.get("/expenses/summary", response_model=ExpenseSummaryOut)
async def expense_summary(
    date_from: date | None = None,
    date_to: date | None = None,
    ctx: OrgContext = Depends(require_permission("expenses.view")),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(
            Expense.category_id,
            ExpenseCategory.name,
            func.sum(Expense.amount_cents),
            func.count(Expense.id),
        )
        .join(
            ExpenseCategory,
            (ExpenseCategory.id == Expense.category_id)
            & (ExpenseCategory.organization_id == ctx.organization_id),
        )
        .where(Expense.organization_id == ctx.organization_id)
        .group_by(Expense.category_id, ExpenseCategory.name)
        .order_by(func.sum(Expense.amount_cents).desc(), ExpenseCategory.name)
    )
    if date_from is not None:
        stmt = stmt.where(Expense.incurred_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(Expense.incurred_at <= date_to)
    rows = (await db.execute(stmt)).all()
    categories = [
        ExpenseSummaryRow(
            category_id=category_id,
            category_name=name,
            total_cents=int(total),
            count=int(count),
        )
        for category_id, name, total, count in rows
    ]
    return ExpenseSummaryOut(
        total_cents=sum(category.total_cents for category in categories),
        count=sum(category.count for category in categories),
        categories=categories,
    )
