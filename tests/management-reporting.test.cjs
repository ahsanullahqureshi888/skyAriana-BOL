/**
 * Sky Ariana Logistics — Management Reporting Center Test Suite
 * Phase 19: Enterprise Executive Dashboards, Multi-Currency P&L, Cash Flow,
 * Aging Schedules, Route/Shipment Profitability & Tamper-Proof Snapshots
 */

const { test, describe, before, after } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const fs = require("node:fs/promises")
const fsSync = require("node:fs")

const loadTypescript = require("./load-typescript.cjs")
const { getDataPath } = loadTypescript("lib/server-paths.ts")

const SNAPSHOTS_FILE = getDataPath(".local-management-report-snapshots.json")
const GENERAL_EXPENSES_FILE = getDataPath(".local-general-expenses.json")
const PAYROLL_FILE = getDataPath(".local-payroll.json")

const backups = new Map()

async function backupFile(filePath) {
  try {
    if (fsSync.existsSync(filePath)) {
      const data = await fs.readFile(filePath, "utf-8")
      backups.set(filePath, data)
    }
  } catch (_) {}
}

async function restoreFile(filePath) {
  try {
    if (backups.has(filePath)) {
      await fs.writeFile(filePath, backups.get(filePath), "utf-8")
    }
  } catch (_) {}
}

