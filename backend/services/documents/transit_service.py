"""Border Transit Document PDF Generation Service.

Renders international road and rail transit permits across Afghan and Iranian border customs
(Islam Qala, Torghundi, Hairatan, Spin Boldak, Bandar Abbas) with driver identity and vehicle specs.
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
class TransitDocumentContext:
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


class TransitService:
    """Service to render vector A4 Transit Document PDFs."""

    @classmethod
    def generate_transit_pdf(cls, context: TransitDocumentContext, target_path: Path) -> dict[str, Any]:
        """Generate official Transit Permit A4 PDF."""
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
                doc_title="TRANSIT MANIFEST",
                doc_number=context.transit_number,
                date_str=context.issue_date,
            )

            # Route & Station Overview Box
            box_y = height - 108
            box_h = 44
            c.setFillColor(colors.HexColor(DocumentColors.BG_ACCENT))
            c.rect(36, box_y - box_h, width - 72, box_h, fill=1, stroke=1)

            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 8)
            c.drawString(42, box_y - 14, f"TRANSIT ROUTE: {context.origin_city.upper()} ➔ {context.destination_city.upper()}")
            c.drawString(42, box_y - 28, f"BORDER CUSTOMS STATION: {context.border_customs_station.upper()} BORDER POST")

            c.drawString(340, box_y - 14, f"BOL REFERENCE: {context.bol_number or 'N/A'}")
            c.drawString(340, box_y - 28, f"CUSTOMS DECLARATION: {context.customs_declaration_no or 'TRANSIT PERMIT'}")

            # -------------------------------------------------------------
            # Vehicle and Driver Information Box
            # -------------------------------------------------------------
            veh_y = box_y - box_h - 10
            veh_h = 80
            c.setFillColor(colors.HexColor(DocumentColors.BG_LIGHT))
            c.rect(36, veh_y - veh_h, width - 72, veh_h, fill=1, stroke=1)

            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 8.5)
            c.drawString(42, veh_y - 14, "VEHICLE & DRIVER CREDENTIALS:")

            col_w = (width - 72) / 3
            c.setFont("Helvetica", 8)
            c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))

            # Col 1: Driver
            c.drawString(42, veh_y - 30, f"Driver Name: {context.driver_name or 'DECLARED ON BORDER'}")
            c.drawString(42, veh_y - 45, f"Father Name: {context.driver_father_name or 'N/A'}")
            c.drawString(42, veh_y - 60, f"Contact: {context.driver_phone or 'N/A'}")

            # Col 2: Truck
            c.drawString(42 + col_w, veh_y - 30, f"Truck Plate No: {context.truck_number or 'ROAD VEHICLE'}")
            c.drawString(42 + col_w, veh_y - 45, f"License / Tazkira: {context.driver_license_passport or 'VERIFIED'}")
            c.drawString(42 + col_w, veh_y - 60, f"Transport Operator: {context.carrier_company}")

            # Col 3: Container
            c.drawString(42 + (col_w * 2), veh_y - 30, f"Container No: {context.container_number or 'TRANSIT TRAILER'}")
            c.drawString(42 + (col_w * 2), veh_y - 45, f"Lead Seal No: {context.seal_number or 'INTACT'}")
            c.drawString(42 + (col_w * 2), veh_y - 60, "Border Status: CLEAR FOR TRANSIT")

            # -------------------------------------------------------------
            # Cargo Specifications Table
            # -------------------------------------------------------------
            cargo_y = veh_y - veh_h - 12
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.rect(36, cargo_y - 18, width - 72, 18, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(42, cargo_y - 13, "CARGO PARTICULARS")
            c.drawString(260, cargo_y - 13, "TOTAL PACKAGES")
            c.drawString(380, cargo_y - 13, "NET WEIGHT")
            c.drawRightString(width - 42, cargo_y - 13, "GROSS WEIGHT")

            c.setFillColor(colors.white)
            c.rect(36, cargo_y - 58, width - 72, 40, fill=1, stroke=1)
            c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))
            c.setFont("Helvetica-Bold", 8.5)
            c.drawString(42, cargo_y - 35, context.cargo_type)
            c.setFont("Helvetica", 8)
            c.drawString(260, cargo_y - 35, context.package_quantity)
            c.drawString(380, cargo_y - 35, context.net_weight)
            c.drawRightString(width - 42, cargo_y - 35, context.gross_weight)

            # -------------------------------------------------------------
            # Customs Seal & Inspection Verification Grid
            # -------------------------------------------------------------
            seal_y = cargo_y - 70
            seal_h = 100
            half_w = (width - 72) / 2

            # Departure Border Stamp Box
            c.setFillColor(colors.HexColor(DocumentColors.BG_LIGHT))
            c.rect(36, seal_y - seal_h, half_w, seal_h, fill=1, stroke=1)
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(42, seal_y - 14, "DEPARTURE CUSTOMS VERIFICATION:")
            c.setFont("Helvetica", 7)
            c.setFillColor(colors.HexColor(DocumentColors.MUTED_GRAY))
            c.drawString(42, seal_y - 28, f"Station: {context.origin_city} Customs")
            c.drawString(42, seal_y - 40, "Seal inspected, intact, and permitted for exit.")
            c.drawString(42, seal_y - 88, "Officer Signature & Stamp: ___________________")

            # Entry / Transit Border Stamp Box
            c.setFillColor(colors.HexColor(DocumentColors.BG_LIGHT))
            c.rect(36 + half_w, seal_y - seal_h, half_w, seal_h, fill=1, stroke=1)
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(42 + half_w, seal_y - 14, "TRANSIT / DESTINATION CUSTOMS VERIFICATION:")
            c.setFont("Helvetica", 7)
            c.setFillColor(colors.HexColor(DocumentColors.MUTED_GRAY))
            c.drawString(42 + half_w, seal_y - 28, f"Border Post: {context.border_customs_station}")
            c.drawString(42 + half_w, seal_y - 40, "Goods arrived in sound condition without tampering.")
            c.drawString(42 + half_w, seal_y - 88, "Border Officer Stamp: ___________________")

            c.showPage()
            c.save()

        return write_pdf_atomically(target_path, _build)
