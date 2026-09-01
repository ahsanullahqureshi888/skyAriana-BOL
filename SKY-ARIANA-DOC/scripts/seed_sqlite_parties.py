import sqlite3
import json
import os
from datetime import datetime

db_path = r'e:\New folder\sky-ariana-bbb\acci-laravel\database\database.sqlite'
print(f"Connecting to database: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Create table
cursor.execute("""
CREATE TABLE IF NOT EXISTS saved_companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type VARCHAR(20) DEFAULT 'both',
    company_name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(100),
    email VARCHAR(255),
    gst_no VARCHAR(100),
    fssai_no VARCHAR(100),
    iec_code VARCHAR(100),
    created_at DATETIME,
    updated_at DATETIME
);
""")
cursor.execute("CREATE INDEX IF NOT EXISTS saved_companies_company_name_index ON saved_companies (company_name);")

# 2. Record migration if not exists
cursor.execute("SELECT migration FROM migrations WHERE migration = '2026_08_08_000002_create_saved_companies_table';")
if not cursor.fetchone():
    cursor.execute("SELECT MAX(batch) FROM migrations;")
    max_batch = cursor.fetchone()[0] or 1
    cursor.execute("INSERT INTO migrations (migration, batch) VALUES ('2026_08_08_000002_create_saved_companies_table', ?);", (max_batch,))
    print("Recorded migration 2026_08_08_000002_create_saved_companies_table")

# 3. Load Shippers
sellers_path = r'e:\New folder\sky-ariana-bbb\backend\data\business_parties_seed.json'
with open(sellers_path, 'r', encoding='utf-8') as f:
    business_parties = json.load(f)

now_str = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

seller_count = 0
for party in business_parties:
    p_type = party.get('party_type', '')
    name = party.get('display_name') or party.get('canonical_name')
    if not name:
        continue
    
    # build address
    addr_parts = [party.get('address_line1', ''), party.get('city', ''), party.get('state_region', ''), party.get('country', '')]
    address = ', '.join([p for p in addr_parts if p])
    phone = party.get('phone') or ''
    email = party.get('email') or ''
    licence = party.get('trade_license_number') or party.get('tax_identification_number') or ''
    
    comp_type = 'seller' if p_type in ['shipper', 'seller'] else 'buyer'
    if p_type == 'notify_party':
        comp_type = 'buyer'

    cursor.execute("SELECT id FROM saved_companies WHERE company_name = ?", (name,))
    row = cursor.fetchone()
    if row:
        cursor.execute("""
            UPDATE saved_companies SET type=?, address=?, phone=?, email=?, iec_code=?, updated_at=? WHERE id=?
        """, (comp_type, address, phone, email, licence, now_str, row[0]))
    else:
        cursor.execute("""
            INSERT INTO saved_companies (type, company_name, address, phone, email, iec_code, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (comp_type, name, address, phone, email, licence, now_str, now_str))
    seller_count += 1

print(f"Processed {seller_count} business parties (shippers/notify)")

# 4. Load Consignees
consignees_path = r'e:\New folder\sky-ariana-bbb\backend\data\consignees_seed.json'
with open(consignees_path, 'r', encoding='utf-8') as f:
    consignees_data = json.load(f)

buyer_count = 0
for party in consignees_data:
    name = party.get('display_name') or party.get('canonical_name')
    if not name:
        continue
    
    address = party.get('address_line1') or ''
    phone = party.get('phone') or ''
    email = party.get('email') or ''
    gst_no = party.get('gstin') or ''
    fssai_no = party.get('fssai') or ''
    iec_code = party.get('iec') or party.get('pan') or ''

    cursor.execute("SELECT id FROM saved_companies WHERE company_name = ?", (name,))
    row = cursor.fetchone()
    if row:
        cursor.execute("""
            UPDATE saved_companies SET type='buyer', address=?, phone=?, email=?, gst_no=?, fssai_no=?, iec_code=?, updated_at=? WHERE id=?
        """, (address, phone, email, gst_no, fssai_no, iec_code, now_str, row[0]))
    else:
        cursor.execute("""
            INSERT INTO saved_companies (type, company_name, address, phone, email, gst_no, fssai_no, iec_code, created_at, updated_at)
            VALUES ('buyer', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (name, address, phone, email, gst_no, fssai_no, iec_code, now_str, now_str))
    buyer_count += 1

print(f"Processed {buyer_count} consignees")

# 5. Add custom known demo records from seeders
special_records = [
    {
        'type': 'seller',
        'company_name': 'Pahlawan Noori LTD',
        'address': 'Shorandam, Industrial Park Kandahar Afghanistan',
        'phone': '+93707070975',
        'email': 'info@pahlawannoori.com',
        'iec_code': '27-1173',
        'gst_no': '',
        'fssai_no': ''
    },
    {
        'type': 'seller',
        'company_name': 'PAHLAWAN NOORI LTD',
        'address': 'Shorandam Industrial Park, Kandahar, Afghanistan',
        'phone': '+93 707 070 975',
        'email': 'info@pahlawannoori.com',
        'iec_code': '27-1173',
        'gst_no': '',
        'fssai_no': ''
    },
    {
        'type': 'buyer',
        'company_name': 'Uttam Chand Rakesh Kumar Private Limited',
        'address': '573, Katra Ishwar Bhawan, Khari, Baoli\nDelhi-110006(India)',
        'phone': '011-45784868',
        'email': 'akshaykbhatia@hotmail.com',
        'gst_no': '07AADCU4808L1Z2',
        'fssai_no': '13324999000404',
        'iec_code': 'AADCU4808L'
    }
]

for rec in special_records:
    cursor.execute("SELECT id FROM saved_companies WHERE company_name = ?", (rec['company_name'],))
    row = cursor.fetchone()
    if row:
        cursor.execute("""
            UPDATE saved_companies SET type=?, address=?, phone=?, email=?, gst_no=?, fssai_no=?, iec_code=?, updated_at=? WHERE id=?
        """, (rec['type'], rec['address'], rec['phone'], rec['email'], rec['gst_no'], rec['fssai_no'], rec['iec_code'], now_str, row[0]))
    else:
        cursor.execute("""
            INSERT INTO saved_companies (type, company_name, address, phone, email, gst_no, fssai_no, iec_code, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (rec['type'], rec['company_name'], rec['address'], rec['phone'], rec['email'], rec['gst_no'], rec['fssai_no'], rec['iec_code'], now_str, now_str))

conn.commit()

cursor.execute("SELECT COUNT(*) FROM saved_companies;")
total = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM saved_companies WHERE type IN ('seller', 'both');")
sellers = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM saved_companies WHERE type IN ('buyer', 'both');")
buyers = cursor.fetchone()[0]

print(f"\nSUCCESS! Total saved_companies in database.sqlite: {total} (Sellers: {sellers}, Buyers: {buyers})")

conn.close()
