#!/usr/bin/env python3
"""
Sky Ariana QA & Deployment Verification Script
Checks TypeScript compiler output, local JSON data integrity,
and accounting balance invariance.
"""

import sys
import os
import json
import subprocess
from pathlib import Path

def check_json_snapshots(project_root: Path):
    reports = []
    snapshot_files = [
        ".local-bols.json",
        ".local-account-ledgers.json",
        ".local-bol-account-ledgers.json",
        ".local-invoices.json"
    ]
    
    for filename in snapshot_files:
        filepath = project_root / filename
        if not filepath.exists():
            reports.append({"file": filename, "status": "WARN", "message": "File does not exist yet (will be created on sync)"})
            continue
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            count = len(data) if isinstance(data, list) else len(data.keys()) if isinstance(data, dict) else 0
            reports.append({"file": filename, "status": "PASS", "count": count})
        except Exception as e:
            reports.append({"file": filename, "status": "FAIL", "message": str(e)})
            
    return reports

def check_ledger_invariance(project_root: Path):
    filepath = project_root / ".local-account-ledgers.json"
    if not filepath.exists():
        return {"status": "SKIP", "message": "No account ledger snapshot found"}
        
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        invariance_errors = []
        total_accounts = 0

        # Handle structure with "ledgerEntries" dict
        if isinstance(data, dict) and "ledgerEntries" in data and isinstance(data["ledgerEntries"], dict):
            for acc_name, entries in data["ledgerEntries"].items():
                if not isinstance(entries, list):
                    continue
                total_accounts += 1
                running_balance = 0.0
                for idx, entry in enumerate(entries):
                    debit = float(entry.get("debit", 0) or 0)
                    credit = float(entry.get("credit", 0) or 0)
                    expected_balance = running_balance + debit - credit
                    recorded_balance = entry.get("balance")
                    if recorded_balance is not None:
                        recorded_balance = float(recorded_balance or 0)
                        if abs(expected_balance - recorded_balance) > 0.01:
                            invariance_errors.append(
                                f"Account '{acc_name}', row {idx+1}: recorded {recorded_balance}, expected {expected_balance:.2f}"
                            )
                    running_balance = expected_balance
        elif isinstance(data, dict) and "accounts" in data and isinstance(data["accounts"], list):
            accounts = data["accounts"]
            for acc in accounts:
                if not isinstance(acc, dict):
                    continue
                acc_name = acc.get("name", "Unknown")
                entries = acc.get("entries", [])
                total_accounts += 1
                running_balance = 0.0
                for idx, entry in enumerate(entries):
                    debit = float(entry.get("debit", 0) or 0)
                    credit = float(entry.get("credit", 0) or 0)
                    expected_balance = running_balance + debit - credit
                    recorded_balance = entry.get("balance")
                    if recorded_balance is not None:
                        recorded_balance = float(recorded_balance or 0)
                        if abs(expected_balance - recorded_balance) > 0.01:
                            invariance_errors.append(
                                f"Account '{acc_name}', row {idx+1}: recorded {recorded_balance}, expected {expected_balance:.2f}"
                            )
                    running_balance = expected_balance
                
        if invariance_errors:
            return {"status": "FAIL", "errors": invariance_errors[:5], "total_errors": len(invariance_errors)}
        return {"status": "PASS", "accounts_checked": total_accounts}
    except Exception as e:
        return {"status": "FAIL", "message": str(e)}

def run_typecheck(project_root: Path):
    try:
        result = subprocess.run(
            ["npx", "tsc", "--noEmit"],
            cwd=str(project_root),
            capture_output=True,
            text=True,
            shell=True,
            timeout=120
        )
        if result.returncode == 0:
            return {"status": "PASS", "message": "TypeScript check passed with 0 errors."}
        else:
            lines = [l for l in result.stdout.splitlines() if "error TS" in l]
            return {"status": "FAIL", "errors": lines[:10], "total_errors": len(lines)}
    except Exception as e:
        return {"status": "FAIL", "message": str(e)}

def main():
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    # Resolve project root from .agents/skills/qa-and-deployment/scripts/
    root = Path(__file__).resolve().parents[4]
    print(f"==================================================")
    print(f" Sky Ariana QA & Deployment Verification Pipeline")
    print(f" Workspace: {root}")
    print(f"==================================================\n")
    
    # 1. Snapshot Integrity
    print("[1/3] Checking Data Snapshots...")
    snapshots = check_json_snapshots(root)
    for s in snapshots:
        status_icon = "[OK]" if s["status"] == "PASS" else "[!]" if s["status"] == "WARN" else "[X]"
        print(f"  {status_icon} [{s['status']}] {s['file']}: {s.get('count', s.get('message', ''))}")
        
    # 2. Accounting Invariance
    print("\n[2/3] Verifying Accounting Identity (Net Balance = Total Debit - Total Credit)...")
    ledger_check = check_ledger_invariance(root)
    if ledger_check["status"] == "PASS":
        print(f"  [OK] [PASS] Checked {ledger_check.get('accounts_checked', 0)} accounts. All balances strictly balance.")
    elif ledger_check["status"] == "SKIP":
        print(f"  [!] [SKIP] {ledger_check['message']}")
    else:
        print(f"  [X] [FAIL] Accounting discrepancies found: {ledger_check.get('total_errors', 1)} errors.")
        for err in ledger_check.get("errors", []):
            print(f"     - {err}")
            
    # 3. TypeScript Strict Typecheck
    print("\n[3/3] Running TypeScript Strict Typecheck (`tsc --noEmit`)...")
    ts_check = run_typecheck(root)
    if ts_check["status"] == "PASS":
        print(f"  [OK] [PASS] {ts_check['message']}")
    else:
        print(f"  [X] [FAIL] TypeScript compilation errors encountered:")
        for err in ts_check.get("errors", []):
            print(f"     - {err}")

    print("\n==================================================")
    all_passed = (
        all(s["status"] != "FAIL" for s in snapshots) and 
        ledger_check["status"] in ["PASS", "SKIP"] and 
        ts_check["status"] == "PASS"
    )
    if all_passed:
        print(" RESULT: ALL QA CHECKS PASSED - READY FOR DEPLOYMENT")
        sys.exit(0)
    else:
        print(" RESULT: QA CHECKS FAILED - FIX ISSUES BEFORE DEPLOYING")
        sys.exit(1)

if __name__ == "__main__":
    main()
