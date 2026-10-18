/**
 * Sky Ariana Logistics — Enterprise Treasury Service
 * Phase 18: Bank Accounts, Cash Boxes, Treasury, Currency Exchange & Transfer Tracking
 */

import crypto from "crypto"
import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, writeJsonFile, mutateJsonFile } from "@/lib/services/blob-db"
import { assertAccountingPeriodOpen } from "@/lib/accounting/period-closing/period-service"
import {
  roundMoney,
  addMoney,
  subMoney,
  multMoney,
  divMoney,
  getCurrencyDecimals,
} from "@/lib/utils/money"
import type {
  TreasuryAccount,
  TreasuryTransaction,
  TreasuryTransfer,
  CurrencyExchangeTransaction,
  TreasuryReconciliation,
  TreasurySettings,
  CustomerReceiptRequest,
  SupplierPaymentRequest,
  InternalTransferRequest,
  CurrencyExchangeRequest,
  CashPositionSummary,
  DailyCashMovementSummary,
  OperationalCashFlowSummary,
  TreasuryDashboardData,
} from "@/lib/types/treasury"
import { getAccountLedgerDatabase, saveAccountLedgerDatabase } from "@/lib/services/account-ledger-storage-service"
import { getBolAccountLedgerDatabase, saveBolAccountLedgerDatabase } from "@/lib/services/bol-account-ledger-storage-service"
import { getAllInvoices, saveInvoice } from "@/lib/services/invoice-storage-service"
import { getAllSupplierBills, saveSupplierBill } from "@/lib/services/finance-storage-service"
import { createPaymentReceipt } from "@/lib/accounting/payment-receipt-service"

const ACCOUNTS_FILE = getDataPath(".local-treasury-accounts.json")
const TRANSACTIONS_FILE = getDataPath(".local-treasury-transactions.json")
const TRANSFERS_FILE = getDataPath(".local-treasury-transfers.json")
const EXCHANGES_FILE = getDataPath(".local-treasury-exchanges.json")
const RECONCILIATIONS_FILE = getDataPath(".local-treasury-reconciliations.json")
const SETTINGS_FILE = getDataPath(".local-treasury-settings.json")

const RCPT_COUNTER_FILE = getDataPath(".treasury-rcpt-counter")
const PV_COUNTER_FILE = getDataPath(".treasury-pv-counter")
const TRF_COUNTER_FILE = getDataPath(".treasury-trf-counter")
const FX_COUNTER_FILE = getDataPath(".treasury-fx-counter")

// -----------------------------------------------------------------
// Number Generators
// -----------------------------------------------------------------
export async function getNextTreasuryNumber(counterFile: string, prefix: string): Promise<string> {
  const currentYear = new Date().getFullYear()
  let counter = 1
  await mutateJsonFile<number>(counterFile, 1, (curr) => {
    counter = Number.isSafeInteger(curr) && curr > 0 ? curr : 1
    return counter + 1
  })
  return `${prefix}-${currentYear}-${String(counter).padStart(6, "0")}`
}

// -----------------------------------------------------------------
// Settings Management
// -----------------------------------------------------------------
export async function getTreasurySettings(): Promise<TreasurySettings> {
  const defaultSettings: TreasurySettings = {
    requirePaymentApproval: false,
    requireCashCount: true,
    reconciliationFrequency: "DAILY",
    allowNegativeCash: false,
    receiptPrefix: "RCPT",
    voucherPrefix: "PV",
    transferPrefix: "TRF",
    exchangePrefix: "FX",
    updated_at: new Date().toISOString(),
    updated_by: "System",
  }
  const loaded = await readJsonFile<TreasurySettings>(SETTINGS_FILE, defaultSettings)
  return { ...defaultSettings, ...loaded }
}

export async function saveTreasurySettings(
  settings: Partial<TreasurySettings>,
  actor = "Admin"
): Promise<TreasurySettings> {
  const current = await getTreasurySettings()
  const updated: TreasurySettings = {
    ...current,
    ...settings,
    updated_at: new Date().toISOString(),
    updated_by: actor,
  }
  await writeJsonFile(SETTINGS_FILE, updated)
  return updated
}

// -----------------------------------------------------------------
// Default Starter Accounts Auto-Seeder
// -----------------------------------------------------------------
export async function ensureDefaultTreasuryAccounts(): Promise<TreasuryAccount[]> {
  const existing = await readJsonFile<TreasuryAccount[]>(ACCOUNTS_FILE, [])
  if (existing.length > 0) return existing

  const now = new Date().toISOString()
  const defaultAccounts: TreasuryAccount[] = [
    {
      id: "tr-acc-usd-bank",
      account_code: "BANK-USD-01",
      account_name: "USD Operating Bank Account",
      account_type: "BANK",
      bank_name: "Habib Bank AG Zurich / Islamic Bank",
      account_holder: "SKY ARIANA LIMITED",
      account_number: "0100-249582-001",
      iban: "AE45033000000100249582001",
      swift_code: "HBZUAEADXXX",
      branch: "Dubai Main Branch",
      country: "UAE",
      currency: "USD",
      opening_balance: 50000,
      current_balance: 50000,
      allow_negative_balance: true,
      overdraft_limit: 10000,
      status: "ACTIVE",
      notes: "Primary operational corporate bank account for USD customer receipts and freight settlements.",
      created_at: now,
      updated_at: now,
    },
    {
      id: "tr-acc-aed-cash",
      account_code: "CASH-AED-01",
      account_name: "Dubai Office Cash Box",
      account_type: "CASH",
      account_holder: "Sky Ariana Cashier",
      branch: "Deira Office, Dubai",
      country: "UAE",
      currency: "AED",
      opening_balance: 25000,
      current_balance: 25000,
      allow_negative_balance: false,
      status: "ACTIVE",
      notes: "Main cash box for UAE local expenses and local terminal handling fees.",
      created_at: now,
      updated_at: now,
    },
    {
      id: "tr-acc-usd-cash",
      account_code: "CASH-USD-01",
      account_name: "USD Safe Cash Box",
      account_type: "CASH",
      account_holder: "Sky Ariana Vault",
      branch: "Dubai Main Office",
      country: "UAE",
      currency: "USD",
      opening_balance: 15000,
      current_balance: 15000,
      allow_negative_balance: false,
      status: "ACTIVE",
      notes: "Physical cash vault for USD notes received from customers.",
      created_at: now,
      updated_at: now,
    },
    {
      id: "tr-acc-afn-cash",
      account_code: "CASH-AFN-01",
      account_name: "Kandahar & Kabul Transit Cash",
      account_type: "CASH",
      account_holder: "Afghanistan Station Cashier",
      branch: "Kandahar Central",
      country: "Afghanistan",
      currency: "AFN",
      opening_balance: 500000,
      current_balance: 500000,
      allow_negative_balance: false,
      status: "ACTIVE",
      notes: "Afghan Afghani operational cash box for border customs and driver rent payouts.",
      created_at: now,
      updated_at: now,
    },
    {
      id: "tr-acc-aed-exchange",
      account_code: "EXCH-AED-01",
      account_name: "Al-Ansari Exchange Dealer Account",
      account_type: "EXCHANGE_DEALER",
      account_holder: "Al-Ansari Hawala & Exchange",
      country: "UAE",
      currency: "AED",
      opening_balance: 0,
      current_balance: 0,
      allow_negative_balance: true,
      status: "ACTIVE",
      notes: "Clearing dealer account for AED/USD cross-currency conversions and remittances.",
      created_at: now,
      updated_at: now,
    },
  ]

  await writeJsonFile(ACCOUNTS_FILE, defaultAccounts)
  return defaultAccounts
}

