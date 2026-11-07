import uuid
from datetime import date, datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.accounting import Account
from app.models.expenses import Expense, ExpenseCategory
from app.models.organization import Organization
from app.models.payments import Payment, PaymentAllocation
from app.models.supplier import Supplier
from app.money import cents_to_decimal, validate_currency_precision
from app.services.accounting.journal_service import JournalLineInput, create_and_post_journal_entry
from app.services.expenses_calc import ExpenseError, expense_amounts, expense_ledger_lines

METHOD_ACCOUNT = {"cash": "1000", "bank": "1010", "card": "1010", "mobile_money": "1010", "other": "1010"}


async def create_expense_category(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    name: str,
    account_id: uuid.UUID,
) -> ExpenseCategory:
    name = name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Category name cannot be blank")
    account = await db.scalar(
        select(Account).where(
            Account.id == account_id,
            Account.organization_id == organization_id,
            Account.account_type == "expense",
            Account.is_active.is_(True),
        )
    )
    if account is None:
        raise HTTPException(status_code=404, detail="Expense account not found")
    existing = await db.scalar(
        select(ExpenseCategory.id).where(
            ExpenseCategory.organization_id == organization_id,
            func.lower(ExpenseCategory.name) == name.lower(),
        )
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="An expense category with this name already exists")

    category = ExpenseCategory(
        organization_id=organization_id,
        name=name,
        account_id=account_id,
    )
    db.add(category)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing = await db.scalar(
            select(ExpenseCategory.id).where(
                ExpenseCategory.organization_id == organization_id,
                func.lower(ExpenseCategory.name) == name.lower(),
            )
        )
        if existing is not None:
            raise HTTPException(status_code=409, detail="An expense category with this name already exists")
        raise
    await db.refresh(category)
    return category


async def create_expense(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    category_id: uuid.UUID,
    amount_cents: int,
    amount_paid_cents: int,
    payment_method: str | None,
    incurred_at: date,
    supplier_id: uuid.UUID | None,
    description: str,
    idempotency_key: str,
    notes: str | None = None,
) -> tuple[Expense, bool]:
    existing = await db.scalar(
        select(Expense).where(
            Expense.organization_id == organization_id,
            Expense.idempotency_key == idempotency_key,
        )
    )
    if existing is not None:
        return existing, False

    org = await db.scalar(select(Organization).where(Organization.id == organization_id))
    try:
        validate_currency_precision(amount_cents, org.currency_exponent)
        validate_currency_precision(amount_paid_cents, org.currency_exponent)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    today = datetime.now(ZoneInfo(org.timezone or "UTC")).date()
    if incurred_at > today:
        raise HTTPException(status_code=422, detail="The expense date cannot be in the future")

    category = await db.scalar(
        select(ExpenseCategory).where(
            ExpenseCategory.id == category_id,
            ExpenseCategory.organization_id == organization_id,
        )
    )
    if category is None:
        raise HTTPException(status_code=404, detail="Expense category not found")
    account = await db.scalar(
        select(Account).where(
            Account.id == category.account_id,
            Account.organization_id == organization_id,
            Account.account_type == "expense",
            Account.is_active.is_(True),
        )
    )
    if account is None:
        raise HTTPException(status_code=409, detail="This expense category is not linked to an active expense account")
    if supplier_id is not None:
        found = await db.scalar(
            select(Supplier.id).where(
                Supplier.id == supplier_id,
                Supplier.organization_id == organization_id,
            )
        )
        if found is None:
            raise HTTPException(status_code=404, detail="Supplier not found")

    try:
        expense_amounts(amount_cents, amount_paid_cents, supplier_id is not None)
    except ExpenseError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    if amount_paid_cents and payment_method is None:
        raise HTTPException(status_code=422, detail="A payment method is required when money is paid")
    if not amount_paid_cents and payment_method is not None:
        raise HTTPException(status_code=422, detail="A payment method is only valid when money is paid")

    expense = Expense(
        organization_id=organization_id,
        category_id=category_id,
        supplier_id=supplier_id,
        amount_cents=amount_cents,
        amount_paid_cents=amount_paid_cents,
        idempotency_key=idempotency_key,
        description=description,
        notes=notes,
        incurred_at=incurred_at,
        created_by=user_id,
    )
    db.add(expense)
    await db.flush()

    if amount_paid_cents and payment_method is not None:
        payment = Payment(
            organization_id=organization_id,
            supplier_id=supplier_id,
            method=payment_method,
            amount_cents=amount_paid_cents,
            direction="out",
            payment_date=incurred_at,
            note=description,
            created_by=user_id,
        )
        db.add(payment)
        await db.flush()
        db.add(
            PaymentAllocation(
                payment_id=payment.id,
                reference_type="expense",
                reference_id=expense.id,
                amount_cents=amount_paid_cents,
            )
        )

    payment_account_code = METHOD_ACCOUNT[payment_method] if payment_method else None
    ledger_lines = expense_ledger_lines(
        account.account_code,
        amount_cents,
        amount_paid_cents,
        payment_account_code,
    )
    account_codes = {line.account_code for line in ledger_lines}
    account_rows = (
        await db.execute(
            select(Account.account_code, Account.id).where(
                Account.organization_id == organization_id,
                Account.account_code.in_(account_codes),
                Account.is_active.is_(True),
            )
        )
    ).all()
    accounts = {code: account_id for code, account_id in account_rows}
    if set(account_codes) - accounts.keys():
        raise HTTPException(status_code=500, detail="Accounting is not set up for this business")

    await create_and_post_journal_entry(
        db,
        organization_id,
        incurred_at,
        [
            JournalLineInput(
                accounts[line.account_code],
                debit=cents_to_decimal(line.debit_cents),
                credit=cents_to_decimal(line.credit_cents),
                supplier_id=supplier_id if line.account_code == "2000" else None,
            )
            for line in ledger_lines
        ],
        description=f"Expense: {description}",
        source_type="expense",
        source_id=expense.id,
        posted_by=user_id,
        commit=False,
    )

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing = await db.scalar(
            select(Expense).where(
                Expense.organization_id == organization_id,
                Expense.idempotency_key == idempotency_key,
            )
        )
        if existing is not None:
            return existing, False
        raise
    return expense, True
