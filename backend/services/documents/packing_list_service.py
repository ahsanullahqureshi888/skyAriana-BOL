"""Packing List PDF Generation Service.

Renders container cargo manifests, package breakdowns, gross/net weight tallies,
and shipping marks for customs clearance and border inspections.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from typing import Any

from backend.services.documents.pdf_service import (
    _ensure_reportlab,
    draw_document_header,
    write_pdf_atomically,
)
from backend.services.documents.template_service import DocumentColors


@dataclass
class PackingListItem:
    item_no: int
    container_no: str
    seal_no: str
    commodity: str
    cartons: int
    gross_weight_kg: Decimal
    net_weight_kg: Decimal
    marks: str = "N/M"


@dataclass
class PackingListContext:
    packing_list_no: str
    date: str = ""
    bol_number: str = ""
    invoice_number: str = ""
    shipper_name: str = ""
    consignee_name: str = ""
    port_of_loading: str = "BANDAR ABBAS / ISLAM QALA"
    port_of_discharge: str = "NHAVA SHEVA / JEBEL ALI"
    vessel_truck: str = "ROAD TRANSIT"
    items: list[PackingListItem] = field(default_factory=list)
    remarks: str = ""

    def get_totals(self) -> tuple[int, Decimal, Decimal]:
        total_cartons = sum(item.cartons for item in self.items)
        total_gw = sum((item.gross_weight_kg for item in self.items), Decimal("0.0"))
        total_nw = sum((item.net_weight_kg for item in self.items), Decimal("0.0"))
        return total_cartons, total_gw, total_nw


class PackingListService:
    """Service to render vector A4 Packing List PDFs."""

    @classmethod
    def generate_packing_list_pdf(cls, context: PackingListContext, target_path: Path) -> dict[str, Any]:
        """Generate official A4 Packing List PDF."""
        _ensure_reportlab()
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas

        total_cartons, total_gw, total_nw = context.get_totals()

        def _build(buf: BytesIO):
            c = canvas.Canvas(buf, pagesize=A4)
            width, height = A4

            # Header
            draw_document_header(
                c,
                doc_title="PACKING LIST",
                doc_number=context.packing_list_no,
                date_str=context.date,
            )

            # Metadata Strip
            strip_y = height - 108
            strip_h = 44
            c.setFillColor(colors.HexColor(DocumentColors.BG_LIGHT))
            c.rect(36, strip_y - strip_h, width - 72, strip_h, fill=1, stroke=1)

            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 8)
            c.drawString(42, strip_y - 14, f"SHIPPER: {context.shipper_name[:40] or 'N/A'}")
            c.drawString(42, strip_y - 28, f"CONSIGNEE: {context.consignee_name[:40] or 'TO ORDER'}")

            c.drawString(320, strip_y - 14, f"B/L NO: {context.bol_number or 'N/A'}")
            c.drawString(320, strip_y - 28, f"INVOICE REF: {context.invoice_number or 'N/A'}")

            c.drawString(450, strip_y - 14, f"POL: {context.port_of_loading[:18]}")
            c.drawString(450, strip_y - 28, f"POD: {context.port_of_discharge[:18]}")

            # Manifest Table Header
            table_y = strip_y - strip_h - 10
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.rect(36, table_y - 18, width - 72, 18, fill=1, stroke=0)

            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(42, table_y - 13, "ITEM")
            c.drawString(75, table_y - 13, "CONTAINER & SEAL")
            c.drawString(185, table_y - 13, "CARGO / COMMODITY")
            c.drawString(340, table_y - 13, "PACKAGES (CTNS)")
            c.drawString(420, table_y - 13, "NET WT (KG)")
            c.drawString(490, table_y - 13, "GROSS WT (KG)")

            # Table Content
            row_y = table_y - 18
            items = context.items if context.items else [
                PackingListItem(1, "MSKU-908123-1", "SL-88712", "Dry Figs & Green Raisins in sound cartons", 2200, Decimal("22000"), Decimal("22500"))
            ]

            for idx, item in enumerate(items[:20]):
                bg = colors.HexColor(DocumentColors.BG_LIGHT) if idx % 2 == 1 else colors.white
                c.setFillColor(bg)
                c.rect(36, row_y - 18, width - 72, 18, fill=1, stroke=0)

                c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))
                c.setFont("Helvetica", 8)
                c.drawString(42, row_y - 12, str(item.item_no))
                c.drawString(75, row_y - 12, f"{item.container_no[:14]} / {item.seal_no[:8]}")
                c.drawString(185, row_y - 12, item.commodity[:32])
                c.drawRightString(400, row_y - 12, f"{item.cartons:,}")
                c.drawRightString(475, row_y - 12, f"{item.net_weight_kg:,.1f}")
                c.drawRightString(width - 42, row_y - 12, f"{item.gross_weight_kg:,.1f}")
                row_y -= 18

            # Totals Row
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.rect(36, row_y - 20, width - 72, 20, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(42, row_y - 14, "TOTAL SUMMARY:")
            c.drawRightString(400, row_y - 14, f"{total_cartons:,} CTNS")
            c.drawRightString(475, row_y - 14, f"{total_nw:,.1f} KGS")
            c.drawRightString(width - 42, row_y - 14, f"{total_gw:,.1f} KGS")

            # Bottom notes & Cargo certification
            note_y = row_y - 30
            c.setFillColor(colors.HexColor(DocumentColors.BG_LIGHT))
            c.rect(36, note_y - 50, width - 72, 50, fill=1, stroke=1)
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(42, note_y - 14, "CARGO PACKING DECLARATION:")
            c.setFont("Helvetica", 7)
            c.setFillColor(colors.HexColor(DocumentColors.MUTED_GRAY))
            c.drawString(42, note_y - 26, "1. We hereby certify that the goods mentioned above are packed in sound condition.")
            c.drawString(42, note_y - 37, "2. Net and gross weights correspond with factory packing records and scale weighments.")

            c.showPage()
            c.save()

        return write_pdf_atomically(target_path, _build)
