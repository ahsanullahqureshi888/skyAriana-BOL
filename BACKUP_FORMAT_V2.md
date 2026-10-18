# AQ COMPANIES v5.2.0 — Canonical Backup Format Specification (Version 2.0)

**Format Version:** `2.0`  
**Application Version:** `5.2.0`  
**Database Schema Version:** `2`  
**Standard Status:** Production Canonical Standard

---

## 1. Overview & Principles

The AQ Companies Backup Format 2.0 provides a crash-proof, cryptographically verifiable, self-describing, and tamper-evident archive format for enterprise logistics, multi-currency accounting ledgers, and document attachments.

### Core Architectural Principles
1. **Self-Describing**: A backup file contains complete structural metadata, schema declarations, and entity relationships inside the package itself. It can be fully inspected, verified, and restored even if the AQ Companies database, history catalog, or local cache is missing or corrupt.
2. **Two Packaging Modes**:
   - **JSON Envelope (`.json`)**: A single atomic, human-readable, self-contained JSON document containing metadata and serialized tables.
   - **ZIP Container (`.zip`)**: A standard, deflate-compressed archive containing `metadata.json`, `database.json`, `manifest.json`, and an `attachments/` directory for binary documents.
3. **Dual-Level Cryptographic Checksums**:
   - Level 1: SHA-256 checksum over the entire data payload or composite archive.
   - Level 2: Individual SHA-256 checksums per binary file declared in `manifest.json`.
4. **Data Isolation (Never Execute Data)**:
   - Backup files contain data only. Executable code (`.exe`, `.bat`, `.ps1`, `.sh`, `.js`, etc.) and untrusted SVG scripts are strictly rejected upon extraction.
5. **Historical Provenance Guarantee**:
   - Preserves historical customs provenance (Barnama `#051`, source archive files, page numbers, serial numbers, review flags) without synthetic overwriting.

---

## 2. JSON Envelope Format (Data-Only / Snapshots)

For single-file backups and snapshots, the file structure is:

```json
{
  "backupMetadata": {
    "application": "AQ COMPANIES",
    "backupFormatVersion": "2.0",
    "applicationVersion": "5.2.0",
    "schemaVersion": "2",
    "backupId": "AQ-BKP-1791028300000-A1B2C3",
    "backupType": "full",
    "createdAt": "2026-10-03T11:45:00.000Z",
    "createdBy": "System Admin",
    "note": "Pre-Closing Verified Baseline",
    "protected": true,
    "isGoldenBackup": true,
    "restoreTestStatus": "PASS",
    "checksum": "98b4fd0a6f1b32e1858a741300977824df997e20ec4e26eb847a95079a0e67e3",
    "recordCounts": {
      "bols": 198,
      "shipments": 198,
      "containers": 42,
      "companies": 92,
      "accounts": 92,
      "invoices": 140,
      "ledgerEntries": 1280,
      "payments": 95,
      "supplierBills": 80,
      "supplierCosts": 120,
      "supplierPayments": 75,
      "documents": 473,
      "tasks": 30,
      "alerts": 12,
      "approvals": 8,
      "users": 15,
      "roles": 5,
      "auditLogs": 520,
      "totalRecords": 3180
    },
    "financialTotals": [
      {
        "currency": "USD",
        "totalDebit": 13203040.85,
        "totalCredit": 11450200.00,
        "netBalance": 1752840.85,
        "balanced": true
      },
      {
        "currency": "AFN",
        "totalDebit": 45000000.00,
        "totalCredit": 38500000.00,
        "netBalance": 6500000.00,
        "balanced": true
      }
    ],
    "invarianceValid": true,
    "completenessScore": 100,
    "warnings": [],
    "includedModules": ["all"]
  },
  "data": {
    "bols": [ /* canonical BOL records */ ],
    "shipments": [ /* shipment records */ ],
    "accounts": [ /* account records */ ],
    "accountLedgers": { /* ledger dictionaries keyed by account */ },
    "invoices": [ /* invoice records */ ],
    "settings": { /* configuration snapshot */ }
  }
}
```

---

## 3. ZIP Archive Container Specification

When binary attachments are included, the backup is encapsulated in a ZIP container:

