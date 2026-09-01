# Sky Banking - OCR Receipt Import & Hawala Management

Professional Money Transaction History and Hawala Receipt Management software designed for the document style of Balam Bar Baran International Transport. Includes advanced OCR receipt parsing (for both English and Persian/Dari texts) and automated ledger updates.

---

## Features

- **React + Vite Frontend:** Modern white/blue glassmorphism theme, fully responsive dashboard, drag-and-drop receipt uploader, and in-app document viewer.
- **FastAPI Backend:** Clean pythonic endpoints running Uicorn, connected to a SQLite database.
- **OCR Receipt Extractor:** Automatically processes images and multi-page PDFs using Tesseract OCR and Pillow, converts Persian/Arabic numbers to English, converts Shamsi (Solar Hijri) dates (e.g. `1405.01.25`) to standard Gregorian dates, matches accounts with the database, and flags duplicate transactions.
- **Automated Ledger System:** Recalculates customer and bank ledger balances dynamically on create, update, import, and delete actions.
- **Backup & Audit Logs:** Track system activity with audit logs and download/upload JSON backup files.

---

## OCR System Dependencies

To run document OCR extraction, the backend depends on system-level OCR binaries. Install them based on your OS:

### 1. Install Tesseract OCR

- **Windows:**
  1. Download the installer from [UB Mannheim Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki).
  2. Run the installer (e.g., install to `C:\Program Files\Tesseract-OCR`).
  3. Ensure it is added to your System Environment variables **PATH** (the python backend will also automatically attempt to look for it in standard install paths).
  4. *Optional:* Select the Persian/Farsi (`fas`) script package during installation for enhanced text accuracy on Dari/Persian receipts.
- **macOS:**
  ```bash
  brew install tesseract tesseract-lang
  ```
- **Linux (Ubuntu/Debian):**
  ```bash
  sudo apt-get update
  sudo apt-get install tesseract-ocr tesseract-ocr-fas
  ```

### 2. Install Poppler (for PDF page processing)

- **Windows:**
  1. Download the latest Windows binary package (e.g., from [poppler-windows](https://github.com/oschwartz10612/poppler-windows/releases)).
  2. Extract the archive and copy the path to the `bin` directory (containing `pdftoppm.exe`).
  3. Add this `bin` path to your System Environment variables **PATH**.
- **macOS:**
  ```bash
  brew install poppler
  ```
- **Linux (Ubuntu/Debian):**
  ```bash
  sudo apt-get install poppler-utils
  ```

---

## Getting Started

### 1. Run the Backend Server

Install Python requirements and launch the FastAPI server:

```powershell
# Navigate to the backend directory and install dependencies
cd backend
pip install -r requirements.txt

# Start the FastAPI application with Uvicorn
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Health Check:** `http://127.0.0.1:8000/health`
- **Swagger API Docs:** `http://127.0.0.1:8000/docs`

### 2. Run the Frontend App

Install Node modules and start the Vite development server:

```powershell
# Navigate to the frontend directory and install dependencies
cd frontend
npm install

# Start Vite
npm run dev
```

- **Open Browser:** `http://127.0.0.1:5173`

---

## Default Login Credentials

Upon startup, the database is auto-seeded with the following users:

| Role | Username / Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@brb.com` | `admin123` |
| **Accountant** | `accountant@skybanking.local` | `1234` |

---

## Main OCR APIs

- `POST /api/ocr/upload` - Uploads a scanned receipt to temporary storage and returns attachment details.
- `POST /api/ocr/extract` - Processes the uploaded PDF or image, runs digit normalization and regex matching, searches for duplicate records, and returns structured fields.
- `POST /api/ocr/save-transaction` - Batch imports validated transactions, updates customer/bank balances, and links attachments.
- `GET /api/transactions/{id}/attachment` - Serves the uploaded PDF or image directly for inline previewing.
