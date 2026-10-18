const fs = require('fs');
const path = require('path');

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

// 1. Backups
fs.copyFileSync('.local-bols.json', '.local-bols.json.backup-' + timestamp);
if (fs.existsSync('data/.local-bols.json')) {
  fs.copyFileSync('data/.local-bols.json', 'data/.local-bols.json.backup-' + timestamp);
}
if (fs.existsSync('.local-shipments.json')) {
  fs.copyFileSync('.local-shipments.json', '.local-shipments.json.backup-' + timestamp);
}
console.log('✅ Backups created with timestamp:', timestamp);

// 2. Read existing
const localBols = JSON.parse(fs.readFileSync('.local-bols.json', 'utf8'));

// Find old 648
const old648Index = localBols.findIndex(b => b.id === 'BOL-2026-NSA648' || b.bol_number === 'BOL-2026-NSA648');
if (old648Index === -1) {
  console.error('Could not find existing BOL-2026-NSA648');
  process.exit(1);
}
const old648 = localBols[old648Index];

// Preserved record as BOL-2026-NSA651
const preserved651 = {
  ...old648,
  id: 'BOL-2026-NSA651',
  bol_number: 'BOL-2026-NSA651',
  billOfLadingNumber: 'BOL-2026-NSA651',
  bolNo: 'BOL-2026-NSA651',
  pdf_url: '/uploads/bol-pdfs/INV-016-LAKHDATAR FOODS PVT LTD-2395-CTNS-DRY-FIGS-NIDA MOHAMMAD NOORI SO ABDUL HAQ-BOL-2026-NSA648.pdf',
  pdf_status: 'ready',
  updated_at: new Date().toISOString()
};

// Target authentic BOL-2026-NSA648
const authentic648 = {
  ...old648,
  id: 'BOL-2026-NSA648',
  bol_number: 'BOL-2026-NSA648',
  billOfLadingNumber: 'BOL-2026-NSA648',
  bolNo: 'BOL-2026-NSA648',
  issue_date: '2026-10-04',
  issueDate: '2026-10-04',
  created_at: old648.created_at || '2026-10-04T11:26:10.760Z',
  updated_at: new Date().toISOString(),
  user_id: null,
  notes_1: 'نظرمحمد (یارمل)\n(+93) 0 700 203 307',
  notes_1_label: 'دکندهار بارګیری مسؤل',
  notes_1_theme: 'red',
  notes_2: '0711 263 528    |  079 335 3246',
  notes_2_label: 'نماینده نمبرونه - نیمروز',
  notes_2_theme: 'red',
  cargo_route_note: 'از نیمروز کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال در دبی / جبل علی)',
  truck_number: 'هرات ۷۷۵۵۵',
  truckNumber: '۷۷۵۵۵ هرات',
  driver_name: 'اسدالله ولد سلطان محمد',
  driverName: 'اسدالله ولد سلطان محمد',
  driver_father_name: 'سلطان محمد',
  driver_contact: '0700450189',
  driver_rent: '38,500 AFN - کرایه واپسی',
  driverFreight: '38,500 AFN - کرایه واپسی',
  driver_rent_currency: 'AFN',
  driver_rent_amount: 38500,
  routes: [
    {
      id: 'route-kandahar',
      location: 'Kandahar',
      locationPersian: 'کندهار',
      stopOrder: 1,
      transportMode: 'truck',
      stopLabel: 'Origin'
    },
    {
      id: 'route-nimroz',
      location: 'Nimroz',
      locationPersian: 'نیمروز / میلک',
      stopOrder: 2,
      transportMode: 'truck',
      stopLabel: 'Stop 1'
    },
    {
      id: 'route-bandar-abbas',
      location: 'Bandar Abbas, IR',
      locationPersian: 'بندرعباس، ایران',
      stopOrder: 3,
      transportMode: 'vessel',
      stopLabel: 'Stop 2'
    },
    {
      id: 'route-dubai',
      location: 'Dubai, AE',
      locationPersian: 'دبی، امارات',
      stopOrder: 4,
      transportMode: 'vessel',
      stopLabel: 'Stop 3'
    },
    {
      id: 'route-nhava-sheva',
      location: 'Nhava Sheva, IN',
      locationPersian: 'نوا شوا، هند',
      stopOrder: 5,
      transportMode: 'vessel',
      stopLabel: 'Destination'
    }
  ],
  container_type: '',
  container_size: '',
  container_numbers: '',
  seal_numbers: '',
  shipper_name: 'NEW YAQOUBI LTD',
  shipperName: 'NEW YAQOUBI LTD',
  shipper_address: 'T.L. No. 590-27, Kandahar, Afghanistan',
  shipper_contact: '',
  shipper_email: '',
  consignee_name: 'M / S ARSH INTERNATIONAL',
  consigneeName: 'M / S ARSH INTERNATIONAL',
  consignee_address: 'Office No. 1, Blue Moon Chambers, 25 Meadow Street, Fort, Mumbai 400023, India',
  consignee_contact: '',
  consignee_email: '',
  notify_party: 'PAYMENT HAS TO BE MADE TO NOTIFY PARTY: YAQOUB HAMDAN FOODSTUFF TRADING CO LLC',
  notifyParty: 'PAYMENT HAS TO BE MADE TO NOTIFY PARTY: YAQOUB HAMDAN FOODSTUFF TRADING CO LLC',
  notify_party_address: 'Shop No. 28, Al Hawai Building, Al Ras Street, Deira, Dubai, UAE TRN No.: 100340961000003',
  vessel_name: '',
  voyage_number: '',
  port_of_loading: 'Kandahar, Afghanistan',
  port_of_discharge: 'Nhava Sheva, IN',
  place_of_delivery: 'Nhava Sheva, IN',
  borderCrossing: 'Nimroz / Milak',
  cargo_description: '📦 CONTAINER & CARGO PARTICULARS:\n• Description: BLACK RAISNIS 1460 CTNS 16.0 - KGS\n• Transit Date: 2026-10-04\n• INV-063',
  cargoDescription: '📦 CONTAINER & CARGO PARTICULARS:\n• Description: BLACK RAISNIS 1460 CTNS 16.0 - KGS\n• Transit Date: 2026-10-04\n• INV-063',
  net_weight: '23,360 KG',
  netWeight: '23,360 KG',
  gross_weight: '24,820 KG',
  grossWeight: '24,820 KG',
  measurement: '',
  number_of_packages: '1460 CTNS BLACK RAISNIS',
  numberOfPackages: '1460 CTNS BLACK RAISNIS',
  carton_count: 1460,
  kgs_per_carton: '16.00 KGS',
  gross_weight_per_carton: '17.00 KGS',
  rate_per_kgs: '2.90 USD',
  goods_value: '67,744.00 USD',
  goodsValue: '67,744.00 USD',
  freight_payable_at: '',
  freight_terms: '',
  remarks: '',
  iran_office_building: 'CUBIC BUILDING',
  iran_office_location: 'BANDAR ABBASS - IRAN',
  iran_office_pobox: '7913973295',
  iran_office_telefax: '+98 76 32226028',
  iran_office_cellphone: '+98 09172325086',
  iran_office_email: 'info@balambarbaran.com, ceo@balambarbaran.com',
  afghanistan_documents: [],
  afghanistan_document_details: {},
  debit: 0,
  credit: 0,
  revision: 1,
  status: 'active',
  pdf_url: '/uploads/bol-pdfs/INV-063-MS ARSH INTERNATIONAL-1460-CTNS-BLACK-RAISINS-NEW YAQOUBI LTD-BOL-2026-NSA648.pdf',
  pdf_status: 'ready'
};