```
AQ_COMPANIES_FULL_BACKUP_2026-10-03_120000_v5.2.0.zip
├── metadata.json           # Backup envelope metadata and statistics
├── database.json           # All relational tables serialized canonically
├── manifest.json           # File manifest with SHA-256 and entity links
└── attachments/            # Binary documents (PDFs, scans, invoices)
    ├── BOL-2026-NSA643_Customs_Declaration.pdf
    ├── BOL-2026-NSA501_CMR_Stamp.pdf
    └── INV-2026-001_Payment_Receipt.pdf
```

### `manifest.json` Schema
```json
{
  "manifestVersion": 2,
  "backupId": "AQ-BKP-1791028300000-A1B2C3",
  "backupFormatVersion": "2.0",
  "applicationVersion": "5.2.0",
  "createdAt": "2026-10-03T11:45:00.000Z",
  "entries": [
    {
      "relativePath": "metadata.json",
      "fileSize": 1420,
      "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "category": "metadata"
    },
    {
      "relativePath": "database.json",
      "fileSize": 1485290,
      "checksum": "98b4fd0a6f1b32e1858a741300977824df997e20ec4e26eb847a95079a0e67e3",
      "category": "database"
    },
    {
      "relativePath": "attachments/BOL-2026-NSA643_Customs_Declaration.pdf",
      "fileSize": 348210,
      "checksum": "a7b8c9d0e1f2...",
      "category": "attachment",
      "entityRelation": {
        "entityType": "BOL",
        "entityId": "550e8400-e29b-41d4-a716-446655440000",
        "bolNumber": "BOL-2026-NSA643"
      }
    }
  ],
  "totalFiles": 3,
  "totalSizeBytes": 1834920,
  "compositeChecksum": "98b4fd0a6f1b32e1858a741300977824df997e20ec4e26eb847a95079a0e67e3"
}
```

---

## 4. Security Hardening & Resource Limits

| Vector | Security Guard | Limit |
| :--- | :--- | :--- |
| **Path Traversal (Zip-Slip)** | Rejects `..`, `../`, `..\`, absolute paths (`/`), Windows drive letters (`C:`), UNC paths (`\\`), and null bytes (`\0`). | Mandatory rejection |
| **Executable/Script Content** | Rejects `.exe`, `.bat`, `.cmd`, `.ps1`, `.sh`, `.vbs`, `.js`, `.mjs`, `.cjs`, `.com`, `.scr`, `.msi`, `.dll`, `.wsf`, `.hta`. | Strictly forbidden |
| **Untrusted SVGs** | Inspects for embedded `<script>`, `javascript:`, `onload=`, `onerror=` attributes. | Rejection on script detection |
| **ZIP Bomb (Decompression Overflow)** | Guards against excessive expansion ratio (>100:1) and overall archive expansion. | Max 500 MB uncompressed |
| **File Count Limit** | Guards against archive resource exhaustion. | Max 5,000 files |
| **Single File Size** | Maximum allowed size for any individual attachment. | Max 100 MB per file |
| **Prototype Pollution** | Recursively scans JSON payloads for `__proto__`, `constructor`, or `prototype` keys. | Blocked prior to normalization |

---

## 5. Accounting Invariance Identity

All financial ledger entries, balance reconciliations, and restore verification gates must satisfy:
$$\text{Net Balance} = \text{Total Debit} - \text{Total Credit}$$

Discrepancies exceeding $0.01$ trigger a **FINANCIAL_CONFLICT** and unconditionally block automated resolution, requiring operator intervention.

---

## 6. Historical BOL Provenance Preservation

Historical imported BOLs are guaranteed lossless round-tripping:
- **`bolNumber`**: Canonical business key (`BOL-2026-NSA643` or `HIST-051`).
- **`id`**: Deterministic UUID distinctly separated from `bolNumber`.
- **`barnama`**: Preserves original Barnama (`#051`) without rewriting to modern NSA sequence.
- **`sourceFile`**: Original archive source filename (`2024_Herat_Customs_Archive.pdf`).
- **`sourcePage`**: Exact page number in the original PDF source.
- **`sourceSerial`**: Original serial number.
- **`reviewStatus`**: Current verification review flag.
- **`driverFreight`**: Preserved as exact decimal amount (`38497`).
- **`driverRentCurrency`**: Preserved as exact currency (`AFN`). Never inferred from amount.
- **`cargoItems`**: Multiple cargo line items remain separate array rows without concatenation.
