# -*- coding: utf-8 -*-
import os, sys, json, sqlite3, subprocess, datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel
import uvicorn

sys.stdout.reconfigure(encoding='utf-8')

WORKDIR = r"e:\My-Softwares-+\SKY-CMR-BORDER"
DB_PATH = os.path.join(WORKDIR, "cmr_database.db")

# Initialize SQLite Database
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Documents table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        cmr_number TEXT NOT NULL,
        consignor TEXT,
        origin TEXT,
        consignee TEXT,
        destination TEXT,
        commodity TEXT,
        gross_weight TEXT,
        declared_value TEXT,
        truck_plate TEXT,
        driver_name TEXT,
        status TEXT DEFAULT '🟢 Dispatched',
        full_data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # Active Draft table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS active_draft (
        id INTEGER PRIMARY KEY,
        draft_data TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # Pre-populate sample if database is brand new
    cursor.execute("SELECT COUNT(*) FROM documents")
    if cursor.fetchone()[0] == 0:
        samples = [
            {
                "id": "doc_sample_1",
                "cmr_number": "CMR NO 0001",
                "consignor": "NAJEB AMIN LTD",
                "origin": "Kandahar, Afghanistan",
                "consignee": "RCA EXIM PRIVATE LIMITED",
                "destination": "New Delhi, India",
                "commodity": "GREEN RAISINS (521 CTNS)",
                "gross_weight": "9,013.30 KG",
                "declared_value": "33,344.00 USD",
                "truck_plate": "کندهار 794",
                "driver_name": "غمی ولد حاجی شاه محمد",
                "status": "🟢 Dispatched",
                "full_data": json.dumps({
                    "cmr_top_number": "CMR NO 0001",
                    "saved_at": "2026-08-22 14:30",
                    "fields": {
                        "f_consignor": "NAJEB AMIN LTD\nT.L NO: 27-975\nShorandam Industrial Area, Kandahar, Afghanistan\nTel: +93 700 308 086",
                        "f_consignee": "RCA EXIM PRIVATE LIMITED\n1112 2ND AND 3RD FLOOR GANDHI GALI FATEHPURI DELHI 110006 INDIA",
                        "f_carrier": "SKY ARIANA LIMITED\nImport & Export - International Transportation\nKandahar, Afghanistan",
                        "f_unload_place": "New Delhi (DEL)",
                        "f_unload_country": "INDIA",
                        "f_load_place": "Kandahar (Shorandam Industrial Area)",
                        "f_load_country": "AFGHANISTAN",
                        "f_load_date": "2026-08-22",
                        "f_successive_carrier": "Direct Transit via Hairatan & Tashkent",
                        "f_carrier_reservations": "Goods received in apparent good order and condition. Seals intact.",
                        "f_docs_attached": "Invoice #111, SAFTA #24707, Packing List, Phytosanitary Cert",
                        "f_marks_1": "521 CTNS",
                        "f_pkg_1": "521 CTNS",
                        "f_meth_1": "Export Cartons",
                        "f_desc_1": "GREEN RAISINS (BEST) - کشمش سبز",
                        "f_stat_1": "0806.20.10",
                        "f_wt_1": "9,013.30 KG",
                        "f_vol_1": "28.50 CBM",
                        "f_sender_inst": "Keep dry and ventilated. Customs clearance at designated border terminal.",
                        "f_declared_val": "33,344.00 USD",
                        "c_c_send": "1,250.40",
                        "c_c_curr": "USD",
                        "c_sup_send": "200.00",
                        "c_sup_curr": "USD",
                        "c_tot_send": "1,450.40",
                        "c_tot_curr": "USD",
                        "f_est_in": "Kandahar, Afghanistan",
                        "f_est_on": "2026-08-22",
                        "f_tractor_reg": "کندهار 794",
                        "f_trailer_reg": "AF-KDR-794",
                        "f_tractor_type": "Kamaz 6520 Heavy Cargo Truck",
                        "f_trailer_type": "Box Body Refrigerated Cargo",
                        "f_driver_1": "غمی ولد حاجی شاه محمد",
                        "f_driver_2": "Tel: 0700029181",
                        "f_rout_no": "CMR NO 0001",
                        "f_rout_date": "2026-08-22"
                    }
                }),
                "created_at": "2026-08-22 14:30",
                "updated_at": "2026-08-22 14:30"
            },
            {
                "id": "doc_sample_2",
                "cmr_number": "CMR NO 0002",
                "consignor": "Pars Middle East Exporting Group",
                "origin": "Tehran, Iran",
                "consignee": "EURO-ASIA LOGISTICS GMBH",
                "destination": "Hamburg Port, Germany",
                "commodity": "ROASTED PISTACHIOS AAA (920 CTNS)",
                "gross_weight": "23,450.00 KG",
                "declared_value": "195,500.00 USD",
                "truck_plate": "34 ع 789 - ایران 22",
                "driver_name": "حسین رضایی (Hossein Rezaei)",
                "status": "🟡 In Transit",
                "full_data": json.dumps({
                    "cmr_top_number": "CMR NO 0002",
                    "saved_at": "2026-08-24 10:15",
                    "fields": {
                        "f_consignor": "Pars Middle East Exporting Group\nTehran, Iran",
                        "f_consignee": "EURO-ASIA LOGISTICS GMBH\nHafenstrasse 45, Hamburg, Germany",
                        "f_carrier": "Silk Road Transit Transport Ltd.",
                        "f_unload_place": "Hamburg Port",
                        "f_unload_country": "GERMANY",
                        "f_load_place": "Tehran West Customs",
                        "f_load_country": "IRAN",
                        "f_load_date": "2026-08-24",
                        "f_declared_val": "195,500.00 USD",
                        "f_marks_1": "920 CTNS",
                        "f_pkg_1": "920 CTNS",
                        "f_meth_1": "Standard Export Cartons",
                        "f_desc_1": "ROASTED PISTACHIOS AAA (Pistacia vera)",
                        "f_stat_1": "0802.51.00",
                        "f_wt_1": "23,450.00 KG",
                        "f_vol_1": "52.00 CBM",
                        "f_tractor_reg": "34 ع 789 - ایران 22",
                        "f_trailer_reg": "67 ع 123 - ایران 22",
                        "f_tractor_type": "Scania R500 Topline",
                        "f_trailer_type": "Schmitz Cargobull Reefer",
                        "f_driver_1": "حسین رضایی (Hossein Rezaei)",
                        "f_rout_no": "CMR NO 0002",
                        "f_rout_date": "2026-08-24"
                    }
                }),
                "created_at": "2026-08-24 10:15",
                "updated_at": "2026-08-24 10:15"
            },
            {
                "id": "doc_sample_3",
                "cmr_number": "CMR NO 0003",
                "consignor": "Tehran Heavy Industrial Manufacturing",
                "origin": "Tehran Industrial City, Iran",
                "consignee": "ANATOLIA INDUSTRIAL TOOLS INC",
                "destination": "Bursa Terminal, Turkey",
                "commodity": "CNC PRECISION MILLING (18 CRATES)",
                "gross_weight": "18,900.00 KG",
                "declared_value": "340,000.00 USD",
                "truck_plate": "88 ع 456 - ایران 11",
                "driver_name": "علیرضا قاسمی (Alireza Ghasemi)",
                "status": "🔵 Delivered",
                "full_data": json.dumps({
                    "cmr_top_number": "CMR NO 0003",
                    "saved_at": "2026-08-26 16:45",
                    "fields": {
                        "f_consignor": "Tehran Heavy Industrial Manufacturing\nIndustrial City, Phase 3, Tehran, Iran",
                        "f_consignee": "ANATOLIA INDUSTRIAL TOOLS INC\nBursa, Turkey",
                        "f_carrier": "Trans-Eurasia Cargo Lines",
                        "f_unload_place": "Bursa Terminal",
                        "f_unload_country": "TURKEY",
                        "f_load_place": "Tehran Industrial City",
                        "f_load_country": "IRAN",
                        "f_load_date": "2026-08-26",
                        "f_declared_val": "340,000.00 USD",
                        "f_marks_1": "IND-TR-4102",
                        "f_pkg_1": "18 Crates",
                        "f_meth_1": "Reinforced Wooden Crates",
                        "f_desc_1": "CNC Precision Milling Equipment & Heavy Tooling",
                        "f_stat_1": "8459.61.00",
                        "f_wt_1": "18,900.00 KG",
                        "f_vol_1": "44.50 CBM",
                        "f_tractor_reg": "88 ع 456 - ایران 11",
                        "f_trailer_reg": "12 ع 789 - ایران 11",
                        "f_tractor_type": "Volvo FH16 750",
                        "f_trailer_type": "Krone Mega Flatbed",
                        "f_driver_1": "علیرضا قاسمی (Alireza Ghasemi)",
                        "f_rout_no": "CMR NO 0003",
                        "f_rout_date": "2026-08-26"
                    }
                }),
                "created_at": "2026-08-26 16:45",
                "updated_at": "2026-08-26 16:45"
            }
        ]
        
        for s in samples:
            cursor.execute("""
            INSERT INTO documents (id, cmr_number, consignor, origin, consignee, destination, commodity, gross_weight, declared_value, truck_plate, driver_name, status, full_data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                s["id"], s["cmr_number"], s["consignor"], s["origin"],
                s["consignee"], s["destination"], s["commodity"], s["gross_weight"],
                s["declared_value"], s["truck_plate"], s["driver_name"], s["status"],
                s["full_data"], s["created_at"], s["updated_at"]
            ))
    
    conn.commit()
    conn.close()

init_db()

# Create FastAPI App
app = FastAPI(title="Sky Ariana CMR Express Backend API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class DocumentModel(BaseModel):
    id: Optional[str] = None
    cmr_number: str
    consignor: Optional[str] = ""
    origin: Optional[str] = ""
    consignee: Optional[str] = ""
    destination: Optional[str] = ""
    commodity: Optional[str] = ""
    gross_weight: Optional[str] = ""
    value: Optional[str] = ""
    truck: Optional[str] = ""
    driver: Optional[str] = ""
    status: Optional[str] = "🟢 Dispatched"
    fullData: Dict[str, Any]

class DraftModel(BaseModel):
    cmr_top_number: Optional[str] = "CMR NO 0001"
    saved_at: Optional[str] = None
    fields: Dict[str, Any]

# API Endpoints
@app.get("/api/health")
def health():
    return {"status": "online", "database": "sqlite3", "version": "3.0.0"}

@app.get("/api/documents")
def list_documents(q: Optional[str] = None, tag: Optional[str] = None):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = "SELECT * FROM documents ORDER BY updated_at DESC"
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        item = {
            "id": r["id"],
            "cmr_number": r["cmr_number"],
            "consignor": r["consignor"],
            "origin": r["origin"],
            "consignee": r["consignee"],
            "destination": r["destination"],
            "commodity": r["commodity"],
            "gross_weight": r["gross_weight"],
            "value": r["declared_value"],
            "truck": r["truck_plate"],
            "driver": r["driver_name"],
            "status": r["status"],
            "saved_at": r["updated_at"],
            "fullData": json.loads(r["full_data"])
        }
        
        # Filter in Python
        if q:
            needle = q.lower()
            haystack = (item["cmr_number"] + " " + item["consignor"] + " " + item["consignee"] + " " + (item["origin"] or "") + " " + (item["destination"] or "") + " " + item["commodity"]).lower()
            if needle not in haystack:
                continue
                
        if tag:
            if tag == 'kandahar' and 'kandahar' not in ((item["origin"] or "") + (item["consignor"] or "")).lower():
                continue
            if tag == 'india' and ('india' not in (item["destination"] or "").lower() and 'delhi' not in (item["destination"] or "").lower()):
                continue
            if tag == 'dispatched' and 'dispatched' not in item["status"].lower():
                continue

        results.append(item)

    return results

@app.get("/api/documents/{doc_id}")
def get_document(doc_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents WHERE id = ? OR cmr_number = ?", (doc_id, doc_id))
    r = cursor.fetchone()
    conn.close()

    if not r:
        raise HTTPException(status_code=404, detail="Document not found")
        
    return {
        "id": r["id"],
        "cmr_number": r["cmr_number"],
        "consignor": r["consignor"],
        "origin": r["origin"],
        "consignee": r["consignee"],
        "destination": r["destination"],
        "commodity": r["commodity"],
        "gross_weight": r["gross_weight"],
        "value": r["declared_value"],
        "truck": r["truck_plate"],
        "driver": r["driver_name"],
        "status": r["status"],
        "saved_at": r["updated_at"],
        "fullData": json.loads(r["full_data"])
    }

@app.post("/api/documents")
def save_document(doc: DocumentModel):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    doc_id = doc.id or f"doc_{int(datetime.datetime.now().timestamp() * 1000)}"
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Check if exists by cmr_number or id
    cursor.execute("SELECT id FROM documents WHERE id = ? OR cmr_number = ?", (doc_id, doc.cmr_number))
    existing = cursor.fetchone()

    full_data_json = json.dumps(doc.fullData)

    if existing:
        target_id = existing[0]
        cursor.execute("""
        UPDATE documents SET
            cmr_number = ?,
            consignor = ?,
            origin = ?,
            consignee = ?,
            destination = ?,
            commodity = ?,
            gross_weight = ?,
            declared_value = ?,
            truck_plate = ?,
            driver_name = ?,
            status = ?,
            full_data = ?,
            updated_at = ?
        WHERE id = ?
        """, (
            doc.cmr_number, doc.consignor, doc.origin, doc.consignee, doc.destination,
            doc.commodity, doc.gross_weight, doc.value, doc.truck, doc.driver,
            doc.status, full_data_json, now_str, target_id
        ))
    else:
        cursor.execute("""
        INSERT INTO documents (id, cmr_number, consignor, origin, consignee, destination, commodity, gross_weight, declared_value, truck_plate, driver_name, status, full_data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            doc_id, doc.cmr_number, doc.consignor, doc.origin, doc.consignee, doc.destination,
            doc.commodity, doc.gross_weight, doc.value, doc.truck, doc.driver,
            doc.status, full_data_json, now_str, now_str
        ))

    conn.commit()
    conn.close()

    return {"status": "success", "id": doc_id, "cmr_number": doc.cmr_number, "saved_at": now_str}

