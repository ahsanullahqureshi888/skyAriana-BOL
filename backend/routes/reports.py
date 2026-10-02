from __future__ import annotations

import datetime
from decimal import Decimal
from typing import Any, Dict, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.schemas.placeholders import (
    APIResponse,
    PaginatedList,
    ReportRequest,
    ReportResponse,
)
from backend.services.cache_service import reports_summary_cache

router = APIRouter(prefix="/reports", tags=["Reports"])

_reports_store: list[dict] = []


@router.get("", response_model=PaginatedList[ReportResponse])
async def list_reports():
    return PaginatedList(
        items=_reports_store,
        total=len(_reports_store),
        page=1,
        page_size=50,
    )


@router.get("/summary", response_model=APIResponse[Dict[str, Any]])
async def get_executive_summary(
    currency: Optional[str] = Query("USD", description="Currency filter (USD or AFN)"),
    db: AsyncSession = Depends(get_db),
):
    """High-speed aggregated executive logistics and financial report with TTL caching (Sections 7, 8)."""
    curr = (currency or "USD").upper()
    cache_key = f"exec_summary:{curr}"
    cached = reports_summary_cache.get(cache_key)
    if cached is not None:
        return APIResponse(success=True, message="Summary retrieved from cache", data=cached)

    # 1. Aggregate BOL metrics in single SQL query
    bol_sql = """
        SELECT
            COUNT(*),
            COALESCE(SUM(carton_count), 0),
            COALESCE(SUM(gross_weight_kg), 0),
            COALESCE(SUM(net_weight_kg), 0),
            COALESCE(SUM(freight_fee), 0),
            COALESCE(SUM(demurrage_fee), 0),
            COALESCE(SUM(documentation_fee), 0)
        FROM bol_records
        WHERE currency = :curr;
    """
    bol_row = (await db.execute(text(bol_sql), {"curr": curr})).one()

    # 2. Aggregate Shipment Status counts
    shp_sql = """
        SELECT
            COUNT(*),
            COALESCE(SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END), 0)
        FROM shipments;
    """
    shp_row = (await db.execute(text(shp_sql))).one()

    # 3. Aggregate Invoices summary
    inv_sql = """
        SELECT
            COUNT(*),
            COALESCE(SUM(total_amount), 0),
            COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN status != 'paid' THEN total_amount ELSE 0 END), 0)
        FROM invoices
        WHERE currency = :curr;
    """
    inv_row = (await db.execute(text(inv_sql), {"curr": curr})).one()

    summary_data = {
        "currency": curr,
        "bol_summary": {
            "total_bols": bol_row[0],
            "total_cartons": int(bol_row[1]),
            "total_gross_weight_kg": round(float(bol_row[2]), 2),
            "total_net_weight_kg": round(float(bol_row[3]), 2),
            "total_freight_fee": round(float(bol_row[4]), 2),
            "total_demurrage_fee": round(float(bol_row[5]), 2),
            "total_documentation_fee": round(float(bol_row[6]), 2),
        },
        "shipment_summary": {
            "total_shipments": shp_row[0],
            "delivered": shp_row[1],
            "in_transit": shp_row[2],
        },
        "invoice_summary": {
            "total_invoices": inv_row[0],
            "total_invoiced_amount": round(float(inv_row[1]), 2),
            "total_collected": round(float(inv_row[2]), 2),
            "outstanding_receivables": round(float(inv_row[3]), 2),
        },
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }

    reports_summary_cache.set(cache_key, summary_data, ttl=60)
    return APIResponse(success=True, message="Executive summary generated successfully", data=summary_data)


@router.post("/generate", response_model=APIResponse[ReportResponse], status_code=status.HTTP_202_ACCEPTED)
async def generate_report(payload: ReportRequest):
    report_id = f"REP-{uuid.uuid4().hex[:8].upper()}"
    record = {
        "report_id": report_id,
        "report_type": payload.report_type,
        "status": "completed",
        "download_url": f"/api/v1/reports/download/{report_id}",
        "summary": {
            "format": payload.format,
            "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        },
    }
    _reports_store.append(record)
    return APIResponse(success=True, message="Report generated successfully", data=record)
