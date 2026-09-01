import unittest

from app.schemas.schemas import InvoiceUpdate
from app.services.invoice_party import normalize_party_snapshot


class InvoicePartyNormalizationTests(unittest.TestCase):
    def test_empty_snapshot_returns_none(self):
        self.assertIsNone(normalize_party_snapshot({
            "companyName": "   ",
            "email": "",
            "contactId": 3,
        }))

    def test_valid_snapshot_keeps_only_current_details(self):
        party = normalize_party_snapshot({
            "companyName": "Current Notify Party",
            "address": "Warehouse District",
            "instructions": "Use the booking reference.",
        })

        self.assertEqual(party["companyName"], "Current Notify Party")
        self.assertEqual(party["address"], "Warehouse District")
        self.assertEqual(party["addressLine1"], "Warehouse District")
        self.assertEqual(party["notes"], "Use the booking reference.")

    def test_shipper_cleanup_removes_a_stale_notify_party_fragment(self):
        party = normalize_party_snapshot({
            "companyName": "Current Shipper",
            "address": "Current Shipper Address. NOTIFY PARTY: Old contact data",
            "addressLine2": "NOTIFY PARTY: Old contact data",
        }, strip_stale_notify_fragment=True)

        self.assertEqual(party["address"], "Current Shipper Address")
        self.assertEqual(party["addressLine1"], "Current Shipper Address")
        self.assertEqual(party["addressLine2"], "")

    def test_update_clears_stale_notify_link_when_snapshot_is_empty(self):
        update = InvoiceUpdate.model_validate({
            "notifyParty": {"companyName": "", "email": " "},
            "notifyPartyEnabled": True,
            "notifyPartyCustomerId": 3,
        })

        self.assertIsNone(update.notify_party)
        self.assertFalse(update.notify_party_enabled)
        self.assertIsNone(update.notify_party_customer_id)
        self.assertFalse(update.notify_party_same_as_consignee)


if __name__ == "__main__":
    unittest.main()
