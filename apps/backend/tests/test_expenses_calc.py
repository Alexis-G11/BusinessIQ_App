import pytest

from app.services.expenses_calc import ExpenseError, expense_amounts, expense_ledger_lines


def test_fully_paid_expense_debits_expense_and_credits_payment_account():
    lines = expense_ledger_lines("6000", 12500, 12500, "1000")

    assert [(line.account_code, line.debit_cents, line.credit_cents) for line in lines] == [
        ("6000", 12500, 0),
        ("1000", 0, 12500),
    ]


def test_partial_supplier_expense_balances_paid_and_payable_amounts():
    lines = expense_ledger_lines("6900", 10000, 4000, "1010")

    assert [(line.account_code, line.debit_cents, line.credit_cents) for line in lines] == [
        ("6900", 10000, 0),
        ("1010", 0, 4000),
        ("2000", 0, 6000),
    ]
    assert sum(line.debit_cents for line in lines) == sum(line.credit_cents for line in lines)


def test_unpaid_supplier_expense_posts_full_balance_to_payables():
    lines = expense_ledger_lines("6100", 8000, 0, None)

    assert [(line.account_code, line.debit_cents, line.credit_cents) for line in lines] == [
        ("6100", 8000, 0),
        ("2000", 0, 8000),
    ]


def test_credit_expense_requires_a_supplier():
    with pytest.raises(ExpenseError, match="supplier is required"):
        expense_amounts(8000, 0, supplier_id_present=False)


@pytest.mark.parametrize("amount_cents, paid_cents", [(0, 0), (100, 101), (100, -1)])
def test_invalid_expense_amounts_are_rejected(amount_cents, paid_cents):
    with pytest.raises(ExpenseError):
        expense_amounts(amount_cents, paid_cents, supplier_id_present=True)


def test_payment_account_must_match_paid_amount():
    with pytest.raises(ExpenseError, match="does not match"):
        expense_ledger_lines("6900", 10000, 0, "1010")
    with pytest.raises(ExpenseError, match="does not match"):
        expense_ledger_lines("6900", 10000, 5000, None)
