import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_bol_endpoints(async_client: AsyncClient):
    """Test BOL creation, listing, duplicate conflict, and retrieval."""
    bol_payload = {
        "bol_number": "BOL-2026-TEST-001",
        "origin": "Islam Qala Border Station",
        "border_station": "Islam Qala",
        "driver_name": "Ahmadullah Khan",
        "father_name": "Mohammad Khan",
        "driver_rent": 1250.0,
        "carton_count": 450,
        "gross_weight_kg": 9800.5,
        "net_weight_kg": 9200.0,
        "cargo_description": "Commercial electronics and textiles",
        "destination": "Kabul Central Hub",
        "status": "in_transit",
    }

    # 1. Create BOL with fee segregation
    bol_payload["freight_fee"] = 1500.0
    bol_payload["demurrage_fee"] = 200.0
    bol_payload["documentation_fee"] = 75.0
    bol_payload["currency"] = "USD"
    bol_payload["exchange_rate"] = 1.0

    res = await async_client.post("/api/v1/bols", json=bol_payload)
    assert res.status_code == 201, res.text
    created = res.json()["data"]
    assert created["bol_number"] == bol_payload["bol_number"]
    assert created["driver_name"] == bol_payload["driver_name"]
    assert created["driver_rent"] == 1250.0
    assert created["freight_fee"] == 1500.0
    assert created["demurrage_fee"] == 200.0
    assert created["documentation_fee"] == 75.0

    # 2. Duplicate conflict
    conflict_res = await async_client.post("/api/v1/bols", json=bol_payload)
    assert conflict_res.status_code == 409

    # 3. Get BOL
    get_res = await async_client.get(f"/api/v1/bols/{bol_payload['bol_number']}")
    assert get_res.status_code == 200
    assert get_res.json()["data"]["bol_number"] == bol_payload["bol_number"]

    # 4. List BOLs
    list_res = await async_client.get("/api/v1/bols", params={"search": "Ahmadullah"})
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 1


@pytest.mark.asyncio
async def test_ledger_endpoints_and_accounting_invariance(async_client: AsyncClient):
    """Verify ledger operations, fee types, and Accounting Invariance Identity: Net Balance = Total Debit - Total Credit."""
    account_id = "ACC-AFG-999"

    # Insert later transaction first, then earlier transaction (testing chronological sequencing)
    entry2 = {
        "account_id": account_id,
        "account_name": "Kabul Transit Logistics",
        "transaction_date": "2026-09-02T14:30:00Z",
        "description": "Partial payment received",
        "debit": 0.0,
        "credit": 2000.0,
        "balance": 3000.0,
        "currency": "USD",
        "fee_type": "freight",
        "exchange_rate": 1.0,
    }
    entry1 = {
        "account_id": account_id,
        "account_name": "Kabul Transit Logistics",
        "transaction_date": "2026-09-01T10:00:00Z",
        "description": "Freight charges for shipment BOL-101",
        "debit": 5000.0,
        "credit": 0.0,
        "balance": 5000.0,
        "currency": "USD",
        "fee_type": "freight",
        "exchange_rate": 1.0,
    }

    # Post entries out of chronological insertion order
    res2 = await async_client.post("/api/v1/ledgers", json=entry2)
    assert res2.status_code == 201

    res1 = await async_client.post("/api/v1/ledgers", json=entry1)
    assert res1.status_code == 201

    # Invariance Check: Total Debit (5000) - Total Credit (2000) = Net Balance (3000)
    # The endpoint must sort chronologically by transaction_date so recorded_balance is 3000 (from 2026-09-02)
    audit_res = await async_client.get(f"/api/v1/ledgers/invariance-check/{account_id}")
    assert audit_res.status_code == 200
    audit_data = audit_res.json()["data"]
    assert audit_data["total_debit"] == 5000.0
    assert audit_data["total_credit"] == 2000.0
    assert audit_data["calculated_net_balance"] == 3000.0
    assert audit_data["recorded_balance"] == 3000.0
    assert audit_data["is_valid"] is True


@pytest.mark.asyncio
async def test_companies_and_customers(async_client: AsyncClient):
    """Verify company and customer endpoints."""
    company_payload = {
        "company_name": "Aryana Global Logistics LLC",
        "code": "AGL-KBL",
        "tax_number": "TIN-987654321",
        "contact_phone": "+93-700-112233",
        "contact_email": "ops@aryanalogistics.af",
        "address": "Jalalabad Road, Industrial Park, Kabul",
    }
    comp_res = await async_client.post("/api/v1/companies", json=company_payload)
    assert comp_res.status_code == 201
    assert comp_res.json()["data"]["code"] == "AGL-KBL"

    cust_payload = {
        "customer_name": "Zia Rahman Trading",
        "phone": "+93-799-554433",
        "company": "Aryana Global Logistics LLC",
        "email": "zia@trading.af",
        "address": "Shahr-e-Naw, Kabul",
    }
    cust_res = await async_client.post("/api/v1/customers", json=cust_payload)
    assert cust_res.status_code == 201
    assert cust_res.json()["data"]["customer_name"] == "Zia Rahman Trading"


@pytest.mark.asyncio
async def test_shipments_reports_backups(async_client: AsyncClient):
    """Verify shipments, reports, and backups endpoints."""
    # Shipment
    trk_id = f"TRK-2026-{uuid.uuid4().hex[:6]}"
    ship_payload = {
        "tracking_number": trk_id,
        "bol_number": "BOL-2026-TEST-001",
        "origin": "Torghundi Border",
        "destination": "Herat Logistics Hub",
        "status": "in_transit",
        "carrier": "Afghan National Transport",
    }
    ship_res = await async_client.post("/api/v1/shipments", json=ship_payload)
    assert ship_res.status_code == 201
    assert ship_res.json()["data"]["tracking_number"] == trk_id

    # Report
    rep_payload = {"report_type": "ledger_summary", "format": "excel"}
    rep_res = await async_client.post("/api/v1/reports/generate", json=rep_payload)
    assert rep_res.status_code == 202
    assert rep_res.json()["data"]["status"] == "completed"

    # Backup
    bak_payload = {"note": "Automated snapshot prior to test", "include_documents": False}
    bak_res = await async_client.post("/api/v1/backups/create", json=bak_payload)
    assert bak_res.status_code == 201
    assert "backup_id" in bak_res.json()["data"]
