import json

data = json.load(open('backend/data/consignees_seed.json', encoding='utf-8'))

parties = []
for idx, item in enumerate(data, start=1000):
    p = {
        'id': idx,
        'party_type': 'consignee',
        'canonical_name': item.get('canonical_name') or item.get('display_name') or '',
        'display_name': item.get('display_name') or item.get('canonical_name') or '',
        'normalized_name': (item.get('normalized_name') or '').lower(),
        'roles': ['consignee', 'importer', 'buyer'],
        'address_line1': item.get('address_line1') or '',
        'address_line2': item.get('address_line2') or '',
        'city': item.get('city') or '',
        'state_region': item.get('state_region') or '',
        'postal_code': item.get('postal_code') or '',
        'country': item.get('country') or 'India',
        'phone': item.get('phone') or '',
        'email': item.get('email') or '',
        'gstin': item.get('gstin') or '',
        'iec': item.get('iec') or '',
        'pan': item.get('pan') or '',
        'fssai': item.get('fssai') or '',
        'trade_license_number': item.get('trade_license_number') or '',
        'tax_identification_number': item.get('tax_identification_number') or '',
        'contact_person': item.get('contact_person') or '',
        'is_active': True,
        'is_archived': False,
        'created_at': '',
        'updated_at': '',
    }
    parties.append(p)

json_str = json.dumps(parties, indent=2)
ts_content = f"import type {{ BusinessParty }} from '../types'\n\nexport const SEED_CONSIGNEES: BusinessParty[] = {json_str};\n"

with open('frontend/src/data/consigneesSeed.ts', 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"Successfully generated frontend/src/data/consigneesSeed.ts with {len(parties)} consignees!")
