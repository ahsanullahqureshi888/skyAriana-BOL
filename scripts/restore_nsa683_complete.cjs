const fs = require('fs');
const path = require('path');

const NSA683_RECORD = {
  id: "BOL-2026-NSA683",
  bol_number: "BOL-2026-NSA683",
  billOfLadingNumber: "BOL-2026-NSA683",
  bolNo: "BOL-2026-NSA683",
  legacy_id: "BOL-2026-NSA683",
  issue_date: "2026-10-08",
  issueDate: "2026-10-08",
  created_at: "2026-10-08T09:19:04.950Z",
  updated_at: new Date().toISOString(),
  user_id: null,
  notes_1: "نظرمحمد (یارمل)\n(+93) 0 700 203 307",
  notes_1_label: "دکندهار بارګیری مسؤل",
  notes_1_theme: "red",
  notes_2: "اسلام قلعه نمبرونه | نماینده دوغارون / شماره تماس\nحاجی معلم صاحب : 0799007371 , عصمت الله : 0729807676 , حکمت الله :0794983011",
  notes_2_label: "Border Representative / نماینده مرزی",
  notes_2_theme: "purple",
  cargo_route_note: "از دوغارون کانتینر معمولی از بندرعباس کانتینر معمولی (با سوییچ بی ال در دبی / جبل علی)، و مقصد نهایی: نهاوا شیوا (Nhava Sheva).",
  cargoRouteNote: "از دوغارون کانتینر معمولی از بندرعباس کانتینر معمولی (با سوییچ بی ال در دبی / جبل علی)، و مقصد نهایی: نهاوا شیوا (Nhava Sheva).",
  truck_number: "35599 هرات",
  truckNumber: "35599 هرات",
  driver_name: "نوم صحراب ولد محمدنادر",
  driverName: "نوم صحراب ولد محمدنادر",
  driver_father_name: "محمدنادر",
  driverFatherName: "محمدنادر",
  driver_contact: "0729955837",
  driverContact: "0729955837",
  driver_rent: "46,000 AFN - کرایه واپسی",
  driverFreight: "46,000 AFN - کرایه واپسی",
  driver_rent_amount: 46000,
  driver_rent_currency: "AFN",
  driver_rent_usd: 657.14,
  afn_to_usd_rate: 70,
  routes: [
    {
      id: "route-kandahar",
      location: "Kandahar, AF",
      locationPersian: "کندهار، افغانستان",
      stopOrder: 1,
      transportMode: "truck",
      stopLabel: "Origin"
    },
    {
      id: "route-dougharoun",
      location: "Dougharoun, IR",
      locationPersian: "دوغارون، ایران",
      stopOrder: 2,
      transportMode: "truck",
      stopLabel: "Stop 1"
    },
    {
      id: "route-bandar-abbas",
      location: "Bandar Abbas, IR",
      locationPersian: "بندرعباس، ایران",
      stopOrder: 3,
      transportMode: "vessel",
      stopLabel: "Stop 2"
    },
    {
      id: "route-dubai",
      location: "Dubai, AE",
      locationPersian: "دبی، امارات",
      stopOrder: 4,
      transportMode: "vessel",
      stopLabel: "Stop 3"
    },
    {
      id: "route-nhava-sheva",
      location: "Nhava Sheva, IN",
      locationPersian: "نهاوا شوا، هند",
      stopOrder: 5,
      transportMode: "vessel",
      stopLabel: "Destination"
    }
  ],
  container_type: "Standard Dry",
  containerType: "Standard Dry",
  container_size: "40 FT",
  containerSize: "40 FT",
  container_numbers: "",
  containerNumbers: "",
  seal_numbers: "",
  sealNumbers: "",
  shipper_name: "RAHMAT NAZAR LTD",
  shipperName: "RAHMAT NAZAR LTD",
  shipper_address: "T.L NO: 682-27\nShorandam Industrial Area, Kandahar, Afghanistan",
  shipperAddress: "T.L NO: 682-27\nShorandam Industrial Area, Kandahar, Afghanistan",
  shipper_contact: "+93 700 300 979",
  shipperContact: "+93 700 300 979",
  shipper_email: "",
  shipperEmail: "",
  consignee_name: "RICH VALLEY DRY FRUITS PVT LTD",
  consigneeName: "RICH VALLEY DRY FRUITS PVT LTD",
  consignee_address: "OFFICE NO: 214 2ND FLOOR MADHUPURA COMMERCIAL CENTRE OLD MADHUPURA\nCIRCLE AHMEDABAD 380004 GUJARAT (INDIA).\nGST NO: 24AAJCR3849L1ZW\nIEC: AAJCR3849L, FSSAI:10019021004133, PAN:AAJCR3849L CONTACT NO: +916359974979\nEMAIL: Sanket.khatri@richvalley.in",
  consigneeAddress: "OFFICE NO: 214 2ND FLOOR MADHUPURA COMMERCIAL CENTRE OLD MADHUPURA\nCIRCLE AHMEDABAD 380004 GUJARAT (INDIA).\nGST NO: 24AAJCR3849L1ZW\nIEC: AAJCR3849L, FSSAI:10019021004133, PAN:AAJCR3849L CONTACT NO: +916359974979\nEMAIL: Sanket.khatri@richvalley.in",
  consignee_contact: "+916359974979",
  consigneeContact: "+916359974979",
  consignee_email: "Sanket.khatri@richvalley.in",
  consigneeEmail: "Sanket.khatri@richvalley.in",
  notify_party: "ABDUL MAJID KAKAR GENERAL TRADING LLC",
  notifyParty: "ABDUL MAJID KAKAR GENERAL TRADING LLC",
  notify_party_address: "Shaikh Maitha Bint Rashed Bin Saeed Almaktoum Bldg, Shop No. SM-17, Al Rega, Dubai, U.A.E",
  notifyPartyAddress: "Shaikh Maitha Bint Rashed Bin Saeed Almaktoum Bldg, Shop No. SM-17, Al Rega, Dubai, U.A.E",
  vessel_name: "",
  vesselName: "",
  voyage_number: "",
  voyageNumber: "",
  port_of_loading: "Kandahar, Afghanistan",
  portOfLoading: "Kandahar, Afghanistan",
  port_of_discharge: "Nhava Sheva, India",
  portOfDischarge: "Nhava Sheva, India",
  place_of_delivery: "Nhava Sheva, India",
  placeOfDelivery: "Nhava Sheva, India",
  origin_country: "Afghanistan",
  destination_country: "India",
  borderCrossing: "Dougharoun / Islam Qala",
  border_station: "Dougharoun / Islam Qala",
  cargo_description: "📦 CONTAINER & CARGO PARTICULARS:\n• Description: BLACK RAISINS 1458 CTNS 16.00-KGS\n• Transit Date: 2026-10-08\n• INV-105",
  cargoDescription: "📦 CONTAINER & CARGO PARTICULARS:\n• Description: BLACK RAISINS 1458 CTNS 16.00-KGS\n• Transit Date: 2026-10-08\n• INV-105",
  net_weight: "23,328 KG",
  netWeight: "23,328 KG",
  gross_weight: "25,660.8 KG",
  grossWeight: "25,660.8 KG",
  measurement: "",
  number_of_packages: "1,458 CTNS",
  numberOfPackages: "1,458 CTNS",
  carton_count: 1458,
  kgs_per_carton: "16.00 - KGS",
  kgsPerCarton: "16.00 - KGS",
  gross_weight_per_carton: "17.60 - KGS",
  grossWeightPerCarton: "17.60 - KGS",
  rate_per_kgs: "3.50 - USD",
  ratePerKgs: "3.50 - USD",
  goods_value: "81,648.00 USD",
  goodsValue: "81,648.00 USD",
  invoice_no: "INV-105",
  invoice_number: "INV-105",
  persian_date: "۱۶ مهر ۱۴۰۵",
  persian_date_numeric: "۱۴۰۵/۰۷/۱۶",
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
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${filepath}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filepath);
}

