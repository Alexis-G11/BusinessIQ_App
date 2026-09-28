import uuid 
from datetime import date
from decimal import Decimal 
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.accounting import Account
from app.services.accounting.ledger_service import get_account_ledger

async def get_trail_balance(
        db:AsyncSession,
        organizatiomn_id: uuid.UUID,
        as_of: date | None = None,
) -> dict:
   accounts_result = await db.execute(
      select(Account)
      .where(Account.organization_id ==  organizatiomn_id, Account.is_active == True)
      .order_by(Account.account_code)
   )
   accounts = accounts_result.scalars().all()

   rows = []
   total_debit_balances = Decimal("0")
   total_credit_balances = Decimal("0")

   for account in accounts:
      ledger = await get_account_ledger(db, organization_id, account.id, to_date=as_of)
      balance = ledger["closing_balance"]
        if balance == 0:
            continue  # skip untouched accounts, keeps the report readable

        if account.normal_balance == "debit":
            debit_balance = balance if balance > 0 else Decimal("0")
            credit_balance = -balance if balance < 0 else Decimal("0")
        else:
            credit_balance = balance if balance > 0 else Decimal("0")
            debit_balance = -balance if balance < 0 else Decimal("0")

        rows.append({
            "account_code": account.account_code,
            "account_name": account.name,
            "debit_balance": debit_balance,
            "credit_balance": credit_balance,
        })
        total_debit_balances += debit_balance
        total_credit_balances += credit_balance

    return {
        "as_of": as_of,
        "rows": rows,
        "total_debit_balances": total_debit_balances,
        "total_credit_balances": total_credit_balances,
        "is_balanced": total_debit_balances == total_credit_balances,
    }