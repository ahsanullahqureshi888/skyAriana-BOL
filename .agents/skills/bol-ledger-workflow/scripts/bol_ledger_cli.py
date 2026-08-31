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

    summary_result = {
        "timestamp": datetime.now().isoformat(),
        "totals": {
            "total_bol_count": len(bols_data) if isinstance(bols_data, list) else 0,
            "total_accounts_count": len(account_summaries),
            "total_invoices_count": len(inv_data) if isinstance(inv_data, list) else 0,
            "overall_debit_usd": round(sum(a["total_debit_usd"] for a in account_summaries), 2),
            "overall_credit_usd": round(sum(a["total_credit_usd"] for a in account_summaries), 2),
            "overall_net_receivable_usd": round(sum(a["net_balance_usd"] for a in account_summaries), 2)
        },
        "top_accounts": account_summaries[:limit],
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

    result = {
        "bol_details": matched_bol,
        "related_ledger_entries": related_ledger_entries,
        "related_entries_count": len(related_ledger_entries)
    }

    write_json_output(result, args.output, f"BOL {matched_bol.get('bol_number', args.bol_no)} details")
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

        processed_rows.append({
            "sNo": idx,
            "date": row.get("date") or row.get("shipDate", ""),
            "description": row.get("description", ""),
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
            "| S.NO (مسلسل شمېره) | DATE (تاریخ) | SHIPPER / DESCRIPTION (تفصیل) | B/L (بی ال) & Consignee | CONTAINER (کانټینر) | DEBIT / CREDIT (بدهی/اعتبار) | BALANCE (پاتې بیلانس) |",
            "|:---:|:---:|:---|:---|:---|:---:|:---:|"
        ]

        for r in processed_rows:
            bl_consignee = f"**B/L:** {r['billOfLanding']}<br>**Consignee:** {r['consignee']}" if r['consignee'] else r['billOfLanding']
            container_info = f"{r['containerType']} {r['containerNo']}".strip()
            debit_credit = f"**+${r['debit']:,.2f}**" if r['debit'] else f"**-${r['credit']:,.2f}**"
            md_lines.append(
                f"| {r['sNo']} | {r['date']} | {r['description']} | {bl_consignee} | {container_info} | {debit_credit} | **${r['balance']:,.2f}** |"
            )

        write_text_output("\n".join(md_lines), args.output, f"Markdown ledger for '{matched_account_name}'")
    else:
        export_payload = {
            "account_name": matched_account_name,
            "generated_at": datetime.now().isoformat(),
            "total_entries": len(processed_rows),
            "final_balance_usd": round(running_balance, 2),
            "columns": labels_dict.get("columns", []),
            "rows": processed_rows
        }
        write_json_output(export_payload, args.output, f"JSON ledger for '{matched_account_name}'")

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
    p_validate = subparsers.add_parser("validate", help="Validate BOL and Ledger JSON data files")
    p_validate.add_argument("--data-dir", type=str, help="Path to project directory containing JSON snapshots")
    p_validate.add_argument("--strict", action="store_true", help="Fail with exit code 1 on any warnings")
    p_validate.add_argument("--output", type=str, required=True, help="Path to write validation JSON report")
    p_validate.set_defaults(func=cmd_validate)

    # 2. summary
    p_summary = subparsers.add_parser("summary", help="Generate summary statistics of ledgers and BOLs")
    p_summary.add_argument("--data-dir", type=str, help="Path to project directory containing JSON snapshots")
    p_summary.add_argument("--limit", type=int, required=True, help="Number of top accounts and recent BOLs to include")
    p_summary.add_argument("--output", type=str, required=True, help="Path to write summary JSON report")
    p_summary.set_defaults(func=cmd_summary)

    # 3. inspect-bol
    p_inspect = subparsers.add_parser("inspect-bol", help="Inspect a specific BOL and its related ledger records")
    p_inspect.add_argument("--bol-no", type=str, required=True, help="BOL number or ID to inspect")
    p_inspect.add_argument("--data-dir", type=str, help="Path to project directory containing JSON snapshots")
    p_inspect.add_argument("--output", type=str, required=True, help="Path to write BOL inspection report")
    p_inspect.set_defaults(func=cmd_inspect_bol)

    # 4. export-ledger
    p_export = subparsers.add_parser("export-ledger", help="Export structured account ledger records")
    p_export.add_argument("--account-id", type=str, required=True, help="Account ID or Company name")
    p_export.add_argument("--data-dir", type=str, help="Path to project directory containing JSON snapshots")
    p_export.add_argument("--format", choices=["json", "markdown"], default="json", help="Export format")
    p_export.add_argument("--output", type=str, required=True, help="Path to write exported ledger data")
    p_export.set_defaults(func=cmd_export_ledger)

    args = parser.parse_args()
    sys.exit(args.func(args))


if __name__ == "__main__":
    main()
