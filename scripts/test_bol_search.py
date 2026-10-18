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

        t0 = time.perf_counter()
        sql = """
            SELECT id, bol_number, issue_date, status, shipper_name, consignee_name, driver_name,
                   carton_count, gross_weight_kg, net_weight_kg, freight_fee, currency,
                   origin, destination, border_station, revision, updated_at, company_id
            FROM bol_records
            WHERE bol_number LIKE :q OR origin LIKE :q OR destination LIKE :q OR shipper_name LIKE :q OR consignee_name LIKE :q
            ORDER BY created_at DESC, id DESC
            LIMIT 50;
        """
        rows = (await db.execute(text(sql), {"q": "%Kabul%"})).fetchall()
        ms = (time.perf_counter() - t0) * 1000
        print(f"Direct SQL BOL search: {ms:.2f} ms (Rows: {len(rows)})")

if __name__ == "__main__":
    asyncio.run(bench())
