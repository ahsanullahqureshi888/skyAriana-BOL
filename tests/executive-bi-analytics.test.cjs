/**
 * Sky Ariana Logistics — Executive BI, KPI & Analytics Center Test Suite
 * Phase 27: Executive Intelligence, KPI Semantics, Multi-Currency Segregation,
 * Accounting Invariance, RBAC Sanitization & Drilldown Integrity
 */

const { test, describe, before } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const fs = require("node:fs/promises")
const fsSync = require("node:fs")

const loadTypescript = require("./load-typescript.cjs")

describe("Phase 27: Executive BI, KPI & Analytics Center", () => {
  let biService
  let kpiRegistryModule
  let KPI_REGISTRY
  let formatKpiValue
  let computeSafePercentageChange

  before(() => {
    kpiRegistryModule = loadTypescript("lib/analytics/kpi-registry.ts")
    KPI_REGISTRY = kpiRegistryModule.KPI_REGISTRY
    formatKpiValue = kpiRegistryModule.formatKpiValue
    computeSafePercentageChange = kpiRegistryModule.computeSafePercentageChange

    biService = loadTypescript("lib/analytics/executive-bi-service.ts")
  })

  // Test 1: Canonical KPI Registry Completeness & Semantics
  test("Test 1: Canonical KPI registry contains all required executive metrics with strict formulas", () => {
    assert.ok(KPI_REGISTRY, "KPI_REGISTRY must be defined")

    const expectedKpis = [
      "ACTIVE_SHIPMENTS",
      "DELIVERED_SHIPMENTS",
      "SERVICE_REVENUE",
      "DIRECT_SHIPMENT_COST",
      "SHIPMENT_GROSS_MARGIN",
      "GROSS_MARGIN_PERCENT",
      "ACTIVE_CONTAINERS",
      "ACTIVE_TRUCKS",
      "BORDER_CLEARANCE_TURNAROUND",
      "QUOTE_CONVERSION_RATE",
      "OVERDUE_RECEIVABLES",
      "OVERDUE_PAYABLES",
      "OPEN_CLAIMS",
      "UNPOSTED_DOCS",
      "OPERATIONAL_ATTENTION_COUNT",
    ]

    for (const code of expectedKpis) {
      const def = KPI_REGISTRY[code]
      assert.ok(def, `KPI ${code} must be registered`)
      assert.ok(def.formula, `KPI ${code} must have an explicit calculation formula`)
      assert.ok(def.dateBasis, `KPI ${code} must declare its chronological date basis`)
      assert.ok(def.title && def.titleFa, `KPI ${code} must have bilingual English & Dari/Pashto titles`)
    }
  })

  // Test 2: Formatting & Safe Zero-Division Handling
  test("Test 2: Formatter and safe percentage change prevent NaN and Infinity", () => {
    // Null / NaN handling
    assert.equal(formatKpiValue(null, "currency"), "N/A")
    assert.equal(formatKpiValue(undefined, "number"), "N/A")
    assert.equal(formatKpiValue(NaN, "percentage"), "N/A")

    // Valid formats
    assert.equal(formatKpiValue(1500, "number"), "1,500")
    assert.equal(formatKpiValue(25.4, "percentage"), "25.4%")
    assert.equal(formatKpiValue(3.5, "days"), "3.5 days")
    assert.equal(formatKpiValue(10000, "currency", "USD"), "USD 10,000")

    // Zero-division percentage change
    const fromZero = computeSafePercentageChange(45, 0)
    assert.equal(fromZero.percent, null)
    assert.equal(fromZero.text, "New Activity")
    assert.equal(fromZero.trend, "up")

    const zeroToZero = computeSafePercentageChange(0, 0)
    assert.equal(zeroToZero.percent, 0)
    assert.equal(zeroToZero.text, "0.0%")
    assert.equal(zeroToZero.trend, "flat")

    const standardGrowth = computeSafePercentageChange(120, 100)
    assert.equal(standardGrowth.percent, 20.0)
    assert.equal(standardGrowth.text, "+20.0%")
    assert.equal(standardGrowth.trend, "up")

    const standardDrop = computeSafePercentageChange(80, 100)
    assert.equal(standardDrop.percent, -20.0)
    assert.equal(standardDrop.text, "-20.0%")
    assert.equal(standardDrop.trend, "down")
  })

  // Test 3: Accounting Invariance Identity
  test("Test 3: Accounting Invariance strictly satisfied: Shipment Gross Margin = Service Revenue - Direct Shipment Costs", async () => {
    const filters = {
      period: "this_month",
      comparison: "prev_month",
    }

    const payload = await biService.getExecutiveBiData(filters, "admin")
    assert.ok(payload, "Payload must be returned")
    assert.ok(payload.financialSummary, "Financial summary must be present")

    const fin = payload.financialSummary
    const expectedMarginUSD = fin.serviceRevenueUSD - fin.directShipmentCostUSD

    assert.equal(
      fin.shipmentGrossMarginUSD,
      expectedMarginUSD,
      `Net margin invariance violated: ${fin.shipmentGrossMarginUSD} !== ${expectedMarginUSD}`
    )

    // Verify corridor performance invariance
    for (const corridor of payload.routeCorridorPerformance) {
      if (corridor.totalRevenueUSD !== undefined && corridor.totalCostUSD !== undefined) {
        const expectedCorridorMargin = corridor.totalRevenueUSD - corridor.totalCostUSD
        assert.equal(
          corridor.grossMarginUSD,
          expectedCorridorMargin,
          `Corridor ${corridor.corridorKey} margin must equal Revenue - Cost`
        )
      }
    }

    // Verify customer performance invariance
    for (const cust of payload.customerPerformance) {
      if (cust.revenueUSD !== undefined && cust.marginUSD !== undefined) {
        const impliedCost = cust.revenueUSD - cust.marginUSD
        assert.ok(
          impliedCost >= 0,
          `Customer ${cust.customerName} cost cannot be negative`
        )
      }
    }
  })

  // Test 4: Cargo Commercial Goods Value Strictly Excluded from Service Revenue
  test("Test 4: Cargo commercial invoice goods value is NEVER added to company service revenue", async () => {
    const filters = { period: "this_month" }
    const payload = await biService.getExecutiveBiData(filters, "admin")

    // Fetch raw shipments to check commercial values
    const rawShipmentsPath = path.resolve(__dirname, "../.local-shipments.json")
    let totalCommercialValue = 0
    if (fsSync.existsSync(rawShipmentsPath)) {
      const shipments = JSON.parse(await fs.readFile(rawShipmentsPath, "utf-8"))
      for (const s of shipments) {
        totalCommercialValue += Number(s.goods_value || s.customs_declared_value || 0)
      }
    }

    if (totalCommercialValue > 0) {
      // Service revenue must NOT simply equal or bundle commercial cargo value
      assert.notEqual(
        payload.financialSummary.serviceRevenueUSD,
        totalCommercialValue,
        "Commercial cargo value must never be counted as company service revenue"
      )
    }
  })

  // Test 5: Multi-Currency Segregation
  test("Test 5: Segregated currency buckets maintained for USD, AFN, and AED", async () => {
    const filters = { period: "this_year", currencyMode: "segregated" }
    const payload = await biService.getExecutiveBiData(filters, "admin")

    const revBuckets = payload.financialSummary.revenueByCurrency
    const costBuckets = payload.financialSummary.directCostByCurrency

    assert.ok(revBuckets, "Revenue by currency buckets must exist")
    assert.ok(costBuckets, "Cost by currency buckets must exist")

    // Segregated buckets must have explicit currencies and non-negative numbers
    for (const c of ["USD", "AFN", "AED"]) {
      if (revBuckets[c]) {
        assert.equal(typeof revBuckets[c].amount, "number")
        assert.ok(revBuckets[c].amount >= 0)
      }
      if (costBuckets[c]) {
        assert.equal(typeof costBuckets[c].amount, "number")
        assert.ok(costBuckets[c].amount >= 0)
      }
    }
  })

  // Test 6: Operational Attention Queue Detection
  test("Test 6: Operational attention queue identifies critical bottlenecks and orders by severity", async () => {
    const filters = { period: "this_month" }
    const payload = await biService.getExecutiveBiData(filters, "admin")

    assert.ok(Array.isArray(payload.operationalAttentionQueue), "Attention queue must be an array")

    for (const item of payload.operationalAttentionQueue) {
      assert.ok(item.id, "Attention item must have an id")
      assert.ok(["critical", "warning", "info"].includes(item.severity), "Severity must be critical, warning, or info")
      assert.ok(item.category, "Attention item must have a category")
      assert.ok(item.title, "Attention item must have a title")
      assert.ok(item.recommendedAction, "Attention item must have a recommended action")
    }

    // Verify critical items are ordered ahead of non-critical items
    if (payload.operationalAttentionQueue.length >= 2) {
      const firstIsCritical = payload.operationalAttentionQueue[0].severity === "critical"
      const lastIsCritical = payload.operationalAttentionQueue[payload.operationalAttentionQueue.length - 1].severity === "critical"
      if (!firstIsCritical && lastIsCritical) {
        assert.fail("Critical attention items must be sorted to the top of the queue")
      }
    }
  })

  // Test 7: RBAC Server-Side Data Sanitization
  test("Test 7: Server-side RBAC sanitizes financial figures for operations and non-finance roles", async () => {
    const filters = { period: "this_month" }

    // Query as Operations Staff (No financial access)
    const opsPayload = await biService.getExecutiveBiData(filters, "operations")

    assert.equal(
      opsPayload.financialSummary.isFinanceRedacted,
      true,
      "isFinanceRedacted must be true for operations staff"
    )
    assert.equal(
      opsPayload.financialSummary.serviceRevenueUSD,
      undefined,
      "serviceRevenueUSD must be undefined for operations staff"
    )
    assert.equal(
      opsPayload.financialSummary.shipmentGrossMarginUSD,
      undefined,
      "shipmentGrossMarginUSD must be undefined for operations staff"
    )

    // Check that financial KPI cards have restricted badges
    const finCard = opsPayload.kpiScorecard.find((k) => k.id === "kpi-service-revenue")
    if (finCard) {
      assert.equal(finCard.isRedacted, true, "Revenue KPI card must be redacted")
      assert.equal(finCard.value, "Restricted", "Value must be 'Restricted'")
    }

    const marginCard = opsPayload.kpiScorecard.find((k) => k.id === "kpi-gross-margin")
    if (marginCard) {
      assert.equal(marginCard.isRedacted, true, "Margin KPI card must be redacted")
      assert.equal(marginCard.value, "Restricted", "Value must be 'Restricted'")
    }

    // Query as Administrator (Full financial access)
    biService.invalidateAnalyticsCache()
    const adminPayload = await biService.getExecutiveBiData(filters, "admin")

    assert.equal(
      adminPayload.financialSummary.isFinanceRedacted,
      false,
      "isFinanceRedacted must be false for admin"
    )
    assert.equal(
      typeof adminPayload.financialSummary.serviceRevenueUSD,
      "number",
      "serviceRevenueUSD must be a number for admin"
    )
  })

  // Test 8: Underlying Drilldown Record Resolver
  test("Test 8: Drilldown record resolver returns canonical records for specific KPIs", async () => {
    const filters = { period: "this_month" }

    // Drilldown for Service Revenue returns invoices
    const revRecords = await biService.getExecutiveDrilldown("SERVICE_REVENUE", filters)
    assert.ok(Array.isArray(revRecords), "Revenue drilldown must return an array")
    if (revRecords.length > 0) {
      const first = revRecords[0]
      assert.equal(first.recordType, "invoice")
      assert.ok(first.referenceId)
      assert.ok(typeof first.amount === "number")
    }

    // Drilldown for Direct Cost returns supplier bills
    const costRecords = await biService.getExecutiveDrilldown("DIRECT_SHIPMENT_COST", filters)
    assert.ok(Array.isArray(costRecords), "Cost drilldown must return an array")
    if (costRecords.length > 0) {
      const first = costRecords[0]
      assert.equal(first.recordType, "supplier_bill")
      assert.ok(first.referenceId)
    }

    // Drilldown for Active Shipments returns shipments
    const shpRecords = await biService.getExecutiveDrilldown("ACTIVE_SHIPMENTS", filters)
    assert.ok(Array.isArray(shpRecords), "Active shipments drilldown must return an array")
    if (shpRecords.length > 0) {
      const first = shpRecords[0]
      assert.equal(first.recordType, "shipment")
      assert.ok(first.referenceId)
    }
  })
})
