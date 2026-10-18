import sys
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import time
import tracemalloc
from decimal import Decimal

from backend.services.documents import (
    BOLDocumentContext,
    BOLPdfService,
    CommercialInvoiceContext,
    CommercialInvoiceService,
    PackingListContext,
    PackingListItem,
    PackingListService,
    TransitDocumentContext,
    TransitService,
    PhytoDocumentContext,
    PhytosanitaryService,
    StickerContext,
    StickerService,
    ExcelExportService,
    DocumentService,
    ReportService,
    ReportFilterCriteria,
    InvoiceLineItem,
)

def benchmark_all():
    tmp_dir = Path("scratch/benchmarks")
    tmp_dir.mkdir(parents=True, exist_ok=True)
    results = {}

    # 1. Reports (Server-side aggregation & KPI calculation)
    sample_rows = [
        {"container_number": f"C-{i}", "debit": 2500, "credit": 1200, "cartons": 10, "status": "Cleared"}
        for i in range(1000)
    ]
    t0 = time.perf_counter()
    report_res = ReportService.aggregate_metrics(sample_rows)
    t1 = time.perf_counter()
    results["Reports Aggregation (1,000 records)"] = {
        "time_ms": round((t1 - t0) * 1000, 2),
        "total_debit": str(report_res.total_debit),
        "total_credit": str(report_res.total_credit),
        "net_balance": str(report_res.net_balance),
    }

    # 2. BOL PDF Generation
    bol_ctx = BOLDocumentContext(
        bol_number="BOL-BENCH-001",
        shipper_name="Sky Ariana Global",
        consignee_name="Kabul Imports Co",
        transit_border="Islam Qala",
        container_numbers=["MSCU1122334"],
        seal_numbers=["SL-100200"],
        cargo_description="Dry Fruits Cartons",
        package_count="1,000 CTNS",
        gross_weight="25,000 KG",
        net_weight="24,000 KG",
        driver_name="Ahmad Shah",
        driver_rent="1,800 USD",
    )
    t0 = time.perf_counter()
    bol_res = BOLPdfService.generate_bol_pdf(bol_ctx, tmp_dir / "bench_bol.pdf")
    t1 = time.perf_counter()
    results["BOL PDF Generation"] = {
        "time_ms": round((t1 - t0) * 1000, 2),
        "file_size_bytes": bol_res["file_size"],
    }

    # 3. Commercial Invoice Generation
    inv_items = [
        InvoiceLineItem(description=f"Commodity Lot #{i}", quantity=Decimal("100"), unit_price=Decimal("15.50"))
        for i in range(5)
    ]
    inv_ctx = CommercialInvoiceContext(
        invoice_number="INV-BENCH-001",
        exporter_name="Sky Ariana Exporter",
        consignee_name="Dubai Trading Ltd",
        items=inv_items,
    )
    t0 = time.perf_counter()
    inv_res = CommercialInvoiceService.generate_invoice_pdf(inv_ctx, tmp_dir / "bench_inv.pdf")
    t1 = time.perf_counter()
    results["Commercial Invoice Generation"] = {
        "time_ms": round((t1 - t0) * 1000, 2),
        "file_size_bytes": inv_res["file_size"],
    }

    # 4. Packing List Generation
    pl_items = [
        PackingListItem(
            item_no=i+1,
            container_no=f"MSCU{i:05d}",
            seal_no=f"SL{i:05d}",
            commodity="Fresh Grapes",
            cartons=200,
            gross_weight_kg=Decimal("2100.0"),
            net_weight_kg=Decimal("2000.0")
        )
        for i in range(4)
    ]
    pl_ctx = PackingListContext(
        packing_list_no="PL-BENCH-001",
        shipper_name="Ariana Agro",
        consignee_name="Import Center",
        items=pl_items,
    )
    t0 = time.perf_counter()
    pl_res = PackingListService.generate_packing_list_pdf(pl_ctx, tmp_dir / "bench_pl.pdf")
    t1 = time.perf_counter()
    results["Packing List Generation"] = {
        "time_ms": round((t1 - t0) * 1000, 2),
        "file_size_bytes": pl_res["file_size"],
    }

    # 5. Transit Paper Generation
    tr_ctx = TransitDocumentContext(
        transit_number="TR-BENCH-001",
        border_customs_station="Torghundi",
        driver_name="Mohammad Reza",
        driver_father_name="Abdul Ali",
        truck_number="AFG-12345",
        cargo_type="Raisins & Pistachios",
    )
    t0 = time.perf_counter()
    tr_res = TransitService.generate_transit_pdf(tr_ctx, tmp_dir / "bench_tr.pdf")
    t1 = time.perf_counter()
    results["Transit Paper Generation"] = {
        "time_ms": round((t1 - t0) * 1000, 2),
        "file_size_bytes": tr_res["file_size"],
    }

    # 6. Phytosanitary Certificate Generation
    phyto_ctx = PhytoDocumentContext(
        certificate_number="PHYTO-BENCH-001",
        exporter_name="Ariana Fresh Ltd",
        consignee_name="Gulf Importers",
        botanical_name="Prunus dulcis",
        commodity_name="Afghan Almonds",
        gross_weight="22,000 KG",
    )
    t0 = time.perf_counter()
    phyto_res = PhytosanitaryService.generate_phyto_pdf(phyto_ctx, tmp_dir / "bench_phyto.pdf")
    t1 = time.perf_counter()
    results["Phytosanitary Certificate Generation"] = {
        "time_ms": round((t1 - t0) * 1000, 2),
        "file_size_bytes": phyto_res["file_size"],
    }

    # 7. Stickers / Labels Batch (100 labels)
    sticker_ctx = StickerContext(
        bol_number="BOL-BENCH-001",
        shipper_name="Sky Ariana Ltd",
        consignee_name="Supermarket Hub",
        destination="Kabul",
        commodity="Canned Goods",
        total_labels=100,
    )
    t0 = time.perf_counter()
    stk_res = StickerService.generate_stickers_pdf(sticker_ctx, tmp_dir / "bench_stickers.pdf")
    t1 = time.perf_counter()
    results["Stickers / Labels (100 labels)"] = {
        "time_ms": round((t1 - t0) * 1000, 2),
        "file_size_bytes": stk_res["file_size"],
    }

    # 8. Excel Streaming Export (1,000 rows)
    rows = [
        {"Container": f"C-{i:04d}", "Revenue": 2500, "Cost": 1500, "Profit": 1000, "Status": "Delivered"}
        for i in range(1000)
    ]
    t0 = time.perf_counter()
    xl_res = DocumentService.export_excel(rows, "bench_excel.xlsx", "Containers")
    t1 = time.perf_counter()
    results["Excel Export (1,000 rows)"] = {
        "time_ms": round((t1 - t0) * 1000, 2),
        "file_size_bytes": xl_res["file_size"],
    }

    # 9. Document Storage Cache Hit / Fast Retrieval
    t0 = time.perf_counter()
    cached_path = DocumentService.find_cached_document("bol", "BOL_BOL-BENCH-001_v1.pdf")
    t1 = time.perf_counter()
    results["Document Cache Hit Check"] = {
        "time_ms": round((t1 - t0) * 1000, 4),
        "cached": cached_path is not None,
    }

    # 10. Memory Overhead Profile
    tracemalloc.start()
    _ = BOLPdfService.generate_bol_pdf(bol_ctx, tmp_dir / "bench_mem.pdf")
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    results["Peak PDF Memory Usage"] = {
        "peak_kb": round(peak / 1024, 2),
    }

    for k, v in results.items():
        print(f"[{k}] -> {v}")

if __name__ == "__main__":
    benchmark_all()
