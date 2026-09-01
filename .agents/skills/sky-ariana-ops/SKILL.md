---
name: sky-ariana-ops
description: >-
  Manage and automate Sky Ariana BOL operations, multi-device cloud synchronization,
  strict accounting invariance audits (Net Balance = Total Debit - Total Credit),
  Google Cloud Storage snapshot backups, and transfer code administration.
license: Apache-2.0
metadata:
  version: v1
  category: operations
---

# Sky Ariana Operations & Cloud Sync

## Overview
The `sky-ariana-ops` skill provides a unified workflow for managing cross-device synchronization, enforcing strict ledger accounting invariance, backing up snapshots to Google Cloud Storage (GCS), and issuing fast-transfer codes across mobile and desktop devices.

---

## Dependencies
- [`bol-ledger-workflow`](file:///d:/skybalam-26-bol-V3.2/skybalam-26-bol-V3.2/.agents/skills/bol-ledger-workflow/SKILL.md): For parsing and formatting individual BOL and ledger row entries.
- [`google-cloud-storage-basics`](file:///C:/Users/HomePC/.gemini/config/skills/google-cloud-storage-basics/SKILL.md): For GCS bucket lifecycle configuration and signed URLs.
- [`managing-python-dependencies`](file:///C:/Users/HomePC/.gemini/config/skills/managing-python-dependencies/SKILL.md): For execution within the workspace virtual environment (`.venv`).

---

## Quick Start

Run an accounting invariance audit using the CLI:
```bash
.\.venv\Scripts\python.exe .agents/skills/sky-ariana-ops/scripts/sky_ariana_ops_cli.py audit-invariance --strict --output audit_report.json
```

Inspect cloud sync snapshot status:
```bash
.\.venv\Scripts\python.exe .agents/skills/sky-ariana-ops/scripts/sky_ariana_ops_cli.py sync-status --output sync_status.json
```

---

## Utility Scripts

The skill includes the CLI tool located at `scripts/sky_ariana_ops_cli.py`.

### Subcommand Reference

| Subcommand | Required Arguments | Optional Arguments | Description |
|---|---|---|---|
| `audit-invariance` | `--output <file>` | `--data-dir <path>`, `--strict` | Verifies all accounts satisfy $\text{Net Balance} = \text{Total Debit} - \text{Total Credit}$ |
| `sync-status` | `--output <file>` | `--data-dir <path>` | Summarizes local BOLs, Invoices, Ledgers, and active transfer codes |
| `generate-transfer-code` | `--code <str>`, `--output <file>` | `--data-dir <path>` | Registers a new `SKY-XXXX` transfer code in `.local-sync-codes.json` |
| `backup-gcs` | `--output <file>` | `--bucket <str>`, `--data-dir <path>` | Packages snapshot to GCS bucket (`gs://sky-ariana-backups`) |

---

## Accounting Rule Invariance

All ledger records must satisfy the fundamental accounting identity:

$$\text{Net Balance} = \text{Total Debit} - \text{Total Credit}$$

If any running balance or account total deviates by more than $0.05, the `audit-invariance` command with `--strict` will exit with code 1 to prevent corrupt state synchronization.

---

## Concurrency & File Output Rules

1. All commands MUST write structured results to a file via `--output <path.json>`.
2. Output files are formatted with 2-space indentation to optimize token efficiency and prevent stdout buffer truncation.
3. Python executions should use `.\.venv\Scripts\python.exe` or `uv run`.

---

## Common Mistakes

1. **Attempting to sync or export without auditing invariance first**:
   - Always run `audit-invariance --strict` before generating production exports or broadcasting to cloud relays.
2. **Hardcoding numerical transfer codes without aliases**:
   - The CLI automatically indexes both `4440` and `SKY-4440` so mobile users can type numbers without prefixes.
3. **Executing Python tools with global python**:
   - Always use the workspace interpreter `.\.venv\Scripts\python.exe`.
