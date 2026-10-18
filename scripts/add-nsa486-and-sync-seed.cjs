const fs = require('fs');
const path = require('path');

const NSA486_RECORD = {
  id: "BOL-2026-NSA486",
  bol_number: "BOL-2026-NSA486",
  billOfLadingNumber: "BOL-2026-NSA486",
  bolNo: "BOL-2026-NSA486",
  legacy_id: "BOL-2026-NSA486",
  issue_date: "2026-08-19",
  issueDate: "2026-08-19",
  created_at: "2026-08-19T08:00:00.000Z",
  updated_at: "2026-10-07T10:50:00.000Z",
  user_id: null,
  notes_1: "نظرمحمد (یارمل)\n(+93) 0 700 203 307",
  notes_1_label: "دکندهار بارګیری مسؤل",
  notes_1_theme: "red",
  notes_2: "اسلام قلعه نمبرونه | نماینده دوغارون / شماره تماس\nحاجی معلم صاحب : 0799007371 , عصمت الله : 0729807676 , حکمت الله :0794983011",
  notes_2_label: "Border Representative / نماینده مرزی",
  notes_2_theme: "purple",
  cargo_route_note: "از دوغارون کانتینر ترانزیت، از مرسین به نوا شوا کشتی",
  truck_number: "18436هرات",
  truckNumber: "18436هرات",
  driver_name: "محمد قاسم ولد سیدمحمد",
  driverName: "محمد قاسم ولد سیدمحمد",
  driver_father_name: "سیدمحمد",
  driverFatherName: "سیدمحمد",
  driver_contact: "0799641045",
  driverContact: "0799641045",
  driver_rent: "44,000 AFN - کرایه واپسی",
  driverFreight: "44,000 AFN - کرایه واپسی",
  driver_rent_amount: 44000,
  driver_rent_currency: "AFN",
  driver_rent_usd: 628.57,
  afn_to_usd_rate: 70,
  routes: [
    {
      id: "route-kandahar",
      location: "Kandahar",
      locationPersian: "کندهار",
      stopOrder: 1,
      transportMode: "truck",
      stopLabel: "Origin"
    },
    {
      id: "route-dougharoun",
      location: "Dougharoun",
      locationPersian: "دوغارون، ایران",
      stopOrder: 2,
      transportMode: "truck",
      stopLabel: "Stop 1"
    },
    {
      id: "route-mersin",
      location: "Mersin",
      locationPersian: "مرسین، ترکیه",
      stopOrder: 3,
      transportMode: "vessel",
      stopLabel: "Stop 2"
    },
    {
      id: "route-nhava-sheva",
      location: "Nhava Sheva",
      locationPersian: "نوا شوا، هند",
      stopOrder: 4,
      transportMode: "vessel",
      stopLabel: "Destination"
    }
  ],
  container_type: "Standard Dry",
  container_size: "40 FT",
  container_numbers: "",
  seal_numbers: "",
  shipper_name: "NAJEB AMIN LTD",
  shipperName: "NAJEB AMIN LTD",
  shipper_address: "Shorandam Industrial Area, Kandahar, Afghanistan\nT.L NO: 27-975\n+93 700 308 086",
  shipper_contact: "+93 700 308 086",
  shipper_email: "",
  consignee_name: "RCA EXIM PRIVATE LIMITED",
  consigneeName: "RCA EXIM PRIVATE LIMITED",
  consignee_address: "1112 2ND AND 3RD FLOOR GANDHI GALI FATEHPURI, DELHI 110006 INDIA.\nFSSAI NO: 10017011004599\nIEC NO: 0512088365\nPAN NO: AAFCR6407G\nGST: 07AAFCR6407G1ZF\n+919999927864\nIM4URACHIT@GMAIL.COM",
  consignee_contact: "+919999927864",
  consignee_email: "IM4URACHIT@GMAIL.COM",
  notify_party: "YAAQOUB HAMDAN FOODSTUFF TRADING CO LLC",
  notify_party_address: "28 Al Hawai Building, Al Ras Street, Deira Dubai, UAE\nTRN NO: 100340961000003",
  vessel_name: "",
  voyage_number: "",
  port_of_loading: "Kandahar, Afghanistan",
  port_of_discharge: "Nhava Sheva, India",
  place_of_delivery: "Nhava Sheva, India",
  borderCrossing: "Dougharoun / Islam Qala",
  cargo_description: "📦 CONTAINER & CARGO DETAILS │ 🧾 DOCUMENT & SHIPPING DETAILS\nBLACK RAISINS 667 CTNS 16 KG @ 2.90$ | BLACK RAISINS 658 CTNS 16 KG @ 3.60$│ 📄 Invoice NO: 105",
  cargoDescription: "📦 CONTAINER & CARGO DETAILS │ 🧾 DOCUMENT & SHIPPING DETAILS\nBLACK RAISINS 667 CTNS 16 KG @ 2.90$ | BLACK RAISINS 658 CTNS 16 KG @ 3.60$│ 📄 Invoice NO: 105",
  net_weight: "21,200 KG",
  netWeight: "21,200 KG",
  gross_weight: "23,000 KG",
  grossWeight: "23,000 KG",
  measurement: "",
  number_of_packages: "1,325 CTNS",
  numberOfPackages: "1,325 CTNS",
  kgs_per_carton: "16.00 - KGS",
  gross_weight_per_carton: "17.36 - KGS",
  rate_per_kgs: "2.90 - 3.60 USD",
  goods_value: "68,849.60 USD",
  goodsValue: "68,849.60 USD",
  invoice_no: "INV-105",
  invoice_number: "INV-105",
  freight_payable_at: "",
  freight_terms: "",
  remarks: "",
  iran_office_building: "CUBIC BUILDING",
  iran_office_location: "BANDAR ABBASS - IRAN",
  iran_office_pobox: "7913973295",
  iran_office_telefax: "+98 76 32226028",
  iran_office_cellphone: "+98 09172325086",
  iran_office_email: "info@balambarbaran.com, ceo@balambarbaran.com",
  afghanistan_documents: [],
  afghanistan_document_details: {},
  status: "active",
  isArchived: false,
  archived_at: null,
  archived_by: null,
  pdf_status: "none",
  pdf_url: null,
  pdf_uploaded_at: null
};

