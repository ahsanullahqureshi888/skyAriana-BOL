/**
 * Sky Ariana Logistics — Phase 3 Operations Reports Verification Test Suite
 * Tests Daily / Weekly / Monthly Operations Reports engine, multi-modal status categorization,
 * Afghan license plate string preservation, multi-currency isolation, Excel/CSV export,
 * and point-in-time snapshot persistence.
 */

const test = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const fs = require("node:fs")
const load = require("./load-typescript.cjs")

// Mock localStorage for node environment
const storageMock = {}
global.localStorage = {
  getItem: (k) => storageMock[k] || null,
  setItem: (k, v) => { storageMock[k] = String(v) },
  removeItem: (k) => { delete storageMock[k] },
  clear: () => { Object.keys(storageMock).forEach(k => delete storageMock[k]) }
}

const {
  formatDateInTimezone,
  resolveOperationsPeriod,
  generateOperationsReportTitle,
  buildOperationsReport,
  validateOperationsReportTotals,
  saveOperationsReportSnapshot,
  getOperationsReportSnapshots,
  deleteOperationsReportSnapshot,
} = load("lib/reports/operations-report.ts")

const {
  getWindowsSafeReportFileName,
  exportOperationsReportToExcel,
  exportOperationsReportToCsv,
} = load("lib/reports/operations-export.ts")

// Realistic multi-modal BOL test fixtures
const MOCK_OPERATIONS_DOCS = [
  {
    id: "BOL-OP-001",
    bol_number: "BOL-2026-KBL001",
    issue_date: "2026-09-20",
    created_at: "2026-09-20T08:00:00.000Z",
    shipper_name: "HAJI ABDUL WASE KHAN ALOKOZAY",
    consignee_name: "AL-SHIFA GENERAL TRADING DUBAI",
    cargo_description: "1450 CTNS FRESH POMEGRANATES (KANDAHAR)",
    number_of_packages: "1450 CTNS",
    gross_weight: "14500",
    net_weight: "13800",
    container_number: "MSCU9876543",
    truck_number: "AFG-74892-KBL",
    driver_name: "Ahmad Shah",
    driver_father_name: "Abdul Ghani",
    driver_phone: "+93 700 123456",
    driver_rent: "45000 AFN",
    port_of_loading: "Hairatan",
    port_of_discharge: "Jebel Ali",
    final_destination: "Dubai UAE",
    status: "in_transit",
    goods_value: "$35,000 USD",
  },
  {
    id: "BOL-OP-002",
    bol_number: "BOL-2026-KBL002",
    issue_date: "2026-09-20",
    created_at: "2026-09-20T09:30:00.000Z",
    shipper_name: "NAJEB AMIN LTD",
    consignee_name: "SHREE GANESH TRADERS MUMBAI",
    cargo_description: "1200 CTNS GOLDEN RAISINS",
    number_of_packages: "1200 CTNS",
    gross_weight: "19200",
    net_weight: "18500",
    container_number: "CMAU1234567",
    truck_number: "48201-HERAT",
    driver_name: "Ghulam Nabi",
    driver_father_name: "Mohammad Din",
    driver_phone: "+93 799 654321",
    driver_rent: "1200 USD",
    port_of_loading: "Islam Qala",
    port_of_discharge: "Bandar Abbas",
    final_destination: "Nhava Sheva India",
    status: "at_border",
    goods_value: "$42,000 USD",
  },
  {
    id: "BOL-OP-003",
    bol_number: "BOL-2026-KBL003",
    issue_date: "2026-09-18",
    created_at: "2026-09-18T14:00:00.000Z",
    shipper_name: "BAKHTAR IMPORTS AND EXPORTS",
    consignee_name: "GLOBAL CARGO ISTANBUL",
    cargo_description: "800 BAGS DRIED FIGS",
    number_of_packages: "800 BAGS",
    gross_weight: "20000",
    net_weight: "19600",
    container_number: "TCKU4567890",
    truck_number: "AFG-11094-NGR",
    driver_name: "Jan Agha",
    driver_father_name: "Faquir Mohammad",
    driver_phone: "+93 788 998877",
    driver_rent: "65000 AFN",
    port_of_loading: "Torghundi",
    port_of_discharge: "Mersin",
    final_destination: "Istanbul Turkey",
    status: "delivered",
    goods_value: "$28,500 USD",
  },
]

