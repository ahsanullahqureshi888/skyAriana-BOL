from __future__ import annotations

import asyncio
from decimal import Decimal
from pathlib import Path
import pytest

from backend.services.documents import (
    BOLDocumentContext,
    BOLPdfService,
    CommercialInvoiceContext,
    CommercialInvoiceService,
    DocumentService,
    ExcelExportService,
    InvoiceLineItem,
    PackingListContext,
    PackingListItem,
    PackingListService,
    PhytoDocumentContext,
    PhytosanitaryService,
    StickerContext,
    StickerService,
    TransitDocumentContext,
    TransitService,
    job_manager,
    sanitize_filename,
)


def test_bol_pdf_generation(tmp_path: Path):
    out_file = tmp_path / "test_bol.pdf"
    ctx = BOLDocumentContext(
        bol_number="BOL-TEST-001",
        shipper_name="Test Shipper LLC",
        consignee_name="Test Consignee Ltd",
        notify_party_name="SAME AS CONSIGNEE",
        transit_border="Islam Qala",
        final_destination="Kabul",
        container_numbers=["MSCU1234567"],
        seal_numbers=["SL-998877"],
        cargo_description="Fresh Fruit Cartons",
        package_count="500 CTNS",
        gross_weight="12,500 KG",
        net_weight="12,000 KG",
        driver_name="Ahmad Khan",
        driver_phone="+93 70 123 4567",
        driver_rent="1,500 USD",
    )
    res = BOLPdfService.generate_bol_pdf(ctx, out_file)

    assert res["success"] is True
    assert out_file.exists()
    assert out_file.stat().st_size > 500
    assert res["file_size"] > 500
    assert len(res["sha256_checksum"]) == 64


def test_invoice_decimal_arithmetic_and_invariance(tmp_path: Path):
    out_file = tmp_path / "test_invoice.pdf"
    items = [
        InvoiceLineItem(description="Item A", quantity=Decimal("100"), unit="CTNS", unit_price=Decimal("12.50")),
        InvoiceLineItem(description="Item B", quantity=Decimal("50"), unit="CTNS", unit_price=Decimal("20.00")),
    ]
    ctx = CommercialInvoiceContext(
        invoice_number="INV-2026-001",
        exporter_name="Sky Ariana Exporter",
        consignee_name="Gulf Trading Co",
        currency="USD",
        items=items,
        discount=Decimal("50.00"),
        tax=Decimal("25.00"),
    )

    subtotal, grand_total = ctx.calculate_totals()
    # Verify mathematical invariance: Subtotal = 100*12.50 + 50*20.00 = 1250 + 1000 = 2250.00
    assert subtotal == Decimal("2250.00")
    # Total = 2250.00 - 50.00 + 25.00 = 2225.00
    assert grand_total == Decimal("2225.00")
    assert subtotal - ctx.discount + ctx.tax == grand_total

    res = CommercialInvoiceService.generate_invoice_pdf(ctx, out_file)
    assert res["success"] is True
    assert out_file.exists()
    assert res["file_size"] > 500


def test_packing_list_generation_and_totals(tmp_path: Path):
    out_file = tmp_path / "test_pl.pdf"
    items = [
        PackingListItem(
            item_no=1,
            container_no="CONT01",
            seal_no="SL01",
            commodity="Fresh Grapes",
            cartons=100,
            gross_weight_kg=Decimal("1050.0"),
            net_weight_kg=Decimal("1000.0"),
        ),
        PackingListItem(
            item_no=2,
            container_no="CONT02",
            seal_no="SL02",
            commodity="Pomegranates",
            cartons=150,
            gross_weight_kg=Decimal("1575.0"),
            net_weight_kg=Decimal("1500.0"),
        ),
    ]
    ctx = PackingListContext(
        packing_list_no="PL-2026-001",
        bol_number="BOL-NSA100",
        shipper_name="Ariana Agro",
        consignee_name="Import Hub",
        items=items,
    )

    res = PackingListService.generate_packing_list_pdf(ctx, out_file)
    assert res["success"] is True
    assert out_file.exists()
    assert res["file_size"] > 500


def test_transit_service(tmp_path: Path):
    out_file = tmp_path / "test_transit.pdf"
    ctx = TransitDocumentContext(
        transit_number="TR-9988",
        bol_number="BOL-NSA100",
        border_customs_station="Torghundi Border",
        carrier_company="Sky Ariana Express",
        driver_name="Mohammad Reza",
        driver_father_name="Abdul Ali",
        truck_number="HR-4567",
        cargo_type="Dry Fruits & Nuts",
    )
    res = TransitService.generate_transit_pdf(ctx, out_file)
    assert res["success"] is True
    assert out_file.exists()


def test_phytosanitary_service(tmp_path: Path):
    out_file = tmp_path / "test_phyto.pdf"
    ctx = PhytoDocumentContext(
        certificate_number="PHYTO-AF-8877",
        bol_number="BOL-NSA100",
        exporter_name="Ariana Fresh Ltd",
        consignee_name="Dubai Imports LLC",
        botanical_name="Prunus dulcis",
        commodity_name="Afghan Green Raisins & Almonds",
        gross_weight="24,000 KG",
    )
    res = PhytosanitaryService.generate_phyto_pdf(ctx, out_file)
    assert res["success"] is True
    assert out_file.exists()


def test_sticker_service_batch(tmp_path: Path):
    out_file = tmp_path / "test_stickers.pdf"
    ctx = StickerContext(
        bol_number="BOL-NSA100",
        shipper_name="Sky Ariana Ltd",
        consignee_name="Kabul Express Supermarket",
        destination="Kabul",
        commodity="Canned Olives & Oil",
        total_labels=12,
        container_number="MSCU7766554",
    )
    res = StickerService.generate_stickers_pdf(ctx, out_file)
    assert res["success"] is True
    assert out_file.exists()
    assert res["file_size"] > 500


def test_excel_export_streaming(tmp_path: Path):
    out_file = tmp_path / "test_export.xlsx"
    rows = [
        {"Container": f"CONT-{i:04d}", "Revenue": 2500 + i, "Cost": 1800 + i, "Profit": 700}
        for i in range(100)
    ]
    res = DocumentService.export_excel(
        rows=rows,
        filename="test_export.xlsx",
        sheet_title="Containers",
        title="EXECUTIVE FREIGHT AUDIT",
    )
    assert res["success"] is True
    assert Path(res["file_path"]).exists()
    assert res["total_rows"] == 100
    assert len(res["sha256"]) == 64


def test_document_service_path_traversal_blocking():
    assert sanitize_filename("../../etc/passwd") == "_.._etc_passwd"
    # Ensure illegal windows characters are stripped/replaced
    clean = sanitize_filename('test:file*name?.pdf')
    assert ":" not in clean and "*" not in clean and "?" not in clean


@pytest.mark.asyncio
async def test_job_service_deduplication():
    def mock_work(ctx):
        return {"status": "ok"}

    job1 = await job_manager.submit_job("BOL", mock_work, {}, dedup_key="test_dup_1")
    assert job1.status in ("queued", "processing", "completed")

    # Second submission with same dedup_key should return existing job
    job2 = await job_manager.submit_job("BOL", mock_work, {}, dedup_key="test_dup_1")
    assert job1.job_id == job2.job_id
