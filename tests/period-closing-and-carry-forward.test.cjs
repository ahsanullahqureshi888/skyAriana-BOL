/**
 * Sky Ariana Enterprise Financial Period Closing & Multi-Currency Carry-Forward Test Suite
 * Phase 17: Monthly Accounting Close, Period Lock & Year-End Carry-Forward
 */

const { test, describe, before, after } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const fs = require("node:fs/promises")
const fsSync = require("node:fs")
const loadTypescript = require("./load-typescript.cjs")

const { getDataPath } = loadTypescript("lib/server-paths.ts")
const { getLedgerSystemDb, saveLedgerSystemDb } = loadTypescript("lib/services/ledger-db-service.ts")

// Paths for isolated test sandbox
const PERIODS_FILE = getDataPath(".local-accounting-periods.json")
const BALANCES_FILE = getDataPath(".local-account-period-balances.json")
const SNAPSHOTS_FILE = getDataPath(".local-period-snapshots.json")
const SETTINGS_FILE = getDataPath(".local-accounting-period-settings.json")
const AUDIT_FILE = getDataPath(".local-period-audit.json")
const LEDGER_FILE = getDataPath(".local-ledger-system.json")

// Backup copies for clean restoration
const backups = new Map()
let originalLedgerDb = null

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

describe("Enterprise Financial Period Closing & Invariance Engine", () => {
  let periodService
  let balanceCalculator
  let closeChecklistService
  let closeExecutionService
  let reopenService
  let yearEndService
  let periodReportService

  before(async () => {
    // 1. Safeguard existing files
    await backupFile(PERIODS_FILE)
    await backupFile(BALANCES_FILE)
    await backupFile(SNAPSHOTS_FILE)
    await backupFile(SETTINGS_FILE)
    await backupFile(AUDIT_FILE)
    await backupFile(LEDGER_FILE)

    // 2. Setup mock ledger state with multiple currencies
    const mockLedgerDb = {
      accounts: [
        {
          id: "ACC-CUST-001",
          account_code: "CUST-001",
          account_name: "Kabul Trading LLC",
          display_name: "Kabul Trading LLC",
          normalized_name: "kabul trading llc",
          aliases: [],
          account_type: "customer",
          currency: "USD",
          opening_balance: 0,
          total_debit: 0,
          total_credit: 0,
          current_balance: 0,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "ACC-SUPP-001",
          account_code: "SUPP-001",
          account_name: "Spin Boldak Transport Union",
          display_name: "Spin Boldak Transport Union",
          normalized_name: "spin boldak transport union",
          aliases: [],
          account_type: "supplier",
          currency: "AFN",
          opening_balance: 0,
          total_debit: 0,
          total_credit: 0,
          current_balance: 0,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      ledger_transactions: [
        // August 2026 transactions (Prior period)
        {
          id: "TX-AUG-01",
          account_id: "ACC-CUST-001",
          transaction_date: "2026-08-15",
          transaction_type: "charge",
          description: "August Freight Logistics",
          reference_number: "BOL-AUG-101",
          invoice_number: "INV-2026-08-01",
          debit: 10000,
          credit: 0,
          currency: "USD",
          running_balance: 10000,
          is_deleted: false,
          created_at: "2026-08-15T10:00:00Z",
          updated_at: "2026-08-15T10:00:00Z",
        },
        {
          id: "TX-AUG-02",
          account_id: "ACC-CUST-001",
          transaction_date: "2026-08-20",
          transaction_type: "payment",
          description: "August Bank Wire Receipt",
          reference_number: "WIRE-9921",
          debit: 0,
          credit: 4000,
          currency: "USD",
          running_balance: 6000,
          is_deleted: false,
          created_at: "2026-08-20T10:00:00Z",
          updated_at: "2026-08-20T10:00:00Z",
        },
        // September 2026 transactions (Target closing period)
        {
          id: "TX-SEP-01",
          account_id: "ACC-CUST-001",
          transaction_date: "2026-09-05",
          transaction_type: "charge",
          description: "Torghundi Transit Clearance",
          reference_number: "BOL-SEP-201",
          invoice_number: "INV-2026-09-01",
          debit: 8000,
          credit: 0,
          currency: "USD",
          running_balance: 14000,
          is_deleted: false,
          created_at: "2026-09-05T10:00:00Z",
          updated_at: "2026-09-05T10:00:00Z",
        },
        {
          id: "TX-SEP-02",
          account_id: "ACC-CUST-001",
          transaction_date: "2026-09-18",
          transaction_type: "payment",
          description: "Customer Cash Payment",
          reference_number: "CASH-REC-112",
          debit: 0,
          credit: 5000,
          currency: "USD",
          running_balance: 9000,
          is_deleted: false,
          created_at: "2026-09-18T10:00:00Z",
          updated_at: "2026-09-18T10:00:00Z",
        },
        // Supplier AFN transaction in September
        {
          id: "TX-SEP-SUPP-01",
          account_id: "ACC-SUPP-001",
          transaction_date: "2026-09-10",
          transaction_type: "charge",
          description: "Driver Convoy Border Rent",
          reference_number: "RENT-TRUCK-88",
          debit: 0,
          credit: 350000,
          currency: "AFN",
          running_balance: -350000,
          is_deleted: false,
          created_at: "2026-09-10T10:00:00Z",
          updated_at: "2026-09-10T10:00:00Z",
        },
      ],
      payments: [
        {
          id: "PAY-SEP-01",
          account_id: "ACC-CUST-001",
          payment_date: "2026-09-18",
          amount: 5000,
          currency: "USD",
          payment_method: "Cash",
          reference: "CASH-REC-112",
          created_at: "2026-09-18T10:00:00Z",
        },
      ],
      audit_logs: [],
    }

    originalLedgerDb = await getLedgerSystemDb()
    await saveLedgerSystemDb(mockLedgerDb)

    // Unlink old period files in case prior runs left anything
    await fs.unlink(PERIODS_FILE).catch(() => {})
    await fs.unlink(BALANCES_FILE).catch(() => {})
    await fs.unlink(SNAPSHOTS_FILE).catch(() => {})
    await fs.unlink(SETTINGS_FILE).catch(() => {})
    await fs.unlink(AUDIT_FILE).catch(() => {})

    // Load TS modules via loadTypescript helper
    periodService = loadTypescript("lib/accounting/period-closing/period-service.ts")
    balanceCalculator = loadTypescript("lib/accounting/period-closing/balance-calculator.ts")
    closeChecklistService = loadTypescript("lib/accounting/period-closing/close-checklist-service.ts")
    closeExecutionService = loadTypescript("lib/accounting/period-closing/close-execution-service.ts")
    reopenService = loadTypescript("lib/accounting/period-closing/reopen-service.ts")
    yearEndService = loadTypescript("lib/accounting/period-closing/year-end-service.ts")
    periodReportService = loadTypescript("lib/accounting/period-closing/period-report-service.ts")
  })

  after(async () => {
    // Restore all files
    if (originalLedgerDb) {
      await saveLedgerSystemDb(originalLedgerDb)
    }
    await restoreFile(PERIODS_FILE)
    await restoreFile(BALANCES_FILE)
    await restoreFile(SNAPSHOTS_FILE)
    await restoreFile(SETTINGS_FILE)
    await restoreFile(AUDIT_FILE)
  })

  test("1. Period Initialization & Posting Date Mapping", async () => {
    const periods = await periodService.ensureDefaultPeriods()
    assert.ok(periods.length >= 12, "Should initialize all 12 monthly periods for current year")

    const sepPeriod = await periodService.getPeriodForDate("2026-09-15")
    assert.equal(sepPeriod.code, "2026-09")
    assert.equal(sepPeriod.month, 9)
    assert.equal(sepPeriod.year, 2026)

    const octPeriod = await periodService.getPeriodForDate("2026-10-01")
    assert.equal(octPeriod.code, "2026-10")
    assert.equal(octPeriod.month, 10)
  })

  test("2. Mathematical Invariance & Multi-Currency Segregation", async () => {
    const sepPeriod = await periodService.getPeriodByCode("2026-09")
    assert.ok(sepPeriod, "September period must exist")

    const calc = await balanceCalculator.calculatePeriodBalances(sepPeriod)
    assert.equal(calc.invariancePassed, true, "All balances must strictly satisfy Invariance Identity")

    // Customer USD Balance
    const custBalance = calc.balances.find(
      (b) => b.account_id === "ACC-CUST-001" && b.currency === "USD"
    )
    assert.ok(custBalance, "Customer USD balance must be computed")

    // August Opening: 10,000 (Dr) - 4,000 (Cr) = 6,000.00
    assert.equal(custBalance.opening_balance, 6000)
    // September Debit: 8,000.00
    assert.equal(custBalance.period_debit, 8000)
    // September Credit: 5,000.00
    assert.equal(custBalance.period_credit, 5000)
    // September Closing: 6,000 + 8,000 - 5,000 = 9,000.00
    assert.equal(custBalance.closing_balance, 9000)

    // Formula Verification: Closing = Opening + Debit - Credit
    const expectedClosing = custBalance.opening_balance + custBalance.period_debit - custBalance.period_credit
    assert.equal(custBalance.closing_balance, expectedClosing)

    // Supplier AFN Balance (Strict currency segregation)
    const suppBalance = calc.balances.find(
      (b) => b.account_id === "ACC-SUPP-001" && b.currency === "AFN"
    )
    assert.ok(suppBalance, "Supplier AFN balance must be separated from USD")
    assert.equal(suppBalance.opening_balance, 0)
    assert.equal(suppBalance.period_credit, 350000)
    assert.equal(suppBalance.closing_balance, -350000)
  })

  test("3. Pre-Close Validation Checklist Runner", async () => {
    const sepPeriod = await periodService.getPeriodByCode("2026-09")
    const checklist = await closeChecklistService.runPeriodCloseChecklist(sepPeriod)

    assert.ok(checklist.items.length >= 7, "Checklist should evaluate at least 7 safeguard rules")
    assert.equal(checklist.hasBlockingErrors, false, "Valid period should have 0 blocking errors")

    const invItem = checklist.items.find((i) => i.key === "ACCOUNTING_INVARIANCE")
    assert.ok(invItem, "Must include mathematical invariance check")
    assert.equal(invItem.status, "PASS")
  })

  test("4. Atomic Month-End Close Execution with Backups & Snapshot", async () => {
    const sepPeriod = await periodService.getPeriodByCode("2026-09")
    
    // Execute atomic close
    const result = await closeExecutionService.executeMonthClose({
      period_id: sepPeriod.id,
      actor: "Chief Accountant",
      notes: "September 2026 accounts verified and locked",
      bypassWarnings: true,
    })

    assert.equal(result.success, true)
    assert.equal(result.period.status, "CLOSED")
    assert.equal(result.period.lock_level, "FULL")
    assert.ok(result.snapshot, "Immutable snapshot must be created")
    assert.equal(result.snapshot.snapshot_version, 1)
    assert.ok(result.snapshot.data_hash, "Snapshot must have SHA-256 hash")
    assert.ok(result.preCloseBackupId, "Pre-close backup must be created and verified")

    // Next period (October) must now be open
    assert.equal(result.nextPeriod.code, "2026-10")
    assert.equal(result.nextPeriod.status, "OPEN")
  })

  test("5. Server-Side Period Lock Enforcement (Rejection of mutations in Closed Period)", async () => {
    // Attempting to post into September 2026 must be strictly blocked on the server
    await assert.rejects(
      async () => {
        await periodService.assertAccountingPeriodOpen("2026-09-12", {
          actor: "Accountant User",
        })
      },
      /Financial Period Lock Enforced/
    )

    // October 2026 is OPEN and must succeed
    const octCheck = await periodService.assertAccountingPeriodOpen("2026-10-05")
    assert.equal(octCheck.allowed, true)
    assert.equal(octCheck.period.code, "2026-10")

    // Emergency Administrative Override with superadmin role must succeed with audit log
    const overrideCheck = await periodService.assertAccountingPeriodOpen("2026-09-12", {
      actor: "Executive Superadmin",
      role: "superadmin",
      allowOverride: true,
    })
    assert.equal(overrideCheck.allowed, true)
    assert.equal(overrideCheck.overrideUsed, true)
  })

  test("6. Document Date vs Posting Date Separation", async () => {
    // A document dated in September (closed) posted in October (open) must be permitted
    const docDate = "2026-09-25"
    const postingDate = "2026-10-02"

    // Assertion is called on posting_date
    const check = await periodService.assertAccountingPeriodOpen(postingDate)
    assert.equal(check.allowed, true)
    assert.equal(check.period.code, "2026-10")
  })

  test("7. October Opening Balances Carry-Forward Invariance", async () => {
    const octPeriod = await periodService.getPeriodByCode("2026-10")
    assert.ok(octPeriod)

    const calcOct = await balanceCalculator.calculatePeriodBalances(octPeriod)
    assert.equal(calcOct.invariancePassed, true)

    // October Opening Balance for Kabul Trading LLC must EXACTLY equal September Closing Balance (9,000.00 USD)
    const octCustBalance = calcOct.balances.find(
      (b) => b.account_id === "ACC-CUST-001" && b.currency === "USD"
    )
    assert.ok(octCustBalance)
    assert.equal(octCustBalance.opening_balance, 9000, "October opening must match September closing exactly")

    // October Opening for Supplier must match September Closing (-350,000 AFN)
    const octSuppBalance = calcOct.balances.find(
      (b) => b.account_id === "ACC-SUPP-001" && b.currency === "AFN"
    )
    assert.ok(octSuppBalance)
    assert.equal(octSuppBalance.opening_balance, -350000, "Supplier opening must match September closing")
  })

  test("8. Authorized Reopen Workflow & Snapshot Version 2 Comparison", async () => {
    const sepPeriod = await periodService.getPeriodByCode("2026-09")

    // Reopen without justification fails
    await assert.rejects(
      async () => {
        await reopenService.reopenAccountingPeriod({
          period_id: sepPeriod.id,
          reason: "Too short",
          actor: "Super Admin",
        })
      },
      /A specific business justification/
    )

    // Reopen with valid justification
    const reopenResult = await reopenService.reopenAccountingPeriod({
      period_id: sepPeriod.id,
      reason: "Adjusting demurrage charges per CFO audit review",
      actor: "Super Admin",
    })

    assert.equal(reopenResult.success, true)
    assert.equal(reopenResult.period.status, "REOPENED")
    assert.ok(reopenResult.preReopenBackupId, "Pre-reopen backup must be taken")

    // Re-close period: creates Snapshot Version 2
    const recloseResult = await closeExecutionService.executeMonthClose({
      period_id: sepPeriod.id,
      actor: "Chief Accountant",
      notes: "Re-closed after authorized audit corrections",
      bypassWarnings: true,
    })

    assert.equal(recloseResult.snapshot.snapshot_version, 2, "Re-closed period must create Snapshot Version 2")
    assert.equal(recloseResult.snapshot.status, "ACTIVE")

    // Verify Version 1 was preserved as SUPERSEDED
    const allSepSnapshots = await periodService.getPeriodSnapshots(sepPeriod.id)
    assert.equal(allSepSnapshots.length, 2, "Must preserve both Version 1 and Version 2 snapshots")
    const v1 = allSepSnapshots.find((s) => s.snapshot_version === 1)
    const v2 = allSepSnapshots.find((s) => s.snapshot_version === 2)
    assert.ok(v1 && v2)
    assert.equal(v1.status, "SUPERSEDED")
    assert.equal(v2.status, "ACTIVE")

    // Delta comparison
    const diff = await reopenService.comparePeriodSnapshots(sepPeriod.id, 1, 2)
    assert.equal(diff.v1_version, 1)
    assert.equal(diff.v2_version, 2)
  })

  test("9. Financial Statement Report & WhatsApp Summary Generator", async () => {
    const sepPeriod = await periodService.getPeriodByCode("2026-09")
    const stmtData = await periodReportService.getMonthlyClosingStatementData(sepPeriod.id)

    assert.equal(stmtData.invarianceVerified, true)
    assert.ok(stmtData.currencySummaries.length > 0)

    const whatsapp = await periodReportService.generateWhatsAppMonthlySummary(sepPeriod.id)
    assert.ok(whatsapp.includes("SKY ARIANA LOGISTICS — FINANCIAL CLOSING SUMMARY"))
    assert.ok(whatsapp.includes("USD"))
    assert.ok(whatsapp.includes("100% INVARIANT"))

    const csv = periodReportService.exportBalancesToCsv(stmtData.balances)
    assert.ok(csv.includes("Opening Balance,Period Debit,Period Credit,Closing Balance"))
  })

  test("10. Fiscal Year-End Closing & Annual Rollover", async () => {
    // Mark all other months of 2026 as closed for year-end close testing
    const periods = await periodService.getPeriods()
    for (const p of periods) {
      if (p.year === 2026) {
        p.status = "CLOSED"
        p.closed_at = new Date().toISOString()
      }
    }
    await periodService.savePeriods(periods)

    // Save December balance so year-end rollover can carry forward
    const decCode = "2026-12"
    await periodService.saveAccountPeriodBalances([
      {
        id: `apb-${decCode}-ACC-CUST-001-USD`,
        period_id: `period-${decCode}`,
        period_code: decCode,
        account_id: "ACC-CUST-001",
        account_name: "Kabul Trading LLC",
        account_type: "customer",
        currency: "USD",
        opening_balance: 9000,
        period_debit: 2000,
        period_credit: 1000,
        closing_balance: 10000,
        transaction_count: 2,
        snapshot_hash: "hash-dec",
        created_at: new Date().toISOString(),
      },
    ])

    const yearEndResult = await yearEndService.executeYearEndClose({
      year: 2026,
      actor: "Chief Financial Officer",
      notes: "2026 Annual Audit Finalized",
    })

    assert.equal(yearEndResult.success, true)
    assert.equal(yearEndResult.year, 2026)
    assert.equal(yearEndResult.nextYearPeriod.code, "2027-01")

    // Check January 2027 opening balance
    const janBalances = await periodService.getAccountPeriodBalances("period-2027-01")
    const janCust = janBalances.find((b) => b.account_id === "ACC-CUST-001" && b.currency === "USD")
    assert.ok(janCust, "January 2027 must receive rolled over balance")
    assert.equal(janCust.opening_balance, 10000, "January 1 Opening must equal December 31 Closing")
  })

  test("11. Ledger Map and Bulk Postings Integrity Enforcement Against Closed Periods", async () => {
    // 2026-09 is closed in our test environment
    const existingEntries = {
      "kabul-trading": [
        {
          id: "entry-sep-001",
          date: "2026-09-15",
          barnamehNo: "BOL-SEP-001",
          debit: 5000,
          credit: 0,
        },
      ],
    }

    // Attempt 1: Add a new entry with date in closed September 2026
    const invalidNewEntryMap = {
      "kabul-trading": [
        ...existingEntries["kabul-trading"],
        {
          id: "entry-sep-002",
          date: "2026-09-20",
          barnamehNo: "BOL-SEP-002",
          debit: 2000,
          credit: 0,
        },
      ],
    }

    await assert.rejects(
      async () => {
        await periodService.assertLedgerMapNotViolatingClosedPeriods(
          invalidNewEntryMap,
          existingEntries,
          [],
          { role: "accountant" }
        )
      },
      /Financial Period Lock Enforced: Period \[2026-09\]/,
      "Must reject inserting new entry into closed period 2026-09"
    )

    // Attempt 2: Modify existing entry debit in closed September 2026
    const invalidModifiedMap = {
      "kabul-trading": [
        {
          id: "entry-sep-001",
          date: "2026-09-15",
          barnamehNo: "BOL-SEP-001",
          debit: 7500, // Modified!
          credit: 0,
        },
      ],
    }

    await assert.rejects(
      async () => {
        await periodService.assertLedgerMapNotViolatingClosedPeriods(
          invalidModifiedMap,
          existingEntries,
          [],
          { role: "accountant" }
        )
      },
      /Financial Period Lock Enforced: Period \[2026-09\]/,
      "Must reject modifying existing entry debit in closed period 2026-09"
    )

    // Attempt 3: Delete entry in closed September 2026
    await assert.rejects(
      async () => {
        await periodService.assertLedgerMapNotViolatingClosedPeriods(
          { "kabul-trading": [] },
          existingEntries,
          [{ entry: { id: "entry-sep-001", date: "2026-09-15" } }],
          { role: "accountant" }
        )
      },
      /Financial Period Lock Enforced: Period \[2026-09\]/,
      "Must reject deleting entry from closed period 2026-09"
    )

    // Attempt 4: Valid entry posted into open period (2027-01) with untouched closed entry
    const validMap = {
      "kabul-trading": [
        existingEntries["kabul-trading"][0], // Untouched closed entry
        {
          id: "entry-jan-001",
          date: "2027-01-10",
          barnamehNo: "BOL-JAN-001",
          debit: 3000,
          credit: 0,
        },
      ],
    }

    // Must not throw:
    await periodService.assertLedgerMapNotViolatingClosedPeriods(
      validMap,
      existingEntries,
      [],
      { role: "accountant" }
    )
    assert.ok(true, "Allowed posting into open 2027-01 without modifying closed 2026-09")
  })

  after(async () => {
    if (originalLedgerDb) {
      await saveLedgerSystemDb(originalLedgerDb)
    }
    await restoreFile(LEDGER_FILE)
    await restoreFile(PERIODS_FILE)
    await restoreFile(BALANCES_FILE)
    await restoreFile(SNAPSHOTS_FILE)
    await restoreFile(SETTINGS_FILE)
    await restoreFile(AUDIT_FILE)
  })
})
