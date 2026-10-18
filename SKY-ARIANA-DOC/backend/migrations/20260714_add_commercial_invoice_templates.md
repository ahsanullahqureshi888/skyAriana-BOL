# 20260714 add commercial invoice templates

Applied automatically by `app.main.startup_db_seed` for existing SQLite installations.

Adds `invoices.invoice_template` with default `premium_afghan_glass` and the following `company_settings` fields:

- `default_invoice_template`
- `invoice_watermark_enabled`
- `invoice_watermark_opacity`
- `invoice_qr_enabled`
- `invoice_seal_enabled`
- `invoice_signature_enabled`
- `invoice_stamp_enabled`
- `invoice_color_printing_enabled`
- `invoice_compact_layout_enabled`

The migration is additive and preserves all existing invoice, payment, customer, shipment, and backup data.
