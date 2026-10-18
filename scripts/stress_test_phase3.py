"""Stress test script for Performance Phase 3:
Tests 50,000 BOLs and 500,000 ledger rows in a temporary isolated database.
Measures real query and serialization timings.
"""
from __future__ import annotations

import os
import sqlite3
import time
from decimal import Decimal
from pathlib import Path

TEMP_DB = Path(__file__).resolve().parent.parent / "data" / "temp_stress_test.db"


def run_stress_test():
    if TEMP_DB.exists():
        TEMP_DB.unlink()

    conn = sqlite3.connect(TEMP_DB)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Enable WAL mode and pragmas
    c.execute("PRAGMA journal_mode = WAL;")
    c.execute("PRAGMA synchronous = NORMAL;")
    c.execute("PRAGMA temp_store = MEMORY;")

    print("=" * 65)
    print("STRESS TEST PHASE 3: 50,000 BOLS & 500,000 LEDGER ROWS")
    print("=" * 65)

    # 1. Create Tables & Compound Indexes
    c.execute("""
        CREATE TABLE bol_records (
            id TEXT PRIMARY KEY,
            bol_number TEXT UNIQUE,
            issue_date TEXT,
            origin TEXT,
            destination TEXT,
            border_station TEXT,
            driver_name TEXT,
            father_name TEXT,
            driver_rent NUMERIC,
            carton_count INTEGER,
            gross_weight_kg NUMERIC,
            net_weight_kg NUMERIC,
            cargo_description TEXT,
            status TEXT,
            freight_fee NUMERIC,
            demurrage_fee NUMERIC,
            documentation_fee NUMERIC,
            currency TEXT,
            exchange_rate NUMERIC,
            company_id TEXT,
            shipper_id TEXT,
            consignee_id TEXT,
            notify_party_id TEXT,
            shipper_name TEXT,
            consignee_name TEXT,
            notify_party_name TEXT,
            revision INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT
        );
    """)
    c.execute("CREATE INDEX ix_bol_records_bol_num ON bol_records (bol_number);")
    c.execute("CREATE INDEX ix_bol_records_status_date ON bol_records (status, issue_date);")
    c.execute("CREATE INDEX ix_bol_records_shipper ON bol_records (shipper_name);")
    c.execute("CREATE INDEX ix_bol_records_consignee ON bol_records (consignee_name);")

    c.execute("""
        CREATE TABLE containers (
            id TEXT PRIMARY KEY,
            container_number TEXT UNIQUE,
            container_type TEXT,
            bol_id TEXT,
            status TEXT
        );
    """)
    c.execute("CREATE INDEX ix_containers_num ON containers (container_number);")

    c.execute("""
        CREATE TABLE ledger_records (
            id TEXT PRIMARY KEY,
            account_id TEXT,
            account_name TEXT,
            transaction_date TEXT,
            description TEXT,
            debit NUMERIC,
            credit NUMERIC,
            balance NUMERIC,
            currency TEXT,
            fee_type TEXT,
            exchange_rate NUMERIC,
            reference_id TEXT,
            revision INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT
        );
    """)
    c.execute("CREATE INDEX ix_ledger_records_acc_date_id ON ledger_records (account_id, transaction_date, id);")
    c.execute("CREATE INDEX ix_ledger_records_acc_date_covering ON ledger_records (account_id, transaction_date, debit, credit);")
    c.execute("CREATE INDEX ix_ledger_records_date_id ON ledger_records (transaction_date, id);")

    conn.commit()

    # 2. Populate 50,000 BOL records in batches
    print("Generating 50,000 BOL records...")
    t0 = time.perf_counter()
    bol_batch = []
    container_batch = []
    shippers = ["Kabul Logistics Co", "Afghan Fruits Ltd", "Pamir Transport", "Aryana Dry Fruits", "Kandahar Fresh"]
    consignees = ["Dubai Global Trading", "Delhi Spices Corp", "Karachi Traders", "Sharjah Cargo Hub", "Baku Import"]
    border_stations = ["Islam Qala", "Torghundi", "Hairatan", "Spin Boldak"]

    for i in range(1, 50001):
        b_id = f"bol-uuid-{i:06d}"
        bol_num = f"BOL-AF-{i:06d}"
        shipper = shippers[i % len(shippers)]
        consignee = consignees[i % len(consignees)]
        station = border_stations[i % len(border_stations)]
        dt = f"2026-{(i % 9) + 1:02d}-{(i % 28) + 1:02d}"

        bol_batch.append((
            b_id, bol_num, dt, "Bandar Abbas", "Kabul", station,
            f"Driver {i}", "Father", 1200 + (i % 500), 500 + (i % 200),
            20000.5, 19500.0, "Agricultural dry fruit cartons",
            "active" if i % 10 != 0 else "delivered",
            1500.0, 100.0, 50.0, "USD", 1.0,
            None, None, None, None,
            shipper, consignee, "Notify Co",
            1, f"{dt} 10:00:00", f"{dt} 10:00:00"
        ))

        # Add 1 container per BOL
        container_batch.append((
            f"cntr-uuid-{i:06d}", f"MSKU{i:07d}", "40HC", b_id, "in_transit"
        ))

        if len(bol_batch) >= 10000:
            c.executemany("""
                INSERT INTO bol_records VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);
            """, bol_batch)
            c.executemany("INSERT INTO containers VALUES (?,?,?,?,?);", container_batch)
            conn.commit()
            bol_batch = []
            container_batch = []

    if bol_batch:
        c.executemany("INSERT INTO bol_records VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);", bol_batch)
        c.executemany("INSERT INTO containers VALUES (?,?,?,?,?);", container_batch)
        conn.commit()

    t_gen_bol = (time.perf_counter() - t0)
    print(f"Generated 50,000 BOLs in {t_gen_bol:.2f} s")

    # 3. Test BOL Benchmarks
    print("\n--- BENCHMARK: 50,000 BOLS ---")
    
    # First page load (50 items)
    t0 = time.perf_counter()
    rows = c.execute("""
        SELECT id, bol_number, issue_date, status, shipper_name, consignee_name, driver_name, carton_count
        FROM bol_records
        ORDER BY created_at DESC, id DESC
        LIMIT 50;
    """).fetchall()
    t_bol_first_page = (time.perf_counter() - t0) * 1000
    print(f"BOL First page load (50 rows): {t_bol_first_page:.2f} ms (Target <300ms)")

    # Page 100 load (offset 5000)
    t0 = time.perf_counter()
    rows = c.execute("""
        SELECT id, bol_number, issue_date, status, shipper_name, consignee_name, driver_name
        FROM bol_records
        ORDER BY created_at DESC, id DESC
        LIMIT 50 OFFSET 5000;
    """).fetchall()
    t_bol_page_100 = (time.perf_counter() - t0) * 1000
    print(f"BOL Page 100 load (offset 5000): {t_bol_page_100:.2f} ms")

    # Exact BOL search (indexed lookup)
    t0 = time.perf_counter()
    exact_row = c.execute("SELECT * FROM bol_records WHERE bol_number = 'BOL-AF-025432';").fetchone()
    t_bol_exact = (time.perf_counter() - t0) * 1000
    print(f"Exact BOL search ('BOL-AF-025432'): {t_bol_exact:.2f} ms (Target <100ms)")

    # Partial BOL search
    t0 = time.perf_counter()
    partial_rows = c.execute("SELECT id, bol_number, shipper_name FROM bol_records WHERE bol_number LIKE '%2543%' LIMIT 50;").fetchall()
    t_bol_partial = (time.perf_counter() - t0) * 1000
    print(f"Partial BOL search: {t_bol_partial:.2f} ms")

    # Container search (indexed lookup)
    t0 = time.perf_counter()
    cntr_row = c.execute("""
        SELECT c.*, b.bol_number, b.shipper_name 
        FROM containers c 
        JOIN bol_records b ON c.bol_id = b.id 
        WHERE c.container_number = 'MSKU0025432';
    """).fetchone()
    t_cntr_search = (time.perf_counter() - t0) * 1000
    print(f"Container search ('MSKU0025432'): {t_cntr_search:.2f} ms (Target <100ms)")

    # Shipper filter
    t0 = time.perf_counter()
    shipper_rows = c.execute("SELECT id, bol_number FROM bol_records WHERE shipper_name = 'Afghan Fruits Ltd' LIMIT 50;").fetchall()
    t_shipper_filter = (time.perf_counter() - t0) * 1000
    print(f"Shipper filter: {t_shipper_filter:.2f} ms (Target <200ms)")

    # Date filter
    t0 = time.perf_counter()
    date_rows = c.execute("""
        SELECT id, bol_number FROM bol_records 
        WHERE issue_date BETWEEN '2026-03-01' AND '2026-03-31' 
        LIMIT 50;
    """).fetchall()
    t_date_filter = (time.perf_counter() - t0) * 1000
    print(f"Date filter (30-day range): {t_date_filter:.2f} ms (Target <200ms)")

    # 4. Populate 500,000 ledger rows across accounts
    print("\nGenerating 500,000 ledger rows...")
    t0 = time.perf_counter()
    accounts = [f"ACC-CUST-{a:03d}" for a in range(1, 51)]  # 50 accounts
    ledger_batch = []
    
    for i in range(1, 500001):
        acc = accounts[i % len(accounts)]
        month = (i % 9) + 1
        day = (i % 28) + 1
        dt = f"2026-{month:02d}-{day:02d}"
        is_dr = (i % 3) != 0
        dr = Decimal("1250.00") if is_dr else Decimal("0.00")
        cr = Decimal("0.00") if is_dr else Decimal("2500.00")

        ledger_batch.append((
            f"led-uuid-{i:07d}", acc, f"Customer Account {acc}",
            dt, f"Logistics invoice freight tx #{i}",
            float(dr), float(cr), 0.0, "USD", "freight",
            1.0, f"REF-{i:07d}", 1, f"{dt} 09:00:00", f"{dt} 09:00:00"
        ))

        if len(ledger_batch) >= 25000:
            c.executemany("INSERT INTO ledger_records VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);", ledger_batch)
            conn.commit()
            ledger_batch = []

    if ledger_batch:
        c.executemany("INSERT INTO ledger_records VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);", ledger_batch)
        conn.commit()

    t_gen_ledger = (time.perf_counter() - t0)
    print(f"Generated 500,000 ledger entries in {t_gen_ledger:.2f} s")

    # 5. Test Ledger Benchmarks
    print("\n--- BENCHMARK: 500,000 LEDGER ROWS ---")
    target_acc = "ACC-CUST-015"

    # Customer ledger initial load (50 items)
    t0 = time.perf_counter()
    l_rows = c.execute("""
        SELECT id, account_id, transaction_date, description, debit, credit
        FROM ledger_records
        WHERE account_id = ?
        ORDER BY transaction_date ASC, id ASC
        LIMIT 50;
    """, (target_acc,)).fetchall()
    t_ledger_init = (time.perf_counter() - t0) * 1000
    print(f"Customer ledger initial load (50 items): {t_ledger_init:.2f} ms (Target <300ms)")

    # Opening balance calculation using covering index
    t0 = time.perf_counter()
    op_res = c.execute("""
        SELECT 
            COALESCE(SUM(debit), 0) AS dr,
            COALESCE(SUM(credit), 0) AS cr,
            COALESCE(SUM(debit) - SUM(credit), 0) AS bal
        FROM ledger_records
        WHERE account_id = ? AND transaction_date < '2026-06-01';
    """, (target_acc,)).fetchone()
    t_opening_bal = (time.perf_counter() - t0) * 1000
    print(f"Opening balance calculation (SQL covering index): {t_opening_bal:.2f} ms (Target <200ms) [Bal: {op_res['bal']:.2f}]")

    # 30-day date range query
    t0 = time.perf_counter()
    range_res = c.execute("""
        SELECT id, transaction_date, debit, credit
        FROM ledger_records
        WHERE account_id = ? AND transaction_date BETWEEN '2026-04-01' AND '2026-04-30'
        ORDER BY transaction_date ASC, id ASC
        LIMIT 50;
    """, (target_acc,)).fetchall()
    t_date_range_30d = (time.perf_counter() - t0) * 1000
    print(f"Customer ledger 30-day date range filter: {t_date_range_30d:.2f} ms (Target <250ms)")

    # 1-year date range filter
    t0 = time.perf_counter()
    range_1y = c.execute("""
        SELECT COUNT(id), COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
        FROM ledger_records
        WHERE account_id = ? AND transaction_date BETWEEN '2026-01-01' AND '2026-12-31';
    """, (target_acc,)).fetchone()
    t_range_1y = (time.perf_counter() - t0) * 1000
    print(f"1-year range summary aggregation: {t_range_1y:.2f} ms [Count: {range_1y[0]}, Debit: {range_1y[1]:.2f}, Credit: {range_1y[2]:.2f}]")

    # Page 5 navigation with running balance offset
    t0 = time.perf_counter()
    p5_offset = 200
    p5_prior = c.execute("""
        SELECT COALESCE(SUM(debit) - SUM(credit), 0)
        FROM (
            SELECT debit, credit
            FROM ledger_records
            WHERE account_id = ?
            ORDER BY transaction_date ASC, id ASC
            LIMIT 200
        );
    """, (target_acc,)).fetchone()[0]
    p5_rows = c.execute("""
        SELECT id, transaction_date, debit, credit
        FROM ledger_records
        WHERE account_id = ?
        ORDER BY transaction_date ASC, id ASC
        LIMIT 50 OFFSET 200;
    """, (target_acc,)).fetchall()
    t_page_5 = (time.perf_counter() - t0) * 1000
    print(f"Page 5 navigation (with accurate running balance offset): {t_page_5:.2f} ms (Target <200ms) [Prior offset sum: {p5_prior:.2f}]")

    # CSV Export query
    t0 = time.perf_counter()
    exp_rows = c.execute("""
        SELECT transaction_date, account_name, description, debit, credit, currency, reference_id
        FROM ledger_records
        WHERE account_id = ?
        ORDER BY transaction_date ASC, id ASC;
    """, (target_acc,)).fetchall()
    t_export = (time.perf_counter() - t0) * 1000
    print(f"Server-side CSV export query ({len(exp_rows)} rows): {t_export:.2f} ms")

    conn.close()

    # Clean up temporary test DB
    if TEMP_DB.exists():
        TEMP_DB.unlink()
    # Also clean up WAL and SHM files
    wal = Path(str(TEMP_DB) + "-wal")
    if wal.exists(): wal.unlink()
    shm = Path(str(TEMP_DB) + "-shm")
    if shm.exists(): shm.unlink()

    print("\nTemporary test database cleaned up safely. Zero impact on production.")
    print("=" * 65)


if __name__ == "__main__":
    run_stress_test()