// Replace 648 with authentic, and append preserved 651
localBols[old648Index] = authentic648;
const idx651 = localBols.findIndex(b => b.id === 'BOL-2026-NSA651' || b.bol_number === 'BOL-2026-NSA651');
if (idx651 >= 0) {
  localBols[idx651] = preserved651;
} else {
  localBols.push(preserved651);
}

// Atomic write to .local-bols.json
fs.writeFileSync('.local-bols.json.tmp', JSON.stringify(localBols, null, 2), 'utf8');
fs.renameSync('.local-bols.json.tmp', '.local-bols.json');
console.log('✅ Updated .local-bols.json: count =', localBols.length);

// Also update data/.local-bols.json
if (fs.existsSync('data/.local-bols.json')) {
  fs.writeFileSync('data/.local-bols.json.tmp', JSON.stringify(localBols, null, 2), 'utf8');
  fs.renameSync('data/.local-bols.json.tmp', 'data/.local-bols.json');
  console.log('✅ Updated data/.local-bols.json: count =', localBols.length);
}

// 3. Update shipments in .local-shipments.json
if (fs.existsSync('.local-shipments.json')) {
  const shipments = JSON.parse(fs.readFileSync('.local-shipments.json', 'utf8'));
  const s648Idx = shipments.findIndex(s => s.id === 'SA-SHP-BOL-2026-NSA648' || s.referenceNumber === 'BOL-2026-NSA648');
  if (s648Idx >= 0) {
    const s648 = shipments[s648Idx];
    s648.customerName = 'M / S ARSH INTERNATIONAL';
    s648.shipperName = 'NEW YAQOUBI LTD';
    s648.origin = 'Kandahar, Afghanistan';
    s648.destination = 'Nhava Sheva, IN';
    if (s648.documents && s648.documents.length > 0) {
      s648.documents[0] = { ...authentic648 };
    }
  }

  // Add or update SA-SHP-BOL-2026-NSA651
  const s651Idx = shipments.findIndex(s => s.id === 'SA-SHP-BOL-2026-NSA651' || s.referenceNumber === 'BOL-2026-NSA651');
  const ship651 = {
    id: 'SA-SHP-BOL-2026-NSA651',
    referenceNumber: 'BOL-2026-NSA651',
    customerName: 'LAKHDATAR FOODS PVT LTD',
    shipperName: 'NIDA MOHAMMAD "NOORI" S/O ABDUL HAQ',
    origin: 'Kandahar, Afghanistan',
    destination: 'Nhava Sheva, IN',
    status: 'active',
    documents: [{ ...preserved651 }],
    attachments: [],
    milestones: [],
    auditLog: [{
      id: 'audit-init-651',
      timestamp: new Date().toISOString(),
      user: 'System',
      field: 'shipment',
      oldValue: null,
      newValue: 'Preserved from legacy INV-016',
      actionDescription: 'Shipment created for BOL BOL-2026-NSA651'
    }]
  };
  if (s651Idx >= 0) {
    shipments[s651Idx] = ship651;
  } else {
    shipments.push(ship651);
  }

  fs.writeFileSync('.local-shipments.json.tmp', JSON.stringify(shipments, null, 2), 'utf8');
  fs.renameSync('.local-shipments.json.tmp', '.local-shipments.json');
  console.log('✅ Updated .local-shipments.json: count =', shipments.length);
}
