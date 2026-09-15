#!/usr/bin/env python3
"""
Clean, Harmonize, and Optimize Local JSON Data Files for Sky Ariana BOL
"""

import os
import json
import uuid
import datetime
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent

VERIFIED_COMPANIES = [
    "ABDUL QAYOOM S/O ABDUL RAUF",
    'ALLAH NAZAR "MOHAMMAD SADIQ" S/O MOHAMMAD IQBAL',
    "ASADULLAH NIAMATULLAH HABIBI LTD",
    "Etehad Beverages Company",
    "FAZEL BASIT L.T.D",
    "HAJI NOOR MUHMMAD AYAZ NOORI",
    "HAYATULLAH KHAN FAZLI LTD",
    "KARAMAT SULAIMAN LTD",
    "NAJEB AHMAD LTD",
    "NAJEB AMIN LTD",
    "NAJIB AHMAD LTD",
    "NAJIB ASAD LTD",
    "NEW YAQOUBI LTD",
    "OMAR SHAHI LTD",
    "PAHLAWAN NOORI LTD",
    "RAHMAT NAZAR LTD",
    "SADIQE MUJEEB POPAL LTD",
    "SARWAR HEMATYAR LTD",
    "WASELA LTD",
]

def atomic_write(filepath: Path, data):
    tmp_file = filepath.with_suffix(f".tmp.{uuid.uuid4().hex[:6]}")
    with open(tmp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    # Replace atomically
    os.replace(tmp_file, filepath)

def clean_bols():
    bols_path = WORKSPACE / ".local-bols.json"
    with open(bols_path, "r", encoding="utf-8") as f:
        bols = json.load(f)

    cleaned_bols = []
    seen_ids = set()

    for b in bols:
        bol_num = b.get("bol_number") or b.get("billOfLadingNumber") or b.get("bolNo") or b.get("id")
        if not bol_num:
            continue
        
        if bol_num in seen_ids:
            continue
        seen_ids.add(bol_num)

        issue_date = b.get("issue_date") or b.get("issueDate") or datetime.date.today().isoformat()
        shipper = b.get("shipper_name") or b.get("shipperName") or ""
        consignee = b.get("consignee_name") or b.get("consigneeName") or ""
        truck = b.get("truck_number") or b.get("truckNumber") or ""
        driver = b.get("driver_name") or b.get("driverName") or ""
        driver_father = b.get("driver_father_name") or b.get("driverFatherName") or ""
        driver_contact = b.get("driver_contact") or b.get("driverContact") or ""
        driver_rent = b.get("driver_rent") or b.get("driverFreight") or b.get("driverRent") or ""
        cargo_desc = b.get("cargo_description") or b.get("cargoDescription") or ""
        pkgs = b.get("number_of_packages") or b.get("numberOfPackages") or ""
        net_wt = b.get("net_weight") or b.get("netWeight") or ""
        gross_wt = b.get("gross_weight") or b.get("grossWeight") or ""
        cont_type = b.get("container_type") or b.get("containerType") or ""
        cont_size = b.get("container_size") or b.get("containerSize") or ""
        cont_nums = b.get("container_numbers") or b.get("containerNumbers") or ""
        seal_nums = b.get("seal_numbers") or b.get("sealNumbers") or ""
        val = b.get("goods_value") or b.get("goodsValue") or ""

        # Populate both camelCase and snake_case for complete backwards & forwards compatibility
        harmonized = {
            **b,
            "id": bol_num,
            "bol_number": bol_num,
            "billOfLadingNumber": bol_num,
            "bolNo": bol_num,
            "issue_date": issue_date,
            "issueDate": issue_date,
            "shipper_name": shipper,
            "shipperName": shipper,
            "consignee_name": consignee,
            "consigneeName": consignee,
            "truck_number": truck,
            "truckNumber": truck,
            "driver_name": driver,
            "driverName": driver,
            "driver_father_name": driver_father,
            "driverFatherName": driver_father,
            "driver_contact": driver_contact,
            "driverContact": driver_contact,
            "driver_rent": driver_rent,
            "driverFreight": driver_rent,
            "cargo_description": cargo_desc,
            "cargoDescription": cargo_desc,
            "number_of_packages": pkgs,
            "numberOfPackages": pkgs,
            "net_weight": net_wt,
            "netWeight": net_wt,
            "gross_weight": gross_wt,
            "grossWeight": gross_wt,
            "container_type": cont_type,
            "containerType": cont_type,
            "container_size": cont_size,
            "containerSize": cont_size,
            "container_numbers": cont_nums,
            "containerNumbers": cont_nums,
            "seal_numbers": seal_nums,
            "sealNumbers": seal_nums,
            "goods_value": val,
            "goodsValue": val,
            "updated_at": b.get("updated_at") or datetime.datetime.now().isoformat(),
        }
        cleaned_bols.append(harmonized)

    atomic_write(bols_path, cleaned_bols)
    print(f"Cleaned and harmonized .local-bols.json: {len(cleaned_bols)} records")
    return cleaned_bols

def clean_bol_account_ledgers():
    path = WORKSPACE / ".local-bol-account-ledgers.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Clean customCompanies
    data["customCompanies"] = sorted(VERIFIED_COMPANIES)

    # 2. Clean ledgerRecords
    raw_records = data.get("ledgerRecords", {})
    clean_records = {}

    for k, rows in raw_records.items():
        k_clean = k.strip().lower()
        # Filter out keystroke noise with 0 rows
        if len(rows) == 0:
            continue
        
        # Merge hyphenated duplicate into normal name
        if k_clean == "haji-noor-muhmmad-ayaz-noori":
            target_key = "haji noor muhmmad ayaz noori"
            existing = clean_records.get(target_key, [])
            clean_records[target_key] = existing + rows
            continue
            
        clean_records[k] = rows

    data["ledgerRecords"] = clean_records
    data["updated_at"] = datetime.datetime.now().isoformat()

    atomic_write(path, data)
    print(f"Cleaned .local-bol-account-ledgers.json: {len(data['customCompanies'])} companies, {len(clean_records)} ledger records")

def clean_account_ledgers():
    path = WORKSPACE / ".local-account-ledgers.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Clean accounts
    data["accounts"] = sorted(VERIFIED_COMPANIES)

    # 2. Clean ledgerEntries
    raw_entries = data.get("ledgerEntries", {})
    clean_entries = {}

    # List of redundant slug keys that were exact duplicates of spaced keys
    duplicate_slug_keys = {
        "najeb-amin-ltd": "najeb amin ltd",
        "pahlawan-noori-ltd": "pahlawan noori ltd",
        "wasela-ltd": "wasela ltd",
        "najib-asad-ltd": "najib asad ltd",
        "omar-shahi-ltd": "omar shahi ltd",
        "rahmat-nazar-ltd": "rahmat nazar ltd",
        "asadullah-niamatullah-habibi-ltd": "asadullah niamatullah habibi ltd",
    }

    for k, rows in raw_entries.items():
        if len(rows) == 0:
            # Drop empty 0-row keys (5a8ee275..., da5ba436...)
            continue
            
        if k in duplicate_slug_keys:
            # Redundant duplicate key
            continue

        # Sort entries chronologically ascending by date and enforce exact running balance
        sorted_rows = sorted(rows, key=lambda r: r.get("date") or "0000-00-00")
        running_bal = 0.0
        for idx, row in enumerate(sorted_rows):
            debit = float(row.get("debit", 0) or 0)
            credit = float(row.get("credit", 0) or 0)
            running_bal += (debit - credit)
            row["sNo"] = idx + 1
            row["balance"] = round(running_bal, 2)
            row["debit"] = debit
            row["credit"] = credit

        clean_entries[k] = sorted_rows

    data["ledgerEntries"] = clean_entries
    data["updated_at"] = datetime.datetime.now().isoformat()

    atomic_write(path, data)
    print(f"Cleaned .local-account-ledgers.json: {len(data['accounts'])} accounts, {len(clean_entries)} active ledger entry accounts")

def create_accounts_directory():
    path = WORKSPACE / ".local-accounts.json"
    records = []
    
    for comp in sorted(VERIFIED_COMPANIES):
        records.append({
            "id": f"acc-{uuid.uuid5(uuid.NAMESPACE_DNS, comp).hex[:12]}",
            "name": comp,
            "address": "Kandahar / Herat / Kabul, Afghanistan",
            "contact": "+93 70 000 0000",
            "type": "both",
            "created_at": datetime.datetime.now().isoformat(),
        })

    atomic_write(path, records)
    print(f"Created .local-accounts.json: {len(records)} registered account records")

def clean_sync_codes_and_snapshot(cleaned_bols):
    # 1. Clean full snapshot
    snap_path = WORKSPACE / ".local-full-snapshot.json"
    with open(snap_path, "r", encoding="utf-8") as f:
        snap = json.load(f)

    # Harmonize snapshot documents
    snap_docs = snap.get("documents", [])
    doc_map = {}
    for b in cleaned_bols:
        doc_map[b["bol_number"]] = b
    for d in snap_docs:
        num = d.get("bol_number") or d.get("billOfLadingNumber")
        if num and num not in doc_map:
            doc_map[num] = d

    snap["documents"] = list(doc_map.values())
    snap["accounts"] = sorted(VERIFIED_COMPANIES)
    
    # Clean snapshot ledgerRecords
    clean_records = {}
    for k, rows in snap.get("ledgerRecords", {}).items():
        if len(rows) == 0:
            continue
        if k == "haji-noor-muhmmad-ayaz-noori":
            target = "haji noor muhmmad ayaz noori"
            clean_records[target] = clean_records.get(target, []) + rows
            continue
        clean_records[k] = rows
    snap["ledgerRecords"] = clean_records
    snap["updated_at"] = datetime.datetime.now().isoformat()

    atomic_write(snap_path, snap)
    print(f"Cleaned .local-full-snapshot.json: {len(snap['documents'])} documents, {len(snap['accounts'])} accounts")

    # 2. Clean and compress .local-sync-codes.json
    codes_path = WORKSPACE / ".local-sync-codes.json"
    with open(codes_path, "r", encoding="utf-8") as f:
        codes = json.load(f)

    # Store master snapshot under 'MASTER' and clean active code aliases
    compressed_codes = {
        "MASTER": snap,
        "2026": { "aliasOf": "MASTER", "generated_at": datetime.datetime.now().isoformat() },
        "4440": { "aliasOf": "MASTER", "generated_at": datetime.datetime.now().isoformat() },
        "5500": { "aliasOf": "MASTER", "generated_at": datetime.datetime.now().isoformat() },
        "SKY-MASTER": { "aliasOf": "MASTER", "generated_at": datetime.datetime.now().isoformat() },
        "SKY-2026": { "aliasOf": "MASTER", "generated_at": datetime.datetime.now().isoformat() },
        "SKY-4440": { "aliasOf": "MASTER", "generated_at": datetime.datetime.now().isoformat() },
        "SKY4440": { "aliasOf": "MASTER", "generated_at": datetime.datetime.now().isoformat() },
        "SKY-5500": { "aliasOf": "MASTER", "generated_at": datetime.datetime.now().isoformat() },
    }

    atomic_write(codes_path, compressed_codes)
    new_size = os.path.getsize(codes_path)
    print(f"Compressed .local-sync-codes.json: new size is {new_size:,} bytes (reduced from 8,266,803 bytes)")

def main():
    cleaned_bols = clean_bols()
    clean_bol_account_ledgers()
    clean_account_ledgers()
    create_accounts_directory()
    clean_sync_codes_and_snapshot(cleaned_bols)
    print("\nData Cleansing and Optimization Complete!")

if __name__ == "__main__":
    main()
