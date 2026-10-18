import asyncio
import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import time
import httpx
from backend.main import app

async def benchmark():
    results = []

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Warmup
        await client.get("/health")

        # 1. Full Ledger Balance & Running Balance Calculation
        t0 = time.perf_counter()
        r = await client.get("/api/v1/ledger?account_id=ACC-138e08e812&currency=USD&page=1&page_size=100")
        dur1 = (time.perf_counter() - t0) * 1000
        results.append(("Ledger Balance & Running Calc (ACC-138e08e812)", "GET /api/v1/ledger", dur1, r.status_code))

        # 2. Large Ledger Export (All entries CSV generation)
        t0 = time.perf_counter()
        r = await client.post("/api/v1/ledger/export", json={"currency": "USD"})
        dur2 = (time.perf_counter() - t0) * 1000
        results.append(("Ledger Full Export Generation (All USD records)", "POST /api/v1/ledger/export", dur2, r.status_code))

        # 3. Single BOL Full Detail Loading (with items, containers, parties)
        t0 = time.perf_counter()
        r = await client.get("/api/v1/bols/BOL-2026-NSA513/details")
        dur3 = (time.perf_counter() - t0) * 1000
        results.append(("BOL Detail Loading (with items, containers, parties)", "GET /api/v1/bols/{num}/details", dur3, r.status_code))

        # 4. BOL List Query with Multi-field text search & count
        t0 = time.perf_counter()
        r = await client.get("/api/v1/bols?q=Kabul&page=1&page_size=50")
        dur4 = (time.perf_counter() - t0) * 1000
        results.append(("BOL Multi-field Search & Pagination", "GET /api/v1/bols?q=Kabul", dur4, r.status_code))

        # 5. Documents / Attachments Listing (Database-backed)
        t0 = time.perf_counter()
        r = await client.get("/api/v1/documents?page=1&page_size=50")
        dur5 = (time.perf_counter() - t0) * 1000
        results.append(("Document Metadata Listing", "GET /api/v1/documents", dur5, r.status_code))

        # 6. Shipments List & Multi-filter Lookup (Database-backed)
        t0 = time.perf_counter()
        r = await client.get("/api/v1/shipments?page=1&page_size=50")
        dur6 = (time.perf_counter() - t0) * 1000
        results.append(("Shipment Tracking & List Query", "GET /api/v1/shipments", dur6, r.status_code))

        # 7. Parties / Shippers Dropdown Query
        t0 = time.perf_counter()
        r = await client.get("/api/v1/parties/search?role=SHIPPER&limit=30")
        dur7 = (time.perf_counter() - t0) * 1000
        results.append(("Shippers Master Dropdown Query", "GET /api/v1/parties/search?role=SHIPPER", dur7, r.status_code))

        # 8. Consignees Dropdown Query
        t0 = time.perf_counter()
        r = await client.get("/api/v1/parties/search?role=CONSIGNEE&limit=30")
        dur8 = (time.perf_counter() - t0) * 1000
        results.append(("Consignees Master Dropdown Query", "GET /api/v1/parties/search?role=CONSIGNEE", dur8, r.status_code))

        # 9. Account Search Endpoint
        t0 = time.perf_counter()
        r = await client.get("/api/v1/ledger/accounts/search?q=ACC")
        dur9 = (time.perf_counter() - t0) * 1000
        results.append(("Ledger Account Search", "GET /api/v1/ledger/accounts/search?q=ACC", dur9, r.status_code))

        # 10. Container Lookup by Number
        t0 = time.perf_counter()
        r = await client.get("/api/v1/containers/lookup?number=CONT")
        dur10 = (time.perf_counter() - t0) * 1000
        results.append(("Container Number Search", "GET /api/v1/containers/lookup?number=CONT", dur10, r.status_code))

        # Extra: Executive Summary Report
        t0 = time.perf_counter()
        r_sum = await client.get("/api/v1/reports/summary?currency=USD")
        dur_sum = (time.perf_counter() - t0) * 1000
        print(f"Executive Summary Report: {dur_sum:.2f}ms (Status: {r_sum.status_code})")

        # Extra: System Performance Diagnostics
        t0 = time.perf_counter()
        r_perf = await client.get("/api/v1/system/performance")
        dur_perf = (time.perf_counter() - t0) * 1000
        print(f"System Performance Diagnostics: {dur_perf:.2f}ms (Status: {r_perf.status_code}) -> {r_perf.json().get('status')}")

    print("\n" + "="*95)
    print("PROFILED OPERATIONS BENCHMARK RESULTS (RANKED FROM SLOWEST TO FASTEST)")
    print("="*95)
    # Sort descending by latency
    sorted_ops = sorted(results, key=lambda x: x[2], reverse=True)
    for i, (name, endpoint, ms, status) in enumerate(sorted_ops, 1):
        slow_tag = "[SLOW API] " if ms > 500 else "[MODERATE] " if ms > 100 else "[FAST]     "
        print(f"#{i:2d}: {slow_tag} {ms:7.2f} ms | Status: {status} | {endpoint:<42} | {name}")
    print("="*95)

if __name__ == "__main__":
    asyncio.run(benchmark())
