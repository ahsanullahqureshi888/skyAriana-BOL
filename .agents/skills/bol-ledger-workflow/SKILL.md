---
name: bol-ledger-workflow
description: >-
  Manage, validate, inspect, and summarize Bill of Lading (BOL) entries, Account
  Ledgers, and Invoices. Use when verifying ledger balance consistency, parsing
  or formatting shipment records, inspecting local JSON/SQLite snapshots, or
  troubleshooting Pashto/English ledger export data.
---

# Bill of Lading (BOL) & Account Ledger Workflow

## Overview
This skill provides complete operational guidance and automated CLI tooling for managing, validating, inspecting, and exporting Bill of Lading (BOL) records, Account Ledgers, and Invoices in the Sky Ariana logistics system.

It enables agents to:
1. **Audit & Validate**: Ensure financial consistency (Debit vs. Credit = Running Balance) and verify schema completeness across `.local-bols.json`, `.local-account-ledgers.json`, `.local-bol-account-ledgers.json`, and `.local-invoices.json`.
2. **Inspect Records**: Cross-reference BOL numbers across shipments and client ledger accounts.
3. **Generate Summaries**: Produce instant financial health overviews, top debtor accounts, and recent shipment records.
4. **Format & Export**: Generate clean bilingual (English & Pashto) ledger tables with accurate column merging and RTL configurations.

---

## Dependencies
- **Python 3.8+** (standard libraries: `argparse`, `json`, `pathlib`, `re`, `datetime`).
- **Workspace Data Files**:
  - `.local-bols.json`
  - `.local-account-ledgers.json`
  - `.local-bol-account-ledgers.json`
  - `.local-invoices.json`

---

## Quick Start

### 1. Validate Data Integrity
Run a strict validation check on all local data snapshots:
```bash
python .agents/skills/bol-ledger-workflow/scripts/bol_ledger_cli.py validate --strict --output validation_report.json
```

### 2. Generate Account & Ledger Summary
Extract top accounts by outstanding balance and recent BOL shipments:
```bash
python .agents/skills/bol-ledger-workflow/scripts/bol_ledger_cli.py summary --limit 10 --output ledger_summary.json
```

### 3. Inspect a Specific BOL
Look up a BOL by number or ID and find all associated ledger records:
```bash
python .agents/skills/bol-ledger-workflow/scripts/bol_ledger_cli.py inspect-bol --bol-no "BOL-2026-NSA513" --output bol_details.json
```

### 4. Export Formatted Account Ledger
Generate a markdown table with bilingual headers for an account:
```bash
python .agents/skills/bol-ledger-workflow/scripts/bol_ledger_cli.py export-ledger --account-id "NAJEB AMIN LTD" --format markdown --output najeb_amin_ledger.md
```

---

## Utility Scripts

The skill includes the CLI tool located at `scripts/bol_ledger_cli.py`.

### Subcommand Reference

| Subcommand | Required Arguments | Optional Arguments | Output Description |
|---|---|---|---|
| `validate` | `--output <file>` | `--data-dir <path>`, `--strict` | JSON report of checked files, errors, and warnings |
| `summary` | `--limit <int>`, `--output <file>` | `--data-dir <path>` | JSON report with totals, top debtors, recent BOLs |
| `inspect-bol` | `--bol-no <id>`, `--output <file>` | `--data-dir <path>` | Full BOL data object and related ledger links |
| `export-ledger`| `--account-id <id>`, `--output <file>`| `--format <json\|markdown>`, `--data-dir <path>` | Formatted ledger with running balances & Pashto labels |

---

## Workflow Guide

### Step 1: Ingesting or Modifying Ledger Entries
1. Verify the account name or ID against `.local-account-ledgers.json` (`accounts` array).
2. Calculate the updated running balance:
   $$\text{New Balance} = \text{Previous Balance} + \text{Debit} - \text{Credit}$$
3. When referencing a BOL, link the `barnamehNo` or `billOfLanding` to the exact BOL number from `.local-bols.json`.

### Step 2: Preparing Ledger Tables for UI or Print
1. Reference `references/pashto_labels.json` for canonical Pashto text strings.
2. Apply merged column formatting:
   - **B/L & Consignee**: Display both `billOfLanding` and `consignee` in a stacked format.
   - **Container**: Stack `containerType`, `containerNo`, and `containerDetails`.
   - **Driver Freight**: Attach `driverRent` to the shipment row.
3. Ensure RTL text direction (`dir="rtl"`) is applied to Pashto columns (`مسلسل شمېره`, `تاریخ`, `لېږدونکی / تفصیل`, etc.).

---

## Rate Limiting & Concurrency Safety
- All operations read and write structured JSON snapshots with atomic file handles.
- Output files are formatted with 2-space indentation to optimize token efficiency and prevent stdout buffer truncation.

---

## Common Mistakes

1. **Calculating Balances Manually Without Chronological Sorting**:
   - Ledger entries must always be processed in chronological order (`date` ascending) to ensure accurate cumulative balances.
2. **Corrupted Pashto Unicode in Labels**:
   - Never use placeholder question marks or ASCII approximations for RTL labels. Always use the canonical Unicode strings in `references/pashto_labels.json`.
3. **Omitting Required CLI Arguments**:
   - The CLI requires explicit arguments (e.g., `--limit`, `--output`) to prevent silent truncation.
