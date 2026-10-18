"""Master Document Management & Storage Service.

Coordinates document generation across sub-services, manages structured disk storage,
enforces Windows-safe filename sanitization, SHA-256 checksums, versioning,
and instant cache re-use for un-modified revisions.
"""

from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import Any

from backend.config import settings
from backend.services.documents.bol_pdf_service import BOLDocumentContext, BOLPdfService
from backend.services.documents.excel_service import ExcelExportService
from backend.services.documents.invoice_service import (
    CommercialInvoiceContext,
    CommercialInvoiceService,
)
from backend.services.documents.job_service import job_manager
from backend.services.documents.packing_list_service import (
    PackingListContext,
    PackingListService,
)
from backend.services.documents.phytosanitary_service import (
    PhytoDocumentContext,
    PhytosanitaryService,
)
from backend.services.documents.report_service import (
    ReportFilterCriteria,
    ReportService,
)
from backend.services.documents.sticker_service import StickerContext, StickerService

_ILLEGAL_WIN_CHARS = re.compile(r'[\\/:*?"<>|\r\n\t]+')


def sanitize_filename(name: str, fallback: str = "document") -> str:
    """Sanitize filename to prevent illegal Windows characters and path traversal."""
    cleaned = _ILLEGAL_WIN_CHARS.sub("_", name).strip(". ")
    return cleaned if cleaned else fallback


