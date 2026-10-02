import asyncio
import os
import sys
import time
from pathlib import Path
from decimal import Decimal
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import SessionLocal

async def bench():
    async with SessionLocal() as db:
        await db.execute(text("SELECT 1;"))

        # Test A: raw text with func.count(*)
        t0 = time.perf_counter()
        res_a = await db.execute(text("SELECT count(*), coalesce(sum(debit), 0), coalesce(sum(credit), 0) FROM ledger_records WHERE currency = 'USD' AND account_id = 'ACC-138e08e812'"))
        row_a = res_a.one()
        ms_a = (time.perf_counter() - t0) * 1000
        print(f"Test A (raw SQL): {ms_a:.2f} ms -> {row_a}")

        # Test B: raw text again
        t0 = time.perf_counter()
        res_b = await db.execute(text("SELECT count(*), coalesce(sum(debit), 0), coalesce(sum(credit), 0) FROM ledger_records WHERE currency = 'USD' AND account_id = 'ACC-138e08e812'"))
        row_b = res_b.one()
        ms_b = (time.perf_counter() - t0) * 1000
        print(f"Test B (repeat raw SQL): {ms_b:.2f} ms -> {row_b}")

if __name__ == "__main__":
    asyncio.run(bench())
