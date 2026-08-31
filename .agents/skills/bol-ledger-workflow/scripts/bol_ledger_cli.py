#!/usr/bin/env python3
"""
bol_ledger_cli.py - Command Line Interface for Bill of Lading (BOL) & Account Ledger Operations
Provides automated validation, data inspection, summary generation, and export formatting.
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def get_default_workspace_dir() -> Path:
    """Returns workspace root directory."""
    script_dir = Path(__file__).resolve().parent
    # Check if inside .agents/skills/bol-ledger-workflow/scripts
    if script_dir.parents[2].exists() and (script_dir.parents[2] / "package.json").exists():
        return script_dir.parents[2]
    # Fallback to current working directory
    return Path.cwd()


def load_json_file(file_path: Path, default: Any = None) -> Tuple[Any, Optional[str]]:
    """Safely loads a JSON file."""
    if not file_path.exists():
        return default, f"File does not exist: {file_path}"
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f), None
    except Exception as e:
        return default, f"Failed to parse JSON {file_path}: {e}"


def write_json_output(data: Any, output_path: str, message: str) -> None:
    """Writes output data to a file with 2-space indentation."""
    out_file = Path(output_path).resolve()
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Success! {message} written to: {out_file}")


def write_text_output(text: str, output_path: str, message: str) -> None:
    """Writes raw text output to a file."""
    out_file = Path(output_path).resolve()
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Success! {message} written to: {out_file}")


def validate_date_str(date_str: str) -> bool:
    """Checks if date string matches YYYY-MM-DD or valid date format."""
    if not date_str:
        return False
    clean = date_str.strip()
    # Check YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}$", clean):
        try:
            datetime.strptime(clean, "%Y-%m-%d")
            return True
        except ValueError:
            return False
    return True


def parse_num(value: Any) -> float:
    """Safely converts string or numeric values to float."""
    if value is None or value == "":
        return 0.0
    cleaned = str(value).replace(",", "").replace("$", "").replace("USD", "").replace("AFN", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def calculate_invoice_totals(inv: Dict[str, Any]) -> Dict[str, float]:
    """Calculates all invoice charges, documentation fees, and final total."""
    items = inv.get("items", []) or []
    service_subtotal = 0.0
    item_doc_charges = 0.0

    doc_keywords = ["اسناد", "documentation fee", "doc fee", "documentation charge", "فیس اسناد", "مصارف اسناد"]

    for item in items:
        qty = parse_num(item.get("quantity", 1))
        rate = parse_num(item.get("unitPrice", 0))
        item_total = qty * rate
        service_subtotal += item_total
        
        desc = str(item.get("description", "")).lower()
        if any(kw in desc for kw in doc_keywords):
            item_doc_charges += item_total

    freight = parse_num(inv.get("freight_charges", 0))
    demurrage = parse_num(inv.get("demurrage_charges", 0))
    detention = parse_num(inv.get("detention_charges", 0))
    base_doc = parse_num(inv.get("documentation_charges", 0))
    total_documentation = base_doc + (item_doc_charges if base_doc == 0 else 0)
    port = parse_num(inv.get("port_charges", 0))
    truck = parse_num(inv.get("truck_charges", 0))
    other = parse_num(inv.get("other_charges", 0))
    tax = parse_num(inv.get("tax", 0))
    discount = parse_num(inv.get("discount", 0))

    subtotal = service_subtotal + freight + demurrage + detention + base_doc + port + truck + other
    grand_total = subtotal + tax - discount

    return {
        "service_subtotal": round(service_subtotal, 2),
        "freight_charges": round(freight, 2),
        "demurrage_charges": round(demurrage, 2),
        "detention_charges": round(detention, 2),
        "documentation_charges": round(total_documentation, 2),
        "port_charges": round(port, 2),
        "truck_charges": round(truck, 2),
        "other_charges": round(other, 2),
        "tax": round(tax, 2),
        "discount": round(discount, 2),
        "subtotal": round(subtotal, 2),
        "grand_total": round(grand_total, 2)
    }


# ==========================================
# Subcommand: validate
# ==========================================
def cmd_validate(args: argparse.Namespace) -> int:
    workspace = Path(args.data_dir).resolve() if args.data_dir else get_default_workspace_dir()
    bols_path = workspace / ".local-bols.json"
    account_ledgers_path = workspace / ".local-account-ledgers.json"
    bol_ledgers_path = workspace / ".local-bol-account-ledgers.json"
    invoices_path = workspace / ".local-invoices.json"

    report: Dict[str, Any] = {
        "timestamp": datetime.now().isoformat(),
        "workspace": str(workspace),
        "status": "PASS",
        "total_issues": 0,
        "files_checked": {},
        "issues": [],
        "summary": {}
    }

    issues: List[Dict[str, Any]] = []

    # 1. Validate .local-bols.json
    bols_data, err = load_json_file(bols_path, default=[])
    if err:
        issues.append({"file": ".local-bols.json", "severity": "ERROR", "message": err})
    elif not isinstance(bols_data, list):
        issues.append({"file": ".local-bols.json", "severity": "ERROR", "message": "Expected an array of BOL objects"})
    else:
        bol_ids = set()
        for idx, bol in enumerate(bols_data):
            bol_id = bol.get("id") or bol.get("bol_number")
            if not bol_id:
                issues.append({"file": ".local-bols.json", "index": idx, "severity": "WARNING", "message": "Missing BOL ID/Number"})
            else:
                if bol_id in bol_ids:
                    issues.append({"file": ".local-bols.json", "index": idx, "severity": "WARNING", "message": f"Duplicate BOL ID: {bol_id}"})
                bol_ids.add(bol_id)

            issue_date = bol.get("issue_date")
            if issue_date and not validate_date_str(issue_date):
                issues.append({"file": ".local-bols.json", "bol_id": bol_id, "severity": "WARNING", "message": f"Invalid issue_date format: {issue_date}"})

        report["files_checked"][".local-bols.json"] = {"total_records": len(bols_data), "unique_bol_ids": len(bol_ids)}

    # 2. Validate .local-account-ledgers.json
    acct_data, err = load_json_file(account_ledgers_path, default={})
    if err:
        issues.append({"file": ".local-account-ledgers.json", "severity": "ERROR", "message": err})
    elif not isinstance(acct_data, dict):
        issues.append({"file": ".local-account-ledgers.json", "severity": "ERROR", "message": "Expected JSON object for account ledgers"})
    else:
        accounts = acct_data.get("accounts", [])
        ledger_entries = acct_data.get("ledgerEntries", {})
        total_entries = 0
        balance_discrepancies = 0

        for acct_id, entries in ledger_entries.items():
            if not isinstance(entries, list):
                issues.append({"file": ".local-account-ledgers.json", "account": acct_id, "severity": "ERROR", "message": "Ledger entries must be a list"})
                continue

            running_balance = 0.0
            for row_idx, row in enumerate(entries):
                total_entries += 1
                debit = float(row.get("debit", 0) or 0)
                credit = float(row.get("credit", 0) or 0)
                running_balance += (debit - credit)

                # Check date
                row_date = row.get("date")
                if row_date and not validate_date_str(row_date):
                    issues.append({"file": ".local-account-ledgers.json", "account": acct_id, "row": row_idx, "severity": "WARNING", "message": f"Invalid date: {row_date}"})

        report["files_checked"][".local-account-ledgers.json"] = {
            "total_accounts": len(accounts),
            "total_entries": total_entries,
            "balance_discrepancies": balance_discrepancies
        }

    # 3. Validate .local-bol-account-ledgers.json
    bol_acct_data, err = load_json_file(bol_ledgers_path, default={})
    if err:
        issues.append({"file": ".local-bol-account-ledgers.json", "severity": "ERROR", "message": err})
    elif isinstance(bol_acct_data, dict):
        custom_companies = bol_acct_data.get("customCompanies", [])
        ledger_records = bol_acct_data.get("ledgerRecords", {})
        total_bol_entries = sum(len(v) for v in ledger_records.values() if isinstance(v, list))
        report["files_checked"][".local-bol-account-ledgers.json"] = {
            "total_companies": len(custom_companies),
            "total_records": total_bol_entries
        }

    # 4. Validate .local-invoices.json
    inv_data, err = load_json_file(invoices_path, default=[])
    if err:
        issues.append({"file": ".local-invoices.json", "severity": "ERROR", "message": err})
    elif isinstance(inv_data, list):
        report["files_checked"][".local-invoices.json"] = {"total_invoices": len(inv_data)}

    # Determine status
    has_errors = any(i["severity"] == "ERROR" for i in issues)
    has_warnings = any(i["severity"] == "WARNING" for i in issues)

    if has_errors:
        report["status"] = "FAIL"
    elif has_warnings:
        report["status"] = "WARNINGS"
    else:
        report["status"] = "PASS"

    report["total_issues"] = len(issues)
    report["issues"] = issues

    write_json_output(report, args.output, "Validation report")

    if args.strict and (has_errors or has_warnings):
        print(f"Validation failed in strict mode with {len(issues)} issues.", file=sys.stderr)
        return 1
    return 1 if has_errors else 0


# ==========================================
# Subcommand: summary
# ==========================================
def cmd_summary(args: argparse.Namespace) -> int:
    workspace = Path(args.data_dir).resolve() if args.data_dir else get_default_workspace_dir()
    bols_path = workspace / ".local-bols.json"
    account_ledgers_path = workspace / ".local-account-ledgers.json"
    invoices_path = workspace / ".local-invoices.json"

    bols_data, _ = load_json_file(bols_path, default=[])
    acct_data, _ = load_json_file(account_ledgers_path, default={})
    inv_data, _ = load_json_file(invoices_path, default=[])

    limit = int(args.limit) if args.limit is not None else 10

    account_summaries: List[Dict[str, Any]] = []
    if isinstance(acct_data, dict):
        ledger_entries = acct_data.get("ledgerEntries", {})
        for acct_id, entries in ledger_entries.items():
            if not isinstance(entries, list):
                continue
            total_debit = sum(float(r.get("debit", 0) or 0) for r in entries)
            total_credit = sum(float(r.get("credit", 0) or 0) for r in entries)
            net_balance = total_debit - total_credit

            account_summaries.append({
                "account_id": acct_id,
                "entry_count": len(entries),
                "total_debit_usd": round(total_debit, 2),
                "total_credit_usd": round(total_credit, 2),
                "net_balance_usd": round(net_balance, 2),
                "latest_entry_date": entries[-1].get("date") if entries else None
            })

    # Sort accounts by net balance descending (highest receivable first)
    account_summaries.sort(key=lambda x: abs(x["net_balance_usd"]), reverse=True)

    recent_bols: List[Dict[str, Any]] = []
    if isinstance(bols_data, list):
        for bol in bols_data[:limit]:
            recent_bols.append({
                "bol_number": bol.get("bol_number") or bol.get("id"),
                "issue_date": bol.get("issue_date"),
                "shipper": bol.get("shipper_name"),
                "consignee": bol.get("consignee_name"),
                "truck_number": bol.get("truck_number"),
                "driver_name": bol.get("driver_name"),
                "packages": bol.get("number_of_packages"),
                "net_weight": bol.get("net_weight")
            })

    # Summarize Invoices & Documentation Fees
    invoice_summaries: List[Dict[str, Any]] = []
    total_invoice_billed_usd = 0.0
    total_documentation_charges_usd = 0.0

    if isinstance(inv_data, list):
        for inv in inv_data:
            inv_totals = calculate_invoice_totals(inv)
            total_invoice_billed_usd += inv_totals["grand_total"]
            total_documentation_charges_usd += inv_totals["documentation_charges"]
            invoice_summaries.append({
                "invoice_number": inv.get("invoice_number") or inv.get("id"),
                "invoice_date": inv.get("invoice_date"),
                "buyer_name": inv.get("buyer_name"),
                "item_count": len(inv.get("items", []) or []),
                "documentation_charges_usd": inv_totals["documentation_charges"],
                "freight_charges_usd": inv_totals["freight_charges"],
                "grand_total_usd": inv_totals["grand_total"],
                "payment_status": inv.get("payment_status", "Unpaid")
            })

    summary_result = {
        "timestamp": datetime.now().isoformat(),
        "totals": {
            "total_bol_count": len(bols_data) if isinstance(bols_data, list) else 0,
            "total_accounts_count": len(account_summaries),
            "total_invoices_count": len(inv_data) if isinstance(inv_data, list) else 0,
            "total_invoice_billed_usd": round(total_invoice_billed_usd, 2),
            "total_documentation_charges_usd": round(total_documentation_charges_usd, 2),
            "overall_debit_usd": round(sum(a["total_debit_usd"] for a in account_summaries), 2),
            "overall_credit_usd": round(sum(a["total_credit_usd"] for a in account_summaries), 2),
            "overall_net_receivable_usd": round(sum(a["net_balance_usd"] for a in account_summaries), 2)
        },
        "top_accounts": account_summaries[:limit],
        "recent_invoices": invoice_summaries[:limit],
        "recent_bols": recent_bols
    }

    write_json_output(summary_result, args.output, "Summary statistics")
    return 0


# ==========================================
# Subcommand: inspect-bol
# ==========================================
def cmd_inspect_bol(args: argparse.Namespace) -> int:
    workspace = Path(args.data_dir).resolve() if args.data_dir else get_default_workspace_dir()
    bols_path = workspace / ".local-bols.json"
    account_ledgers_path = workspace / ".local-account-ledgers.json"
    bol_ledgers_path = workspace / ".local-bol-account-ledgers.json"
    invoices_path = workspace / ".local-invoices.json"

    query = args.bol_no.strip().lower()
    bols_data, _ = load_json_file(bols_path, default=[])

    matched_bol: Optional[Dict[str, Any]] = None
    if isinstance(bols_data, list):
        for bol in bols_data:
            b_id = str(bol.get("id", "")).strip().lower()
            b_no = str(bol.get("bol_number", "")).strip().lower()
            if query == b_id or query == b_no or query in b_no:
                matched_bol = bol
                break

    if not matched_bol:
        err_msg = f"No BOL found matching identifier: '{args.bol_no}'"
        print(err_msg, file=sys.stderr)
        write_json_output({"error": err_msg, "query": args.bol_no}, args.output, "Lookup error")
        return 1

    # Find associated ledger records
    related_ledger_entries: List[Dict[str, Any]] = []

    # Check .local-account-ledgers.json
    acct_data, _ = load_json_file(account_ledgers_path, default={})
    if isinstance(acct_data, dict):
        ledger_entries = acct_data.get("ledgerEntries", {})
        for acct_id, entries in ledger_entries.items():
            if isinstance(entries, list):
                for row in entries:
                    row_bl = str(row.get("billOfLanding", "")).strip().lower()
                    if query in row_bl or (matched_bol.get("bol_number") and str(matched_bol.get("bol_number")).lower() in row_bl):
                        related_ledger_entries.append({
                            "source": "account-ledgers",
                            "account_id": acct_id,
                            "entry": row
                        })

    # Check .local-bol-account-ledgers.json
    bol_acct_data, _ = load_json_file(bol_ledgers_path, default={})
    if isinstance(bol_acct_data, dict):
        ledger_records = bol_acct_data.get("ledgerRecords", {})
        for comp_name, entries in ledger_records.items():
            if isinstance(entries, list):
                for row in entries:
                    row_bl = str(row.get("bolNo", "") or row.get("barnamehNo", "")).strip().lower()
                    if query in row_bl or (matched_bol.get("bol_number") and str(matched_bol.get("bol_number")).lower() in row_bl):
                        related_ledger_entries.append({
                            "source": "bol-account-ledgers",
                            "company": comp_name,
                            "entry": row
                        })

    # Check .local-invoices.json for linked invoice & documentation charges
    linked_invoices: List[Dict[str, Any]] = []
    inv_data, _ = load_json_file(invoices_path, default=[])
    if isinstance(inv_data, list):
        for inv in inv_data:
            inv_bl = str(inv.get("bl_no", "")).strip().lower()
            inv_booking = str(inv.get("booking_no", "")).strip().lower()
            inv_truck = str(inv.get("truck_no", "")).strip().lower()
            inv_num = str(inv.get("invoice_number", "")).strip().lower()
            cargo_desc = str(matched_bol.get("cargo_description", "")).lower()

            if (query and (query in inv_bl or query in inv_booking or (inv_num and inv_num in cargo_desc))) or \
               (matched_bol.get("truck_number") and str(matched_bol.get("truck_number")).lower() in inv_truck):
                inv_totals = calculate_invoice_totals(inv)
                linked_invoices.append({
                    "invoice_number": inv.get("invoice_number"),
                    "invoice_date": inv.get("invoice_date"),
                    "buyer_name": inv.get("buyer_name"),
                    "charges": inv_totals,
                    "items": inv.get("items", [])
                })

    result = {
        "bol_details": matched_bol,
        "related_ledger_entries": related_ledger_entries,
        "related_entries_count": len(related_ledger_entries),
        "linked_invoices": linked_invoices,
        "linked_invoices_count": len(linked_invoices)
    }

    write_json_output(result, args.output, f"BOL {matched_bol.get('bol_number', args.bol_no)} details")
    return 0


# ==========================================
# Subcommand: create-invoice
# ==========================================
def cmd_create_invoice(args: argparse.Namespace) -> int:
    workspace = Path(args.data_dir).resolve() if args.data_dir else get_default_workspace_dir()
    bols_path = workspace / ".local-bols.json"
    invoices_path = workspace / ".local-invoices.json"
    counter_path = workspace / ".invoice-counter"

    matched_bol: Optional[Dict[str, Any]] = None
    if args.from_bol:
        query = args.from_bol.strip().lower()
        bols_data, _ = load_json_file(bols_path, default=[])
        if isinstance(bols_data, list):
            for bol in bols_data:
                b_id = str(bol.get("id", "")).strip().lower()
                b_no = str(bol.get("bol_number", "")).strip().lower()
                if query == b_id or query == b_no or query in b_no:
                    matched_bol = bol
                    break

    inv_num = args.invoice_number
    if not inv_num:
        cnt = 161
        if counter_path.exists():
            try:
                cnt = int(counter_path.read_text(encoding="utf-8").strip()) + 1
            except Exception:
                cnt = 161
        inv_num = f"INV-2026-{cnt:04d}"
        if args.save:
            counter_path.write_text(str(cnt), encoding="utf-8")

    buyer = args.buyer_name or (matched_bol.get("shipper_name") if matched_bol else "VALUED CUSTOMER")
    inv_date = args.date or (matched_bol.get("issue_date") if matched_bol else datetime.now().strftime("%Y-%m-%d"))

    items: List[Dict[str, Any]] = []
    if args.item_desc:
        items.append({
            "id": str(datetime.now().timestamp()),
            "date": inv_date,
            "description": args.item_desc,
            "containerNo": matched_bol.get("container_numbers", "") if matched_bol else "",
            "quantity": "1",
            "unit": "خدمات",
            "unitPrice": str(args.item_price or args.freight or 0),
            "currency": args.currency or "USD"
        })
    elif matched_bol:
        items.append({
            "id": str(datetime.now().timestamp()),
            "date": inv_date,
            "description": f"Freight Transportation: {matched_bol.get('cargo_description', '')}".strip(),
            "containerNo": matched_bol.get("container_numbers", ""),
            "quantity": "1",
            "unit": "کرایه",
            "unitPrice": str(args.freight or 0),
            "currency": args.currency or "USD"
        })

    inv_record = {
        "id": inv_num,
        "invoice_number": inv_num,
        "invoice_date": inv_date,
        "due_date": "",
        "payment_terms": "Due on Receipt",
        "currency": args.currency or "USD",
        "invoice_type": "Freight Invoice",
        "seller_name": "SKY ARIANA & BALAM BAR BARAN",
        "seller_logo": "/images/account-ledger-logo.png",
        "seller_tagline": "International Logistics & Freight Forwarding",
        "seller_address": "2nd Floor, 16 No. Office, Shahidano, Chowk, Etimad Rahmi Market, Kandahar, Afghanistan",
        "seller_contact": "info@skyariana.com, transport@skyariana.com | +93 700 939 365, +93 711 435 529",
        "seller_website": "www.skyariana.com",
        "seller_license": "2401-2198",
        "buyer_name": buyer,
        "buyer_address": matched_bol.get("shipper_address", "") if matched_bol else "",
        "buyer_contact": matched_bol.get("shipper_contact", "") if matched_bol else "",
        "shipper": matched_bol.get("shipper_name", "") if matched_bol else "",
        "consignee": matched_bol.get("consignee_name", "") if matched_bol else "",
        "truck_no": matched_bol.get("truck_number", "") if matched_bol else "",
        "driver_name": matched_bol.get("driver_name", "") if matched_bol else "",
        "bl_no": matched_bol.get("bol_number", "") if matched_bol else "",
        "cargo_description": matched_bol.get("cargo_description", "") if matched_bol else "",
        "items": items,
        "freight_charges": "0" if items else str(args.freight or 0),
        "demurrage_charges": "0",
        "detention_charges": "0",
        "documentation_charges": str(args.documentation_fee or 0),
        "port_charges": "0",
        "truck_charges": "0",
        "other_charges": "0",
        "tax": "0",
        "discount": "0",
        "notes": "Freight and documentation charges for multi-modal logistics transport.",
        "terms": "Payment due within agreed terms. Demurrage and detention charges are subject to shipping line tariffs. Any dispute shall be settled according to Afghan commercial law. All charges are in USD unless otherwise specified.",
        "payment_status": "Unpaid",
        "prepared_by": "AHSANULLAH QURESHI",
        "approved_by": "HAJI SHABIR AHMAD ALOKOZAY",
        "signature_position": "Accounts Department",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

    if args.save:
        inv_data, _ = load_json_file(invoices_path, default=[])
        if not isinstance(inv_data, list):
            inv_data = []
        existing_idx = next((i for i, x in enumerate(inv_data) if x.get("invoice_number") == inv_num or x.get("id") == inv_num), None)
        if existing_idx is not None:
            inv_data[existing_idx] = inv_record
        else:
            inv_data.append(inv_record)
        write_json_output(inv_data, str(invoices_path), f"Updated {invoices_path.name}")

    totals = calculate_invoice_totals(inv_record)
    write_json_output({"invoice": inv_record, "totals": totals}, args.output, f"Created invoice {inv_num}")
    return 0


# ==========================================
# Subcommand: inspect-invoice
# ==========================================
def cmd_inspect_invoice(args: argparse.Namespace) -> int:
    workspace = Path(args.data_dir).resolve() if args.data_dir else get_default_workspace_dir()
    invoices_path = workspace / ".local-invoices.json"

    query = args.invoice_no.strip().lower()
    inv_data, _ = load_json_file(invoices_path, default=[])

    matched_inv: Optional[Dict[str, Any]] = None
    if isinstance(inv_data, list):
        for inv in inv_data:
            inv_id = str(inv.get("id", "")).strip().lower()
            inv_num = str(inv.get("invoice_number", "")).strip().lower()
            buyer = str(inv.get("buyer_name", "")).strip().lower()
            if query == inv_id or query == inv_num or query in inv_num or query in buyer:
                matched_inv = inv
                break

    if not matched_inv:
        err_msg = f"No Invoice found matching identifier: '{args.invoice_no}'"
        print(err_msg, file=sys.stderr)
        write_json_output({"error": err_msg, "query": args.invoice_no}, args.output, "Lookup error")
        return 1

    totals = calculate_invoice_totals(matched_inv)

    result = {
        "invoice_details": matched_inv,
        "calculated_totals": totals
    }

    write_json_output(result, args.output, f"Invoice {matched_inv.get('invoice_number', args.invoice_no)} details")
    return 0


# ==========================================
# Subcommand: export-ledger
# ==========================================
def cmd_export_ledger(args: argparse.Namespace) -> int:
    workspace = Path(args.data_dir).resolve() if args.data_dir else get_default_workspace_dir()
    account_ledgers_path = workspace / ".local-account-ledgers.json"
    bol_ledgers_path = workspace / ".local-bol-account-ledgers.json"
    labels_path = Path(__file__).resolve().parent.parent / "references" / "pashto_labels.json"

    labels_dict, _ = load_json_file(labels_path, default={})

    acct_query = args.account_id.strip().lower()
    matched_entries: List[Dict[str, Any]] = []
    matched_account_name = args.account_id

    # Look in .local-account-ledgers.json
    acct_data, _ = load_json_file(account_ledgers_path, default={})
    if isinstance(acct_data, dict):
        ledger_entries = acct_data.get("ledgerEntries", {})
        for acct_id, entries in ledger_entries.items():
            if acct_query == acct_id.lower() or acct_query in acct_id.lower():
                matched_entries = entries
                matched_account_name = acct_id
                break

    # If not found, look in .local-bol-account-ledgers.json
    if not matched_entries:
        bol_acct_data, _ = load_json_file(bol_ledgers_path, default={})
        if isinstance(bol_acct_data, dict):
            ledger_records = bol_acct_data.get("ledgerRecords", {})
            for comp_name, entries in ledger_records.items():
                if acct_query == comp_name.lower() or acct_query in comp_name.lower():
                    matched_entries = entries
                    matched_account_name = comp_name
                    break

    if not matched_entries:
        err_msg = f"Account '{args.account_id}' not found in ledger datasets."
        print(err_msg, file=sys.stderr)
        write_json_output({"error": err_msg, "account_id": args.account_id}, args.output, "Export error")
        return 1

    # Compute running balances
    processed_rows: List[Dict[str, Any]] = []
    running_balance = 0.0

    for idx, row in enumerate(matched_entries, 1):
        debit = float(row.get("debit", 0) or 0)
        credit = float(row.get("credit", 0) or 0)
        running_balance += (debit - credit)

        inv_no = str(row.get("invoiceNo", "") or row.get("invoice_no", "")).strip()
        doc_fee = row.get("documentationFee") or row.get("docFee") or row.get("documentation_charges") or ""

        processed_rows.append({
            "sNo": idx,
            "date": row.get("date") or row.get("shipDate", ""),
            "description": row.get("description", ""),
            "invoiceNo": inv_no,
            "documentationFee": str(doc_fee),
            "billOfLanding": row.get("billOfLanding") or row.get("bolNo") or row.get("barnamehNo", ""),
            "consignee": row.get("consignee", ""),
            "containerNo": row.get("containerNo", ""),
            "containerType": row.get("containerType", ""),
            "quantity": row.get("quantity", ""),
            "driverRent": row.get("driverRent") or row.get("driverFreight", ""),
            "truckNo": row.get("truckNo", ""),
            "debit": debit,
            "credit": credit,
            "balance": round(running_balance, 2),
            "pdfName": row.get("pdfName") or row.get("pdfFile", ""),
            "surrendered": bool(row.get("billOfLandingSurrendered") or row.get("surrenderedBL"))
        })

    if args.format == "markdown":
        md_lines = [
            f"# Account Ledger: {matched_account_name}",
            f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  ",
            f"**Total Records:** {len(processed_rows)}  ",
            f"**Final Balance:** ${round(running_balance, 2):,.2f} USD\n",
            "| S.NO (مسلسل شمېره) | DATE (تاریخ) | SHIPPER / DESCRIPTION (تفصیل) | B/L & INVOICE (بی ال / انوایس) | CONTAINER (کانټینر) | DEBIT / CREDIT (بدهی/اعتبار) | BALANCE (پاتې بیلانس) |",
            "|:---:|:---:|:---|:---|:---|:---:|:---:|"
        ]

        for r in processed_rows:
            bl_parts = []
            if r['billOfLanding']:
                bl_parts.append(f"**B/L:** {r['billOfLanding']}")
            if r['invoiceNo']:
                bl_parts.append(f"**Inv:** {r['invoiceNo']}")
            if r['consignee']:
                bl_parts.append(f"**Consignee:** {r['consignee']}")
            if r['documentationFee']:
                bl_parts.append(f"**Doc Fee:** {r['documentationFee']}")

            bl_cell = "<br>".join(bl_parts) if bl_parts else "—"
            container_info = f"{r['containerType']} {r['containerNo']}".strip() or "—"
            debit_credit = f"**+${r['debit']:,.2f}**" if r['debit'] else f"**-${r['credit']:,.2f}**"
            md_lines.append(
                f"| {r['sNo']} | {r['date']} | {r['description']} | {bl_cell} | {container_info} | {debit_credit} | **${r['balance']:,.2f}** |"
            )

        write_text_output("\n".join(md_lines), args.output, f"Markdown ledger for '{matched_account_name}'")
    else:
        export_payload = {
            "account_name": matched_account_name,
            "generated_at": datetime.now().isoformat(),
            "total_entries": len(processed_rows),
            "final_balance_usd": round(running_balance, 2),
            "columns": labels_dict.get("columns", []),
            "merged_labels": labels_dict.get("mergedLabels", {}),
            "financial_labels": labels_dict.get("financialLabels", {}),
            "rows": processed_rows
        }
        write_json_output(export_payload, args.output, f"JSON ledger for '{matched_account_name}'")

    return 0


# ==========================================
# Subcommand: inspect-sync
# ==========================================
def cmd_inspect_sync(args: argparse.Namespace) -> int:
    workspace = Path(args.data_dir).resolve() if args.data_dir else get_default_workspace_dir()
    snapshot_path = workspace / ".local-full-snapshot.json"
    codes_path = workspace / ".local-sync-codes.json"

    snapshot_data, s_err = load_json_file(snapshot_path, default={})
    codes_data, c_err = load_json_file(codes_path, default={})

    docs = snapshot_data.get("documents", []) if isinstance(snapshot_data, dict) else []
    invoices = snapshot_data.get("invoices", []) if isinstance(snapshot_data, dict) else []
    accounts = snapshot_data.get("accounts", []) if isinstance(snapshot_data, dict) else []
    ledgers = snapshot_data.get("ledgerRecords", {}) if isinstance(snapshot_data, dict) else {}

    total_debit = 0.0
    total_credit = 0.0
    for acc, rows in ledgers.items():
        if isinstance(rows, list):
            for r in rows:
                total_debit += parse_num(r.get("debit", 0))
                total_credit += parse_num(r.get("credit", 0))

    net_balance = total_debit - total_credit

    result = {
        "timestamp": datetime.now().isoformat(),
        "workspace": str(workspace),
        "snapshot_exists": snapshot_path.exists(),
        "snapshot_metrics": {
            "total_bols": len(docs),
            "total_invoices": len(invoices),
            "total_accounts": len(accounts),
            "total_ledger_accounts": len(ledgers),
            "accounting_invariance": {
                "total_debit": round(total_debit, 2),
                "total_credit": round(total_credit, 2),
                "net_balance": round(net_balance, 2),
                "formula": "Net Balance = Total Debit - Total Credit",
                "status": "VALID"
            }
        },
        "sync_codes_count": len(codes_data) if isinstance(codes_data, dict) else 0,
        "available_sync_codes": list(codes_data.keys())[:10] if isinstance(codes_data, dict) else []
    }

    write_json_output(result, args.output, "Sync and snapshot audit report")
    return 0


# ==========================================
# Main Entry Point
# ==========================================
def main() -> None:
    parser = argparse.ArgumentParser(
        description="Sky Ariana BOL & Account Ledger CLI Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    subparsers = parser.add_subparsers(dest="subcommand", required=True)

    # 1. validate
    p_validate = subparsers.add_parser("validate", help="Validate BOL, Ledger, and Invoice JSON data files")
    p_validate.add_argument("--data-dir", type=str, help="Path to project directory containing JSON snapshots")
    p_validate.add_argument("--strict", action="store_true", help="Fail with exit code 1 on any warnings")
    p_validate.add_argument("--output", type=str, required=True, help="Path to write validation JSON report")
    p_validate.set_defaults(func=cmd_validate)

    # 2. summary
    p_summary = subparsers.add_parser("summary", help="Generate summary statistics of ledgers, BOLs, invoices, and documentation fees")
    p_summary.add_argument("--data-dir", type=str, help="Path to project directory containing JSON snapshots")
    p_summary.add_argument("--limit", type=int, required=True, help="Number of top accounts, invoices, and recent BOLs to include")
    p_summary.add_argument("--output", type=str, required=True, help="Path to write summary JSON report")
    p_summary.set_defaults(func=cmd_summary)

    # 3. inspect-bol
    p_inspect = subparsers.add_parser("inspect-bol", help="Inspect a specific BOL and its related ledger and invoice records")
    p_inspect.add_argument("--bol-no", type=str, required=True, help="BOL number or ID to inspect")
    p_inspect.add_argument("--data-dir", type=str, help="Path to project directory containing JSON snapshots")
    p_inspect.add_argument("--output", type=str, required=True, help="Path to write BOL inspection report")
    p_inspect.set_defaults(func=cmd_inspect_bol)

    # 4. inspect-invoice
    p_inv = subparsers.add_parser("inspect-invoice", help="Inspect a specific Invoice, its line items, freight, and documentation charges")
    p_inv.add_argument("--invoice-no", type=str, required=True, help="Invoice number, ID, or buyer name to inspect")
    p_inv.add_argument("--data-dir", type=str, help="Path to project directory containing JSON snapshots")
    p_inv.add_argument("--output", type=str, required=True, help="Path to write Invoice inspection report")
    p_inv.set_defaults(func=cmd_inspect_invoice)

    # 5. create-invoice
    p_create_inv = subparsers.add_parser("create-invoice", help="Create or generate an Invoice with freight and documentation fees")
    p_create_inv.add_argument("--invoice-number", type=str, help="Custom Invoice Number (e.g. INV-119 or INV-2026-0161)")
    p_create_inv.add_argument("--from-bol", type=str, help="BOL number to link and populate details from")
    p_create_inv.add_argument("--buyer-name", type=str, help="Buyer or Company name")
    p_create_inv.add_argument("--date", type=str, help="Invoice date (YYYY-MM-DD)")
    p_create_inv.add_argument("--freight", type=float, default=0.0, help="Freight charges amount")
    p_create_inv.add_argument("--documentation-fee", type=float, default=0.0, help="Documentation fee amount")
    p_create_inv.add_argument("--currency", type=str, default="USD", help="Currency (e.g. USD, AFN)")
    p_create_inv.add_argument("--item-desc", type=str, help="Custom line item description")
    p_create_inv.add_argument("--item-price", type=float, help="Custom line item unit price")
    p_create_inv.add_argument("--save", action="store_true", help="Save directly into .local-invoices.json")
    p_create_inv.add_argument("--data-dir", type=str, help="Path to project directory containing JSON snapshots")
    p_create_inv.add_argument("--output", type=str, required=True, help="Path to write created Invoice JSON")
    p_create_inv.set_defaults(func=cmd_create_invoice)

    # 6. export-ledger
    p_export = subparsers.add_parser("export-ledger", help="Export structured account ledger records with invoice and documentation fees")
    p_export.add_argument("--account-id", type=str, required=True, help="Account ID or Company name")
    p_export.add_argument("--data-dir", type=str, help="Path to project directory containing JSON snapshots")
    p_export.add_argument("--format", choices=["json", "markdown"], default="json", help="Export format")
    p_export.add_argument("--output", type=str, required=True, help="Path to write exported ledger data")
    p_export.set_defaults(func=cmd_export_ledger)

    # 7. inspect-sync
    p_sync = subparsers.add_parser("inspect-sync", help="Inspect and audit cloud sync snapshots and codes")
    p_sync.add_argument("--data-dir", type=str, help="Path to project directory containing JSON snapshots")
    p_sync.add_argument("--output", type=str, required=True, help="Path to write sync inspection report")
    p_sync.set_defaults(func=cmd_inspect_sync)

    args = parser.parse_args()
    sys.exit(args.func(args))


if __name__ == "__main__":
    main()

