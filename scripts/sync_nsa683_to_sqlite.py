import sqlite3
import json
import sys
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect('data/app.db')
cur = conn.cursor()

bol_id = "BOL-2026-NSA683"
bol_num = "BOL-2026-NSA683"
issue_date = "2026-10-08 00:00:00"
now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

# 1. Update bol_records table
cur.execute("""
INSERT OR REPLACE INTO bol_records (
    id, bol_number, issue_date, origin, destination, border_station,
    driver_name, father_name, driver_rent, carton_count, gross_weight_kg,
    net_weight_kg, cargo_description, status, freight_fee, demurrage_fee,
    documentation_fee, currency, exchange_rate, shipper_name, consignee_name,
    notify_party_name, revision, created_at, updated_at
) VALUES (
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?
)
""", (
    bol_id, bol_num, issue_date, "Kandahar, AF", "Nhava Sheva, IN", "Dougharoun / Islam Qala",
    "نوم صحراب ولد محمدنادر", "محمدنادر", 46000.0, 1458, 25660.8,
    23328.0, "📦 CONTAINER & CARGO PARTICULARS:\n• Description: BLACK RAISINS 1458 CTNS 16.00-KGS\n• Transit Date: 2026-10-08\n• INV-105",
    "active", 81648.00, 0.0,
    150.0, "USD", 1.0, "RAHMAT NAZAR LTD", "RICH VALLEY DRY FRUITS PVT LTD",
    "ABDUL MAJID KAKAR GENERAL TRADING LLC", 1, issue_date, now_str
))
print("✓ Inserted into bol_records in data/app.db")

# 2. Update bols table
cur.execute("""
INSERT OR REPLACE INTO bols (
    id, bol_number, legacy_id, issue_date, shipper_name, consignee_name,
    notify_party, truck_number, driver_name, driver_rent_amount,
    driver_rent_currency, driver_rent_usd, packages_count, net_weight_kg,
    gross_weight_kg, goods_value_usd, status, quarantined, quarantine_reason,
    updated_at, created_at
) VALUES (
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?
)
""", (
    bol_id, bol_num, bol_id, "2026-10-08", "RAHMAT NAZAR LTD", "RICH VALLEY DRY FRUITS PVT LTD",
    "ABDUL MAJID KAKAR GENERAL TRADING LLC", "35599 هرات", "نوم صحراب ولد محمدنادر", 46000.0,
    "AFN", 657.14, 1458, 23328.0,
    25660.8, 81648.00, "active", 0, "",
    now_str, issue_date
))
print("✓ Inserted into bols in data/app.db")

# 3. Update shipments table
cur.execute("""
INSERT OR REPLACE INTO shipments (
    tracking_number, reference_number, bol_id, bol_number, origin,
    destination, status, carrier, departure_date, arrival_date,
    route_id, id, revision, created_at, updated_at
) VALUES (
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?
)
""", (
    "SA-SHP-BOL-2026-NSA683", "BOL-2026-NSA683", bol_id, bol_num, "Kandahar, AF",
    "Nhava Sheva, IN", "cargo_loaded", "Sky Ariana", "2026-10-08", "",
    "route-kdr-dog-bnd-jea-nsa", "SA-SHP-BOL-2026-NSA683", 1, now_str, now_str
))
print("✓ Inserted into shipments in data/app.db")

conn.commit()
conn.close()
print("=== SQLite synchronization complete ===")