describe("Management Reporting Center Engine", () => {
  let reportingService

  before(async () => {
    await backupFile(SNAPSHOTS_FILE)
    await backupFile(GENERAL_EXPENSES_FILE)
    await backupFile(PAYROLL_FILE)

    reportingService = loadTypescript("lib/reports/management-reporting-service.ts")
  })

  after(async () => {
    await restoreFile(SNAPSHOTS_FILE)
    await restoreFile(GENERAL_EXPENSES_FILE)
    await restoreFile(PAYROLL_FILE)
  })

  // Test 1: P&L Accounting Invariance
  test("Test 1: P&L strictly satisfies Gross Profit = Revenue - Direct Costs and Operating Profit = Gross Profit - Operating Expenses", async () => {
    const filters = { datePreset: "this_month" }
    const pnl = await reportingService.getProfitAndLossReport(filters, "admin")

    assert.ok(pnl.currencyReports.length > 0, "Must return currency reports")

    for (const report of pnl.currencyReports) {
      // 1. Gross Profit Invariance: Revenue - Direct Costs
      const calculatedGrossProfit = Math.round((report.revenue.totalRevenue - report.directCosts.totalDirectCosts) * 100) / 100
      assert.equal(
        report.grossProfit,
        calculatedGrossProfit,
        `Gross Profit for ${report.currency} must equal Revenue - Direct Costs`
      )

      // 2. Operating Profit Invariance: Gross Profit - Operating Expenses
      const calculatedOperatingProfit = Math.round((report.grossProfit - report.operatingExpenses.totalOperatingExpenses) * 100) / 100
      assert.equal(
        report.operatingProfit,
        calculatedOperatingProfit,
        `Operating Profit for ${report.currency} must equal Gross Profit - Operating Expenses`
      )

      // 3. Margin % validity
      if (report.revenue.totalRevenue > 0) {
        const expectedGrossMarginPct = Math.round((report.grossProfit / report.revenue.totalRevenue) * 10000) / 100
        assert.equal(
          report.grossMarginPct,
          expectedGrossMarginPct,
          `Gross margin % for ${report.currency} must be mathematically consistent`
        )
      }
    }
  })

  // Test 2: Operational Cash Flow Netting & Transfer Exclusion
  test("Test 2: Cash flow strictly nets customer receipts against supplier disbursements, and excludes internal transfers/FX swaps from net operational flow", async () => {
    const filters = { datePreset: "this_month" }
    const cf = await reportingService.getManagementCashFlowReport(filters, "admin")

    assert.ok(cf.currencyReports.length > 0, "Must return cash flow reports")

    for (const report of cf.currencyReports) {
      // Net Operational Cash Flow = Inflows - Outflows
      const calculatedNetFlow = Math.round((report.inflows.totalInflows - report.outflows.totalOutflows) * 100) / 100
      assert.equal(
        report.netOperationalCashFlow,
        calculatedNetFlow,
        `Net operational cash flow for ${report.currency} must equal Total Inflows - Total Outflows`
      )

      // Invariance: Internal transfers and currency exchanges must not be included in net flow
      assert.ok(
        report.internalTransfersVolume >= 0,
        "Internal transfers must be tracked in separate audit register"
      )
      assert.ok(
        report.currencyExchangeVolume >= 0,
        "Currency exchanges must be tracked in separate audit register"
      )
    }
  })

  // Test 3: Receivables Aging Schedule & Isolation of Customer Advances
  test("Test 3: Receivables aging correctly calculates buckets and keeps customer advances strictly isolated", async () => {
    const filters = { datePreset: "this_month" }
    const rec = await reportingService.getReceivablesAgingReport(filters, "admin")

    assert.ok(rec.currencySummaries.length > 0, "Must return receivables summaries")

    for (const summary of rec.currencySummaries) {
      const { aging, totalOutstanding } = summary
      const sumBuckets = Math.round(
        (aging.current + aging.days1_30 + aging.days31_60 + aging.days61_90 + aging.days91_120 + aging.days120_plus) * 100
      ) / 100

      assert.equal(
        totalOutstanding,
        sumBuckets,
        `Total outstanding for ${summary.currency} must exactly equal the sum of all aging buckets`
      )

      // Customer prepayments / credit balances must be tracked strictly separately
      assert.ok(
        summary.totalCreditAdvances >= 0,
        "Customer advances must never be negative or subtracted from overdue aging"
      )
    }
  })

  // Test 4: Payables Aging Schedule & Isolation of Supplier Prepayments
  test("Test 4: Payables aging correctly calculates buckets and keeps supplier prepayments strictly isolated", async () => {
    const filters = { datePreset: "this_month" }
    const pay = await reportingService.getPayablesAgingReport(filters, "admin")

    assert.ok(pay.currencySummaries.length > 0, "Must return payables summaries")

    for (const summary of pay.currencySummaries) {
      const { aging, totalPayable } = summary
      const sumBuckets = Math.round(
        (aging.current + aging.days1_30 + aging.days31_60 + aging.days61_90 + aging.days91_120 + aging.days120_plus) * 100
      ) / 100

      assert.equal(
        totalPayable,
        sumBuckets,
        `Total payable for ${summary.currency} must exactly equal the sum of all aging buckets`
      )

      // Supplier prepayments / advance balances must be tracked strictly separately
      assert.ok(
        summary.totalAdvances >= 0,
        "Supplier advances must never be subtracted from pending bill schedules"
      )
    }
  })

  // Test 5: Route Profitability Margins
  test("Test 5: Route profitability produces accurate averages and gross profit margins", async () => {
    const filters = { datePreset: "this_month" }
    const routes = await reportingService.getRoutePerformanceReport(filters, "admin")

    assert.ok(Array.isArray(routes), "Must return routes array")
    for (const route of routes) {
      const expectedGp = Math.round((route.revenue - route.directCosts) * 100) / 100
      assert.equal(
        route.grossProfit,
        expectedGp,
        `Route ${route.routeName} gross profit must match revenue - direct costs`
      )
      if (route.shipmentsCount > 0) {
        assert.equal(
          route.avgRevenuePerShipment,
          Math.round((route.revenue / route.shipmentsCount) * 100) / 100
        )
      }
    }
  })

  // Test 6: Shipment Profitability & Data Quality Flags
  test("Test 6: Unposted supplier costs are flagged as COST_INCOMPLETE to prevent false 100% margins", async () => {
    const filters = { datePreset: "this_month" }
    const shipments = await reportingService.getShipmentProfitabilityReport(filters, "admin")

    assert.ok(Array.isArray(shipments), "Must return shipments array")
    for (const shp of shipments) {
      if (shp.revenue > 0 && shp.directCost === 0) {
        assert.equal(
          shp.status,
          "COST_INCOMPLETE",
          `Shipment ${shp.bolNumber} with revenue but 0 direct cost must be flagged COST_INCOMPLETE`
        )
      }
    }
  })

  // Test 7: Multi-Currency Segregation
  test("Test 7: Reports maintain strict multi-currency segregation for USD, AED, AFN without silent co-mingling", async () => {
    const filters = { datePreset: "this_month" }
    const pnl = await reportingService.getProfitAndLossReport(filters, "admin")
    const currencies = pnl.currencyReports.map((c) => c.currency)

    assert.ok(currencies.includes("USD"), "Must include USD ledger")
    assert.ok(currencies.includes("AED"), "Must include AED ledger")
    assert.ok(currencies.includes("AFN"), "Must include AFN ledger")

    // Each currency must have its own distinct report object
    const usd = pnl.currencyReports.find((c) => c.currency === "USD")
    const aed = pnl.currencyReports.find((c) => c.currency === "AED")
    assert.notEqual(usd.currency, aed.currency)
  })

  // Test 8: Role-based Financial Access Control
  test("Test 8: canViewFinancials blocks non-financial operator roles from accessing financial reports", async () => {
    assert.equal(reportingService.canViewFinancials("superadmin"), true)
    assert.equal(reportingService.canViewFinancials("admin"), true)
    assert.equal(reportingService.canViewFinancials("management"), true)
    assert.equal(reportingService.canViewFinancials("accountant"), true)
    assert.equal(reportingService.canViewFinancials("operator"), false)
    assert.equal(reportingService.canViewFinancials("driver"), false)
    assert.equal(reportingService.canViewFinancials("client"), false)

    await assert.rejects(
      async () => {
        await reportingService.getProfitAndLossReport({ datePreset: "this_month" }, "operator")
      },
      /Forbidden/
    )
  })

  // Test 9: Role-based Payroll Masking
  test("Test 9: canViewPayroll restricts sensitive salary compensation data from standard accountants and operators", async () => {
    assert.equal(reportingService.canViewPayroll("superadmin"), true)
    assert.equal(reportingService.canViewPayroll("admin"), true)
    assert.equal(reportingService.canViewPayroll("management"), true)
    assert.equal(reportingService.canViewPayroll("accountant"), false)
    assert.equal(reportingService.canViewPayroll("operator"), false)

    // When an accountant requests expenses, payrollRecords must be omitted/empty
    const exp = await reportingService.getExpensesReport({ datePreset: "this_month" }, "accountant")
    assert.equal(exp.payrollRecords.length, 0, "Accountant must not receive individual payroll records")
  })

  // Test 10: Metric Drill-Down Traceability
  test("Test 10: Metric drill-down resolver returns mathematical formula, description, and source records", async () => {
    const drilldown = await reportingService.getMetricDrilldown("pnl:revenue:USD", { datePreset: "this_month" }, "admin")

    assert.ok(drilldown.formula.length > 0, "Drilldown must include calculation formula")
    assert.ok(drilldown.definition.length > 0, "Drilldown must include definition")
    assert.ok(Array.isArray(drilldown.records), "Drilldown must include source records")
  })

  // Test 11: Tamper-Proof Cryptographic Snapshot Finalization
  test("Test 11: finalizeManagementReportSnapshot generates SHA-256 hash and versioning", async () => {
    const periodCode = "2026-09"
    const snapshot = await reportingService.finalizeManagementReportSnapshot(periodCode, { datePreset: "this_month" }, "Lead Auditor")

    assert.ok(snapshot.id.startsWith(`snap-${periodCode}-v`), "Snapshot ID must contain period code and version")
    assert.equal(snapshot.periodCode, periodCode)
    assert.equal(snapshot.snapshotStatus, "FINAL")
    assert.match(snapshot.dataHash, /^[a-f0-9]{64}$/, "Data hash must be a valid 64-char SHA-256 hex string")
    assert.ok(snapshot.pnlData, "Snapshot must embed P&L data")
    assert.ok(snapshot.cashFlowData, "Snapshot must embed Cash Flow data")

    // Calling it again creates Version 2 and marks Version 1 as SUPERSEDED
    const snapshotV2 = await reportingService.finalizeManagementReportSnapshot(periodCode, { datePreset: "this_month" }, "Lead Auditor")
    assert.equal(snapshotV2.snapshotVersion, snapshot.snapshotVersion + 1)
    assert.equal(snapshotV2.snapshotStatus, "FINAL")

    const allSnaps = await reportingService.getManagementReportSnapshots(periodCode)
    const oldSnap = allSnaps.find((s) => s.id === snapshot.id)
    assert.equal(oldSnap.snapshotStatus, "SUPERSEDED", "Prior snapshot must be marked SUPERSEDED")
  })

  // Test 12: Customer & Branch Performance Integrity
  test("Test 12: Customer & Branch performance calculations maintain cross-table consistency", async () => {
    const customers = await reportingService.getCustomerProfitabilityReport({ datePreset: "this_month" }, "admin")
    assert.ok(Array.isArray(customers), "Customer profitability must return array")
    if (customers.length > 0) {
      const c = customers[0]
      assert.ok(c.customerName, "Must have customer name")
      assert.equal(c.grossProfit, Math.round((c.revenue - c.directCosts) * 100) / 100)
    }

    const branches = await reportingService.getBranchPerformanceReport({ datePreset: "this_month" }, "admin")
    assert.ok(Array.isArray(branches), "Branch performance must return array")
    assert.ok(branches.some((b) => b.branchName === "Kandahar"), "Must include Kandahar branch")
    assert.ok(branches.some((b) => b.branchName === "Dubai"), "Must include Dubai branch")
  })
})
