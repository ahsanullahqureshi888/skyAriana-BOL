# 20260714 add invoice party snapshots

Applied automatically by `app.main.startup_db_seed`.

Adds:

- `invoices.consignee_buyer` JSON snapshot
- `invoices.notify_party_enabled`
- `customers.contact_type`
- `customers.additional_details` JSON

Existing `shipper_exporter` and `notify_party` JSON snapshots remain unchanged. Existing invoices safely fall back to their linked customer when no consignee snapshot is available.
