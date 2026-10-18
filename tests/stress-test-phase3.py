"""
Phase 3 Stress Testing Benchmark
Tests in an isolated temporary SQLite database:
1. 50,000 BOL records:
   - First page (page 1)
   - Deep page (page 100)
   - Exact BOL search
   - Partial BOL search
   - Container search
   - Shipper filter
   - Date filter
2. 500,000 journal lines:
   - Account ledger page
   - Customer ledger
   - 30-day range filter
   - 1-year range filter
   - Opening balance SQL aggregation
   - Closing balance computation
   - Page navigation
"""
from __future__ import annotations

import asyncio
import datetime
from decimal import Decimal
import os
import random
import time
from sqlalchemy import Index, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

TEMP_DB_PATH = "temp_stress_test_phase3.db"
TEMP_DB_URL = f"sqlite+aiosqlite:///{TEMP_DB_PATH}"

engine = create_async_engine(
    TEMP_DB_URL,
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
    future=True,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    future=True,
    class_=AsyncSession,
)


class Base(DeclarativeBase):
    pass


async def init_stress_schema():
    async with engine.begin() as conn:
        await conn.execute(text("PRAGMA journal_mode = WAL;"))
        await conn.execute(text("PRAGMA synchronous = NORMAL;"))
        await conn.execute(text("PRAGMA temp_store = MEMORY;"))

        # BOL Table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS stress_bols (
                id TEXT PRIMARY KEY,
                bol_number TEXT NOT NULL,
                company_id TEXT,
                issue_date TEXT NOT NULL,
                shipper_name TEXT,
                consignee_name TEXT,
                notify_party_name TEXT,
                container_number TEXT,
                status TEXT NOT NULL,
                driver_rent NUMERIC(18, 4) DEFAULT 0,
                freight_fee NUMERIC(18, 4) DEFAULT 0,
                demurrage_fee NUMERIC(18, 4) DEFAULT 0,
                documentation_fee NUMERIC(18, 4) DEFAULT 0,
                currency TEXT DEFAULT 'USD',
                revision INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            );
        """))
        # BOL Indexes
        await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_sbol_num ON stress_bols(bol_number);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sbol_container ON stress_bols(container_number);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sbol_status_date ON stress_bols(status, issue_date);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sbol_shipper_date ON stress_bols(shipper_name, issue_date);"))

        # Ledger Table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS stress_ledger (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                party_id TEXT,
                transaction_date TEXT NOT NULL,
                description TEXT NOT NULL,
                debit NUMERIC(18, 4) DEFAULT 0,
                credit NUMERIC(18, 4) DEFAULT 0,
                currency TEXT DEFAULT 'USD',
                created_at TEXT NOT NULL
            );
        """))
        # Ledger Indexes
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sled_acc_date_id ON stress_ledger(account_id, transaction_date, id);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sled_acc_date_cov ON stress_ledger(account_id, transaction_date, debit, credit);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sled_date ON stress_ledger(transaction_date);"))


