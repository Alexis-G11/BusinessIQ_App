"""Pure calculations for reproducible, journal-backed financial statements."""
from dataclasses import dataclass
from decimal import Decimal
from typing import Iterable


ZERO = Decimal("0")


@dataclass(frozen=True)
class IncomeStatementAccount:
    account_code: str
    account_name: str
    account_type: str
    debit: Decimal
    credit: Decimal


@dataclass(frozen=True)
class IncomeStatementLine:
    account_code: str
    account_name: str
    account_type: str
    amount: Decimal


@dataclass(frozen=True)
class IncomeStatement:
    lines: tuple[IncomeStatementLine, ...]
    revenue: Decimal
    cost_of_goods_sold: Decimal
    gross_profit: Decimal
    operating_expenses: Decimal
    operating_income: Decimal
    other_income: Decimal
    other_expenses: Decimal
    net_income: Decimal


def build_income_statement(accounts: Iterable[IncomeStatementAccount]) -> IncomeStatement:
    """Build totals using account classes and posted debit/credit movements.

    Revenue and other-income accounts are credit-positive (so contra-revenue
    debits reduce revenue). Expense and COGS accounts are debit-positive.
    """
    lines: list[IncomeStatementLine] = []
    totals = {
        "revenue": ZERO,
        "cost_of_goods_sold": ZERO,
        "expense": ZERO,
        "other_income": ZERO,
        "other_expense": ZERO,
    }
    for account in accounts:
        if account.account_type not in totals:
            continue
        amount = (
            account.credit - account.debit
            if account.account_type in {"revenue", "other_income"}
            else account.debit - account.credit
        )
        totals[account.account_type] += amount
        lines.append(IncomeStatementLine(
            account_code=account.account_code,
            account_name=account.account_name,
            account_type=account.account_type,
            amount=amount,
        ))

    gross_profit = totals["revenue"] - totals["cost_of_goods_sold"]
    operating_income = gross_profit - totals["expense"]
    net_income = operating_income + totals["other_income"] - totals["other_expense"]
    return IncomeStatement(
        lines=tuple(lines),
        revenue=totals["revenue"],
        cost_of_goods_sold=totals["cost_of_goods_sold"],
        gross_profit=gross_profit,
        operating_expenses=totals["expense"],
        operating_income=operating_income,
        other_income=totals["other_income"],
        other_expenses=totals["other_expense"],
        net_income=net_income,
    )
