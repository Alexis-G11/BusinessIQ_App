import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.accounting import Account

# (account_code, name, account_type, normal_balance)
DEFAULT_CHART_OF_ACCOUNTS = [
    ("1000", "Cash", "asset", "debit"),
    ("1010", "Bank", "asset", "debit"),
    ("1100", "Accounts Receivable", "asset", "debit"),
    ("1200", "Inventory", "asset", "debit"),
    ("2000", "Accounts Payable", "liability", "credit"),
    ("2100", "Sales Tax Payable", "liability", "credit"),
    ("3000", "Owner Capital", "equity", "credit"),
    ("3100", "Owner Drawings", "equity", "debit"),
    ("3200", "Retained Earnings", "equity", "credit"),
    ("4000", "Sales Revenue", "revenue", "credit"),
    ("4900", "Sales Refunds & Returns", "revenue", "debit"),
    ("5000", "Cost of Goods Sold", "cost_of_goods_sold", "debit"),
    ("6000", "Rent Expense", "expense", "debit"),
    ("6100", "Payroll Expense", "expense", "debit"),
    ("6200", "Utilities Expense", "expense", "debit"),
    ("6300", "Supplies Expense", "expense", "debit"),
    ("6900", "General Expense", "expense", "debit"),
    ("7000", "Other Income", "other_income", "credit"),
    ("7900", "Other Expense", "other_expense", "debit"),
]


async def seed_default_chart_of_accounts(db: AsyncSession, organization_id: uuid.UUID) -> list[Account]:
    """Called once, right after an organization is created."""
    accounts = []
    for account_code, name, account_type, normal_balance in DEFAULT_CHART_OF_ACCOUNTS:
        account = Account(
            organization_id=organization_id,
            account_code=account_code,
            name=name,
            account_type=account_type,
            normal_balance=normal_balance,
            is_system_account=True,  # created automatically — protect from accidental deletion later
        )
        db.add(account)
        accounts.append(account)

    await db.commit()
    for account in accounts:
        await db.refresh(account)
    return accounts