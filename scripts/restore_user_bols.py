#!/usr/bin/env python3
"""
Restore User Bills of Lading: BOL-2026-NSA516 and BOL-2026-NSA518
Includes full multi-modal shipment information, driver data, bilingual routes, and accounting ledger links.
"""

import os
import json
import uuid
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent

BOL_516 = {
    "id": "BOL-2026-NSA516",
    "bol_number": "BOL-2026-NSA516",
    "billOfLadingNumber": "BOL-2026-NSA516",
    "bolNo": "BOL-2026-NSA516",
    "issue_date": "2026-09-02",
    "issueDate": "2026-09-02",
    "persian_date": "۱۱ سنبله ۱۴۰۵",
    "persian_date_numeric": "۱۴۰۵/۰۶/۱۱",
    "notes_1": "نظرمحمد (بارمل)\n(+93) 0 700 203 307",
    "notes_1_label": "دکندهار بارګیرۍ مسؤل",
    "notes_1_theme": "blue",
    "notes_2": "اسلام قلعه نمبرونه | نماینده دوغارون / شماره تماس\nعصمت الله : 0729807676 • حاجی معلم صاحب : 0799007371 • حکمت الله : 0794983011",
    "notes_2_label": "BORDER REPRESENTATIVE / نماینده مرزی",
    "notes_2_theme": "blue",
    "truck_number": "هرات 21723",
    "truckNumber": "هرات 21723",
    "driver_name": "نوم محمدعلی ولد محمد اصغر",
    "driverName": "نوم محمدعلی ولد محمد اصغر",
    "driver_father_name": "محمد اصغر",
    "driverFatherName": "محمد اصغر",
    "driver_contact": "0711253814",
    "driverContact": "0711253814",
    "driver_rent": "45,000 AFN",
    "driverFreight": "45,000 AFN",
    "remarks": "کرایه واپسی | Invoice NO: INV-127",
    "shipper_name": "NAJEB AMIN LTD",
    "shipperName": "NAJEB AMIN LTD",
    "shipper_address": "Shorandam Industrial Area, Kandahar, Afghanistan\nT.L NO: 27-975",
    "shipper_contact": "+93 700 308 086",
    "shipper_email": "najebaminltd@hotmail.com",
    "consignee_name": "MANIK TRADERS",
    "consigneeName": "MANIK TRADERS",
    "consignee_address": "D-25, APMC Market-1, Phase-2, Sector-19, Vashi, Navi Mumbai – 400705, India.\nGST NO: 27AADFM0385M1ZO\nIEC NO: AADFM0385M\nPAN NO: AADFM0385M",
    "consignee_contact": "+9764265544",
    "consignee_email": "jaimanik@icloud.com",
    "notify_party": "YAAQOUB HAMDAN FOODSTUFF TRADING CO LLC",
    "notify_party_address": "Shop No: 28 Al Hawai Building, Al Ras Street, Deira Dubai, UAE\nTRN NO: 100340961000003",
    "routes": [
        {
            "id": "route-kdr-516",
            "location": "Kandahar",
            "locationPersian": "کندهار",
            "stopOrder": 1,
            "transportMode": "truck",
            "stopLabel": "Origin"
        },
        {
            "id": "route-dgh-516",
            "location": "Dougharoun",
            "locationPersian": "دوغارون",
            "stopOrder": 2,
            "transportMode": "truck",
            "stopLabel": "Stop 1"
        },
        {
            "id": "route-bba-516",
            "location": "Bandar Abbas",
            "locationPersian": "بندرعباس",
            "stopOrder": 3,
            "transportMode": "vessel",
            "stopLabel": "Stop 2"
        },
        {
            "id": "route-jbl-516",
            "location": "Jebel Ali Port",
            "locationPersian": "بندر جبل علی دبی",
            "stopOrder": 4,
            "transportMode": "vessel",
            "stopLabel": "Stop 3"
        },
        {
            "id": "route-jnpt-516",
            "location": "Jawaharlal Nehru Port (JNPT)",
            "locationPersian": "بندر نهاوا شیوا",
            "stopOrder": 5,
            "transportMode": "vessel",
            "stopLabel": "Destination"
        }
    ],
    "number_of_packages": "1382 CTNS - BLACK RAISNIS",
    "numberOfPackages": "1382 CTNS - BLACK RAISNIS",
    "kgs_per_carton": "16-KGS",
    "gross_weight_per_carton": "17.30-KGS",
    "net_weight": "22,112 KG",
    "netWeight": "22,112 KG",
    "gross_weight": "23,908.6 KG",
    "grossWeight": "23,908.6 KG",
    "rate_per_kgs": "1.35 USD",
    "goods_value": "29,851.20 USD",
    "goodsValue": "29,851.20 USD",
    "cargo_description": "📦 CONTAINER & CARGO DETAILS │ 🧾 DOCUMENT & SHIPPING DETAILS\n🥬 Cargo: BLACK RAISNIS 1382 CTNS 16 - KG RATE 1.35 $ │ 🧾 Invoice NO: INV-127",
    "cargoDescription": "📦 CONTAINER & CARGO DETAILS │ 🧾 DOCUMENT & SHIPPING DETAILS\n🥬 Cargo: BLACK RAISNIS 1382 CTNS 16 - KG RATE 1.35 $ │ 🧾 Invoice NO: INV-127",
    "updated_at": "2026-09-02T12:00:00.000Z",
    "created_at": "2026-09-02T12:00:00.000Z"
}

