"""Bill of Lading (BOL) Multi-Modal PDF Generation Service.

Builds standardized international A4 Bill of Lading documents from an authoritative BOLDocumentContext.
Renders carrier terms, multi-container manifests, border transit points, and driver freight details.
"""

from __future__ import annotations

from dataclasses import dataclass, field
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
class BOLDocumentContext:
    """Consolidated document context for Bill of Lading PDF generation."""

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
    container_numbers: list[str] = field(default_factory=list)
    seal_numbers: list[str] = field(default_factory=list)
    cargo_description: str = ""
    package_count: str = ""
    gross_weight: str = ""
    net_weight: str = ""
    freight_terms: str = "FREIGHT PREPAID"
    driver_name: str = ""
    driver_phone: str = ""
    driver_rent: str = ""
    remarks: str = ""


class BOLPdfService:
    """Service to render vector A4 Bill of Lading PDFs."""

    @classmethod
    def generate_bol_pdf(cls, context: BOLDocumentContext, target_path: Path) -> dict[str, Any]:
        """Generate official A4 Bill of Lading vector PDF."""
        _ensure_reportlab()
        from reportlab.lib import colors, pagesizes
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas

        def _build(buf: BytesIO):
            c = canvas.Canvas(buf, pagesize=A4)
            width, height = A4

            # Header
            draw_document_header(
                c,
                doc_title="BILL OF LADING",
                doc_number=context.bol_number,
                date_str=context.issue_date,
            )

            # -------------------------------------------------------------
            # Part 1: Parties Grid (Shipper, Consignee, Notify Party)
            # -------------------------------------------------------------
            grid_y = height - 108
            box_h = 74
            box_w = (width - 72) / 2

            # Shipper Box (Top Left)
            c.setStrokeColor(colors.HexColor(DocumentColors.BORDER_LIGHT))
            c.setFillColor(colors.HexColor(DocumentColors.BG_LIGHT))
            c.rect(36, grid_y - box_h, box_w, box_h, fill=1, stroke=1)
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 8)
            c.drawString(42, grid_y - 12, "1. SHIPPER / EXPORTER:")
            c.setFont("Helvetica-Bold", 9)
            c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))
            c.drawString(42, grid_y - 26, (context.shipper_name or "N/A")[:38])
            c.setFont("Helvetica", 8)
            c.setFillColor(colors.HexColor(DocumentColors.MUTED_GRAY))
            c.drawString(42, grid_y - 38, (context.shipper_address or "Kabul, Afghanistan")[:45])
            if context.shipper_phone:
                c.drawString(42, grid_y - 50, f"Tel: {context.shipper_phone}")

            # BOL Number & Tracking Meta (Top Right)
            c.setFillColor(colors.HexColor(DocumentColors.BG_ACCENT))
            c.rect(36 + box_w, grid_y - box_h, box_w, box_h, fill=1, stroke=1)
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 8)
            c.drawString(42 + box_w, grid_y - 12, "B/L NO. & BOOKING REF:")
            c.setFont("Helvetica-Bold", 11)
            c.setFillColor(colors.HexColor(DocumentColors.ACCENT_GOLD))
            c.drawString(42 + box_w, grid_y - 28, context.bol_number)
            c.setFont("Helvetica", 8)
            c.setFillColor(colors.HexColor(DocumentColors.MUTED_GRAY))
            c.drawString(42 + box_w, grid_y - 42, f"Freight Status: {context.freight_terms}")
            c.drawString(42 + box_w, grid_y - 54, f"Border Station: {context.transit_border}")
            c.drawString(42 + box_w, grid_y - 66, f"Issue Place: {context.place_of_issue}")

            # Consignee Box (Middle Left)
            grid_y2 = grid_y - box_h - 4
            c.setFillColor(colors.HexColor(DocumentColors.BG_LIGHT))
            c.rect(36, grid_y2 - box_h, box_w, box_h, fill=1, stroke=1)
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 8)
            c.drawString(42, grid_y2 - 12, "2. CONSIGNEE:")
            c.setFont("Helvetica-Bold", 9)
            c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))
            c.drawString(42, grid_y2 - 26, (context.consignee_name or "TO ORDER")[:38])
            c.setFont("Helvetica", 8)
            c.setFillColor(colors.HexColor(DocumentColors.MUTED_GRAY))
            c.drawString(42, grid_y2 - 38, (context.consignee_address or "DESTINATION AS DECLARED")[:45])
            if context.consignee_phone:
                c.drawString(42, grid_y2 - 50, f"Tel: {context.consignee_phone}")

            # Notify Party Box (Middle Right)
            c.setFillColor(colors.HexColor(DocumentColors.BG_LIGHT))
            c.rect(36 + box_w, grid_y2 - box_h, box_w, box_h, fill=1, stroke=1)
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 8)
            c.drawString(42 + box_w, grid_y2 - 12, "3. NOTIFY PARTY:")
            c.setFont("Helvetica", 8)
            c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))
            c.drawString(42 + box_w, grid_y2 - 26, (context.notify_party_name or "SAME AS CONSIGNEE")[:38])
            c.drawString(42 + box_w, grid_y2 - 38, (context.notify_party_address or "AS DIRECTED")[:45])

            # -------------------------------------------------------------
            # Part 2: Routing Details
            # -------------------------------------------------------------
            route_y = grid_y2 - box_h - 4
            route_h = 36
            col_w = (width - 72) / 4

            c.setFillColor(colors.HexColor(DocumentColors.BG_LIGHT))
            c.rect(36, route_y - route_h, width - 72, route_h, fill=1, stroke=1)

            headers = ["VESSEL / TRUCK NO.", "PORT OF LOADING", "TRANSIT BORDER", "FINAL DESTINATION"]
            vals = [
                context.vessel_truck_details or "ROAD TRANSIT",
                context.port_of_loading or "BANDAR ABBAS",
                context.transit_border or "ISLAM QALA",
                context.final_destination or "KABUL / HERAT",
            ]

            for i in range(4):
                cx = 36 + (i * col_w)
                c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
                c.setFont("Helvetica-Bold", 7)
                c.drawString(cx + 6, route_y - 12, headers[i])
                c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))
                c.setFont("Helvetica-Bold", 8)
                c.drawString(cx + 6, route_y - 25, vals[i][:22])

            # -------------------------------------------------------------
            # Part 3: Cargo Manifest Table
            # -------------------------------------------------------------
            manifest_y = route_y - route_h - 10
            manifest_h = 190

            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.rect(36, manifest_y, width - 72, 18, fill=1, stroke=0)

            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(42, manifest_y + 5, "CONTAINER & SEAL NO.")
            c.drawString(170, manifest_y + 5, "PACKAGES & DESCRIPTION OF GOODS")
            c.drawString(380, manifest_y + 5, "GROSS WEIGHT")
            c.drawString(450, manifest_y + 5, "NET WEIGHT")
            c.drawString(510, manifest_y + 5, "STATUS")

            # Table Body Outline
            c.setStrokeColor(colors.HexColor(DocumentColors.BORDER_LIGHT))
            c.setFillColor(colors.white)
            c.rect(36, manifest_y - manifest_h, width - 72, manifest_h, fill=1, stroke=1)

            # Table Content
            c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))
            c.setFont("Helvetica-Bold", 9)
            ctn_str = ", ".join(context.container_numbers) if context.container_numbers else "1X40' HC"
            c.drawString(42, manifest_y - 20, ctn_str[:22])

            c.setFont("Helvetica", 8)
            c.drawString(42, manifest_y - 34, f"Seal: {', '.join(context.seal_numbers) if context.seal_numbers else 'SEALED'}")

            # Description (wrapped)
            c.setFont("Helvetica-Bold", 9)
            desc_lines = (context.cargo_description or "FREIGHT CARGO IN SOUND CONDITION").split("\n")
            dy = manifest_y - 20
            for line in desc_lines[:6]:
                c.drawString(170, dy, line[:44])
                dy -= 14

            c.setFont("Helvetica", 8)
            c.drawString(170, dy - 5, f"Quantity: {context.package_count or 'SAID TO CONTAIN'}")

            # Weights
            c.setFont("Helvetica-Bold", 9)
            c.drawString(380, manifest_y - 20, context.gross_weight or "AS PER P/L")
            c.drawString(450, manifest_y - 20, context.net_weight or "AS PER P/L")

            c.setFillColor(colors.HexColor(DocumentColors.SUCCESS_GREEN))
            c.drawString(510, manifest_y - 20, "CLEARED")

            # -------------------------------------------------------------
            # Part 4: Bottom Disclaimers & Carrier Signature Box
            # -------------------------------------------------------------
            bottom_y = manifest_y - manifest_h - 10
            c.setFillColor(colors.HexColor(DocumentColors.BG_LIGHT))
            c.rect(36, bottom_y - 70, width - 200, 70, fill=1, stroke=1)

            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 8)
            c.drawString(42, bottom_y - 12, "CARRIER TERMS & NOTICES:")
            c.setFont("Helvetica", 7)
            c.setFillColor(colors.HexColor(DocumentColors.MUTED_GRAY))
            c.drawString(42, bottom_y - 24, "1. Received by the Carrier in apparent good order and condition unless otherwise stated.")
            c.drawString(42, bottom_y - 35, "2. Goods are carried subject to all terms, conditions, exceptions and liberties of Sky Ariana.")
            c.drawString(42, bottom_y - 46, "3. Multi-modal transit governed by Afghan & International Transport Conventions.")
            if context.remarks:
                c.drawString(42, bottom_y - 58, f"Remarks: {context.remarks[:65]}")

            # Signature Box (Right)
            sig_w = 120
            sig_x = width - 36 - sig_w
            c.setFillColor(colors.white)
            c.rect(sig_x, bottom_y - 70, sig_w, 70, fill=1, stroke=1)
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 7)
            c.drawCentredString(sig_x + sig_w / 2, bottom_y - 12, "FOR SKY ARIANA LIMITED")
            c.setFont("Helvetica", 7)
            c.setFillColor(colors.HexColor(DocumentColors.MUTED_GRAY))
            c.drawCentredString(sig_x + sig_w / 2, bottom_y - 62, "AUTHORIZED SIGNATURE / STAMP")

            c.showPage()
            c.save()

        return write_pdf_atomically(target_path, _build)
