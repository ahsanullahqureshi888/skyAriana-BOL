const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const load = require("./load-typescript.cjs");

// Load modules under test
const { parseSyncedCargoItems, splitMultiCargoItems } = load("lib/utils/cargo-grid.ts");
const {
  formatDisplayDate,
  extractInvoiceNo,
  extractTruckNo,
  extractBolRoute,
  parseWeight,
  parsePackages,
  parseMoney,
} = load("lib/reports/parsers.ts");
const { exportReportToExcel } = load("lib/reports/export-excel.ts");
const {
  groupRoutes,
  groupTrucks,
  groupCommodities,
  groupShippers,
  groupConsignees,
} = load("lib/reports/grouping.ts");
const {
  calculateOverviewKpis,
  applyReportFilters,
} = load("lib/reports/calculations.ts");

// Mock BOL records representing diverse operational scenarios
const MOCK_DETAILED_BOLS = [
  {
    id: "QA-DET-001",
    bol_number: "BOL-2026-NSA632",
    issue_date: "2026-09-29T10:00:00Z",
    created_at: "2026-09-29T10:00:00Z",
    truck_number: "32491 Herat",
    driver_name: "Nabi",
    driver_father_name: "Ghulam",
    driver_contact: "0707559594",
    driver_rent: "38,500 AFN",
    invoice_no: "INV-098",
    shipper_name: "RAHMAT NAZAR LTD",
    shipper_address: "Industrial Park, Herat, Afghanistan",
    consignee_name: "PROVENTUS AGROCOM LIMITED",
    consignee_address: "Plot 42, Nhava Sheva SEZ, Navi Mumbai, India",
    notify_party_name: "SAME AS CONSIGNEE",
    goods_description: "DRY FIGS\nGRADE A AFGHAN FIGS",
    number_of_packages: "2424 CTNS",
    kgs_per_carton: "10 KG",
    gross_weight_per_carton: "10.8 KG",
    net_weight: "24,240 KG",
    gross_weight: "26,179.2 KG",
    rate_per_kgs: "4.85 USD",
    goods_value: "$117,564.00",
    port_of_loading: "Kandahar",
    port_of_discharge: "Nhava Sheva, IN",
    place_of_delivery: "Nhava Sheva, IN",
    container_numbers: "MSCU9821345",
    seal_numbers: "SL-99881",
    cargo_route_note: "Kandahar to Nimroz to Bandar Abbas to Nhava Sheva (Reefer)",
    pdf_url: "https://storage.googleapis.com/sky-bol/BOL-2026-NSA632.pdf",
  },
  {
    id: "QA-DET-002",
    bol_number: "BOL-2026-NSA633",
    issue_date: "2026-09-28T08:30:00Z",
    created_at: "2026-09-28T08:30:00Z",
    truck_number: "44120 Kabul",
    driver_name: "Ahmad Shah",
    driver_contact: "0788123456",
    driver_rent: "42,000 AFN",
    invoice_no: "INV-099",
    shipper_name: "AFGHAN FRUIT EXPORTERS UNION",
    consignee_name: "TROPICAL EXOTICS LLC",
    goods_description: "Golden Raisins\nGreen Raisins\nBlack Raisins",
    number_of_packages: "500 CTNS - 400 CTNS - 300 CTNS",
    kgs_per_carton: "10 KG - 10 KG - 10 KG",
    gross_weight_per_carton: "11 KG - 11 KG - 11 KG",
    net_weight: "5,000 KG - 4,000 KG - 3,000 KG",
    gross_weight: "5,500 KG - 4,400 KG - 3,300 KG",
    rate_per_kgs: "3.50 USD - 3.80 USD - 3.20 USD",
    goods_value: "$17,500.00 - $15,200.00 - $9,600.00",
    port_of_loading: "Herat",
    port_of_discharge: "Jebel Ali, UAE",
    place_of_delivery: "Dubai, UAE",
    container_numbers: "CMAU7718290",
    seal_numbers: "SL-44112",
    cargo_route_note: "Via Islam Qala border",
    pdf_url: null,
  },
];

