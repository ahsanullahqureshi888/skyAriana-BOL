import asyncio
import os
import sys
import time
from pathlib import Path
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import SessionLocal
from backend.services.bol_service import get_bol_detail

async def bench():
    async with SessionLocal() as db:
        await db.execute(text("SELECT 1;"))

        # Cold run
        t0 = time.perf_counter()
        detail = await get_bol_detail(db, "BOL-2026-NSA513")
        ms_cold = (time.perf_counter() - t0) * 1000
        print(f"Cold get_bol_detail: {ms_cold:.2f} ms")

        # Warm/cached run
        t0 = time.perf_counter()
        detail2 = await get_bol_detail(db, "BOL-2026-NSA513")
        ms_warm = (time.perf_counter() - t0) * 1000
        print(f"Warm/cached get_bol_detail: {ms_warm:.4f} ms")

if __name__ == "__main__":
    asyncio.run(bench())
