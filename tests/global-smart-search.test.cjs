const assert = require("assert")
const loadTypescript = require("./load-typescript.cjs")

// Load Search Modules
const normalizer = loadTypescript("lib/search/search-normalizer.ts")
const ranking = loadTypescript("lib/search/search-ranking.ts")
const permissions = loadTypescript("lib/search/search-permissions.ts")
const connectedBuilder = loadTypescript("lib/search/connected-record-builder.ts")
const searchService = loadTypescript("lib/search/global-search-service.ts")

console.log("==========================================================")
console.log("🔍 RUNNING GLOBAL SMART SEARCH & COMMAND CENTER TEST SUITE")
console.log("==========================================================")

let passed = 0
let failed = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`  ✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`)
    console.error(`     Error: ${err.message}`)
    if (err.stack) console.error(err.stack)
    failed++
  }
}

// -------------------------------------------------------------
// Common Mock Data Environment
// -------------------------------------------------------------
const mockBols = [
  {
    id: "bol-101",
    bol_number: "SA-BOL-2026-088",
    containers: "TCLU1234567, ACLU998877",
    container_numbers: "TCLU1234567, ACLU998877",
    shipper_name: "Kandahar Dried Fruits Ltd",
    consignee_name: "Al-Madina General Trading LLC",
    cargo_description: "Black Raisins (Kishmish کشمش)",
    truck_number: "81745",
    driver_name: "Mohammad Gul",
    driver_phone: "0700308086",
    customs_inbound: "Dogharoon",
    customs_outbound: "Islam Qala",
    status: "in-transit",
    total_charges: 3450,
    currency: "USD",
  },
]

const mockShipments = [
  {
    id: "ship-202",
    shipmentNumber: "SHP-2026-088",
    bolNumber: "SA-BOL-2026-088",
    shipper: "Kandahar Dried Fruits Ltd",
    consignee: "Al-Madina General Trading LLC",
    containers: [{ containerNumber: "TCLU1234567", containerType: "40HC" }],
    vessel: { vesselName: "DP WORLD CHENNAI", voyageNumber: "012E", shippingLine: "Maersk" },
    route: { originPort: "Kandahar", destinationPort: "Jebel Ali / Dubai", currentStation: "Islam Qala" },
    origin: "Kandahar",
    destination: "Jebel Ali / Dubai",
    currentLocation: "Islam Qala Border",
    status: "in_transit",
  },
]

const mockInvoices = [
  {
    id: "inv-303",
    invoiceNumber: "INV-2026-00125",
    bolNumber: "SA-BOL-2026-088",
    recipientName: "Al-Madina General Trading LLC",
    totalAmount: 3450,
    status: "unpaid",
    currency: "USD",
    profit: 850,
    cost: 2600,
  },
]

const mockLedgers = [
  {
    id: "led-404",
    accountName: "Al-Madina General Trading LLC",
    bolNumber: "SA-BOL-2026-088",
    debit: 3450,
    credit: 0,
    description: "Freight Charges SA-BOL-2026-088",
    date: "2026-03-15",
  },
]

const mockPayments = [
  {
    id: "pay-505",
    paymentNumber: "RCT-99120",
    reference: "RCT-99120",
    invoiceNumber: "INV-2026-00125",
    bolNumber: "SA-BOL-2026-088",
    amount: 1500,
    paymentMethod: "Bank Wire",
    status: "completed",
    customerName: "Al-Madina General Trading LLC",
  },
]

const mockDocs = [
  {
    id: "doc-606",
    documentType: "commercial_invoice",
    documentNumber: "CI-2026-088",
    bolNumber: "SA-BOL-2026-088",
    title: "Commercial Invoice - Raisins",
  },
]

const mockSuppliers = [
  {
    id: "sup-707",
    name: "Afghan Trucking Association",
    serviceType: "Trucking",
    phone: "0799123456",
  },
]

const mockDatasets = {
  bols: mockBols,
  shipments: mockShipments,
  invoices: mockInvoices,
  ledgerDb: {
    accounts: [
      { id: "acc-1", name: "Al-Madina General Trading LLC" },
      { id: "acc-2", name: "Kandahar Dried Fruits Ltd" },
    ],
    ledgerEntries: {
      "Al-Madina General Trading LLC": mockLedgers,
    },
  },
  payments: mockPayments,
  documents: mockDocs,
  suppliers: mockSuppliers,
}

