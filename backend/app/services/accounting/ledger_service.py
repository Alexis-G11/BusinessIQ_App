import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.accounting import Account, JournalEntry, JournalLine


def _signed_amount(account: Account, line: JournalLine) -> Decimal:
    """The rule described above, as code."""
    if account.normal_balance == "debit":
        return line.debit - line.credit
    else:
        return line.credit - line.debit


async def get_account_ledger(
    db: AsyncSession,
    organization_id: uuid.UUID,
    account_id: uuid.UUID,
    from_date: date | None = None,
    to_date: date | None = None,
) -> dict:
    """Every posted line for this account, in date order, with a running balance."""
    account = await db.get(Account, account_id)
    if not account or account.organization_id != organization_id:
        raise ValueError("Account not found in this organization")

    opening_balance = Decimal("0")
    if from_date:
        opening_result = await db.execute(
            select(JournalLine)
            .join(JournalEntry, JournalLine.journal_entry_id == JournalEntry.id)
            .where(
                JournalEntry.organization_id == organization_id,
                JournalEntry.status == "posted",
                JournalLine.account_id == account_id,
                JournalEntry.entry_date < from_date,
            )
        )
        for line in opening_result.scalars().all():
            opening_balance += _signed_amount(account, line)

    conditions = [
        JournalEntry.organization_id == organization_id,
        JournalEntry.status == "posted",
        JournalLine.account_id == account_id,
    ]
    if from_date:
        conditions.append(JournalEntry.entry_date >= from_date)
    if to_date:
        conditions.append(JournalEntry.entry_date <= to_date)

    result = await db.execute(
        select(JournalLine, JournalEntry)
        .join(JournalEntry, JournalLine.journal_entry_id == JournalEntry.id)
        .where(and_(*conditions))
        .order_by(JournalEntry.entry_date, JournalEntry.entry_number)
    )

    running_balance = opening_balance
    entries = []
    for line, entry in result.all():
        running_balance += _signed_amount(account, line)
        entries.append({
            "date": entry.entry_date,
            "entry_number": entry.entry_number,
            "description": line.description or entry.description,
            "debit": line.debit,
            "credit": line.credit,
            "running_balance": running_balance,
        })

    return {
        "account_code": account.account_code,
        "account_name": account.name,
        "normal_balance": account.normal_balance,
        "opening_balance": opening_balance,
        "closing_balance": running_balance,
        "lines": entries,
    }


async def get_t_account(
    db: AsyncSession,
    organization_id: uuid.UUID,
    account_id: uuid.UUID,
    from_date: date | None = None,
    to_date: date | None = None,
) -> dict:
    """Same data as the ledger, reshaped into the classic two-column T-account view."""
    ledger = await get_account_ledger(db, organization_id, account_id, from_date, to_date)
    return {
        "account_code": ledger["account_code"],
        "account_name": ledger["account_name"],
        "debits": [l for l in ledger["lines"] if l["debit"] > 0],
        "credits": [l for l in ledger["lines"] if l["credit"] > 0],
        "balance": ledger["closing_balance"],
    }