// -----------------------------------------------------------------
// Treasury Accounts CRUD & Balance Calculation
// -----------------------------------------------------------------
export async function getTreasuryAccounts(): Promise<TreasuryAccount[]> {
  const accounts = await readJsonFile<TreasuryAccount[]>(ACCOUNTS_FILE, [])
  if (accounts.length === 0) {
    return await ensureDefaultTreasuryAccounts()
  }
  const transactions = await getTreasuryTransactions()

  // Recalculate authoritative current balances strictly from transactions
  const balanceMap = new Map<string, number>()
  for (const acc of accounts) {
    balanceMap.set(acc.id, Number(acc.opening_balance) || 0)
  }

  for (const tx of transactions) {
    if (tx.status !== "POSTED") continue
    if (tx.transaction_type === "OPENING_BALANCE") continue
    const currBal = balanceMap.get(tx.treasury_account_id) ?? 0
    const inAmt = Number(tx.amount_in) || 0
    const outAmt = Number(tx.amount_out) || 0
    const nextBal = subMoney(addMoney(currBal, inAmt, tx.currency), outAmt, tx.currency)
    balanceMap.set(tx.treasury_account_id, nextBal)
  }

  return accounts.map((acc) => ({
    ...acc,
    current_balance: balanceMap.get(acc.id) ?? acc.opening_balance,
  }))
}

export async function getTreasuryAccountById(id: string): Promise<TreasuryAccount | null> {
  const accounts = await getTreasuryAccounts()
  return accounts.find((a) => a.id === id || a.account_code === id) || null
}

export async function createTreasuryAccount(
  data: Omit<TreasuryAccount, "id" | "current_balance" | "created_at" | "updated_at">,
  actor = "Admin"
): Promise<TreasuryAccount> {
  const accounts = await readJsonFile<TreasuryAccount[]>(ACCOUNTS_FILE, [])
  const existingCode = accounts.find((a) => a.account_code.toLowerCase() === data.account_code.toLowerCase())
  if (existingCode) {
    throw new Error(`Treasury account code [${data.account_code}] already exists. Please choose a unique code.`)
  }

  const now = new Date().toISOString()
  const opening = roundMoney(data.opening_balance || 0, getCurrencyDecimals(data.currency))
  const newAccount: TreasuryAccount = {
    ...data,
    id: `tr-acc-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    opening_balance: opening,
    current_balance: opening,
    allow_negative_balance: Boolean(data.allow_negative_balance),
    status: data.status || "ACTIVE",
    created_at: now,
    updated_at: now,
  }

  accounts.push(newAccount)
  await writeJsonFile(ACCOUNTS_FILE, accounts)

  // If opening balance > 0, post initial OPENING_BALANCE transaction
  if (opening > 0) {
    await appendTreasuryTransaction({
      treasury_account_id: newAccount.id,
      transaction_date: now.split("T")[0],
      posting_date: now.split("T")[0],
      transaction_type: "OPENING_BALANCE",
      description: `Initial Opening Balance for ${newAccount.account_name}`,
      reference_number: `INIT-${newAccount.account_code}`,
      amount_in: opening,
      amount_out: 0,
      currency: newAccount.currency,
      balance_after: opening,
      status: "POSTED",
      created_by: actor,
    })
  }

  return newAccount
}

export async function updateTreasuryAccount(
  id: string,
  updates: Partial<Omit<TreasuryAccount, "id" | "opening_balance" | "current_balance" | "created_at">>,
  actor = "Admin"
): Promise<TreasuryAccount> {
  const accounts = await readJsonFile<TreasuryAccount[]>(ACCOUNTS_FILE, [])
  const index = accounts.findIndex((a) => a.id === id)
  if (index === -1) {
    throw new Error(`Treasury account [${id}] not found.`)
  }

  const existing = accounts[index]
  const updated: TreasuryAccount = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  }

  accounts[index] = updated
  await writeJsonFile(ACCOUNTS_FILE, accounts)
  return updated
}

// -----------------------------------------------------------------
// Treasury Transactions Core
// -----------------------------------------------------------------
export async function getTreasuryTransactions(accountId?: string): Promise<TreasuryTransaction[]> {
  const transactions = await readJsonFile<TreasuryTransaction[]>(TRANSACTIONS_FILE, [])
  if (!accountId) {
    return transactions.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at))
  }
  return transactions
    .filter((t) => t.treasury_account_id === accountId)
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at))
}

export async function appendTreasuryTransaction(
  tx: Omit<TreasuryTransaction, "id" | "created_at" | "updated_at">
): Promise<TreasuryTransaction> {
  const transactions = await readJsonFile<TreasuryTransaction[]>(TRANSACTIONS_FILE, [])
  const now = new Date().toISOString()

  // Idempotency guard: if idempotency key exists, return existing transaction
  if (tx.idempotency_key) {
    const existing = transactions.find((t) => t.idempotency_key === tx.idempotency_key)
    if (existing) {
      return existing
    }
  }

  const newTx: TreasuryTransaction = {
    ...tx,
    id: `tx-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    created_at: now,
    updated_at: now,
  }

  transactions.push(newTx)
  await writeJsonFile(TRANSACTIONS_FILE, transactions)
  return newTx
}

