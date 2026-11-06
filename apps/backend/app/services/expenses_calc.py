"""Pure expense validation and ledger calculations."""
from dataclasses import dataclass

MAX_CENTS = 2_000_000_000


class ExpenseError(ValueError):
    """An expense business-rule problem with a safe message."""


@dataclass(frozen=True)
class ExpenseLedgerLine:
    account_code: str
    debit_cents: int
    credit_cents: int


def expense_amounts(amount_cents: int, amount_paid_cents: int, supplier_id_present: bool) -> int:
    if amount_cents <= 0 or amount_cents > MAX_CENTS:
        raise ExpenseError("The expense amount is not valid")
    if amount_paid_cents < 0 or amount_paid_cents > amount_cents:
        raise ExpenseError("The paid amount cannot exceed the expense amount")
    if amount_paid_cents < amount_cents and not supplier_id_present:
        raise ExpenseError("A supplier is required for an expense on credit")
    return amount_cents - amount_paid_cents


def expense_ledger_lines(
    expense_account_code: str,
    amount_cents: int,
    amount_paid_cents: int,
    payment_account_code: str | None,
) -> list[ExpenseLedgerLine]:
    balance_cents = expense_amounts(amount_cents, amount_paid_cents, True)
    if (amount_paid_cents > 0) != (payment_account_code is not None):
        raise ExpenseError("The expense payment account does not match its paid amount")
    if payment_account_code not in {None, "1000", "1010"}:
        raise ExpenseError("The expense payment account is not valid")

    lines = [ExpenseLedgerLine(expense_account_code, amount_cents, 0)]
    if amount_paid_cents:
        if payment_account_code is None:
            raise ExpenseError("A payment account is required for a paid expense")
        lines.append(ExpenseLedgerLine(payment_account_code, 0, amount_paid_cents))
    if balance_cents:
        lines.append(ExpenseLedgerLine("2000", 0, balance_cents))
    return lines


def self_check() -> None:
    import random

    rng = random.Random()
    for _ in range(500):
        total = rng.randint(1, MAX_CENTS)
        paid = rng.randint(0, total)
        remainder = expense_amounts(total, paid, True)
        lines = expense_ledger_lines(
            "6900",
            total,
            paid,
            "1010" if paid else None,
        )
        assert remainder == total - paid
        assert sum(line.debit_cents for line in lines) == sum(line.credit_cents for line in lines)

    for args in ((1, 0, False), (100, 101, True), (0, 0, True)):
        try:
            expense_amounts(*args)
        except ExpenseError:
            pass
        else:
            raise AssertionError("Invalid expense amounts were accepted")
