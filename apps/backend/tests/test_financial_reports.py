import unittest
from decimal import Decimal

from app.services.accounting.financial_reports import (
    IncomeStatementAccount,
    build_balance_sheet,
    build_income_statement,
)


class FinancialReportTests(unittest.TestCase):
    def test_income_statement_includes_cogs_and_contra_revenue(self):
        statement = build_income_statement([
            IncomeStatementAccount("4000", "Sales", "revenue", Decimal("0"), Decimal("1000")),
            IncomeStatementAccount("4900", "Returns", "revenue", Decimal("100"), Decimal("0")),
            IncomeStatementAccount("5000", "COGS", "cost_of_goods_sold", Decimal("300"), Decimal("0")),
            IncomeStatementAccount("6000", "Rent", "expense", Decimal("200"), Decimal("0")),
            IncomeStatementAccount("7000", "Other income", "other_income", Decimal("0"), Decimal("25")),
            IncomeStatementAccount("7900", "Other expense", "other_expense", Decimal("0"), Decimal("10")),
        ])
        self.assertEqual(statement.revenue, Decimal("900"))
        self.assertEqual(statement.gross_profit, Decimal("600"))
        self.assertEqual(statement.operating_income, Decimal("400"))
        # A credit balance in an expense account is a reduction in expenses.
        self.assertEqual(statement.net_income, Decimal("435"))

    def test_income_statement_does_not_turn_empty_period_into_activity(self):
        statement = build_income_statement([])
        self.assertEqual(statement.lines, ())
        self.assertEqual(statement.net_income, Decimal("0"))

    def test_balance_sheet_includes_current_earnings_and_checks_equation(self):
        balance = build_balance_sheet([
            IncomeStatementAccount("1000", "Cash", "asset", Decimal("700"), Decimal("0")),
            IncomeStatementAccount("2000", "Payables", "liability", Decimal("0"), Decimal("200")),
            IncomeStatementAccount("3000", "Capital", "equity", Decimal("0"), Decimal("200")),
        ], current_earnings=Decimal("300"))

        self.assertEqual(balance.total_assets, Decimal("700"))
        self.assertEqual(balance.total_liabilities, Decimal("200"))
        self.assertEqual(balance.total_equity, Decimal("500"))
        self.assertEqual(balance.liabilities_and_equity, Decimal("700"))
        self.assertEqual(balance.difference, Decimal("0"))
        self.assertTrue(balance.is_balanced)

    def test_balance_sheet_reports_drawings_as_reduction_in_equity(self):
        balance = build_balance_sheet([
            IncomeStatementAccount("3000", "Capital", "equity", Decimal("0"), Decimal("500")),
            IncomeStatementAccount("3100", "Drawings", "equity", Decimal("125"), Decimal("0")),
        ], current_earnings=Decimal("0"))

        self.assertEqual(balance.total_equity, Decimal("375"))

    def test_balance_sheet_exposes_an_unbalanced_period(self):
        balance = build_balance_sheet([
            IncomeStatementAccount("1000", "Cash", "asset", Decimal("100"), Decimal("0")),
        ], current_earnings=Decimal("0"))
        self.assertFalse(balance.is_balanced)
        self.assertEqual(balance.difference, Decimal("100"))


if __name__ == "__main__":
    unittest.main()
