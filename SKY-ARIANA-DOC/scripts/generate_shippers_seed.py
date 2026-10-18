import json

source_path = r'e:\New folder\sky-ariana-bbb\backend\data\business_parties_seed.json'
target_path = r'e:\New folder\sky-ariana-bbb\frontend\src\data\shippersSeed.ts'

with open(source_path, 'r', encoding='utf-8') as f:
    parties = json.load(f)

shippers = []
idx = 5000
for p in parties:
    p_type = p.get('party_type', '')
    if p_type in ['shipper', 'seller']:
        name = p.get('display_name') or p.get('canonical_name') or ''
        shippers.append({
            "id": idx,
            "party_type": "shipper",
            "canonical_name": p.get('canonical_name', name),
            "display_name": name,
            "normalized_name": name.lower(),
            "roles": ["shipper", "exporter", "seller"],
            "address_line1": p.get('address_line1', ''),
            "address_line2": p.get('address_line2', ''),
            "city": p.get('city', ''),
            "state_region": p.get('state_region', ''),
            "postal_code": p.get('postal_code', ''),
            "country": p.get('country', 'Afghanistan'),
            "phone": p.get('phone', ''),
            "email": p.get('email', ''),
            "trade_license_number": p.get('trade_license_number', ''),
            "tax_identification_number": p.get('tax_identification_number', ''),
            "contact_person": p.get('contact_person', ''),
            "is_active": True,
            "is_archived": False,
            "created_at": "",
            "updated_at": ""
        })
        idx += 1

ts_content = "import type { BusinessParty } from '../types'\n\nexport const SEED_SHIPPERS: BusinessParty[] = " + json.dumps(shippers, indent=2) + "\n"

with open(target_path, 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"Generated {len(shippers)} seed shippers in {target_path}")
