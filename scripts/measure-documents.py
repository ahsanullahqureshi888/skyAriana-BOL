import time
import tracemalloc
from pathlib import Path
from io import BytesIO
from decimal import Decimal
import openpyxl
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

print("=== STEP 1: PYTHON BACKEND BENCHMARK (REPORTLAB & OPENPYXL) ===")

# Test 1: Programmatic A4 PDF Generation with ReportLab
tracemalloc.start()
t0 = time.perf_counter()
buffer = BytesIO()
c = canvas.Canvas(buffer, pagesize=A4)
width, height = A4

# Header
c.setFont("Helvetica-Bold", 16)
c.drawString(50, height - 50, "SKY ARIANA LIMITED")
c.setFont("Helvetica", 9)
c.drawString(50, height - 65, "International Freight Forwarding & Multi-Modal Logistics")
c.setFont("Helvetica-Bold", 11)
c.drawString(50, height - 90, "BILL OF LADING: BOL-2026-AF-001")

# Draw 50 line items across 2 pages
y = height - 120
c.setFont("Helvetica", 8)
for i in range(50):
    c.drawString(50, y, f"Item {i+1}: 40' High Cube Container • Dry Figs (Best) • Net Wt: 22,000 KGS • Gross Wt: 22,500 KGS")
    y -= 14
    if y < 50:
        c.showPage()
        y = height - 50
        c.setFont("Helvetica", 8)

c.save()
pdf_bytes = buffer.getvalue()
t1 = time.perf_counter()
current_ram, peak_ram = tracemalloc.get_traced_memory()
tracemalloc.stop()

print(f"ReportLab PDF (2 pages): {(t1 - t0)*1000:.2f} ms | Peak RAM: {peak_ram / 1024:.1f} KB | Output size: {len(pdf_bytes) / 1024:.1f} KB")

# Test 2: openpyxl 5,000-row Excel Generation
tracemalloc.start()
t2 = time.perf_counter()
wb = openpyxl.Workbook(write_only=True)
ws = wb.create_sheet(title="Ledger")
ws.append(["Date", "BOL Number", "Description", "Debit (USD)", "Credit (USD)", "Running Balance (USD)"])

running_balance = Decimal("0.00")
for i in range(5000):
    debit = Decimal("3200.00")
    credit = Decimal("0.00")
    running_balance += (debit - credit)
    ws.append([
        "2026-09-24",
        f"BOL-2026-AF-{i:04d}",
        "M/S KALU MAL MADAN LAL - DRY FIGS (BEST) 2000 CTNS",
        float(debit),
        float(credit),
        float(running_balance)
    ])

excel_buf = BytesIO()
wb.save(excel_buf)
excel_bytes = excel_buf.getvalue()
t3 = time.perf_counter()
current_ram2, peak_ram2 = tracemalloc.get_traced_memory()
tracemalloc.stop()

print(f"openpyxl Excel (5,000 rows, write-only streaming): {(t3 - t2)*1000:.2f} ms | Peak RAM: {peak_ram2 / 1024:.1f} KB | Output size: {len(excel_bytes) / 1024:.1f} KB")
