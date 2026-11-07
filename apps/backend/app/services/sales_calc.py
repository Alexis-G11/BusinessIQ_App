"""Pure sales maths: no database, no web framework. Easy to test and reason about."""
from dataclasses import dataclass
from decimal import Decimal

from app.money import apply_bps, cents_to_decimal, round_to_currency_precision

ZERO = Decimal("0")
MAX_CENTS = 2_000_000_000  # database integer columns hold up to about 2.1 billion


class SaleError(ValueError):
    """A business-rule problem with a sale. The message is safe to show to the user."""


@dataclass(frozen=True)
class Totals:
    subtotal_cents: int
    discount_cents: int
    tax_cents: int
    total_cents: int


def compute_totals(
    line_totals: list[int],
    discount_cents: int,
    tax_rate_bps: int,
    currency_exponent: int = 2,
) -> Totals:
    subtotal = sum(line_totals)
    if subtotal > MAX_CENTS:
        raise SaleError("This sale is too large to record")
    if discount_cents < 0 or discount_cents > subtotal:
        raise SaleError("The discount cannot be negative or more than the subtotal")
    taxable = subtotal - discount_cents
    tax = round_to_currency_precision(apply_bps(taxable, tax_rate_bps), currency_exponent)
    return Totals(subtotal, discount_cents, tax, taxable + tax)


def payment_status(total_cents: int, paid_cents: int) -> str:
    if paid_cents > total_cents:
        raise SaleError("The payments add up to more than the sale total")
    if paid_cents == total_cents:
        return "paid"
    return "partial" if paid_cents > 0 else "unpaid"


# Which ledger account receives each payment method. Card, mobile money, bank transfer
# and "other" all land in the Bank account for now.
METHOD_ACCOUNT = {"cash": "cash", "bank": "bank", "card": "bank", "mobile_money": "bank", "other": "bank"}

# Logical account name -> account_code in the default chart of accounts.
ACCOUNT_CODE = {
    "cash": "1000",
    "bank": "1010",
    "receivable": "1100",
    "inventory": "1200",
    "tax_payable": "2100",
    "revenue": "4000",
    "cogs": "5000",
}


@dataclass(frozen=True)
class LedgerLine:
    account: str  # a key of ACCOUNT_CODE
    debit: Decimal = ZERO
    credit: Decimal = ZERO
    for_customer: bool = False  # receivable lines are tagged with the customer who owes


def build_ledger_lines(totals: Totals, paid_by_method: dict[str, int], cogs_cents: int) -> list[LedgerLine]:
    """The journal lines for one sale. Always balanced: total debits == total credits."""
    lines: list[LedgerLine] = []
    paid_total = 0
    for method, cents in paid_by_method.items():
        if cents > 0:
            paid_total += cents
            lines.append(LedgerLine(METHOD_ACCOUNT[method], debit=cents_to_decimal(cents)))

    receivable = totals.total_cents - paid_total  # what the customer still owes
    if receivable > 0:
        lines.append(LedgerLine("receivable", debit=cents_to_decimal(receivable), for_customer=True))

    revenue = totals.subtotal_cents - totals.discount_cents
    if revenue > 0:
        lines.append(LedgerLine("revenue", credit=cents_to_decimal(revenue)))
    if totals.tax_cents > 0:
        lines.append(LedgerLine("tax_payable", credit=cents_to_decimal(totals.tax_cents)))

    if cogs_cents > 0:
        lines.append(LedgerLine("cogs", debit=cents_to_decimal(cogs_cents)))
        lines.append(LedgerLine("inventory", credit=cents_to_decimal(cogs_cents)))
    return lines