// =========================================================================
// TEST 1: PERIOD RESOLUTION & CONFIGURABLE WEEK START
// =========================================================================
test("Operations Report - Period resolution for Today, Yesterday, This Week, Month", () => {
  const periodToday = resolveOperationsPeriod("today", undefined, undefined, "Asia/Kabul", 1)
  assert.equal(periodToday.type, "today")
  assert.equal(typeof periodToday.startDate, "string")
  assert.equal(periodToday.startDate, periodToday.endDate)

  const periodYesterday = resolveOperationsPeriod("yesterday", undefined, undefined, "Asia/Kabul", 1)
  assert.equal(periodYesterday.type, "yesterday")
  assert.equal(typeof periodYesterday.startDate, "string")

  // Week with Monday start (1) vs Saturday start (6 - Afghan work week)
  const periodWeekMon = resolveOperationsPeriod("this_week", undefined, undefined, "Asia/Kabul", 1)
  const periodWeekSat = resolveOperationsPeriod("this_week", undefined, undefined, "Asia/Kabul", 6)
  assert.equal(periodWeekMon.type, "this_week")
  assert.equal(periodWeekSat.type, "this_week")

  // Custom range
  const periodCustom = resolveOperationsPeriod("custom", "2026-09-01", "2026-09-20", "Asia/Kabul", 1)
  assert.equal(periodCustom.startDate, "2026-09-01")
  assert.equal(periodCustom.endDate, "2026-09-20")

  // Professional Title Generation
  const title = generateOperationsReportTitle(periodToday)
  assert.match(title, /Sky Ariana Daily Operations Report/)
})

// =========================================================================
// TEST 2: REPORT ENGINE SINGLE PIPELINE & INVARIANCE
// =========================================================================
test("Operations Report - Accounting invariance & mathematical consistency", () => {
  const period = resolveOperationsPeriod("custom", "2026-09-01", "2026-09-25", "Asia/Kabul", 1)
  const report = buildOperationsReport(MOCK_OPERATIONS_DOCS, period, {}, "Test Desk", "Safe route note")

  // Total shipments count match
  assert.equal(report.summary.totalShipments, 3)
  assert.equal(report.shipments.length, 3)

  // Gross and Net weight sum verification
  const manualGross = 14500 + 19200 + 20000
  const manualNet = 13800 + 18500 + 19600
  assert.equal(report.summary.totalGrossWeightKg, manualGross)
  assert.equal(report.summary.totalNetWeightKg, manualNet)

  // Status categories audit
  const activeCount = report.summary.activeShipments
  const deliveredCount = report.summary.deliveredShipments
  assert.equal(activeCount + deliveredCount, 3)
  assert.equal(deliveredCount, 1) // BOL-OP-003 is delivered
  assert.equal(activeCount, 2) // BOL-OP-001 (in_transit), BOL-OP-002 (at_border)

  // Validation function check
  const validation = validateOperationsReportTotals(report)
  assert.equal(validation.isValid, true, `Validation failed: ${validation.errors.join(", ")}`)
})

// =========================================================================
// TEST 3: MULTI-CURRENCY SEGREGATION (NEVER SUM USD & AFN TOGETHER)
// =========================================================================
test("Operations Report - Strict currency demarcation and segregation", () => {
  const period = resolveOperationsPeriod("custom", "2026-09-01", "2026-09-25", "Asia/Kabul", 1)
  const report = buildOperationsReport(MOCK_OPERATIONS_DOCS, period)

  // Total Revenue by Currency
  assert.equal(typeof report.summary.totalRevenueByCurrency["USD"], "number")
  assert.equal(report.summary.totalRevenueByCurrency["USD"], 35000 + 42000 + 28500)
  assert.equal(report.summary.totalRevenueByCurrency["AFN"], undefined)

  // Driver Rent by Currency (AFN vs USD)
  // BOL-OP-001: 45000 AFN
  // BOL-OP-002: 1200 USD
  // BOL-OP-003: 65000 AFN
  assert.equal(report.summary.totalDriverRentByCurrency["AFN"], 45000 + 65000)
  assert.equal(report.summary.totalDriverRentByCurrency["USD"], 1200)

  // Check that currency keys are segregated
  const keys = Object.keys(report.summary.totalDriverRentByCurrency)
  assert.ok(keys.includes("AFN"))
  assert.ok(keys.includes("USD"))
})

