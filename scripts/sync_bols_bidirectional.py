import json
import sqlite3
import os
import re
import uuid
from datetime import datetime
from pathlib import Path

WORKSPACE = Path("d:/SOFTWARES-APPS/BOL-SOFTWARE-V5")
LOCAL_DB = WORKSPACE / "data" / "app.db"
LOCAL_BOLS_JSON = WORKSPACE / ".local-bols.json"
APPDATA = os.environ.get("APPDATA", "")
DEV_DB = Path(APPDATA) / "AQ COMPANIES Dev" / "data" / "app.db" if APPDATA else None
PROD_DB = Path(APPDATA) / "AQ COMPANIES" / "data" / "app.db" if APPDATA else None

def parse_num(val, default=0.0):
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).replace(",", "").strip()
    match = re.search(r"[-+]?\d*\.?\d+", s)
    if match:
        try:
            return float(match.group(0))
        except ValueError:
            return default
    return default

def parse_int(val, default=0):
    return int(round(parse_num(val, default)))

def parse_date_str(val):
    if not val:
        return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    s = str(val).strip()
    try:
        if "T" in s:
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        if len(s) == 10:
            return f"{s} 00:00:00"
        return s
    except Exception:
        return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

def sync():
    print(f"Loading .local-bols.json...")
    with open(LOCAL_BOLS_JSON, "r", encoding="utf-8") as f:
        json_bols = json.load(f)
    print(f"Found {len(json_bols)} BOLs in .local-bols.json")

    # Connect to local database
    conn = sqlite3.connect(LOCAL_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT * FROM bol_records;")
    db_rows = [dict(r) for r in cur.fetchall()]
    print(f"Found {len(db_rows)} BOLs in {LOCAL_DB}")

    existing_db_bol_nums = {r["bol_number"].strip(): r for r in db_rows if r.get("bol_number")}
    json_bol_map = { (b.get("bol_number") or b.get("id")).strip(): b for b in json_bols if (b.get("bol_number") or b.get("id")) }

    # 1. Insert any JSON BOLs that are not in DB into DB
    inserted_to_db = 0
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    for num, b in json_bol_map.items():
        if num not in existing_db_bol_nums:
            bol_id = b.get("id") or str(uuid.uuid4())
            bol_num = b.get("bol_number") or num
            issue_date = parse_date_str(b.get("issue_date") or b.get("created_at"))
            origin = b.get("origin") or b.get("port_of_loading") or "Kandahar, Afghanistan"
            dest = b.get("destination") or b.get("port_of_discharge") or b.get("place_of_delivery") or "India"
            border = b.get("border_station") or b.get("borderCrossing") or "Dogharoon / Islam Qala"
            driver_name = b.get("driver_name") or b.get("driverName") or ""
            father_name = b.get("driver_father_name") or b.get("driverFatherName") or ""
            driver_rent = parse_num(b.get("driver_rent") or b.get("driverFreight"))
            carton_count = parse_int(b.get("carton_count") or b.get("number_of_packages"))
            gross_weight = parse_num(b.get("gross_weight") or b.get("grossWeight"))
            net_weight = parse_num(b.get("net_weight") or b.get("netWeight"))
            cargo_desc = b.get("cargo_description") or b.get("cargoDescription") or b.get("description_of_goods") or ""
            shipper = b.get("shipper_name") or b.get("shipperName") or ""
            consignee = b.get("consignee_name") or b.get("consigneeName") or ""
            notify = b.get("notify_party") or ""
            status = b.get("status") or "active"
            currency = b.get("currency") or "USD"
            freight_fee = parse_num(b.get("goods_value") or b.get("goodsValue"))

            cur.execute("""
                INSERT OR REPLACE INTO bol_records (
                    id, bol_number, issue_date, origin, destination, border_station,
                    driver_name, father_name, driver_rent, carton_count, gross_weight_kg,
                    net_weight_kg, cargo_description, status, freight_fee, demurrage_fee,
                    documentation_fee, currency, exchange_rate, shipper_name, consignee_name,
                    notify_party_name, revision, created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?
                )
            """, (
                bol_id, bol_num, issue_date, origin, dest, border,
                driver_name, father_name, driver_rent, carton_count, gross_weight,
                net_weight, cargo_desc, status, freight_fee, 0.0,
                0.0, currency, 1.0, shipper, consignee,
                notify, 1, issue_date, now_str
            ))
            inserted_to_db += 1

    conn.commit()
    print(f"Inserted {inserted_to_db} new BOLs into {LOCAL_DB}")

    # 2. Export any DB BOLs not in JSON into JSON
    added_to_json = 0
    cur.execute("SELECT * FROM bol_records;")
    all_db_rows = [dict(r) for r in cur.fetchall()]

    for r in all_db_rows:
        num = (r.get("bol_number") or r.get("id")).strip()
        if num not in json_bol_map:
            # Convert DB row to JSON BOL format
            new_json_bol = {
                "id": r["id"],
                "bol_number": r["bol_number"],
                "billOfLadingNumber": r["bol_number"],
                "bolNo": r["bol_number"],
                "issue_date": str(r["issue_date"])[:10] if r.get("issue_date") else "",
                "issueDate": str(r["issue_date"])[:10] if r.get("issue_date") else "",
                "shipper_name": r.get("shipper_name") or "",
                "shipperName": r.get("shipper_name") or "",
                "consignee_name": r.get("consignee_name") or "",
                "consigneeName": r.get("consignee_name") or "",
                "notify_party": r.get("notify_party_name") or "",
                "driver_name": r.get("driver_name") or "",
                "driverName": r.get("driver_name") or "",
                "driver_father_name": r.get("father_name") or "",
                "driverFatherName": r.get("father_name") or "",
                "driver_rent": f"{r.get('driver_rent', 0):,.2f} {r.get('currency', 'USD')}",
                "driverFreight": f"{r.get('driver_rent', 0):,.2f} {r.get('currency', 'USD')}",
                "number_of_packages": f"{r.get('carton_count', 0)} CTNS" if r.get("carton_count") else "",
                "numberOfPackages": f"{r.get('carton_count', 0)} CTNS" if r.get("carton_count") else "",
                "gross_weight": f"{r.get('gross_weight_kg', 0):,.1f} KG" if r.get("gross_weight_kg") else "",
                "grossWeight": f"{r.get('gross_weight_kg', 0):,.1f} KG" if r.get("gross_weight_kg") else "",
                "net_weight": f"{r.get('net_weight_kg', 0):,.1f} KG" if r.get("net_weight_kg") else "",
                "netWeight": f"{r.get('net_weight_kg', 0):,.1f} KG" if r.get("net_weight_kg") else "",
                "cargo_description": r.get("cargo_description") or "",
                "cargoDescription": r.get("cargo_description") or "",
                "goods_value": f"{r.get('freight_fee', 0):,.2f} {r.get('currency', 'USD')}" if r.get("freight_fee") else "",
                "goodsValue": f"{r.get('freight_fee', 0):,.2f} {r.get('currency', 'USD')}" if r.get("freight_fee") else "",
                "port_of_loading": r.get("origin") or "",
                "port_of_discharge": r.get("destination") or "",
                "place_of_delivery": r.get("destination") or "",
                "borderCrossing": r.get("border_station") or "",
                "status": r.get("status") or "active",
                "created_at": str(r.get("created_at") or now_str),
                "updated_at": str(r.get("updated_at") or now_str),
            }
            json_bol_map[num] = new_json_bol
            added_to_json += 1

    conn.close()

    # Write back merged JSON
    merged_json_list = list(json_bol_map.values())
    # Sort descending by date/number
    merged_json_list.sort(key=lambda x: (x.get("issue_date") or x.get("created_at") or "", x.get("bol_number") or ""), reverse=True)

    tmp_json = LOCAL_BOLS_JSON.with_suffix(".tmp.sync")
    with open(tmp_json, "w", encoding="utf-8") as f:
        json.dump(merged_json_list, f, indent=2, ensure_ascii=False)
    os.replace(tmp_json, LOCAL_BOLS_JSON)
    print(f"Added {added_to_json} DB BOLs to .local-bols.json (Total now: {len(merged_json_list)})")

    # Also update .local-full-snapshot.json
    snap_path = WORKSPACE / ".local-full-snapshot.json"
    if snap_path.exists():
        try:
            with open(snap_path, "r", encoding="utf-8") as f:
                snap = json.load(f)
            snap["documents"] = merged_json_list
            snap["updated_at"] = now_str
            tmp_snap = snap_path.with_suffix(".tmp.sync")
            with open(tmp_snap, "w", encoding="utf-8") as f:
                json.dump(snap, f, indent=2, ensure_ascii=False)
            os.replace(tmp_snap, snap_path)
            print(f"Updated .local-full-snapshot.json with all {len(merged_json_list)} BOLs")
        except Exception as e:
            print("Warning updating snapshot:", e)

if __name__ == "__main__":
    sync()
