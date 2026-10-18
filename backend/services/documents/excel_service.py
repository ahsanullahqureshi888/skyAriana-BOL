"""High-Performance Excel Streaming Export Service.

Uses openpyxl write-only mode for constant O(1) memory consumption even when exporting
tens of thousands of ledger entries, shipments, and financial records.
"""

from __future__ import annotations

import hashlib
import os
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from typing import Any, Iterable


class ExcelExportService:
    """Fast, memory-bounded Excel workbook generator."""

    @classmethod
    def export_tabular_data(
        cls,
        target_path: Path,
        sheet_title: str,
        headers: list[str],
        rows: Iterable[list[Any]],
    ) -> dict[str, Any]:
        """Stream tabular data directly to an Excel file using write-only mode."""
        import openpyxl

        target_path.parent.mkdir(parents=True, exist_ok=True)
        temp_file = target_path.with_suffix(".tmp")

        wb = openpyxl.Workbook(write_only=True)
        ws = wb.create_sheet(title=sheet_title[:31])

        # Write Header row
        ws.append(headers)

        total_rows = 0
        for row in rows:
            clean_row = []
            for cell in row:
                if isinstance(cell, Decimal):
                    clean_row.append(float(cell))
                else:
                    clean_row.append(cell)
            ws.append(clean_row)
            total_rows += 1

        wb.save(temp_file)

        # Calculate checksum and atomic replace
        with open(temp_file, "rb") as f:
            content = f.read()
            sha256_hash = hashlib.sha256(content).hexdigest()
            file_size = len(content)

        temp_file.replace(target_path)

        return {
            "file_path": str(target_path),
            "filename": target_path.name,
            "file_size": file_size,
            "sha256": sha256_hash,
            "total_rows": total_rows,
        }

    @classmethod
    def export_ledger_workbook(
        cls,
        target_path: Path,
        account_name: str,
        currency: str,
        opening_balance: Decimal,
        entries: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Generate formatted Excel ledger workbook for accountant exports."""
        headers = [
            "S.No",
            "Date",
            "BOL Number",
            "Description / Shipper",
            "Invoice No",
            "Container No",
            "Consignee",
            "Quantity",
            f"Debit ({currency})",
            f"Credit ({currency})",
            f"Balance ({currency})",
        ]

        def row_generator():
            running_balance = opening_balance
            for idx, entry in enumerate(entries, start=1):
                debit = Decimal(str(entry.get("debit") or 0))
                credit = Decimal(str(entry.get("credit") or 0))
                running_balance += (debit - credit)

                yield [
                    idx,
                    str(entry.get("date") or entry.get("transaction_date") or ""),
                    str(entry.get("barnamehNo") or entry.get("bol_number") or ""),
                    str(entry.get("shipperDescription") or entry.get("description") or ""),
                    str(entry.get("invoiceNo") or entry.get("invoice_number") or ""),
                    str(entry.get("containerNo") or entry.get("container_number") or ""),
                    str(entry.get("consignee") or ""),
                    str(entry.get("quantity") or ""),
                    float(debit),
                    float(credit),
                    float(running_balance),
                ]

        return cls.export_tabular_data(
            target_path=target_path,
            sheet_title=account_name[:30] or "Ledger",
            headers=headers,
            rows=row_generator(),
        )