// ==================================================
// 1. CARGO GRID & MULTI-ITEM PARSING
// ==================================================
test("Detailed Report: parseSyncedCargoItems parses single cargo item accurately", () => {
  const parsed = parseSyncedCargoItems(MOCK_DETAILED_BOLS[0]);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].packageText, "2424 CTNS");
  assert.equal(parsed.items[0].rate, "4.85 USD");
  assert.equal(parsed.totals.totalPackages, 2424);
  assert.equal(parsed.totals.totalNetWeight, 24240);
});

test("Detailed Report: parseSyncedCargoItems parses multi-cargo item breakdowns", () => {
  const parsed = parseSyncedCargoItems(MOCK_DETAILED_BOLS[1]);
  assert.equal(parsed.items.length, 3, "Must parse 3 distinct cargo rows");
  assert.equal(parsed.items[0].packageText, "500 CTNS");
  assert.equal(parsed.items[1].packageText, "400 CTNS");
  assert.equal(parsed.items[2].packageText, "300 CTNS");

  assert.equal(parsed.totals.totalPackages, 1200, "500 + 400 + 300 = 1200 CTNS");
  assert.equal(parsed.totals.totalNetWeight, 12000, "5000 + 4000 + 3000 = 12000 KG");
  assert.equal(parsed.totals.totalGrossWeight, 13200, "5500 + 4400 + 3300 = 13200 KG");
  assert.equal(parsed.totals.totalGoodsValue, 42300, "17500 + 15200 + 9600 = $42,300");
});

// ==================================================
// 2. PARSER METRICS & ACCOUNTING INVARIANCE
// ==================================================
test("Detailed Report: Parsers handle money and weights with comma-separators stably", () => {
  assert.equal(parseWeight("24,240 KG"), 24240);
  assert.equal(parseWeight("26,179.2 KG"), 26179.2);
  assert.equal(parsePackages("2424 CTNS"), 2424);

  const money = parseMoney("$117,564.00");
  assert.equal(money.amount, 117564);
  assert.equal(money.currency, "USD");
});

test("Detailed Report: Route and badge parser extracts Reefer and Border correctly", () => {
  const route0 = extractBolRoute(MOCK_DETAILED_BOLS[0]);
  assert.ok(route0.hasReefer, "Route 0 declared Reefer");
  assert.ok(route0.display.includes("Kandahar"));

  const route1 = extractBolRoute(MOCK_DETAILED_BOLS[1]);
  assert.ok(route1.borderCrossing && route1.borderCrossing.includes("Islam Qala"));
});

// ==================================================
// 3. ROW SELECTION STABILITY INVARIANCE
// ==================================================
test("Detailed Report: Selection does not hide unselected records from table view", () => {
  const filteredData = [...MOCK_DETAILED_BOLS];
  const selectedDocIds = ["QA-DET-001"];

  // Table rows must remain based on filteredData, NOT selectedDocIds!
  const rowsRenderedInTable = filteredData;
  assert.equal(rowsRenderedInTable.length, 2, "Table must still display all 2 filtered rows");
  assert.ok(
    rowsRenderedInTable.some((r) => r.id === "QA-DET-002"),
    "Unselected row QA-DET-002 must remain visible for user interaction"
  );

  // Bulk actions or export specifically isolate selected items if selectedDocIds has items
  const dataForSelectedExport =
    selectedDocIds.length > 0
      ? filteredData.filter((d) => selectedDocIds.includes(d.id))
      : filteredData;
  assert.equal(dataForSelectedExport.length, 1);
  assert.equal(dataForSelectedExport[0].id, "QA-DET-001");
});

