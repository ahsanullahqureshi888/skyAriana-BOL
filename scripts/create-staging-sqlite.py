"""
AQ COMPANIES — Staging SQLite Database Initializer & Relational Verification
Python 3 with built-in sqlite3
"""

import json
import os
import sqlite3

staging_dir = os.path.abspath('data/staging')
staging_db_path = os.path.join(staging_dir, 'bol_staging.db')

if os.path.exists(staging_db_path):
    os.remove(staging_db_path)

print(f"🗄️ Initializing Isolated Staging SQLite DB: {staging_db_path}")
conn = sqlite3.connect(staging_db_path)
cur = conn.cursor()

# 1. Create canonical schema
cur.executescript("""
  CREATE TABLE IF NOT EXISTS bols (
    id TEXT PRIMARY KEY,
    bol_number TEXT UNIQUE NOT NULL,
    legacy_id TEXT,
    issue_date TEXT,
    shipper_name TEXT,
    consignee_name TEXT,
    notify_party TEXT,
    truck_number TEXT,
    driver_name TEXT,
    driver_rent_amount REAL DEFAULT 0,
    driver_rent_currency TEXT DEFAULT 'AFN',
    driver_rent_usd REAL DEFAULT 0,
    packages_count INTEGER DEFAULT 0,
    net_weight_kg REAL,
    gross_weight_kg REAL,
    goods_value_usd REAL,
    status TEXT DEFAULT 'ACTIVE',
    quarantined INTEGER DEFAULT 0,
    quarantine_reason TEXT,
    updated_at TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    canonical_name TEXT UNIQUE NOT NULL,
    legacy_alias_keys TEXT
  );

  CREATE TABLE IF NOT EXISTS ledger_entries (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    bol_number TEXT,
    invoice_number TEXT,
    truck_number TEXT,
    date TEXT,
    description TEXT,
    debit REAL DEFAULT 0,
    credit REAL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  CREATE INDEX IF NOT EXISTS idx_bols_number ON bols(bol_number);
  CREATE INDEX IF NOT EXISTS idx_ledger_bol ON ledger_entries(bol_number);
  CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger_entries(account_id);
""")

# 2. Load staging data
with open(os.path.join(staging_dir, '.staging-bol-database.json'), 'r', encoding='utf-8') as f:
    staging_bols = json.load(f)

with open(os.path.join(staging_dir, '.staging-account-ledgers.json'), 'r', encoding='utf-8') as f:
    staging_ledgers = json.load(f)

for b in staging_bols:
    cur.execute("""
      INSERT INTO bols (
        id, bol_number, legacy_id, issue_date, shipper_name, consignee_name, notify_party,
        truck_number, driver_name, driver_rent_amount, driver_rent_currency, driver_rent_usd,
        packages_count, net_weight_kg, gross_weight_kg, goods_value_usd, status, quarantined, quarantine_reason,
        updated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
      b['id'],
      b['bolNumber'],
      b.get('legacyId'),
      b.get('issueDate'),
      b.get('shipperName'),
      b.get('consigneeName'),
      b.get('notifyParty'),
      b.get('truckNumber'),
      b.get('driverName'),
      b['driverRent']['amount'],
      b['driverRent']['currency'],
      b['driverRent']['usdEquivalent'],
      b['cargo']['packagesCount'],
      b['cargo']['netWeightKg'],
      b['cargo']['grossWeightKg'],
      b['cargo']['goodsValueUsd'],
      b['status'],
      1 if b.get('quarantined') else 0,
      b.get('quarantineReason'),
      b['updatedAt'],
      b['createdAt']
    ))

account_id_map = {}
for idx, a in enumerate(staging_ledgers['accounts']):
    acc_id = f"acc-{idx+1:03d}"
    account_id_map[a['canonicalName']] = acc_id
    cur.execute("""
      INSERT INTO accounts (id, canonical_name, legacy_alias_keys)
      VALUES (?, ?, ?)
    """, (acc_id, a['canonicalName'], json.dumps(a['aliasKeys'])))

for e in staging_ledgers['entries']:
    acc_id = account_id_map.get(e['canonicalAccount'], 'acc-unmapped')
    cur.execute("""
      INSERT INTO ledger_entries (
        id, account_id, bol_number, invoice_number, truck_number, date, description, debit, credit, currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
      e['id'],
      acc_id,
      e.get('bolNumber'),
      e.get('invoiceNumber'),
      e.get('truckNumber'),
      e.get('date'),
      e.get('description'),
      e.get('debit', 0),
      e.get('credit', 0),
      e.get('currency', 'USD')
    ))

conn.commit()

print("✅ Staging SQLite database populated successfully.")
cur.execute("SELECT COUNT(*) FROM bols")
bol_count = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM accounts")
acc_count = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM ledger_entries")
ledger_count = cur.fetchone()[0]

cur.execute("SELECT SUM(debit), SUM(credit) FROM ledger_entries")
deb, cred = cur.fetchone()

print(f"   BOLs:          {bol_count}")
print(f"   Accounts:      {acc_count}")
print(f"   Ledgers:       {ledger_count}")
print(f"   Total Debit:   ${deb:,.2f}")
print(f"   Total Credit:  ${cred:,.2f}")
print(f"   Net Balance:   ${(deb - cred):,.2f}")

conn.close()
