"""Baseline Performance Benchmark for Sky Ariana BOL, Saved BOLs, and Ledgers.
Measures database query time, processing time, response size, and memory usage.
"""
from __future__ import annotations
import asyncio
import json
import os
import sqlite3
import sys
import time
from decimal import Decimal
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DB_PATH = ROOT_DIR / "data" / "app.db"
LEDGER_JSON = ROOT_DIR / ".local-account-ledgers.json"
BOLS_JSON = ROOT_DIR / ".local-bols.json"

def benchmark_sqlite_baseline():
    print("=" * 60)
    print("SQLITE BASELINE MEASUREMENTS (data/app.db)")
    print("=" * 60)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # 1. BOL count and scan
    t0 = time.perf_counter()
    bol_count = c.execute("SELECT COUNT(*) FROM bol_records;").fetchone()[0]
    t_bol_count = (time.perf_counter() - t0) * 1000

    # 2. All BOLs query (like current unpaginated load)
    t0 = time.perf_counter()
    rows = c.execute("SELECT * FROM bol_records ORDER BY created_at DESC;").fetchall()
    data = [dict(r) for r in rows]
    json_bytes = len(json.dumps(data, default=str).encode("utf-8"))
    t_all_bols = (time.perf_counter() - t0) * 1000

    # 3. BOL search without compound indexes
    t0 = time.perf_counter()
    s_rows = c.execute("""
        SELECT * FROM bol_records 
        WHERE bol_number LIKE '%518b48f3%' 
           OR driver_name LIKE '%Ahmad%' 
           OR shipper_name LIKE '%Shipper%'
           OR consignee_name LIKE '%Consignee%';
    """).fetchall()
    t_bol_search = (time.perf_counter() - t0) * 1000

    # 4. Container lookup
    t0 = time.perf_counter()
    cntr_rows = c.execute("SELECT * FROM containers WHERE container_number = 'CONT-TEST-001';").fetchall()
    t_cntr_lookup = (time.perf_counter() - t0) * 1000

    # 5. Ledger count and scan
    t0 = time.perf_counter()
    ledger_count = c.execute("SELECT COUNT(*) FROM ledger_records;").fetchone()[0]
    t_ledger_count = (time.perf_counter() - t0) * 1000

    # 6. All ledger entries (current unpaginated 1.2MB JSON load equivalent)
    t0 = time.perf_counter()
    l_rows = c.execute("SELECT * FROM ledger_records ORDER BY transaction_date ASC, id ASC;").fetchall()
    l_data = [dict(r) for r in l_rows]
    l_json_bytes = len(json.dumps(l_data, default=str).encode("utf-8"))
    t_all_ledger = (time.perf_counter() - t0) * 1000

    # 7. Customer ledger entries without compound index
    sample_acc = "ACC-CUST-2706142a"
    t0 = time.perf_counter()
    cust_rows = c.execute("SELECT * FROM ledger_records WHERE account_id = ? ORDER BY transaction_date ASC;", (sample_acc,)).fetchall()
    t_cust_ledger = (time.perf_counter() - t0) * 1000

    # 8. Date range filter without index
    t0 = time.perf_counter()
    date_rows = c.execute("SELECT * FROM ledger_records WHERE transaction_date BETWEEN '2026-01-01' AND '2026-09-30';").fetchall()
    t_date_filter = (time.perf_counter() - t0) * 1000

    # 9. Opening balance calculation (summing debit and credit)
    t0 = time.perf_counter()
    bal_row = c.execute("""
        SELECT 
            COALESCE(SUM(debit), 0) AS total_debit,
            COALESCE(SUM(credit), 0) AS total_credit,
            COALESCE(SUM(debit) - SUM(credit), 0) AS balance
        FROM ledger_records
        WHERE account_id = ? AND transaction_date < '2026-09-01';
    """, (sample_acc,)).fetchone()
    t_opening_bal = (time.perf_counter() - t0) * 1000

    # 10. File-based legacy load comparison
    t0 = time.perf_counter()
    with open(LEDGER_JSON, "r", encoding="utf-8") as f:
        file_data = json.load(f)
    t_file_load = (time.perf_counter() - t0) * 1000
    file_size_kb = os.path.getsize(LEDGER_JSON) / 1024

    print(f"BOL records in DB: {bol_count}")
    print(f"  Count query time: {t_bol_count:.2f} ms")
    print(f"  Fetch all BOLs query + serialize ({len(data)} items, {json_bytes/1024:.1f} KB): {t_all_bols:.2f} ms")
    print(f"  BOL multi-field search: {t_bol_search:.2f} ms")
    print(f"  Container lookup: {t_cntr_lookup:.2f} ms")
    print()
    print(f"Ledger records in DB: {ledger_count}")
    print(f"  Count query time: {t_ledger_count:.2f} ms")
    print(f"  Fetch all ledger records + serialize ({len(l_data)} items, {l_json_bytes/1024:.1f} KB): {t_all_ledger:.2f} ms")
    print(f"  Customer ledger query: {t_cust_ledger:.2f} ms")
    print(f"  Date range filter query: {t_date_filter:.2f} ms")
    print(f"  SQL Opening balance query: {t_opening_bal:.2f} ms (Result: debit={bal_row['total_debit']}, credit={bal_row['total_credit']}, bal={bal_row['balance']})")
    print(f"  Legacy file load (.local-account-ledgers.json {file_size_kb:.1f} KB): {t_file_load:.2f} ms")
    print("=" * 60)

    conn.close()

if __name__ == "__main__":
    benchmark_sqlite_baseline()
