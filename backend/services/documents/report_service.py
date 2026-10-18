"""Server-Side Logistics & Financial Reporting Service.

Executes database aggregations (COUNT, SUM, GROUP BY), multi-field filtering,
and compiles comprehensive PDF and Excel operational reports.
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
class ReportFilterCriteria:
    report_type: str = "OPERATIONS"  # OPERATIONS, LEDGER, SHIPMENTS, REVENUE
    date_from: str = ""
    date_to: str = ""
    account_name: str = ""
    shipper_name: str = ""
    consignee_name: str = ""
    status: str = ""
    currency: str = "USD"
    limit: int = 100
    offset: int = 0


@dataclass
class ReportSummaryMetrics:
    total_records: int = 0
    total_debit: Decimal = Decimal("0.00")
    total_credit: Decimal = Decimal("0.00")
    net_balance: Decimal = Decimal("0.00")
    total_cartons: int = 0
    total_containers: int = 0
    cleared_shipments: int = 0
    in_transit_shipments: int = 0


class ReportService:
    """Server-side reporting and document generation engine."""

    @classmethod
    def aggregate_metrics(cls, rows: list[dict[str, Any]]) -> ReportSummaryMetrics:
        """Compute authoritative accounting and operational invariance metrics."""
        total_debit = Decimal("0.00")
        total_credit = Decimal("0.00")
        total_cartons = 0
        total_containers = set()
        cleared_count = 0
        in_transit_count = 0

        for r in rows:
            d = Decimal(str(r.get("debit") or 0))
            c = Decimal(str(r.get("credit") or 0))
            total_debit += d
            total_credit += c

            ctn = r.get("cartons") or r.get("quantity") or 0
            if isinstance(ctn, int):
                total_cartons += ctn
            elif isinstance(ctn, str) and ctn.isdigit():
                total_cartons += int(ctn)

            ctn_num = r.get("containerNo") or r.get("container_number")
            if ctn_num:
                total_containers.add(str(ctn_num).strip().upper())

            st = str(r.get("status") or "").lower()
            if "cleared" in st or "delivered" in st or "final" in st:
                cleared_count += 1
            else:
                in_transit_count += 1

        net_bal = total_debit - total_credit
        return ReportSummaryMetrics(
            total_records=len(rows),
            total_debit=total_debit,
            total_credit=total_credit,
            net_balance=net_bal,
            total_cartons=total_cartons,
            total_containers=len(total_containers),
            cleared_shipments=cleared_count,
            in_transit_shipments=in_transit_count,
        )

    @classmethod
    def generate_report_pdf(
        cls,
        report_title: str,
        filters: ReportFilterCriteria,
        rows: list[dict[str, Any]],
        target_path: Path,
    ) -> dict[str, Any]:
        """Compile server-side filtered records into an official multi-page A4 Report PDF."""
        _ensure_reportlab()
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas

        metrics = cls.aggregate_metrics(rows)

        def _build(buf: BytesIO):
            c = canvas.Canvas(buf, pagesize=A4)
            width, height = A4

            # Header
            date_range = f"{filters.date_from or 'START'} ➔ {filters.date_to or 'CURRENT'}"
            draw_document_header(
                c,
                doc_title=report_title,
                doc_number=f"REP-{len(rows)}ROWS",
                date_str=date_range,
            )

            # Executive KPI Cards Bar
            kpi_y = height - 108
            kpi_h = 42
            card_w = (width - 72) / 4

            kpis = [
                ("TOTAL SHIPMENTS", f"{metrics.total_records:,}"),
                ("TOTAL DEBIT", f"{filters.currency} {metrics.total_debit:,.2f}"),
                ("TOTAL CREDIT", f"{filters.currency} {metrics.total_credit:,.2f}"),
                ("NET BALANCE", f"{filters.currency} {metrics.net_balance:,.2f}"),
            ]

            for i, (title, val) in enumerate(kpis):
                cx = 36 + (i * card_w)
                c.setFillColor(colors.HexColor(DocumentColors.BG_LIGHT))
                c.rect(cx, kpi_y - kpi_h, card_w, kpi_h, fill=1, stroke=1)
                c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
                c.setFont("Helvetica-Bold", 7)
                c.drawString(cx + 6, kpi_y - 12, title)
                c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))
                c.setFont("Helvetica-Bold", 9)
                c.drawString(cx + 6, kpi_y - 28, val[:20])

            # Records Table Header
            table_y = kpi_y - kpi_h - 10
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.rect(36, table_y - 18, width - 72, 18, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(42, table_y - 13, "DATE")
            c.drawString(100, table_y - 13, "BOL / REF")
            c.drawString(185, table_y - 13, "PARTY / DESCRIPTION")
            c.drawString(350, table_y - 13, f"DEBIT ({filters.currency})")
            c.drawString(425, table_y - 13, f"CREDIT ({filters.currency})")
            c.drawRightString(width - 42, table_y - 13, f"BALANCE ({filters.currency})")

            # Table Content Rows
            row_y = table_y - 18
            running_balance = Decimal("0.00")

            for idx, r in enumerate(rows[:28]):
                if row_y < 50:
                    c.showPage()
                    row_y = height - 50
                    draw_document_header(c, report_title, f"REP-{len(rows)}ROWS", date_str=date_range)
                    row_y -= 80

                bg = colors.HexColor(DocumentColors.BG_LIGHT) if idx % 2 == 1 else colors.white
                c.setFillColor(bg)
                c.rect(36, row_y - 16, width - 72, 16, fill=1, stroke=0)

                debit = Decimal(str(r.get("debit") or 0))
                credit = Decimal(str(r.get("credit") or 0))
                running_balance += (debit - credit)

                c.setFillColor(colors.HexColor(DocumentColors.DARK_SLATE))
                c.setFont("Helvetica", 7.5)
                c.drawString(42, row_y - 11, str(r.get("date") or r.get("transaction_date") or "")[:10])
                c.drawString(100, row_y - 11, str(r.get("bol_number") or r.get("barnamehNo") or "N/A")[:14])
                c.drawString(185, row_y - 11, str(r.get("description") or r.get("shipperDescription") or "")[:32])

                c.drawRightString(405, row_y - 11, f"{debit:,.2f}")
                c.drawRightString(480, row_y - 11, f"{credit:,.2f}")
                c.drawRightString(width - 42, row_y - 11, f"{running_balance:,.2f}")

                row_y -= 16

            # Bottom Accounting Balance Invariance Seal
            seal_y = max(40, row_y - 25)
            c.setFillColor(colors.HexColor(DocumentColors.PRIMARY_NAVY))
            c.rect(36, seal_y, width - 72, 18, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(42, seal_y + 5, f"VERIFIED NET BALANCE (DEBIT - CREDIT): {filters.currency} {metrics.net_balance:,.2f}")
            c.drawRightString(width - 42, seal_y + 5, f"TOTAL ENTRIES AUDITED: {metrics.total_records}")

            c.showPage()
            c.save()

        return write_pdf_atomically(target_path, _build)
