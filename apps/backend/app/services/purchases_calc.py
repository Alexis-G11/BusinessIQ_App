"""Pure purchase and supplier-payment maths."""
import random
import uuid

MAX_CENTS = 2_000_000_000
MAX_QUANTITY = 2_000_000_000


class PurchaseError(ValueError):
    """A purchase business-rule problem with a safe message."""


def purchase_total(lines: list[tuple[int, int]]) -> int:
    """Sum (quantity, unit_cost_cents) lines without exceeding operational money limits."""
    total = 0
    for quantity, unit_cost_cents in lines:
        if quantity <= 0 or quantity > MAX_QUANTITY or unit_cost_cents < 0:
            raise PurchaseError("A purchase line is not valid")
        total += quantity * unit_cost_cents
        if total > MAX_CENTS:
            raise PurchaseError("This purchase is too large to record")
    return total


def weighted_average_cost(
    old_quantity: int,
    old_cost_cents: int,
    received_quantity: int,
    received_cost_cents: int,
) -> int:
    """Return weighted-average unit cost, rounded to the nearest cent (ties up)."""
    if old_quantity < 0 or old_cost_cents < 0 or received_quantity <= 0 or received_cost_cents < 0:
        raise PurchaseError("The inventory cost is not valid")
    denominator = old_quantity + received_quantity
    numerator = old_quantity * old_cost_cents + received_cost_cents
    return (2 * numerator + denominator) // (2 * denominator)


def allocate_supplier_payment(
    open_balances: list[tuple[uuid.UUID | tuple[str, uuid.UUID], int]], amount_cents: int
) -> list[tuple[uuid.UUID | tuple[str, uuid.UUID], int]]:
    """Allocate payment to open purchases in their supplied order, without overpaying."""
    if amount_cents <= 0 or amount_cents > MAX_CENTS:
        raise PurchaseError("The payment amount is not valid")
    if any(balance <= 0 for _, balance in open_balances):
        raise PurchaseError("An open purchase balance is not valid")
    owed = sum(balance for _, balance in open_balances)
    if amount_cents > owed:
        raise PurchaseError(f"The payment is more than the supplier owes ({owed} cents)")

    allocations: list[tuple[uuid.UUID | tuple[str, uuid.UUID], int]] = []
    remaining = amount_cents
    for purchase_id, balance in open_balances:
        if remaining == 0:
            break
        applied = min(remaining, balance)
        allocations.append((purchase_id, applied))
        remaining -= applied
    return allocations


def purchase_ledger_cents(
    total_cents: int, paid_cents: int, payment_account_code: str | None
) -> list[tuple[str, int, int]]:
    """Return (account code, debit cents, credit cents) for one purchase receipt."""
    if total_cents < 0 or total_cents > MAX_CENTS or paid_cents < 0 or paid_cents > total_cents:
        raise PurchaseError("The purchase amounts are not valid")
    if (paid_cents > 0) != (payment_account_code is not None):
        raise PurchaseError("The purchase payment account does not match its paid amount")
    if payment_account_code not in {None, "1000", "1010"}:
        raise PurchaseError("The purchase payment account is not valid")
    if total_cents == 0:
        return []

    lines = [("1200", total_cents, 0)]
    if paid_cents:
        if payment_account_code is None:
            raise PurchaseError("A payment account is required for a paid purchase")
        lines.append((payment_account_code, 0, paid_cents))
    balance_cents = total_cents - paid_cents
    if balance_cents:
        lines.append(("2000", 0, balance_cents))
    return lines


def self_check() -> None:
    """Randomized invariant check used by the smoke test."""
    rng = random.Random()
    for _ in range(500):
        line_data = [
            (rng.randint(1, 1000), rng.randint(0, 100_000))
            for _ in range(rng.randint(1, 8))
        ]
        total = purchase_total(line_data)
        assert total == sum(quantity * cost for quantity, cost in line_data)

        old_quantity = rng.randint(0, 1000)
        received_quantity = rng.randint(1, 1000)
        old_cost = rng.randint(0, 100_000)
        received_cost = rng.randint(0, 100_000) * received_quantity
        average = weighted_average_cost(old_quantity, old_cost, received_quantity, received_cost)
        exact_numerator = old_quantity * old_cost + received_cost
        exact_denominator = old_quantity + received_quantity
        assert abs(average * exact_denominator - exact_numerator) * 2 <= exact_denominator

        balances = [(uuid.uuid4(), rng.randint(1, 10_000)) for _ in range(rng.randint(1, 8))]
        owed = sum(balance for _, balance in balances)
        paid = rng.randint(1, owed)
        allocations = allocate_supplier_payment(balances, paid)
        assert sum(amount for _, amount in allocations) == paid
        assert all(amount > 0 for _, amount in allocations)
        assert all(amount <= dict(balances)[purchase_id] for purchase_id, amount in allocations)

        ledger_total = rng.randint(0, MAX_CENTS)
        ledger_paid = rng.randint(0, ledger_total)
        ledger = purchase_ledger_cents(ledger_total, ledger_paid, "1000" if ledger_paid else None)
        assert sum(debit for _, debit, _ in ledger) == sum(credit for _, _, credit in ledger)
