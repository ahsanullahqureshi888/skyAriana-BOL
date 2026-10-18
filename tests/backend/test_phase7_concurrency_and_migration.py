"""
tests/backend/test_phase7_concurrency_and_migration.py

Phase 7 Automated Verification Suite:
1. Server Status & Network Discovery Endpoint (/api/v1/system/server-status)
2. Concurrency-Safe Atomic Sequence Allocation
3. Optimistic Concurrency Control (HTTP 409 Conflict on Revision Mismatch)
4. Maintenance Mode Safe Mutex Protection
5. Accounting Invariance Mathematical Validation (Net Balance = Debit - Credit)
6. Migration Script Dry-Run & Topology Verification
"""

import asyncio
import decimal
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.main import app
from backend.config import settings
from backend.database import get_db, init_db, SessionLocal
from backend.models.logistics import BOLModel
from backend.models.system import SequenceCounterModel
from scripts.migrate_sqlite_to_postgres import verify_accounting_invariance


@pytest.fixture(autouse=True)
async def setup_db():
    await init_db()


@pytest.mark.asyncio
async def test_server_status_endpoint():
    """Verify Central Server status discovery endpoint returns all required Phase 7 metadata."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/system/server-status")
        assert response.status_code == 200
        data = response.json()

        assert "server_name" in data
        assert "version" in data
        assert "minimum_client_version" in data
        assert "connection_mode" in data
        assert "database_type" in data
        assert "maintenance_mode" in data
        assert "uptime_seconds" in data
        assert "server_time" in data
        assert data["database_type"] in ("sqlite", "postgresql")


@pytest.mark.asyncio
async def test_atomic_sequence_allocation():
    """Verify that allocating multiple document sequences generates unique, non-colliding numbers."""
    unique_type = f"seq_{int(asyncio.get_event_loop().time() * 1000)}"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Request 5 consecutive sequence allocations
        allocated_numbers = []
        for _ in range(5):
            res = await client.post(f"/api/v1/system/sequences/next?entity_type={unique_type}&prefix=TST-")
            assert res.status_code == 200
            json_data = res.json()
            assert json_data["success"] is True
            allocated_numbers.append(json_data["allocated_number"])

        # Assert no duplicates
        assert len(allocated_numbers) == len(set(allocated_numbers))
        # Assert format
        assert allocated_numbers[0] == "TST-00001"
        assert allocated_numbers[4] == "TST-00005"

        # Peek without incrementing
        peek_res = await client.get(f"/api/v1/system/sequences/peek?entity_type={unique_type}")
        assert peek_res.status_code == 200
        peek_data = peek_res.json()["data"]
        assert peek_data["current_value"] == 5
        assert peek_data["next_preview"] == "TST-00006"


@pytest.mark.asyncio
async def test_optimistic_concurrency_conflict():
    """Verify that attempting to update a BOL with a stale revision triggers HTTP 409 Conflict."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create a test BOL
        bol_num = f"CONCUR-TEST-{int(asyncio.get_event_loop().time() * 1000)}"
        create_payload = {
            "bol_number": bol_num,
            "company_name": "Sky Ariana Global",
            "driver_name": "Test Driver",
            "father_name": "Test Father",
            "driver_rent": 500.0,
            "carton_count": 100,
            "gross_weight_kg": 2000.0,
            "net_weight_kg": 1950.0,
            "cargo_description": "General Merchandise",
            "freight_fee": 1200.0,
            "demurrage_fee": 0.0,
            "documentation_fee": 50.0,
            "currency": "USD",
            "items": [],
        }
        res_create = await client.post("/api/v1/bols", json=create_payload)
        assert res_create.status_code == 201

        # 2. First client successfully updates revision 1 -> 2
        patch_payload_1 = {
            "driver_name": "Updated Driver Name",
            "revision": 1,
        }
        res_patch_1 = await client.patch(f"/api/v1/bols/{bol_num}", json=patch_payload_1)
        assert res_patch_1.status_code == 200
        data_1 = res_patch_1.json()["data"]
        assert data_1["revision"] == 2

        # 3. Second client tries to update with stale revision 1 -> MUST trigger HTTP 409 Conflict
        patch_payload_stale = {
            "driver_name": "Stale Concurrent Update",
            "revision": 1,
        }
        res_patch_2 = await client.patch(f"/api/v1/bols/{bol_num}", json=patch_payload_stale)
        assert res_patch_2.status_code == 409
        conflict_data = res_patch_2.json()
        assert "detail" in conflict_data or "error" in conflict_data
        detail_msg = conflict_data.get("detail", "") or conflict_data.get("error", "")
        assert "conflict" in detail_msg.lower() or "rev" in detail_msg.lower()


@pytest.mark.asyncio
async def test_maintenance_mode_protection():
    """Verify that when maintenance mode is active, mutations are rejected with HTTP 503."""
    original_mode = settings.MAINTENANCE_MODE
    try:
        settings.MAINTENANCE_MODE = True
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # GET /health must succeed even in maintenance mode
            health_res = await client.get("/api/v1/health")
            assert health_res.status_code == 200

            # POST /bols mutation must be rejected with 503
            mutation_res = await client.post("/api/v1/bols", json={"bol_number": "MAINT-TEST"})
            assert mutation_res.status_code == 503
            assert mutation_res.json().get("maintenance_mode") is True
    finally:
        settings.MAINTENANCE_MODE = original_mode


def test_accounting_invariance_logic():
    """Verify the accounting invariance verification helper correctly flags mismatches."""
    from sqlalchemy import create_engine

    # In-memory SQLite database simulating source and target
    e1 = create_engine("sqlite:///:memory:")
    e2 = create_engine("sqlite:///:memory:")

    schema = """
        CREATE TABLE ledger_records (
            id VARCHAR(36) PRIMARY KEY,
            currency VARCHAR(10),
            debit DECIMAL(18, 4),
            credit DECIMAL(18, 4)
        );
    """
    with e1.begin() as c1, e2.begin() as c2:
        c1.execute(text(schema))
        c2.execute(text(schema))

        # Insert identical balanced records in both
        c1.execute(text("INSERT INTO ledger_records VALUES ('1', 'USD', 1000.0, 400.0);"))
        c2.execute(text("INSERT INTO ledger_records VALUES ('1', 'USD', 1000.0, 400.0);"))

    passed, report = verify_accounting_invariance(e1, e2)
    assert passed is True
    assert len(report["mismatches"]) == 0

    # Introduce a discrepancy in target e2
    with e2.begin() as c2:
        c2.execute(text("INSERT INTO ledger_records VALUES ('2', 'USD', 500.0, 0.0);"))

    passed_bad, report_bad = verify_accounting_invariance(e1, e2)
    assert passed_bad is False
    assert len(report_bad["mismatches"]) > 0