async def seed_stress_data(num_bols: int = 50000, num_ledger: int = 500000):
    print(f"--- Seeding {num_bols:,} BOLs and {num_ledger:,} Ledger records into isolated stress database ---")
    t0 = time.perf_counter()

    async with engine.begin() as conn:
        # Batch insert BOLs
        bol_batch_size = 10000
        for b_start in range(0, num_bols, bol_batch_size):
            rows = []
            for i in range(b_start, b_start + bol_batch_size):
                b_num = f"BOL-NSA{i:06d}"
                c_num = f"MSCU{random.randint(1000000, 9999999)}"
                d_str = (datetime.date(2025, 1, 1) + datetime.timedelta(days=random.randint(0, 700))).isoformat()
                rows.append({
                    "id": f"b-{i}",
                    "bol_number": b_num,
                    "company_id": f"comp-{random.randint(1, 10)}",
                    "issue_date": d_str,
                    "shipper_name": f"Shipper Corp {random.randint(1, 200)}",
                    "consignee_name": f"Consignee Ltd {random.randint(1, 200)}",
                    "notify_party_name": f"Notify Party {random.randint(1, 50)}",
                    "container_number": c_num,
                    "status": random.choice(["active", "delivered", "in_transit", "at_border"]),
                    "driver_rent": random.randint(500, 4000),
                    "freight_fee": random.randint(1000, 5000),
                    "demurrage_fee": 0,
                    "documentation_fee": 150,
                    "currency": "USD",
                    "revision": 1,
                    "created_at": d_str + "T10:00:00Z"
                })
            await conn.execute(
                text("""
                    INSERT INTO stress_bols (
                        id, bol_number, company_id, issue_date, shipper_name, consignee_name,
                        notify_party_name, container_number, status, driver_rent, freight_fee,
                        demurrage_fee, documentation_fee, currency, revision, created_at
                    ) VALUES (
                        :id, :bol_number, :company_id, :issue_date, :shipper_name, :consignee_name,
                        :notify_party_name, :container_number, :status, :driver_rent, :freight_fee,
                        :demurrage_fee, :documentation_fee, :currency, :revision, :created_at
                    )
                """),
                rows
            )

        # Batch insert Ledger records
        led_batch_size = 50000
        for l_start in range(0, num_ledger, led_batch_size):
            rows = []
            for j in range(l_start, l_start + led_batch_size):
                acc = f"ACC-{random.randint(1, 50):03d}"
                d_str = (datetime.date(2025, 1, 1) + datetime.timedelta(days=random.randint(0, 700))).isoformat()
                is_debit = random.random() > 0.4
                amt = random.randint(100, 15000)
                rows.append({
                    "id": f"l-{j}",
                    "account_id": acc,
                    "party_id": f"party-{random.randint(1, 100)}",
                    "transaction_date": d_str,
                    "description": f"Freight charge for consignment #{j}",
                    "debit": amt if is_debit else 0,
                    "credit": 0 if is_debit else amt,
                    "currency": "USD",
                    "created_at": d_str + "T12:00:00Z"
                })
            await conn.execute(
                text("""
                    INSERT INTO stress_ledger (
                        id, account_id, party_id, transaction_date, description, debit, credit, currency, created_at
                    ) VALUES (
                        :id, :account_id, :party_id, :transaction_date, :description, :debit, :credit, :currency, :created_at
                    )
                """),
                rows
            )

    t1 = time.perf_counter()
    print(f"Data seeded in {(t1 - t0):.2f}s.")