@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()

    if deleted == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "deleted", "id": doc_id}

@app.get("/api/draft")
def get_active_draft():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT draft_data, updated_at FROM active_draft WHERE id = 1")
    row = cursor.fetchone()
    conn.close()

    if row:
        return {"draft": json.loads(row[0]), "updated_at": row[1]}
    return {"draft": None}

@app.post("/api/draft")
def save_active_draft(draft: DraftModel):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    draft_json = json.dumps(draft.dict())

    cursor.execute("""
    INSERT INTO active_draft (id, draft_data, updated_at)
    VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        draft_data = excluded.draft_data,
        updated_at = excluded.updated_at
    """, (draft_json, now_str))

    conn.commit()
    conn.close()

    return {"status": "draft_saved", "updated_at": now_str}

@app.get("/api/backup")
def export_backup():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    conn.close()

    docs = []
    for r in rows:
        docs.append({
            "id": r["id"],
            "cmr_number": r["cmr_number"],
            "consignor": r["consignor"],
            "origin": r["origin"],
            "consignee": r["consignee"],
            "destination": r["destination"],
            "commodity": r["commodity"],
            "gross_weight": r["gross_weight"],
            "value": r["declared_value"],
            "truck": r["truck_plate"],
            "driver": r["driver_name"],
            "status": r["status"],
            "saved_at": r["updated_at"],
            "fullData": json.loads(r["full_data"])
        })

    return Response(
        content=json.dumps(docs, indent=2, ensure_ascii=False),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=SkyAriana_CMR_Backup_{datetime.date.today()}.json"}
    )

