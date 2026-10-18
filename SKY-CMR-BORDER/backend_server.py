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

WORKDIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(WORKDIR, "cmr_database.db")


# Initialize SQLite Database Connection Helper
def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn

def init_db():
    conn = get_db_connection()
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

    # App Settings (Sequential Counter & Config)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    # Saved Entities (Shวิppers, Consignees, Commodities, Drivers, Trucks for Recommendations)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS saved_entities (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        details TEXT NOT NULL,
        usage_count INTEGER DEFAULT 1,
        updated_at TEXT NOT NULL
    )
    """)

    # Ensure counter is initialized to 5 so next CMR is NO - 006
    cursor.execute("SELECT value FROM app_settings WHERE key = 'cmr_serial_counter'")
    if not cursor.fetchone():
        cursor.execute("INSERT INTO app_settings (key, value) VALUES ('cmr_serial_counter', '5')")

    # Pre-populate recommended entities if empty
    cursor.execute("SELECT COUNT(*) FROM saved_entities")
    if cursor.fetchone()[0] == 0:
        now_s = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        preset_entities = [
            # Senders
            ("ent_s_1", "consignor", "SABOOR ADEL TRADING COMPANY", '"SABOOR ADEL TRADING COMPANY"\nAdd: Afghanistan-Balkh Province Mazar Business Center 5th floor Office No: 07\nTel: +93780780288\nTIN: 1010411161', 10, now_s),
            ("ent_s_2", "consignor", "NAJIB AMIN LTD", 'NAJIB AMIN LTD\nT.L 27-975 T.L SHORANDAM INDUSTRIAL AREA KANDAHAR AFGHANISTAN. TELL: +93700308086\nNOTIFY PARTY: PAYMENT HAS TO BE MADE TO YAAQOUB HAMDAN FOODSTUFF TRADING CO LLC SHOP NO:28 AL HAWAI BUILDING AL RAS STREET DEIRA DUBAI\nUAE TRN NO : 100340961000003', 8, now_s),
            ("ent_s_3", "consignor", "SKY ARIANA EXPORT CO.", 'SKY ARIANA EXPORT & TRADING CO.\nKabul & Kandahar, Afghanistan\nTel: +93 700 939 565\nTIN: 1004829102', 5, now_s),
            # Consignees
            ("ent_c_1", "consignee", "MUHEB RAHMAN GLOBALTRADING LTD", 'MUHEB RAHMAN GLOBALTRADING LTD\nAdd: REPUBLIC OF UZBEKISTAN SURXONDARYA REGION TERMEZ CITY JAYHUN MFYAJ HAKIMAT-TERMIZY STREE\nTIN: 312034734', 10, now_s),
            ("ent_c_2", "consignee", "JDM ENTERPRISES", 'JDM ENTERPRISES\n132 / B, BEHIND GEETA VIHAR HOTEL, NEAR SPENCER\'S GYM, SANTACRUZ (EAST) MUMBAI 400029 INDIA.\nFSSAI NO: 10018022007908\nGSTIN: 27BAAPA6587K1ZH\nIEC: BAAPA6587K\nPAN NO: BAAPA6587K', 8, now_s),
            ("ent_c_3", "consignee", "RCA EXIM PRIVATE LIMITED", 'RCA EXIM PRIVATE LIMITED\n1112 2ND AND 3RD FLOOR GANDHI GALI FATEHPURI DELHI 110006 INDIA\nGSTIN: 07AABCR1234F1Z5\nIEC: 0511012345', 7, now_s),
            ("ent_c_4", "consignee", "EURO-ASIA LOGISTICS GMBH", 'EURO-ASIA LOGISTICS GMBH\nHafenstrasse 45, Hamburg, Germany\nVAT: DE 298471902', 4, now_s),
            # Carriers
            ("ent_car_1", "carrier", "SKY ARIANA LIMITED", 'SKY ARIANA LIMITED\nImport & Export - International Transportation\nLicense: 2481-2198\nWebsite: www.skyariana.com\nEmails: info@skyariana.com, transport@skyariana.com\nPhones: +93 700 939 565, +93 711 435 529\nKandahar Office: 2nd Floor, 16 No. Office, Shahidano Chowk, Etimad Rahmi Market, Kandahar, Afghanistan\nKabul Office: Shahr-e-now, Haji Yaqoub Square', 10, now_s),
            ("ent_car_2", "carrier", "MANDUZAY TRANSPORTATION", '“MANDUZAY TRANSPORTATION COMPANY”\nInternational Freight & Transit Services\nKabul - Mazar - Hairatan', 6, now_s),
            # Commodities
            ("ent_g_1", "commodity", "AFGHAN BROOM (360 BUNDLES 16000 PCS)", '1.   360 BUNDLES 16000 PCS 10000 KG AFGHAN BROOM', 10, now_s),
            ("ent_g_2", "commodity", "BLACK RAISINS BEST (631 CTNS)", '1.   631 CTNS - BLACK-RAISINS (BEST)', 8, now_s),
            ("ent_g_3", "commodity", "GREEN RAISINS KANDAHAR (521 CTNS)", '1.   521 CTNS - GREEN RAISINS (KANDAHAR CHOICE)', 7, now_s),
            ("ent_g_4", "commodity", "DRIED FIGS AAA (450 BAGS)", '1.   450 BAGS - DRIED FIGS AAA QUALITY', 5, now_s),
            # Customs
            ("ent_cus_1", "customs", "CUSTOM POST Termiz", 'CUSTOM POST "Termiz"\nCODE POST: 22005', 10, now_s),
            ("ent_cus_2", "customs", "TOSHKENT AVIA YUKLAR", 'COUSTOM POST : TOSHKENT AVIA YUKLAR\nVED CODE:00102', 8, now_s),
        ]
        cursor.executemany("""
        INSERT INTO saved_entities (id, type, name, details, usage_count, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, preset_entities)
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
            INSERT OR IGNORE INTO documents (id, cmr_number, consignor, origin, consignee, destination, commodity, gross_weight, declared_value, truck_plate, driver_name, status, full_data, created_at, updated_at)
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