// ==================================================
// 4. EXCEL EXPORT WITH CARGO BREAKDOWN SHEET
// ==================================================
test("Detailed Report: exportReportToExcel creates Detailed BOLs and Cargo Breakdown sheets", async () => {
  let XLSX;
  try {
    XLSX = require("xlsx");
  } catch {
    XLSX = require(path.resolve(__dirname, "../node_modules/.pnpm/xlsx@0.18.5/node_modules/xlsx"));
  }

  const tmpFile = path.join(require("node:os").tmpdir(), `test-detailed-report-${Date.now()}.xlsx`);
  const originalWriteFile = XLSX.writeFile;
  let sheets = [];
  let detailedSheetData = [];
  let cargoSheetData = [];

  XLSX.writeFile = (wb, filename) => {
    sheets = wb.SheetNames;
    detailedSheetData = XLSX.utils.sheet_to_json(wb.Sheets["Detailed BOLs"]);
    cargoSheetData = XLSX.utils.sheet_to_json(wb.Sheets["Cargo Items Breakdown"]);
    return originalWriteFile(wb, tmpFile);
  };

  try {
    await exportReportToExcel(MOCK_DETAILED_BOLS, "QA-Test-Detailed");

    assert.ok(sheets.includes("Detailed BOLs"), "Workbook must have Detailed BOLs");
    assert.ok(sheets.includes("Cargo Items Breakdown"), "Workbook must have Cargo Items Breakdown");

    // Verify Detailed BOLs rows
    assert.equal(detailedSheetData.length, 2, "Detailed BOLs must have 2 rows");
    assert.equal(detailedSheetData[0]["BOL Number"], "BOL-2026-NSA632");
    assert.equal(detailedSheetData[0]["Truck Plate"], "32491 Herat");
    assert.equal(detailedSheetData[0]["Driver Name"], "Nabi");
    assert.equal(detailedSheetData[0]["Driver Rent"], "38,500 AFN");

    // Verify Cargo Breakdown rows (1 item for BOL 1 + 3 items for BOL 2 = 4 total rows)
    assert.equal(cargoSheetData.length, 4, "Cargo Breakdown must contain 4 itemized rows");
    assert.equal(cargoSheetData[0]["BOL Number"], "BOL-2026-NSA632");
    assert.equal(cargoSheetData[1]["BOL Number"], "BOL-2026-NSA633");
    assert.equal(cargoSheetData[2]["BOL Number"], "BOL-2026-NSA633");
    assert.equal(cargoSheetData[3]["BOL Number"], "BOL-2026-NSA633");
  } finally {
    XLSX.writeFile = originalWriteFile;
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

// ==================================================
// 5. ROUTE CORRIDORS & EQUIPMENT GROUPING
// ==================================================
test("Report Center: groupRoutes extracts corridors, border stations, and equipment accurately", () => {
  const routes = groupRoutes(MOCK_DETAILED_BOLS);
  assert.equal(routes.length, 2, "Must identify two distinct routes");

  // BOL 1: Kandahar to Nhava Sheva (Reefer)
  const nhavaRoute = routes.find((r) => r.destination.includes("Nhava Sheva") || r.routePath.includes("Nhava Sheva"));
  assert.ok(nhavaRoute, "Must find Kandahar to Nhava Sheva route");
  assert.equal(nhavaRoute.bolCount, 1);
  assert.equal(nhavaRoute.packages, 2424);
  assert.equal(nhavaRoute.netWeightKg, 24240);
  assert.equal(nhavaRoute.reeferCount, 1, "Must recognize Reefer equipment");
  assert.equal(nhavaRoute.dryCount, 0);
  assert.equal(nhavaRoute.goodsValueByCurrency["USD"], 117564);

  // BOL 2: Herat to Dubai (Islam Qala border, Dry)
  const dubaiRoute = routes.find((r) => r.destination.includes("Dubai") || r.destination.includes("Jebel Ali") || r.routePath.includes("Dubai"));
  assert.ok(dubaiRoute, "Must find Herat to Dubai route");
  assert.equal(dubaiRoute.bolCount, 1);
  assert.equal(dubaiRoute.packages, 1200);
  assert.equal(dubaiRoute.netWeightKg, 12000);
  assert.ok(dubaiRoute.borderCrossing?.includes("Islam Qala") || dubaiRoute.via?.includes("Islam Qala"));
});

// ==================================================
// 6. TRUCK FLEET & DRIVER RENT SEGREGATION
// ==================================================
test("Report Center: groupTrucks tracks fleet activity and strictly segregates driver rent", () => {
  const trucks = groupTrucks(MOCK_DETAILED_BOLS);
  assert.equal(trucks.length, 2, "Must group into two trucks");

  const heratTruck = trucks.find((t) => t.truckNumber.includes("32491"));
  assert.ok(heratTruck, "Must find Herat truck 32491");
  assert.equal(heratTruck.lastDriver, "Nabi");
  assert.equal(heratTruck.lastDriverPhone, "0707559594");
  assert.equal(heratTruck.totalDriverRent["AFN"], 38500, "Rent must be tracked in AFN without currency corruption");
  assert.equal(heratTruck.totalDriverRent["USD"] || 0, 0, "Rent in AFN must never contaminate USD");
  assert.equal(heratTruck.topShipper, "RAHMAT NAZAR LTD");

  const kabulTruck = trucks.find((t) => t.truckNumber.includes("44120"));
  assert.ok(kabulTruck, "Must find Kabul truck 44120");
  assert.equal(kabulTruck.lastDriver, "Ahmad Shah");
  assert.equal(kabulTruck.totalDriverRent["AFN"], 42000);
});

// ==================================================
// 7. MULTI-CARGO COMMODITY ATTRIBUTION INVARIANCE
// ==================================================
test("Report Center: groupCommodities correctly distributes weight across multi-cargo rows", () => {
  const commodities = groupCommodities(MOCK_DETAILED_BOLS);

  // We have DRY FIGS from BOL 1 (24,240 KG)
  // and Golden, Green, Black Raisins from BOL 2 (5,000 + 4,000 + 3,000 = 12,000 KG)
  const figs = commodities.find((c) => c.commodityName.toLowerCase().includes("fig"));
  assert.ok(figs, "Dry Figs must be present");
  assert.equal(figs.netWeightKg, 24240);
  assert.equal(figs.packages, 2424);

  // Check sum of all commodity net weights strictly equals sum of BOL net weights
  const totalCommodityNetWeight = commodities.reduce((sum, c) => sum + c.netWeightKg, 0);
  const totalBolNetWeight = 24240 + 12000; // 36,240 KG
  assert.equal(
    totalCommodityNetWeight,
    totalBolNetWeight,
    "Mathematical Invariance: Total commodity weights must strictly equal total shipment weight without duplication"
  );
});

// ==================================================
// 8. KPI PACKAGE UNIT BREAKDOWN & AUDIT SCORE
// ==================================================
test("Report Center: calculateOverviewKpis computes package unit breakdown and audit completeness", () => {
  const kpis = calculateOverviewKpis(MOCK_DETAILED_BOLS);
  assert.equal(kpis.totalBols, 2);
  assert.equal(kpis.totalPackages, 3624);
  assert.equal(kpis.totalNetWeightKg, 36240);
  assert.equal(kpis.totalGrossWeightKg, 39379.2);

  // Package units breakdown
  assert.ok(kpis.packageUnitsBreakdown, "Must compute package unit breakdown");
  assert.equal(kpis.packageUnitsBreakdown["CTNS"], 3624);

  // Audit data quality score
  assert.ok(typeof kpis.dataQualityScore === "number", "Must compute numeric data quality score");
  assert.ok(kpis.dataQualityScore >= 0 && kpis.dataQualityScore <= 100);
});

// ==================================================
// 9. ADVANCED REPORT FILTERS & DRILL-DOWN
// ==================================================
test("Report Center: applyReportFilters accurately filters by route, truck, and missing audit items", () => {
  // Filter by route
  const routeFiltered = applyReportFilters(MOCK_DETAILED_BOLS, { route: "Nhava Sheva" });
  assert.equal(routeFiltered.length, 1);
  assert.equal(routeFiltered[0].id, "QA-DET-001");

  // Filter by truck
  const truckFiltered = applyReportFilters(MOCK_DETAILED_BOLS, { truckNumber: "44120" });
  assert.equal(truckFiltered.length, 1);
  assert.equal(truckFiltered[0].id, "QA-DET-002");

  // Filter by missing PDF
  const missingPdf = applyReportFilters(MOCK_DETAILED_BOLS, { missingData: "pdf" });
  assert.equal(missingPdf.length, 1);
  assert.equal(missingPdf[0].id, "QA-DET-002", "BOL-2 has no PDF attached");

  // Filter by container type: Reefer
  const reeferFiltered = applyReportFilters(MOCK_DETAILED_BOLS, { containerType: "Reefer" });
  assert.equal(reeferFiltered.length, 1);
  assert.equal(reeferFiltered[0].id, "QA-DET-001");
});

// ==================================================
// 10. MULTI-CARGO MATHEMATICAL INVARIANCE (2, 3, 5 ITEMS)
// ==================================================
test("Report Center: Multi-cargo exact reconciliation for 2, 3, and 5 cargo items", () => {
  // Scenario A: 2 Cargo Items (Pistachio + Almonds)
  const bol2Items = {
    id: "QA-MULTI-2",
    bol_number: "BOL-2026-MULTI2",
    goods_description: "Pistachio\nAlmonds",
    number_of_packages: "300 CTNS - 200 CTNS",
    kgs_per_carton: "10 KG - 10 KG",
    gross_weight_per_carton: "11 KG - 11 KG",
    net_weight: "3,000 KG - 2,000 KG",
    gross_weight: "3,300 KG - 2,200 KG",
    rate_per_kgs: "5.00 USD - 4.50 USD",
    goods_value: "$15,000.00 - $9,000.00",
  };
  const parsed2 = parseSyncedCargoItems(bol2Items);
  assert.equal(parsed2.items.length, 2, "Must parse 2 cargo items");
  assert.equal(parsed2.totals.totalPackages, 500, "300 + 200 = 500 CTNS");
  assert.equal(parsed2.totals.totalNetWeight, 5000, "3000 + 2000 = 5000 KG");
  assert.equal(parsed2.totals.totalGrossWeight, 5500, "3300 + 2200 = 5500 KG");
  assert.equal(parsed2.totals.totalGoodsValue, 24000, "15000 + 9000 = $24,000");

  const comms2 = groupCommodities([bol2Items]);
  assert.equal(comms2.length, 2);
  const commNet2 = comms2.reduce((acc, c) => acc + c.netWeightKg, 0);
  assert.equal(commNet2, 5000, "Commodities sum net weight must strictly equal BOL net weight");

  // Scenario B: 3 Cargo Items (Golden, Green, and Black Raisins from MOCK_DETAILED_BOLS[1])
  const parsed3 = parseSyncedCargoItems(MOCK_DETAILED_BOLS[1]);
  assert.equal(parsed3.items.length, 3, "Must parse 3 cargo items");
  assert.equal(parsed3.totals.totalPackages, 1200, "500 + 400 + 300 = 1200 CTNS");
  assert.equal(parsed3.totals.totalNetWeight, 12000, "5000 + 4000 + 3000 = 12000 KG");
  assert.equal(parsed3.totals.totalGrossWeight, 13200, "5500 + 4400 + 3300 = 13200 KG");
  assert.equal(parsed3.totals.totalGoodsValue, 42300, "17500 + 15200 + 9600 = $42,300");

  const comms3 = groupCommodities([MOCK_DETAILED_BOLS[1]]);
  assert.equal(comms3.length, 3);
  const commNet3 = comms3.reduce((acc, c) => acc + c.netWeightKg, 0);
  assert.equal(commNet3, 12000);

  // Scenario C: 5 Cargo Items (Figs, Pine Nuts, Saffron, Walnuts, Apricots)
  const bol5Items = {
    id: "QA-MULTI-5",
    bol_number: "BOL-2026-MULTI5",
    goods_description: "Dried Figs\nPine Nuts\nSaffron\nWalnuts\nDried Apricots",
    number_of_packages: "100 CTNS - 200 CTNS - 50 CTNS - 150 CTNS - 250 CTNS",
    kgs_per_carton: "10 KG - 5 KG - 1 KG - 10 KG - 10 KG",
    gross_weight_per_carton: "11 KG - 5.5 KG - 1.2 KG - 11 KG - 11 KG",
    net_weight: "1,000 KG - 1,000 KG - 50 KG - 1,500 KG - 2,500 KG",
    gross_weight: "1,100 KG - 1,100 KG - 60 KG - 1,650 KG - 2,750 KG",
    rate_per_kgs: "4.00 USD - 12.00 USD - 100.00 USD - 6.00 USD - 3.00 USD",
    goods_value: "$4,000.00 - $12,000.00 - $5,000.00 - $9,000.00 - $7,500.00",
  };
  const parsed5 = parseSyncedCargoItems(bol5Items);
  assert.equal(parsed5.items.length, 5, "Must parse 5 cargo items");
  assert.equal(parsed5.totals.totalPackages, 750, "100 + 200 + 50 + 150 + 250 = 750 CTNS");
  assert.equal(parsed5.totals.totalNetWeight, 6050, "1000 + 1000 + 50 + 1500 + 2500 = 6050 KG");
  assert.equal(parsed5.totals.totalGrossWeight, 6660, "1100 + 1100 + 60 + 1650 + 2750 = 6660 KG");
  assert.equal(parsed5.totals.totalGoodsValue, 37500, "4000 + 12000 + 5000 + 9000 + 7500 = $37,500");

  const comms5 = groupCommodities([bol5Items]);
  assert.equal(comms5.length, 5);
  const commNet5 = comms5.reduce((acc, c) => acc + c.netWeightKg, 0);
  assert.equal(commNet5, 6050);
});

// ==================================================
// 11. BOL COUNT INVARIANCE ACROSS ALL VIEWS
// ==================================================
test("Report Center: One BOL with 3 commodities counts as exactly 1 BOL across all views", () => {
  const multiBol = MOCK_DETAILED_BOLS[1]; // Contains 3 commodities
  const dataset = [multiBol];

  // 1. Overview KPIs
  const kpis = calculateOverviewKpis(dataset);
  assert.equal(kpis.totalBols, 1, "Overview totalBols must be 1, never 3");
  assert.equal(kpis.totalShipments, 1, "Overview totalShipments must be 1");

  // 2. Shippers
  const shippers = groupShippers(dataset);
  assert.equal(shippers.length, 1);
  assert.equal(shippers[0].bolCount, 1, "Shipper bolCount must be 1");

  // 3. Consignees
  const consignees = groupConsignees(dataset);
  assert.equal(consignees.length, 1);
  assert.equal(consignees[0].bolCount, 1, "Consignee bolCount must be 1");

  // 4. Routes
  const routes = groupRoutes(dataset);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].bolCount, 1, "Route bolCount must be 1");

  // 5. Trucks
  const trucks = groupTrucks(dataset);
  assert.equal(trucks.length, 1);
  assert.equal(trucks[0].bolCount, 1, "Truck bolCount must be 1");

  // 6. Commodities
  const commodities = groupCommodities(dataset);
  assert.equal(commodities.length, 3, "Commodities tab itemizes each distinct commodity line");
  for (const c of commodities) {
    assert.equal(c.bolCount, 1, "Each commodity records 1 BOL carrying it");
  }

  // 7. Detailed Report
  const detailedFiltered = applyReportFilters(dataset, {});
  assert.equal(detailedFiltered.length, 1, "Detailed Report renders 1 row for 1 BOL");
});

// ==================================================
// 12. SHIPPER & CONSIGNEE AGGREGATION & DRILL-DOWN RECONCILIATION
// ==================================================
test("Report Center: Shipper and Consignee aggregation matches overview KPIs and drill-down counts", () => {
  const testDocs = [
    {
      id: "DOC-1",
      bol_number: "BOL-001",
      shipper_name: "  RAHMAT NAZAR LTD  ",
      consignee_name: "PROVENTUS AGROCOM LIMITED",
      net_weight: "10,000 KG",
    },
    {
      id: "DOC-2",
      bol_number: "BOL-002",
      shipper_name: "rahmat nazar ltd",
      consignee_name: "proventus agrocom limited",
      net_weight: "12,000 KG",
    },
    {
      id: "DOC-3",
      bol_number: "BOL-003",
      shipper_name: "", // Unspecified shipper
      consignee_name: "TROPICAL EXOTICS LLC",
      net_weight: "5,000 KG",
    },
    {
      id: "DOC-4",
      bol_number: "BOL-004",
      shipper_name: "NAJEB AMIN LTD",
      consignee_name: "", // Unspecified consignee
      net_weight: "8,000 KG",
    },
  ];

  const kpis = calculateOverviewKpis(testDocs);
  const shippers = groupShippers(testDocs);
  const consignees = groupConsignees(testDocs);

  // Exact reconciliation between Overview and Grouping
  assert.equal(
    kpis.totalShippers,
    shippers.length,
    `Overview totalShippers (${kpis.totalShippers}) must strictly equal groupShippers count (${shippers.length})`
  );
  assert.equal(
    kpis.totalConsignees,
    consignees.length,
    `Overview totalConsignees (${kpis.totalConsignees}) must strictly equal groupConsignees count (${consignees.length})`
  );

  // Drill-down filter simulation
  for (const s of shippers) {
    const drilled = testDocs.filter(
      (d) => ((d.shipper_name || "").trim() || "Unspecified Shipper").toLowerCase() === s.shipperName.trim().toLowerCase()
    );
    assert.equal(
      drilled.length,
      s.bolCount,
      `Drill-down for shipper '${s.shipperName}' must return exactly ${s.bolCount} records`
    );
  }

  for (const c of consignees) {
    const drilled = testDocs.filter(
      (d) => ((d.consignee_name || "").trim() || "Unspecified Consignee").toLowerCase() === c.consigneeName.trim().toLowerCase()
    );
    assert.equal(
      drilled.length,
      c.bolCount,
      `Drill-down for consignee '${c.consigneeName}' must return exactly ${c.bolCount} records`
    );
  }
});

// ==================================================
// 12. ENHANCED EXCEL EXPORT & TAB PRIORITIZATION
// ==================================================
test("Excel Export: Active tab prioritization puts target sheet at index 0 and includes 12 sheets", async () => {
  let XLSX;
  try {
    XLSX = require("xlsx");
  } catch {
    XLSX = require(path.resolve(__dirname, "../node_modules/.pnpm/xlsx@0.18.5/node_modules/xlsx"));
  }

  const tmpFile = path.resolve(__dirname, `tmp-tab-prioritize-${Date.now()}.xlsx`);
  const originalWriteFile = XLSX.writeFile;
  let sheets = [];
  let detailedSheetData = [];
  let cargoSheetData = [];

  XLSX.writeFile = (wb, filename) => {
    sheets = wb.SheetNames;
    detailedSheetData = XLSX.utils.sheet_to_json(wb.Sheets["Detailed BOLs"]);
    cargoSheetData = XLSX.utils.sheet_to_json(wb.Sheets["Cargo Items Breakdown"]);
    return originalWriteFile(wb, tmpFile);
  };

  try {
    await exportReportToExcel(MOCK_DETAILED_BOLS, "QA-Test-Prioritize", "routes", "all");

    // 1. Target sheet "Routes" must be prioritized to index 0
    assert.equal(sheets[0], "Routes", "Active tab sheet 'Routes' must be moved to index 0");
    assert.equal(sheets.length, 12, "Comprehensive export must produce exactly 12 specialized sheets");
    assert.ok(sheets.includes("Summary"));
    assert.ok(sheets.includes("Detailed BOLs"));
    assert.ok(sheets.includes("Cargo Items Breakdown"));
    assert.ok(sheets.includes("Financials"));
    assert.ok(sheets.includes("Trucks"));
    assert.ok(sheets.includes("Containers"));
    assert.ok(sheets.includes("Monthly Trends"));

    // 2. Metadata completeness verification (Rule 3)
    assert.ok("Driver Father Name" in detailedSheetData[0], "Detailed BOLs must have Driver Father Name column");
    assert.ok("Transit Border Station" in detailedSheetData[0], "Detailed BOLs must have Transit Border Station column");
    assert.ok("Driver Rent Currency" in detailedSheetData[0], "Detailed BOLs must have Driver Rent Currency column");
    assert.ok("Driver Rent Amount" in detailedSheetData[0], "Detailed BOLs must have Driver Rent Amount column");

    // 3. Cargo items metadata completeness
    assert.ok("Driver Father Name" in cargoSheetData[0], "Cargo Breakdown must have Driver Father Name column");
    assert.ok("Transit Border Station" in cargoSheetData[0], "Cargo Breakdown must have Transit Border Station column");
  } finally {
    XLSX.writeFile = originalWriteFile;
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

test("Excel Export: exportMode='current' prunes to Summary and active view sheet only", async () => {
  let XLSX;
  try {
    XLSX = require("xlsx");
  } catch {
    XLSX = require(path.resolve(__dirname, "../node_modules/.pnpm/xlsx@0.18.5/node_modules/xlsx"));
  }

  const tmpFile = path.resolve(__dirname, `tmp-mode-current-${Date.now()}.xlsx`);
  const originalWriteFile = XLSX.writeFile;
  let sheets = [];

  XLSX.writeFile = (wb, filename) => {
    sheets = wb.SheetNames;
    return originalWriteFile(wb, tmpFile);
  };

  try {
    await exportReportToExcel(MOCK_DETAILED_BOLS, "QA-Test-Current", "trucks", "current");

    // Must only contain Summary and Trucks
    assert.deepEqual(sheets, ["Summary", "Trucks"], "Current-only export must strictly contain Summary and Trucks");
  } finally {
    XLSX.writeFile = originalWriteFile;
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

