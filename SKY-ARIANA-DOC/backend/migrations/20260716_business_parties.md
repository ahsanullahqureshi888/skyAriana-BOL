# Business party registry

This migration adds the reusable `business_parties` and `business_party_relationships` tables, plus `shipper_party_id` and `notify_party_id` columns on `invoices`.

The application startup migration is SQLite-safe and creates the tables/columns for existing installations. The reviewed source data lives in `backend/data/business_parties_seed.json` and can be imported repeatedly with:

```powershell
C:\Python314\python.exe scripts/import_business_parties.py
```

Existing customers and invoice JSON snapshots are preserved. New invoices store the selected master-record IDs alongside the snapshot fields.
