"""Money rules for the whole backend.

Operational tables (sales, purchases, payments, expenses, products) store money as
INTEGER "cents": hundredths of the currency's major unit, for every currency.
    1250  means  12.50  (and for a currency without decimals, 1250 means 12.50 units).
The ledger (journal lines) stores exact decimals in major units (Numeric 19,4).
Convert ONLY with these helpers, never with float maths.
"""
from decimal import Decimal

_HUNDRED = Decimal(100)
_LEGACY_SCALE = 2
_ZERO_DECIMAL_CURRENCIES = frozenset({"RWF", "UGX", "XAF", "XOF"})


def currency_exponent(currency: str) -> int:
    """Return the configured ISO currency fraction digits for supported currencies.

    The API currently supports currencies with zero or two minor-unit digits.
    Persist the exponent on each organization so legacy businesses retain their
    original two-decimal interpretation after this policy is introduced.
    """
    code = currency.strip().upper()
    if len(code) != 3 or not code.isalpha():
        raise ValueError("Currency must be a three-letter ISO code")
    return 0 if code in _ZERO_DECIMAL_CURRENCIES else 2


def currency_scale(exponent: int) -> int:
    """Return the storage increment for one valid currency amount step.

    Operational integer columns still use a legacy scale of 100 per major
    unit. Exponent 0 therefore requires stored amounts to be multiples of 100.
    """
    if exponent < 0 or exponent > _LEGACY_SCALE:
        raise ValueError("The current amount storage supports currency exponents from 0 to 2")
    return 10 ** (_LEGACY_SCALE - exponent)


def validate_currency_precision(amount_scaled: int, exponent: int) -> None:
    """Reject amounts containing fractions smaller than the configured currency unit."""
    scale = currency_scale(exponent)
    if amount_scaled % scale:
        raise ValueError("The amount has more fractional digits than this currency allows")


def round_to_currency_precision(amount_scaled: int, exponent: int) -> int:
    """Round a nonnegative amount, in legacy hundredths, half-up to currency precision."""
    if amount_scaled < 0:
        raise ValueError("Amounts cannot be negative")
    increment = currency_scale(exponent)
    return ((amount_scaled + increment // 2) // increment) * increment


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
