import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import engine, ensure_performance_indexes

async def apply():
    async with engine.begin() as conn:
        await ensure_performance_indexes(conn)
    print("All performance indexes applied successfully.")

if __name__ == "__main__":
    asyncio.run(apply())
