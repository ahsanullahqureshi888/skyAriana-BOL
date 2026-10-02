"""FastAPI Document Generation & Streaming Routes.

Provides endpoints for on-demand synchronous and background asynchronous PDF and Excel generation.
Secures local files against path traversal and streams documents with standard HTTP cache headers.
"""

from __future__ import annotations

import os
from decimal import Decimal
from pathlib import Path
from typing import Any, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.schemas.bol import DocumentMetadataSchema
from backend.schemas.placeholders import APIResponse, PaginatedList
from backend.services.documents import (
    BOLDocumentContext,
    CommercialInvoiceContext,
    DocumentService,
    InvoiceLineItem,
    PackingListContext,
    PackingListItem,
    PhytoDocumentContext,
    StickerContext,
    TransitDocumentContext,
    job_manager,
    sanitize_filename,
)

router = APIRouter(prefix="/documents", tags=["Documents & Reports"])
jobs_router = APIRouter(prefix="/jobs", tags=["Background Jobs"])


@router.get("", response_model=PaginatedList[DocumentMetadataSchema])
async def list_documents(
    q: Optional[str] = Query(None, description="Search document title or filename"),
    document_type: Optional[str] = Query(None, description="Filter by type (bol_scan, invoice_pdf, etc.)"),
    bol_id: Optional[str] = Query(None, description="Filter by linked BOL ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve lightweight document metadata list with server-side pagination (Sections 5, 6).
    
    Excludes heavy extracted_text and binary payloads for rapid response (<10ms).
    """
    page = max(1, page)
    page_size = max(1, min(page_size, 100))
    offset = (page - 1) * page_size

    where_clauses = []
    params: dict[str, Any] = {}

    if document_type:
        where_clauses.append("document_type = :doc_type")
        params["doc_type"] = document_type
    if bol_id:
        where_clauses.append("bol_id = :bol_id")
        params["bol_id"] = bol_id
    if q and q.strip():
        where_clauses.append("(title LIKE :q OR file_path LIKE :q)")
        params["q"] = f"%{q.strip()}%"

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    count_sql = f"SELECT COUNT(*) FROM documents {where_sql}"
    total = (await db.execute(text(count_sql), params)).scalar() or 0

    list_sql = f"""
        SELECT id, title, document_type, file_size, mime_type, created_at
        FROM documents
        {where_sql}
        ORDER BY created_at DESC, id DESC
        LIMIT :limit OFFSET :offset
    """
    params["limit"] = page_size
    params["offset"] = offset

    rows = (await db.execute(text(list_sql), params)).all()
    items = [
        DocumentMetadataSchema(
            id=r[0],
            title=r[1] or "",
            document_type=r[2] or "document",
            file_size_bytes=r[3] or 0,
            mime_type=r[4] or "application/pdf",
            created_at=str(r[5]) if r[5] else None,
        )
        for r in rows
    ]

    return PaginatedList(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


# -----------------------------------------------------------------------------
# Request Schemas
# -----------------------------------------------------------------------------


class BOLGenerateRequest(BaseModel):
    bol_number: str
    issue_date: str = ""
    place_of_issue: str = "Kabul, Afghanistan"
    shipper_name: str = ""
    shipper_address: str = ""
    shipper_phone: str = ""
    consignee_name: str = ""
    consignee_address: str = ""
    consignee_phone: str = ""
    notify_party_name: str = "SAME AS CONSIGNEE"
    notify_party_address: str = ""
    vessel_truck_details: str = ""
    port_of_loading: str = ""
    port_of_discharge: str = ""
    transit_border: str = "Islam Qala / Torghundi"
    final_destination: str = ""
    container_numbers: list[str] = Field(default_factory=list)
    seal_numbers: list[str] = Field(default_factory=list)
    cargo_description: str = ""
    package_count: str = ""
    gross_weight: str = ""
    net_weight: str = ""
    freight_terms: str = "FREIGHT PREPAID"
    driver_name: str = ""
    driver_phone: str = ""
    driver_rent: str = ""
    remarks: str = ""
    async_job: bool = False


class InvoiceItemSchema(BaseModel):
    description: str
    quantity: float
    unit: str = "CTNS"
    unit_price: float
    amount: float = 0.0


class InvoiceGenerateRequest(BaseModel):
    invoice_number: str
    invoice_date: str = ""
    bol_number: str = ""
    currency: str = "USD"
    exporter_name: str = ""
    exporter_address: str = ""
    consignee_name: str = ""
    consignee_address: str = ""
    notify_party: str = "SAME AS CONSIGNEE"
    country_of_origin: str = "AFGHANISTAN"
    country_of_destination: str = "INDIA / UAE"
    port_of_loading: str = "BANDAR ABBAS / ISLAM QALA"
    port_of_discharge: str = "NHAVA SHEVA / JEBEL ALI"
    payment_terms: str = "T/T (TELEGRAPHIC TRANSFER)"
    items: list[InvoiceItemSchema] = Field(default_factory=list)
    discount: float = 0.0
    tax: float = 0.0
    bank_details: str = "BANK ALFALAH / DA AFGHANISTAN BANK"
    remarks: str = ""
    async_job: bool = False


class PackingListGenerateRequest(BaseModel):
    packing_list_no: str
    date: str = ""
    bol_number: str = ""
    invoice_number: str = ""
    shipper_name: str = ""
    consignee_name: str = ""
    port_of_loading: str = "BANDAR ABBAS / ISLAM QALA"
    port_of_discharge: str = "NHAVA SHEVA / JEBEL ALI"
    items: list[dict[str, Any]] = Field(default_factory=list)
    remarks: str = ""
    async_job: bool = False


class TransitGenerateRequest(BaseModel):
    transit_number: str
    issue_date: str = ""
    bol_number: str = ""
    truck_number: str = ""
    driver_name: str = ""
    driver_father_name: str = ""
    driver_license_passport: str = ""
    driver_phone: str = ""
    origin_city: str = "Kabul"
    destination_city: str = "Bandar Abbas"
    border_customs_station: str = "Islam Qala"
    container_number: str = ""
    seal_number: str = ""
    cargo_type: str = "Dry Fruits / Raisins"
    package_quantity: str = "2200 CTNS"
    net_weight: str = "22,000 KGS"
    gross_weight: str = "22,500 KGS"
    customs_declaration_no: str = ""
    carrier_company: str = "Sky Ariana Limited"
    remarks: str = ""
    async_job: bool = False


class PhytoGenerateRequest(BaseModel):
    certificate_number: str
    issue_date: str = ""
    bol_number: str = ""
    exporter_name: str = ""
    exporter_address: str = ""
    consignee_name: str = ""
    consignee_address: str = ""
    country_of_origin: str = "AFGHANISTAN"
    country_of_destination: str = "INDIA / UAE"
    point_of_entry: str = "NHAVA SHEVA / JEBEL ALI"
    commodity_name: str = "Dried Figs (Ficus carica)"
    botanical_name: str = "Ficus carica L."
    package_count: str = "2200 CARTONS"
    gross_weight: str = "22,500 KGS"
    net_weight: str = "22,000 KGS"
    treatment_type: str = "Methyl Bromide Fumigation"
    treatment_duration_temp: str = "24 Hours at 21°C"
    chemical_concentration: str = "48 g/m³"
    inspection_date: str = ""
    remarks: str = ""
    async_job: bool = False


class StickersGenerateRequest(BaseModel):
    bol_number: str
    shipper_name: str
    consignee_name: str
    commodity: str
    container_number: str = ""
    gross_weight: str = ""
    destination: str = "INDIA / UAE"
    total_labels: int = 100
    async_job: bool = False


class ExcelExportRequest(BaseModel):
    account_name: str
    currency: str = "USD"
    opening_balance: float = 0.0
    entries: list[dict[str, Any]] = Field(default_factory=list)
    async_job: bool = False


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------


@router.post("/bol", response_model=APIResponse[dict[str, Any]])
async def generate_bol_document(req: BOLGenerateRequest):
    ctx = BOLDocumentContext(
        bol_number=req.bol_number,
        issue_date=req.issue_date,
        place_of_issue=req.place_of_issue,
        shipper_name=req.shipper_name,
        shipper_address=req.shipper_address,
        shipper_phone=req.shipper_phone,
        consignee_name=req.consignee_name,
        consignee_address=req.consignee_address,
        consignee_phone=req.consignee_phone,
        notify_party_name=req.notify_party_name,
        notify_party_address=req.notify_party_address,
        vessel_truck_details=req.vessel_truck_details,
        port_of_loading=req.port_of_loading,
        port_of_discharge=req.port_of_discharge,
        transit_border=req.transit_border,
        final_destination=req.final_destination,
        container_numbers=req.container_numbers,
        seal_numbers=req.seal_numbers,
        cargo_description=req.cargo_description,
        package_count=req.package_count,
        gross_weight=req.gross_weight,
        net_weight=req.net_weight,
        freight_terms=req.freight_terms,
        driver_name=req.driver_name,
        driver_phone=req.driver_phone,
        driver_rent=req.driver_rent,
        remarks=req.remarks,
    )

    if req.async_job:
        job = await job_manager.submit_job(
            doc_type="BOL",
            work_fn=DocumentService.generate_bol,
            context=ctx,
            dedup_key=f"bol:{req.bol_number}",
        )
        return APIResponse(
            success=True,
            message="BOL generation job queued",
            data={"job_id": job.job_id, "status": job.status},
        )

    res = DocumentService.generate_bol(ctx)
    res["download_url"] = f"/api/v1/documents/bol/{res['filename']}"
    return APIResponse(success=True, message="BOL generated successfully", data=res)


@router.post("/invoice", response_model=APIResponse[dict[str, Any]])
async def generate_invoice_document(req: InvoiceGenerateRequest):
    line_items = [
        InvoiceLineItem(
            description=item.description,
            quantity=Decimal(str(item.quantity)),
            unit=item.unit,
            unit_price=Decimal(str(item.unit_price)),
            amount=Decimal(str(item.amount)) if item.amount else Decimal("0.00"),
        )
        for item in req.items
    ]

    ctx = CommercialInvoiceContext(
        invoice_number=req.invoice_number,
        invoice_date=req.invoice_date,
        bol_number=req.bol_number,
        currency=req.currency,
        exporter_name=req.exporter_name,
        exporter_address=req.exporter_address,
        consignee_name=req.consignee_name,
        consignee_address=req.consignee_address,
        notify_party=req.notify_party,
        country_of_origin=req.country_of_origin,
        country_of_destination=req.country_of_destination,
        port_of_loading=req.port_of_loading,
        port_of_discharge=req.port_of_discharge,
        payment_terms=req.payment_terms,
        items=line_items,
        discount=Decimal(str(req.discount)),
        tax=Decimal(str(req.tax)),
        bank_details=req.bank_details,
        remarks=req.remarks,
    )

    if req.async_job:
        job = await job_manager.submit_job(
            doc_type="INVOICE",
            work_fn=DocumentService.generate_commercial_invoice,
            context=ctx,
            dedup_key=f"inv:{req.invoice_number}",
        )
        return APIResponse(
            success=True,
            message="Invoice generation job queued",
            data={"job_id": job.job_id, "status": job.status},
        )

    res = DocumentService.generate_commercial_invoice(ctx)
    res["download_url"] = f"/api/v1/documents/invoice/{res['filename']}"
    return APIResponse(success=True, message="Invoice generated successfully", data=res)


@router.post("/packing-list", response_model=APIResponse[dict[str, Any]])
async def generate_packing_list_document(req: PackingListGenerateRequest):
    items = []
    for idx, it in enumerate(req.items, start=1):
        items.append(
            PackingListItem(
                item_no=it.get("item_no", idx),
                container_no=it.get("container_no", "1X40' HC"),
                seal_no=it.get("seal_no", "SEALED"),
                commodity=it.get("commodity", "General Dry Cargo"),
                cartons=int(it.get("cartons", 0)),
                gross_weight_kg=Decimal(str(it.get("gross_weight_kg", 0))),
                net_weight_kg=Decimal(str(it.get("net_weight_kg", 0))),
                marks=it.get("marks", "N/M"),
            )
        )

    ctx = PackingListContext(
        packing_list_no=req.packing_list_no,
        date=req.date,
        bol_number=req.bol_number,
        invoice_number=req.invoice_number,
        shipper_name=req.shipper_name,
        consignee_name=req.consignee_name,
        port_of_loading=req.port_of_loading,
        port_of_discharge=req.port_of_discharge,
        items=items,
        remarks=req.remarks,
    )

    if req.async_job:
        job = await job_manager.submit_job(
            doc_type="PACKING_LIST",
            work_fn=DocumentService.generate_packing_list,
            context=ctx,
            dedup_key=f"pl:{req.packing_list_no}",
        )
        return APIResponse(
            success=True,
            message="Packing list job queued",
            data={"job_id": job.job_id, "status": job.status},
        )

    res = DocumentService.generate_packing_list(ctx)
    res["download_url"] = f"/api/v1/documents/packing_list/{res['filename']}"
    return APIResponse(success=True, message="Packing List generated successfully", data=res)


@router.post("/transit", response_model=APIResponse[dict[str, Any]])
async def generate_transit_document(req: TransitGenerateRequest):
    ctx = TransitDocumentContext(
        transit_number=req.transit_number,
        issue_date=req.issue_date,
        bol_number=req.bol_number,
        truck_number=req.truck_number,
        driver_name=req.driver_name,
        driver_father_name=req.driver_father_name,
        driver_license_passport=req.driver_license_passport,
        driver_phone=req.driver_phone,
        origin_city=req.origin_city,
        destination_city=req.destination_city,
        border_customs_station=req.border_customs_station,
        container_number=req.container_number,
        seal_number=req.seal_number,
        cargo_type=req.cargo_type,
        package_quantity=req.package_quantity,
        net_weight=req.net_weight,
        gross_weight=req.gross_weight,
        customs_declaration_no=req.customs_declaration_no,
        carrier_company=req.carrier_company,
        remarks=req.remarks,
    )

    if req.async_job:
        job = await job_manager.submit_job(
            doc_type="TRANSIT",
            work_fn=DocumentService.generate_transit_permit,
            context=ctx,
            dedup_key=f"tr:{req.transit_number}",
        )
        return APIResponse(
            success=True,
            message="Transit paper job queued",
            data={"job_id": job.job_id, "status": job.status},
        )

    res = DocumentService.generate_transit_permit(ctx)
    res["download_url"] = f"/api/v1/documents/transit/{res['filename']}"
    return APIResponse(success=True, message="Transit document generated successfully", data=res)


@router.post("/phytosanitary", response_model=APIResponse[dict[str, Any]])
async def generate_phyto_document(req: PhytoGenerateRequest):
    ctx = PhytoDocumentContext(
        certificate_number=req.certificate_number,
        issue_date=req.issue_date,
        bol_number=req.bol_number,
        exporter_name=req.exporter_name,
        exporter_address=req.exporter_address,
        consignee_name=req.consignee_name,
        consignee_address=req.consignee_address,
        country_of_origin=req.country_of_origin,
        country_of_destination=req.country_of_destination,
        point_of_entry=req.point_of_entry,
        commodity_name=req.commodity_name,
        botanical_name=req.botanical_name,
        package_count=req.package_count,
        gross_weight=req.gross_weight,
        net_weight=req.net_weight,
        treatment_type=req.treatment_type,
        treatment_duration_temp=req.treatment_duration_temp,
        chemical_concentration=req.chemical_concentration,
        inspection_date=req.inspection_date,
        remarks=req.remarks,
    )

    if req.async_job:
        job = await job_manager.submit_job(
            doc_type="PHYTO",
            work_fn=DocumentService.generate_phytosanitary,
            context=ctx,
            dedup_key=f"phyto:{req.certificate_number}",
        )
        return APIResponse(
            success=True,
            message="Phyto document job queued",
            data={"job_id": job.job_id, "status": job.status},
        )

    res = DocumentService.generate_phytosanitary(ctx)
    res["download_url"] = f"/api/v1/documents/phytosanitary/{res['filename']}"
    return APIResponse(success=True, message="Phytosanitary certificate generated successfully", data=res)


@router.post("/stickers", response_model=APIResponse[dict[str, Any]])
async def generate_stickers_document(req: StickersGenerateRequest):
    ctx = StickerContext(
        bol_number=req.bol_number,
        shipper_name=req.shipper_name,
        consignee_name=req.consignee_name,
        commodity=req.commodity,
        container_number=req.container_number,
        gross_weight=req.gross_weight,
        destination=req.destination,
        total_labels=req.total_labels,
    )

    if req.async_job:
        job = await job_manager.submit_job(
            doc_type="STICKERS",
            work_fn=DocumentService.generate_stickers,
            context=ctx,
            dedup_key=f"stk:{req.bol_number}:{req.total_labels}",
        )
        return APIResponse(
            success=True,
            message="Stickers job queued",
            data={"job_id": job.job_id, "status": job.status},
        )

    res = DocumentService.generate_stickers(ctx)
    res["download_url"] = f"/api/v1/documents/stickers/{res['filename']}"
    return APIResponse(success=True, message="Stickers generated successfully", data=res)


@router.post("/excel-export", response_model=APIResponse[dict[str, Any]])
async def export_excel_document(req: ExcelExportRequest):
    if req.async_job or len(req.entries) > 2000:
        job = await job_manager.submit_job(
            doc_type="EXCEL",
            work_fn=DocumentService.export_excel_report,
            account_name=req.account_name,
            currency=req.currency,
            opening_balance=Decimal(str(req.opening_balance)),
            entries=req.entries,
            dedup_key=f"excel:{req.account_name}:{len(req.entries)}",
        )
        return APIResponse(
            success=True,
            message="Excel export background job started",
            data={"job_id": job.job_id, "status": job.status},
        )

    res = DocumentService.export_excel_report(
        account_name=req.account_name,
        currency=req.currency,
        opening_balance=Decimal(str(req.opening_balance)),
        entries=req.entries,
    )
    res["download_url"] = f"/api/v1/documents/report/{res['filename']}"
    return APIResponse(success=True, message="Excel report generated successfully", data=res)


# -----------------------------------------------------------------------------
# Streaming & Download with Path Traversal Protection
# -----------------------------------------------------------------------------


@router.get("/{category}/{filename}")
async def download_document_file(category: str, filename: str):
    """Safely stream a generated PDF or Excel file with security validation."""
    clean_cat = category.strip().lower()
    clean_name = sanitize_filename(filename)

    category_dir = DocumentService.get_category_dir(clean_cat)
    target_path = (category_dir / clean_name).resolve()

    # Path traversal check: Must be inside category_dir
    if not str(target_path).startswith(str(category_dir.resolve())):
        raise HTTPException(status_code=403, detail="Access denied: path traversal detected.")

    if not target_path.is_file():
        raise HTTPException(status_code=404, detail="Requested document not found.")

    media_type = "application/pdf"
    if clean_name.endswith(".xlsx"):
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    return FileResponse(
        path=target_path,
        media_type=media_type,
        filename=clean_name,
        headers={
            "Cache-Control": "public, max-age=3600, immutable",
            "X-Content-Type-Options": "nosniff",
        },
    )


# -----------------------------------------------------------------------------
# Job Status Route
# -----------------------------------------------------------------------------


@jobs_router.get("/{job_id}", response_model=APIResponse[dict[str, Any]])
async def get_document_job_status(job_id: str):
    """Retrieve the progress and outcome of an asynchronous document job."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job ID not found or expired.")

    data: dict[str, Any] = {
        "job_id": job.job_id,
        "doc_type": job.doc_type,
        "status": job.status,
        "progress": job.progress,
        "created_at": job.created_at,
        "completed_at": job.completed_at,
    }

    if job.status == "completed" and job.result:
        data["result"] = job.result
        # Provide clean download link
        if "filename" in job.result:
            cat = job.doc_type.lower()
            data["download_url"] = f"/api/v1/documents/{cat}/{job.result['filename']}"
    elif job.status == "failed":
        data["error"] = job.error_message

    return APIResponse(success=True, message="Job status retrieved", data=data)
