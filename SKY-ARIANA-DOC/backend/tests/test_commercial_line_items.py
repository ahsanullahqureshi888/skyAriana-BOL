import unittest
from decimal import Decimal

from app.services.commercial_line_items import calculate_item_amount, calculate_item_totals


class CommercialLineItemCalculationTests(unittest.TestCase):
    def test_per_kg_uses_net_weight(self):
        amount = calculate_item_amount({"net_weight": "12000", "weight_unit": "KG", "unit_price": "8", "price_basis": "Per KG"})
        self.assertEqual(amount, Decimal("96000.00"))

    def test_per_mt_converts_kilograms_to_metric_tons(self):
        amount = calculate_item_amount({"net_weight": "1250", "weight_unit": "KG", "unit_price": "1200", "price_basis": "Per MT"})
        self.assertEqual(amount, Decimal("1500.00"))

    def test_per_lb_converts_weight_before_rounding(self):
        amount = calculate_item_amount({"net_weight": "1", "weight_unit": "KG", "unit_price": "1", "price_basis": "Per LB"})
        self.assertEqual(amount, Decimal("2.20"))

    def test_per_piece_uses_quantity(self):
        amount = calculate_item_amount({"quantity": "12", "unit_price": "8", "price_basis": "Per Piece"})
        self.assertEqual(amount, Decimal("96.00"))

    def test_per_carton_uses_package_count(self):
        amount = calculate_item_amount({"package_count": "4", "unit_price": "15.50", "price_basis": "Per Carton"})
        self.assertEqual(amount, Decimal("62.00"))

    def test_legacy_quantity_as_weight_remains_compatible(self):
        amount = calculate_item_amount({"quantity": 12000, "unit": "KG", "unit_price": 8})
        self.assertEqual(amount, Decimal("96000.00"))

    def test_totals_sum_line_amounts_and_physical_weights(self):
        totals = calculate_item_totals([
            {"net_weight": "10", "gross_weight": "12", "package_count": "2", "unit_price": "5", "price_basis": "Per KG"},
            {"quantity": "3", "package_count": "1", "unit_price": "4", "price_basis": "Per Piece"},
        ])
        self.assertEqual(totals["subtotal"], Decimal("62.00"))
        self.assertEqual(totals["net_weight"], Decimal("13"))
        self.assertEqual(totals["gross_weight"], Decimal("15"))
        self.assertEqual(totals["packages"], Decimal("3"))


if __name__ == "__main__":
    unittest.main()
