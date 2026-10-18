import json

data = json.load(open('backend/data/consignees_seed.json', encoding='utf-8'))

entries = []
for item in data:
    name = (item.get('display_name') or item.get('canonical_name') or '').replace("'", "\\'")
    addr = (item.get('address_line1') or '').replace("'", "\\'")
    phone = (item.get('phone') or '').replace("'", "\\'")
    email = (item.get('email') or '').replace("'", "\\'")
    iec = (item.get('iec') or '').replace("'", "\\'")
    pan = (item.get('pan') or '').replace("'", "\\'")
    gst = (item.get('gstin') or '').replace("'", "\\'")
    fssai = (item.get('fssai') or '').replace("'", "\\'")
    
    if name:
        entries.append((name, addr, phone, email, iec, pan, gst, fssai))

php_items = []
for name, addr, phone, email, iec, pan, gst, fssai in entries:
    php_items.append(f"            ['consignee_name' => '{name}', 'consignee_address' => '{addr}', 'consignee_phone' => '{phone}']")

php_code = f"""<?php

namespace Database\\Seeders;

use Illuminate\\Database\\Seeder;
use Illuminate\\Support\\Facades\\DB;

class ConsigneesSeeder extends Seeder
{{
    public function run(): void
    {{
        $consignees = [
{',\n'.join(php_items)}
        ];

        foreach ($consignees as $item) {{
            DB::table('air_waybills')->insertGetId([
                'awb_number' => 'SEED-' . rand(100000, 999999),
                'airline_prefix' => '235',
                'serial_number' => (string)rand(10000000, 99999999),
                'shipper_name' => 'SKY ARIANA LTD',
                'shipper_address' => 'KABUL AFGHANISTAN',
                'consignee_name' => $item['consignee_name'],
                'consignee_address' => $item['consignee_address'],
                'consignee_phone' => $item['consignee_phone'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }}
    }}
}}
"""

with open('acci-laravel/database/seeders/ConsigneesSeeder.php', 'w', encoding='utf-8') as f:
    f.write(php_code)

print("Created acci-laravel/database/seeders/ConsigneesSeeder.php!")
