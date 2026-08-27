import json
import sqlite3
import os
import uuid
from datetime import datetime

root_dir = "d:/skybalam-26-bol-V3.2/skybalam-26-bol-V3.2"
db_path = os.path.join(root_dir, "backend/data/app.db")
bols_json_path = os.path.join(root_dir, ".local-bols.json")
ledgers_json_path = os.path.join(root_dir, ".local-bol-account-ledgers.json")

if not os.path.exists(bols_json_path):
    print("No .local-bols.json found")
    exit(1)

with open(bols_json_path, "r", encoding="utf-8") as f:
    bols = json.load(f)

with open(ledgers_json_path, "r", encoding="utf-8") as f:
    ledgers_data = json.load(f)

os.makedirs(os.path.dirname(db_path), exist_ok=True)
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Ensure table exists
cursor.execute("""
CREATE TABLE IF NOT EXISTS bill_of_lading (
    id VARCHAR(64) PRIMARY KEY,
    payload JSON NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    bol_number VARCHAR(120) NOT NULL,
    shipper_name VARCHAR(255) NOT NULL,
    consignee_name VARCHAR(255) NOT NULL,
    status VARCHAR(80) NOT NULL
)
""")

# Ensure export_accounts table exists
cursor.execute("""
CREATE TABLE IF NOT EXISTS export_accounts (
    id VARCHAR(64) PRIMARY KEY,
    payload JSON NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(80) NOT NULL
)
""")

# Insert or replace BOLs
inserted_bols = 0
now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

for bol in bols:
    bol_id = bol.get("id") or bol.get("bol_number") or str(uuid.uuid4())
    bol_num = bol.get("bol_number") or bol_id
    shipper = bol.get("shipper_name") or ""
    consignee = bol.get("consignee_name") or ""
    status = bol.get("status") or "saved"
    payload_str = json.dumps(bol)

    cursor.execute("""
    INSERT OR REPLACE INTO bill_of_lading (id, payload, created_at, updated_at, bol_number, shipper_name, consignee_name, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (bol_id, payload_str, now_str, now_str, bol_num, shipper, consignee, status))
    inserted_bols += 1

# Insert companies into export_accounts
inserted_companies = 0
companies = ledgers_data.get("customCompanies", [])
for comp in companies:
    comp_name = comp.strip()
    if not comp_name:
        continue
    comp_id = f"acc-{uuid.uuid4().hex[:12]}"
    cursor.execute("""
    INSERT OR REPLACE INTO export_accounts (id, payload, created_at, updated_at, name, account_type)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (comp_id, json.dumps({"name": comp_name}), now_str, now_str, comp_name, "export"))
    inserted_companies += 1

conn.commit()
conn.close()

print(f"Successfully seeded SQLite backend app.db with {inserted_bols} BOLs and {inserted_companies} companies!")
