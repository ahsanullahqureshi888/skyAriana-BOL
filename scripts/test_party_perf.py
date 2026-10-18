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
            SELECT s.id, s.name, s.code, c.company_name, s.contact_person, s.phone, s.email, s.address, s.city, s.country
            FROM shippers s
            LEFT JOIN companies c ON s.company_id = c.id
            WHERE s.name LIKE '%%'
            LIMIT 30;
        """
        rows = (await db.execute(text(sql))).all()
        ms = (time.perf_counter() - t0) * 1000
        print(f"Direct SQL shippers search: {ms:.2f} ms (Rows: {len(rows)})")

if __name__ == "__main__":
    asyncio.run(bench())
