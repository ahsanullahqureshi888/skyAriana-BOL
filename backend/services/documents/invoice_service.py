"""Commercial Invoice PDF Generation Service.

Performs strict financial calculations using Decimal to avoid floating-point inaccuracies.
Enforces the invariance: sum(line amounts) == subtotal and subtotal - discount + tax == total.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from io import BytesIO
from pathlib import Path
from typing import Any

from backend.services.documents.pdf_service import (
    _ensure_reportlab,
    draw_document_header,
    write_pdf_atomically,
)
from backend.services.documents.template_service import DocumentBranding, DocumentColors


@dataclass
class InvoiceLineItem:
    description: str
    quantity: Decimal
    unit: str = "CTNS"
    unit_price: Decimal = Decimal("0.00")
    amount: Decimal = Decimal("0.00")

    def __post_init__(self):
        if not self.amount or self.amount == Decimal("0.00"):
            self.amount = (self.quantity * self.unit_price).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@dataclass
class CommercialInvoiceContext:
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
    items: list[InvoiceLineItem] = field(default_factory=list)
    discount: Decimal = Decimal("0.00")
    tax: Decimal = Decimal("0.00")
    bank_details: str = "BANK ALFALAH / DA AFGHANISTAN BANK"
    remarks: str = ""

    def calculate_totals(self) -> tuple[Decimal, Decimal]:
        """Compute subtotal and verified grand total."""
        subtotal = sum((item.amount for item in self.items), Decimal("0.00")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        grand_total = (subtotal - self.discount + self.tax).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        return subtotal, grand_total


class CommercialInvoiceService:
    """Service to render vector A4 Commercial Invoices."""

    @classmethod
    def generate_invoice_pdf(cls, context: CommercialInvoiceContext, target_path: Path) -> dict[str, Any]:
        """Generate official Commercial Invoice A4 PDF."""
        _ensure_reportlab()
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas

        subtotal, grand_total = context.calculate_totals()

        def _build(buf: BytesIO):
            c = canvas.Canvas(buf, pagesize=A4)
            width, height = A4

            # Header
            draw_document_header(
                c,
                doc_title="COMMERCIAL INVOICE",
                doc_number=context.invoice_number,
                date_str=context.invoice_date,
            )

            # Exporter & Consignee Box
            grid_y = height - 108
            box_h = 70
            box_w = (width - 72) / 2

            # Exporter (Left)
            c.setStrokeColor(colors.HexColor(DocumentColors.BORDER_LIGHT))
            c.setFillColor(colors.HexColor(DocumentColors.BG_LIGHT))
            c.rect(36, grid_y - box_h, box_w, box_h, fill=1, stroke=1)
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 8)
            c.drawString(42, grid_y - 12, "EXPORTER / SHIPPER:")
            c.setFont("Helvetica-Bold", 9)
            c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))
            c.drawString(42, grid_y - 25, (context.exporter_name or "N/A")[:38])
            c.setFont("Helvetica", 8)
            c.setFillColor(colors.HexColor(DocumentColors.MUTED_GRAY))
            c.drawString(42, grid_y - 37, (context.exporter_address or "Kabul, Afghanistan")[:45])
            c.drawString(42, grid_y - 49, f"Country of Origin: {context.country_of_origin}")

            # Consignee (Right)
            c.setFillColor(colors.HexColor(DocumentColors.BG_LIGHT))
            c.rect(36 + box_w, grid_y - box_h, box_w, box_h, fill=1, stroke=1)
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 8)
            c.drawString(42 + box_w, grid_y - 12, "CONSIGNEE (BUYER):")
            c.setFont("Helvetica-Bold", 9)
            c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))
            c.drawString(42 + box_w, grid_y - 25, (context.consignee_name or "TO ORDER")[:38])
            c.setFont("Helvetica", 8)
            c.setFillColor(colors.HexColor(DocumentColors.MUTED_GRAY))
            c.drawString(42 + box_w, grid_y - 37, (context.consignee_address or "Destination Port")[:45])
            c.drawString(42 + box_w, grid_y - 49, f"Destination: {context.country_of_destination}")

            # Shipping details bar
            bar_y = grid_y - box_h - 4
            bar_h = 24
            c.setFillColor(colors.HexColor(DocumentColors.BG_ACCENT))
            c.rect(36, bar_y - bar_h, width - 72, bar_h, fill=1, stroke=1)
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(42, bar_y - 16, f"BOL REF: {context.bol_number or 'N/A'}")
            c.drawString(180, bar_y - 16, f"POL: {context.port_of_loading}")
            c.drawString(340, bar_y - 16, f"POD: {context.port_of_discharge}")
            c.drawString(460, bar_y - 16, f"TERMS: {context.payment_terms[:16]}")

            # Table Header
            table_y = bar_y - bar_h - 8
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.rect(36, table_y - 18, width - 72, 18, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(42, table_y - 13, "S.NO")
            c.drawString(75, table_y - 13, "ITEM DESCRIPTION")
            c.drawString(290, table_y - 13, "QUANTITY")
            c.drawString(370, table_y - 13, f"UNIT PRICE ({context.currency})")
            c.drawRightString(width - 42, table_y - 13, f"TOTAL AMOUNT ({context.currency})")

            # Table Rows
            row_y = table_y - 18
            c.setFont("Helvetica", 8)
            items = context.items if context.items else [
                InvoiceLineItem("General Cargo / Dried Fruits & Nuts in sound condition", Decimal("1"), "LOT", subtotal)
            ]

            for idx, item in enumerate(items[:15]):
                bg = colors.HexColor(DocumentColors.BG_LIGHT) if idx % 2 == 1 else colors.white
                c.setFillColor(bg)
                c.rect(36, row_y - 18, width - 72, 18, fill=1, stroke=0)

                c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))
                c.drawString(42, row_y - 12, str(idx + 1))
                c.drawString(75, row_y - 12, item.description[:44])
                c.drawString(290, row_y - 12, f"{item.quantity:,.0f} {item.unit}")
                c.drawString(370, row_y - 12, f"{item.unit_price:,.2f}")
                c.drawRightString(width - 42, row_y - 12, f"{item.amount:,.2f}")
                row_y -= 18

            # Table border
            table_total_h = (table_y - 18) - row_y + 18
            c.setStrokeColor(colors.HexColor(DocumentColors.BORDER_LIGHT))
            c.rect(36, row_y, width - 72, table_total_h, fill=0, stroke=1)

            # Summary Totals Box
            summary_y = row_y - 8
            sum_box_w = 210
            sum_box_x = width - 36 - sum_box_w

            c.setFillColor(colors.HexColor(DocumentColors.BG_LIGHT))
            c.rect(sum_box_x, summary_y - 66, sum_box_w, 66, fill=1, stroke=1)

            c.setFont("Helvetica-Bold", 8)
            c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))
            c.drawString(sum_box_x + 8, summary_y - 15, "Subtotal:")
            c.drawRightString(width - 42, summary_y - 15, f"{context.currency} {subtotal:,.2f}")

            if context.discount > Decimal("0.00"):
                c.drawString(sum_box_x + 8, summary_y - 28, "Discount:")
                c.drawRightString(width - 42, summary_y - 28, f"-{context.currency} {context.discount:,.2f}")

            # Highlighted Grand Total
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.rect(sum_box_x, summary_y - 66, sum_box_w, 24, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 10)
            c.drawString(sum_box_x + 8, summary_y - 51, "GRAND TOTAL:")
            c.drawRightString(width - 42, summary_y - 51, f"{context.currency} {grand_total:,.2f}")

            # Bank instructions & signatures (Bottom Left)
            bank_w = width - 72 - sum_box_w - 12
            c.setFillColor(colors.HexColor(DocumentColors.BG_LIGHT))
            c.rect(36, summary_y - 66, bank_w, 66, fill=1, stroke=1)
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(42, summary_y - 14, "PAYMENT / BANK INSTRUCTIONS:")
            c.setFont("Helvetica", 7)
            c.setFillColor(colors.HexColor(DocumentColors.MUTED_GRAY))
            c.drawString(42, summary_y - 26, f"Beneficiary: {DocumentBranding.COMPANY_NAME}")
            c.drawString(42, summary_y - 37, f"Bank: {context.bank_details}")
            c.drawString(42, summary_y - 48, "All bank charges outside Afghanistan for applicant's account.")

            c.showPage()
            c.save()

        return write_pdf_atomically(target_path, _build)