// =========================================================================
// TEST 4: AFGHAN TRUCK LICENSE PLATES PRESERVATION
// =========================================================================
test("Operations Report - Afghan truck license plates string preservation", () => {
  const period = resolveOperationsPeriod("custom", "2026-09-01", "2026-09-25", "Asia/Kabul", 1)
  const report = buildOperationsReport(MOCK_OPERATIONS_DOCS, period)

  const plates = report.shipments.map(s => s.truckNumber)
  assert.ok(plates.includes("AFG-74892-KBL"), "Plate AFG-74892-KBL must be preserved exactly")
  assert.ok(plates.includes("48201-HERAT"), "Plate 48201-HERAT must be preserved exactly")
  assert.ok(plates.includes("AFG-11094-NGR"), "Plate AFG-11094-NGR must be preserved exactly")

  // Verify in truckActivity section
  const truckPlates = report.truckActivity.map(t => t.truckNumber)
  assert.ok(truckPlates.includes("AFG-74892-KBL"))
  assert.ok(truckPlates.includes("48201-HERAT"))
  assert.ok(truckPlates.includes("AFG-11094-NGR"))
})

// =========================================================================
// TEST 5: WINDOWS-SAFE FILENAME SANITIZATION
// =========================================================================
test("Operations Export - Windows-safe filename sanitization", () => {
  const illegalTitle = 'Sky:Ariana*Report? "Daily" <Kabul/Herat> | Final'
  const safeName = getWindowsSafeReportFileName(illegalTitle, "xlsx")

  assert.ok(!/[\\/:*?"<>|]/.test(safeName), `Filename contains illegal characters: ${safeName}`)
  assert.ok(safeName.endsWith(".xlsx"))
  assert.equal(safeName, "Sky-Ariana-Report-Daily-Kabul-Herat-Final.xlsx")
})

// =========================================================================
// TEST 6: MULTI-SHEET EXCEL AND UTF-8 CSV EXPORT
// =========================================================================
test("Operations Export - Multi-sheet Excel and CSV creation", async () => {
  const period = resolveOperationsPeriod("custom", "2026-09-01", "2026-09-25", "Asia/Kabul", 1)
  const report = buildOperationsReport(MOCK_OPERATIONS_DOCS, period)

  // Verify Excel export runs cleanly in Node environment
  const excelOutFile = path.resolve(__dirname, "temp-test-ops-report.xlsx")
  await exportOperationsReportToExcel(report, excelOutFile)
  assert.ok(fs.existsSync(excelOutFile), "Excel file must be created on disk")
  fs.unlinkSync(excelOutFile) // Clean up

  // Verify CSV export function executes without throwing
  assert.doesNotThrow(() => {
    exportOperationsReportToCsv(report, "test-output.csv")
  })
})

// =========================================================================
// TEST 7: SNAPSHOT PERSISTENCE ISOLATION
// =========================================================================
test("Operations Report - Snapshot archive and isolation from BOL data", () => {
  const period = resolveOperationsPeriod("today", undefined, undefined, "Asia/Kabul", 1)
  const report = buildOperationsReport(MOCK_OPERATIONS_DOCS, period)

  // Save snapshot
  const snapshotMeta = saveOperationsReportSnapshot(report)
  assert.ok(snapshotMeta.id)
  assert.equal(snapshotMeta.shipmentCount, report.shipments.length)

  // Retrieve snapshots
  const allSnapshots = getOperationsReportSnapshots()
  assert.ok(allSnapshots.length >= 1)
  const found = allSnapshots.find(s => s.id === snapshotMeta.id)
  assert.ok(found)

  // Delete snapshot
  deleteOperationsReportSnapshot(snapshotMeta.id)
  const afterDelete = getOperationsReportSnapshots()
  assert.ok(!afterDelete.some(s => s.id === snapshotMeta.id))

  // Ensure MOCK_OPERATIONS_DOCS remained completely untouched
  assert.equal(MOCK_OPERATIONS_DOCS.length, 3)
})
