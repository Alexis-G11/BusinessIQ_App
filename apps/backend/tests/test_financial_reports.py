import unittest
from decimal import Decimal

from app.services.accounting.financial_reports import IncomeStatementAccount, build_income_statement


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


if __name__ == "__main__":
    unittest.main()
