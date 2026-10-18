import sqlite3
import json
import random
import datetime

db_path = 'acci-laravel/database/database.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

data = json.load(open('backend/data/consignees_seed.json', encoding='utf-8'))

now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

count = 0
for idx, item in enumerate(data, start=1):
    name = (item.get('display_name') or item.get('canonical_name') or '').strip()
    addr = (item.get('address_line1') or '').strip()
    phone = (item.get('phone') or '').strip()
    
    if not name:
        continue
    
    cursor.execute("SELECT id FROM air_waybills WHERE consignee_name = ?", (name,))
    if cursor.fetchone():
        continue
        
    awb_no = f"235-{random.randint(10000000, 99999999)}"
    serial = str(random.randint(10000000, 99999999))
    
    cursor.execute("""
        INSERT INTO air_waybills (
            awb_number, airline_prefix, serial_number, shipper_name, shipper_address,
            consignee_name, consignee_address, consignee_phone, departure_airport,
            destination_airport, currency, pieces, gross_weight, chargeable_weight,
            weight_unit, commodity_description, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        awb_no, '235', serial,
        'SKY ARIANA LTD', 'KABUL AFGHANISTAN',
        name, addr, phone, 'KBL - KABUL', 'DEL - DELHI', 'USD',
        100, 2500.0, 2500.0, 'KGS', 'AFGHAN DRY FRUITS & NUTS', 'issued',
        now, now
    ))
    count += 1

conn.commit()
conn.close()

print(f"Successfully inserted {count} consignee records directly into acci-laravel/database/database.sqlite!")
