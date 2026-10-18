import asyncio
import os
from pathlib import Path
import statistics
import sys
import time

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from httpx import ASGITransport, AsyncClient
from backend.main import app
from backend.database import init_db


async def run_benchmarks():
    print("=" * 60)
    print("SKY ARIANA BACKEND FOUNDATION - PERFORMANCE BENCHMARK")
    print("=" * 60)

    # 1. Startup Time Measurement
    t0 = time.perf_counter()
    await init_db()
    startup_duration_ms = (time.perf_counter() - t0) * 1000.0
    print(f"\n[1] Database & Startup Initialization Time: {startup_duration_ms:.2f} ms")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Warmup
        await client.get("/api/v1/health")
        await client.get("/api/v1/ready")

        endpoints = [
            ("GET /api/v1/health", "GET", "/api/v1/health", None),
            ("GET /api/v1/ready", "GET", "/api/v1/ready", None),
            ("GET /api/v1/system/info", "GET", "/api/v1/system/info", None),
            (
                "POST /api/v1/bols",
                "POST",
                "/api/v1/bols",
                {
                    "bol_number": "BENCH-BOL-001",
                    "origin": "Torghundi",
                    "border_station": "Torghundi",
                    "driver_name": "Hamid Khan",
                    "driver_rent": 1400.0,
                    "carton_count": 500,
                    "gross_weight_kg": 12000.0,
                    "net_weight_kg": 11500.0,
                    "status": "active",
                },
            ),
            (
                "GET /api/v1/ledgers/invariance-check",
                "GET",
                "/api/v1/ledgers/invariance-check/BENCH-ACC-01",
                None,
            ),
        ]

        print(f"\n[2] Latency Benchmarks (100 iterations per endpoint):")
        print(f"{'Endpoint':<40} {'Min (ms)':<10} {'P50 (ms)':<10} {'P95 (ms)':<10} {'Max (ms)':<10}")
        print("-" * 80)

        for label, method, path, payload in endpoints:
            latencies = []
            for i in range(100):
                if method == "POST":
                    # Ensure unique BOL number for POST iterations
                    req_payload = dict(payload)
                    req_payload["bol_number"] = f"BENCH-BOL-{i:04d}"
                    t_start = time.perf_counter()
                    resp = await client.post(path, json=req_payload)
                    lat_ms = (time.perf_counter() - t_start) * 1000.0
                else:
                    t_start = time.perf_counter()
                    resp = await client.get(path)
                    lat_ms = (time.perf_counter() - t_start) * 1000.0

                assert resp.status_code in (200, 201), f"Unexpected status {resp.status_code}"
                latencies.append(lat_ms)

            latencies.sort()
            min_l = min(latencies)
            p50 = statistics.median(latencies)
            p95 = latencies[int(len(latencies) * 0.95)]
            max_l = max(latencies)

            print(f"{label:<40} {min_l:<10.2f} {p50:<10.2f} {p95:<10.2f} {max_l:<10.2f}")

    print("\n" + "=" * 60)
    print("BENCHMARK COMPLETED SUCCESSFULLY")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_benchmarks())
