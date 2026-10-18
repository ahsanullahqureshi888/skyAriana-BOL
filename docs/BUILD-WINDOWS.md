# AQ COMPANIES — Windows Build & Packaging Guide

This document describes how to build, compile, and package the complete **AQ COMPANIES – Logistics & BOL Management** system into a production Windows installer (`AQ-COMPANIES-Setup.exe`).

---

## 1. System Architecture in Packaged Mode

AQ COMPANIES runs as an enterprise desktop application containing two co-located runtimes, requiring **zero** user prerequisites:

1. **Python FastAPI Backend (`aq-backend.exe`)**:
   - Compiled to a standalone binary via PyInstaller.
   - Embeds SQLite, SQLAlchemy async engine, Alembic migrations, Uvicorn, ReportLab, and OpenPyXL.
   - Run in windowless mode (`windowsHide: true`) by the Electron process manager.
   - Accessible locally via `http://127.0.0.1:8000`.

2. **Electron Desktop Container + Next.js Standalone Frontend**:
   - Compiled Next.js App Router frontend executed via Electron's embedded Node runtime (`ELECTRON_RUN_AS_NODE=1`).
   - Serves local user interface and proxies API traffic (`/api/v1/*`) to the backend.

3. **Persistent Business Data Storage**:
   - Database (`aq_companies.db`), generated documents, and backups are stored in:
     `%LOCALAPPDATA%\AQ COMPANIES\data\`
   - Application execution logs are stored in:
     `%LOCALAPPDATA%\AQ COMPANIES\Logs\`
   - **Data Safety Invariant**: Installer updates and uninstalls never touch `%LOCALAPPDATA%\AQ COMPANIES\data`.

---

## 2. Build Prerequisites (Developer Workstation Only)

The developer building the installer requires:
- Windows 10/11 x64
- Node.js 20+ and npm / pnpm
- Python 3.11+ virtual environment (`.venv`) with PyInstaller (`pip install pyinstaller`)
- PowerShell 5.1+ or CMD

*Note: End users do NOT need any of these tools.*

---

## 3. Step-by-Step Build Commands

### Step 3.1: Build Standalone Python Backend
Compiles `backend/entrypoint.py` and all backend dependencies into `resources/backend/aq-backend.exe`:
```powershell
npm run build:backend
```

### Step 3.2: Build Standalone Next.js Frontend
Runs Next.js production compilation into `.next-production` with standalone server:
```powershell
npm run build:frontend
```

### Step 3.3: Compile Electron TypeScript
Compiles `electron/*.ts` into `dist-electron/`:
```powershell
npm run build:electron
```

### Step 3.4: Package Windows NSIS Installer
Runs electron-builder to generate `release/AQ-COMPANIES-Setup.exe`:
```powershell
npm run package:win
```

---

## 4. One-Click Release Pipeline

To execute all steps in sequence, verify artifact integrity, and compute the SHA-256 hash in a single command:

```powershell
npm run release:win
```

Output artifacts generated in `release/`:
- `AQ-COMPANIES-Setup.exe` (Professional NSIS Installer)
- `AQ-COMPANIES-Setup.exe.sha256` (Cryptographic verification checksum)
