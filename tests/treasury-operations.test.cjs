/**
 * Sky Ariana Logistics — Enterprise Treasury Operations Test Suite
 * Phase 18: Bank Accounts, Cash Boxes, Treasury, Currency Exchange & Transfer Tracking
 */

const { test, describe, before, after } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const fs = require("node:fs/promises")
const fsSync = require("node:fs")

const loadTypescript = require("./load-typescript.cjs")
const { getDataPath } = loadTypescript("lib/server-paths.ts")

const ACCOUNTS_FILE = getDataPath(".local-treasury-accounts.json")
const TRANSACTIONS_FILE = getDataPath(".local-treasury-transactions.json")
const TRANSFERS_FILE = getDataPath(".local-treasury-transfers.json")
const EXCHANGES_FILE = getDataPath(".local-treasury-exchanges.json")
const RECONCILIATIONS_FILE = getDataPath(".local-treasury-reconciliations.json")
const PERIODS_FILE = getDataPath(".local-accounting-periods.json")

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

describe("Enterprise Treasury & Cash/Bank Management Engine", () => {
  let treasuryService
  let periodService

  before(async () => {
    await backupFile(ACCOUNTS_FILE)
    await backupFile(TRANSACTIONS_FILE)
    await backupFile(TRANSFERS_FILE)
    await backupFile(EXCHANGES_FILE)
    await backupFile(RECONCILIATIONS_FILE)
    await backupFile(PERIODS_FILE)

    treasuryService = loadTypescript("lib/treasury/treasury-service.ts")
    periodService = loadTypescript("lib/accounting/period-closing/period-service.ts")

    // Ensure 2026-10 is OPEN and 2026-05 is CLOSED
    const periods = await periodService.getPeriods()
    let may = periods.find((p) => p.code === "2026-05")
    if (may) {
      may.status = "CLOSED"
      may.closed_at = new Date().toISOString()
    } else {
      periods.push({
        id: "period-2026-05",
        period_type: "MONTHLY",
        year: 2026,
        month: 5,
        name: "May 2026",
        code: "2026-05",
        start_date: "2026-05-01",
        end_date: "2026-05-31",
        status: "CLOSED",
        closed_at: "2026-06-01T00:00:00.000Z",
        lock_level: "FULL",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
    let oct = periods.find((p) => p.code === "2026-10")
    if (oct) {
      oct.status = "OPEN"
    }
    await periodService.savePeriods(periods)
  })

  after(async () => {
    await restoreFile(ACCOUNTS_FILE)
    await restoreFile(TRANSACTIONS_FILE)
    await restoreFile(TRANSFERS_FILE)
    await restoreFile(EXCHANGES_FILE)
    await restoreFile(RECONCILIATIONS_FILE)
    await restoreFile(PERIODS_FILE)
  })

  test("1. Treasury Account Initialization & Multi-Currency Segregation", async () => {
    const accounts = await treasuryService.getTreasuryAccounts()
    assert.ok(accounts.length >= 4, "Should have default starter treasury accounts")

    const usdBank = accounts.find((a) => a.account_code === "BANK-USD-01")
    const aedCash = accounts.find((a) => a.account_code === "CASH-AED-01")
    const afnCash = accounts.find((a) => a.account_code === "CASH-AFN-01")

    assert.ok(usdBank, "USD Operating Bank exists")
    assert.equal(usdBank.currency, "USD")
    assert.ok(aedCash, "Dubai Cash AED exists")
    assert.equal(aedCash.currency, "AED")
    assert.ok(afnCash, "Kandahar Cash AFN exists")
    assert.equal(afnCash.currency, "AFN")

    // Verify currencies remain strictly segregated
    assert.notEqual(usdBank.currency, aedCash.currency)
    assert.notEqual(aedCash.currency, afnCash.currency)
  })

  test("2. Authoritative Balance Invariance (Balance = Opening + In - Out)", async () => {
    const testAccount = await treasuryService.createTreasuryAccount({
      account_code: `TEST-CASH-${Date.now()}`,
      account_name: "Audit Verification Cash Box",
      account_type: "CASH",
      currency: "USD",
      opening_balance: 1000,
      allow_negative_balance: false,
      status: "ACTIVE",
    })

    assert.equal(testAccount.opening_balance, 1000)
    assert.equal(testAccount.current_balance, 1000)

    // Append Money In (+500)
    await treasuryService.appendTreasuryTransaction({
      treasury_account_id: testAccount.id,
      transaction_date: "2026-10-05",
      posting_date: "2026-10-05",
      transaction_type: "OTHER_RECEIPT",
      description: "Test deposit",
      reference_number: "DEP-001",
      amount_in: 500,
      amount_out: 0,
      currency: "USD",
      balance_after: 1500,
      status: "POSTED",
    })

    // Append Money Out (-200)
    await treasuryService.appendTreasuryTransaction({
      treasury_account_id: testAccount.id,
      transaction_date: "2026-10-06",
      posting_date: "2026-10-06",
      transaction_type: "OTHER_PAYMENT",
      description: "Test expense",
      reference_number: "EXP-001",
      amount_in: 0,
      amount_out: 200,
      currency: "USD",
      balance_after: 1300,
      status: "POSTED",
    })

    const updatedAccount = await treasuryService.getTreasuryAccountById(testAccount.id)
    assert.equal(updatedAccount.current_balance, 1300, "1000 + 500 - 200 = 1300 exactly")
  })

  test("3. Atomic Customer Receipt (Dual-Effect: Ledger Credit + Treasury Money-In + RCPT Number)", async () => {
    const accounts = await treasuryService.getTreasuryAccounts()
    const targetAccount = accounts.find((a) => a.currency === "USD" && a.account_type === "BANK")
    assert.ok(targetAccount, "USD Bank Account must exist")

    const initialBalance = targetAccount.current_balance

    const result = await treasuryService.recordCustomerReceipt({
      customer_name: "Najeb Amin Limited",
      amount: 4000,
      currency: "USD",
      received_into_account_id: targetAccount.id,
      payment_method: "BANK_TRANSFER",
      reference: "TT-774921",
      transaction_date: "2026-10-10",
      remarks: "Advance freight payment for 2x40ft containers",
    })

    assert.ok(result.receiptNumber.startsWith("RCPT-"), "Receipt number must be prefixed RCPT-")
    assert.equal(result.transaction.amount_in, 4000)
    assert.equal(result.transaction.currency, "USD")
    assert.equal(result.account.current_balance, initialBalance + 4000, "Bank account must increase by 4,000 USD")
    assert.equal(result.ledgerUpdated, true, "Customer ledger must be updated with credit")
  })

  test("4. Idempotency Key Deduplication (Prevents Duplicate Money-In on Network Retries)", async () => {
    const accounts = await treasuryService.getTreasuryAccounts()
    const targetAccount = accounts.find((a) => a.currency === "USD" && a.account_type === "BANK")

    const idempotencyKey = `idem-test-${Date.now()}`

    // First Submission
    const firstSubmission = await treasuryService.recordCustomerReceipt({
      idempotency_key: idempotencyKey,
      customer_name: "Kabul Traders LLC",
      amount: 1500,
      currency: "USD",
      received_into_account_id: targetAccount.id,
      payment_method: "BANK_TRANSFER",
      reference: "RETRY-REF-101",
      transaction_date: "2026-10-12",
    })

    const balanceAfterFirst = firstSubmission.account.current_balance

    // Duplicate Second Submission with same idempotency key
    const secondSubmission = await treasuryService.recordCustomerReceipt({
      idempotency_key: idempotencyKey,
      customer_name: "Kabul Traders LLC",
      amount: 1500,
      currency: "USD",
      received_into_account_id: targetAccount.id,
      payment_method: "BANK_TRANSFER",
      reference: "RETRY-REF-101",
      transaction_date: "2026-10-12",
    })

    // Second submission must return existing transaction without creating duplicate money
    assert.equal(secondSubmission.transaction.id, firstSubmission.transaction.id)
    assert.equal(secondSubmission.ledgerUpdated, false, "Must not duplicate ledger entry")

    const checkAccount = await treasuryService.getTreasuryAccountById(targetAccount.id)
    assert.equal(checkAccount.current_balance, balanceAfterFirst, "Treasury balance must not duplicate!")
  })

  test("5. Atomic Supplier Payment (Dual-Effect: Payable Reduction + Treasury Money-Out + PV Number)", async () => {
    const accounts = await treasuryService.getTreasuryAccounts()
    const sourceAccount = accounts.find((a) => a.currency === "USD" && a.account_type === "BANK")
    const initialBalance = sourceAccount.current_balance

    const result = await treasuryService.recordSupplierPayment({
      supplier_name: "Maersk Line Shipping",
      amount: 3000,
      currency: "USD",
      paid_from_account_id: sourceAccount.id,
      payment_method: "BANK_TRANSFER",
      reference: "SWIFT-891023",
      transaction_date: "2026-10-14",
      remarks: "Terminal handling and ocean freight settlement",
    })

    assert.ok(result.voucherNumber.startsWith("PV-"), "Voucher number must be prefixed PV-")
    assert.equal(result.transaction.amount_out, 3000)
    assert.equal(result.account.current_balance, initialBalance - 3000, "Bank account must decrease by 3,000 USD")
  })

  test("6. Internal Company Transfer (Same Currency, Net Cash Flow 0, TRF Voucher)", async () => {
    const accounts = await treasuryService.getTreasuryAccounts()
    const usdBank = accounts.find((a) => a.account_code === "BANK-USD-01")
    const usdCash = accounts.find((a) => a.account_code === "CASH-USD-01")

    assert.ok(usdBank && usdCash)
    const bankBefore = usdBank.current_balance
    const cashBefore = usdCash.current_balance

    const transferResult = await treasuryService.executeInternalTransfer({
      from_account_id: usdBank.id,
      to_account_id: usdCash.id,
      amount: 2000,
      transfer_date: "2026-10-15",
      reference: "ATM-WITHDRAWAL-01",
      remarks: "Replenishing Dubai USD Safe Cash Box",
    })

    assert.ok(transferResult.transfer.transfer_number.startsWith("TRF-"))
    assert.equal(transferResult.outTransaction.amount_out, 2000)
    assert.equal(transferResult.inTransaction.amount_in, 2000)

    const bankAfter = (await treasuryService.getTreasuryAccountById(usdBank.id)).current_balance
    const cashAfter = (await treasuryService.getTreasuryAccountById(usdCash.id)).current_balance

    assert.equal(bankAfter, bankBefore - 2000, "Source bank decreased by 2000")
    assert.equal(cashAfter, cashBefore + 2000, "Destination cash increased by 2000")
    assert.equal(bankAfter + cashAfter, bankBefore + cashBefore, "Total company USD cash is strictly invariant (net change = 0)")
  })

  test("7. Cross-Currency Transfer Block (Requires Currency Exchange)", async () => {
    const accounts = await treasuryService.getTreasuryAccounts()
    const usdBank = accounts.find((a) => a.currency === "USD")
    const aedCash = accounts.find((a) => a.currency === "AED")

    await assert.rejects(
      async () => {
        await treasuryService.executeInternalTransfer({
          from_account_id: aedCash.id,
          to_account_id: usdBank.id,
          amount: 5000,
          transfer_date: "2026-10-16",
        })
      },
      /Cross-currency transfer detected/,
      "Must reject cross-currency internal transfer without exchange"
    )
  })

  test("8. Currency Exchange Execution (AED Out, USD In, Locked Effective Rate & FX Voucher)", async () => {
    const accounts = await treasuryService.getTreasuryAccounts()
    const aedCash = accounts.find((a) => a.currency === "AED" && (a.account_type === "CASH" || a.account_type === "EXCHANGE_DEALER"))
    const usdBank = accounts.find((a) => a.currency === "USD" && a.account_type === "BANK")

    const aedBefore = aedCash.current_balance
    const usdBefore = usdBank.current_balance

    // Exchange: 18,350 AED into 5,000 USD (Rate ~ 3.67 AED/USD)
    const fxResult = await treasuryService.executeCurrencyExchange({
      from_account_id: aedCash.id,
      from_amount: 18350,
      to_account_id: usdBank.id,
      to_amount: 5000,
      counterparty: "Al-Ansari Hawala & Exchange",
      reference: "DEAL-84910",
      date: "2026-10-18",
      remarks: "Converted local cash collections to USD Operating Bank",
    })

    assert.ok(fxResult.exchange.exchange_number.startsWith("FX-"))
    assert.equal(fxResult.outTransaction.amount_out, 18350)
    assert.equal(fxResult.inTransaction.amount_in, 5000)
    assert.equal(fxResult.exchange.rate_direction, "AED_PER_USD")
    assert.equal(fxResult.exchange.exchange_rate, 3.67)

    const aedAfter = (await treasuryService.getTreasuryAccountById(aedCash.id)).current_balance
    const usdAfter = (await treasuryService.getTreasuryAccountById(usdBank.id)).current_balance

    assert.equal(aedAfter, aedBefore - 18350)
    assert.equal(usdAfter, usdBefore + 5000)
  })

  test("9. Treasury Reconciliation & Discrepancy Detection (Difference = Actual - System)", async () => {
    const accounts = await treasuryService.getTreasuryAccounts()
    const bankAccount = accounts.find((a) => a.account_code === "BANK-USD-01")

    const systemBal = bankAccount.current_balance
    // Actual bank statement shows 50 USD less (e.g. unrecorded bank service fee)
    const actualStatement = systemBal - 50

    const rec = await treasuryService.executeReconciliation(
      {
        treasury_account_id: bankAccount.id,
        period_start: "2026-10-01",
        period_end: "2026-10-31",
        actual_balance: actualStatement,
        notes: "Audited against official bank statement PDF dated Oct 31",
      },
      "Auditor"
    )

    assert.equal(rec.system_balance, systemBal)
    assert.equal(rec.actual_balance, actualStatement)
    assert.equal(rec.difference, -50)
    assert.equal(rec.status, "DIFFERENCE")

    // Crucial rule: Reconciliation MUST NOT silently alter system balance
    const checkAccount = await treasuryService.getTreasuryAccountById(bankAccount.id)
    assert.equal(checkAccount.current_balance, systemBal, "System balance remains invariant until formal adjustment")
  })

  test("10. Transaction Reversal Workflow (Compensating Entry & Balance Restoration)", async () => {
    const accounts = await treasuryService.getTreasuryAccounts()
    const targetAccount = accounts.find((a) => a.currency === "USD" && a.account_type === "BANK")
    const balBefore = targetAccount.current_balance

    // Create an erroneous customer receipt for 1,000 USD
    const erroneousReceipt = await treasuryService.recordCustomerReceipt({
      customer_name: "Erroneous Payer",
      amount: 1000,
      currency: "USD",
      received_into_account_id: targetAccount.id,
      payment_method: "CASH",
      reference: "ERR-001",
      transaction_date: "2026-10-20",
    })

    const balAfterPost = (await treasuryService.getTreasuryAccountById(targetAccount.id)).current_balance
    assert.equal(balAfterPost, balBefore + 1000)

    // Execute Reversal into open period
    const reversal = await treasuryService.reverseTreasuryTransaction(
      erroneousReceipt.transaction.id,
      "Duplicate entry posted in error by cashier",
      { reversalDate: "2026-10-21" }
    )

    assert.ok(reversal.reversalTransaction.reference_number.startsWith("REV-"))
    assert.equal(reversal.originalTransaction.status, "REVERSED")
    assert.equal(reversal.reversalTransaction.amount_out, 1000, "Reversal must disburse the wrongly received 1000")

    const balAfterReversal = (await treasuryService.getTreasuryAccountById(targetAccount.id)).current_balance
    assert.equal(balAfterReversal, balBefore, "Treasury balance restored exactly to before the erroneous receipt")
  })

  test("11. Hard Period Lock Enforcement (Rejection of Backdated Postings into Closed Period)", async () => {
    const accounts = await treasuryService.getTreasuryAccounts()
    const targetAccount = accounts.find((a) => a.currency === "USD")

    // Ensure 2026-05 is closed while preserving all periods
    const periods = await periodService.getPeriods()
    let mayPeriod = periods.find((p) => p.code === "2026-05")
    if (mayPeriod) {
      mayPeriod.status = "CLOSED"
    } else {
      mayPeriod = {
        id: "period-2026-05",
        period_type: "MONTHLY",
        year: 2026,
        month: 5,
        name: "May 2026",
        code: "2026-05",
        start_date: "2026-05-01",
        end_date: "2026-05-31",
        status: "CLOSED",
        closed_at: "2026-06-01T00:00:00.000Z",
        lock_level: "FULL",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      periods.push(mayPeriod)
    }
    await periodService.savePeriods(periods)

    // Attempt to post customer receipt backdated into closed May 2026
    await assert.rejects(
      async () => {
        await treasuryService.recordCustomerReceipt({
          customer_name: "Late Payer",
          amount: 5000,
          currency: "USD",
          received_into_account_id: targetAccount.id,
          payment_method: "BANK_TRANSFER",
          transaction_date: "2026-05-15", // Closed month!
        })
      },
      /Financial Period Lock Enforced: Period \[2026-05\]/,
      "Must reject posting treasury transaction into closed May period"
    )
  })

  test("12. Operational Cash Flow Report (Distinguishes External Cash vs Transfers and FX)", async () => {
    const report = await treasuryService.getOperationalCashFlowReport("2026-10-01", "2026-10-31")
    assert.ok(Array.isArray(report))

    const usdReport = report.find((r) => r.currency === "USD")
    assert.ok(usdReport)
    assert.ok(usdReport.customer_receipts > 0, "USD has customer receipts")
    assert.ok(usdReport.internal_transfers_volume > 0, "Internal transfers are recorded in volume")

    // Net operational cash flow = Receipts - (Supplier Payments + Expenses)
    // Internal transfers and FX are NOT included in net operational cash flow
    const expectedNet = usdReport.customer_receipts - (usdReport.supplier_payments + usdReport.operational_expenses)
    assert.equal(usdReport.net_operational_cash_flow, expectedNet)
  })
})
