import unittest
from decimal import Decimal

from app.money import (
    apply_bps,
    cents_to_decimal,
    currency_exponent,
    currency_scale,
    decimal_to_cents,
    round_to_currency_precision,
    validate_currency_precision,
)
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

    def test_currency_precision_matches_configured_zero_and_two_digit_units(self):
        self.assertEqual(currency_exponent("RWF"), 0)
        self.assertEqual(currency_exponent("USD"), 2)
        self.assertEqual(currency_scale(0), 100)
        validate_currency_precision(1200, 0)
        with self.assertRaises(ValueError):
            validate_currency_precision(1201, 0)
        validate_currency_precision(1201, 2)

    def test_currency_rounding_is_half_up_to_configured_unit(self):
        self.assertEqual(round_to_currency_precision(149, 0), 100)
        self.assertEqual(round_to_currency_precision(150, 0), 200)

    def test_zero_decimal_currency_tax_is_rounded_before_total(self):
        totals = compute_totals([100_000], 0, 800, currency_exponent=0)
        self.assertEqual(totals.tax_cents, 8_000)
        self.assertEqual(totals.total_cents, 108_000)

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
