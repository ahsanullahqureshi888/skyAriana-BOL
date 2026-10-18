"""Tests for Performance Phase 3: Ultra-Fast BOL Editor, Saved BOLs, and Ledger."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_bol_pagination_and_lightweight_list(async_client: AsyncClient):
    """Test server-side pagination and lightweight BOL list response schema."""
    # 1. Page 1 with page_size=10
    res = await async_client.get("/api/v1/bols", params={"page": 1, "page_size": 10})
    assert res.status_code == 200, res.text
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert len(data["items"]) <= 10

    if data["items"]:
        first = data["items"][0]
        # Verify required lightweight fields only (Section 7)
        assert "id" in first
        assert "bol_number" in first
        assert "status" in first
        assert "revision" in first
        # Verify heavy fields are NOT returned
        assert "cargo_items" not in first
        assert "audit_logs" not in first
        assert "pdf_data" not in first


@pytest.mark.asyncio
async def test_bol_duplicate_check_and_details(async_client: AsyncClient):
    """Test indexed check-number, details retrieval, and single document schema."""
    # List one BOL to obtain an ID
    list_res = await async_client.get("/api/v1/bols", params={"page": 1, "page_size": 1})
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert len(items) > 0
    bol_num = items[0]["bol_number"]
    bol_id = items[0]["id"]

    # 1. Duplicate check for existing BOL
    chk_res = await async_client.get("/api/v1/bols/check-number", params={"number": bol_num})
    assert chk_res.status_code == 200
    chk_data = chk_res.json()["data"]
    assert chk_data["exists"] is True
    assert chk_data["bol_number"] == bol_num

    # 2. Duplicate check for non-existent BOL
    chk_res2 = await async_client.get("/api/v1/bols/check-number", params={"number": "BOL-NON-EXISTENT-XYZ999"})
    assert chk_res2.status_code == 200
    assert chk_res2.json()["data"]["exists"] is False

    # 3. BOL Detail endpoint (Section 6, 8)
    det_res = await async_client.get(f"/api/v1/bols/{bol_id}/details")
    assert det_res.status_code == 200
    detail = det_res.json()["data"]
    assert detail["id"] == bol_id
    assert detail["bol_number"] == bol_num
    assert "items" in detail
    assert "containers" in detail
    assert "linked_documents" in detail
    assert "driver_name" in detail
    assert "border_station" in detail
    assert "revision" in detail


@pytest.mark.asyncio
async def test_bol_patch_and_optimistic_concurrency(async_client: AsyncClient):
    """Test partial update (PATCH) and optimistic concurrency conflict (Section 23, 24)."""
    list_res = await async_client.get("/api/v1/bols", params={"page": 1, "page_size": 1})
    items = list_res.json()["items"]
    bol_id = items[0]["id"]

    # Fetch current detail to get current revision
    det_res = await async_client.get(f"/api/v1/bols/{bol_id}/details")
    curr_rev = det_res.json()["data"]["revision"]

    # 1. Successful PATCH with correct revision
    patch_payload = {
        "revision": curr_rev,
        "cargo_description": "Updated cargo description for Phase 3 test",
        "driver_rent": 1600.0,
    }
    patch_res = await async_client.patch(f"/api/v1/bols/{bol_id}", json=patch_payload)
    assert patch_res.status_code == 200, patch_res.text
    patch_data = patch_res.json()["data"]
    assert patch_data["revision"] == curr_rev + 1

    # 2. Concurrency Conflict (stale revision) -> 409 Conflict
    conflict_payload = {
        "revision": curr_rev,  # Stale revision
        "cargo_description": "This edit should fail due to concurrency conflict",
    }
    conflict_res = await async_client.patch(f"/api/v1/bols/{bol_id}", json=conflict_payload)
    assert conflict_res.status_code == 409
    assert "concurrency conflict" in conflict_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_bol_duplicate_endpoint(async_client: AsyncClient):
    """Test fast atomic duplication of a BOL (Section 28)."""
    list_res = await async_client.get("/api/v1/bols", params={"page": 1, "page_size": 1})
    items = list_res.json()["items"]
    source_id = items[0]["id"]

    new_bol_num = f"BOL-CLONE-{source_id[:6].upper()}"
    dup_res = await async_client.post(
        f"/api/v1/bols/{source_id}/duplicate",
        params={"new_bol_number": new_bol_num},
    )
    assert dup_res.status_code == 201, dup_res.text
    dup_data = dup_res.json()["data"]
    assert dup_data["bol_number"] == new_bol_num
    assert dup_data["revision"] == 1
    assert dup_data["id"] != source_id

    # Verify duplicate is retrievable
    get_res = await async_client.get(f"/api/v1/bols/{dup_data['id']}/details")
    assert get_res.status_code == 200
    assert get_res.json()["data"]["bol_number"] == new_bol_num


@pytest.mark.asyncio
async def test_party_search_and_recent_cache(async_client: AsyncClient):
    """Test async searchable party selectors and recent cache (Sections 3, 4, 5)."""
    # 1. Search with query
    search_res = await async_client.get("/api/v1/parties/search", params={"q": "Ahmad", "role": "ALL", "limit": 10})
    assert search_res.status_code == 200
    data = search_res.json()["data"]
    assert isinstance(data, list)

    # 2. Recent parties
    recent_res = await async_client.get("/api/v1/parties/recent")
    assert recent_res.status_code == 200
    assert isinstance(recent_res.json()["data"], list)


@pytest.mark.asyncio
async def test_container_lookup(async_client: AsyncClient):
    """Test indexed container number lookup (Section 30)."""
    # Lookup non-existent container
    res = await async_client.get("/api/v1/containers/lookup", params={"number": "UNKNOWN99999"})
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_server_driven_ledger(async_client: AsyncClient):
    """Test server-driven ledger calculations, exact Decimal totals, and running balances (Sections 32-38, 43-45)."""
    # Query ledger for first page
    res = await async_client.get("/api/v1/ledger", params={"page": 1, "page_size": 25, "currency": "USD"})
    assert res.status_code == 200, res.text
    data = res.json()["data"]

    # Verify summary cards exist and are formatted as strings
    assert "opening_balance" in data
    assert "total_debit" in data
    assert "total_credit" in data
    assert "closing_balance" in data
    assert "items" in data
    assert "total" in data
    assert "pages" in data

    # Verify Accounting Invariance Identity: Closing Balance = Opening Balance + Total Debit - Total Credit
    from decimal import Decimal
    op = Decimal(data["opening_balance"])
    dr = Decimal(data["total_debit"])
    cr = Decimal(data["total_credit"])
    cl = Decimal(data["closing_balance"])
    assert cl == op + dr - cr, f"Invariance broken: {cl} != {op} + {dr} - {cr}"

    # Verify items running balance consistency
    if len(data["items"]) >= 2:
        for idx in range(1, len(data["items"])):
            prev_row = data["items"][idx - 1]
            curr_row = data["items"][idx]
            prev_bal = Decimal(prev_row["balance"])
            curr_dr = Decimal(curr_row["debit"])
            curr_cr = Decimal(curr_row["credit"])
            curr_bal = Decimal(curr_row["balance"])
            assert curr_bal == prev_bal + curr_dr - curr_cr, (
                f"Row {idx} running balance error: {curr_bal} != {prev_bal} + {curr_dr} - {curr_cr}"
            )


@pytest.mark.asyncio
async def test_ledger_search_accounts_and_export(async_client: AsyncClient):
    """Test account selector and server-side CSV export (Sections 40, 50)."""
    # 1. Accounts search
    search_res = await async_client.get("/api/v1/ledger/accounts/search", params={"limit": 10})
    assert search_res.status_code == 200
    accounts = search_res.json()["data"]
    assert isinstance(accounts, list)

    # 2. Server-side CSV Export
    export_payload = {"currency": "USD", "export_format": "csv"}
    exp_res = await async_client.post("/api/v1/ledger/export", json=export_payload)
    assert exp_res.status_code == 200
    assert exp_res.headers["content-type"].startswith("text/csv")
    csv_text = exp_res.text
    assert "Date,Account,Description,Debit,Credit,Balance,Currency" in csv_text