@app.post("/api/import")
async def import_backup(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        data = json.loads(contents.decode('utf-8'))
        if not isinstance(data, list):
            raise HTTPException(status_code=400, detail="Invalid JSON backup structure")
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        count = 0
        for doc in data:
            doc_id = doc.get("id") or f"doc_{int(datetime.datetime.now().timestamp() * 1000)}"
            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            full_data_json = json.dumps(doc.get("fullData", {}))
            
            cursor.execute("""
            INSERT INTO documents (id, cmr_number, consignor, origin, consignee, destination, commodity, gross_weight, declared_value, truck_plate, driver_name, status, full_data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                cmr_number = excluded.cmr_number,
                consignor = excluded.consignor,
                origin = excluded.origin,
                consignee = excluded.consignee,
                destination = excluded.destination,
                commodity = excluded.commodity,
                gross_weight = excluded.gross_weight,
                declared_value = excluded.declared_value,
                truck_plate = excluded.truck_plate,
                driver_name = excluded.driver_name,
                status = excluded.status,
                full_data = excluded.full_data,
                updated_at = excluded.updated_at
            """, (
                doc_id, doc.get("cmr_number", "CMR NO 0001"), doc.get("consignor", ""), doc.get("origin", ""),
                doc.get("consignee", ""), doc.get("destination", ""), doc.get("commodity", ""), doc.get("gross_weight", ""),
                doc.get("value", ""), doc.get("truck", ""), doc.get("driver", ""), doc.get("status", "🟢 Dispatched"),
                full_data_json, now_str, now_str
            ))
            count += 1
            
        conn.commit()
        conn.close()
        return {"status": "imported", "count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount Static Files for direct frontend serving
app.mount("/", StaticFiles(directory=WORKDIR, html=True), name="static")

if __name__ == "__main__":
    print(f"🚀 Starting Sky Ariana CMR FastAPI Backend on http://127.0.0.1:3000")
    uvicorn.run(app, host="127.0.0.1", port=3000, log_level="info")
