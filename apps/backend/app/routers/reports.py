import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.accounting import Account, JournalEntry, JournalLine
from app.permissions import OrgContext, require_permission
from app.services.accounting.financial_reports import (
    IncomeStatementAccount,
    build_income_statement,
)

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


class IncomeStatementLineOut(BaseModel):
    account_code: str
    account_name: str
    account_type: str
    amount: Decimal


class IncomeStatementOut(BaseModel):
    organization_id: uuid.UUID
    period_start: date
    period_end: date
    currency: str
    currency_basis: str
    accounting_basis: str
    source: str
    lines: list[IncomeStatementLineOut]
    revenue: Decimal
    cost_of_goods_sold: Decimal
    gross_profit: Decimal
    operating_expenses: Decimal
    operating_income: Decimal
    other_income: Decimal
    other_expenses: Decimal
    net_income: Decimal


@router.get("/income-statement", response_model=IncomeStatementOut)
async def income_statement(
    from_date: date = Query(alias="from"),
    to_date: date = Query(alias="to"),
    ctx: OrgContext = Depends(require_permission("reports.view")),
    db: AsyncSession = Depends(get_db),
):
    """Return an accrual-basis statement from posted journal activity only."""
    if from_date > to_date:
        raise HTTPException(status_code=422, detail="The report start date must not be after its end date")

    totals = func.coalesce(func.sum(JournalLine.debit), 0)
    credits = func.coalesce(func.sum(JournalLine.credit), 0)
    result = await db.execute(
        select(
            Account.account_code,
            Account.name,
            Account.account_type,
            totals.label("debits"),
            credits.label("credits"),
        )
        .select_from(Account)
        .join(JournalLine, JournalLine.account_id == Account.id)
        .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
        .where(
            Account.organization_id == ctx.organization_id,
            JournalEntry.organization_id == ctx.organization_id,
            JournalEntry.status == "posted",
            JournalEntry.entry_date >= from_date,
            JournalEntry.entry_date <= to_date,
            Account.account_type.in_((
                "revenue", "cost_of_goods_sold", "expense", "other_income", "other_expense",
            )),
        )
        .group_by(Account.id, Account.account_code, Account.name, Account.account_type)
        .order_by(Account.account_code)
    )
    accounts = [
        IncomeStatementAccount(
            account_code=code,
            account_name=name,
            account_type=account_type,
            debit=Decimal(debits or 0),
            credit=Decimal(credits or 0),
        )
        for code, name, account_type, debits, credits in result.all()
    ]
    statement = build_income_statement(accounts)
    return IncomeStatementOut(
        organization_id=ctx.organization_id,
        period_start=from_date,
        period_end=to_date,
        currency=ctx.currency,
        currency_basis="business_currency",
        accounting_basis="accrual",
        source="posted_journal_entries",
        lines=[IncomeStatementLineOut(**line.__dict__) for line in statement.lines],
        revenue=statement.revenue,
        cost_of_goods_sold=statement.cost_of_goods_sold,
        gross_profit=statement.gross_profit,
        operating_expenses=statement.operating_expenses,
        operating_income=statement.operating_income,
        other_income=statement.other_income,
        other_expenses=statement.other_expenses,
        net_income=statement.net_income,
    )
