# AQ COMPANIES — Production Deployment & User Installation Guide

This guide details the distribution, installation, data management, and update procedures for **AQ COMPANIES – Logistics & BOL Management**.

---

## 1. End-User Installation

### System Requirements:
- Windows 10 (version 1903 or later) or Windows 11 (64-bit).
- Minimum 4 GB RAM (8 GB recommended).
- 500 MB free disk space.
- **Zero prerequisites**: No Python, Node.js, npm, or database server installation needed.

### Installation Instructions:
1. Double-click `AQ-COMPANIES-Setup.exe`.
2. Follow the NSIS setup wizard:
   - Select installation directory (Default: `%PROGRAMFILES%\AQ COMPANIES` or `%LOCALAPPDATA%\Programs\AQ COMPANIES`).
   - Create Desktop Shortcut (checked by default).
   - Create Start Menu Shortcut (checked by default).
3. Click **Install**.
4. Click **Finish** to launch **AQ COMPANIES**.

---

## 2. Directory Layout & Data Separation

AQ COMPANIES strictly separates application binaries from user business data to prevent data loss during updates or uninstalls:

| Directory | Purpose | Retention on Uninstall/Upgrade |
|---|---|---|
| `C:\Program Files\AQ COMPANIES\` | Application binaries (`AQ COMPANIES.exe`, `backend\aq-backend.exe`, electron runtime) | Replaced on upgrade; removed on uninstall |
| `%LOCALAPPDATA%\AQ COMPANIES\data\` | Business database (`aq_companies.db`), BOL documents, exports, invoices | **NEVER DELETED** |
| `%LOCALAPPDATA%\AQ COMPANIES\data\backups\` | Automated daily database snapshots | **NEVER DELETED** |
| `%LOCALAPPDATA%\AQ COMPANIES\Logs\` | Rolling system logs for backend and application server | Retained for diagnostics |

---

## 3. Upgrades & In-Place Updates

When updating to a newer release (e.g., v5.1.0 to v5.2.0):
1. Download the new `AQ-COMPANIES-Setup.exe`.
2. Run the installer without uninstalling the previous version.
3. The installer replaces program binaries in `Program Files`.
4. On startup, Alembic migrations run automatically against `%LOCALAPPDATA%\AQ COMPANIES\data\aq_companies.db`, seamlessly migrating tables without losing existing records.

---

## 4. Verification & Diagnostics

### Version Endpoint:
When running, the application exposes:
- **URL**: `http://127.0.0.1:8000/api/v1/version`
- **Payload**:
  ```json
  {
    "app_version": "5.1.0",
    "backend_version": "5.1.0",
    "api_version": "v1",
    "schema_version": "9c12685e0336"
  }
  ```

### Health Check Endpoint:
- **URL**: `http://127.0.0.1:8000/api/v1/health`
- **Payload**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-09-24T...",
    "mode": "standalone"
  }
  ```

### Troubleshooting:
- If the application does not connect to the backend, check `%LOCALAPPDATA%\AQ COMPANIES\Logs\backend.log`.
- To create a manual emergency backup of all data, copy the folder:
  `%LOCALAPPDATA%\AQ COMPANIES\data\` to an external drive or secure cloud storage.
