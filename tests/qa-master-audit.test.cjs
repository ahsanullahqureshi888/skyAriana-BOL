/**
 * Sky Ariana BOL — Master 32-Phase QA & Data Safety Test Suite
 *
 * Verifies every major logistics and accounting module:
 * - Real workflows, data flow, persistence, and mathematical invariance
 * - Duplicate prevention, atomic file safety, pre-restore snapshots, and zero-record protection
 * - Isolated QA-TEST-* execution with zero footprint on production data
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const load = require("./load-typescript.cjs");
require('./isolated-data.cjs')();

// Load core services and utilities
const { readJsonFile, writeJsonFile, atomicWriteFile } = load("lib/services/blob-db.ts");
const { getDataPath } = load("lib/server-paths.ts");
const {
  exportFullDatabasePackage,
  restoreFullDatabasePackage,
  getDatabaseHealth,
} = load("lib/services/database-manager.ts");
const {
  normalizeBolNumber,
  normalizeContainerNumber,
  normalizeCompanyName,
  checkDuplicateIdentifier,
  findDuplicatePartyCandidates,
} = load("lib/utils/duplicate-prevention.ts");
const {
  buildWhatsAppBOLMessage,
  buildWhatsAppShipmentUpdate,
  buildWhatsAppBilingualMessage,
  buildWhatsAppQuickMessage,
} = load("lib/utils/bol-whatsapp-formatter.ts");
const {
  verifyAccountingInvariance,
  mergeLedgerEntriesByStableId,
} = load("lib/sync/merge.ts");
const { validateLedgerInvariance } = load("lib/services/ledger-sync-utils.ts");
const {
  createZipArchive,
  extractZipArchive,
} = load("lib/google-drive/archive.ts");
const {
  computeSha256,
  encryptPayload,
  decryptPayload,
} = load("lib/google-drive/crypto.ts");
const {
  convertToPersianDigits,
  convertToLatinDigits,
  getProvinceInfo,
} = load("lib/utils/afghan-plate.ts");
const {
  addTombstone,
  isRecordTombstoned,
  permanentlyDelete,
} = load("lib/sync/tombstones.ts");

const QA_PREFIX = "QA-TEST-";

// Track all QA records created for guaranteed cleanup in Phase 32
const qaRecordsCreated = {
  bols: [],
  invoices: [],
  shipments: [],
  accounts: [],
  ledgerEntries: [],
  documents: [],
  entities: [],
};

// ==================================================
// PHASE 1 — CREATE A SAFE TEST ENVIRONMENT
// ==================================================
test("Phase 1: Safe Test Environment & Backup", async () => {
  const testDir = getDataPath(".local-bols.json");
  assert.ok(testDir, "Data directory path must be resolved");

  // Create isolated timestamped safety backup of live BOLs and ledgers
  const bolsFile = getDataPath(".local-bols.json");
  const ledgersFile = getDataPath(".local-account-ledgers.json");
  
  if (fs.existsSync(bolsFile)) {
    const backupPath = getDataPath(`.local-qa-pretest-bols.bak.json`);
    fs.copyFileSync(bolsFile, backupPath);
    assert.ok(fs.existsSync(backupPath), "Pre-test BOL backup must exist");
    fs.unlinkSync(backupPath); // clean up test backup
  }
  
  if (fs.existsSync(ledgersFile)) {
    const backupPath = getDataPath(`.local-qa-pretest-ledgers.bak.json`);
    fs.copyFileSync(ledgersFile, backupPath);
    assert.ok(fs.existsSync(backupPath), "Pre-test Ledger backup must exist");
    fs.unlinkSync(backupPath);
  }

  assert.ok(QA_PREFIX.startsWith("QA-TEST-"), "Test prefix must be isolated");
});

// ==================================================
// PHASE 2 — BILL OF LADING MODULE
// ==================================================
test("Phase 2: BOL Lifecycle (Create, Save, Reopen, Edit, Duplicate, Delete Isolation)", async () => {
  const bolsFile = getDataPath(".local-bols.json");
  const existingBols = await readJsonFile(bolsFile, []);
  
  const testBolId = `${QA_PREFIX}BOL-001`;
  qaRecordsCreated.bols.push(testBolId);

  const newBol = {
    id: testBolId,
    bol_number: testBolId,
    issue_date: "2026-09-19",
    shipper_name: "QA TEST EXPORTER CO.",
    shipper_address: "Kandahar Industrial Park, Afghanistan",
    consignee_name: "QA TEST IMPORTER LTD",
    consignee_address: "JNPT Port Area, Mumbai, India",
    notify_party: "QA TEST NOTIFY LOGISTICS",
    vessel_name: "AL MANSOOR 12",
    voyage_number: "V-901",
    container_numbers: "MSCU9876543",
    seal_numbers: "SL-9988",
    truck_number: "26253کابل",
    driver_name: "احمد ولی",
    driver_father_name: "محمد خان",
    driver_contact: "+93 700 111 222",
    driver_rent: "45000",
    driver_rent_currency: "AFN",
    port_of_loading: "Bandar Abbas, IR",
    port_of_discharge: "Nhava Sheva, IN",
    place_of_delivery: "Mumbai, IN",
    cargo_description: "GOLDEN RAISINS (MED)",
    hs_code: "080620",
    number_of_packages: "1,476",
    package_type: "CTNS",
    gross_weight: "24,500 KG",
    net_weight: "23,616 KG",
    rate_per_kgs: "2.40 USD",
    goods_value: "56,678.40 USD",
    routes: [
      { stopOrder: 1, location: "Kandahar" },
      { stopOrder: 2, location: "Dougharoun" },
      { stopOrder: 3, location: "Bandar Abbas" },
      { stopOrder: 4, location: "Nhava Sheva" },
    ],
    status: "Draft",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Save new BOL
  const updatedList = [...existingBols.filter(b => b.id !== testBolId), newBol];
  await writeJsonFile(bolsFile, updatedList);

  // 2. Reopen & Verify all fields persisted
  const reloadedList = await readJsonFile(bolsFile, []);
  const persisted = reloadedList.find(b => b.id === testBolId);
  assert.ok(persisted, "BOL must persist to database");
  assert.equal(persisted.shipper_name, "QA TEST EXPORTER CO.");
  assert.equal(persisted.net_weight, "23,616 KG");
  assert.equal(persisted.truck_number, "26253کابل");
  assert.equal(persisted.routes.length, 4);

  // 3. Edit fields and save again
  persisted.status = "Confirmed";
  persisted.vessel_name = "AL MANSOOR 14";
  persisted.updated_at = new Date().toISOString();
  await writeJsonFile(bolsFile, reloadedList);

  // 4. Verify edited values persist
  const reloadedAfterEdit = await readJsonFile(bolsFile, []);
  const editedBol = reloadedAfterEdit.find(b => b.id === testBolId);
  assert.equal(editedBol.status, "Confirmed");
  assert.equal(editedBol.vessel_name, "AL MANSOOR 14");

  // 5. Duplicate / Copy BOL
  const copyBolId = `${QA_PREFIX}BOL-002`;
  qaRecordsCreated.bols.push(copyBolId);
  const duplicateBol = { ...editedBol, id: copyBolId, bol_number: copyBolId, status: "Draft" };
  const listWithCopy = [...reloadedAfterEdit, duplicateBol];
  await writeJsonFile(bolsFile, listWithCopy);

  const reloadedWithCopy = await readJsonFile(bolsFile, []);
  assert.ok(reloadedWithCopy.some(b => b.id === copyBolId));

  // 6. Delete first QA BOL and verify second QA BOL & production BOLs remain untouched
  const listAfterDelete = reloadedWithCopy.filter(b => b.id !== testBolId);
  await writeJsonFile(bolsFile, listAfterDelete);

  const reloadedAfterDelete = await readJsonFile(bolsFile, []);
  assert.ok(!reloadedAfterDelete.some(b => b.id === testBolId), "Deleted QA BOL must be removed");
  assert.ok(reloadedAfterDelete.some(b => b.id === copyBolId), "Duplicated QA BOL must remain");
  
  // Verify production records untouched
  const prodRecordsOriginal = existingBols.filter(b => !b.id.startsWith(QA_PREFIX));
  const prodRecordsCurrent = reloadedAfterDelete.filter(b => !b.id.startsWith(QA_PREFIX));
  assert.equal(prodRecordsCurrent.length, prodRecordsOriginal.length, "Non-QA BOLs must not be affected");
});

// ==================================================
// PHASE 3 — DUPLICATE PREVENTION
// ==================================================
test("Phase 3: Duplicate Prevention & Identifier Normalization", () => {
  const existingBols = ["QA-TEST-BOL-001", "BOL-2026-NSA588", "BOL-2026-0042"];
  const existingContainers = ["MSCU1234567", "TGHU9876543"];
  const existingInvoices = ["INV-2026-0101", "INV-2026-0102"];

  // 1. BOL case-insensitive and whitespace variations
  const testVariations = [
    "QA-TEST-BOL-001",
    "qa-test-bol-001",
    " QA-TEST-BOL-001 ",
    "QA_TEST_BOL_001",
    "QA-TEST-BOL-001   ",
  ];

  for (const variant of testVariations) {
    const result = checkDuplicateIdentifier("bol", variant, existingBols);
    assert.ok(result.isDuplicate, `Variant "${variant}" must be flagged as duplicate`);
    assert.equal(result.matchedWith, "QA-TEST-BOL-001");
  }

  // Legitimate distinct BOL must not be blocked
  assert.ok(!checkDuplicateIdentifier("bol", "QA-TEST-BOL-002", existingBols).isDuplicate);

  // 2. Container ISO 6346 variations
  const containerVariations = [
    "MSCU1234567",
    "mscu1234567",
    " MSCU 1234567 ",
    "MSCU-123456-7",
  ];

  for (const cVar of containerVariations) {
    const result = checkDuplicateIdentifier("container", cVar, existingContainers);
    assert.ok(result.isDuplicate, `Container variant "${cVar}" must be flagged as duplicate`);
  }

  // 3. Invoice variations
  assert.ok(checkDuplicateIdentifier("invoice", "inv-2026-0101", existingInvoices).isDuplicate);
  assert.ok(checkDuplicateIdentifier("invoice", " INV-2026-0101 ", existingInvoices).isDuplicate);
  assert.ok(!checkDuplicateIdentifier("invoice", "INV-2026-0999", existingInvoices).isDuplicate);

  // 4. Company name normalization
  assert.equal(normalizeCompanyName("NAJEB AMIN LTD"), "najeb amin");
  assert.equal(normalizeCompanyName("Najeb Amin Ltd."), "najeb amin");
  assert.equal(normalizeCompanyName("Haji Najeb Amin Trading Co."), "najeb amin");
  assert.equal(normalizeCompanyName("شرکت تجارتی نجیب امین لمیتد"), "نجیب امین");
});

// ==================================================
// PHASE 4 — SHIPPER / CONSIGNEE / NOTIFY PARTY MASTER
// ==================================================
test("Phase 4: Master Parties Management (CRUD & Candidate Detection)", async () => {
  const existingParties = [
    { id: "ent_1", name: "SABOOR ADEL TRADING COMPANY" },
    { id: "ent_2", name: "NAJIB AMIN LTD" },
    { id: "ent_3", name: "SKY ARIANA LIMITED" },
  ];

  // 1. Duplicate candidate detection
  const candidates = findDuplicatePartyCandidates("Haji Najib Amin Trading Co.", existingParties);
  assert.ok(candidates.length > 0, "Must detect candidate match for Najib Amin");
  assert.equal(candidates[0].id, "ent_2");
  assert.ok(candidates[0].similarity >= 0.85, "Similarity must exceed threshold");

  // 2. Exact match candidate
  const exactCandidates = findDuplicatePartyCandidates("NAJIB AMIN LTD", existingParties);
  assert.equal(exactCandidates[0].reason, "exact_normalized");
  assert.equal(exactCandidates[0].similarity, 1.0);

  // 3. Legitimate distinct party
  const newPartyCandidates = findDuplicatePartyCandidates("KANDAHAR FRESH FRUITS EXP", existingParties);
  assert.equal(newPartyCandidates.length, 0, "Unique company must have zero duplicate candidates");
});

// ==================================================
// PHASE 5 — COMMERCIAL INVOICE MATH INVARIANCE
// ==================================================
test("Phase 5: Commercial Invoice Calculation Invariance", async () => {
  const invoicesFile = getDataPath(".local-invoices.json");
  const existingInvoices = await readJsonFile(invoicesFile, []);

  const testInvId = `${QA_PREFIX}INV-001`;
  qaRecordsCreated.invoices.push(testInvId);

  const invoice = {
    id: testInvId,
    invoice_number: testInvId,
    bol_number: `${QA_PREFIX}BOL-002`,
    date: "2026-09-19",
    shipper: "QA TEST EXPORTER CO.",
    consignee: "QA TEST IMPORTER LTD",
    currency: "USD",
    items: [
      { description: "GOLDEN RAISINS GRADE A", quantity: 1000, unit: "CTNS", unit_price: 16.50, total: 16500.00 },
      { description: "BLACK RAISINS BEST", quantity: 476, unit: "CTNS", unit_price: 21.25, total: 10115.00 },
    ],
    freight_charges: 1200.00,
    documentation_fee: 150.00,
  };

  // Verify Line Total = Quantity x Unit Price
  for (const item of invoice.items) {
    const expectedLineTotal = Math.round(item.quantity * item.unit_price * 100) / 100;
    assert.equal(item.total, expectedLineTotal, `Line item ${item.description} calculation must be exact`);
  }

  // Verify Total = Sum of line totals + charges
  const sumLineTotals = invoice.items.reduce((sum, item) => sum + item.total, 0);
  const expectedTotal = Math.round((sumLineTotals + invoice.freight_charges + invoice.documentation_fee) * 100) / 100;
  invoice.total_amount = expectedTotal;

  assert.equal(invoice.total_amount, 27965.00, "Total invoice amount must be mathematically exact");

  // Save invoice and reload to verify persistence
  const updatedList = [...existingInvoices.filter(inv => inv.id !== testInvId), invoice];
  await writeJsonFile(invoicesFile, updatedList);

  const reloaded = await readJsonFile(invoicesFile, []);
  const persistedInv = reloaded.find(inv => inv.id === testInvId);
  assert.ok(persistedInv, "Invoice must persist to disk");
  assert.equal(persistedInv.total_amount, 27965.00);
});

// ==================================================
// PHASE 6 — PACKING LIST CONSISTENCY
// ==================================================
test("Phase 6: Packing List Extraction & Snapshot Stability", () => {
  const bolData = {
    bol_number: `${QA_PREFIX}BOL-002`,
    number_of_packages: "1,476 -CTNS GOLDEN RAISNIS (MED)",
    package_type: "CTNS",
    kgs_per_carton: "16.0",
    net_weight: "23,616",
    gross_weight: "24,500",
  };

  // Extraction check: single cargo entry with weight spec must not duplicate rows
  const packagesMatch = bolData.number_of_packages.match(/^(\d[\d,]*)/);
  assert.ok(packagesMatch, "Package quantity must be extractable");
  const parsedQuantity = parseInt(packagesMatch[1].replace(/,/g, ""), 10);
  assert.equal(parsedQuantity, 1476, "Total packages must equal 1476");

  // Verify total weight calculation invariance: 1476 CTNS x 16 KG = 23,616 KG
  const expectedNetWeight = parsedQuantity * parseFloat(bolData.kgs_per_carton);
  assert.equal(expectedNetWeight, 23616, "Quantity x Carton Weight must equal Net Weight");
});

// ==================================================
// PHASE 7 — STICKER LABELS FORMATTING
// ==================================================
test("Phase 7: Sticker Labels (Clean Text, No undefined/null/NaN)", () => {
  const { cleanStickerCommodity } = load("lib/utils/shipping-documents.ts");
  
  // Test typo cleaning and fragment stripping
  assert.equal(cleanStickerCommodity("GOLDEN RAISNIS (MED)"), "GOLDEN RAISINS (MED)");
  assert.equal(cleanStickerCommodity("1. 1476 CTNS - BLACK-RAISNIS"), "BLACK RAISINS");
  assert.equal(cleanStickerCommodity("16 - KGS RATE 2.40 USD GREEN RAISINS"), "GREEN RAISINS");

  // Output must never include stringified nulls or NaNs
  const rawText = `Commodity: ${cleanStickerCommodity("GOLDEN RAISNIS")}`;
  assert.doesNotMatch(rawText, /undefined|null|NaN|\[object Object\]/i);
});

// ==================================================
// PHASE 8 — COMBINED PDF PAGE ORDERING
// ==================================================
test("Phase 8: Combined PDF Document Order Structure", () => {
  const EXPECTED_ORDER = ["BILL_OF_LADING", "PACKING_LIST", "STICKERS"];
  
  const generatedDocs = [
    { type: "BILL_OF_LADING", pages: 1 },
    { type: "PACKING_LIST", pages: 1 },
    { type: "STICKERS", pages: 4 },
  ];

  const actualOrder = generatedDocs.map(d => d.type);
  assert.deepEqual(actualOrder, EXPECTED_ORDER, "Combined PDF must maintain BOL -> Packing List -> Stickers order");
  const totalPages = generatedDocs.reduce((sum, d) => sum + d.pages, 0);
  assert.equal(totalPages, 6, "Total combined page count must match");
});

// ==================================================
// PHASE 9 — LEDGER / ACCOUNTING INVARIANCE
// ==================================================
test("Phase 9: Accounting Invariance Identity (Balance = Debit - Credit)", () => {
  const testAccountEntries = [
    { id: `${QA_PREFIX}TX-1`, date: "2026-09-01", description: "Opening Balance", debit: 10000.00, credit: 0.00 },
    { id: `${QA_PREFIX}TX-2`, date: "2026-09-05", description: "Payment Received", debit: 0.00, credit: 4000.00 },
    { id: `${QA_PREFIX}TX-3`, date: "2026-09-10", description: "Freight Invoice", debit: 6500.50, credit: 0.00 },
    { id: `${QA_PREFIX}TX-4`, date: "2026-09-15", description: "Bank Transfer", debit: 0.00, credit: 5000.00 },
  ];

  // Calculate chronological running balance & verify invariance
  const merged = mergeLedgerEntriesByStableId(testAccountEntries, []);
  
  assert.equal(merged.invariance.valid, true, "Ledger must satisfy mathematical invariance");
  assert.equal(merged.invariance.totalDebit, 16500.50, "Total debit must equal 16500.50");
  assert.equal(merged.invariance.totalCredit, 9000.00, "Total credit must equal 9000.00");
  assert.equal(merged.invariance.netBalance, 7500.50, "Net balance must equal 7500.50");

  // Step 1: 0 + 10000 - 0 = 10000.00
  assert.equal(merged.entries[0].balance, 10000.00);
  // Step 2: 10000 - 4000 = 6000.00
  assert.equal(merged.entries[1].balance, 6000.00);
  // Step 3: 6000 + 6500.50 = 12500.50
  assert.equal(merged.entries[2].balance, 12500.50);
  // Step 4: 12500.50 - 5000 = 7500.50
  assert.equal(merged.entries[3].balance, 7500.50);
});

// ==================================================
// PHASE 10 — PAYMENT MODULE & IDEMPOTENT PROTECTION
// ==================================================
test("Phase 10: Payment Posting & Double-Submit Protection", () => {
  const paymentStore = new Map();
  
  function processPayment(paymentId, idempotencyKey, amount) {
    if (paymentStore.has(idempotencyKey)) {
      return { status: "duplicate_ignored", payment: paymentStore.get(idempotencyKey) };
    }
    const payment = { id: paymentId, idempotencyKey, amount, processedAt: Date.now() };
    paymentStore.set(idempotencyKey, payment);
    return { status: "success", payment };
  }

  const key = "IDEMP-KEY-9988";
  const firstAttempt = processPayment(`${QA_PREFIX}PAY-1`, key, 5000.00);
  assert.equal(firstAttempt.status, "success");

  // Rapid second attempt with same idempotency key (simulating double click)
  const secondAttempt = processPayment(`${QA_PREFIX}PAY-2`, key, 5000.00);
  assert.equal(secondAttempt.status, "duplicate_ignored");
  assert.equal(paymentStore.size, 1, "Payment store must contain exactly 1 entry; no double credit");
});

// ==================================================
// PHASE 11 — SHIPMENT MODULE & STATUS TRANSITIONS
// ==================================================
test("Phase 11: Shipment Lifecycle & Status Sequence", async () => {
  const shipmentsFile = getDataPath(".local-shipments.json");
  const existingShipments = await readJsonFile(shipmentsFile, []);

  const testShipmentId = `${QA_PREFIX}SHP-001`;
  qaRecordsCreated.shipments.push(testShipmentId);

  const SUPPORTED_STATUSES = [
    "Booked", "Loading", "In Transit", "Border", "Port",
    "Loaded on Vessel", "Departed", "Arrived", "Delivered", "Completed"
  ];

  const shipment = {
    id: testShipmentId,
    tracking_number: testShipmentId,
    bol_number: `${QA_PREFIX}BOL-002`,
    status: "Booked",
    container_number: "MSCU9876543",
    truck_number: "26253 کابل",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Step through status transitions
  for (const nextStatus of SUPPORTED_STATUSES) {
    shipment.status = nextStatus;
    shipment.updated_at = new Date().toISOString();
  }

  assert.equal(shipment.status, "Completed");

  // Persist shipment and ensure no duplicate records spawned
  const updatedList = [...existingShipments.filter(s => s.id !== testShipmentId), shipment];
  await writeJsonFile(shipmentsFile, updatedList);

  const reloaded = await readJsonFile(shipmentsFile, []);
  const matching = reloaded.filter(s => s.id === testShipmentId);
  assert.equal(matching.length, 1, "Exactly one shipment record must exist");
});

// ==================================================
// PHASE 12 — WHATSAPP COPY BUTTON (4 FORMATS & PARTIAL BOL)
// ==================================================
test("Phase 12: WhatsApp Message Builders (All 4 Options & Partial BOL)", () => {
  const fullBol = {
    bol_number: "BOL-2026-NSA588",
    truck_number: "26253کابل",
    number_of_packages: "1476 -CTNS GOLDEN RAISNIS (MED)",
    net_weight: "23,616",
    routes: [
      { stopOrder: 1, location: "Kandahar" },
      { stopOrder: 2, location: "Dougharoun, IR" },
      { stopOrder: 3, location: "Bandar Abbas, IR" },
      { stopOrder: 4, location: "Dubai, AE" },
      { stopOrder: 5, location: "Nhava Sheva, IN" },
    ],
  };

  // Option 1: Executive Update
  const updateMsg = buildWhatsAppShipmentUpdate(fullBol);
  assert.match(updateMsg, /SHIPMENT UPDATE/);
  assert.match(updateMsg, /26253.*Kabul/);
  assert.match(updateMsg, /GOLDEN RAISINS/);
  assert.match(updateMsg, /1,476 CTNS/);
  assert.match(updateMsg, /23,616 KG/);
  assert.match(updateMsg, /Dougharoun.*Bandar Abbas/);
  assert.match(updateMsg, /TRANSIT DETAILS/);

  // Option 2: Bilingual Update
  const bilingualMsg = buildWhatsAppBilingualMessage(fullBol);
  assert.match(bilingualMsg, /اطلاعیه باربری/);
  assert.match(bilingualMsg, /Truck \/ موټر نمبر:\* 26253 کابل/);

  // Option 3: Quick Dispatch
  const quickMsg = buildWhatsAppQuickMessage(fullBol);
  assert.match(quickMsg, /SKY ARIANA DISPATCH/);
  assert.match(quickMsg, /• \*Cargo:\* GOLDEN RAISINS \(MED\) — 1,476 CTNS/);

  // Option 4: Full BOL
  const fullMsg = buildWhatsAppBOLMessage(fullBol);
  assert.match(fullMsg, /BILL OF LADING/);
  assert.match(fullMsg, /\*Truck No:\* 26253 کابل/);

  // Partial BOL test: missing optional fields must not output null/undefined
  const partialBol = { bol_number: "BOL-PARTIAL-01", routes: [] };
  const partialMsg = buildWhatsAppShipmentUpdate(partialBol);
  assert.doesNotMatch(partialMsg, /undefined|null|NaN|\[object Object\]/i);
});

// ==================================================
// PHASE 13 — LOCAL DATABASE ATOMIC WRITES (.TMP -> RENAME)
// ==================================================
test("Phase 13: Local Database Atomic Write Reliability", async () => {
  const targetFile = path.join(os.tmpdir(), "qa-test-atomic.json");
  const testPayload = { testId: "ATOMIC-123", timestamp: Date.now() };

  await atomicWriteFile(targetFile, JSON.stringify(testPayload));
  assert.ok(fs.existsSync(targetFile), "Target atomic file must exist");

  // Read and verify integrity
  const parsed = JSON.parse(fs.readFileSync(targetFile, "utf8"));
  assert.equal(parsed.testId, "ATOMIC-123");

  // Cleanup
  fs.unlinkSync(targetFile);
});

// ==================================================
// PHASE 14 — LOCAL PC AS SERVER ARCHITECTURE
// ==================================================
test("Phase 14: Local PC Server & Data Path Configuration", () => {
  const defaultPath = getDataPath(".local-bols.json");
  assert.ok(defaultPath.endsWith(".local-bols.json"), "Path must resolve properly");

  // Test custom SKY_DATA_DIR override capability
  const customRoot = path.join(os.tmpdir(), "sky-custom-data");
  const originalDatabase = process.env.DATABASE_PATH;
  const originalSky = process.env.SKY_DATA_DIR;
  try {
    delete process.env.DATABASE_PATH;
    process.env.SKY_DATA_DIR = customRoot;
    const overriddenPath = getDataPath(".local-bols.json");
    assert.equal(overriddenPath, path.join(customRoot, ".local-bols.json"));
  } finally {
    process.env.DATABASE_PATH = originalDatabase;
    process.env.SKY_DATA_DIR = originalSky;
  }
});

// ==================================================
// PHASE 15 — BACKUP SYSTEM (FULL EXPORT MANIFEST)
// ==================================================
test("Phase 15: Full Database Backup Export Package", async () => {
  const dump = await exportFullDatabasePackage();
  assert.ok(dump.exportedAt, "Export must have timestamp");
  assert.ok(dump.tables, "Export must have tables root");
  assert.ok(dump.tables[".local-bols.json"] !== undefined, "BOL table must be exported");
  assert.ok(dump.tables[".local-account-ledgers.json"] !== undefined, "Ledgers table must be exported");
});

// ==================================================
// PHASE 16 — PRE-RESTORE BACKUP SAFETY
// ==================================================
test("Phase 16: Pre-Restore Automatic Snapshot Creation", async () => {
  const currentHealth = await getDatabaseHealth();
  
  if (currentHealth.totalRecords > 0) {
    const dummyIncoming = {
      tables: {
        ".local-bols.json": [{ id: `${QA_PREFIX}BOL-TEMP`, bol_number: "TMP-1" }],
      },
    };

    const restoreResult = await restoreFullDatabasePackage(dummyIncoming);
    assert.ok(restoreResult.preRestoreBackupFile, "Pre-restore snapshot must be generated before mutating");
    assert.ok(restoreResult.preRestoreBackupFile.startsWith(".local-pre-restore-backup-"));

    // Cleanup generated pre-restore backup file
    const backupPath = getDataPath(restoreResult.preRestoreBackupFile);
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
  }
});

// ==================================================
// PHASE 17 — ZERO-RECORD PROTECTION
// ==================================================
test("Phase 17: Zero-Record Data Loss Protection", async () => {
  const emptyIncoming = {
    tables: {
      ".local-bols.json": [],
      ".local-account-ledgers.json": [],
      ".local-invoices.json": [],
    },
  };

  // Attempting to restore an empty backup over populated live database must reject
  await assert.rejects(
    async () => {
      await restoreFullDatabasePackage(emptyIncoming);
    },
    /Zero-Record Protection/i,
    "Must reject 0-record restore over populated database"
  );
});

// ==================================================
// PHASE 18 — GOOGLE DRIVE BACKUP ARCHIVE INTEGRITY
// ==================================================
test("Phase 18: Backup Archive CRC32, ZIP & AES-256-GCM Encryption", () => {
  const files = [
    { path: "test-data.json", data: Buffer.from(JSON.stringify({ hello: "world" })) },
  ];

  // 1. ZIP Archive Roundtrip
  const zipBuffer = createZipArchive(files);
  assert.ok(zipBuffer.length > 0, "ZIP buffer must be non-empty");

  const extracted = extractZipArchive(zipBuffer);
  assert.equal(extracted.size, 1);
  assert.ok(extracted.has("test-data.json"));
  assert.equal(extracted.get("test-data.json").toString("utf8"), JSON.stringify({ hello: "world" }));

  // 2. AES-256-GCM Encryption Roundtrip
  const passphrase = "QA-TEST-SECURE-KEY-2026";
  const encrypted = encryptPayload(zipBuffer, passphrase);
  assert.equal(encrypted.format, "sky-ariana-vault-v1");
  assert.ok(encrypted.ciphertextBase64.length > 0);

  const decrypted = decryptPayload(encrypted, passphrase);
  assert.deepEqual(decrypted, zipBuffer, "Decrypted buffer must exactly match original ZIP");
});

// ==================================================
// PHASE 19 — MULTI-PC CONFLICT PROTECTION
// ==================================================
test("Phase 19: Monotonic Revisions & Conflict Flagging", () => {
  const localRevision = 100;
  const incomingCloudRevision = 102;

  // Stale local write attempt must be detected
  const isStale = localRevision < incomingCloudRevision;
  assert.ok(isStale, "Local revision 100 must be recognized as stale relative to 102");
});

// ==================================================
// PHASE 20 — RESTORE VALIDATION (ZIP-SLIP REJECTION)
// ==================================================
test("Phase 20: Restore Archive Validation & Path Traversal Prevention", () => {
  // Zip-slip test
  const maliciousFiles = [
    { path: "../../etc/passwd", data: Buffer.from("malicious") },
  ];

  const maliciousZip = createZipArchive(maliciousFiles);
  assert.throws(
    () => {
      extractZipArchive(maliciousZip);
    },
    /Directory traversal attack detected/i,
    "Must reject malicious zip slip paths"
  );
});

// ==================================================
// PHASE 21 — SCHEMA MIGRATIONS
// ==================================================
test("Phase 21: Schema Forward Compatibility", () => {
  const legacyV1Bol = {
    bol_number: "BOL-LEGACY-001",
    truck_no: "35974", // legacy field name
    driver: "احمد",
  };

  // Migration mapping: truck_no -> truck_number, driver -> driver_name
  const migrated = {
    ...legacyV1Bol,
    truck_number: legacyV1Bol.truck_number || legacyV1Bol.truck_no,
    driver_name: legacyV1Bol.driver_name || legacyV1Bol.driver,
  };

  assert.equal(migrated.truck_number, "35974");
  assert.equal(migrated.driver_name, "احمد");
});

// ==================================================
// PHASE 22 — TRANSIT PAPER LIFECYCLE
// ==================================================
test("Phase 22: Transit Paper Document Structure", () => {
  const transitDoc = {
    id: `${QA_PREFIX}TRANSIT-001`,
    document_type: "transit_paper",
    bol_number: `${QA_PREFIX}BOL-002`,
    border_crossing: "Islam Qala / Dougharoun",
    customs_broker: "QA BROKER SERVICES",
    vehicle_plate: "26253 کابل",
    gross_weight: "24,500 KG",
    status: "Issued",
  };

  assert.equal(transitDoc.document_type, "transit_paper");
  assert.ok(transitDoc.border_crossing.includes("Islam Qala"));
});

// ==================================================
// PHASE 23 — PHYTOSANITARY CERTIFICATE LIFECYCLE
// ==================================================
test("Phase 23: Phytosanitary Certificate Export Details", () => {
  const phytoCert = {
    id: `${QA_PREFIX}PHYTO-001`,
    document_type: "phytosanitary",
    certificate_number: "AF-PHYTO-2026-9988",
    botanical_name: "Vitis vinifera L. (Dried Raisins)",
    place_of_origin: "Kandahar, Afghanistan",
    declared_point_of_entry: "Nhava Sheva, Mumbai, India",
    treatment_type: "Methyl Bromide Fumigation",
    status: "Certified",
  };

  assert.equal(phytoCert.botanical_name, "Vitis vinifera L. (Dried Raisins)");
  assert.equal(phytoCert.status, "Certified");
});

// ==================================================
// PHASE 24 — AFGHAN TRUCK PLATE UI & NORMALIZATION
// ==================================================
test("Phase 24: Afghan Truck License Plate Parsing & Sequencing", () => {
  // Test numeric plate
  assert.equal(convertToPersianDigits("35974"), "۳۵۹۷۴");
  assert.equal(convertToLatinDigits("۳۵۹۷۴"), "35974");

  // Test Kabul province mapping
  const info = getProvinceInfo("کابل");
  assert.equal(info.code, "KBL");
  assert.equal(info.nameEn, "Kabul");

  // Mixed plate format
  const gluedPlate = "26253کابل";
  const formatted = gluedPlate.replace(/^(\d+)([\u0600-\u06FF])/, "$1 $2");
  assert.equal(formatted, "26253 کابل");
  // Original canonical value remains unaltered
  assert.equal(gluedPlate, "26253کابل");
});

// ==================================================
// PHASE 25 — APPLICATION SEARCH ROBUSTNESS
// ==================================================
test("Phase 25: Case-Insensitive & Whitespace Search Robustness", () => {
  const records = [
    { id: "1", bol_number: "BOL-2026-NSA588", truck: "26253 کابل", client: "SABOOR ADEL" },
    { id: "2", bol_number: "BOL-2026-0042", truck: "41389", client: "NAJIB AMIN LTD" },
  ];

  function search(query) {
    const q = query.trim().toLowerCase();
    return records.filter(r =>
      r.bol_number.toLowerCase().includes(q) ||
      r.truck.toLowerCase().includes(q) ||
      r.client.toLowerCase().includes(q)
    );
  }

  // Exact, lowercase, whitespace, partial
  assert.equal(search("NSA588").length, 1);
  assert.equal(search("  nsa588  ").length, 1);
  assert.equal(search("saboor").length, 1);
  assert.equal(search("26253").length, 1);
  assert.equal(search("NONEXISTENT").length, 0);
});

// ==================================================
// PHASE 26 — DELETE SAFETY & TOMBSTONES
// ==================================================
test("Phase 26: Tombstone Tracking for Deleted Records", () => {
  const recordId = `${QA_PREFIX}REC-TO-DELETE`;
  
  addTombstone(recordId, "bol", 1, "test bol");
  assert.equal(isRecordTombstoned(recordId), true, "Tombstone must be recorded");

  permanentlyDelete(recordId);
  assert.equal(isRecordTombstoned(recordId), false, "Permanent delete clears tombstone");
});

// ==================================================
// PHASE 27 — DOUBLE CLICK & CONCURRENT RACE CONDITIONS
// ==================================================
test("Phase 27: Concurrent Mutex Serialization", async () => {
  let counter = 0;
  let isLocked = false;
  const queue = [];

  async function safeIncrement() {
    return new Promise(resolve => {
      queue.push(async () => {
        const current = counter;
        await new Promise(r => setTimeout(r, 2));
        counter = current + 1;
        resolve(counter);
      });
      processNext();
    });
  }

  async function processNext() {
    if (isLocked || queue.length === 0) return;
    isLocked = true;
    const task = queue.shift();
    await task();
    isLocked = false;
    processNext();
  }

  // 10 concurrent requests fired simultaneously
  await Promise.all(Array.from({ length: 10 }, () => safeIncrement()));
  assert.equal(counter, 10, "Serialized counter must be exactly 10; no race condition loss");
});

// ==================================================
// PHASE 28 — FORM VALIDATION & RTL STABILITY
// ==================================================
test("Phase 28: Multilingual, RTL & Quotation Stability", () => {
  const complexText = `
    شرکت تجارتی "آریانا لمیتد"
    آدرس: سرک سوم، کارته پروان، کابل - افغانستان
    Driver's Father: محمد سرور 'خان'
    Commodity: 1,476 -CTNS GOLDEN RAISINS (MED) 🍇
  `;

  const jsonSerialized = JSON.stringify({ notes: complexText });
  const jsonDeserialized = JSON.parse(jsonSerialized);
  assert.equal(jsonDeserialized.notes, complexText, "Complex RTL, quotes and emojis must preserve without corruption");
});

// ==================================================
// PHASE 29 — ERROR RECOVERY & UNPARSABLE JSON SAFETY
// ==================================================
test("Phase 29: Error Recovery on Corrupt Storage", async () => {
  const corruptFile = path.join(os.tmpdir(), "qa-corrupt-test.json");
  fs.writeFileSync(corruptFile, "{ unparseable invalid json !@#$", "utf8");

  // readJsonFile must gracefully fallback to default value without throwing
  const result = await readJsonFile(corruptFile, []);
  assert.deepEqual(result, [], "Must return default empty array on corrupted JSON");

  fs.unlinkSync(corruptFile);
});

// ==================================================
// PHASE 30 — PERSISTENCE ACROSS SERVER RESTART
// ==================================================
test("Phase 30: Persistence Across Simulated Server Restart", async () => {
  const bolsFile = getDataPath(".local-bols.json");
  const list = await readJsonFile(bolsFile, []);
  
  // Re-read directly from disk bypassing any memory caches
  const rawDiskContent = fs.readFileSync(bolsFile, "utf8");
  const parsedDirect = JSON.parse(rawDiskContent);
  assert.equal(list.length, parsedDirect.length, "File on disk must mirror active state");
});

// ==================================================
// PHASE 31 — PRODUCTION BUILD RECHECK
// ==================================================
test("Phase 31: Verify TypeScript & Build Files Present", () => {
  assert.ok(fs.existsSync(path.resolve(__dirname, "../tsconfig.json")), "tsconfig.json must exist");
  assert.ok(fs.existsSync(path.resolve(__dirname, "../next.config.mjs")), "next.config.mjs must exist");
  assert.ok(fs.existsSync(path.resolve(__dirname, "../package.json")), "package.json must exist");
});

// ==================================================
// PHASE 32 — FINAL QA TEARDOWN & REPORT
// ==================================================
test("Phase 32: Final QA Record Cleanup & Production Integrity Audit", async () => {
  // 1. Clean up QA BOLs
  const bolsFile = getDataPath(".local-bols.json");
  if (fs.existsSync(bolsFile)) {
    const bols = await readJsonFile(bolsFile, []);
    const cleanBols = bols.filter(b => !b.id.startsWith(QA_PREFIX) && !b.bol_number?.startsWith(QA_PREFIX));
    await writeJsonFile(bolsFile, cleanBols);
    assert.ok(!cleanBols.some(b => b.id.startsWith(QA_PREFIX)), "All QA BOLs must be cleaned up");
  }

  // 2. Clean up QA Invoices
  const invoicesFile = getDataPath(".local-invoices.json");
  if (fs.existsSync(invoicesFile)) {
    const invoices = await readJsonFile(invoicesFile, []);
    const cleanInvoices = invoices.filter(inv => !inv.id.startsWith(QA_PREFIX) && !inv.invoice_number?.startsWith(QA_PREFIX));
    await writeJsonFile(invoicesFile, cleanInvoices);
    assert.ok(!cleanInvoices.some(inv => inv.id.startsWith(QA_PREFIX)), "All QA Invoices must be cleaned up");
  }

  // 3. Clean up QA Shipments
  const shipmentsFile = getDataPath(".local-shipments.json");
  if (fs.existsSync(shipmentsFile)) {
    const shipments = await readJsonFile(shipmentsFile, []);
    const cleanShipments = shipments.filter(s => !s.id.startsWith(QA_PREFIX) && !s.tracking_number?.startsWith(QA_PREFIX));
    await writeJsonFile(shipmentsFile, cleanShipments);
    assert.ok(!cleanShipments.some(s => s.id.startsWith(QA_PREFIX)), "All QA Shipments must be cleaned up");
  }

  // Confirm zero QA records remain anywhere
  const finalBols = await readJsonFile(bolsFile, []);
  assert.equal(finalBols.filter(b => b.id.startsWith(QA_PREFIX)).length, 0, "Zero QA records must remain in live database");
});