function atomicWrite(filepath, data) {
  const tmpPath = `${filepath}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filepath);
}

function main() {
  const seedPath = path.resolve('lib/data/seed-bols.json');
  const localPath = path.resolve('data/.local-bols.json');

  // Backup files
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  if (fs.existsSync(seedPath)) {
    fs.copyFileSync(seedPath, `${seedPath}.backup-${ts}`);
  }
  if (fs.existsSync(localPath)) {
    fs.copyFileSync(localPath, `${localPath}.backup-${ts}`);
  }

  const existingSeed = fs.existsSync(seedPath) ? JSON.parse(fs.readFileSync(seedPath, 'utf8')) : [];
  const existingLocal = fs.existsSync(localPath) ? JSON.parse(fs.readFileSync(localPath, 'utf8')) : [];

  const map = new Map();

  // 1. Add all from local
  for (const item of existingLocal) {
    const k = item.bol_number || item.billOfLadingNumber || item.bolNo || item.id;
    if (k) map.set(k, item);
  }

  // 2. Add or merge from seed
  for (const item of existingSeed) {
    const k = item.bol_number || item.billOfLadingNumber || item.bolNo || item.id;
    if (k) {
      if (!map.has(k)) {
        map.set(k, item);
      } else {
        map.set(k, { ...map.get(k), ...item });
      }
    }
  }

  // 3. Set the verified complete record for BOL-2026-NSA486
  map.set("BOL-2026-NSA486", NSA486_RECORD);

  // Convert to array and sort chronologically descending
  const allBols = Array.from(map.values()).sort((a, b) => {
    const dateA = new Date(a.issue_date || a.issueDate || a.created_at || 0).getTime();
    const dateB = new Date(b.issue_date || b.issueDate || b.created_at || 0).getTime();
    return dateB - dateA;
  });

  console.log(`Total merged BOLs: ${allBols.length}`);
  const hasNSA486 = allBols.some(b => (b.bol_number || b.id) === 'BOL-2026-NSA486');
  console.log(`Contains BOL-2026-NSA486: ${hasNSA486}`);

  // Write to lib/data/seed-bols.json
  atomicWrite(seedPath, allBols);
  console.log(`Updated ${seedPath}`);

  // Write to data/.local-bols.json if present
  if (fs.existsSync(localPath)) {
    atomicWrite(localPath, allBols);
    console.log(`Updated ${localPath}`);
  }
}

main();