// -------------------------------------------------------------
// Test 1: Phone Normalization (Afghan formats)
// -------------------------------------------------------------
runTest("Scenario 1: Afghan Phone Normalization (+93 vs 07xx)", () => {
  const norm1 = normalizer.normalizePhone("+93 700 308 086")
  const norm2 = normalizer.normalizePhone("0700308086")
  const norm3 = normalizer.normalizePhone("0093-700-308086")

  assert.strictEqual(norm1.normalized, "+93700308086")
  assert.strictEqual(norm2.normalized, "+93700308086")
  assert.strictEqual(norm3.normalized, "+93700308086")
  assert.strictEqual(norm1.national, "0700308086")
  assert.strictEqual(norm2.national, "0700308086")
  assert.strictEqual(normalizer.isPhoneNumber("0700308086"), true)
  assert.strictEqual(normalizer.isPhoneNumber("+93700308086"), true)
})

// -------------------------------------------------------------
// Test 2: Unicode Persian/Pashto Normalization
// -------------------------------------------------------------
runTest("Scenario 2: Unicode Persian/Pashto (ی/ي, ک/ك, ZWNJ)", () => {
  // Arabic Yeh vs Farsi Yeh
  const arabicYeh = "حاجي يونس"
  const farsiYeh = "حاجی یونس"
  assert.strictEqual(
    normalizer.normalizePersianPashto(arabicYeh),
    normalizer.normalizePersianPashto(farsiYeh)
  )

  // Arabic Kaf vs Persian Kaf
  const arabicKaf = "كشمش قندهار"
  const farsiKaf = "کشمش قندهار"
  assert.strictEqual(
    normalizer.normalizePersianPashto(arabicKaf),
    normalizer.normalizePersianPashto(farsiKaf)
  )

  // Zero-width non-joiner removal
  const withZwnj = "بندر\u200cعباس"
  const withoutZwnj = "بندر عباس"
  assert.strictEqual(
    normalizer.normalizePersianPashto(withZwnj),
    normalizer.normalizePersianPashto(withoutZwnj)
  )
})

// -------------------------------------------------------------
// Test 3: Identifier Pattern Recognizers
// -------------------------------------------------------------
runTest("Scenario 3: Standard Pattern Detectors (Container, BOL, Invoice)", () => {
  assert.strictEqual(normalizer.isContainerNumber("TCLU1234567"), true)
  assert.strictEqual(normalizer.isContainerNumber("MSKU-908123-4"), true)
  assert.strictEqual(normalizer.isContainerNumber("NotAContainer"), false)

  assert.strictEqual(normalizer.isBolNumber("BOL-2026-0042"), true)
  assert.strictEqual(normalizer.isBolNumber("SA-BOL-8821"), true)

  assert.strictEqual(normalizer.isInvoiceNumber("INV-2026-00125"), true)

  assert.strictEqual(normalizer.isDocumentNumber("CI-2026-001"), true)
  assert.strictEqual(normalizer.isDocumentNumber("PL-2026-002"), true)
  assert.strictEqual(normalizer.isDocumentNumber("PHY-DRAFT-99"), true)
})

// -------------------------------------------------------------
// Test 4: Ranking & Exact Match Priority
// -------------------------------------------------------------
runTest("Scenario 4: Exact Match Priority over Fuzzy/Contains", () => {
  const query = "TCLU1234567"

  const exactRank = ranking.evaluateFieldMatch(query, "TCLU1234567", "Container ID", true)
  const partialRank = ranking.evaluateFieldMatch(query, "Shipment containing TCLU1234567", "Notes", false)
  const fuzzyRank = ranking.evaluateFieldMatch("TCLU1234567", "TCLU1234568", "Container ID", false)

  assert.ok(exactRank.score > partialRank.score, `Exact (${exactRank.score}) must beat partial (${partialRank.score})`)
  assert.ok(partialRank.score > (fuzzyRank?.score || 0), `Partial (${partialRank.score}) must beat fuzzy (${fuzzyRank?.score || 0})`)
  assert.ok(exactRank.score >= 1000, "Exact match score should be >= 1000")
})

// -------------------------------------------------------------
// Test 5: Connected Record Builder (Container -> BOL, Invoice, etc.)
// -------------------------------------------------------------
runTest("Scenario 5: Graph Resolution for Container TCLU1234567", () => {
  const connected = connectedBuilder.resolveContainerConnectedRecords(
    "TCLU1234567",
    mockDatasets
  )

  assert.strictEqual(connected.bolNumber, "SA-BOL-2026-088", "Should find connected BOL")
  assert.strictEqual(connected.bolCount, 1, "Should count 1 BOL")
  assert.strictEqual(connected.shipmentCount, 1, "Should count 1 Shipment")
  assert.strictEqual(connected.invoiceCount, 1, "Should count 1 Invoice")
  assert.strictEqual(connected.paymentCount, 1, "Should count 1 Payment")
  assert.strictEqual(connected.documentCount, 1, "Should count 1 Document")
  assert.strictEqual(connected.shipperName, "Kandahar Dried Fruits Ltd")
  assert.strictEqual(connected.consigneeName, "Al-Madina General Trading LLC")
  assert.strictEqual(connected.vesselName, "DP WORLD CHENNAI")
  assert.strictEqual(connected.truckNumber, "81745")
  assert.strictEqual(connected.driverName, "Mohammad Gul")
  assert.ok(connected.connectedEntities.length > 0, "Should generate connected entity refs")
})