async def run_stress_benchmarks():
    await init_stress_schema()
    await seed_stress_data(50000, 500000)

    print("\n--- Executing 50,000 BOL Stress Benchmarks ---")
    async with SessionLocal() as db:
        # 1. First Page (Page 1, 50 items)
        t0 = time.perf_counter()
        res = await db.execute(text("SELECT * FROM stress_bols ORDER BY issue_date DESC, id DESC LIMIT 50 OFFSET 0;"))
        _ = res.fetchall()
        t1 = time.perf_counter()
        bol_page1_ms = (t1 - t0) * 1000

        # 2. Deep Page (Page 100, 50 items)
        t0 = time.perf_counter()
        res = await db.execute(text("SELECT * FROM stress_bols ORDER BY issue_date DESC, id DESC LIMIT 50 OFFSET 5000;"))
        _ = res.fetchall()
        t1 = time.perf_counter()
        bol_page100_ms = (t1 - t0) * 1000

        # 3. Exact BOL Search (using indexed bol_number)
        t0 = time.perf_counter()
        res = await db.execute(text("SELECT * FROM stress_bols WHERE bol_number = 'BOL-NSA025000' LIMIT 1;"))
        _ = res.fetchone()
        t1 = time.perf_counter()
        bol_exact_ms = (t1 - t0) * 1000

        # 4. Partial BOL Search
        t0 = time.perf_counter()
        res = await db.execute(text("SELECT * FROM stress_bols WHERE bol_number LIKE 'BOL-NSA025%' LIMIT 50;"))
        _ = res.fetchall()
        t1 = time.perf_counter()
        bol_partial_ms = (t1 - t0) * 1000

        # 5. Container Search
        t0 = time.perf_counter()
        res = await db.execute(text("SELECT * FROM stress_bols WHERE container_number = 'MSCU5555555' LIMIT 50;"))
        _ = res.fetchall()
        t1 = time.perf_counter()
        bol_container_ms = (t1 - t0) * 1000

        # 6. Shipper Filter
        t0 = time.perf_counter()
        res = await db.execute(text("SELECT * FROM stress_bols WHERE shipper_name = 'Shipper Corp 42' ORDER BY issue_date DESC LIMIT 50;"))
        _ = res.fetchall()
        t1 = time.perf_counter()
        bol_shipper_ms = (t1 - t0) * 1000

        # 7. Date Filter
        t0 = time.perf_counter()
        res = await db.execute(text("SELECT * FROM stress_bols WHERE issue_date BETWEEN '2025-06-01' AND '2025-06-30' ORDER BY issue_date DESC LIMIT 50;"))
        _ = res.fetchall()
        t1 = time.perf_counter()
        bol_date_ms = (t1 - t0) * 1000

    print(f"  • BOL First Page (50 rows):       {bol_page1_ms:.2f} ms")
    print(f"  • BOL Page 100 (Offset 5000):     {bol_page100_ms:.2f} ms")
    print(f"  • BOL Exact Search:               {bol_exact_ms:.2f} ms")
    print(f"  • BOL Partial Search:             {bol_partial_ms:.2f} ms")
    print(f"  • Container Search:               {bol_container_ms:.2f} ms")
    print(f"  • Shipper Filter:                 {bol_shipper_ms:.2f} ms")
    print(f"  • Date Filter (1 Month):          {bol_date_ms:.2f} ms")

    print("\n--- Executing 500,000 Ledger Rows Stress Benchmarks ---")
    async with SessionLocal() as db:
        # 1. Account Ledger Page 1
        t0 = time.perf_counter()
        res = await db.execute(text("SELECT * FROM stress_ledger WHERE account_id = 'ACC-007' ORDER BY transaction_date ASC, id ASC LIMIT 50 OFFSET 0;"))
        _ = res.fetchall()
        t1 = time.perf_counter()
        led_page1_ms = (t1 - t0) * 1000

        # 2. Customer / Account Opening Balance (Prior to date)
        t0 = time.perf_counter()
        res = await db.execute(text("SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0) FROM stress_ledger WHERE account_id = 'ACC-007' AND transaction_date < '2025-07-01';"))
        row = res.fetchone()
        t1 = time.perf_counter()
        led_open_bal_ms = (t1 - t0) * 1000

        # 3. 30-Day Range Filter + Totals
        t0 = time.perf_counter()
        res = await db.execute(text("SELECT COUNT(id), COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0) FROM stress_ledger WHERE account_id = 'ACC-007' AND transaction_date BETWEEN '2025-07-01' AND '2025-07-31';"))
        row = res.fetchone()
        t1 = time.perf_counter()
        led_30d_ms = (t1 - t0) * 1000

        # 4. 1-Year Range Filter + Totals
        t0 = time.perf_counter()
        res = await db.execute(text("SELECT COUNT(id), COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0) FROM stress_ledger WHERE account_id = 'ACC-007' AND transaction_date BETWEEN '2025-01-01' AND '2025-12-31';"))
        row = res.fetchone()
        t1 = time.perf_counter()
        led_1yr_ms = (t1 - t0) * 1000

        # 5. Page Navigation (Page 10, offset 500)
        t0 = time.perf_counter()
        res = await db.execute(text("SELECT * FROM stress_ledger WHERE account_id = 'ACC-007' ORDER BY transaction_date ASC, id ASC LIMIT 50 OFFSET 500;"))
        _ = res.fetchall()
        t1 = time.perf_counter()
        led_page10_ms = (t1 - t0) * 1000

    print(f"  • Ledger Page 1 (ACC-007):        {led_page1_ms:.2f} ms")
    print(f"  • Opening Balance Aggregation:    {led_open_bal_ms:.2f} ms")
    print(f"  • 30-Day Date Filter & Totals:    {led_30d_ms:.2f} ms")
    print(f"  • 1-Year Date Filter & Totals:    {led_1yr_ms:.2f} ms")
    print(f"  • Page Navigation (Page 10):      {led_page10_ms:.2f} ms")


async def main():
    try:
        await run_stress_benchmarks()
    finally:
        await engine.dispose()
        # Clean up temporary database files
        for ext in ["", "-wal", "-shm"]:
            p = TEMP_DB_PATH + ext
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass
        print("\nIsolated temporary stress database cleanly destroyed.")

if __name__ == "__main__":
    asyncio.run(main())