class DocumentService:
    """Master document coordinator and storage registry."""

    @classmethod
    def get_documents_base_dir(cls) -> Path:
        """Resolve root documents directory inside application data storage."""
        base_dir = settings.resolved_data_dir / "Documents"
        base_dir.mkdir(parents=True, exist_ok=True)
        return base_dir

    @classmethod
    def get_category_dir(cls, category: str) -> Path:
        """Resolve category-specific storage directory."""
        cat_map = {
            "bol": "BOL",
            "invoice": "Invoice",
            "packing_list": "PackingList",
            "transit": "Transit",
            "phytosanitary": "Phytosanitary",
            "report": "Reports",
            "stickers": "Stickers",
        }
        sub_folder = cat_map.get(category.lower(), "Other")
        target_dir = cls.get_documents_base_dir() / sub_folder
        target_dir.mkdir(parents=True, exist_ok=True)
        return target_dir

    @classmethod
    def compute_cache_key(cls, record_id: str, revision: int | str, template_version: str = "v1") -> str:
        """Generate deterministic cache key for document revisions."""
        raw = f"{record_id.strip()}:{revision}:{template_version}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @classmethod
    def find_cached_document(cls, category: str, filename: str) -> Path | None:
        """Check if an identical valid document already exists on disk."""
        target = cls.get_category_dir(category) / sanitize_filename(filename)
        if target.is_file() and target.stat().st_size > 100:
            return target
        return None

    # -------------------------------------------------------------------------
    # Core Document Generation Endpoints
    # -------------------------------------------------------------------------

    @classmethod
    def generate_bol(cls, context: BOLDocumentContext, revision: int = 1) -> dict[str, Any]:
        filename = f"BOL_{sanitize_filename(context.bol_number)}_v{revision}.pdf"
        target_path = cls.get_category_dir("bol") / filename

        # Instant Cache Re-use check
        cached = cls.find_cached_document("bol", filename)
        if cached:
            with open(cached, "rb") as f:
                sha256 = hashlib.sha256(f.read()).hexdigest()
            return {
                "file_path": str(cached),
                "filename": filename,
                "file_size": cached.stat().st_size,
                "sha256": sha256,
                "cached": True,
            }

        result = BOLPdfService.generate_bol_pdf(context, target_path)
        result["cached"] = False
        return result

    @classmethod
    def generate_commercial_invoice(cls, context: CommercialInvoiceContext, revision: int = 1) -> dict[str, Any]:
        filename = f"Invoice_{sanitize_filename(context.invoice_number)}_v{revision}.pdf"
        target_path = cls.get_category_dir("invoice") / filename

        cached = cls.find_cached_document("invoice", filename)
        if cached:
            with open(cached, "rb") as f:
                sha256 = hashlib.sha256(f.read()).hexdigest()
            return {
                "file_path": str(cached),
                "filename": filename,
                "file_size": cached.stat().st_size,
                "sha256": sha256,
                "cached": True,
            }

        result = CommercialInvoiceService.generate_invoice_pdf(context, target_path)
        result["cached"] = False
        return result

    @classmethod
    def generate_packing_list(cls, context: PackingListContext, revision: int = 1) -> dict[str, Any]:
        filename = f"PackingList_{sanitize_filename(context.packing_list_no)}_v{revision}.pdf"
        target_path = cls.get_category_dir("packing_list") / filename

        cached = cls.find_cached_document("packing_list", filename)
        if cached:
            with open(cached, "rb") as f:
                sha256 = hashlib.sha256(f.read()).hexdigest()
            return {
                "file_path": str(cached),
                "filename": filename,
                "file_size": cached.stat().st_size,
                "sha256": sha256,
                "cached": True,
            }

        result = PackingListService.generate_packing_list_pdf(context, target_path)
        result["cached"] = False
        return result

    @classmethod
    def generate_transit_permit(cls, context: TransitDocumentContext, revision: int = 1) -> dict[str, Any]:
        filename = f"Transit_{sanitize_filename(context.transit_number)}_v{revision}.pdf"
        target_path = cls.get_category_dir("transit") / filename

        cached = cls.find_cached_document("transit", filename)
        if cached:
            with open(cached, "rb") as f:
                sha256 = hashlib.sha256(f.read()).hexdigest()
            return {
                "file_path": str(cached),
                "filename": filename,
                "file_size": cached.stat().st_size,
                "sha256": sha256,
                "cached": True,
            }

        result = TransitService.generate_transit_pdf(context, target_path)
        result["cached"] = False
        return result

    @classmethod
    def generate_phytosanitary(cls, context: PhytoDocumentContext, revision: int = 1) -> dict[str, Any]:
        filename = f"Phyto_{sanitize_filename(context.certificate_number)}_v{revision}.pdf"
        target_path = cls.get_category_dir("phytosanitary") / filename

        cached = cls.find_cached_document("phytosanitary", filename)
        if cached:
            with open(cached, "rb") as f:
                sha256 = hashlib.sha256(f.read()).hexdigest()
            return {
                "file_path": str(cached),
                "filename": filename,
                "file_size": cached.stat().st_size,
                "sha256": sha256,
                "cached": True,
            }

        result = PhytosanitaryService.generate_phyto_pdf(context, target_path)
        result["cached"] = False
        return result

    @classmethod
    def generate_stickers(cls, context: StickerContext) -> dict[str, Any]:
        filename = f"Labels_{sanitize_filename(context.bol_number)}_{context.total_labels}pk.pdf"
        target_path = cls.get_category_dir("stickers") / filename

        cached = cls.find_cached_document("stickers", filename)
        if cached:
            with open(cached, "rb") as f:
                sha256 = hashlib.sha256(f.read()).hexdigest()
            return {
                "file_path": str(cached),
                "filename": filename,
                "file_size": cached.stat().st_size,
                "sha256": sha256,
                "cached": True,
            }

        result = StickerService.generate_stickers_pdf(context, target_path)
        result["cached"] = False
        return result

    @classmethod
    def export_excel_report(
        cls,
        account_name: str,
        currency: str,
        opening_balance: Any,
        entries: list[dict[str, Any]],
    ) -> dict[str, Any]:
        clean_name = sanitize_filename(account_name, fallback="Ledger")
        filename = f"Report_{clean_name}_{currency}.xlsx"
        target_path = cls.get_category_dir("report") / filename

        return ExcelExportService.export_ledger_workbook(
            target_path=target_path,
            account_name=account_name,
            currency=currency,
            opening_balance=opening_balance,
            entries=entries,
        )

    @classmethod
    def export_excel(
        cls,
        rows: list[dict[str, Any]],
        filename: str,
        sheet_title: str = "Export",
        title: str = "",
    ) -> dict[str, Any]:
        clean_name = sanitize_filename(filename, fallback="export.xlsx")
        if not clean_name.endswith(".xlsx"):
            clean_name += ".xlsx"
        target_path = cls.get_category_dir("report") / clean_name

        if not rows:
            headers = ["Message"]
            data = [["No data available"]]
        else:
            headers = list(rows[0].keys())
            data = [[r.get(h, "") for h in headers] for r in rows]

        res = ExcelExportService.export_tabular_data(
            target_path=target_path,
            sheet_title=sheet_title,
            headers=headers,
            rows=data,
        )
        res["success"] = True
        return res
