# AQ COMPANIES — Multi-PC Office Network & Central Server Deployment Guide

## 1. Architecture Overview

AQ COMPANIES supports two concurrent operational topologies:

```
                      ┌──────────────────────────────────────┐
                      │      OFFICE CENTRAL SERVER           │
                      │  - PostgreSQL 15/16 + Connection Pool│
                      │  - FastAPI Backend (Port 8000)       │
                      │  - Automated Timestamped Backups     │
                      └──────────────────┬───────────────────┘
                                         │ LAN (HTTP/HTTPS)
                 ┌───────────────────────┼───────────────────────┐
                 │                       │                       │
      ┌──────────▼──────────┐ ┌──────────▼──────────┐ ┌──────────▼──────────┐
      │  Workstation PC 1   │ │  Workstation PC 2   │ │  Workstation PC 3   │
      │  (Accountant)       │ │  (Operations)       │ │  (Executive)        │
      │  Mode: Server       │ │  Mode: Server       │ │  Mode: Server       │
      │  URL: 192.168.1.100 │ │  URL: 192.168.1.100 │ │  URL: 192.168.1.100 │
      └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

- **Local Offline Mode (Single PC)**: Electron spawns the bundled `resources/backend/aq-backend.exe` pointing to local SQLite with WAL mode. Ideal for traveling laptops or standalone use without network access.
- **Server Mode (Multi-PC Office Network)**: All client PCs run the packaged `AQ COMPANIES.exe` configured in **Server Mode**. Clients connect exclusively over the local network (LAN) to the central FastAPI service running on the office server. Client PCs never spawn local Python processes and never connect directly to raw database files.
- **Data Safety Mandate**: SQLite databases are **NEVER** shared over SMB/Windows network folders, Dropbox, OneDrive, or Google Drive sync directories to avoid corruption.

---

## 2. Server Installation & Configuration

### A. Prerequisites on Office Server Machine
1. **Operating System**: Windows Server 2019/2022 or Windows 10/11 Pro (assigned a static local IP, e.g., `192.168.1.100`).
2. **Database Engine**: PostgreSQL 15 or 16 installed locally.
   - Create a dedicated database: `sky_ariana_db`
   - Create a secure database user: `CREATE USER sky_user WITH PASSWORD 'StrongPasswordHere!';`
   - Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE sky_ariana_db TO sky_user;`
3. **Firewall Rule**: Allow incoming TCP traffic on port `8000` (Private Network only).
   ```powershell
   New-NetFirewallRule -DisplayName "AQ Companies Backend (Port 8000)" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -Profile Private
   ```

### B. Deploying Backend on the Office Server
1. Copy `resources/backend/` (or the installation folder) to `C:\AQ-Companies-Server\`.
2. Create an environment configuration file `C:\AQ-Companies-Server\.env`:
   ```env
   APP_ENV=production
   HOST=0.0.0.0
   PORT=8000
   DATABASE_URL=postgresql+asyncpg://sky_user:StrongPasswordHere!@127.0.0.1:5432/sky_ariana_db
   CORS_ORIGINS=["*"]
   MAINTENANCE_MODE=false
   ```
3. Run database migrations to provision tables, indexes, and initial sequence counters:
   ```cmd
   cd C:\AQ-Companies-Server
   aq-backend.exe --host 0.0.0.0 --port 8000
   ```
   *(Optional)* To run as an automatic Windows Service, use [NSSM (Non-Sucking Service Manager)](https://nssm.cc/):
   ```cmd
   nssm install AQCompaniesBackend C:\AQ-Companies-Server\aq-backend.exe --host 0.0.0.0 --port 8000
   nssm start AQCompaniesBackend
   ```

### C. Migrating Existing Data from SQLite to PostgreSQL
If your office previously used local SQLite (`sky_ariana.db`):
1. Stop any active client instances.
2. Run the verified migration utility:
   ```cmd
   python scripts/migrate_sqlite_to_postgres.py --sqlite sky_ariana.db --postgres postgresql://sky_user:StrongPasswordHere!@127.0.0.1:5432/sky_ariana_db
   ```
   The utility will:
   - Create a timestamped pre-migration backup (`sky_ariana_backup_YYYYMMDD_HHMMSS.db`).
   - Copy all tables in topological foreign-key order.
   - Align auto-increment sequences and reset `sequence_counters` to max values.
   - Audit and verify mathematical Accounting Invariance ($\text{Net Balance} = \text{Total Debit} - \text{Total Credit}$) with 0.00 discrepancy.

---

## 3. Workstation Client PC Setup

### A. Installing Client Software
1. Distribute the standalone installer:
   ```
   release/AQ-COMPANIES-Setup.exe
   ```
2. Run the installer on each office workstation PC.
   - No Python, Node.js, or development dependencies required.
   - The setup installs to `%LOCALAPPDATA%\Programs\AQ COMPANIES` and creates a desktop shortcut.

### B. Connecting Client to Central Server
1. Launch **AQ COMPANIES** from the desktop shortcut.
2. Navigate to **Settings** (`⚙️`) in the left navigation bar.
3. Open the **Server Connection** tab.
4. Toggle connection mode from `Local Offline Mode` to **Central Server (Multi-PC)**.
5. Enter the Server IP and Port:
   - **Server Host**: `192.168.1.100` (or server LAN hostname)
   - **Port**: `8000`
   - **Protocol**: `HTTP` (or `HTTPS` if reverse-proxy SSL configured)
6. Click **Test Server Connection**.
   - The test tool pings `/api/v1/system/server-status` and measures real-time latency (e.g., `⚡ 3 ms`).
7. Click **Save & Apply Configuration**.
8. The header pill instantly updates from `LOCAL` to:
   ```
   🟢 SERVER (3 ms)
   ```

---

## 4. Concurrency Safety & Invariants

| Feature | Local Mode | Server Mode |
| :--- | :--- | :--- |
| **Storage Backend** | SQLite (WAL mode, PRAGMA foreign_keys = ON) | PostgreSQL 15/16 with QueuePool (pool_size=10, max_overflow=20) |
| **Sequence Numbering** | In-memory atomic locks + counter files | Row-level locking on `sequence_counters` via `SELECT ... FOR UPDATE` |
| **Optimistic Concurrency** | Local revision verification | `revision` column check; returns `HTTP 409 Conflict` on concurrent edit collision |
| **Accounting Invariance** | Verified before write ($\text{Balance} = \text{Debit} - \text{Credit}$) | Strictly enforced on both transaction level and general ledger models |
| **Maintenance Lockout** | N/A | Server responds with `HTTP 503 Maintenance Mode` during automated backup/migrations |

---

## 5. Maintenance & Disaster Recovery

### Creating a Server Backup
```powershell
# Automated daily PostgreSQL dump
pg_dump -U sky_user -d sky_ariana_db -F c -b -v -f "C:\Backups\sky_ariana_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump"
```

### Emergency Server Health Check
To check server status from any browser or terminal on the office network:
```cmd
curl http://192.168.1.100:8000/api/v1/system/server-status
```
Expected response:
```json
{
  "status": "healthy",
  "server_name": "AQ COMPANIES Central Office Server",
  "version": "5.1.0",
  "minimum_client_version": "5.0.0",
  "connection_mode": "server",
  "database_type": "postgresql",
  "maintenance_mode": false,
  "uptime_seconds": 86400,
  "server_time": "2026-09-28T12:00:00Z"
}
```
