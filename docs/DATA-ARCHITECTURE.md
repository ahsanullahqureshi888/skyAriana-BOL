# Sky Ariana BOL — Data Architecture & LAN Server Infrastructure

## Overview

Sky Ariana BOL provides an enterprise-grade local network architecture that allows one designated Main Windows PC to serve as the central database and API server for multiple client workstations across an office LAN, without requiring external cloud databases or Google Drive for live operational data.

```
                  ┌─────────────────────────────────────────┐
                  │          MAIN SERVER PC                 │
                  │   C:\ProgramData\SkyArianaBOL\          │
                  │   • database/ (OCC, Invariance Audited) │
                  │   • backups/ (Automated ZIP Snapshots)  │
                  │   • logs/ (Append-Only audit.jsonl)     │
                  │   • config/ (Server & Device Registry)  │
                  │   • documents/                          │
                  │                                         │
                  │   API Service (Port 8000 / 0.0.0.0)     │
                  └──────────────────┬──────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │ HTTP/HTTPS API (Bearer Token Auth)    │
                 │ Pairing: SKY-XXXX-XXXX (15-min TTL)   │
                 └───────────────────┬───────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│   CLIENT PC 1    │        │   CLIENT PC 2    │        │   CLIENT PC 3    │
│  (Accounting)    │        │   (Operations)   │        │     (Viewer)     │
│  • API Client    │        │  • API Client    │        │  • API Client    │
│  • Offline Queue │        │  • Offline Queue │        │  • Read-only     │
└──────────────────┘        └──────────────────┘        └──────────────────┘
```

---

## 1. Storage Layout & Path Isolation

Central business data is stored exclusively on the host PC's local volume under:
```
C:\ProgramData\SkyArianaBOL\
├── config\
│   ├── server.json        # Port, mode, host, server name
│   ├── admin.json         # PBKDF2-SHA512 password & credentials
│   ├── devices.json       # Trusted client device pairing table
│   └── sessions.json      # Active authorization tokens
├── database\
│   ├── bols.json          # Bills of Lading records
│   ├── invoices.json      # Commercial Invoices & fee demarcation
│   ├── accounts.json      # Client & partner company records
│   ├── account-ledgers.json # Financial statements & double-entry records
│   ├── shipments.json     # Tracking and customs border checkpoints
│   └── counters.json      # Atomic sequences for BOL, INV, and TX IDs
├── backups\
│   └── Sky-Ariana-Server-Backup-YYYY-MM-DD-HHmmss.zip
├── logs\
│   └── audit.jsonl        # Immutable append-only audit trail
├── documents\             # Generated PDF contracts, stickers, and invoices
└── uploads\               # Uploaded stamps, signatures, and receipts
```

Override environment variable: `SKY_DATA_DIR` or `SKY_SERVER_DATA_DIR`.

---

## 2. Windows Network Sharing Prohibition

> [!CAUTION]
> **Strict Prohibition on Windows File Shares (UNC / SMB)**
> Never share `C:\ProgramData\SkyArianaBOL\` over Windows Network Sharing (`\\OFFICE-PC\...`).
> Direct SQLite, JSON, or filesystem access across SMB leads to opportunistic locks (oplocks) breaking, silent file corruption, and race conditions during concurrent multi-user access.
> **All workstations must communicate strictly through the Sky Ariana HTTP/HTTPS API service.**

The database engine explicitly asserts that paths do not begin with `\\`, `//`, or `smb:`:
```typescript
assertSafeLocalPath(targetPath)
```

---

## 3. Concurrency & Optimistic Locking (OCC)

To guarantee zero data clobbering when multiple users view or edit the same shipment or invoice:
1. Every record contains an integer `version` field (starting at `1`).
2. When a client modifies a document, it submits `{ ...record, expectedVersion }`.
3. If another workstation modified the record concurrently, the server detects `currentVersion !== expectedVersion` and rejects the mutation with **HTTP 409 Conflict**:
   ```json
   {
     "error": "ConflictError",
     "statusCode": 409,
     "currentVersion": 4,
     "submittedVersion": 3,
     "message": "Record BOL-2026-NSA471 has been modified by another session."
   }
   ```
4. Client PC presents a side-by-side reconciliation dialog.

---

## 4. Accounting Invariance Identity

All ledger modifications, invoice receipts, and currency settlements must satisfy:
$$\text{Net Balance} = \text{Total Debit} - \text{Total Credit}$$

Before persisting any updates to `account-ledgers.json`:
- `validateLedgerInvariance(proposedStore)` computes all account debits, credits, and running balance sequences.
- If any discrepancy is detected, the transaction is rejected atomically with an invariant failure notice.

---

## 5. Atomic Sequence Generation

Unique identifiers are generated atomically on the Server PC:
- **Bills of Lading**: `BOL-YYYY-NSANNN` (e.g. `BOL-2026-NSA471`) via `getNextServerBolNumber()`.
- **Invoices**: `INV-YYYY-NNNN` (e.g. `INV-2026-0001`) via `getNextServerInvoiceNumber()`.
- **Ledger Transactions**: `TX-<timestamp>-NNNN` via `getNextServerLedgerId()`.

---

## 6. Pairing & Security Model

1. **Pairing Codes**:
   - One-time pairing tokens formatted as `SKY-XXXX-XXXX`.
   - Generated by authenticated Server Admin with an assigned role (`accounting`, `operations`, `viewer`, `admin`).
   - Automatically expire after 15 minutes.
2. **Device Authentication**:
   - Claiming a code issues a cryptographically secure 256-bit Bearer token registered to the client's `deviceId` and MAC/IP.
   - Sessions are validated on each API request.
   - Admin can revoke, block, or delete any client device instantly from the Settings UI.
3. **Password Security**:
   - Password hashing uses Node.js native `pbkdf2Sync` with 120,000 iterations of SHA-512 and unique salts.
   - Default or weak passwords (`admin`, `123456`, `password`, `skyariana`) are rejected on setup.

---

## 7. Automated Backups & Disaster Recovery

- **Format**: Standard ZIP archives containing all database collections, configuration, and manifest checksums.
- **Rollback Protection**: Restoring any backup automatically takes a `pre-restore-safety-snapshot` first. If extraction or data verification fails, the system automatically rolls back to the pre-restore state.
- **Retention**: Automatic retention prunes older archives while retaining the latest 10 backups.
- **Optional Cloud Sync**: Google Drive synchronization remains available as an optional offsite backup tier.