function backupFile(filepath) {
  if (fs.existsSync(filepath)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(path.dirname(filepath), 'backups');
    if (!fs.existsSync(backupDir)) {
      try { fs.mkdirSync(backupDir, { recursive: true }); } catch (e) {}
    }
    const ext = path.extname(filepath);
    const base = path.basename(filepath, ext);
    const dest = path.join(backupDir, `${base}.backup-${ts}${ext}`);
    fs.copyFileSync(filepath, dest);
    // Also adjacent backup for immediate rollback safety
    fs.copyFileSync(filepath, `${filepath}.backup-${ts}`);
    return dest;
  }
  return null;
}

function mergeBolList(existingList, newBol) {
  const map = new Map();
  for (const item of existingList) {
    if (!item) continue;
    const k = (item.bol_number || item.billOfLadingNumber || item.bolNo || item.id || '').trim();
    if (k) map.set(k.toUpperCase(), item);
  }
  const targetKey = (newBol.bol_number || newBol.id).trim().toUpperCase();
  if (map.has(targetKey)) {
    map.set(targetKey, { ...map.get(targetKey), ...newBol });
  } else {
    map.set(targetKey, newBol);
  }
  return Array.from(map.values()).sort((a, b) => {
    const dateA = new Date(a.issue_date || a.issueDate || a.created_at || 0).getTime();
    const dateB = new Date(b.issue_date || b.issueDate || b.created_at || 0).getTime();
    return dateB - dateA;
  });
}