// -------------------------------------------------------------
// Test 6: Global Search Service - Multi-Module Resolution
// -------------------------------------------------------------
runTest("Scenario 6: Global Search for 'TCLU1234567' returns connected entity graph", () => {
  const result = searchService.executeGlobalSearch("TCLU1234567", mockDatasets, {
    id: "admin-1",
    role: "admin",
    name: "Admin",
  })

  assert.ok(result.results.length > 0, "Should find results")
  assert.ok(result.topMatch, "Should identify topMatch")
  assert.strictEqual(result.topMatch.type, "container")
  assert.strictEqual(result.topMatch.id, "TCLU1234567")
  assert.ok(result.topMatch.connectedSummary, "Top match should have connectedSummary")
  assert.strictEqual(result.topMatch.connectedSummary.bolNumber, "SA-BOL-2026-088")
  assert.ok(result.topMatch.quickActions.length > 0, "Should provide quick actions")
})

// -------------------------------------------------------------
// Test 7: Driver & Truck Lookup
// -------------------------------------------------------------
runTest("Scenario 7: Lookup Driver Phone '0700308086' and Truck '81745'", () => {
  const adminUser = { id: "u-1", role: "admin", name: "Admin" }

  // Phone lookup
  const phoneRes = searchService.executeGlobalSearch("+93 700 308 086", mockDatasets, adminUser)
  assert.ok(phoneRes.results.length > 0, "Should match phone number with +93")
  const driverMatch = phoneRes.results.find((r) => r.type === "driver" || r.subtitle.includes("0700308086"))
  assert.ok(driverMatch, "Should find driver record by normalized phone")

  // Truck lookup
  const truckRes = searchService.executeGlobalSearch("81745", mockDatasets, adminUser)
  assert.ok(truckRes.results.length > 0, "Should match truck 81745")
  const truckMatch = truckRes.results.find((r) => r.type === "truck" || r.title.includes("81745"))
  assert.ok(truckMatch, "Should find truck record by number")
})

// -------------------------------------------------------------
// Test 8: Vessel & Voyage Lookup
// -------------------------------------------------------------
runTest("Scenario 8: Lookup Vessel 'DP WORLD CHENNAI' and Voyage '012'", () => {
  const adminUser = { id: "u-1", role: "admin", name: "Admin" }
  const res = searchService.executeGlobalSearch("CHENNAI", mockDatasets, adminUser)
  assert.ok(res.results.length > 0, "Should find records matching CHENNAI")
  const vesselItem = res.results.find((r) => r.type === "vessel" || r.title.includes("CHENNAI"))
  assert.ok(vesselItem, "Should find vessel item")
})

// -------------------------------------------------------------
// Test 9: Invoice & Payment Lookup
// -------------------------------------------------------------
runTest("Scenario 9: Invoice Lookup 'INV-2026-00125'", () => {
  const adminUser = { id: "u-1", role: "admin", name: "Admin" }
  const invRes = searchService.executeGlobalSearch("INV-2026-00125", mockDatasets, adminUser)
  assert.ok(invRes.results.length > 0, "Should find invoice")
  assert.strictEqual(invRes.topMatch.type, "invoice")
  assert.strictEqual(invRes.topMatch.id, "INV-2026-00125")
})

// -------------------------------------------------------------
// Test 10: Trade Document Lookup (CI, PL, PHY)
// -------------------------------------------------------------
runTest("Scenario 10: Trade Document Lookup 'CI-2026-088'", () => {
  const adminUser = { id: "u-1", role: "admin", name: "Admin" }
  const docRes = searchService.executeGlobalSearch("CI-2026-088", mockDatasets, adminUser)
  assert.ok(docRes.results.length > 0, "Should find trade document")
  const docItem = docRes.results.find((r) => r.type === "document")
  assert.ok(docItem, "Document item should exist")
})

// -------------------------------------------------------------
// Test 11: Route & Customs Station Lookup
// -------------------------------------------------------------
runTest("Scenario 11: Route / Customs Lookup 'Islam Qala'", () => {
  const adminUser = { id: "u-1", role: "admin", name: "Admin" }
  const routeRes = searchService.executeGlobalSearch("Islam Qala", mockDatasets, adminUser)
  assert.ok(routeRes.results.length > 0, "Should find records mentioning Islam Qala")
})

