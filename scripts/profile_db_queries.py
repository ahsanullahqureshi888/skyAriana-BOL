import asyncio
import os
import sys
import time
from pathlib import Path
from decimal import Decimal

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from backend.database import SessionLocal, engine

async def profile_queries():
    results = []

    async with SessionLocal() as db:
        # Warmup
        await db.execute(text("SELECT 1;"))

        # Q1: Ledger running balance subquery offset calculation (ACC-138e08e812)
        t0 = time.perf_counter()
        q1 = await db.execute(text("""
            SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
            FROM (
                SELECT debit, credit
                FROM ledger_records
                WHERE currency = 'USD' AND account_id = 'ACC-138e08e812'
                ORDER BY transaction_date ASC, id ASC
                LIMIT 500
            ) subq;
        """))
        _ = q1.one()
        d1 = (time.perf_counter() - t0) * 1000
        results.append(("Q1: Ledger Subquery Pre-Sum for Running Balance", d1, "Ledger Running Balance"))

        # Q2: Ledger Summary Aggregation over 2,996 records
        t0 = time.perf_counter()
        q2 = await db.execute(text("""
            SELECT COUNT(id), COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
            FROM ledger_records
            WHERE currency = 'USD';
        """))
        _ = q2.one()
        d2 = (time.perf_counter() - t0) * 1000
        results.append(("Q2: Ledger Global Aggregation (COUNT, SUM dr, cr)", d2, "Ledger Global Summary"))

        # Q3: BOL Multi-column Unindexed LIKE query
        t0 = time.perf_counter()
        q3 = await db.execute(text("""
            SELECT id, bol_number, shipper_name, consignee_name, driver_name
            FROM bol_records
            WHERE bol_number LIKE '%NSA%'
               OR driver_name LIKE '%Ahmad%'
               OR shipper_name LIKE '%Trading%'
               OR consignee_name LIKE '%Kabul%'
               OR cargo_description LIKE '%Food%'
            ORDER BY created_at DESC, id DESC
            LIMIT 50;
        """))
        _ = q3.fetchall()
        d3 = (time.perf_counter() - t0) * 1000
        results.append(("Q3: BOL Full Text Multi-Field LIKE Search", d3, "BOL Search"))

        # Q4: BOL Detail with 9 separate queries (simulating selectinload)
        t0 = time.perf_counter()
        bol_row = (await db.execute(text("SELECT id, bol_number, company_id, shipper_id, consignee_id, notify_party_id, driver_id, truck_id FROM bol_records WHERE bol_number = 'BOL-2026-NSA513' LIMIT 1;"))).fetchone()
        if bol_row:
            bol_id = bol_row[0]
            # items
            await db.execute(text(f"SELECT * FROM bol_items WHERE bol_id = '{bol_id}';"))
            # containers
            await db.execute(text(f"SELECT * FROM containers WHERE bol_id = '{bol_id}';"))
            # company
            if bol_row[2]: await db.execute(text(f"SELECT * FROM companies WHERE id = '{bol_row[2]}';"))
            # shipper
            if bol_row[3]: await db.execute(text(f"SELECT * FROM shippers WHERE id = '{bol_row[3]}';"))
            # consignee
            if bol_row[4]: await db.execute(text(f"SELECT * FROM consignees WHERE id = '{bol_row[4]}';"))
            # notify_party
            if bol_row[5]: await db.execute(text(f"SELECT * FROM notify_parties WHERE id = '{bol_row[5]}';"))
            # driver
            if bol_row[6]: await db.execute(text(f"SELECT * FROM drivers WHERE id = '{bol_row[6]}';"))
            # truck
            if bol_row[7]: await db.execute(text(f"SELECT * FROM trucks WHERE id = '{bol_row[7]}';"))
            # documents
            await db.execute(text(f"SELECT * FROM documents WHERE bol_id = '{bol_id}';"))
        d4 = (time.perf_counter() - t0) * 1000
        results.append(("Q4: BOL Detail 10-Roundtrip Simulated Selectinload", d4, "BOL Details Opening"))

        # Q5: Invoices and Invoice Items Join (Without composite index)
        t0 = time.perf_counter()
        q5 = await db.execute(text("""
            SELECT i.id, i.invoice_number, i.total_amount, i.status, COUNT(ii.id) as item_count, SUM(ii.amount) as items_sum
            FROM invoices i
            LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
            GROUP BY i.id, i.invoice_number, i.total_amount, i.status
            ORDER BY i.issue_date DESC;
        """))
        _ = q5.fetchall()
        d5 = (time.perf_counter() - t0) * 1000
        results.append(("Q5: Invoices with Items Aggregated Summary", d5, "Invoice Aggregation"))

        # Q6: Document Metadata list with BOL join
        t0 = time.perf_counter()
        q6 = await db.execute(text("""
            SELECT d.id, d.title, d.document_type, d.file_path, d.file_size, d.mime_type, b.bol_number
            FROM documents d
            LEFT JOIN bol_records b ON d.bol_id = b.id
            ORDER BY d.created_at DESC
            LIMIT 50;
        """))
        _ = q6.fetchall()
        d6 = (time.perf_counter() - t0) * 1000
        results.append(("Q6: Document Metadata Joined with BOLs", d6, "Document Metadata List"))

        # Q7: Shipments full listing with route & BOL join
        t0 = time.perf_counter()
        q7 = await db.execute(text("""
            SELECT s.id, s.tracking_number, s.status, s.origin, s.destination, b.bol_number, r.route_name
            FROM shipments s
            LEFT JOIN bol_records b ON s.bol_id = b.id
            LEFT JOIN routes r ON s.route_id = r.id
            ORDER BY s.created_at DESC
            LIMIT 50;
        """))
        _ = q7.fetchall()
        d7 = (time.perf_counter() - t0) * 1000
        results.append(("Q7: Shipment Tracking Query with Route/BOL Joins", d7, "Shipment Tracking"))

        # Q8: Ledger Account Summary & Balance (Group By account_id, currency)
        t0 = time.perf_counter()
        q8 = await db.execute(text("""
            SELECT account_id, currency, COUNT(*) as cnt, SUM(debit) as total_dr, SUM(credit) as total_cr, (SUM(debit) - SUM(credit)) as net_bal
            FROM ledger_records
            GROUP BY account_id, currency
            ORDER BY cnt DESC
            LIMIT 30;
        """))
        _ = q8.fetchall()
        d8 = (time.perf_counter() - t0) * 1000
        results.append(("Q8: Multi-Account Balance Summary Aggregation", d8, "Multi-Currency Ledger"))

        # Q9: Party Search across master tables
        t0 = time.perf_counter()
        q9 = await db.execute(text("""
            SELECT 'SHIPPER' as role, id, name, phone, code FROM shippers WHERE name LIKE '%Trading%'
            UNION ALL
            SELECT 'CONSIGNEE' as role, id, name, phone, code FROM consignees WHERE name LIKE '%Trading%'
            UNION ALL
            SELECT 'COMPANY' as role, id, company_name as name, contact_phone as phone, code FROM companies WHERE company_name LIKE '%Trading%'
            LIMIT 30;
        """))
        _ = q9.fetchall()
        d9 = (time.perf_counter() - t0) * 1000
        results.append(("Q9: Party Search Across Master Tables (UNION)", d9, "Party Dropdowns"))

        # Q10: Containers Lookup with BOL and Shipper
        t0 = time.perf_counter()
        q10 = await db.execute(text("""
            SELECT c.id, c.container_number, c.container_type, c.seal_number, b.bol_number, b.shipper_name, b.consignee_name
            FROM containers c
            LEFT JOIN bol_records b ON c.bol_id = b.id
            WHERE c.container_number LIKE '%CONT%' OR c.container_number LIKE '%MSKU%'
            LIMIT 20;
        """))
        _ = q10.fetchall()
        d10 = (time.perf_counter() - t0) * 1000
        results.append(("Q10: Container Lookup with Joined Shipment/BOL Data", d10, "Container Lookups"))

    print("\n" + "="*85)
    print("TOP 10 DATABASE OPERATIONS PROFILED (RANKED FROM SLOWEST TO FASTEST)")
    print("="*85)
    sorted_queries = sorted(results, key=lambda x: x[1], reverse=True)
    for i, (name, ms, category) in enumerate(sorted_queries, 1):
        slow_tag = "[SLOW QUERY] " if ms > 300 else "[MODERATE]   " if ms > 50 else "[FAST]       "
        print(f"#{i:2d}: {slow_tag} {ms:7.2f} ms | Category: {category:<25} | {name}")
    print("="*85)

if __name__ == "__main__":
    asyncio.run(profile_queries())
