"""Ledger smoke test. Safe: it posts entries inside a transaction and ROLLS BACK,
so nothing is left in your books.

Usage (from backend/):   python -m scripts.smoke_ledger
"""
import asyncio
import sys
from datetime import date
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, select

from app.database import AsyncSessionLocal, engine
from app.models.accounting import Account, JournalEntry
from app.models.organization import Organization
from app.money import apply_bps, cents_to_decimal, decimal_to_cents
from app.services.accounting.journal_service import JournalLineInput, create_and_post_journal_entry

RESULTS = []


def check(name, got, expected):
    ok = got == expected
    RESULTS.append(ok)
    print(("PASS  " if ok else "FAIL  ") + name + ("" if ok else f"   (got {got!r}, expected {expected!r})"))


def money_checks():
    check("money: 1250 cents is 12.50", cents_to_decimal(1250), Decimal("12.50"))
    check("money: 12.50 is 1250 cents", decimal_to_cents(Decimal("12.50")), 1250)
    check("money: 8% of 1250 is 100", apply_bps(1250, 800), 100)
    check("money: 8% of 1999 rounds half up to 160", apply_bps(1999, 800), 160)
    try:
        decimal_to_cents(Decimal("0.005"))
        refused = False
    except ValueError:
        refused = True
    check("money: half a cent is refused", refused, True)


async def count_entries(db, org_id):
    return await db.scalar(select(func.count()).select_from(JournalEntry).where(JournalEntry.organization_id == org_id))


async def ledger_checks():
    async with AsyncSessionLocal() as db:
        org = await db.scalar(select(Organization).order_by(Organization.created_at.desc()).limit(1))
        org_id = org.id  # read now: after a rollback the ORM objects are expired and cannot be read
        rows = (await db.execute(select(Account).where(Account.organization_id == org_id))).scalars()
        accounts = {a.account_code: a for a in rows}
        cash, sales = accounts["1000"], accounts["4000"]
        before = await count_entries(db, org_id)

        def balanced():
            return [
                JournalLineInput(cash.id, debit=Decimal("12.50")),
                JournalLineInput(sales.id, credit=Decimal("12.50")),
            ]

        first = await create_and_post_journal_entry(db, org_id, date.today(), balanced(), description="smoke test", commit=False)
        second = await create_and_post_journal_entry(db, org_id, date.today(), balanced(), description="smoke test", commit=False)
        check(
            "ledger: entry numbers are consecutive inside one transaction",
            (first.entry_number, second.entry_number),
            (f"JE-{before + 1:06d}", f"JE-{before + 2:06d}"),
        )
        check("ledger: entry is posted and time-stamped", first.status == "posted" and first.posted_at is not None, True)

        unbalanced = [JournalLineInput(cash.id, debit=Decimal("5")), JournalLineInput(sales.id, credit=Decimal("4"))]
        try:
            await create_and_post_journal_entry(db, org_id, date.today(), unbalanced, commit=False)
            rejected = False
        except HTTPException as exc:
            rejected = exc.status_code == 400
        check("ledger: unbalanced entry is rejected", rejected, True)

        await db.rollback()
        check("ledger: rollback left nothing behind", await count_entries(db, org_id), before)
    await engine.dispose()


def main():
    money_checks()
    asyncio.run(ledger_checks())
    passed = sum(RESULTS)
    print(f"\n{passed}/{len(RESULTS)} checks passed")
    sys.exit(0 if passed == len(RESULTS) else 1)


if __name__ == "__main__":
    main()
