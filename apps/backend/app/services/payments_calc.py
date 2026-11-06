"""Pure payment maths: how one customer payment is split across the sales it settles."""
import uuid

MAX_CENTS = 2_000_000_000


class PaymentError(ValueError):
    """A business-rule problem with a payment. The message is safe to show to the user."""


def allocate(open_balances: list[tuple[uuid.UUID, int]], amount_cents: int) -> list[tuple[uuid.UUID, int]]:
    """Split a payment over unpaid sales, in the order given (oldest first).

    open_balances: (sale_id, what is still owed on that sale), each greater than zero.
    Returns (sale_id, amount applied) pairs that add up to exactly amount_cents.
    """
    if amount_cents <= 0 or amount_cents > MAX_CENTS:
        raise PaymentError("The payment amount is not valid")
    owed = sum(balance for _, balance in open_balances)
    if amount_cents > owed:
        raise PaymentError(f"The payment is more than the customer owes ({owed} cents)")

    applied: list[tuple[uuid.UUID, int]] = []
    remaining = amount_cents
    for sale_id, balance in open_balances:
        if remaining == 0:
            break
        part = min(remaining, balance)
        applied.append((sale_id, part))
        remaining -= part
    return applied