@app.middleware("http")
async def add_no_cache_header(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

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
    pad_type: Optional[int] = 1
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
    cmr_top_number: Optional[str] = "NO - 001"
    saved_at: Optional[str] = None
    fields: Dict[str, Any]

class EntityModel(BaseModel):
    id: Optional[str] = None
    type: str # consignor, consignee, carrier, commodity, customs, driver, truck
    name: str
    details: str

# API Endpoints
@app.get("/api/health")
def health():
    return {"status": "online", "database": "sqlite3", "version": "3.1.0"}

# Sequential CMR Counter Endpoints
@app.get("/api/counter")
def get_cmr_counter():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM app_settings WHERE key = 'cmr_serial_counter'")
    row = cursor.fetchone()
    current_val = int(row[0]) if row else 5
    conn.close()
    
    return {
        "counter": current_val,
        "current_formatted": f"NO - {str(current_val).zfill(3)}",
        "next_counter": current_val + 1,
        "next_formatted": f"NO - {str(current_val + 1).zfill(3)}"
    }

@app.post("/api/counter/increment")
def increment_cmr_counter():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM app_settings WHERE key = 'cmr_serial_counter'")
    row = cursor.fetchone()
    current_val = int(row[0]) if row else 5
    next_val = current_val + 1
    
    cursor.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('cmr_serial_counter', ?)", (str(next_val),))
    conn.commit()
    conn.close()
    
    return {
        "counter": next_val,
        "cmr_number": f"NO - {str(next_val).zfill(3)}"
    }

@app.post("/api/counter/set")
def set_cmr_counter(value: int = Query(..., description="The counter value to set")):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('cmr_serial_counter', ?)", (str(value),))
    conn.commit()
    conn.close()
    
    return {
        "counter": value,
        "cmr_number": f"NO - {str(value).zfill(3)}"
    }

# Saved Entities & Recommendations Endpoints
@app.get("/api/entities")
def get_saved_entities(type: Optional[str] = None, q: Optional[str] = None):
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = "SELECT * FROM saved_entities WHERE 1=1"
    params = []
    if type:
        query += " AND type = ?"
        params.append(type)
    if q:
        query += " AND (name LIKE ? OR details LIKE ?)"
        params.extend([f"%{q}%", f"%{q}%"])
        
    query += " ORDER BY usage_count DESC, updated_at DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(r) for r in rows]

@app.post("/api/entities")
def save_entity(ent: EntityModel):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ent_id = ent.id or f"ent_{int(datetime.datetime.now().timestamp() * 1000)}"
    
    # Check if exists by name & type
    cursor.execute("SELECT id, usage_count FROM saved_entities WHERE type = ? AND name = ?", (ent.type, ent.name))
    existing = cursor.fetchone()
    
    if existing:
        target_id = existing[0]
        new_count = existing[1] + 1
        cursor.execute("""
        UPDATE saved_entities SET
            details = ?,
            usage_count = ?,
            updated_at = ?
        WHERE id = ?
        """, (ent.details, new_count, now_str, target_id))
    else:
        cursor.execute("""
        INSERT INTO saved_entities (id, type, name, details, usage_count, updated_at)
        VALUES (?, ?, ?, ?, 1, ?)
        """, (ent_id, ent.type, ent.name, ent.details, now_str))
        
    conn.commit()
    conn.close()
    return {"status": "saved", "id": ent_id, "name": ent.name}

# ==========================================
# DATA ANALYTICS & INTELLIGENCE SUITE
# ==========================================
import re

def _clean_numeric_usd(val_str: Any) -> float:
    if not val_str:
        return 0.0
    s = str(val_str).replace('$', '').replace('USD', '').replace('EUR', '').replace(',', '').strip()
    matches = re.findall(r'[\d]+(?:\.\d+)?', s)
    if matches:
        try:
            return float(matches[0])
        except:
            return 0.0
    return 0.0

def _clean_weight_kg(wt_str: Any) -> float:
    if not wt_str:
        return 0.0
    s = str(wt_str).upper()
    is_tons = 'TON' in s
    s_clean = s.replace(',', '')
    matches = re.findall(r'[\d]+(?:\.\d+)?', s_clean)
    if matches:
        try:
            num = float(matches[0])
            return num * 1000.0 if is_tons else num
        except:
            return 0.0
    return 0.0

def _detect_country(text: Any) -> str:
    if not text:
        return "International"
    s = str(text).upper()
    if "INDIA" in s or "DELHI" in s or "MUMBAI" in s:
        return "India 🇮🇳"
    if "UZBEKISTAN" in s or "TASHKENT" in s or "TERMEZ" in s:
        return "Uzbekistan 🇺🇿"
    if "GERMANY" in s or "HAMBURG" in s or "BERLIN" in s:
        return "Germany 🇩🇪"
    if "TURKEY" in s or "BURSA" in s or "ISTANBUL" in s:
        return "Turkey 🇹🇷"
    if "UAE" in s or "DUBAI" in s or "SHARJAH" in s:
        return "UAE 🇦🇪"
    if "IRAN" in s or "TEHRAN" in s or "MASHHAD" in s:
        return "Iran 🇮🇷"
    if "AFGHANISTAN" in s or "KANDAHAR" in s or "KABUL" in s or "MAZAR" in s:
        return "Afghanistan 🇦🇫"
    if "KAZAKHSTAN" in s or "ALMATY" in s:
        return "Kazakhstan 🇰🇿"
    return "Eurasia Transit 🌐"

def _detect_commodity_category(commodity_str: Any) -> str:
    if not commodity_str:
        return "General Transit Cargo"
    s = str(commodity_str).upper()
    if "RAISIN" in s or "کشمش" in s:
        return "Green & Black Raisins"
    if "FIG" in s or "انجیر" in s:
        return "Dried Figs AAA"
    if "PISTACHIO" in s or "پسته" in s:
        return "Roasted Pistachios"
    if "BROOM" in s or "جارو" in s:
        return "Afghan Brooms"
    if "MILLING" in s or "CNC" in s or "MACHINE" in s or "EQUIPMENT" in s:
        return "Industrial Machinery"
    if "FOOD" in s or "FRUIT" in s:
        return "Fresh / Dry Fruits"
    return "General Cargo"

@app.get("/api/analytics/overview")
def get_analytics_overview():
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    conn.close()

    total_shipments = len(rows)
    total_val_usd = 0.0
    total_wt_kg = 0.0
    status_counts = {"Dispatched": 0, "In Transit": 0, "Delivered": 0, "Customs Hold": 0}
    unique_consignors = set()
    unique_consignees = set()
    unique_trucks = set()
    unique_drivers = set()

    for r in rows:
        val = _clean_numeric_usd(r["declared_value"])
        wt = _clean_weight_kg(r["gross_weight"])
        total_val_usd += val
        total_wt_kg += wt
        
        st = r["status"] or "🟢 Dispatched"
        if "In Transit" in st or "🟡" in st:
            status_counts["In Transit"] += 1
        elif "Delivered" in st or "🔵" in st:
            status_counts["Delivered"] += 1
        elif "Hold" in st or "🔴" in st:
            status_counts["Customs Hold"] += 1
        else:
            status_counts["Dispatched"] += 1

        if r["consignor"]: unique_consignors.add(r["consignor"].strip())
        if r["consignee"]: unique_consignees.add(r["consignee"].strip())
        if r["truck_plate"]: unique_trucks.add(r["truck_plate"].strip())
        if r["driver_name"]: unique_drivers.add(r["driver_name"].strip())

    avg_val = (total_val_usd / total_shipments) if total_shipments > 0 else 0.0
    avg_wt = (total_wt_kg / total_shipments) if total_shipments > 0 else 0.0

    return {
        "total_shipments": total_shipments,
        "total_declared_value_usd": round(total_val_usd, 2),
        "total_declared_value_formatted": f"${total_val_usd:,.2f} USD",
        "total_gross_weight_kg": round(total_wt_kg, 2),
        "total_gross_weight_tons": round(total_wt_kg / 1000.0, 2),
        "total_gross_weight_formatted": f"{total_wt_kg:,.1f} KG ({total_wt_kg/1000.0:,.2f} T)",
        "avg_shipment_value_usd": round(avg_val, 2),
        "avg_shipment_weight_kg": round(avg_wt, 1),
        "active_dispatched": status_counts["Dispatched"],
        "in_transit": status_counts["In Transit"],
        "delivered": status_counts["Delivered"],
        "customs_hold": status_counts["Customs Hold"],
        "fleet": {
            "unique_consignors": len(unique_consignors),
            "unique_consignees": len(unique_consignees),
            "unique_trucks": len(unique_trucks),
            "unique_drivers": len(unique_drivers)
        },
        "status_distribution": [
            {"name": "Dispatched", "value": status_counts["Dispatched"], "color": "#10b981"},
            {"name": "In Transit", "value": status_counts["In Transit"], "color": "#f59e0b"},
            {"name": "Delivered", "value": status_counts["Delivered"], "color": "#3b82f6"},
            {"name": "Customs Hold", "value": status_counts["Customs Hold"], "color": "#ef4444"}
        ]
    }

@app.get("/api/analytics/timeseries")
def get_analytics_timeseries():
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents ORDER BY updated_at ASC")
    rows = cursor.fetchall()
    conn.close()

    timeline_map = {}
    for r in rows:
        date_str = r["created_at"][:10] if r["created_at"] else "2026-08-20"
        if date_str not in timeline_map:
            timeline_map[date_str] = {"shipments": 0, "value_usd": 0.0, "weight_kg": 0.0}
        timeline_map[date_str]["shipments"] += 1
        timeline_map[date_str]["value_usd"] += _clean_numeric_usd(r["declared_value"])
        timeline_map[date_str]["weight_kg"] += _clean_weight_kg(r["gross_weight"])

    sorted_dates = sorted(timeline_map.keys())
    return {
        "dates": sorted_dates,
        "shipments": [timeline_map[d]["shipments"] for d in sorted_dates],
        "values_usd": [round(timeline_map[d]["value_usd"], 2) for d in sorted_dates],
        "weights_kg": [round(timeline_map[d]["weight_kg"], 1) for d in sorted_dates]
    }

@app.get("/api/analytics/routes")
def get_analytics_routes():
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    conn.close()

    dest_map = {}
    corridor_map = {}
    for r in rows:
        country = _detect_country(r["destination"])
        dest_map[country] = dest_map.get(country, 0) + 1
        
        orig = (r["origin"] or "Afghanistan").split(',')[0].strip()
        dest = (r["destination"] or "International").split('\n')[0].strip()[:30]
        corridor_key = f"{orig} ➔ {dest}"
        if corridor_key not in corridor_map:
            corridor_map[corridor_key] = {"count": 0, "total_value": 0.0, "total_weight": 0.0}
        corridor_map[corridor_key]["count"] += 1
        corridor_map[corridor_key]["total_value"] += _clean_numeric_usd(r["declared_value"])
        corridor_map[corridor_key]["total_weight"] += _clean_weight_kg(r["gross_weight"])

    countries_list = [{"name": k, "value": v} for k, v in sorted(dest_map.items(), key=lambda x: x[1], reverse=True)]
    corridors_list = [{"corridor": k, "count": v["count"], "value_usd": round(v["total_value"], 2), "weight_kg": round(v["total_weight"], 1)} for k, v in sorted(corridor_map.items(), key=lambda x: x[1]["count"], reverse=True)]

    return {
        "countries": countries_list,
        "corridors": corridors_list
    }

@app.get("/api/analytics/commodities")
def get_analytics_commodities():
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    conn.close()

    cat_map = {}
    for r in rows:
        cat = _detect_commodity_category(r["commodity"])
        if cat not in cat_map:
            cat_map[cat] = {"count": 0, "total_weight": 0.0, "total_value": 0.0}
        cat_map[cat]["count"] += 1
        cat_map[cat]["total_weight"] += _clean_weight_kg(r["gross_weight"])
        cat_map[cat]["total_value"] += _clean_numeric_usd(r["declared_value"])

    result = [{"name": k, "value": v["count"], "weight_kg": round(v["total_weight"], 1), "value_usd": round(v["total_value"], 2)} for k, v in sorted(cat_map.items(), key=lambda x: x[1]["count"], reverse=True)]
    return result

@app.get("/api/analytics/entities")
def get_analytics_entities():
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    conn.close()

    senders = {}
    receivers = {}
    drivers = {}
    trucks = {}

    for r in rows:
        s_name = (r["consignor"] or "Unknown Sender").split('\n')[0].strip()
        c_name = (r["consignee"] or "Unknown Consignee").split('\n')[0].strip()
        d_name = (r["driver_name"] or "Standard Driver").split('\n')[0].strip()
        t_name = (r["truck_plate"] or "Unassigned").split('\n')[0].strip()
        val = _clean_numeric_usd(r["declared_value"])
        wt = _clean_weight_kg(r["gross_weight"])

        if s_name not in senders: senders[s_name] = {"count": 0, "value_usd": 0.0, "weight_kg": 0.0}
        senders[s_name]["count"] += 1
        senders[s_name]["value_usd"] += val
        senders[s_name]["weight_kg"] += wt

        if c_name not in receivers: receivers[c_name] = {"count": 0, "value_usd": 0.0, "weight_kg": 0.0}
        receivers[c_name]["count"] += 1
        receivers[c_name]["value_usd"] += val
        receivers[c_name]["weight_kg"] += wt

        if d_name not in drivers: drivers[d_name] = {"count": 0, "truck": t_name}
        drivers[d_name]["count"] += 1

        if t_name not in trucks: trucks[t_name] = {"count": 0, "driver": d_name}
        trucks[t_name]["count"] += 1

    return {
        "top_consignors": [{"name": k, "count": v["count"], "value_usd": round(v["value_usd"], 2), "weight_kg": round(v["weight_kg"], 1)} for k, v in sorted(senders.items(), key=lambda x: x[1]["count"], reverse=True)],
        "top_consignees": [{"name": k, "count": v["count"], "value_usd": round(v["value_usd"], 2), "weight_kg": round(v["weight_kg"], 1)} for k, v in sorted(receivers.items(), key=lambda x: x[1]["count"], reverse=True)],
        "top_drivers": [{"name": k, "count": v["count"], "truck": v["truck"]} for k, v in sorted(drivers.items(), key=lambda x: x[1]["count"], reverse=True)],
        "top_trucks": [{"plate": k, "count": v["count"], "driver": v["driver"]} for k, v in sorted(trucks.items(), key=lambda x: x[1]["count"], reverse=True)]
    }

class QueryRequest(BaseModel):
    query: str
    history: Optional[List[Dict[str, Any]]] = []

@app.post("/api/analytics/query")
def run_analytics_query(req: QueryRequest):
    q = (req.query or "").strip().lower()
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    conn.close()

    total_shipments = len(rows)
    total_val = sum(_clean_numeric_usd(r["declared_value"]) for r in rows)
    total_wt = sum(_clean_weight_kg(r["gross_weight"]) for r in rows)

    # Intent routing and response generator
    if "consignee" in q or "receiver" in q or "who received" in q or "buyer" in q:
        receivers = {}
        for r in rows:
            c = (r["consignee"] or "Unknown").split('\n')[0].strip()
            v = _clean_numeric_usd(r["declared_value"])
            receivers[c] = receivers.get(c, 0.0) + v
        sorted_c = sorted(receivers.items(), key=lambda x: x[1], reverse=True)
        top = sorted_c[0] if sorted_c else ("None", 0)
        
        table_rows = "\n".join([f"| **{name}** | ${val:,.2f} USD |" for name, val in sorted_c[:5]])
        answer = f"### 🏢 Consignee Analysis\n\nThe top consignee by declared cargo value is **{top[0]}** with **${top[1]:,.2f} USD** across your transit records.\n\n| Consignee / Importer | Total Declared Value (USD) |\n| :--- | :--- |\n{table_rows}"
        suggestions = ["Show all shipments for " + top[0][:20], "Breakdown freight by country", "What is the total weight?"]
    
    elif "weight" in q or "ton" in q or "kg" in q or "heavy" in q or "volume" in q:
        commodities = {}
        for r in rows:
            cat = _detect_commodity_category(r["commodity"])
            wt = _clean_weight_kg(r["gross_weight"])
            commodities[cat] = commodities.get(cat, 0.0) + wt
        sorted_comm = sorted(commodities.items(), key=lambda x: x[1], reverse=True)
        
        table_rows = "\n".join([f"| **{name}** | {wt:,.1f} KG ({wt/1000.0:,.2f} T) |" for name, wt in sorted_comm])
        answer = f"### ⚖️ Freight Weight & Tonnage Report\n\nTotal aggregate freight weight across all active CMR waybills is **{total_wt:,.1f} KG ({total_wt/1000.0:,.2f} Metric Tons)**.\n\n| Commodity Category | Total Weight (KG & Tons) |\n| :--- | :--- |\n{table_rows}"
        suggestions = ["Show shipments by driver", "Which route has highest value?", "List recent CMR documents"]

    elif "india" in q or "delhi" in q or "germany" in q or "turkey" in q or "uzbekistan" in q or "destination" in q or "country" in q:
        dest_filter = "india" if "india" in q else ("germany" if "germany" in q else ("turkey" if "turkey" in q else ("uzbekistan" if "uzbekistan" in q else "")))
        matching_docs = []
        for r in rows:
            dest = (r["destination"] or "").lower()
            if dest_filter and dest_filter in dest:
                matching_docs.append(r)
        
        if matching_docs:
            sub_val = sum(_clean_numeric_usd(d["declared_value"]) for d in matching_docs)
            sub_wt = sum(_clean_weight_kg(d["gross_weight"]) for d in matching_docs)
            doc_rows = "\n".join([f"| **{d['cmr_number']}** | {d['consignor'][:25]} | {d['consignee'][:25]} | {d['status']} | {d['declared_value']} |" for d in matching_docs[:8]])
            answer = f"### 📍 Destination Corridors ({dest_filter.title()})\n\nFound **{len(matching_docs)} shipments** bound for **{dest_filter.title()}** totaling **${sub_val:,.2f} USD** and **{sub_wt:,.1f} KG**.\n\n| CMR # | Consignor | Consignee | Status | Value |\n| :--- | :--- | :--- | :--- | :--- |\n{doc_rows}"
        else:
            answer = f"### 🌍 Global Corridors\n\nAcross **{total_shipments} recorded waybills**, shipments are routed across **India 🇮🇳, Uzbekistan 🇺🇿, Germany 🇩🇪, Turkey 🇹🇷, and UAE 🇦🇪** with aggregate valuation of **${total_val:,.2f} USD**."
        suggestions = ["Show top senders", "List Kamaz trucks in transit", "Summarize total declared value"]

    elif "truck" in q or "driver" in q or "fleet" in q or "plate" in q:
        drivers = {}
        for r in rows:
            d = (r["driver_name"] or "Standard Driver").split('\n')[0].strip()
            t = (r["truck_plate"] or "Unassigned").split('\n')[0].strip()
            drivers[d] = {"truck": t, "count": drivers.get(d, {}).get("count", 0) + 1}
        d_rows = "\n".join([f"| **{d}** | {info['truck']} | {info['count']} CMRs |" for d, info in sorted(drivers.items(), key=lambda x: x[1]['count'], reverse=True)[:6]])
        answer = f"### 🚛 Fleet & Driver Operations\n\nThere are **{len(drivers)} registered drivers and active transport units** in the Sky Ariana transit network.\n\n| Driver Name | Assigned Truck / Plate | Total Waybills |\n| :--- | :--- | :--- |\n{d_rows}"
        suggestions = ["Show shipments in transit", "What is the top commodity?", "Export full backup JSON"]

    else:
        answer = f"### 📊 Sky Ariana International Transit Overview\n\n- **Total CMR Waybills**: `{total_shipments}` documents\n- **Total Declared Value**: `${total_val:,.2f} USD`\n- **Total Gross Freight Weight**: `{total_wt:,.1f} KG` (`{total_wt/1000.0:,.2f} T`)\n- **Active Corridors**: Afghanistan ➔ India, Uzbekistan, Germany, Turkey\n\nAsk me anything about your drivers, top commodities, consignors, consignees, or shipment values!"
        suggestions = ["Top 5 consignees by value", "Breakdown freight by commodity", "Show India corridor shipments", "List active drivers"]

    return {
        "answer": answer,
        "suggestions": suggestions,
        "thought": f"Analyzed {total_shipments} CMR documents from SQLite database cmr_database.db",
        "timestamp": datetime.datetime.now().strftime("%H:%M:%S")
    }

class StatusUpdateRequest(BaseModel):
    document_id: str
    status: str

@app.post("/api/analytics/update-status")
def update_document_status(req: StatusUpdateRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("UPDATE documents SET status = ?, updated_at = ? WHERE id = ? OR cmr_number = ?", (req.status, now_str, req.document_id, req.document_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    if affected == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "updated", "id": req.document_id, "new_status": req.status, "updated_at": now_str}

@app.get("/api/documents")
def list_documents(q: Optional[str] = None, tag: Optional[str] = None):
    conn = get_db_connection()
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
    conn = get_db_connection()
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
    conn = get_db_connection()
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
    conn = get_db_connection()
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
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT draft_data, updated_at FROM active_draft WHERE id = 1")
    row = cursor.fetchone()
    conn.close()

    if row:
        return {"draft": json.loads(row[0]), "updated_at": row[1]}
    return {"draft": None}

@app.post("/api/draft")
def save_active_draft(draft: DraftModel):
    conn = get_db_connection()
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
    conn = get_db_connection()
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
        
        conn = get_db_connection()
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

# Mount Static Files for direct frontend serving (Master index.html in WORKDIR)
STATIC_DIR = WORKDIR
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    print(f"🚀 Starting Sky Ariana CMR FastAPI Backend on http://127.0.0.1:3000")
    uvicorn.run(app, host="127.0.0.1", port=3000, log_level="info")