function convertBolToShipment(bol) {
  const bolNum = bol.bol_number || bol.id;
  const issueDate = bol.issue_date || new Date().toISOString().split('T')[0];
  const freightAmt = 81648.00;
  const driverRent = 46000;

  const milestones = [
    { location: "Kandahar, AF (کندهار)", title: "Cargo Loaded (بارگیری کالا)", status: "cargo_loaded", completed: true, timestamp: issueDate },
    { location: "Dougharoun Border (مرز دوغارون)", title: "Border Customs (گمرک مرزی)", status: "at_border", completed: false, timestamp: issueDate },
    { location: "Bandar Abbas (بندرعباس)", title: "Container Loading (بارگیری کانتینر در اسکله)", status: "at_port", completed: false, timestamp: issueDate },
    { location: "Dubai / Jebel Ali (دبی / جبل علی)", title: "Switch BL & Transshipment (سوییچ بی ال)", status: "transshipment", completed: false, timestamp: issueDate },
    { location: "Nhava Sheva (نهاوا شیوا)", title: "Port of Discharge (بندر مقصد)", status: "arrived_destination", completed: false, timestamp: issueDate }
  ];

  return {
    id: `SA-SHP-${bolNum.replace(/[^A-Za-z0-9]/g, "-")}`,
    referenceNumber: bolNum,
    status: "cargo_loaded",
    currentLocation: "Kandahar, AF",
    nextDestination: "Nhava Sheva, IN",
    eta: "",
    createdAt: bol.created_at || new Date().toISOString(),
    updatedAt: bol.updated_at || new Date().toISOString(),
    createdBy: "System",
    lastUpdatedBy: "System",
    shipper: {
      id: `shp-${Date.now()}`,
      name: bol.shipper_name,
      address: bol.shipper_address || "",
      phone: bol.shipper_contact || "",
      email: bol.shipper_email || "",
      type: "shipper"
    },
    consignee: {
      id: `cng-${Date.now()}`,
      name: bol.consignee_name,
      address: bol.consignee_address || "",
      phone: bol.consignee_contact || "",
      email: bol.consignee_email || "",
      type: "consignee"
    },
    notifyParty: {
      id: `not-${Date.now()}`,
      name: bol.notify_party,
      address: bol.notify_party_address || "",
      type: "notify"
    },
    cargo: {
      commodity: "BLACK RAISINS",
      cartons: 1458,
      packageType: "Cartons",
      grossWeightKg: 25660.8,
      netWeightKg: 23328,
      volumeCbm: 0,
      descriptionOfGoods: bol.cargo_description,
      ratePerKg: 3.50,
      goodsValueUSD: freightAmt
    },
    transport: {
      origin: "Kandahar, AF",
      loadingPlace: "Kandahar",
      borderCrossing: "Dougharoun / Islam Qala",
      portOfLoading: "Bandar Abbas",
      portOfDischarge: "Nhava Sheva",
      finalDestination: "Nhava Sheva, India",
      transportMode: "multimodal",
      routeName: "Kandahar ➜ Dougharoun ➜ Bandar Abbas ➜ Dubai ➜ Nhava Sheva"
    },
    container: {
      containerNumber: "",
      containerType: "Standard Dry 40 FT",
      sealNumber: "",
      isReefer: false
    },
    truck: {
      driverName: bol.driver_name,
      driverFatherName: bol.driver_father_name,
      driverPhone: bol.driver_contact,
      afghanPlate: bol.truck_number,
      driverRent: 46000,
      driverRentCurrency: "AFN"
    },
    finance: {
      freightAmount: freightAmt,
      currency: "USD",
      customerAmount: freightAmt,
      amountReceived: 0,
      customerOutstanding: freightAmt,
      supplierCost: driverRent,
      amountPaid: 0,
      supplierOutstanding: driverRent,
      portCharges: 0,
      detentionCost: 0,
      demurrageCost: 0,
      documentationFee: 150,
      truckFreight: driverRent,
      customsFee: 0,
      otherCosts: 0,
      profitOrLoss: freightAmt - (driverRent / 70) - 150
    },
    documents: [
      {
        id: `snap-bol-${bolNum}`,
        documentType: "bol",
        documentNumber: bolNum,
        version: 1,
        status: "approved",
        pdfUrl: null,
        generatedAt: bol.created_at,
        generatedBy: "System",
        snapshotData: { ...bol }
      }
    ],
    attachments: [],
    milestones,
    auditLog: [
      {
        id: `audit-init-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "System",
        field: "shipment",
        oldValue: null,
        newValue: "Created from restored BOL"
      }
    ]
  };
}

function run() {
  console.log("=== Restoring Missing BOL-2026-NSA683 ===");

  const seedPath = path.resolve('lib/data/seed-bols.json');
  const localBolsDataPath = path.resolve('data/.local-bols.json');
  const localBolsRootPath = path.resolve('.local-bols.json');

  const localShipmentsDataPath = path.resolve('data/.local-shipments.json');
  const localShipmentsRootPath = path.resolve('.local-shipments.json');

  const localLedgersDataPath = path.resolve('data/.local-account-ledgers.json');
  const localLedgersRootPath = path.resolve('.local-account-ledgers.json');

  const auditLogDataPath = path.resolve('data/.local-bol-audit-log.json');
  const auditLogRootPath = path.resolve('.local-bol-audit-log.json');

  // 1. Backups
  backupFile(seedPath);
  backupFile(localBolsDataPath);
  backupFile(localBolsRootPath);
  backupFile(localShipmentsDataPath);
  backupFile(localShipmentsRootPath);

  // 2. Read existing BOLs
  const seedBols = fs.existsSync(seedPath) ? JSON.parse(fs.readFileSync(seedPath, 'utf8')) : [];
  const localBolsData = fs.existsSync(localBolsDataPath) ? JSON.parse(fs.readFileSync(localBolsDataPath, 'utf8')) : [];
  const localBolsRoot = fs.existsSync(localBolsRootPath) ? JSON.parse(fs.readFileSync(localBolsRootPath, 'utf8')) : [];

  // Merge seed and local data
  let combinedBols = mergeBolList(seedBols, NSA683_RECORD);
  combinedBols = mergeBolList(localBolsData, NSA683_RECORD);
  combinedBols = mergeBolList(combinedBols, NSA683_RECORD);

  // Write to all 3 BOL locations
  atomicWrite(seedPath, combinedBols);
  console.log(`✓ Updated ${seedPath} (${combinedBols.length} BOLs)`);

  atomicWrite(localBolsDataPath, combinedBols);
  console.log(`✓ Updated ${localBolsDataPath} (${combinedBols.length} BOLs)`);

  atomicWrite(localBolsRootPath, combinedBols);
  console.log(`✓ Updated ${localBolsRootPath} (${combinedBols.length} BOLs)`);

  // 3. Update shipments
  const shipment = convertBolToShipment(NSA683_RECORD);
  const dataShipments = fs.existsSync(localShipmentsDataPath) ? JSON.parse(fs.readFileSync(localShipmentsDataPath, 'utf8')) : [];
  const shipmentMap = new Map();
  for (const s of dataShipments) {
    if (s && s.id) shipmentMap.set(s.id, s);
  }
  shipmentMap.set(shipment.id, shipment);
  const updatedShipments = Array.from(shipmentMap.values());

  atomicWrite(localShipmentsDataPath, updatedShipments);
  console.log(`✓ Updated ${localShipmentsDataPath} (${updatedShipments.length} shipments)`);

  atomicWrite(localShipmentsRootPath, updatedShipments);
  console.log(`✓ Updated ${localShipmentsRootPath} (${updatedShipments.length} shipments)`);

  // 4. Ensure root .local-account-ledgers.json is in sync with data/.local-account-ledgers.json
  if (fs.existsSync(localLedgersDataPath)) {
    const ledgers = JSON.parse(fs.readFileSync(localLedgersDataPath, 'utf8'));
    atomicWrite(localLedgersRootPath, ledgers);
    console.log(`✓ Synced ${localLedgersRootPath} with authoritative data ledger store`);
  }

  // 5. Update Audit Logs
  const auditEntry = {
    id: `audit-${Date.now()}-restore-nsa683`,
    timestamp: new Date().toISOString(),
    action: "BOL_RESTORED",
    entityId: "BOL-2026-NSA683",
    bolNumber: "BOL-2026-NSA683",
    actor: "system",
    metadata: {
      reason: "Restored missing BOL record with multi-modal route (Kandahar ➜ Dougharoun ➜ Bandar Abbas ➜ Dubai ➜ Nhava Sheva) and cargo details"
    }
  };

  for (const p of [auditLogDataPath, auditLogRootPath]) {
    try {
      const logs = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
      logs.unshift(auditEntry);
      atomicWrite(p, logs);
      console.log(`✓ Logged restoration audit event in ${p}`);
    } catch (e) {
      console.warn(`Could not update audit log ${p}:`, e.message);
    }
  }

  console.log("=== BOL-2026-NSA683 successfully restored across JSON stores ===");
}

run();
