import asyncio
from datetime import date
from decimal import Decimal

from app.database import AsyncSessionLocal
from app.models.organization import Organization
from app.services.accounting.chart_of_accounts_service import seed_default_chart_of_accounts
from app.services.accounting.journal_service import create_and_post_journal_entry, JournalLineInput
from app.services.accounting.trial_balance_service import get_trial_balance


async def main():
    async with AsyncSessionLocal() as db:
        org = Organization(name="Test Business")
        db.add(org)
        await db.commit()
        await db.refresh(org)
        print(f"Created organization: {org.id}")

        accounts = await seed_default_chart_of_accounts(db, org.id)
        print(f"Seeded {len(accounts)} accounts")

        cash = next(a for a in accounts if a.account_code == "1000")
        revenue = next(a for a in accounts if a.account_code == "4000")

        entry = await create_and_post_journal_entry(
            db=db,
            organization_id=org.id,
            entry_date=date.today(),
            description="Test cash sale",
            source_type="manual_test",
            lines=[
                JournalLineInput(account_id=cash.id, debit=Decimal("100.00")),
                JournalLineInput(account_id=revenue.id, credit=Decimal("100.00")),
            ],
        )
        print(f"Posted journal entry: {entry.entry_number}")

        trial_balance = await get_trial_balance(db, org.id)
        print("\nTrial Balance:")
        for row in trial_balance["rows"]:
            print(f"  {row['account_code']} {row['account_name']:30s} Dr {row['debit_balance']:>10} Cr {row['credit_balance']:>10}")
        print(f"\nTotal Debits:  {trial_balance['total_debit_balances']}")
        print(f"Total Credits: {trial_balance['total_credit_balances']}")
        print(f"Balanced: {trial_balance['is_balanced']}")


if __name__ == "__main__":
    asyncio.run(main())