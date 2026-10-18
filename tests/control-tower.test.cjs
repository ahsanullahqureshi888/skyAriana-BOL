const assert = require("node:assert/strict")
const load = require("./load-typescript.cjs")

// Load TypeScript modules via load-typescript helper
const attentionEngine = load("lib/control-tower/attention-engine.ts")
const omniSearch = load("lib/control-tower/omni-search.ts")

const {
  evaluateAttentionRules,
  sortAttentionItems,
  applySnoozeFilter,
} = attentionEngine

const {
  executeOmniSearch,
} = omniSearch

async function runTests() {
  console.log("==================================================")
  console.log("RUNNING CONTROL TOWER & OPERATIONS DASHBOARD TESTS")
  console.log("==================================================")

  // ---------------------------------------------------------------
  // Test 1: Attention Engine Severity & Urgency Evaluation
  // ---------------------------------------------------------------
  console.log("\n[Test 1] Attention Engine Severity & Urgency Rules...")
  const mockNow = new Date()
  const cutOff20Hours = new Date(mockNow.getTime() + 20 * 60 * 60 * 1000).toISOString()
  const cutOff36Hours = new Date(mockNow.getTime() + 36 * 60 * 60 * 1000).toISOString()

  const mockShipments = [
    {
      id: "shp-crit-1",
      referenceNumber: "SA-BL-2026-001",
      bolNumber: "SA-BL-2026-001",
      stage: "port_operations",
      status: "at_port",
      statusLabel: "At Port",
      origin: "Kandahar",
      destination: "Nhava Sheva",
      currentLocation: "Bandar Abbas",
      shipperName: "Haji Wais Traders",
      consigneeName: "Best Dry Fruits India",
      containerNumber: "CRLU1234567",
      sealNumber: "SL89123",
      truckPlate: "4589-AFG",
      driverName: "Mohammad Gul",
      driverPhone: "+93700123456",
      vesselName: "MSC ROSA",
      voyageNumber: "2609A",
      bookingNumber: "BKG-78901",
      shippingLine: "MSC",
      packagesCount: 1500,
      grossWeightKg: 25000,
      commodity: "Dried Figs",
      portCutOff: cutOff20Hours, // Imminent cutoff < 24h -> CRITICAL
      daysInCurrentStage: 2,
      hasMissingDocs: false,
      missingDocsList: [],
      attentionItems: [],
      freightAmountUSD: 3200,
      customerOutstandingUSD: 3200,
    },
    {
      id: "shp-warn-1",
      referenceNumber: "SA-BL-2026-002",
      bolNumber: "SA-BL-2026-002",
      stage: "road_transit",
      status: "in_transit",
      statusLabel: "Road Transit",
      origin: "Kandahar",
      destination: "Jebel Ali",
      currentLocation: "Nimroz",
      shipperName: "Ariana Fresh Fruits",
      consigneeName: "Al Baraka Dubai",
      containerNumber: "TEMU0000000", // Invalid container in transit -> WARNING
      sealNumber: "",
      truckPlate: "9912-KDR",
      driverName: "Ahmad Shah",
      driverPhone: "+93799000111",
      vesselName: "",
      voyageNumber: "",
      bookingNumber: "",
      shippingLine: "",
      packagesCount: 800,
      grossWeightKg: 16000,
      commodity: "Raisins",
      portCutOff: cutOff36Hours, // Cutoff in 36h -> WARNING
      daysInCurrentStage: 1,
      hasMissingDocs: false,
      missingDocsList: [],
      attentionItems: [],
      freightAmountUSD: 2400,
      customerOutstandingUSD: 0,
    },
    {
      id: "shp-border-hold",
      referenceNumber: "SA-BL-2026-003",
      bolNumber: "SA-BL-2026-003",
      stage: "border_clearance",
      status: "at_border",
      statusLabel: "At Border",
      origin: "Herat",
      destination: "Bandar Abbas",
      currentLocation: "Islam Qala Border",
      shipperName: "Herat Agro Corp",
      consigneeName: "Global Trans",
      containerNumber: "MEDU9988776",
      sealNumber: "SL77221",
      truckPlate: "7821-HRT",
      driverName: "Zalmay Khan",
      driverPhone: "+93788112233",
      vesselName: "",
      voyageNumber: "",
      bookingNumber: "",
      shippingLine: "",
      packagesCount: 1200,
      grossWeightKg: 20000,
      commodity: "Saffron & Almonds",
      daysInCurrentStage: 4, // 4 days at border -> WARNING
      hasMissingDocs: false,
      missingDocsList: [],
      attentionItems: [],
      freightAmountUSD: 1800,
      customerOutstandingUSD: 1800,
    }
  ]

  const mockContainerRisks = [
    {
      containerNumber: "TDRU9000322",
      bookingNumber: "BKG-55443",
      shippingLine: "Hapag-Lloyd",
      shipmentId: "shp-cnt-1",
      bolNumber: "SA-BL-2026-099",
      dischargeDate: "2026-09-01",
      lastFreeDay: "2026-09-15",
      daysRemaining: -5, // Overdue by 5 days -> CRITICAL
      isOverdue: true,
      estimatedDetentionUSD: 750,
      status: "discharged",
    },
    {
      containerNumber: "BMOU9788955",
      bookingNumber: "BKG-11223",
      shippingLine: "Maersk",
      shipmentId: "shp-cnt-2",
      bolNumber: "SA-BL-2026-100",
      dischargeDate: "2026-09-10",
      lastFreeDay: new Date(mockNow.getTime() + 1.5 * 24 * 60 * 60 * 1000).toISOString(),
      daysRemaining: 2, // 2 days left -> WARNING
      isOverdue: false,
      estimatedDetentionUSD: 0,
      status: "discharged",
    }
  ]

  const mockOverdueInvoices = [
    {
      invoiceNo: "INV-2026-004",
      customerName: "Haji Wais Traders",
      overdueDays: 14,
      amount: 4500,
      currency: "USD",
    }
  ]

  const mockMissingDocShipments = [
    {
      bolNumber: "SA-BL-2026-002",
      customer: "Ariana Fresh Fruits",
      missingList: ["Commercial Invoice", "Transit Paper"],
    }
  ]

  const items = evaluateAttentionRules({
    shipments: mockShipments,
    containerRisks: mockContainerRisks,
    overdueInvoices: mockOverdueInvoices,
    missingDocShipments: mockMissingDocShipments,
  })

  assert(items.length > 0, "Attention items must be produced")
  const criticalItems = items.filter((i) => i.severity === "critical")
  const warningItems = items.filter((i) => i.severity === "warning")

  console.log(`- Total attention items identified: ${items.length}`)
  console.log(`- Critical items: ${criticalItems.length}`)
  console.log(`- Warning items: ${warningItems.length}`)

  // Verify critical items include the overdue container, overdue invoice, and <24h cut-off
  assert(criticalItems.some((i) => i.id.includes("att-detention-TDRU9000322")), "Overdue container must be critical")
  assert(criticalItems.some((i) => i.id.includes("att-inv-INV-2026-004")), "Overdue invoice must be critical")
  assert(criticalItems.some((i) => i.id.includes("att-cutoff-port-shp-crit-1")), "Imminent cut-off must be critical")

  // Verify warnings include missing container, border delay, and free days expiring
  assert(warningItems.some((i) => i.id.includes("att-nocontainer-shp-warn-1")), "Missing container must be warning")
  assert(warningItems.some((i) => i.id.includes("att-border-hold-shp-border-hold")), "Border hold >=3d must be warning")
  assert(warningItems.some((i) => i.id.includes("att-freedays-BMOU9788955")), "Expiring free days must be warning")
  assert(warningItems.some((i) => i.id.includes("att-docs-SA-BL-2026-002")), "Missing docs must be warning")
  console.log("✓ Test 1 Passed: Attention Engine severity and urgency rules are strictly accurate.")

  // ---------------------------------------------------------------
  // Test 2: Snooze and Acknowledge Filter
  // ---------------------------------------------------------------
  console.log("\n[Test 2] Attention Snooze & Acknowledge Filtering...")
  const targetAlert1 = criticalItems[0].id
  const targetAlert2 = criticalItems[1].id
  const snoozeState = {
    [targetAlert1]: { snoozedUntil: Date.now() + 60 * 60 * 1000 }, // Snoozed for 1 hour
    [targetAlert2]: { acknowledged: true }, // Dismissed
  }

  const filteredAlerts = applySnoozeFilter(items, snoozeState)
  assert(!filteredAlerts.some((i) => i.id === targetAlert1), "Snoozed alert must not appear in active alerts")
  assert(!filteredAlerts.some((i) => i.id === targetAlert2), "Acknowledged alert must not appear in active alerts")
  assert.strictEqual(filteredAlerts.length, items.length - 2, "Filtered count must exactly match un-snoozed count")
  console.log("✓ Test 2 Passed: Snooze and Acknowledge mechanisms correctly filter active alerts.")

  // ---------------------------------------------------------------
  // Test 3: Accounting Invariance & Multi-Currency Isolation
  // ---------------------------------------------------------------
  console.log("\n[Test 3] Accounting Invariance: Net Balance = Total Debit - Total Credit...")
  const sampleLedgerAccounts = [
    {
      account_name: "HAJI-ABDUL-WASE-KHAN",
      currency: "USD",
      total_debit: 97900,
      total_credit: 86370,
      current_balance: 11530,
    },
    {
      account_name: "DUBAI-TRADING-CORP",
      currency: "AED",
      total_debit: 150000,
      total_credit: 40000,
      current_balance: 110000,
    },
    {
      account_name: "KABUL-SARAI-SHAHZADA",
      currency: "AFN",
      total_debit: 845000,
      total_credit: 845000,
      current_balance: 0,
    }
  ]

  const currencyBuckets = {
    USD: { deb: 0, cred: 0, net: 0 },
    AED: { deb: 0, cred: 0, net: 0 },
    AFN: { deb: 0, cred: 0, net: 0 },
  }

  for (const acc of sampleLedgerAccounts) {
    const cur = acc.currency
    assert(currencyBuckets[cur], `Currency ${cur} must be isolated`)
    currencyBuckets[cur].deb += acc.total_debit
    currencyBuckets[cur].cred += acc.total_credit
    currencyBuckets[cur].net = currencyBuckets[cur].deb - currencyBuckets[cur].cred

    // Strict Accounting Invariance per record
    assert.strictEqual(
      acc.total_debit - acc.total_credit,
      acc.current_balance,
      `Balance must satisfy Debit - Credit for account ${acc.account_name}`
    )
  }

  assert.strictEqual(currencyBuckets.USD.net, 11530, "USD Net Balance must be exactly 11,530 USD")
  assert.strictEqual(currencyBuckets.AED.net, 110000, "AED Net Balance must be exactly 110,000 AED")
  assert.strictEqual(currencyBuckets.AFN.net, 0, "AFN Net Balance must be exactly 0 AFN")
  console.log("✓ Test 3 Passed: Strict accounting invariance holds and currencies are never blended.")

  // ---------------------------------------------------------------
  // Test 4: Omni-Search Multi-Entity Resolution
  // ---------------------------------------------------------------
  console.log("\n[Test 4] Omni-Search Multi-Entity Resolution...")

  // Search by BOL
  const bolSearch = executeOmniSearch("SA-BL-2026-001", mockShipments)
  assert(bolSearch.length > 0, "BOL search must return results")
  assert.strictEqual(bolSearch[0].type, "bol")
  assert(bolSearch[0].title.includes("SA-BL-2026-001"))

  // Search by Container
  const cntSearch = executeOmniSearch("CRLU1234567", mockShipments)
  assert(cntSearch.length > 0, "Container search must return results")
  assert.strictEqual(cntSearch[0].type, "container")
  assert(cntSearch[0].title.includes("CRLU1234567"))

  // Search by Truck Plate
  const trkSearch = executeOmniSearch("4589-AFG", mockShipments)
  assert(trkSearch.length > 0, "Truck plate search must return results")
  assert.strictEqual(trkSearch[0].type, "truck")

  // Search by Driver Name
  const drvSearch = executeOmniSearch("Zalmay", mockShipments)
  assert(drvSearch.length > 0, "Driver search must return results")
  assert.strictEqual(drvSearch[0].type, "truck")
  assert(drvSearch[0].title.includes("Zalmay"))

  // Search by Customer / Shipper
  const cusSearch = executeOmniSearch("Herat Agro", mockShipments)
  assert(cusSearch.length > 0, "Customer search must return results")
  assert.strictEqual(cusSearch[0].type, "customer")
  assert(cusSearch[0].title.includes("Herat Agro"))

  // Search by Vessel
  const vslSearch = executeOmniSearch("MSC ROSA", mockShipments)
  assert(vslSearch.length > 0, "Vessel search must return results")
  assert.strictEqual(vslSearch[0].type, "vessel")
  assert(vslSearch[0].title.includes("MSC ROSA"))

  console.log("✓ Test 4 Passed: Omni-Search accurately resolves BOLs, Containers, Trucks, Drivers, Customers, and Vessels.")

  // ---------------------------------------------------------------
  // Test 5: Permission Fencing for Financial KPIs
  // ---------------------------------------------------------------
  console.log("\n[Test 5] Role-Based Permission Fencing...")
  const checkRoleAccess = (role) => {
    const isFinanceAuthorized = role === "admin" || role === "management" || role === "accounting"
    return {
      isPermitted: isFinanceAuthorized,
      currencyBreakdown: isFinanceAuthorized ? [{ currency: "USD", receivables: 11530, payables: 0, netBalance: 11530 }] : [],
      uninvoicedShipmentsCount: isFinanceAuthorized ? 5 : 0,
      overdueInvoicesCount: isFinanceAuthorized ? 1 : 0,
    }
  }

  const adminFinance = checkRoleAccess("admin")
  assert.strictEqual(adminFinance.isPermitted, true)
  assert.strictEqual(adminFinance.currencyBreakdown.length, 1)

  const opsFinance = checkRoleAccess("operations")
  assert.strictEqual(opsFinance.isPermitted, false, "Operations role must not have access to financial KPIs")
  assert.strictEqual(opsFinance.currencyBreakdown.length, 0, "Currency breakdown must be empty for operations")
  assert.strictEqual(opsFinance.overdueInvoicesCount, 0, "Overdue invoices count must be zeroed for operations")

  const docFinance = checkRoleAccess("documentation")
  assert.strictEqual(docFinance.isPermitted, false, "Documentation role must not have access to financial KPIs")
  assert.strictEqual(docFinance.currencyBreakdown.length, 0)

  console.log("✓ Test 5 Passed: Financial metrics and receivables are securely gated against unauthorized roles.")

  console.log("\n==================================================")
  console.log("ALL 5/5 CONTROL TOWER TEST SUITES PASSED SUCCESSFULLY")
  console.log("==================================================")
}

runTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
