/**
 * Sky Ariana Logistics — Operations Reporting Center Functional Verification Test Suite
 * Tests calculation engines, safe parsers, multi-currency isolation, period comparisons,
 * data quality audits, duplicate detection, and multi-sheet Excel generation.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const load = require("./load-typescript.cjs");

// Load report engines
const {
  parseWeight,
  parsePackages,
  parseMoney,
  normalizeDate,
  formatDisplayDate,
  safePercentageChange,
  isRtlText,
  extractCleanCommodity,
} = load("lib/reports/parsers.ts");

const {
  calculateOverviewKpis,
  calculatePeriodComparison,
  applyReportFilters,
} = load("lib/reports/calculations.ts");

const {
  groupShippers,
  groupConsignees,
  groupCommodities,
  groupDestinations,
  groupContainers,
  groupMonthly,
  calculateFinancialMetrics,
} = load("lib/reports/grouping.ts");

const {
  auditDataQuality,
  detectPossibleDuplicates,
} = load("lib/reports/data-quality.ts");

const {
  exportReportToExcel,
} = load("lib/reports/export-excel.ts");

// Sample realistic Saved BOL dataset
const MOCK_BOLS = [
  {
    id: "QA-DOC-001",
    bol_number: "BOL-2026-NSA588",
    issue_date: "2026-09-19",
    created_at: "2026-09-19T10:00:00.000Z",
    shipper_name: "NAJEB AMIN LTD",
    consignee_name: "SHREE GANESH TRADERS MUMBAI",
    notify_party_name: "GLOBAL LOGISTICS INDIA",
    cargo_description: "1476 -CTNS GOLDEN RAISNIS (MED)\n16 - KGS RATE 2.40 USD",
    number_of_packages: "1,476 CTNS",
    net_weight: "23,616 KG",
    gross_weight: "24,500 KG",
    goods_value: "$56,678.40",
    container_numbers: "MSCU1234567, MSCU7654321",
    truck_number: "26253کابل",
    driver_name: "احمد ولی",
    port_of_loading: "Kandahar",
    port_of_discharge: "Nhava Sheva",
    place_of_delivery: "Mumbai, India",
    invoice_no: "INV-2026-088",
    pdf_url: "/uploads/bol-588.pdf",
  },
  {
    id: "QA-DOC-002",
    bol_number: "BOL-2026-NSA589",
    issue_date: "2026-09-18",
    created_at: "2026-09-18T12:00:00.000Z",
    shipper_name: "شرکت تجارتی برادران احمدی",
    consignee_name: "AL MANAMA GENERAL TRADING LLC",
    cargo_description: "BLACK RAISINS GRADE A\n40FT REEFER CONTAINER",
    number_of_packages: "1200",
    net_weight: "19200",
    gross_weight: "20100",
    goods_value: "420,000 AED",
    container_numbers: "TEMU9988776 (40RF)",
    truck_number: "35974 هرات",
    port_of_loading: "Herat / Islam Qala",
    port_of_discharge: "Jebel Ali",
    place_of_delivery: "Dubai, UAE",
    invoice_no: "INV-2026-089",
    pdf_url: null,
  },
  {
    id: "QA-DOC-003",
    bol_number: "BOL-2026-NSA590",
    issue_date: "2026-08-15",
    created_at: "2026-08-15T09:30:00.000Z",
    shipper_name: "NAJEB AMIN LTD",
    consignee_name: "EUROPEAN FRUIT IMPORT GMBH",
    cargo_description: "CARAWAY SEEDS (ZEERA)",
    number_of_packages: "800 BAGS",
    net_weight: "16,000 KG",
    gross_weight: "16,400 KG",
    goods_value: "€115,000",
    container_numbers: "CMAU5544332",
    truck_number: "11223 کابل",
    port_of_loading: "Kabul",
    port_of_discharge: "Mersin",
    place_of_delivery: "Hamburg, Germany",
    invoice_no: "INV-2026-090",
    pdf_url: "/uploads/bol-590.pdf",
  },
  {
    id: "QA-DOC-004",
    bol_number: "BOL-2026-NSA591",
    issue_date: "2026-08-10",
    created_at: "2026-08-10T14:00:00.000Z",
    shipper_name: "KANDAHAR FRESH DRY FRUIT CO",
    consignee_name: "SHREE GANESH TRADERS MUMBAI",
    cargo_description: "DRIED FIGS (INJEER)",
    number_of_packages: "500 BOXES",
    net_weight: "10,000 KG",
    gross_weight: "10,500 KG",
    goods_value: "3,200,000 AFN",
    container_numbers: "",
    truck_number: "88774 قندهار",
    port_of_loading: "Spin Boldak",
    port_of_discharge: "Nhava Sheva",
    place_of_delivery: "Mumbai, India",
    invoice_no: "",
    pdf_url: null,
  },
];

// ==================================================
// 1. SAFE PARSERS & NORMALIZERS
// ==================================================
test("Safe Parsers: parseWeight handles formatted and raw values", () => {
  assert.equal(parseWeight("23,616 KG"), 23616);
  assert.equal(parseWeight("23616"), 23616);
  assert.equal(parseWeight("23,616.75 KG"), 23616.75);
  assert.equal(parseWeight(""), 0);
  assert.equal(parseWeight(null), 0);
  assert.equal(parseWeight(undefined), 0);
  assert.equal(parseWeight("invalid text"), 0);
});

test("Safe Parsers: parsePackages handles strings and counts", () => {
  assert.equal(parsePackages("1,476 CTNS"), 1476);
  assert.equal(parsePackages("1200"), 1200);
  assert.equal(parsePackages("800 BAGS"), 800);
  assert.equal(parsePackages(""), 0);
  assert.equal(parsePackages(null), 0);
});

test("Safe Parsers: parseMoney correctly extracts amounts and currencies", () => {
  const usd = parseMoney("$56,678.40");
  assert.equal(usd.amount, 56678.4);
  assert.equal(usd.currency, "USD");

  const aed = parseMoney("420,000 AED");
  assert.equal(aed.amount, 420000);
  assert.equal(aed.currency, "AED");

  const afn = parseMoney("3,200,000 AFN");
  assert.equal(afn.amount, 3200000);
  assert.equal(afn.currency, "AFN");

  const eur = parseMoney("€115,000");
  assert.equal(eur.amount, 115000);
  assert.equal(eur.currency, "EUR");
});

test("Safe Parsers: safePercentageChange avoids Infinity and NaN", () => {
  // Previous = 0 -> "New", never Infinity
  const newMetric = safePercentageChange(137, 0);
  assert.equal(newMetric.isNew, true);
  assert.equal(newMetric.direction, "up");
  assert.ok(isFinite(newMetric.percent));

  // Normal increase
  const up = safePercentageChange(112, 100);
  assert.equal(up.isNew, false);
  assert.equal(up.percent, 12);
  assert.equal(up.direction, "up");

  // Normal decrease
  const down = safePercentageChange(90, 100);
  assert.equal(down.isNew, false);
  assert.equal(down.percent, -10);
  assert.equal(down.direction, "down");
});

test("Safe Parsers: isRtlText and extractCleanCommodity", () => {
  assert.equal(isRtlText("شرکت تجارتی نجیب امین"), true);
  assert.equal(isRtlText("NAJEB AMIN LTD"), false);

  assert.equal(extractCleanCommodity("1476 -CTNS GOLDEN RAISNIS (MED)\n16 - KGS RATE 2.40 USD"), "Golden Raisins");
  assert.equal(extractCleanCommodity("CARAWAY SEEDS (ZEERA)"), "Caraway Seeds");
});

// ==================================================
// 2. OVERVIEW KPIS & MULTI-CURRENCY SEGREGATION
// ==================================================
test("KPI Calculations: Overview KPIs and Multi-Currency Demarcation", () => {
  const kpis = calculateOverviewKpis(MOCK_BOLS);

  assert.equal(kpis.totalBols, 4);
  assert.equal(kpis.totalShipments, 4);
  assert.equal(kpis.totalPackages, 1476 + 1200 + 800 + 500); // 3976
  assert.equal(kpis.totalNetWeightKg, 23616 + 19200 + 16000 + 10000); // 68816
  assert.equal(kpis.bolsWithPdf, 2);
  assert.equal(kpis.bolsWithoutPdf, 2);
  assert.equal(kpis.exportShipments, 4); // All 4 originate from Kandahar, Herat, Kabul, Spin Boldak

  // Currencies must NOT be blended together into an arbitrary sum
  assert.equal(kpis.currencyTotals.length, 4);
  const usd = kpis.currencyTotals.find(c => c.currency === "USD");
  const aed = kpis.currencyTotals.find(c => c.currency === "AED");
  const eur = kpis.currencyTotals.find(c => c.currency === "EUR");
  const afn = kpis.currencyTotals.find(c => c.currency === "AFN");

  assert.equal(usd.amount, 56678.4);
  assert.equal(aed.amount, 420000);
  assert.equal(eur.amount, 115000);
  assert.equal(afn.amount, 3200000);
});

// ==================================================
// 3. PERIOD COMPARISON
// ==================================================
test("Period Comparison: Compares September vs August accurately", () => {
  const septDocs = MOCK_BOLS.filter(d => d.issue_date.startsWith("2026-09"));
  const comparison = calculatePeriodComparison(septDocs, MOCK_BOLS, "previous_month");

  assert.ok(comparison !== null);
  assert.equal(comparison.bols.current, 2);
  assert.equal(comparison.bols.previous, 2);
  assert.equal(comparison.bols.changePercent, 0); // 2 vs 2
});

// ==================================================
// 4. GROUPING & AGGREGATIONS
// ==================================================
test("Grouping: Shippers Report Aggregation", () => {
  const shippers = groupShippers(MOCK_BOLS);
  assert.equal(shippers.length, 3); // NAJEB AMIN LTD (2 BOLs), شرکت تجارتی برادران احمدی (1), KANDAHAR FRESH (1)

  const topShipper = shippers[0];
  assert.equal(topShipper.shipperName, "NAJEB AMIN LTD");
  assert.equal(topShipper.bolCount, 2);
  assert.equal(topShipper.packages, 1476 + 800);
  assert.equal(topShipper.netWeightKg, 23616 + 16000);
  assert.equal(topShipper.containerCount, 3); // MSCU1234567, MSCU7654321, CMAU5544332
});

test("Grouping: Consignees Report Aggregation", () => {
  const consignees = groupConsignees(MOCK_BOLS);
  assert.equal(consignees.length, 3); // SHREE GANESH (2), AL MANAMA (1), EUROPEAN FRUIT (1)

  const topConsignee = consignees.find(c => c.consigneeName === "SHREE GANESH TRADERS MUMBAI");
  assert.ok(topConsignee);
  assert.equal(topConsignee.bolCount, 2);
  assert.equal(topConsignee.shipperCount, 2); // Supplied by Najeb Amin and Kandahar Fresh
});

test("Grouping: Commodity Report Aggregation", () => {
  const commodities = groupCommodities(MOCK_BOLS);
  assert.ok(commodities.some(c => c.commodityName === "Golden Raisins"));
  assert.ok(commodities.some(c => c.commodityName === "Black Raisins"));
  assert.ok(commodities.some(c => c.commodityName === "Caraway Seeds"));
  assert.ok(commodities.some(c => c.commodityName === "Dried Figs"));
});

test("Grouping: Container Registry & Types", () => {
  const { containers, stats } = groupContainers(MOCK_BOLS);
  assert.equal(stats.total, 4); // 2 in BOL-1, 1 in BOL-2, 1 in BOL-3
  assert.ok(stats.reefer >= 1); // TEMU9988776 (40RF)
  assert.ok(containers.some(c => c.containerNumber === "MSCU1234567"));
  assert.ok(containers.some(c => c.containerNumber === "TEMU9988776"));
});

test("Grouping: Monthly Operations Analytics", () => {
  const months = groupMonthly(MOCK_BOLS, 2026);
  assert.equal(months.length, 2); // Aug 2026 and Sep 2026
  assert.equal(months[0].monthLabel, "Aug 2026");
  assert.equal(months[0].bolCount, 2);
  assert.equal(months[1].monthLabel, "Sep 2026");
  assert.equal(months[1].bolCount, 2);
});

// ==================================================
// 5. DATA QUALITY & DUPLICATE DETECTION
// ==================================================
test("Data Quality: Correctly calculates completeness score and categorizes missing fields", () => {
  const audit = auditDataQuality(MOCK_BOLS);
  assert.equal(audit.totalRecords, 4);
  assert.ok(audit.qualityScorePercent > 70 && audit.qualityScorePercent < 100);
  assert.ok(audit.attentionRecords > 0); // BOL-4 has no containers or invoice

  const containerIssue = audit.issues.find(i => i.field === "container_numbers");
  assert.ok(containerIssue);
  assert.equal(containerIssue.severity, "warning");
  assert.equal(containerIssue.missingCount, 1);
});

test("Duplicate Detection: Identifies identical BOL numbers non-destructively", () => {
  const duplicatedSet = [
    ...MOCK_BOLS,
    {
      id: "QA-DOC-DUP",
      bol_number: "BOL-2026-NSA588", // Same BOL
      shipper_name: "OTHER SHIPPER",
      issue_date: "2026-09-19",
      created_at: "2026-09-19T11:00:00.000Z",
    },
  ];

  const duplicates = detectPossibleDuplicates(duplicatedSet);
  assert.ok(duplicates.length >= 1);
  assert.equal(duplicates[0].reason, "Same BOL Number");
  assert.equal(duplicates[0].docs.length, 2);
});

// ==================================================
// 6. FILTER ENGINE
// ==================================================
test("Filter Engine: Real-time search and multi-field filtering", () => {
  // 1. Text search across cargo and parties
  const searchRaisins = applyReportFilters(MOCK_BOLS, { searchQuery: "Raisins" });
  assert.equal(searchRaisins.length, 2); // BOL 1 & BOL 2

  // 2. Shipper filter
  const filterNajeb = applyReportFilters(MOCK_BOLS, { shipper: "Najeb" });
  assert.equal(filterNajeb.length, 2);

  // 3. Destination filter
  const filterDubai = applyReportFilters(MOCK_BOLS, { destination: "Dubai" });
  assert.equal(filterDubai.length, 1);

  // 4. Currency filter
  const filterAfn = applyReportFilters(MOCK_BOLS, { currency: "AFN" });
  assert.equal(filterAfn.length, 1);
  assert.equal(filterAfn[0].id, "QA-DOC-004");
});

// ==================================================
// 7. EXCEL MULTI-SHEET GENERATION
// ==================================================
test("Excel Export: Generates professional multi-sheet workbook (.xlsx)", async () => {
  let XLSX;
  try {
    XLSX = require("xlsx");
  } catch {
    XLSX = require(path.resolve(__dirname, "../node_modules/.pnpm/xlsx@0.18.5/node_modules/xlsx"));
  }
  const tmpFile = path.join(require("node:os").tmpdir(), `test-report-${Date.now()}.xlsx`);

  // Override writeFile for headless test
  const originalWriteFile = XLSX.writeFile;
  let exportedSheets = [];

  XLSX.writeFile = (wb, filename) => {
    exportedSheets = wb.SheetNames;
    return originalWriteFile(wb, tmpFile);
  };

  try {
    await exportReportToExcel(MOCK_BOLS, "QA-Test-Excel");
    assert.deepEqual(exportedSheets, [
      "Summary",
      "Detailed BOLs",
      "Cargo Items Breakdown",
      "Shippers",
      "Consignees",
      "Commodities",
      "Destinations",
    ]);
    assert.ok(fs.existsSync(tmpFile));
    assert.ok(fs.statSync(tmpFile).size > 5000, "XLSX file must contain substantive binary data");
  } finally {
    XLSX.writeFile = originalWriteFile;
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

// ==================================================
// 8. PRINT & PDF PORTAL ISOLATION
// ==================================================
test("Print Isolation: CSS rules strictly display #sky-reports-print-root and suppress #bol-print-preview-root when active", () => {
  const cssPath = path.resolve(__dirname, "../app/globals.css");
  assert.ok(fs.existsSync(cssPath), "globals.css must exist");
  const css = fs.readFileSync(cssPath, "utf8");

  // 1. Verify body[data-print-active="reports"] rules exist
  assert.ok(
    css.includes('body[data-print-active="reports"] #sky-reports-print-root'),
    "CSS must target #sky-reports-print-root when reports print is active"
  );

  // 2. Verify #bol-print-preview-root is explicitly hidden during reports print
  assert.ok(
    css.includes('body[data-print-active="reports"] #bol-print-preview-root') ||
    css.includes('body[data-print-active="reports"] #bol-print-preview'),
    "CSS must hide BOL print preview when reports are being printed"
  );

  // 3. Verify ledger & invoice portals are also suppressed
  assert.ok(
    css.includes('body[data-print-active="reports"] #sky-ledger-print-root'),
    "CSS must hide ledger print root during reports print"
  );
  assert.ok(
    css.includes('body[data-print-active="reports"] #sky-invoice-print-root'),
    "CSS must hide invoice print root during reports print"
  );
});

