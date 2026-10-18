# AQ COMPANIES v5.2.0 — BACKUP OPERATIONS & RELIABILITY GUIDE

## 1. Overview & Operational Principles

The AQ Companies Daily Protection & Health Monitoring Engine continuously monitors:
1. Is my latest backup healthy?
2. Can it actually restore?
3. Is backup storage running out?
4. Has a backup silently changed or become corrupted?
5. Is the current database healthy?
6. Are automatic backups still running?
7. When was the last successful recovery drill?
8. Is there a verified recovery point available right now?

---

## 2. Protection Status Indicators & Deterministic Rules

The system calculates operational status deterministically using explicit criteria rather than aesthetic color:

```
┌────────────────────────────────────────────────────────┐
│ DATA PROTECTION                                        │
│                                                        │
│ ✓ STRONGLY PROTECTED / PROTECTED / WARNING / AT RISK  │
│                                                        │
│ Last Verified Backup: Today 11:30 PM                   │
│ Last Restore Test:    Sep 30, 2026 · PASS              │
│ Next Automatic Backup: Tonight 11:30 PM                │
│ Backup Storage:       8.4 GB / 50 GB (Healthy)         │
│ Known Good Points:    3 Verified Recovery Points       │
│ Database Integrity:   Healthy                          │
└────────────────────────────────────────────────────────┘
```

### Status Definitions:

| Status | Exact Deterministic Criteria | System Action |
| :--- | :--- | :--- |
| **STRONGLY PROTECTED** | 1. Recent verified backup within age policy (<24h)<br>2. Recent isolated restore drill passed (<30 days)<br>3. At least 1 Known Good recovery point available<br>4. Storage Healthy (>20% free space)<br>5. Database integrity fully healthy (zero critical issues) | Full peace of mind. Regular scheduled operations continue. |
| **PROTECTED** | 1. Recent verified backup within age policy (<24h)<br>2. Storage Healthy or Warning (>10% free space)<br>3. Database integrity healthy | Safe state. Scheduled jobs running normally. |
| **WARNING** | 1. Backup age exceeds warning policy (24h–72h old)<br>2. No recent recovery drill conducted in past 30 days<br>3. Backup volume low on space (10%–20% remaining)<br>4. Non-critical database issues or data quality warnings | Yellow top bar badge. Operator prompted to run a backup, recovery drill, or review storage. |
| **AT RISK** | 1. No verified backup exists on disk<br>2. Backup age exceeds critical policy (>72 hours old)<br>3. Backup location or external drive disconnected / unavailable<br>4. Last recovery drill failed validation<br>5. Database writable check failed / critical storage error<br>6. Checksum tamper detected on disk | Red top bar badge. Immediate operator action required to create backup, reconnect storage, or diagnose failure. |

---

## 3. The 3 Tiers of Backup Verification

AQ Companies distinguishes between file existence and cryptographic reliability:

| Tier | Name | Scope & Checks | Execution Frequency |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **Quick Verify** | Checks file existence, envelope metadata, size, manifest, and recalculates SHA-256 digest. Detects tamper modifications on disk. | Immediate post-backup and daily scanner |
| **Tier 2** | **Deep Verify** | Unpacks and parses data payload, checks schema versions, validates foreign key and BOL relational references, and audits ledger invariance without restoring. | Weekly automated check or on-demand |
| **Tier 3** | **Isolated Restore Drill** | Full transactional restoration into temporary test sandbox (`data/recovery/drill-<id>`). Tests accounting invariance ($\text{Debit} - \text{Credit} = \text{Balance}$), cargo consistency, and destroys sandbox. **NEVER TOUCHES PRODUCTION DATABASE.** | Monthly automated drill or on-demand |

---

## 4. Known Good Recovery Points

A recovery point is certified as **Known Good** only when it satisfies all four criteria:
1. **Cryptographic Checksum**: SHA-256 PASS
2. **Schema & Envelope**: PASS
3. **Isolated Restore Test**: PASS
4. **Accounting Invariance**: PASS

### Retention Protection for Known Good Points:
- Automated retention never deletes the latest Known Good and previous Known Good recovery points.
- Older Known Good points are preserved unless manually unpinned by a System Administrator.

---

## 5. Daily Operations & How-To Guide

### How to Run "Backup Now"
1. In the **Data Protection Card** or top bar, click **[ Backup Now ]**.
2. The system estimates storage capacity before starting.
3. If free space is sufficient, an atomic full system backup is written, verified with SHA-256, and recorded in the catalog.

### How to Run an Isolated Recovery Drill
1. On the **Data Protection Card**, click **[ Recovery Drill ]** (or **Simulate Restore**).
2. The drill runs in a private temporary sandbox directory.
3. Strict safety gate: If the sandbox directory ever targets the active production database, the runner throws `FATAL_SAFETY_VIOLATION` and immediately aborts.
4. When finished, all temporary files are completely destroyed, and results are recorded in the verification history.

### What Happens If the Backup Drive is Missing or Disconnected?
1. The system detects directory unreachability and immediately marks status as **AT RISK**.
2. The message **"BACKUP LOCATION UNAVAILABLE"** is displayed in the dashboard and alerts drawer.
3. The system **never silently redirects** backups to an unintended drive.
4. When the external drive or network share is reconnected, click **[ Rebuild Catalog from Disk ]** or create a backup to resume normal protection status.

### How to Handle Missed Backups (Single Catch-Up Policy)
- If the computer was powered off during the daily scheduled backup (e.g., 11:30 PM), on the next startup the monitor detects the missed window.
- The system executes **exactly ONE catch-up backup** (never 10 back-to-back jobs).
- Once the catch-up completes, the operational status returns to **PROTECTED**.

### How to Export the System Health Audit Report
1. Click **[ Export Health Report ]** on the technical toolbar.
2. The system generates:
   - `AQ_BACKUP_HEALTH_REPORT.json`: Machine-readable audit payload.
   - `AQ_BACKUP_HEALTH_REPORT.html`: Formatted printable executive dashboard.
3. **Security Guarantee**: Reports contain zero passwords, API tokens, secret keys, or database credentials.
