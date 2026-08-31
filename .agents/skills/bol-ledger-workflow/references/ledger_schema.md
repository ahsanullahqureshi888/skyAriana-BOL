# BOL & Account Ledger Data Dictionary & Schema Reference

## Overview
This document defines the schema rules, field mappings, calculations, and data consistency invariants used across the Sky Ariana BOL & Ledger application.

---

## 1. File Storage Architecture

| File | Purpose | Storage Key / Format |
|---|---|---|
| `.local-bols.json` | Master list of all Bill of Lading records | Array of `BOLRecord` objects |
| `.local-account-ledgers.json` | Customer & Company Account Ledgers | `{ accounts: string[], ledgerEntries: Record<string, LedgerEntry[]> }` |
| `.local-bol-account-ledgers.json` | BOL-specific Account Ledgers mapped to companies | `{ customCompanies: string[], ledgerRecords: Record<string, BOLLedgerEntry[]> }` |
| `.local-invoices.json` | System-wide generated invoices | Array of `InvoiceRecord` objects |
| `.local-full-snapshot.json` | Complete unified snapshot for offline/backup syncing | Full multi-table snapshot object |

---

## 2. BOL Record Schema (`BOLRecord`)

| Field | Type | Description / Format |
|---|---|---|
| `id` / `bol_number` | `string` | Unique identifier (e.g. `BOL-2026-NSA513`) |
| `truck_number` | `string` | Afghan/Iranian truck plate (e.g. `71731کابل`) |
| `driver_name` | `string` | Driver full name (Persian/Pashto or English) |
| `driver_father_name`| `string` | Driver's father name |
| `driver_contact` | `string` | Phone contact (e.g. `0706239841`) |
| `driver_rent` | `string` | Freight fee with currency (e.g. `38,500 - AFN`) |
| `shipper_name` | `string` | Shipper company or person name |
| `consignee_name` | `string` | Consignee company or person name |
| `cargo_description` | `string` | Detailed cargo description |
| `net_weight` | `string` | Net weight with unit (e.g. `25,443 KG`) |
| `gross_weight` | `string` | Gross weight with unit |
| `number_of_packages`| `string` | Package count & type (e.g. `514- CTNS`) |
| `kgs_per_carton` | `string` | Weight per package (e.g. `49.5`) |
| `rate_per_kgs` | `string` | Shipping rate per kilogram |
| `goods_value` | `string` | Declared cargo value (USD) |
| `issue_date` | `string` | Gregorian ISO date (`YYYY-MM-DD`) |
| `persian_date` | `string` | Solar Hijri (Shamsi) formatted date (e.g. `۴ شهریور ۱۴۰۵`) |
| `routes` | `Array` | Ordered list of stops `{ id, location, locationPersian, stopOrder, transportMode, stopLabel }` |

---

## 3. Account Ledger Entry Schema (`LedgerEntry`)

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | UUID identifier |
| `date` | `string` | Yes | Transaction date (`YYYY-MM-DD`) |
| `description` | `string` | Yes | Shipper name or transaction description |
| `billOfLanding` | `string` | Optional | Associated BOL number |
| `consignee` | `string` | Optional | Receiver of goods |
| `containerNo` | `string` | Optional | Container identifier (e.g. `MSCU1234567`) |
| `containerType` | `string` | Optional | Container classification (e.g. `1X40HQ`, `1X20GP`) |
| `debit` | `number` | Yes | Charge / Amount owed by client (USD/AFN) |
| `credit` | `number` | Yes | Payment received from client (USD/AFN) |
| `pdfName` / `pdfFile` | `string` | Optional | Attached document filename |
| `billOfLandingSurrendered`| `boolean` | Optional | Whether B/L is surrendered/released |

---

## 4. Financial Calculations & Rules

### Running Balance Formula
For any sequence of ledger entries sorted chronologically by date:
$$\text{Balance}_0 = \text{Opening Balance}$$
$$\text{Balance}_n = \text{Balance}_{n-1} + \text{Debit}_n - \text{Credit}_n$$

- A **Positive Balance** ($> 0$) indicates the client owes money (receivable).
- A **Negative Balance** ($< 0$) indicates client overpayment or advance deposit.
- A **Zero Balance** indicates account fully settled.

### Currency Handling
- Transactions are primarily recorded in **USD ($)** or **AFN (؋)**.
- When cross-converting, the ledger entry must record `exchangeRate` explicitly to ensure audit traceability.