// -------------------------------------------------------------
// Test 12: Unicode Dari/Pashto Search
// -------------------------------------------------------------
runTest("Scenario 12: Unicode Dari / Pashto 'کشمش' (Raisins)", () => {
  const adminUser = { id: "u-1", role: "admin", name: "Admin" }
  const farsiRes = searchService.executeGlobalSearch("کشمش", mockDatasets, adminUser)
  const arabicRes = searchService.executeGlobalSearch("كشمش", mockDatasets, adminUser)
  assert.ok(farsiRes.results.length > 0, "Farsi Kaf query should return records")
  assert.strictEqual(
    farsiRes.results.length,
    arabicRes.results.length,
    "Arabic Kaf and Farsi Kaf must return identical results"
  )
})

// -------------------------------------------------------------
// Test 13: RBAC Financial Data Sanitization
// -------------------------------------------------------------
runTest("Scenario 13: RBAC Sanitization (Operations role stripped of ledger & profit)", () => {
  const opsUser = { id: "u-ops", role: "operations", name: "Operations User" }

  // Operations user searching invoice
  const opsRes = searchService.executeGlobalSearch("INV-2026-00125", mockDatasets, opsUser)
  const invoiceResult = opsRes.results.find((r) => r.type === "invoice")
  if (invoiceResult) {
    assert.strictEqual(invoiceResult.metadata?.profit, undefined)
    assert.strictEqual(invoiceResult.metadata?.cost, undefined)
  }

  // Operations user searching for ledger accounts
  const ledgerRes = searchService.executeGlobalSearch("Ledger", mockDatasets, opsUser)
  const hasLedger = ledgerRes.results.some((r) => r.type === "ledger")
  assert.strictEqual(hasLedger, false, "Operations role must not access ledger records")
})

// -------------------------------------------------------------
// Test 14: Client Portal Tenant Isolation
// -------------------------------------------------------------
runTest("Scenario 14: Client Portal Tenant Isolation", () => {
  const clientAUser = {
    id: "u-client-a",
    role: "client",
    name: "Al-Madina Client",
    clientName: "Al-Madina General Trading LLC",
    clientId: "acc-1",
  }

  const clientARes = searchService.executeGlobalSearch("SA-BOL-2026-088", mockDatasets, clientAUser, {
    strictClientIsolation: true,
    authorizedClientId: "acc-1",
    authorizedCompanyName: "Al-Madina General Trading LLC",
  })

  // Authorized record should be returned
  assert.ok(clientARes.results.length > 0, "Authorized client should find their BOL")

  // Client B (Unrelated third party) searching for Client A's BOL
  const clientBUser = {
    id: "u-client-b",
    role: "client",
    name: "Unrelated Importer",
    clientName: "Unrelated Kabul Importer Ltd",
    clientId: "acc-unrelated",
  }

  const clientBRes = searchService.executeGlobalSearch("SA-BOL-2026-088", mockDatasets, clientBUser, {
    strictClientIsolation: true,
    authorizedClientId: "acc-unrelated",
    authorizedCompanyName: "Unrelated Kabul Importer Ltd",
  })

  assert.strictEqual(
    clientBRes.results.length,
    0,
    "Tenant isolation: Client B must NEVER see Client A's shipment or container"
  )
})

// -------------------------------------------------------------
// Test 15: Pre-Save Duplicate Detection
// -------------------------------------------------------------
runTest("Scenario 15: Pre-Save Duplicate Checkers (Company, BOL, Payment)", async () => {
  // Check company duplicate (alias/fuzzy)
  const dupCo = await searchService.checkCompanyDuplicate("Kandahar Dried Fruits L.L.C.", mockDatasets)
  assert.strictEqual(dupCo.isDuplicate, true, "Should identify existing company duplicate")

  // Check unique company
  const uniqueCo = await searchService.checkCompanyDuplicate("Completely Unique Brand New Enterprise 2099", mockDatasets)
  assert.strictEqual(uniqueCo.isDuplicate, false, "Brand new company should not be duplicate")

  // Check BOL duplicate
  const dupBol = await searchService.checkBolDuplicate("SA-BOL-2026-088", undefined, mockDatasets)
  assert.strictEqual(dupBol.isDuplicate, true, "Existing BOL should be flagged as duplicate")

  // Check Payment duplicate
  const dupPay = await searchService.checkPaymentDuplicate("RCT-99120", 1500, undefined, mockDatasets)
  assert.strictEqual(dupPay.isDuplicate, true, "Existing payment receipt should be flagged")
})

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
setTimeout(() => {
  console.log("==========================================================")
  console.log(`TOTAL TESTS: ${passed + failed}`)
  console.log(`PASSED: ${passed}`)
  console.log(`FAILED: ${failed}`)
  console.log("==========================================================")

  if (failed > 0) {
    process.exit(1)
  } else {
    console.log("🎉 ALL GLOBAL SMART SEARCH & COMMAND CENTER TESTS PASSED PERFECTLY!")
  }
}, 50)
