import sqlite3

conn = sqlite3.connect("data/app.db")
cur = conn.cursor()

test_queries = [
    ("BOL by Number (NOCASE)", "SELECT * FROM bol_records WHERE bol_number = 'BOL-2026-NSA513';"),
    ("BOL by Status & Created", "SELECT * FROM bol_records WHERE status = 'issued' ORDER BY created_at DESC LIMIT 50;"),
    ("BOL by Company & Date", "SELECT * FROM bol_records WHERE company_id = 'COM-1' AND issue_date >= '2026-01-01';"),
    ("Container Lookup", "SELECT * FROM containers WHERE container_number = 'CONT1234567';"),
    ("Truck Lookup", "SELECT * FROM trucks WHERE truck_number = 'KBL-1234';"),
    ("Ledger Account Covering Balance", "SELECT debit, credit FROM ledger_records WHERE currency = 'USD' AND account_id = 'ACC-138e08e812' ORDER BY transaction_date ASC, id ASC LIMIT 100;"),
    ("Invoice by Status & Created", "SELECT * FROM invoices WHERE status = 'paid' ORDER BY created_at DESC LIMIT 50;"),
    ("Shipment by Status & Created", "SELECT * FROM shipments WHERE status = 'delivered' ORDER BY created_at DESC LIMIT 50;"),
    ("Document by BOL and Type", "SELECT * FROM documents WHERE bol_id = 'bol-123' AND document_type = 'bol_scan';"),
]

print("=== EXPLAIN QUERY PLAN VERIFICATION ===")
for label, sql in test_queries:
    cur.execute(f"EXPLAIN QUERY PLAN {sql}")
    plans = cur.fetchall()
    plan_desc = " -> ".join([p[3] for p in plans])
    print(f"\nQuery: {label}")
    print(f"  Plan: {plan_desc}")
    assert "SCAN" not in plan_desc or "SEARCH" in plan_desc, f"Query plan using full table scan: {plan_desc}"

print("\nALL COMMON QUERIES SUCCESSFULLY USE INDEX SEARCH!")
conn.close()
