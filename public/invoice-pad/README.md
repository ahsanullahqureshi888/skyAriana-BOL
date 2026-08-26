# Sky Ariana Limited - Commercial Invoice Pad & Enterprise System

Professional, print-ready A4 Commercial Invoice Pad and Management System designed for **Sky Ariana Limited** (Sky Ariana & Balam Bar Baran International Transportation, Transit & Forwarding Company).

---

## 🌟 Key Features & Enhancements

1. **Executive Top Command Bar & Responsive Glassmorphic UI**:
   - **Autosave Engine**: Changes are automatically saved to `LocalStorage` continuously so work is never lost on refresh.
   - **Invoice History Library**: Save and archive up to 30 invoices with timestamps, consignee names, bill numbers, and totals. 1-click restore, duplicate, or delete.
   - **JSON / CSV Data Portability**: Export full structured invoice backups as `.json` files, import backups, and export item lists to `.csv` for Excel bookkeeping.
   - **Interactive Digital Signature Pad**: Draw official signatures directly on-screen or upload official company stamp images (PNG/JPG).
   - **Theme Selector**: Toggle between **Corporate Crimson**, **Sky Blue & Navy**, **Emerald Trade**, and **Clean Monochrome** themes.

2. **Customs & Trade Calculation Engine**:
   - **Real-Time Formula Computation**:
     $$\text{Line Amount} = \text{QTY} \times \text{Rate}$$
     $$\text{Grand Total} = \sum \text{Line Amounts}$$
     $$\text{Total GW} = \sum \text{Gross Weights}, \quad \text{Total NW} = \sum \text{Net Weights}$$
   - **Legal Amount in Words Generator**: Automatically converts grand totals to legal trade wording (e.g., *"Say US Dollars Seven Thousand Eight Hundred Sixty-Five Only"*).
   - **Customs Verification QR Code**: Vector QR code rendered on the invoice containing official customs verification metadata.

3. **100% Single-Page A4 Guarantee**:
   - Pixel-perfect CSS print calibration ensuring crisp vector output and zero page overflow.
   - Screen-only controls automatically hide during print or PDF export.

4. **Keyboard Shortcuts**:
   - `Ctrl + P`: Print or Save Vector PDF (A4).
   - `Ctrl + S`: Quick-save invoice to history library.
   - `Ctrl + Alt + N`: Add new line item row.
   - `Escape`: Close any open modal dialog.

---

## 🚀 How to Use

### Option 1: Interactive Browser Mode
1. Open [`index.html`](file:///e:/My-Softwares-+/sky-ariana-limited-invoice%20pad/index.html) in any modern browser (Chrome, Edge, Firefox, Safari).
2. Edit fields directly on screen.
3. Use the top toolbar to **Save**, **Add Row**, draw **Signatures**, or switch **Themes**.
4. Click **"Print / PDF (A4)"** (or press `Ctrl + P`) and choose **Save as PDF**.

### Option 2: Automated PDF Generation via Python
Run the included Python CLI tool:
```bash
python generate_pdf.py
```
To specify a custom output path:
```bash
python generate_pdf.py -o ./my_custom_invoice.pdf
```

### Option 3: Automated Diagnostic Audit Suite
Run the full 9-stage Playwright automated test suite:
```bash
python test_full_software.py
```

---

## 📁 File Structure
- [`index.html`](file:///e:/My-Softwares-+/sky-ariana-limited-invoice%20pad/index.html): Interactive, standalone, print-ready enterprise invoice web application.
- [`generate_pdf.py`](file:///e:/My-Softwares-+/sky-ariana-limited-invoice%20pad/generate_pdf.py): Python script for high-DPI vector PDF and preview image generation.
- [`test_full_software.py`](file:///e:/My-Softwares-+/sky-ariana-limited-invoice%20pad/test_full_software.py): Comprehensive automated test suite with UTF-8 support.
- [`sky_ariana_commercial_invoice.pdf`](file:///e:/My-Softwares-+/sky-ariana-limited-invoice%20pad/sky_ariana_commercial_invoice.pdf): Ready-to-use commercial invoice PDF.
- [`preview.png`](file:///e:/My-Softwares-+/sky-ariana-limited-invoice%20pad/preview.png): High-resolution visual snapshot of the invoice pad.