BOL_518 = {
    "id": "BOL-2026-NSA518",
    "bol_number": "BOL-2026-NSA518",
    "billOfLadingNumber": "BOL-2026-NSA518",
    "bolNo": "BOL-2026-NSA518",
    "issue_date": "2026-09-02",
    "issueDate": "2026-09-02",
    "persian_date": "۱۱ سنبله ۱۴۰۵",
    "persian_date_numeric": "۱۴۰۵/۰۶/۱۱",
    "notes_1": "نظرمحمد (بارمل)\n(+93) 0 700 203 307",
    "notes_1_label": "دکندهار بارګیرۍ مسؤل",
    "notes_1_theme": "blue",
    "notes_2": "دنیمروز نماینده نمبر:\n0711 263 528 079 335 3246",
    "notes_2_label": "دنیمروز نماینده نمبر",
    "notes_2_theme": "blue",
    "truck_number": "هرات 13252",
    "truckNumber": "هرات 13252",
    "driver_name": "نوم حمیدالله ولد عبدالحتان",
    "driverName": "نوم حمیدالله ولد عبدالحتان",
    "driver_father_name": "عبدالحتان",
    "driverFatherName": "عبدالحتان",
    "driver_contact": "0707700572 0793933033",
    "driverContact": "0707700572 0793933033",
    "driver_rent": "38,500 AFN",
    "driverFreight": "38,500 AFN",
    "shipper_name": "TAHIR SULTANI LTD",
    "shipperName": "TAHIR SULTANI LTD",
    "shipper_address": "SHOP NO. 118, PARK INDUSTRIAL AREA KANDAHAR, AFGHANISHTAN\nLICENSE NO. 29241",
    "shipper_contact": "+93 700720988, +93 700 389 045",
    "consignee_name": "NEW FOODS AGRO",
    "consigneeName": "NEW FOODS AGRO",
    "consignee_address": "511 / 1 Pvt no5 1st flr Katra ishwar bhawan ,khari Baoli Delhi-110006\nIEC - 0515038636 / GSTIN-07AALFN7144D1Z9 / FSSAI-10018011005463",
    "consignee_contact": "+919971119825",
    "consignee_email": "nfadhyfruits@gmail.com",
    "notify_party": "SULTANI BRAND FOODSTUFF TRADING CO",
    "notify_party_address": "Office F-4, 1st Floor, Obaid Ghanim Abdulrahman Mutaiwei, Al Ras, Deira Dubai, UAE\nUCNO: 1429815",
    "routes": [
        {
            "id": "route-kdr",
            "location": "Kandahar",
            "locationPersian": "کندهار",
            "stopOrder": 1,
            "transportMode": "truck",
            "stopLabel": "Origin"
        },
        {
            "id": "route-nmz",
            "location": "Nimroz",
            "locationPersian": "نیمروز / میلک",
            "stopOrder": 2,
            "transportMode": "truck",
            "stopLabel": "Stop 1"
        },
        {
            "id": "route-bba",
            "location": "Bandar Abbas",
            "locationPersian": "بندرعباس",
            "stopOrder": 3,
            "transportMode": "vessel",
            "stopLabel": "Stop 2"
        },
        {
            "id": "route-dxb",
            "location": "Dubai",
            "locationPersian": "دبی",
            "stopOrder": 4,
            "transportMode": "vessel",
            "stopLabel": "Stop 3"
        },
        {
            "id": "route-ns",
            "location": "Nhava Sheva",
            "locationPersian": "نوا شیوا",
            "stopOrder": 5,
            "transportMode": "vessel",
            "stopLabel": "Destination"
        }
    ],
    "number_of_packages": "1114 CTNS - DRY FIGS -257 CTNS DRY FIGS - 184 CTNS BLACK RAISNIS 259 CTNS DRY APRICOTS",
    "numberOfPackages": "1114 CTNS - DRY FIGS -257 CTNS DRY FIGS - 184 CTNS BLACK RAISNIS 259 CTNS DRY APRICOTS",
    "kgs_per_carton": "10 - KGS - 16-KGS - 16-KGS - 15-KGS",
    "gross_weight_per_carton": "11-KGS - 17-KGS - 17-KGS - 16-KGS",
    "net_weight": "11,140 KG - 4,112 KG - 2,944 KG - 3,885 KG",
    "netWeight": "11,140 KG - 4,112 KG - 2,944 KG - 3,885 KG",
    "gross_weight": "12,254 KG - 4,369 KG - 3,128 KG - 4,144 KG",
    "grossWeight": "12,254 KG - 4,369 KG - 3,128 KG - 4,144 KG",
    "rate_per_kgs": "2.50 USD - 2.50 USD - 2 USD - 1.50 USD",
    "goods_value": "27,850.00 USD - 10,280.00 USD - 5,888.00 USD - 5,827.50 USD",
    "goodsValue": "27,850.00 USD - 10,280.00 USD - 5,888.00 USD - 5,827.50 USD",
    "cargo_description": "📦 CONTAINER & CARGO DETAILS │ 🧾 DOCUMENT & SHIPPING DETAILS\n🥬 Cargo: 1114 CTNS - DRY FIGS 10KGS - │ 257 CTNS DRY FIGS 16KGS - 184 CTNS BLACK RAISNIS 16KGS - │ 259 CTNS DRY APRICOTS 15KGS │ 🧾 Invoice NO: INV-02",
    "cargoDescription": "📦 CONTAINER & CARGO DETAILS │ 🧾 DOCUMENT & SHIPPING DETAILS\n🥬 Cargo: 1114 CTNS - DRY FIGS 10KGS - │ 257 CTNS DRY FIGS 16KGS - 184 CTNS BLACK RAISNIS 16KGS - │ 259 CTNS DRY APRICOTS 15KGS │ 🧾 Invoice NO: INV-02",
    "remarks": "Invoice NO: INV-02",
    "updated_at": "2026-09-02T12:00:00.000Z",
    "created_at": "2026-09-02T12:00:00.000Z"
}

