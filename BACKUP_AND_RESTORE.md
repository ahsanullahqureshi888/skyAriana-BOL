# AQ COMPANIES v5.2.0 — BACKUP & RESTORE ARCHITECTURE MANUAL

## 1. Overview
The AQ Companies Backup & Restore Center is an enterprise-grade data safety, cryptographic verification, and disaster recovery system designed for multi-modal logistics, Bills of Lading (BOL), financial accounting ledgers, and document archives.

---

## 2. Backup Locations & Canonical File Format
- **Primary Storage Path**: `data/backups/` (configurable to external hard drives, network shares, or custom storage in Storage Settings).
- **Format Specification**: Canonical Format 2.0 (see [BACKUP_FORMAT_V2.md](file:///D:/SOFTWARES-APPS/BOL-SOFTWARE-V5/BACKUP_FORMAT_V2.md)).
- **Deterministic Windows-Safe Filenames**:
  - Full System: `AQ_COMPANIES_FULL_BACKUP_YYYY-MM-DD_HHMMSS_v5.2.0.json` (or `.zip`)
  - Safety Rollback Snapshot: `AQ_COMPANIES_PRE_RESTORE_YYYY-MM-DD_HHMMSS.json`
  - Period Close Snapshot: `AQ_COMPANIES_PRE_PERIOD_CLOSE_YYYY-MM.json`
  - Post-Restore Verified: `AQ_COMPANIES_POST_RESTORE_VERIFIED_YYYY-MM-DD_HHMMSS.json`
  - Incremental Delta: `AQ_COMPANIES_INCREMENTAL_BACKUP_YYYY-MM-DD_HHMMSS_v5.2.0.json`
- **Catalog Database**: `.local-backups-catalog.json` records SHA-256 digests, entity counts, verification status, and notes.

---

## 3. Security Hardening & Attack Vector Defense

| Security Vector | Defense Mechanism | Enforcement |
| :--- | :--- | :--- |
| **Path Traversal (Zip-Slip)** | Blocks entries with `../`, `..\`, absolute paths (`/`, `\`), drive letters (`C:`), UNC paths (`\\`), and null bytes (`\0`). | Native extraction validation |
| **Executable/Script Execution** | Rejects archives containing `.exe`, `.bat`, `.ps1`, `.sh`, `.js`, `.vbs`, `.msi`, `.dll`, `.hta`. Backups contain DATA only. | Strict extension blocklist |
| **Untrusted SVGs** | Parses SVG attachments for `<script>`, `javascript:`, `onload=`, `onerror=`. | Inspection prior to disk write |
| **ZIP Bomb Protection** | Enforces maximum uncompressed size (500 MB), file count (5,000 files), single file (100 MB), and ratio (100:1). | Pre-extraction size checks |
| **Prototype Pollution** | Recursively audits JSON payloads for `__proto__`, `constructor`, `prototype`. | Throws on malicious keys |
| **Extreme Numbers** | Detects and flags `NaN`, `Infinity`, `-Infinity`, corrupted gross weights (`1.1e16`), and concatenated counts (`1114257184259 CTNS`). | Pre-restore sanity gate |

---

## 4. The 8-Step Canonical Restore Wizard

Every restore in AQ Companies proceeds through a structured, reversible 8-step pipeline:

1. **Step 1: Choose File** — Select an existing backup from catalog or upload `.json` / `.zip`.
2. **Step 2: Verify** — Computes SHA-256, verifies manifest, and inspects file integrity.
3. **Step 3: Preview** — Runs zero-write dry run, showing Current vs Backup vs After Merge diffs.
4. **Step 4: Choose Restore Mode** — Select **Merge Safely** (idempotent), **Replace Data** (requires `"RESTORE"` phrase), or **Selective**.
5. **Step 5: Review Conflicts** — Inspect categorized conflicts (`FINANCIAL_CONFLICT`, `FIELD_CONFLICT`, `IDENTITY_CONFLICT`). Financial conflicts block auto-resolution.
6. **Step 6: Confirm** — Generates an automated, immutable `PRE_RESTORE` safety snapshot.
7. **Step 7: Restore** — Transactional restoration with atomic file replacement and orphan attachment quarantine.
8. **Step 8: Verify** — Strict post-restore Accounting Invariance validation ($\text{Debit} - \text{Credit} = \text{Net Balance}$), in-memory cache reset, and audit report generation (`.json` & `.html`).

---

## 5. Concise User Guide

### How to Make a Backup
1. Go to **Backup & Restore Center** $\rightarrow$ click **Create Backup**.
2. Select **Full Backup** (Recommended) or **Data-Only**.
3. (Optional) Toggle **Include Attachments** to bundle PDF scans into a `.zip` archive.
4. Add an optional operator note (e.g., *"Before Year-End Closing"*).
5. Click **Create Backup**. The system atomically creates and verifies the file.

### How to Restore a Backup
1. Go to **Backup & Restore Center** $\rightarrow$ click **Restore Backup**.
2. Select a backup from history or upload a backup file.
3. Review the **Dry Run Preview** comparison table.
4. Choose **Merge** or **Replace**.
5. Click **Proceed with Restore**. The system creates an automatic pre-restore rollback snapshot before modifying any data.

### How to Test a Backup (Restore Simulation)
1. Go to **Backup & Restore Center** $\rightarrow$ click **Simulate Restore**.
2. Select the backup point.
3. The system restores data into an isolated temporary database, checks all record counts, audits ledger invariance, and destroys the sandbox.
4. A verified test marks the backup with a **"Golden Backup / Restore Tested ✓"** badge.

### How to Recover After a System Crash
1. If the database was corrupted or damaged, AQ Companies opens automatically in **System Recovery Mode**.
2. The damaged files are quarantined safely into `data/recovery/CORRUPT_DATABASE_<timestamp>/`.
3. The system scans the backup folder directly from disk without needing database catalog files.
4. Select the **Recommended Recovery Point** and click **[ Recover System ]**.
5. An atomic database switch restores operations in seconds.

### How to Move to a New Computer
1. Create a **Full Backup** with attachments on the old computer.
2. Copy the resulting file to a USB drive.
3. On the new computer, open AQ Companies $\rightarrow$ **Backup & Restore Center** $\rightarrow$ **Restore Backup**.
4. Upload the backup file.
5. All relative attachment paths and records automatically rebind to the new computer's user profile path.
6. Select **Replace Existing Data**, type `"RESTORE"`, and click confirm.

---

## 6. Retention Policy Rules
- **Daily Backups**: 7 most recent retained.
- **Weekly Backups**: 4 most recent retained.
- **Monthly Backups**: 12 most recent retained.
- **Permanent Exemption**: Backups marked **"Known Good / Golden Backup"**, **"Pinned"**, **"Period Close"**, and the **Last Verified Backup** are never deleted by automated retention.

---

## 7. Data Protection Operations & Health Monitoring (Phase 4)
- **Compact Operational Dashboard**: Continuously computes deterministic protection status: `STRONGLY PROTECTED`, `PROTECTED`, `WARNING`, `AT RISK`.
- **Tri-Level Verification**: Quick Verify (daily/post-backup), Deep Verify (weekly), Isolated Recovery Drill (monthly).
- **Hard Safety Gate**: All recovery drills run in isolated sandbox databases and are strictly barred from modifying production data.
- **Tamper Detection**: Cryptographic checksum comparison flags modified or corrupted files immediately.
- **Disk Catalog Discovery**: Direct folder scans rebuild lost catalog indexes idempotently without duplication.
- **Single Catch-Up Policy**: If scheduled backups are missed while the machine was powered off, exactly one catch-up backup executes on startup.
- See detailed operational procedures in [docs/BACKUP_OPERATIONS.md](file:///D:/SOFTWARES-APPS/BOL-SOFTWARE-V5/docs/BACKUP_OPERATIONS.md).
