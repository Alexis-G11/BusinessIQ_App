import unittest
from decimal import Decimal

from app.money import apply_bps, cents_to_decimal, decimal_to_cents
from app.services.sales_calc import SaleError, compute_totals, payment_status


class MoneyTests(unittest.TestCase):
    def test_minor_unit_conversion_is_exact_for_current_two_digit_model(self):
        self.assertEqual(cents_to_decimal(12345), Decimal("123.45"))
        self.assertEqual(decimal_to_cents(Decimal("123.45")), 12345)

    def test_conversion_rejects_fractional_minor_units(self):
        with self.assertRaises(ValueError):
            decimal_to_cents(Decimal("1.001"))

    def test_basis_point_tax_rounds_half_up_in_integer_arithmetic(self):
        self.assertEqual(apply_bps(125, 400), 5)
        self.assertEqual(apply_bps(1, 5000), 1)

    def test_sale_totals_apply_discount_before_tax(self):
        totals = compute_totals([1000, 500], 100, 1000)
        self.assertEqual(totals.subtotal_cents, 1500)
        self.assertEqual(totals.discount_cents, 100)
        self.assertEqual(totals.tax_cents, 140)
        self.assertEqual(totals.total_cents, 1540)

    def test_sale_rejects_discount_above_subtotal(self):
        with self.assertRaises(SaleError):
            compute_totals([100], 101, 0)

    def test_sale_payment_status_rejects_overpayment(self):
        self.assertEqual(payment_status(100, 0), "unpaid")
        self.assertEqual(payment_status(100, 40), "partial")
        self.assertEqual(payment_status(100, 100), "paid")
        with self.assertRaises(SaleError):
            payment_status(100, 101)


if __name__ == "__main__":
    unittest.main()