// -----------------------------------------------------------------
// Atomic Customer Payment Receipt
// -----------------------------------------------------------------
export async function recordCustomerReceipt(
  req: CustomerReceiptRequest,
  options?: { actor?: string; role?: string }
): Promise<{
  receiptNumber: string
  transaction: TreasuryTransaction
  account: TreasuryAccount
  ledgerUpdated: boolean
  invoiceUpdated: boolean
}> {
  // 1. Verify Treasury Account
  const account = await getTreasuryAccountById(req.received_into_account_id)
  if (!account) {
    throw new Error(`Treasury account [${req.received_into_account_id}] not found.`)
  }
  if (account.status !== "ACTIVE") {
    throw new Error(`Treasury account [${account.account_name}] is ${account.status}. Funds cannot be received.`)
  }

  // 2. Validate Currencies
  if (account.currency.toUpperCase() !== req.currency.toUpperCase() && !req.applied_exchange_rate) {
    throw new Error(
      `Currency mismatch: Received into account is [${account.currency}], but payment is in [${req.currency}]. ` +
      `Please provide an explicit applied exchange rate or record via Currency Exchange.`
    )
  }

  // 3. Enforce Financial Period Hard Lock
  const postingDate = req.posting_date || req.transaction_date
  await assertAccountingPeriodOpen(postingDate, {
    role: options?.role,
    actor: options?.actor || "Cashier",
    entityType: "customer_receipt",
    entityId: req.reference,
  })

  // 4. Idempotency Check
  const idempotencyKey = req.idempotency_key || `rcpt-${req.customer_name}-${req.reference || ""}-${req.amount}-${req.transaction_date}`
  const existingTxList = await getTreasuryTransactions()
  const duplicate = existingTxList.find((t) => t.idempotency_key === idempotencyKey && t.status === "POSTED")
  if (duplicate) {
    return {
      receiptNumber: duplicate.reference_number || "RCPT-EXISTING",
      transaction: duplicate,
      account,
      ledgerUpdated: false,
      invoiceUpdated: false,
    }
  }

  // 5. Generate Next Sequential Receipt Number
  const settings = await getTreasurySettings()
  const receiptNumber = await getNextTreasuryNumber(RCPT_COUNTER_FILE, settings.receiptPrefix || "RCPT")

  const amountIn = roundMoney(req.amount, getCurrencyDecimals(req.currency))
  const newAccountBalance = addMoney(account.current_balance, amountIn, account.currency)

  // 6. Post Treasury Transaction
  const transaction = await appendTreasuryTransaction({
    treasury_account_id: account.id,
    transaction_date: req.transaction_date,
    posting_date: postingDate,
    transaction_type: "CUSTOMER_RECEIPT",
    description: `Customer Receipt from ${req.customer_name}${req.invoice_number ? ` (Inv: ${req.invoice_number})` : ""}${req.bol_number ? ` (BOL: ${req.bol_number})` : ""}`,
    reference_number: receiptNumber,
    amount_in: amountIn,
    amount_out: 0,
    currency: account.currency,
    balance_after: newAccountBalance,
    invoice_id: req.invoice_id,
    bol_id: req.bol_id,
    account_id: req.account_id,
    party_name: req.customer_name,
    source: req.payment_method,
    status: "POSTED",
    idempotency_key: idempotencyKey,
    created_by: options?.actor || req.received_by || "Cashier",
  })

  // 7. Update Customer Ledger
  let ledgerUpdated = false
  try {
    const db = await getAccountLedgerDatabase()
    const bolDb = await getBolAccountLedgerDatabase()
    const cleanKey = (req.customer_name || "default").trim().toLowerCase().replace(/[^a-z0-9]/g, "-")

    const ledgerEntry = {
      id: `led-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      sNo: 1,
      date: req.transaction_date,
      description: `Payment Received [${receiptNumber}] via ${account.account_name}${req.reference ? ` (Ref: ${req.reference})` : ""}`,
      shipperDescription: req.customer_name,
      invoiceNo: req.invoice_number || "",
      billOfLanding: req.bol_number || "",
      debit: 0,
      credit: amountIn,
    }

    const currentRows = db.ledgerEntries[cleanKey] || db.ledgerEntries[req.customer_name] || []
    const updatedRows = [...currentRows, ledgerEntry]
    db.ledgerEntries[cleanKey] = updatedRows
    db.ledgerEntries[req.customer_name] = updatedRows
    bolDb.ledgerRecords[cleanKey] = updatedRows
    bolDb.ledgerRecords[req.customer_name] = updatedRows

    await saveAccountLedgerDatabase({
      ...db,
      updated_at: new Date().toISOString(),
    } as any)
    await saveBolAccountLedgerDatabase({
      ...bolDb,
      updated_at: new Date().toISOString(),
    } as any)
    ledgerUpdated = true
  } catch (err) {
    console.warn("[Treasury Service] Warning updating customer ledger:", err)
  }

  // 8. Update Invoice if linked
  let invoiceUpdated = false
  if (req.invoice_id || req.invoice_number) {
    try {
      const invoices = await getAllInvoices()
      const targetInv = invoices.find((inv: any) =>
        (req.invoice_id && inv.id === req.invoice_id) ||
        (req.invoice_number && (inv.invoice_number === req.invoice_number || inv.invoiceNo === req.invoice_number))
      )
      if (targetInv) {
        const allocated = req.allocated_amount_invoice_currency || amountIn
        const prevPaid = Number((targetInv as any).amount_paid || (targetInv as any).paid_amount || 0)
        const totalAmount = Number((targetInv as any).total_amount || (targetInv as any).totalAmount || (targetInv as any).amount || 0)
        const newPaid = addMoney(prevPaid, allocated, targetInv.currency || account.currency)
        const newRemaining = Math.max(0, subMoney(totalAmount, newPaid, targetInv.currency || account.currency))

        await saveInvoice({
          ...targetInv,
          payment_status: newRemaining <= 0 ? "PAID" : "PARTIAL",
          updated_at: new Date().toISOString(),
        } as any)
        invoiceUpdated = true
      }
    } catch (err) {
      console.warn("[Treasury Service] Warning updating invoice:", err)
    }
  }

  // 9. Create formal PaymentReceiptRecord for PDF & Statement Generator
  try {
    await createPaymentReceipt({
      paymentId: transaction.id,
      date: req.transaction_date,
      receivedFrom: req.customer_name,
      accountId: req.account_id || cleanKey(req.customer_name),
      accountName: req.customer_name,
      amount: amountIn,
      currency: account.currency,
      paymentMethod: req.payment_method,
      reference: receiptNumber,
      appliedInvoice: req.invoice_number || req.invoice_id || null,
      appliedBol: req.bol_number || req.bol_id || null,
      remainingBalance: 0,
      receivedBy: options?.actor || req.received_by || "Cashier",
      notes: req.remarks || "",
    })
  } catch (e) {
    console.warn("[Treasury Service] Warning generating payment receipt document:", e)
  }

  return {
    receiptNumber,
    transaction,
    account: { ...account, current_balance: newAccountBalance },
    ledgerUpdated,
    invoiceUpdated,
  }
}

function cleanKey(str: string): string {
  return (str || "default").trim().toLowerCase().replace(/[^a-z0-9]/g, "-")
}

// -----------------------------------------------------------------
// Atomic Supplier Payment Voucher
// -----------------------------------------------------------------
export async function recordSupplierPayment(
  req: SupplierPaymentRequest,
  options?: { actor?: string; role?: string }
): Promise<{
  voucherNumber: string
  transaction: TreasuryTransaction
  account: TreasuryAccount
  billUpdated: boolean
}> {
  // 1. Verify Treasury Account
  const account = await getTreasuryAccountById(req.paid_from_account_id)
  if (!account) {
    throw new Error(`Treasury account [${req.paid_from_account_id}] not found.`)
  }
  if (account.status !== "ACTIVE") {
    throw new Error(`Treasury account [${account.account_name}] is ${account.status}. Cannot disburse funds.`)
  }

  // 2. Validate Currencies
  if (account.currency.toUpperCase() !== req.currency.toUpperCase()) {
    throw new Error(
      `Currency mismatch: Disbursement account is [${account.currency}], but payment requested is [${req.currency}].`
    )
  }

  const amountOut = roundMoney(req.amount, getCurrencyDecimals(req.currency))

  // 3. Check Overdraft / Negative Balance allowance
  if (!account.allow_negative_balance && (account.current_balance - amountOut) < 0) {
    throw new Error(
      `Insufficient funds in [${account.account_name}]. Current balance: ${account.currency} ${account.current_balance}, required: ${amountOut}. Overdraft is disabled.`
    )
  }

  // 4. Enforce Financial Period Hard Lock
  const postingDate = req.posting_date || req.transaction_date
  await assertAccountingPeriodOpen(postingDate, {
    role: options?.role,
    actor: options?.actor || "Treasurer",
    entityType: "supplier_payment",
    entityId: req.reference,
  })

  // 5. Idempotency Check
  const idempotencyKey = req.idempotency_key || `pv-${req.supplier_name}-${req.reference || ""}-${req.amount}-${req.transaction_date}`
  const existingTxList = await getTreasuryTransactions()
  const duplicate = existingTxList.find((t) => t.idempotency_key === idempotencyKey && t.status === "POSTED")
  if (duplicate) {
    return {
      voucherNumber: duplicate.reference_number || "PV-EXISTING",
      transaction: duplicate,
      account,
      billUpdated: false,
    }
  }

  // 6. Generate Next Sequential Payment Voucher Number
  const settings = await getTreasurySettings()
  const voucherNumber = await getNextTreasuryNumber(PV_COUNTER_FILE, settings.voucherPrefix || "PV")

  const newAccountBalance = subMoney(account.current_balance, amountOut, account.currency)

  // 7. Post Treasury Transaction
  const transaction = await appendTreasuryTransaction({
    treasury_account_id: account.id,
    transaction_date: req.transaction_date,
    posting_date: postingDate,
    transaction_type: "SUPPLIER_PAYMENT",
    description: `Payment to ${req.supplier_name}${req.bill_number ? ` (Bill: ${req.bill_number})` : ""}${req.bol_number ? ` (BOL: ${req.bol_number})` : ""}`,
    reference_number: voucherNumber,
    amount_in: 0,
    amount_out: amountOut,
    currency: account.currency,
    balance_after: newAccountBalance,
    party_name: req.supplier_name,
    source: req.payment_method,
    status: "POSTED",
    idempotency_key: idempotencyKey,
    created_by: options?.actor || req.paid_by || "Treasurer",
  })

  // 8. Update Supplier Bill if linked
  let billUpdated = false
  if (req.bill_id || req.bill_number) {
    try {
      const bills = await getAllSupplierBills()
      const targetBill = bills.find((b) => (req.bill_id && b.id === req.bill_id) || (req.bill_number && b.billNumber === req.bill_number))
      if (targetBill) {
        const prevPaid = Number(targetBill.paidAmount || 0)
        const totalAmount = Number(targetBill.totalAmount || 0)
        const newPaid = addMoney(prevPaid, amountOut, targetBill.currency)
        const newRemaining = Math.max(0, subMoney(totalAmount, newPaid, targetBill.currency))

        await saveSupplierBill({
          ...targetBill,
          paidAmount: newPaid,
          outstandingPayable: newRemaining,
          status: newRemaining <= 0 ? "paid" : "partially_paid",
          updatedAt: new Date().toISOString(),
        })
        billUpdated = true
      }
    } catch (e) {
      console.warn("[Treasury Service] Warning updating supplier bill:", e)
    }
  }

  return {
    voucherNumber,
    transaction,
    account: { ...account, current_balance: newAccountBalance },
    billUpdated,
  }
}

// -----------------------------------------------------------------
// Internal Company Transfers (Same Currency)
// -----------------------------------------------------------------
export async function executeInternalTransfer(
  req: InternalTransferRequest,
  options?: { actor?: string; role?: string }
): Promise<{
  transfer: TreasuryTransfer
  outTransaction: TreasuryTransaction
  inTransaction: TreasuryTransaction
}> {
  if (req.from_account_id === req.to_account_id) {
    throw new Error("Source and destination treasury accounts cannot be the same.")
  }

  const fromAcc = await getTreasuryAccountById(req.from_account_id)
  const toAcc = await getTreasuryAccountById(req.to_account_id)

  if (!fromAcc || !toAcc) {
    throw new Error("Source or destination treasury account was not found.")
  }

  if (fromAcc.currency.toUpperCase() !== toAcc.currency.toUpperCase()) {
    throw new Error(
      `Cross-currency transfer detected ([${fromAcc.currency}] -> [${toAcc.currency}]). ` +
      `Internal transfers require matching currencies. Please use the Currency Exchange module instead.`
    )
  }

  const amount = roundMoney(req.amount, getCurrencyDecimals(fromAcc.currency))
  if (amount <= 0) {
    throw new Error("Transfer amount must be greater than zero.")
  }

  if (!fromAcc.allow_negative_balance && (fromAcc.current_balance - amount) < 0) {
    throw new Error(
      `Insufficient funds in [${fromAcc.account_name}]. Balance: ${fromAcc.currency} ${fromAcc.current_balance}, Requested: ${amount}.`
    )
  }

  // Enforce Period Lock
  await assertAccountingPeriodOpen(req.transfer_date, {
    role: options?.role,
    actor: options?.actor || "Treasurer",
    entityType: "internal_transfer",
    entityId: req.reference,
  })

  const settings = await getTreasurySettings()
  const transferNumber = await getNextTreasuryNumber(TRF_COUNTER_FILE, settings.transferPrefix || "TRF")

  const fromNextBal = subMoney(fromAcc.current_balance, amount, fromAcc.currency)
  const toNextBal = addMoney(toAcc.current_balance, amount, toAcc.currency)

  // 1. Create Outflow Transaction
  const outTx = await appendTreasuryTransaction({
    treasury_account_id: fromAcc.id,
    transaction_date: req.transfer_date,
    posting_date: req.transfer_date,
    transaction_type: "INTERNAL_TRANSFER_OUT",
    description: `Internal Transfer to ${toAcc.account_name} [${transferNumber}]`,
    reference_number: transferNumber,
    amount_in: 0,
    amount_out: amount,
    currency: fromAcc.currency,
    balance_after: fromNextBal,
    source: "INTERNAL_TRANSFER",
    status: "POSTED",
    created_by: options?.actor || req.created_by || "Treasurer",
  })

  // 2. Create Inflow Transaction
  const inTx = await appendTreasuryTransaction({
    treasury_account_id: toAcc.id,
    transaction_date: req.transfer_date,
    posting_date: req.transfer_date,
    transaction_type: "INTERNAL_TRANSFER_IN",
    description: `Internal Transfer from ${fromAcc.account_name} [${transferNumber}]`,
    reference_number: transferNumber,
    amount_in: amount,
    amount_out: 0,
    currency: toAcc.currency,
    balance_after: toNextBal,
    source: "INTERNAL_TRANSFER",
    status: "POSTED",
    created_by: options?.actor || req.created_by || "Treasurer",
  })

  // 3. Save Transfer Record
  const transfers = await readJsonFile<TreasuryTransfer[]>(TRANSFERS_FILE, [])
  const newTransfer: TreasuryTransfer = {
    id: `trf-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    transfer_number: transferNumber,
    from_account_id: fromAcc.id,
    from_account_name: fromAcc.account_name,
    to_account_id: toAcc.id,
    to_account_name: toAcc.account_name,
    transfer_date: req.transfer_date,
    amount,
    currency: fromAcc.currency,
    reference: req.reference,
    fee: req.fee || 0,
    status: "COMPLETED",
    remarks: req.remarks,
    out_transaction_id: outTx.id,
    in_transaction_id: inTx.id,
    created_by: options?.actor || req.created_by || "Treasurer",
    created_at: new Date().toISOString(),
  }

  transfers.push(newTransfer)
  await writeJsonFile(TRANSFERS_FILE, transfers)

  return {
    transfer: newTransfer,
    outTransaction: outTx,
    inTransaction: inTx,
  }
}

export async function getTreasuryTransfers(): Promise<TreasuryTransfer[]> {
  const transfers = await readJsonFile<TreasuryTransfer[]>(TRANSFERS_FILE, [])
  return transfers.sort((a, b) => b.transfer_date.localeCompare(a.transfer_date) || b.created_at.localeCompare(a.created_at))
}

// -----------------------------------------------------------------
// Currency Exchange Engine (Cross-Currency)
// -----------------------------------------------------------------
export async function executeCurrencyExchange(
  req: CurrencyExchangeRequest,
  options?: { actor?: string; role?: string }
): Promise<{
  exchange: CurrencyExchangeTransaction
  outTransaction: TreasuryTransaction
  inTransaction: TreasuryTransaction
}> {
  const fromAcc = await getTreasuryAccountById(req.from_account_id)
  const toAcc = await getTreasuryAccountById(req.to_account_id)

  if (!fromAcc || !toAcc) {
    throw new Error("Source or destination treasury account not found for Currency Exchange.")
  }

  if (fromAcc.currency.toUpperCase() === toAcc.currency.toUpperCase()) {
    throw new Error(
      `Currencies are identical ([${fromAcc.currency}]). Use Internal Transfer for same-currency movements.`
    )
  }

  const fromAmount = roundMoney(req.from_amount, getCurrencyDecimals(fromAcc.currency))
  const toAmount = roundMoney(req.to_amount, getCurrencyDecimals(toAcc.currency))

  if (fromAmount <= 0 || toAmount <= 0) {
    throw new Error("Both exchange amounts (given and received) must be greater than zero.")
  }

  if (!fromAcc.allow_negative_balance && (fromAcc.current_balance - fromAmount) < 0) {
    throw new Error(
      `Insufficient balance in [${fromAcc.account_name}]. Available: ${fromAcc.currency} ${fromAcc.current_balance}, Required: ${fromAmount}.`
    )
  }

  // Calculate & Lock Effective Exchange Rate
  let calculatedRate = req.exchange_rate
  let rateDirection = req.rate_direction || "CUSTOM"

  if (!calculatedRate) {
    // Determine intuitive direction
    if (fromAcc.currency.toUpperCase() === "AED" && toAcc.currency.toUpperCase() === "USD") {
      calculatedRate = roundMoney(fromAmount / toAmount, 4) // e.g. 61000 / 16621 = 3.67
      rateDirection = "AED_PER_USD"
    } else if (fromAcc.currency.toUpperCase() === "USD" && toAcc.currency.toUpperCase() === "AED") {
      calculatedRate = roundMoney(toAmount / fromAmount, 4) // e.g. 3.67
      rateDirection = "AED_PER_USD"
    } else if (fromAcc.currency.toUpperCase() === "AFN" && toAcc.currency.toUpperCase() === "USD") {
      calculatedRate = roundMoney(fromAmount / toAmount, 4)
      rateDirection = "AFN_PER_USD"
    } else if (fromAcc.currency.toUpperCase() === "USD" && toAcc.currency.toUpperCase() === "AFN") {
      calculatedRate = roundMoney(toAmount / fromAmount, 4)
      rateDirection = "AFN_PER_USD"
    } else {
      calculatedRate = roundMoney(toAmount / fromAmount, 6)
      rateDirection = "CUSTOM"
    }
  }

  // Enforce Period Lock
  await assertAccountingPeriodOpen(req.date, {
    role: options?.role,
    actor: options?.actor || "Treasurer",
    entityType: "currency_exchange",
    entityId: req.reference,
  })

  const settings = await getTreasurySettings()
  const exchangeNumber = await getNextTreasuryNumber(FX_COUNTER_FILE, settings.exchangePrefix || "FX")

  const fromNextBal = subMoney(fromAcc.current_balance, fromAmount, fromAcc.currency)
  const toNextBal = addMoney(toAcc.current_balance, toAmount, toAcc.currency)

  // 1. Outflow Leg
  const outTx = await appendTreasuryTransaction({
    treasury_account_id: fromAcc.id,
    transaction_date: req.date,
    posting_date: req.date,
    transaction_type: "EXCHANGE_OUT",
    description: `Currency Exchange to ${toAcc.account_name} (${toAmount} ${toAcc.currency} @ ${calculatedRate}) [${exchangeNumber}]`,
    reference_number: exchangeNumber,
    amount_in: 0,
    amount_out: fromAmount,
    currency: fromAcc.currency,
    balance_after: fromNextBal,
    source: "CURRENCY_EXCHANGE",
    status: "POSTED",
    created_by: options?.actor || req.created_by || "Treasurer",
  })

  // 2. Inflow Leg
  const inTx = await appendTreasuryTransaction({
    treasury_account_id: toAcc.id,
    transaction_date: req.date,
    posting_date: req.date,
    transaction_type: "EXCHANGE_IN",
    description: `Currency Exchange from ${fromAcc.account_name} (${fromAmount} ${fromAcc.currency} @ ${calculatedRate}) [${exchangeNumber}]`,
    reference_number: exchangeNumber,
    amount_in: toAmount,
    amount_out: 0,
    currency: toAcc.currency,
    balance_after: toNextBal,
    source: "CURRENCY_EXCHANGE",
    status: "POSTED",
    created_by: options?.actor || req.created_by || "Treasurer",
  })

  // 3. Save Exchange Record
  const exchanges = await readJsonFile<CurrencyExchangeTransaction[]>(EXCHANGES_FILE, [])
  const newExchange: CurrencyExchangeTransaction = {
    id: `fx-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    exchange_number: exchangeNumber,
    date: req.date,
    from_treasury_account_id: fromAcc.id,
    from_account_name: fromAcc.account_name,
    from_currency: fromAcc.currency,
    from_amount: fromAmount,
    to_treasury_account_id: toAcc.id,
    to_account_name: toAcc.account_name,
    to_currency: toAcc.currency,
    to_amount: toAmount,
    exchange_rate: calculatedRate,
    rate_direction: rateDirection,
    exchange_fee: req.exchange_fee || 0,
    fee_currency: fromAcc.currency,
    counterparty: req.counterparty,
    reference: req.reference,
    remarks: req.remarks,
    status: "COMPLETED",
    out_transaction_id: outTx.id,
    in_transaction_id: inTx.id,
    created_by: options?.actor || req.created_by || "Treasurer",
    created_at: new Date().toISOString(),
  }

  exchanges.push(newExchange)
  await writeJsonFile(EXCHANGES_FILE, exchanges)

  return {
    exchange: newExchange,
    outTransaction: outTx,
    inTransaction: inTx,
  }
}

export async function getCurrencyExchanges(): Promise<CurrencyExchangeTransaction[]> {
  const exchanges = await readJsonFile<CurrencyExchangeTransaction[]>(EXCHANGES_FILE, [])
  return exchanges.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
}

// -----------------------------------------------------------------
// Reversals & Void Workflows
// -----------------------------------------------------------------
export async function reverseTreasuryTransaction(
  transactionId: string,
  reason: string,
  options?: { actor?: string; role?: string; reversalDate?: string }
): Promise<{ reversalTransaction: TreasuryTransaction; originalTransaction: TreasuryTransaction }> {
  const transactions = await readJsonFile<TreasuryTransaction[]>(TRANSACTIONS_FILE, [])
  const index = transactions.findIndex((t) => t.id === transactionId)
  if (index === -1) {
    throw new Error(`Treasury transaction [${transactionId}] not found.`)
  }

  const orig = transactions[index]
  if (orig.status === "REVERSED") {
    throw new Error(`Transaction [${orig.reference_number || orig.id}] is already reversed.`)
  }

  const reversalDate = options?.reversalDate || new Date().toISOString().split("T")[0]
  // Enforce period lock on reversal posting
  await assertAccountingPeriodOpen(reversalDate, {
    role: options?.role,
    actor: options?.actor || "Auditor",
    entityType: "reversal",
    entityId: orig.reference_number,
  })

  const account = await getTreasuryAccountById(orig.treasury_account_id)
  if (!account) {
    throw new Error(`Treasury account [${orig.treasury_account_id}] not found.`)
  }

  // Compute reversal amounts: Invert money in / money out
  const revIn = orig.amount_out // If orig disbursed, reversal brings it back in
  const revOut = orig.amount_in // If orig received, reversal takes it back out
  const nextBal = subMoney(addMoney(account.current_balance, revIn, account.currency), revOut, account.currency)

  const reversalTx = await appendTreasuryTransaction({
    treasury_account_id: account.id,
    transaction_date: reversalDate,
    posting_date: reversalDate,
    transaction_type: "REVERSAL",
    description: `REVERSAL of ${orig.reference_number || orig.id}: ${reason}`,
    reference_number: `REV-${orig.reference_number || Date.now()}`,
    amount_in: revIn,
    amount_out: revOut,
    currency: account.currency,
    balance_after: nextBal,
    reversal_of_id: orig.id,
    party_name: orig.party_name,
    status: "POSTED",
    created_by: options?.actor || "Auditor",
  })

  // Mark original transaction as reversed
  orig.status = "REVERSED"
  orig.reversed_by_id = reversalTx.id
  orig.updated_at = new Date().toISOString()
  transactions[index] = orig
  await writeJsonFile(TRANSACTIONS_FILE, transactions)

  // If customer receipt, restore customer ledger debit
  if (orig.transaction_type === "CUSTOMER_RECEIPT" && orig.party_name) {
    try {
      const db = await getAccountLedgerDatabase()
      const bolDb = await getBolAccountLedgerDatabase()
      const partyKey = (orig.party_name || "default").trim().toLowerCase().replace(/[^a-z0-9]/g, "-")

      const reversalLedgerEntry = {
        id: `led-rev-${Date.now()}`,
        sNo: 1,
        date: reversalDate,
        description: `REVERSAL: Cancelled receipt ${orig.reference_number || orig.id} (${reason})`,
        shipperDescription: orig.party_name,
        debit: orig.amount_in, // Restores receivable
        credit: 0,
      }

      const rows = db.ledgerEntries[partyKey] || db.ledgerEntries[orig.party_name] || []
      const updatedRows = [...rows, reversalLedgerEntry]
      db.ledgerEntries[partyKey] = updatedRows
      db.ledgerEntries[orig.party_name] = updatedRows
      bolDb.ledgerRecords[partyKey] = updatedRows
      bolDb.ledgerRecords[orig.party_name] = updatedRows
      await saveAccountLedgerDatabase({
        ...db,
        updated_at: new Date().toISOString(),
      } as any)
      await saveBolAccountLedgerDatabase({
        ...bolDb,
        updated_at: new Date().toISOString(),
      } as any)
    } catch (e) {
      console.warn("[Treasury Service] Warning reversing customer ledger entry:", e)
    }
  }

  return {
    reversalTransaction: reversalTx,
    originalTransaction: orig,
  }
}

// -----------------------------------------------------------------
// Reconciliation (Bank Statements & Cash Counts)
// -----------------------------------------------------------------
export async function executeReconciliation(
  data: {
    treasury_account_id: string
    period_start: string
    period_end: string
    actual_balance: number
    notes?: string
    cash_denominations?: any[]
    statement_lines?: any[]
  },
  actor = "Auditor"
): Promise<TreasuryReconciliation> {
  const account = await getTreasuryAccountById(data.treasury_account_id)
  if (!account) {
    throw new Error(`Treasury account [${data.treasury_account_id}] not found.`)
  }

  const systemBal = roundMoney(account.current_balance, getCurrencyDecimals(account.currency))
  const actualBal = roundMoney(data.actual_balance, getCurrencyDecimals(account.currency))
  const difference = roundMoney(subMoney(actualBal, systemBal, account.currency), getCurrencyDecimals(account.currency))

  const status = Math.abs(difference) < 0.01 ? "MATCHED" : "DIFFERENCE"

  const reconciliations = await readJsonFile<TreasuryReconciliation[]>(RECONCILIATIONS_FILE, [])
  const newRec: TreasuryReconciliation = {
    id: `rec-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    treasury_account_id: account.id,
    treasury_account_name: account.account_name,
    account_type: account.account_type,
    period_start: data.period_start,
    period_end: data.period_end,
    system_balance: systemBal,
    actual_balance: actualBal,
    difference,
    status,
    notes: data.notes,
    cash_denominations: data.cash_denominations,
    statement_lines: data.statement_lines,
    reconciled_by: actor,
    reconciled_at: new Date().toISOString(),
  }

  reconciliations.unshift(newRec)
  await writeJsonFile(RECONCILIATIONS_FILE, reconciliations)
  return newRec
}

export async function getTreasuryReconciliations(accountId?: string): Promise<TreasuryReconciliation[]> {
  const recs = await readJsonFile<TreasuryReconciliation[]>(RECONCILIATIONS_FILE, [])
  if (!accountId) return recs
  return recs.filter((r) => r.treasury_account_id === accountId)
}

// -----------------------------------------------------------------
// Dashboards & Financial Reports
// -----------------------------------------------------------------
export async function getTreasuryDashboardData(): Promise<TreasuryDashboardData> {
  const accounts = await getTreasuryAccounts()
  const transactions = await getTreasuryTransactions()
  const reconciliations = await getTreasuryReconciliations()

  const todayStr = new Date().toISOString().split("T")[0]

  // 1. Group Cash Positions by Currency
  const currencyMap = new Map<string, { bank: number; cash: number; exchange: number; other: number; count: number }>()

  for (const acc of accounts) {
    const c = acc.currency.toUpperCase()
    if (!currencyMap.has(c)) {
      currencyMap.set(c, { bank: 0, cash: 0, exchange: 0, other: 0, count: 0 })
    }
    const curr = currencyMap.get(c)!
    curr.count += 1
    const bal = Number(acc.current_balance) || 0
    if (acc.account_type === "BANK") curr.bank = addMoney(curr.bank, bal, c)
    else if (acc.account_type === "CASH" || acc.account_type === "PETTY_CASH") curr.cash = addMoney(curr.cash, bal, c)
    else if (acc.account_type === "EXCHANGE_DEALER") curr.exchange = addMoney(curr.exchange, bal, c)
    else curr.other = addMoney(curr.other, bal, c)
  }

  const cashPositions: CashPositionSummary[] = Array.from(currencyMap.entries()).map(([currency, val]) => ({
    currency,
    bank_total: val.bank,
    cash_total: val.cash,
    exchange_total: val.exchange,
    other_total: val.other,
    total_balance: addMoney(addMoney(addMoney(val.bank, val.cash, currency), val.exchange, currency), val.other, currency),
    account_count: val.count,
  }))

  // 2. Today's Movements by Currency
  const todayMovementMap = new Map<string, { in: number; out: number }>()
  for (const tx of transactions) {
    if (tx.status !== "POSTED") continue
    if (tx.transaction_date === todayStr || tx.posting_date === todayStr) {
      const c = tx.currency.toUpperCase()
      if (!todayMovementMap.has(c)) {
        todayMovementMap.set(c, { in: 0, out: 0 })
      }
      const m = todayMovementMap.get(c)!
      m.in = addMoney(m.in, tx.amount_in, c)
      m.out = addMoney(m.out, tx.amount_out, c)
    }
  }

  const todayMovements: DailyCashMovementSummary[] = cashPositions.map((pos) => {
    const c = pos.currency
    const m = todayMovementMap.get(c) || { in: 0, out: 0 }
    const net = subMoney(m.in, m.out, c)
    const opening = subMoney(pos.total_balance, net, c)
    return {
      currency: c,
      opening_balance: opening,
      money_in: m.in,
      money_out: m.out,
      net_movement: net,
      closing_balance: pos.total_balance,
    }
  })

  // 3. KPI counts & Inflows
  const usdMove = todayMovementMap.get("USD") || { in: 0, out: 0 }
  const aedMove = todayMovementMap.get("AED") || { in: 0, out: 0 }
  const afnMove = todayMovementMap.get("AFN") || { in: 0, out: 0 }

  return {
    accounts,
    cashPositions,
    todayMovements,
    recentTransactions: transactions.slice(0, 15),
    pendingReconciliationsCount: reconciliations.filter((r) => r.status === "DIFFERENCE").length,
    kpi: {
      totalAccounts: accounts.length,
      bankAccountsCount: accounts.filter((a) => a.account_type === "BANK").length,
      cashBoxesCount: accounts.filter((a) => a.account_type === "CASH" || a.account_type === "PETTY_CASH").length,
      exchangeAccountsCount: accounts.filter((a) => a.account_type === "EXCHANGE_DEALER").length,
      todayInflowUSD: usdMove.in,
      todayOutflowUSD: usdMove.out,
      todayInflowAED: aedMove.in,
      todayOutflowAED: aedMove.out,
      todayInflowAFN: afnMove.in,
      todayOutflowAFN: afnMove.out,
    },
  }
}

// -----------------------------------------------------------------
// Operational Cash Flow Report (Excludes Internal Transfers & FX)
// -----------------------------------------------------------------
export async function getOperationalCashFlowReport(
  periodStart: string,
  periodEnd: string
): Promise<OperationalCashFlowSummary[]> {
  const transactions = await getTreasuryTransactions()

  const currencies = ["USD", "AED", "AFN"]
  const results: OperationalCashFlowSummary[] = []

  for (const currency of currencies) {
    let customerReceipts = 0
    let supplierPayments = 0
    let operationalExpenses = 0
    let internalTransfersVolume = 0
    let currencyExchangeVolume = 0

    for (const tx of transactions) {
      if (tx.status !== "POSTED" || tx.currency.toUpperCase() !== currency) continue
      const date = tx.posting_date || tx.transaction_date
      if (date < periodStart || date > periodEnd) continue

      if (tx.transaction_type === "CUSTOMER_RECEIPT") {
        customerReceipts = addMoney(customerReceipts, tx.amount_in, currency)
      } else if (tx.transaction_type === "SUPPLIER_PAYMENT") {
        supplierPayments = addMoney(supplierPayments, tx.amount_out, currency)
      } else if (tx.transaction_type === "BANK_FEE" || tx.transaction_type === "OTHER_PAYMENT") {
        operationalExpenses = addMoney(operationalExpenses, tx.amount_out, currency)
      } else if (tx.transaction_type === "INTERNAL_TRANSFER_IN" || tx.transaction_type === "INTERNAL_TRANSFER_OUT") {
        internalTransfersVolume = addMoney(internalTransfersVolume, tx.amount_in || tx.amount_out, currency)
      } else if (tx.transaction_type === "EXCHANGE_IN" || tx.transaction_type === "EXCHANGE_OUT") {
        currencyExchangeVolume = addMoney(currencyExchangeVolume, tx.amount_in || tx.amount_out, currency)
      }
    }

    const netCashFlow = subMoney(customerReceipts, addMoney(supplierPayments, operationalExpenses, currency), currency)

    results.push({
      period_start: periodStart,
      period_end: periodEnd,
      currency,
      customer_receipts: customerReceipts,
      supplier_payments: supplierPayments,
      operational_expenses: operationalExpenses,
      net_operational_cash_flow: netCashFlow,
      internal_transfers_volume: internalTransfersVolume,
      currency_exchange_volume: currencyExchangeVolume,
    })
  }

  return results
}
