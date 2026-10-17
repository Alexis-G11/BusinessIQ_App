"""Money rules for the whole backend.

Operational tables (sales, purchases, payments, expenses, products) store money as
INTEGER "cents": hundredths of the currency's major unit, for every currency.
    1250  means  12.50  (and for a currency without decimals, 1250 means 12.50 units).
The ledger (journal lines) stores exact decimals in major units (Numeric 19,4).
Convert ONLY with these helpers, never with float maths.
"""
from decimal import Decimal

_HUNDRED = Decimal(100)


def cents_to_decimal(cents: int) -> Decimal:
    """1250 -> Decimal('12.50'). Exact."""
    return (Decimal(cents) / _HUNDRED).quantize(Decimal("0.01"))


def decimal_to_cents(amount: Decimal) -> int:
    """Decimal('12.50') -> 1250. Refuses fractions of a cent instead of silently rounding."""
    cents = Decimal(amount) * _HUNDRED
    if cents != cents.to_integral_value():
        raise ValueError(f"{amount} has a fraction of a cent")
    return int(cents)


def apply_bps(amount_cents: int, bps: int) -> int:
    """A percentage given in basis points (800 = 8.00%), rounded half up, integers only."""
    return (amount_cents * bps + 5000) // 10000