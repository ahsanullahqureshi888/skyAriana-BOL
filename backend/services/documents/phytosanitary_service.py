"""Phytosanitary Certificate Draft PDF Generation Service.

Renders plant quarantine, agricultural inspection certificates, botanical classifications,
and fumigation treatment reports for agricultural export goods.
"""

from __future__ import annotations

from dataclasses import dataclass
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
class PhytoDocumentContext:
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
    remarks: str = "Certified free from quarantine pests and practical freedom from injurious pests."


class PhytosanitaryService:
    """Service to render vector A4 Phytosanitary Certificate PDFs."""

    @classmethod
    def generate_phyto_pdf(cls, context: PhytoDocumentContext, target_path: Path) -> dict[str, Any]:
        """Generate official Phytosanitary Certificate A4 PDF."""
        _ensure_reportlab()
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas

        def _build(buf: BytesIO):
            c = canvas.Canvas(buf, pagesize=A4)
            width, height = A4

            # Header
            draw_document_header(
                c,
                doc_title="PHYTOSANITARY DRAFT",
                doc_number=context.certificate_number,
                date_str=context.issue_date,
            )

            # Certificate Declaration Subtitle
            sub_y = height - 108
            c.setFillColor(colors.HexColor(DocumentColors.BG_ACCENT))
            c.rect(36, sub_y - 28, width - 72, 28, fill=1, stroke=1)
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 8)
            c.drawCentredString(width / 2, sub_y - 12, "ISLAMIC EMIRATE OF AFGHANISTAN — MINISTRY OF AGRICULTURE & IRRIGATION")
            c.setFont("Helvetica", 7.5)
            c.setFillColor(colors.HexColor(DocumentColors.MUTED_GRAY))
            c.drawCentredString(width / 2, sub_y - 22, "Department of Plant Protection & Agricultural Quarantine • Official Export Inspection")

            # Parties Section (Exporter & Consignee)
            grid_y = sub_y - 36
            box_h = 60
            box_w = (width - 72) / 2

            # Exporter
            c.setFillColor(colors.HexColor(DocumentColors.BG_LIGHT))
            c.rect(36, grid_y - box_h, box_w, box_h, fill=1, stroke=1)
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(42, grid_y - 12, "1. NAME & ADDRESS OF EXPORTER:")
            c.setFont("Helvetica-Bold", 8.5)
            c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))
            c.drawString(42, grid_y - 25, (context.exporter_name or "N/A")[:38])
            c.setFont("Helvetica", 7.5)
            c.drawString(42, grid_y - 37, (context.exporter_address or "Kabul, Afghanistan")[:45])
            c.drawString(42, grid_y - 49, f"Origin Country: {context.country_of_origin}")

            # Consignee
            c.setFillColor(colors.HexColor(DocumentColors.BG_LIGHT))
            c.rect(36 + box_w, grid_y - box_h, box_w, box_h, fill=1, stroke=1)
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(42 + box_w, grid_y - 12, "2. DECLARED NAME & ADDRESS OF CONSIGNEE:")
            c.setFont("Helvetica-Bold", 8.5)
            c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))
            c.drawString(42 + box_w, grid_y - 25, (context.consignee_name or "TO ORDER")[:38])
            c.setFont("Helvetica", 7.5)
            c.drawString(42 + box_w, grid_y - 37, (context.consignee_address or "As per B/L")[:45])
            c.drawString(42 + box_w, grid_y - 49, f"Destination: {context.country_of_destination}")

            # Description of Consignment Table
            cons_y = grid_y - box_h - 10
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.rect(36, cons_y - 18, width - 72, 18, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(42, cons_y - 13, "BOTANICAL NAME & COMMODITY")
            c.drawString(240, cons_y - 13, "PACKAGES")
            c.drawString(340, cons_y - 13, "NET WEIGHT")
            c.drawString(440, cons_y - 13, "GROSS WEIGHT")

            c.setFillColor(colors.white)
            c.rect(36, cons_y - 66, width - 72, 48, fill=1, stroke=1)

            c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))
            c.setFont("Helvetica-Bold", 9)
            c.drawString(42, cons_y - 35, context.commodity_name[:34])
            c.setFont("Helvetica-Oblique", 8)
            c.setFillColor(colors.HexColor(DocumentColors.MUTED_GRAY))
            c.drawString(42, cons_y - 50, f"Botanical: {context.botanical_name}")

            c.setFont("Helvetica", 8.5)
            c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))
            c.drawString(240, cons_y - 35, context.package_count)
            c.drawString(340, cons_y - 35, context.net_weight)
            c.drawString(440, cons_y - 35, context.gross_weight)

            # Disinfestation and/or Disinfection Treatment Box
            treat_y = cons_y - 76
            treat_h = 80
            c.setFillColor(colors.HexColor(DocumentColors.BG_LIGHT))
            c.rect(36, treat_y - treat_h, width - 72, treat_h, fill=1, stroke=1)

            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 8)
            c.drawString(42, treat_y - 14, "DISINFESTATION AND/OR DISINFECTION TREATMENT:")

            c.setFont("Helvetica", 8)
            c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))
            c.drawString(42, treat_y - 30, f"Chemical (Active Ingredient): {context.treatment_type}")
            c.drawString(42, treat_y - 45, f"Concentration: {context.chemical_concentration}")
            c.drawString(42, treat_y - 60, f"Duration and Temperature: {context.treatment_duration_temp}")

            c.drawString(340, treat_y - 30, f"Inspection Date: {context.inspection_date or context.issue_date}")
            c.drawString(340, treat_y - 45, f"BOL Cross-Reference: {context.bol_number or 'N/A'}")
            c.drawString(340, treat_y - 60, "Result: FOUND FREE FROM QUARANTINE PESTS")

            # Official Declaration & Quarantine Stamp Area
            stamp_y = treat_y - treat_h - 10
            stamp_h = 75
            c.setFillColor(colors.white)
            c.rect(36, stamp_y - stamp_h, width - 72, stamp_h, fill=1, stroke=1)

            c.setFillColor(colors.HexColor(DocumentColors.MUTED_GRAY))
            c.setFont("Helvetica", 7)
            c.drawString(42, stamp_y - 14, "DECLARATION:")
            c.drawString(42, stamp_y - 25, "This is to certify that the plants, plant products or other regulated articles described herein have been inspected")
            c.drawString(42, stamp_y - 36, "and considered to be free from quarantine pests, and substantially free from other injurious pests.")

            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(width - 210, stamp_y - 50, "PLANT QUARANTINE OFFICER")
            c.setFont("Helvetica", 7)
            c.drawString(width - 210, stamp_y - 62, "Seal & Authorized Signature")

            c.showPage()
            c.save()

        return write_pdf_atomically(target_path, _build)