def atomic_write(filepath: Path, data):
    tmp = filepath.with_suffix(f".tmp.{uuid.uuid4().hex[:6]}")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(tmp, filepath)

def restore_bols():
    # 1. Update .local-bols.json
    bols_path = WORKSPACE / ".local-bols.json"
    with open(bols_path, "r", encoding="utf-8") as f:
        bols = json.load(f)

    bol_map = { (b.get("bol_number") or b.get("id")): b for b in bols }
    bol_map["BOL-2026-NSA516"] = BOL_516
    bol_map["BOL-2026-NSA518"] = BOL_518

    # Sort descending by date/number
    updated_bols = list(bol_map.values())
    atomic_write(bols_path, updated_bols)
    print(f"Updated .local-bols.json with BOL-516 & BOL-518 (Total: {len(updated_bols)})")

    # 2. Update .local-full-snapshot.json
    snap_path = WORKSPACE / ".local-full-snapshot.json"
    with open(snap_path, "r", encoding="utf-8") as f:
        snap = json.load(f)

    snap_docs = { (d.get("bol_number") or d.get("id")): d for d in snap.get("documents", []) }
    snap_docs["BOL-2026-NSA516"] = BOL_516
    snap_docs["BOL-2026-NSA518"] = BOL_518
    snap["documents"] = list(snap_docs.values())

    # Add TAHIR SULTANI LTD to accounts
    if "TAHIR SULTANI LTD" not in snap.get("accounts", []):
        snap["accounts"].append("TAHIR SULTANI LTD")
        snap["accounts"].sort()

    # Add to ledgerRecords in snapshot
    snap_ledger = snap.get("ledgerRecords", {})
    if "tahir sultani ltd" not in snap_ledger:
        snap_ledger["tahir sultani ltd"] = [{
            "id": "entry-nsa518",
            "sNo": 1,
            "date": "2026-09-02",
            "shipperDescription": "TAHIR SULTANI LTD",
            "invoiceNo": "INV-02",
            "dateOfShip": "2026-09-02",
            "barnamehNo": "BOL-2026-NSA518",
            "driverFreight": "38,500 AFN",
            "billOfLanding": "",
            "surrenderedBL": False,
            "containerNo": "N/A",
            "consignee": "NEW FOODS AGRO",
            "quantity": "1114 CTNS - DRY FIGS -257 CTNS DRY FIGS - 184 CTNS BLACK RAISNIS 259 CTNS DRY APRICOTS",
            "debit": 0,
            "credit": 0,
            "balance": 0
        }]
    snap["ledgerRecords"] = snap_ledger
    snap["updated_at"] = "2026-09-03T09:00:00.000Z"
    atomic_write(snap_path, snap)
    print(f"Updated .local-full-snapshot.json with BOL-516 & BOL-518")

    # 3. Update .local-sync-codes.json
    codes_path = WORKSPACE / ".local-sync-codes.json"
    with open(codes_path, "r", encoding="utf-8") as f:
        codes = json.load(f)
    if "MASTER" in codes:
        codes["MASTER"] = snap
        atomic_write(codes_path, codes)
        print(f"Updated .local-sync-codes.json MASTER snapshot")

    # 4. Update .local-accounts.json
    accs_path = WORKSPACE / ".local-accounts.json"
    with open(accs_path, "r", encoding="utf-8") as f:
        accs = json.load(f)
    if not any(a.get("name") == "TAHIR SULTANI LTD" for a in accs):
        accs.append({
            "id": f"acc-{uuid.uuid5(uuid.NAMESPACE_DNS, 'TAHIR SULTANI LTD').hex[:12]}",
            "name": "TAHIR SULTANI LTD",
            "address": "SHOP NO. 118, PARK INDUSTRIAL AREA KANDAHAR, AFGHANISHTAN",
            "contact": "+93 700 389 045",
            "type": "export",
            "created_at": "2026-09-02T12:00:00.000Z"
        })
        accs.sort(key=lambda x: x["name"])
        atomic_write(accs_path, accs)
        print(f"Added TAHIR SULTANI LTD to .local-accounts.json (Total: {len(accs)})")

    # 5. Update .local-bol-account-ledgers.json
    bol_ledgers_path = WORKSPACE / ".local-bol-account-ledgers.json"
    with open(bol_ledgers_path, "r", encoding="utf-8") as f:
        bol_ledgers = json.load(f)

    if "TAHIR SULTANI LTD" not in bol_ledgers.get("customCompanies", []):
        bol_ledgers["customCompanies"].append("TAHIR SULTANI LTD")
        bol_ledgers["customCompanies"].sort()

    bol_records = bol_ledgers.get("ledgerRecords", {})
    if "tahir sultani ltd" not in bol_records:
        bol_records["tahir sultani ltd"] = [{
            "id": "entry-nsa518",
            "sNo": 1,
            "date": "2026-09-02",
            "shipperDescription": "TAHIR SULTANI LTD",
            "invoiceNo": "INV-02",
            "dateOfShip": "2026-09-02",
            "barnamehNo": "BOL-2026-NSA518",
            "driverFreight": "38,500 AFN",
            "billOfLanding": "",
            "surrenderedBL": False,
            "containerNo": "N/A",
            "consignee": "NEW FOODS AGRO",
            "quantity": "1114 CTNS - DRY FIGS -257 CTNS DRY FIGS - 184 CTNS BLACK RAISNIS 259 CTNS DRY APRICOTS",
            "debit": 0,
            "credit": 0,
            "balance": 0
        }]
    bol_ledgers["ledgerRecords"] = bol_records
    atomic_write(bol_ledgers_path, bol_ledgers)
    print(f"Updated .local-bol-account-ledgers.json")

    # 6. Update .local-account-ledgers.json
    acct_ledgers_path = WORKSPACE / ".local-account-ledgers.json"
    with open(acct_ledgers_path, "r", encoding="utf-8") as f:
        acct_ledgers = json.load(f)

    if "TAHIR SULTANI LTD" not in acct_ledgers.get("accounts", []):
        acct_ledgers["accounts"].append("TAHIR SULTANI LTD")
        acct_ledgers["accounts"].sort()

    entries = acct_ledgers.get("ledgerEntries", {})
    if "tahir sultani ltd" not in entries:
        entries["tahir sultani ltd"] = [{
            "id": "entry-nsa518",
            "sNo": 1,
            "date": "2026-09-02",
            "shipperDescription": "TAHIR SULTANI LTD",
            "invoiceNo": "INV-02",
            "dateOfShip": "2026-09-02",
            "barnamehNo": "BOL-2026-NSA518",
            "driverFreight": "38,500 AFN",
            "billOfLanding": "",
            "surrenderedBL": False,
            "containerNo": "N/A",
            "consignee": "NEW FOODS AGRO",
            "quantity": "1114 CTNS - DRY FIGS -257 CTNS DRY FIGS - 184 CTNS BLACK RAISNIS 259 CTNS DRY APRICOTS",
            "debit": 0,
            "credit": 0,
            "balance": 0
        }]
    acct_ledgers["ledgerEntries"] = entries
    atomic_write(acct_ledgers_path, acct_ledgers)
    print(f"Updated .local-account-ledgers.json")

if __name__ == "__main__":
    restore_bols()
    print("\nRestoration of BOL-2026-NSA516 and BOL-2026-NSA518 successfully completed!")
