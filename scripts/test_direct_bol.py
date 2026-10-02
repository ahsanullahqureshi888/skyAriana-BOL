import asyncio
import os
import sys
import time
from pathlib import Path
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import SessionLocal

async def bench():
    async with SessionLocal() as db:
        await db.execute(text("SELECT 1;"))

        # Direct SQL fetch
        t0 = time.perf_counter()
        bol_res = await db.execute(text("""
            SELECT b.id, b.bol_number, b.issue_date, b.origin, b.destination, b.border_station,
                   b.driver_name, b.father_name, b.driver_rent, b.carton_count, b.gross_weight_kg,
                   b.net_weight_kg, b.cargo_description, b.status, b.freight_fee, b.demurrage_fee,
                   b.documentation_fee, b.currency, b.exchange_rate, b.company_id, b.shipper_id,
                   b.consignee_id, b.notify_party_id, b.driver_id, b.truck_id, b.revision,
                   b.created_at, b.updated_at,
                   c.company_name,
                   s.name as shipper_name,
                   cn.name as consignee_name,
                   np.name as notify_party_name,
                   d.phone as driver_phone,
                   tr.truck_number
            FROM bol_records b
            LEFT JOIN companies c ON b.company_id = c.id
            LEFT JOIN shippers s ON b.shipper_id = s.id
            LEFT JOIN consignees cn ON b.consignee_id = cn.id
            LEFT JOIN notify_parties np ON b.notify_party_id = np.id
            LEFT JOIN drivers d ON b.driver_id = d.id
            LEFT JOIN trucks tr ON b.truck_id = tr.id
            WHERE b.bol_number = 'BOL-2026-NSA513' OR b.id = 'BOL-2026-NSA513'
            LIMIT 1;
        """))
        bol = bol_res.fetchone()
        ms_bol = (time.perf_counter() - t0) * 1000
        print(f"Direct BOL single joined query: {ms_bol:.2f} ms")

        if bol:
            bol_id = bol[0]
            t0 = time.perf_counter()
            # Items
            items = (await db.execute(text("SELECT id, item_description, carton_count, gross_weight_kg, net_weight_kg, volume_cbm, package_type, commodity_id FROM bol_items WHERE bol_id = :bid"), {"bid": bol_id})).fetchall()
            # Containers
            containers = (await db.execute(text("SELECT id, container_number, container_type, seal_number, tare_weight_kg, max_payload_kg, status FROM containers WHERE bol_id = :bid"), {"bid": bol_id})).fetchall()
            # Documents (metadata only, NO extracted_text!)
            docs = (await db.execute(text("SELECT id, title, document_type, file_size, mime_type, created_at FROM documents WHERE bol_id = :bid"), {"bid": bol_id})).fetchall()
            ms_subs = (time.perf_counter() - t0) * 1000
            print(f"Direct sub-items queries (items, containers, docs): {ms_subs:.2f} ms (Items: {len(items)}, Cont: {len(containers)}, Docs: {len(docs)})")
            print(f"Total cold direct time: {ms_bol + ms_subs:.2f} ms")

if __name__ == "__main__":
    asyncio.run(bench())
