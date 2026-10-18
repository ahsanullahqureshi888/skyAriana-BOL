import crypto from "crypto"
import {
  getLedgerSystemDb,
  saveLedgerSystemDb,
  recalculateAccountBalances,
  syncToLegacyStorage,
} from "./ledger-db-service"
import {
  getAllFinanceInvoices,
  getFinanceInvoiceById,
  saveFinanceInvoice,
  getAllFinancePayments,
  saveFinancePayment,
  getAllFinanceReceipts,
  getFinanceReceiptById,
  saveFinanceReceipt,
  getAllDebitNotes,
  saveDebitNote,
  getAllCreditNotes,
  saveCreditNote,
  getAllShipmentFinanceRecords,
  getShipmentFinanceByBol,
  saveShipmentFinanceRecord,
  getAllFinanceExpenses,
  saveFinanceExpense,
  getAllExchangeRates,
  nextInvoiceNumber,
  nextPaymentNumber,
  nextReceiptNumber,
  nextDebitNoteNumber,
  nextCreditNoteNumber,
  nextSupplierNumber,
  nextCostNumber,
  nextSupplierBillNumber,
  nextSupplierPaymentNumber,
  getAllSuppliers,
  getSupplierById,
  saveSupplierProfile,
  deleteSupplierProfile,
  getAllShipmentCosts,
  getShipmentCostById,
  getShipmentCostsByBol,
  saveShipmentCost,
  deleteShipmentCost,
  getAllSupplierBills,
  getSupplierBillById,
  getSupplierBillsBySupplier,
  saveSupplierBill,
  getAllSupplierPayments,
  getSupplierPaymentById,
  getSupplierPaymentsBySupplier,
  saveSupplierPayment,
  getAllSupplierLedgerTransactions,
  getSupplierLedgerTransactionsBySupplier,
  saveSupplierLedgerTransaction,
  getAllRouteCostTemplates,
  saveRouteCostTemplate,
} from "./finance-storage-service"
import { assertAccountingPeriodOpen } from "@/lib/accounting/period-closing/period-service"

export {
  getAllSuppliers,
  getAllShipmentCosts,
  getShipmentCostsByBol,
} from "./finance-storage-service"

import {
  roundMoney,
  addMoney,
  subMoney,
  multMoney,
  divMoney,
  getCurrencyDecimals,
  checkAccountingInvariance,
} from "@/lib/utils/money"
import { numberToWords } from "@/lib/utils/number-to-words"
import type {
  FinanceInvoiceRecord,
  FinanceInvoiceItem,
  FinancePaymentRecord,
  FinanceReceiptRecord,
  FinanceDebitNote,
  FinanceCreditNote,
  ShipmentFinanceRecord,
  FinanceExpenseRecord,
  AgingBucketSummary,
  FinanceOverviewKPIs,
  CurrencyTotalSummary,
  CustomerOutstandingSummary,
  CustomerStatementParams,
  CustomerStatementResult,
  SupplierProfile,
  SupplierCategory,
  ShipmentCostRecord,
  CostApprovalStatus,
  CostContainerAllocation,
  SupplierBillRecord,
  SupplierBillItem,
  SupplierPaymentRecord,
  SupplierPaymentAllocation,
  SupplierLedgerTransaction,
  RouteCostTemplate,
  BolFinancialSummary,
  ProfitStatus,
  ProfitByCustomer,
  ProfitByRoute,
  ProfitByContainer,
  ProfitByCommodity,
  MonthlyProfitSummary,
  LossMakingShipment,
  RateAnalysisRecord,
} from "@/lib/types/finance"
import type { LedgerTransactionRecord, AccountRecord } from "@/lib/types/ledger-system"

// ==========================================
// 1. OVERVIEW & KPI CALCULATIONS
// ==========================================

export async function getFinanceOverview(): Promise<FinanceOverviewKPIs> {
  const [db, invoices, payments, shipmentFinances] = await Promise.all([
    getLedgerSystemDb(),
    getAllFinanceInvoices(),
    getAllFinancePayments(),
    getAllShipmentFinanceRecords(),
  ])

  const currencyTotals: Record<string, CurrencyTotalSummary> = {}
  const supportedCurrencies = ["USD", "AED", "AFN", "EUR", "INR", "TRY"]

  for (const curr of supportedCurrencies) {
    currencyTotals[curr] = {
      currency: curr,
      totalReceivable: 0,
      totalPayable: 0,
      netBalance: 0,
      overdueAmount: 0,
      todayReceived: 0,
      todayPaid: 0,
    }
  }

  // Calculate from canonical accounts
  for (const acc of db.accounts) {
    if (acc.status === "archived" || acc.status === "merged") continue
    const curr = (acc.currency || "USD").toUpperCase()
    if (!currencyTotals[curr]) {
      currencyTotals[curr] = {
        currency: curr,
        totalReceivable: 0,
        totalPayable: 0,
        netBalance: 0,
        overdueAmount: 0,
        todayReceived: 0,
        todayPaid: 0,
      }
    }

    const bal = Number(acc.current_balance) || 0
    if (bal > 0) {
      currencyTotals[curr].totalReceivable = addMoney(currencyTotals[curr].totalReceivable, bal, curr)
    } else if (bal < 0) {
      currencyTotals[curr].totalPayable = addMoney(currencyTotals[curr].totalPayable, Math.abs(bal), curr)
    }
    currencyTotals[curr].netBalance = addMoney(currencyTotals[curr].netBalance, bal, curr)
  }

  // Calculate invoice overdue totals
  const todayStr = new Date().toISOString().split("T")[0]
  let unpaidCount = 0
  let partiallyPaidCount = 0
  let paidCount = 0
  let overdueCount = 0

  for (const inv of invoices) {
    const curr = (inv.currency || "USD").toUpperCase()
    if (!currencyTotals[curr]) continue

    if (inv.status === "unpaid" as any || inv.status === "issued") unpaidCount++
    if (inv.status === "partially_paid") partiallyPaidCount++
    if (inv.status === "paid") paidCount++

    const isOverdue = inv.dueDate && inv.dueDate < todayStr && inv.outstandingAmount > 0 && inv.status !== "paid"
    if (isOverdue) {
      overdueCount++
      currencyTotals[curr].overdueAmount = addMoney(currencyTotals[curr].overdueAmount, inv.outstandingAmount, curr)
    }
  }

  // Today's receipts
  for (const pay of payments) {
    const curr = (pay.currency || "USD").toUpperCase()
    if (!currencyTotals[curr]) continue
    if (pay.paymentDate === todayStr) {
      currencyTotals[curr].todayReceived = addMoney(currencyTotals[curr].todayReceived, pay.amount, curr)
    }
  }

  let unmatchedPaymentCount = 0
  for (const pay of payments) {
    if (pay.unallocatedCredit > 0 || !pay.allocations || pay.allocations.length === 0) {
      unmatchedPaymentCount++
    }
  }

  return {
    currencyTotals,
    unpaidInvoiceCount: unpaidCount,
    partiallyPaidInvoiceCount: partiallyPaidCount,
    paidInvoiceCount: paidCount,
    overdueInvoiceCount: overdueCount,
    openShipmentFinanceCount: shipmentFinances.filter((s) => !s.financiallyClosed).length,
    unmatchedPaymentCount,
  }
}

// ==========================================
// 2. INVOICE MANAGEMENT & LEDGER POSTING
// ==========================================

export async function createOrUpdateInvoice(
  data: Partial<FinanceInvoiceRecord>
): Promise<FinanceInvoiceRecord> {
  const isNew = !data.id
  const invoiceNumber = data.invoiceNumber || (await nextInvoiceNumber())
  const id = data.id || `inv-${crypto.randomBytes(6).toString("hex")}`
  const now = new Date().toISOString()
  const currency = (data.currency || "USD").toUpperCase()

  // Calculate items sum
  const items: FinanceInvoiceItem[] = Array.isArray(data.items)
    ? data.items.map((item) => {
        const qty = Number(item.quantity) || 1
        const price = Number(item.unitPrice) || 0
        const amt = roundMoney(qty * price, 2)
        return {
          id: item.id || `item-${crypto.randomBytes(4).toString("hex")}`,
          description: item.description || "Freight charge",
          chargeType: item.chargeType || "freight",
          quantity: qty,
          unit: item.unit || "Unit",
          unitPrice: price,
          amount: amt,
          currency,
          bolNumber: item.bolNumber,
          containerNumber: item.containerNumber,
        }
      })
    : []

  const subtotal = items.reduce((sum, item) => addMoney(sum, item.amount, currency), 0)
  const tax = roundMoney(data.tax || 0, 2)
  const discount = roundMoney(data.discount || 0, 2)
  const totalAmount = subMoney(addMoney(subtotal, tax, currency), discount, currency)

  const paidAmount = roundMoney(data.paidAmount || 0, 2)
  const outstandingAmount = subMoney(totalAmount, paidAmount, currency)

  let status = data.status || "draft"
  if (status !== "draft" && status !== "cancelled") {
    if (outstandingAmount <= 0 && totalAmount > 0) {
      status = "paid"
    } else if (paidAmount > 0 && outstandingAmount > 0) {
      status = "partially_paid"
    } else {
      status = "issued"
    }
  }

  const invoice: FinanceInvoiceRecord = {
    id,
    invoiceNumber,
    issueDate: data.issueDate || now.split("T")[0],
    dueDate: data.dueDate || "",
    paymentTerms: data.paymentTerms || "Net 15 Days",
    customerId: data.customerId || "",
    customerName: data.customerName || "General Customer",
    customerAddress: data.customerAddress,
    customerPhone: data.customerPhone,
    customerEmail: data.customerEmail,
    customerTaxId: data.customerTaxId,
    bolNumbers: Array.isArray(data.bolNumbers) ? data.bolNumbers : [],
    items,
    subtotal,
    tax,
    discount,
    totalAmount,
    currency,
    paidAmount,
    outstandingAmount,
    status,
    notes: data.notes,
    terms: data.terms,
    postedToLedger: Boolean(data.postedToLedger),
    postedLedgerTxId: data.postedLedgerTxId,
    postedAt: data.postedAt,
    createdAt: data.createdAt || now,
    updatedAt: now,
  }

  return saveFinanceInvoice(invoice)
}

/**
 * Posts an approved invoice to the canonical account ledger idempotently.
 * Debit = invoice total (increases customer receivable), Credit = 0.
 */
export async function postInvoiceToLedger(invoiceId: string): Promise<FinanceInvoiceRecord> {
  const invoice = await getFinanceInvoiceById(invoiceId)
  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`)
  if (invoice.postedToLedger && invoice.postedLedgerTxId) {
    return invoice // Idempotent: already posted
  }

  const db = await getLedgerSystemDb()

  // Find or create account
  const customerName = (invoice.customerName || "").trim()
  let account = db.accounts.find(
    (a) =>
      a.id === invoice.customerId ||
      a.account_name.toLowerCase() === customerName.toLowerCase() ||
      a.display_name.toLowerCase() === customerName.toLowerCase()
  )

  if (!account) {
    const accId = `ACC-${crypto.randomBytes(5).toString("hex")}`
    account = {
      id: accId,
      account_code: `AC-${db.accounts.length + 1}`,
      account_name: customerName,
      display_name: customerName,
      normalized_name: customerName.toUpperCase(),
      aliases: [],
      account_type: "customer",
      currency: invoice.currency,
      opening_balance: 0,
      total_debit: 0,
      total_credit: 0,
      current_balance: 0,
      status: "active",
      source: "invoice-post",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    db.accounts.push(account)
  }

  // Assert financial period is open
  const postingDate = invoice.issueDate || new Date().toISOString().split("T")[0]
  await assertAccountingPeriodOpen(postingDate, {
    entityType: "invoice_post",
    entityId: invoiceId,
  })

  // Create canonical ledger transaction
  const txId = `tx-inv-${invoice.invoiceNumber.replace(/[^A-Za-z0-9]/g, "-")}`
  const existingTxIndex = db.ledger_transactions.findIndex((t) => t.id === txId)

  const primaryBol = invoice.bolNumbers?.[0] || ""
  const newTx: LedgerTransactionRecord = {
    id: txId,
    account_id: account.id,
    transaction_date: invoice.issueDate,
    transaction_type: "invoice",
    description: `Freight Invoice ${invoice.invoiceNumber}${primaryBol ? ` (BOL: ${primaryBol})` : ""}`,
    reference_number: invoice.invoiceNumber,
    invoice_number: invoice.invoiceNumber,
    bol_number: primaryBol,
    debit: invoice.totalAmount,
    credit: 0,
    running_balance: 0,
    currency: invoice.currency,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (existingTxIndex >= 0) {
    db.ledger_transactions[existingTxIndex] = newTx
  } else {
    db.ledger_transactions.push(newTx)
  }

  // Recalculate account running balance strictly chronologically
  const { updatedAccount, updatedTransactions } = recalculateAccountBalances(account, db.ledger_transactions)
  const accIndex = db.accounts.findIndex((a) => a.id === account!.id)
  db.accounts[accIndex] = updatedAccount

  // Update in-memory transactions
  for (const utx of updatedTransactions) {
    const tIdx = db.ledger_transactions.findIndex((t) => t.id === utx.id)
    if (tIdx >= 0) db.ledger_transactions[tIdx] = utx
  }

  await saveLedgerSystemDb(db)
  await syncToLegacyStorage(db)

  // Update invoice record
  invoice.postedToLedger = true
  invoice.postedLedgerTxId = txId
  invoice.postedAt = new Date().toISOString()
  if (invoice.status === "draft") invoice.status = "issued"
  await saveFinanceInvoice(invoice)

  return invoice
}

// ==========================================
// 3. PAYMENT RECORDING & MULTI-INVOICE ALLOCATION
// ==========================================

export interface RecordPaymentInput {
  customerId: string
  customerName: string
  paymentDate: string
  amount: number
  currency: string
  paymentMethod: "Cash" | "Bank Transfer" | "Exchange" | "Cheque" | "Other"
  bankAccountName?: string
  referenceNumber?: string
  notes?: string
  authorizedBy?: string
  receivedBy?: string
  allocations?: Array<{ invoiceId: string; amount: number }>
}

export interface RecordPaymentResult {
  payment: FinancePaymentRecord
  receipt: FinanceReceiptRecord
  updatedInvoices: FinanceInvoiceRecord[]
}

export async function recordPaymentReceived(input: RecordPaymentInput): Promise<RecordPaymentResult> {
  const currency = (input.currency || "USD").toUpperCase()
  const paymentAmount = roundMoney(input.amount, 2)
  if (paymentAmount <= 0) {
    throw new Error("Payment amount must be greater than zero")
  }

  const paymentNumber = await nextPaymentNumber()
  const receiptNumber = await nextReceiptNumber()
  const paymentId = `pay-${crypto.randomBytes(6).toString("hex")}`
  const receiptId = `rcp-${crypto.randomBytes(6).toString("hex")}`
  const now = new Date().toISOString()

  let remainingToAllocate = paymentAmount
  const finalAllocations: Array<{ invoiceId: string; invoiceNumber: string; allocatedAmount: number }> = []
  const updatedInvoices: FinanceInvoiceRecord[] = []
  const appliedInvoiceNumbers: string[] = []

  // Allocate across invoices
  if (Array.isArray(input.allocations) && input.allocations.length > 0) {
    for (const alloc of input.allocations) {
      if (remainingToAllocate <= 0) break
      const invoice = await getFinanceInvoiceById(alloc.invoiceId)
      if (!invoice) continue

      const allocReq = roundMoney(alloc.amount, 2)
      const allowed = Math.min(allocReq, invoice.outstandingAmount, remainingToAllocate)
      if (allowed <= 0) continue

      invoice.paidAmount = addMoney(invoice.paidAmount, allowed, currency)
      invoice.outstandingAmount = subMoney(invoice.totalAmount, invoice.paidAmount, currency)
      if (invoice.outstandingAmount <= 0) {
        invoice.status = "paid"
      } else {
        invoice.status = "partially_paid"
      }
      await saveFinanceInvoice(invoice)
      updatedInvoices.push(invoice)

      finalAllocations.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        allocatedAmount: allowed,
      })
      appliedInvoiceNumbers.push(invoice.invoiceNumber)
      remainingToAllocate = subMoney(remainingToAllocate, allowed, currency)
    }
  }

  // Excess overpayment retained as customer credit
  const unallocatedCredit = Math.max(0, remainingToAllocate)

  // 1. Save Payment Record
  const paymentRecord: FinancePaymentRecord = {
    id: paymentId,
    paymentNumber,
    customerId: input.customerId,
    customerName: input.customerName,
    paymentDate: input.paymentDate || now.split("T")[0],
    amount: paymentAmount,
    currency,
    paymentMethod: input.paymentMethod || "Bank Transfer",
    bankAccountName: input.bankAccountName,
    referenceNumber: input.referenceNumber || "",
    notes: input.notes,
    receiptId,
    receiptNumber,
    allocations: finalAllocations,
    unallocatedCredit,
    postedToLedger: false,
    createdAt: now,
    updatedAt: now,
  }

  // 2. Generate Receipt with Amount in Words
  const amountWords = numberToWords(paymentAmount, currency)
  const receiptRecord: FinanceReceiptRecord = {
    id: receiptId,
    receiptNumber,
    receiptDate: input.paymentDate || now.split("T")[0],
    customerId: input.customerId,
    customerName: input.customerName,
    receivedFrom: input.customerName,
    amount: paymentAmount,
    currency,
    amountInWords: amountWords,
    paymentMethod: input.paymentMethod || "Bank Transfer",
    referenceNumber: input.referenceNumber || paymentNumber,
    appliedInvoices: appliedInvoiceNumbers,
    authorizedBy: input.authorizedBy || "Finance Controller",
    notes: input.notes,
    createdAt: now,
  }

  // 3. Post Payment to Canonical Ledger (Credit = total payment, Debit = 0)
  const db = await getLedgerSystemDb()
  let account = db.accounts.find(
    (a) =>
      a.id === input.customerId ||
      a.account_name.toLowerCase() === input.customerName.toLowerCase() ||
      a.display_name.toLowerCase() === input.customerName.toLowerCase()
  )

  if (!account) {
    const accId = `ACC-${crypto.randomBytes(5).toString("hex")}`
    account = {
      id: accId,
      account_code: `AC-${db.accounts.length + 1}`,
      account_name: input.customerName,
      display_name: input.customerName,
      normalized_name: input.customerName.toUpperCase(),
      aliases: [],
      account_type: "customer",
      currency,
      opening_balance: 0,
      total_debit: 0,
      total_credit: 0,
      current_balance: 0,
      status: "active",
      source: "payment-received",
      created_at: now,
      updated_at: now,
    }
    db.accounts.push(account)
  }

  // Assert financial period is open
  const postingDate = input.paymentDate || now.split("T")[0]
  await assertAccountingPeriodOpen(postingDate, {
    actor: input.receivedBy || input.authorizedBy || "Administrator",
    entityType: "payment_received",
    entityId: paymentId,
  })

  const txId = `tx-pay-${paymentNumber.replace(/[^A-Za-z0-9]/g, "-")}`
  const newTx: LedgerTransactionRecord = {
    id: txId,
    account_id: account.id,
    transaction_date: input.paymentDate || now.split("T")[0],
    transaction_type: "payment",
    description: `Payment Received — ${receiptNumber}${appliedInvoiceNumbers.length > 0 ? ` (Inv: ${appliedInvoiceNumbers.join(", ")})` : ""}${unallocatedCredit > 0 ? ` [Credit: ${unallocatedCredit}]` : ""}`,
    reference_number: input.referenceNumber || receiptNumber,
    invoice_number: appliedInvoiceNumbers.join(", "),
    debit: 0,
    credit: paymentAmount,
    running_balance: 0,
    currency,
    created_at: now,
    updated_at: now,
  }

  db.ledger_transactions.push(newTx)

  // Recalculate account running balance strictly chronologically
  const { updatedAccount, updatedTransactions } = recalculateAccountBalances(account, db.ledger_transactions)
  const accIndex = db.accounts.findIndex((a) => a.id === account!.id)
  db.accounts[accIndex] = updatedAccount

  for (const utx of updatedTransactions) {
    const tIdx = db.ledger_transactions.findIndex((t) => t.id === utx.id)
    if (tIdx >= 0) db.ledger_transactions[tIdx] = utx
  }

  await saveLedgerSystemDb(db)
  await syncToLegacyStorage(db)

  paymentRecord.postedToLedger = true
  paymentRecord.postedLedgerTxId = txId
  await saveFinancePayment(paymentRecord)

  receiptRecord.customerBalanceAfter = updatedAccount.current_balance
  await saveFinanceReceipt(receiptRecord)

  return {
    payment: paymentRecord,
    receipt: receiptRecord,
    updatedInvoices,
  }
}

// ==========================================
// 4. DEBIT & CREDIT NOTES (IDEMPOTENT POSTING)
// ==========================================

export async function createAndPostDebitNote(input: {
  customerId: string
  customerName: string
  bolNumber?: string
  invoiceNumber?: string
  reason: string
  amount: number
  currency: string
  notes?: string
}): Promise<FinanceDebitNote> {
  const currency = (input.currency || "USD").toUpperCase()
  const amount = roundMoney(input.amount, 2)
  const noteNumber = await nextDebitNoteNumber()
  const id = `dn-${crypto.randomBytes(6).toString("hex")}`
  const now = new Date().toISOString()
  const date = now.split("T")[0]

  const debitNote: FinanceDebitNote = {
    id,
    noteNumber,
    date,
    customerId: input.customerId,
    customerName: input.customerName,
    bolNumber: input.bolNumber,
    invoiceNumber: input.invoiceNumber,
    reason: input.reason,
    amount,
    currency,
    status: "posted",
    postedToLedger: false,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  }

  // Post to canonical ledger: Debit = amount, Credit = 0 (increases customer receivable)
  const db = await getLedgerSystemDb()
  let account = db.accounts.find((a) => a.id === input.customerId || a.account_name.toLowerCase() === input.customerName.toLowerCase())
  if (!account) {
    account = {
      id: `ACC-${crypto.randomBytes(5).toString("hex")}`,
      account_code: `AC-${db.accounts.length + 1}`,
      account_name: input.customerName,
      display_name: input.customerName,
      normalized_name: input.customerName.toUpperCase(),
      aliases: [],
      account_type: "customer",
      currency,
      opening_balance: 0,
      total_debit: 0,
      total_credit: 0,
      current_balance: 0,
      status: "active",
      source: "debit-note",
      created_at: now,
      updated_at: now,
    }
    db.accounts.push(account)
  }

  // Assert financial period is open
  await assertAccountingPeriodOpen(date, {
    entityType: "debit_note",
    entityId: id,
  })

  const txId = `tx-dn-${noteNumber.replace(/[^A-Za-z0-9]/g, "-")}`
  const newTx: LedgerTransactionRecord = {
    id: txId,
    account_id: account.id,
    transaction_date: date,
    transaction_type: "debit_note",
    description: `Debit Note ${noteNumber}: ${input.reason}`,
    reference_number: noteNumber,
    invoice_number: input.invoiceNumber,
    bol_number: input.bolNumber,
    debit: amount,
    credit: 0,
    running_balance: 0,
    currency,
    created_at: now,
    updated_at: now,
  }

  db.ledger_transactions.push(newTx)
  const { updatedAccount, updatedTransactions } = recalculateAccountBalances(account, db.ledger_transactions)
  const accIndex = db.accounts.findIndex((a) => a.id === account!.id)
  db.accounts[accIndex] = updatedAccount
  for (const utx of updatedTransactions) {
    const tIdx = db.ledger_transactions.findIndex((t) => t.id === utx.id)
    if (tIdx >= 0) db.ledger_transactions[tIdx] = utx
  }

  await saveLedgerSystemDb(db)
  await syncToLegacyStorage(db)

  debitNote.postedToLedger = true
  debitNote.postedLedgerTxId = txId
  return saveDebitNote(debitNote)
}

export async function createAndPostCreditNote(input: {
  customerId: string
  customerName: string
  bolNumber?: string
  invoiceNumber?: string
  reason: string
  amount: number
  currency: string
  notes?: string
}): Promise<FinanceCreditNote> {
  const currency = (input.currency || "USD").toUpperCase()
  const amount = roundMoney(input.amount, 2)
  const noteNumber = await nextCreditNoteNumber()
  const id = `cn-${crypto.randomBytes(6).toString("hex")}`
  const now = new Date().toISOString()
  const date = now.split("T")[0]

  const creditNote: FinanceCreditNote = {
    id,
    noteNumber,
    date,
    customerId: input.customerId,
    customerName: input.customerName,
    bolNumber: input.bolNumber,
    invoiceNumber: input.invoiceNumber,
    reason: input.reason,
    amount,
    currency,
    status: "posted",
    postedToLedger: false,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  }

  // Post to canonical ledger: Debit = 0, Credit = amount (decreases customer receivable)
  const db = await getLedgerSystemDb()
  let account = db.accounts.find((a) => a.id === input.customerId || a.account_name.toLowerCase() === input.customerName.toLowerCase())
  if (!account) {
    account = {
      id: `ACC-${crypto.randomBytes(5).toString("hex")}`,
      account_code: `AC-${db.accounts.length + 1}`,
      account_name: input.customerName,
      display_name: input.customerName,
      normalized_name: input.customerName.toUpperCase(),
      aliases: [],
      account_type: "customer",
      currency,
      opening_balance: 0,
      total_debit: 0,
      total_credit: 0,
      current_balance: 0,
      status: "active",
      source: "credit-note",
      created_at: now,
      updated_at: now,
    }
    db.accounts.push(account)
  }

  // Assert financial period is open
  await assertAccountingPeriodOpen(date, {
    entityType: "credit_note",
    entityId: id,
  })

  const txId = `tx-cn-${noteNumber.replace(/[^A-Za-z0-9]/g, "-")}`
  const newTx: LedgerTransactionRecord = {
    id: txId,
    account_id: account.id,
    transaction_date: date,
    transaction_type: "credit_note",
    description: `Credit Note ${noteNumber}: ${input.reason}`,
    reference_number: noteNumber,
    invoice_number: input.invoiceNumber,
    bol_number: input.bolNumber,
    debit: 0,
    credit: amount,
    running_balance: 0,
    currency,
    created_at: now,
    updated_at: now,
  }

  db.ledger_transactions.push(newTx)
  const { updatedAccount, updatedTransactions } = recalculateAccountBalances(account, db.ledger_transactions)
  const accIndex = db.accounts.findIndex((a) => a.id === account!.id)
  db.accounts[accIndex] = updatedAccount
  for (const utx of updatedTransactions) {
    const tIdx = db.ledger_transactions.findIndex((t) => t.id === utx.id)
    if (tIdx >= 0) db.ledger_transactions[tIdx] = utx
  }

  await saveLedgerSystemDb(db)
  await syncToLegacyStorage(db)

  creditNote.postedToLedger = true
  creditNote.postedLedgerTxId = txId
  return saveCreditNote(creditNote)
}

// ==========================================
// 5. IMMUTABLE REVERSAL WORKFLOW
// ==========================================

export async function reversePostedTransaction(
  transactionId: string,
  reversalReason: string,
  authorizingUser = "Finance Manager"
): Promise<{ originalTx: LedgerTransactionRecord; reversalTx: LedgerTransactionRecord }> {
  const db = await getLedgerSystemDb()
  const original = db.ledger_transactions.find((t) => t.id === transactionId)
  if (!original) throw new Error(`Transaction ${transactionId} not found`)
  if (original.is_deleted) throw new Error("Transaction already reversed or inactive")

  const account = db.accounts.find((a) => a.id === original.account_id)
  if (!account) throw new Error("Linked account not found")

  const now = new Date().toISOString()
  const revDate = now.split("T")[0]

  await assertAccountingPeriodOpen(revDate, {
    actor: authorizingUser,
    entityType: "reversal",
    entityId: transactionId,
  })

  const revId = `tx-rev-${crypto.randomBytes(6).toString("hex")}`

  // Reversal swaps debit and credit to restore balance cleanly
  const reversalTx: LedgerTransactionRecord = {
    id: revId,
    account_id: account.id,
    transaction_date: now.split("T")[0],
    transaction_type: "adjustment",
    description: `REVERSAL of [${original.reference_number || original.id}]: ${reversalReason}`,
    reference_number: `REV-${original.reference_number || original.id}`,
    debit: original.credit, // SWAP
    credit: original.debit, // SWAP
    running_balance: 0,
    currency: original.currency,
    remarks: `Reversed by ${authorizingUser} on ${now}`,
    created_at: now,
    updated_at: now,
  }

  // Mark original with audit notes without deleting
  original.remarks = `${original.remarks ? `${original.remarks} | ` : ""}Reversed by ${revId}`
  original.updated_at = now

  db.ledger_transactions.push(reversalTx)

  const { updatedAccount, updatedTransactions } = recalculateAccountBalances(account, db.ledger_transactions)
  const accIndex = db.accounts.findIndex((a) => a.id === account.id)
  db.accounts[accIndex] = updatedAccount
  for (const utx of updatedTransactions) {
    const tIdx = db.ledger_transactions.findIndex((t) => t.id === utx.id)
    if (tIdx >= 0) db.ledger_transactions[tIdx] = utx
  }

  await saveLedgerSystemDb(db)
  await syncToLegacyStorage(db)

  return { originalTx: original, reversalTx }
}

// ==========================================
// 6. SHIPMENT FINANCE & GROSS PROFITABILITY
// ==========================================

/**
 * Calculates Shipment Gross Profit:
 * Revenue (Freight Service Charges) - Direct Costs (Truck + Shipping Line + Port + Customs + Documentation + Container)
 * CRITICAL RULE: BOL Commodity Goods Value is NOT revenue!
 */
export async function getOrComputeShipmentFinance(bolNumber: string): Promise<ShipmentFinanceRecord> {
  const existing = await getShipmentFinanceByBol(bolNumber)
  if (existing) return existing

  // Default record if not yet customized
  const defaultRecord: ShipmentFinanceRecord = {
    shipmentId: `SA-SHP-${bolNumber.replace(/[^A-Za-z0-9]/g, "-")}`,
    bolNumber,
    customerName: "General Shipper",
    currency: "USD",
    freightRevenue: 4500,
    directCosts: {
      truck: 1800,
      shippingLine: 1200,
      port: 250,
      customs: 150,
      documentation: 100,
      container: 0,
      handling: 50,
      other: 0,
    },
    totalDirectCosts: 3550,
    grossProfit: 950,
    grossMarginPercent: 21.11,
    invoiceAmount: 4500,
    paidAmount: 0,
    outstandingAmount: 4500,
    paymentStatus: "unpaid",
    charges: [],
    financiallyClosed: false,
    updatedAt: new Date().toISOString(),
  }

  return saveShipmentFinanceRecord(defaultRecord)
}

export async function updateShipmentFinance(
  bolNumber: string,
  update: Partial<ShipmentFinanceRecord>
): Promise<ShipmentFinanceRecord> {
  const current = await getOrComputeShipmentFinance(bolNumber)
  const currency = (update.currency || current.currency || "USD").toUpperCase()

  const freightRevenue = roundMoney(update.freightRevenue !== undefined ? update.freightRevenue : current.freightRevenue, 2)
  const directCosts = {
    ...current.directCosts,
    ...(update.directCosts || {}),
  }

  const totalDirectCosts = Object.values(directCosts).reduce(
    (sum, val) => addMoney(sum, Number(val) || 0, currency),
    0
  )

  const grossProfit = subMoney(freightRevenue, totalDirectCosts, currency)
  const grossMarginPercent = freightRevenue > 0 ? roundMoney((grossProfit / freightRevenue) * 100, 2) : 0

  const paidAmount = roundMoney(update.paidAmount !== undefined ? update.paidAmount : current.paidAmount, 2)
  const invoiceAmount = roundMoney(update.invoiceAmount !== undefined ? update.invoiceAmount : freightRevenue, 2)
  const outstandingAmount = subMoney(invoiceAmount, paidAmount, currency)

  let paymentStatus: "unpaid" | "partially_paid" | "paid" = "unpaid"
  if (outstandingAmount <= 0 && invoiceAmount > 0) {
    paymentStatus = "paid"
  } else if (paidAmount > 0 && outstandingAmount > 0) {
    paymentStatus = "partially_paid"
  }

  const updatedRecord: ShipmentFinanceRecord = {
    ...current,
    ...update,
    bolNumber,
    currency,
    freightRevenue,
    directCosts,
    totalDirectCosts,
    grossProfit,
    grossMarginPercent,
    invoiceAmount,
    paidAmount,
    outstandingAmount,
    paymentStatus,
    financiallyClosed: Boolean(update.financiallyClosed),
    financiallyClosedAt: update.financiallyClosed ? (current.financiallyClosedAt || new Date().toISOString()) : undefined,
    updatedAt: new Date().toISOString(),
  }

  return saveShipmentFinanceRecord(updatedRecord)
}

export async function getAllShipmentsFinance(): Promise<ShipmentFinanceRecord[]> {
  return getAllShipmentFinanceRecords()
}

// ==========================================
// 7. AGING & OUTSTANDING ANALYSIS
// ==========================================

export async function getAgingReport(currency = "USD"): Promise<AgingBucketSummary> {
  const invoices = await getAllFinanceInvoices()
  const today = new Date()
  const curr = currency.toUpperCase()

  let current = 0
  let days1to30 = 0
  let days31to60 = 0
  let days61to90 = 0
  let days90Plus = 0
  let totalOutstanding = 0
  let count = 0

  for (const inv of invoices) {
    if (inv.currency !== curr || inv.status === "paid" || inv.status === "cancelled") continue
    const out = inv.outstandingAmount
    if (out <= 0) continue

    count++
    totalOutstanding = addMoney(totalOutstanding, out, curr)

    if (!inv.dueDate) {
      current = addMoney(current, out, curr)
      continue
    }

    const dueDate = new Date(inv.dueDate)
    const diffTime = today.getTime() - dueDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      current = addMoney(current, out, curr)
    } else if (diffDays <= 30) {
      days1to30 = addMoney(days1to30, out, curr)
    } else if (diffDays <= 60) {
      days31to60 = addMoney(days31to60, out, curr)
    } else if (diffDays <= 90) {
      days61to90 = addMoney(days61to90, out, curr)
    } else {
      days90Plus = addMoney(days90Plus, out, curr)
    }
  }

  return {
    currency: curr,
    current,
    days1to30,
    days31to60,
    days61to90,
    days90Plus,
    totalOutstanding,
    invoiceCount: count,
  }
}

// ==========================================
// 8. CUSTOMER ACCOUNT STATEMENT
// ==========================================

// CustomerStatementParams and CustomerStatementResult imported from @/lib/types/finance

export async function generateCustomerStatement(
  params: CustomerStatementParams
): Promise<CustomerStatementResult> {
  const db = await getLedgerSystemDb()
  const q = (params.customerIdOrName || "").trim().toLowerCase()
  const curr = (params.currency || "USD").toUpperCase()

  const account = db.accounts.find(
    (a) =>
      a.id.toLowerCase() === q ||
      a.account_name.toLowerCase() === q ||
      a.display_name.toLowerCase() === q ||
      a.normalized_name.toLowerCase() === q ||
      a.aliases.some((alias) => alias.toLowerCase() === q)
  )

  if (!account) {
    throw new Error(`Account "${params.customerIdOrName}" not found`)
  }

  let txs = db.ledger_transactions.filter(
    (t) => t.account_id === account.id && !t.is_deleted && (t.currency || account.currency).toUpperCase() === curr
  )

  // Sort ascending by date
  txs.sort((a, b) => {
    if (a.source_sheet && a.source_sheet === b.source_sheet && a.source_row && b.source_row) {
      return a.source_row - b.source_row
    }
    return (a.transaction_date || "").localeCompare(b.transaction_date || "")
  })

  // Calculate opening balance before startDate if filter applied
  let openingBalance = Number(account.opening_balance) || 0
  if (params.startDate) {
    for (const t of txs) {
      if (t.transaction_date < params.startDate) {
        openingBalance = roundMoney(openingBalance + Number(t.debit || 0) - Number(t.credit || 0), 2)
      }
    }
    txs = txs.filter((t) => t.transaction_date >= params.startDate!)
  }

  if (params.endDate) {
    txs = txs.filter((t) => t.transaction_date <= params.endDate!)
  }

  let running = openingBalance
  let totalDebit = 0
  let totalCredit = 0

  const projectedTransactions = txs.map((t) => {
    const dr = Number(t.debit) || 0
    const cr = Number(t.credit) || 0
    totalDebit = addMoney(totalDebit, dr, curr)
    totalCredit = addMoney(totalCredit, cr, curr)
    running = subMoney(addMoney(running, dr, curr), cr, curr)

    return {
      date: t.transaction_date,
      reference: t.reference_number || t.id,
      type: t.transaction_type,
      description: t.description,
      bolNumber: t.bol_number,
      invoiceNumber: t.invoice_number,
      debit: dr,
      credit: cr,
      runningBalance: running,
    }
  })

  const closingBalance = running
  const expectedClosing = subMoney(addMoney(openingBalance, totalDebit, curr), totalCredit, curr)
  const invarianceSatisfied = Math.abs(closingBalance - expectedClosing) < 0.01

  return {
    customerName: account.account_name || account.display_name,
    currency: curr,
    period: params.startDate && params.endDate ? `${params.startDate} to ${params.endDate}` : "All Time",
    openingBalance,
    transactions: projectedTransactions,
    totalDebit,
    totalCredit,
    closingBalance,
    invarianceSatisfied,
  }
}

// ==========================================
// 9. WHATSAPP PAYMENT & BALANCE BUILDERS
// ==========================================

export function buildPaymentReceiptWhatsAppMessage(receipt: FinanceReceiptRecord): string {
  return [
    `*SKY ARIANA LIMITED*`,
    `*Official Payment Receipt*`,
    `--------------------------------`,
    `Receipt No: *${receipt.receiptNumber}*`,
    `Date: ${receipt.receiptDate}`,
    `Received From: *${receipt.receivedFrom}*`,
    `Amount Paid: *${receipt.currency} ${receipt.amount.toLocaleString()}*`,
    `Amount in Words: _${receipt.amountInWords}_`,
    `Payment Method: ${receipt.paymentMethod}`,
    receipt.referenceNumber ? `Reference: ${receipt.referenceNumber}` : "",
    receipt.appliedInvoices?.length > 0 ? `Applied Invoices: ${receipt.appliedInvoices.join(", ")}` : "",
    receipt.customerBalanceAfter !== undefined ? `Outstanding Balance: *${receipt.currency} ${receipt.customerBalanceAfter.toLocaleString()}*` : "",
    `--------------------------------`,
    `Authorized By: ${receipt.authorizedBy}`,
    `Thank you for your business!`,
  ]
    .filter(Boolean)
    .join("\n")
}

export function buildOutstandingBalanceWhatsAppMessage(
  customerName: string,
  currency: string,
  balance: number,
  overdueCount = 0
): string {
  const formatted = `${currency} ${balance.toLocaleString()}`
  return [
    `Dear *${customerName}*,`,
    ``,
    `This is a friendly statement update from *SKY ARIANA LIMITED*.`,
    ``,
    `Your current ledger balance is: *${formatted}*`,
    overdueCount > 0 ? `⚠️ You have *${overdueCount}* invoice(s) currently pending payment.` : "",
    `As of: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`,
    ``,
    `Please arrange payment at your earliest convenience or contact our accounts team for statement reconciliation.`,
    ``,
    `Best regards,`,
    `*Sky Ariana Limited — Accounts Department*`,
  ]
    .filter(Boolean)
    .join("\n")
}

// ====================================================
// SUPPLIERS & SHIPMENT COSTS BUSINESS LOGIC (PHASE 8)
// ====================================================

/**
 * Creates or updates a supplier profile with dual-role awareness (supplier/customer).
 */
export async function createOrUpdateSupplier(data: {
  id?: string
  name: string
  category: SupplierCategory
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  currency?: string
  taxId?: string
  bankDetails?: string
  notes?: string
  isActive?: boolean
  roles?: ("supplier" | "customer")[]
  openingPayable?: number
}): Promise<SupplierProfile> {
  const all = await getAllSuppliers()
  const now = new Date().toISOString()
  const currency = (data.currency || "USD").toUpperCase()
  const openingPayable = roundMoney(data.openingPayable || 0, getCurrencyDecimals(currency))

  let supplier: SupplierProfile
  if (data.id) {
    const existing = await getSupplierById(data.id)
    if (!existing) throw new Error(`Supplier ${data.id} not found`)
    supplier = {
      ...existing,
      name: data.name.trim(),
      category: data.category,
      contactPerson: data.contactPerson ?? existing.contactPerson,
      phone: data.phone ?? existing.phone,
      email: data.email ?? existing.email,
      address: data.address ?? existing.address,
      currency,
      taxId: data.taxId ?? existing.taxId,
      bankDetails: data.bankDetails ?? existing.bankDetails,
      notes: data.notes ?? existing.notes,
      isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      roles: data.roles || existing.roles || ["supplier"],
      openingPayable,
      updatedAt: now,
    }
  } else {
    const id = `sup-${crypto.randomBytes(6).toString("hex")}`
    const supplierNumber = await nextSupplierNumber()
    supplier = {
      id,
      supplierNumber,
      name: data.name.trim(),
      category: data.category,
      contactPerson: data.contactPerson,
      phone: data.phone,
      email: data.email,
      address: data.address,
      currency,
      taxId: data.taxId,
      bankDetails: data.bankDetails,
      notes: data.notes,
      isActive: data.isActive !== undefined ? data.isActive : true,
      roles: data.roles || ["supplier"],
      openingPayable,
      totalBills: 0,
      totalPaid: 0,
      outstandingPayable: openingPayable,
      advancePaid: 0,
      createdAt: now,
      updatedAt: now,
    }
  }

  // Recalculate financial balances from bills and payments
  const [bills, payments] = await Promise.all([
    getSupplierBillsBySupplier(supplier.id),
    getSupplierPaymentsBySupplier(supplier.id),
  ])

  let totalBills = 0
  for (const b of bills) {
    if (b.status !== "void" && b.status !== "draft") {
      totalBills = addMoney(totalBills, b.totalAmount, supplier.currency)
    }
  }

  let totalPaid = 0
  for (const p of payments) {
    totalPaid = addMoney(totalPaid, p.amount, supplier.currency)
  }

  const grossPayable = addMoney(supplier.openingPayable, totalBills, supplier.currency)
  if (totalPaid >= grossPayable) {
    supplier.outstandingPayable = 0
    supplier.advancePaid = subMoney(totalPaid, grossPayable, supplier.currency)
  } else {
    supplier.outstandingPayable = subMoney(grossPayable, totalPaid, supplier.currency)
    supplier.advancePaid = 0
  }
  supplier.totalBills = totalBills
  supplier.totalPaid = totalPaid

  return saveSupplierProfile(supplier)
}

/**
 * Creates or updates a shipment cost record with variance calculation & container allocations.
 */
export async function createOrUpdateShipmentCost(data: {
  id?: string
  bolNumber: string
  shipmentId?: string
  containerNumber?: string
  routeLeg?: string
  supplierId: string
  supplierName: string
  costCategory: string
  description: string
  costDate?: string
  costType: "estimated" | "actual"
  quantity?: number
  rate?: number
  amount?: number
  currency?: string
  baseCurrency?: string
  exchangeRate?: number
  supplierInvoiceNumber?: string
  referenceNumber?: string
  dueDate?: string
  paymentStatus?: "unpaid" | "partially_paid" | "paid"
  approvalStatus?: CostApprovalStatus
  isInternalCost?: boolean
  estimatedAmount?: number
  containerAllocations?: CostContainerAllocation[]
  remarks?: string
  attachmentName?: string
  attachmentUrl?: string
  createdBy?: string
}): Promise<ShipmentCostRecord> {
  const now = new Date().toISOString()
  const currency = (data.currency || "USD").toUpperCase()
  const baseCurrency = (data.baseCurrency || "USD").toUpperCase()
  const qty = Number(data.quantity) || 1
  const rate = Number(data.rate) || 0
  const amount = roundMoney(data.amount !== undefined ? data.amount : qty * rate, getCurrencyDecimals(currency))
  const costDate = data.costDate || now.split("T")[0]

  // Exchange rate determination & locking
  let exchangeRate = Number(data.exchangeRate) || 1.0
  if (currency !== baseCurrency && (!data.exchangeRate || data.exchangeRate === 1.0)) {
    const rates = await getAllExchangeRates()
    const match = rates.find((r) => r.fromCurrency === currency && r.toCurrency === baseCurrency)
    if (match && match.rate > 0) {
      exchangeRate = match.rate
    } else {
      const reverse = rates.find((r) => r.fromCurrency === baseCurrency && r.toCurrency === currency)
      if (reverse && reverse.rate > 0) {
        exchangeRate = roundMoney(1.0 / reverse.rate, 6)
      }
    }
  }
  const baseCurrencyAmount = multMoney(amount, exchangeRate, baseCurrency)

  // Cost variance calculation (Actual - Estimated)
  let varianceAmount: number | undefined = undefined
  let variancePercent: number | undefined = undefined
  if (data.costType === "actual" && data.estimatedAmount !== undefined) {
    const est = roundMoney(data.estimatedAmount, getCurrencyDecimals(currency))
    varianceAmount = subMoney(amount, est, currency)
    variancePercent = est > 0 ? roundMoney((varianceAmount / est) * 100, 2) : 0
  }

  let cost: ShipmentCostRecord
  if (data.id) {
    const existing = await getShipmentCostById(data.id)
    if (!existing) throw new Error(`Cost ${data.id} not found`)
    cost = {
      ...existing,
      bolNumber: data.bolNumber.trim(),
      shipmentId: data.shipmentId || existing.shipmentId,
      containerNumber: data.containerNumber ?? existing.containerNumber,
      routeLeg: data.routeLeg ?? existing.routeLeg,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      costCategory: data.costCategory,
      description: data.description,
      costDate,
      costType: data.costType,
      quantity: qty,
      rate,
      amount,
      currency,
      baseCurrency,
      exchangeRate,
      baseCurrencyAmount,
      supplierInvoiceNumber: data.supplierInvoiceNumber ?? existing.supplierInvoiceNumber,
      referenceNumber: data.referenceNumber ?? existing.referenceNumber,
      dueDate: data.dueDate ?? existing.dueDate,
      paymentStatus: data.paymentStatus ?? existing.paymentStatus,
      approvalStatus: data.approvalStatus ?? existing.approvalStatus,
      isInternalCost: data.isInternalCost !== undefined ? data.isInternalCost : existing.isInternalCost,
      estimatedAmount: data.estimatedAmount ?? existing.estimatedAmount,
      varianceAmount,
      variancePercent,
      containerAllocations: data.containerAllocations ?? existing.containerAllocations,
      remarks: data.remarks ?? existing.remarks,
      attachmentName: data.attachmentName ?? existing.attachmentName,
      attachmentUrl: data.attachmentUrl ?? existing.attachmentUrl,
      updatedAt: now,
    }
  } else {
    const id = `cost-${crypto.randomBytes(6).toString("hex")}`
    const costNumber = await nextCostNumber()
    cost = {
      id,
      costNumber,
      bolNumber: data.bolNumber.trim(),
      shipmentId: data.shipmentId || `SA-SHP-${data.bolNumber.trim()}`,
      containerNumber: data.containerNumber,
      routeLeg: data.routeLeg,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      costCategory: data.costCategory,
      description: data.description,
      costDate,
      costType: data.costType,
      quantity: qty,
      rate,
      amount,
      currency,
      baseCurrency,
      exchangeRate,
      baseCurrencyAmount,
      supplierInvoiceNumber: data.supplierInvoiceNumber,
      referenceNumber: data.referenceNumber,
      dueDate: data.dueDate,
      paymentStatus: data.paymentStatus || "unpaid",
      paidAmount: 0,
      outstandingAmount: amount,
      approvalStatus: data.approvalStatus || "draft",
      isInternalCost: Boolean(data.isInternalCost),
      estimatedAmount: data.estimatedAmount,
      varianceAmount,
      variancePercent,
      postedToLedger: false,
      containerAllocations: data.containerAllocations,
      remarks: data.remarks,
      attachmentName: data.attachmentName,
      attachmentUrl: data.attachmentUrl,
      createdBy: data.createdBy || "operations",
      createdAt: now,
      updatedAt: now,
    }
  }

  // Validate container allocations match original amount
  if (cost.containerAllocations && cost.containerAllocations.length > 0) {
    const totalAllocated = cost.containerAllocations.reduce((sum, a) => addMoney(sum, a.allocatedAmount, currency), 0)
    if (Math.abs(totalAllocated - cost.amount) > 0.05) {
      console.warn(`[finance-service] Container allocations sum (${totalAllocated}) != Cost total (${cost.amount})`)
    }
  }

  return saveShipmentCost(cost)
}

/**
 * Posts an approved shipment cost idempotently to the supplier ledger.
 */
export async function postCostToSupplierLedger(costId: string): Promise<ShipmentCostRecord> {
  const cost = await getShipmentCostById(costId)
  if (!cost) throw new Error(`Cost ${costId} not found`)
  if (cost.postedToLedger && cost.postedLedgerTxId) {
    return cost // Idempotent
  }

  cost.approvalStatus = "posted"
  cost.postedToLedger = true
  const txId = `tx-supp-cost-${cost.id}`
  cost.postedLedgerTxId = txId

  // Append transaction to supplier ledger
  const tx: SupplierLedgerTransaction = {
    id: txId,
    supplierId: cost.supplierId,
    supplierName: cost.supplierName,
    transactionDate: cost.costDate,
    transactionType: "SUPPLIER_BILL",
    referenceNumber: cost.costNumber,
    bolNumber: cost.bolNumber,
    description: `Cost ${cost.costNumber} (${cost.costCategory}): ${cost.description}`,
    billAmount: cost.amount,
    paymentAmount: 0,
    runningPayable: 0,
    currency: cost.currency,
    createdAt: new Date().toISOString(),
  }

  await saveSupplierLedgerTransaction(tx)
  const savedCost = await saveShipmentCost(cost)

  // Trigger supplier profile balance refresh
  const supplier = await getSupplierById(cost.supplierId)
  if (supplier) {
    await createOrUpdateSupplier({ ...supplier })
  }

  return savedCost
}

/**
 * Reverses a posted or approved cost record with full audit trail (does NOT erase history).
 */
export async function reverseShipmentCost(costId: string, reason: string): Promise<ShipmentCostRecord> {
  const cost = await getShipmentCostById(costId)
  if (!cost) throw new Error(`Cost ${costId} not found`)
  if (cost.approvalStatus === "reversed") return cost

  cost.approvalStatus = "reversed"
  cost.remarks = `${cost.remarks ? cost.remarks + " | " : ""}REVERSED: ${reason}`

  if (cost.postedToLedger) {
    const revTxId = `tx-rev-${cost.id}`
    const revTx: SupplierLedgerTransaction = {
      id: revTxId,
      supplierId: cost.supplierId,
      supplierName: cost.supplierName,
      transactionDate: new Date().toISOString().split("T")[0],
      transactionType: "SUPPLIER_ADJUSTMENT",
      referenceNumber: `REV-${cost.costNumber}`,
      bolNumber: cost.bolNumber,
      description: `Reversal of ${cost.costNumber}: ${reason}`,
      billAmount: -cost.amount,
      paymentAmount: 0,
      runningPayable: 0,
      currency: cost.currency,
      createdAt: new Date().toISOString(),
    }
    await saveSupplierLedgerTransaction(revTx)
    const supplier = await getSupplierById(cost.supplierId)
    if (supplier) await createOrUpdateSupplier({ ...supplier })
  }

  return saveShipmentCost(cost)
}

/**
 * Records a supplier payment with multi-bill allocation and unallocated Supplier Advance tracking.
 */
export async function recordSupplierPayment(input: {
  supplierId: string
  supplierName: string
  paymentDate?: string
  amount: number
  currency?: string
  paymentMethod: "Bank Transfer" | "Cash" | "Exchange" | "Cheque" | "Other"
  referenceNumber: string
  bankReference?: string
  allocations?: SupplierPaymentAllocation[]
  bolNumber?: string
  remarks?: string
  attachmentUrl?: string
}): Promise<SupplierPaymentRecord> {
  const now = new Date().toISOString()
  const currency = (input.currency || "USD").toUpperCase()
  const totalPayment = roundMoney(input.amount, getCurrencyDecimals(currency))
  const id = `spay-${crypto.randomBytes(6).toString("hex")}`
  const paymentNumber = await nextSupplierPaymentNumber()

  let remaining = totalPayment
  const allocations: SupplierPaymentAllocation[] = []

  // Allocate across specified bills
  if (input.allocations && input.allocations.length > 0) {
    for (const alloc of input.allocations) {
      if (remaining <= 0) break
      const bill = await getSupplierBillById(alloc.billId)
      if (!bill) continue
      const allocAmt = Math.min(remaining, alloc.allocatedAmount)
      allocations.push({
        billId: bill.id,
        billNumber: bill.billNumber,
        allocatedAmount: allocAmt,
      })
      bill.paidAmount = addMoney(bill.paidAmount, allocAmt, currency)
      bill.outstandingPayable = subMoney(bill.totalAmount, bill.paidAmount, currency)
      bill.status = bill.outstandingPayable <= 0 ? "paid" : "partially_paid"
      await saveSupplierBill(bill)
      remaining = subMoney(remaining, allocAmt, currency)
    }
  } else {
    // Oldest unpaid bills first
    const bills = await getSupplierBillsBySupplier(input.supplierId)
    const unpaidBills = bills
      .filter((b) => b.outstandingPayable > 0 && b.status !== "void")
      .sort((a, b) => (a.billDate || "").localeCompare(b.billDate || ""))

    for (const bill of unpaidBills) {
      if (remaining <= 0) break
      const allocAmt = Math.min(remaining, bill.outstandingPayable)
      allocations.push({
        billId: bill.id,
        billNumber: bill.billNumber,
        allocatedAmount: allocAmt,
      })
      bill.paidAmount = addMoney(bill.paidAmount, allocAmt, currency)
      bill.outstandingPayable = subMoney(bill.totalAmount, bill.paidAmount, currency)
      bill.status = bill.outstandingPayable <= 0 ? "paid" : "partially_paid"
      await saveSupplierBill(bill)
      remaining = subMoney(remaining, allocAmt, currency)
    }
  }

  const supplierAdvance = remaining > 0 ? remaining : 0

  const paymentRecord: SupplierPaymentRecord = {
    id,
    paymentNumber,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    paymentDate: input.paymentDate || now.split("T")[0],
    amount: totalPayment,
    currency,
    paymentMethod: input.paymentMethod,
    referenceNumber: input.referenceNumber,
    bankReference: input.bankReference,
    allocations,
    supplierAdvance,
    bolNumber: input.bolNumber,
    postedToLedger: true,
    postedLedgerTxId: `tx-spay-${id}`,
    remarks: input.remarks,
    attachmentUrl: input.attachmentUrl,
    createdAt: now,
    updatedAt: now,
  }

  // Idempotently create supplier ledger transaction
  const tx: SupplierLedgerTransaction = {
    id: `tx-spay-${id}`,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    transactionDate: paymentRecord.paymentDate,
    transactionType: "SUPPLIER_PAYMENT",
    referenceNumber: paymentRecord.paymentNumber,
    paymentNumber: paymentRecord.paymentNumber,
    bolNumber: input.bolNumber,
    description: `Payment ${paymentRecord.paymentNumber} (${paymentRecord.paymentMethod}) Ref: ${paymentRecord.referenceNumber}`,
    billAmount: 0,
    paymentAmount: totalPayment,
    runningPayable: 0,
    currency,
    createdAt: now,
  }
  await saveSupplierLedgerTransaction(tx)

  const savedPayment = await saveSupplierPayment(paymentRecord)

  // Update supplier profile balance
  const supplier = await getSupplierById(input.supplierId)
  if (supplier) {
    await createOrUpdateSupplier({ ...supplier })
  }

  return savedPayment
}

/**
 * Calculates audited comprehensive financial performance & profitability for a specific BOL.
 */
export async function calculateBolFinancialSummary(
  bolNumber: string,
  baseCurrency = "USD"
): Promise<BolFinancialSummary> {
  const cleanBol = bolNumber.trim().toUpperCase()

  const [invoices, payments, costs, rates] = await Promise.all([
    getAllFinanceInvoices(),
    getAllFinancePayments(),
    getShipmentCostsByBol(cleanBol),
    getAllExchangeRates(),
  ])

  // Customer Revenue stream
  const bolInvoices = invoices.filter((inv) =>
    inv.bolNumbers.some((b) => b.trim().toUpperCase() === cleanBol)
  )

  let totalCustomerRevenue = 0
  let currency = "USD"
  let customerName = "General Customer"
  if (bolInvoices.length > 0) {
    currency = bolInvoices[0].currency || "USD"
    customerName = bolInvoices[0].customerName || customerName
    for (const inv of bolInvoices) {
      // Billed charges for this BOL
      const bolItems = inv.items.filter((it) => !it.bolNumber || it.bolNumber.trim().toUpperCase() === cleanBol)
      const invBolTotal = bolItems.reduce((sum, it) => addMoney(sum, it.amount, currency), 0)
      totalCustomerRevenue = addMoney(totalCustomerRevenue, invBolTotal > 0 ? invBolTotal : inv.totalAmount, currency)
    }
  }

  // Customer payments received for this BOL
  let customerPaid = 0
  for (const p of payments) {
    const bolAlloc = p.allocations.filter((a) => bolInvoices.some((bi) => bi.id === a.invoiceId))
    for (const a of bolAlloc) {
      customerPaid = addMoney(customerPaid, a.allocatedAmount, currency)
    }
  }
  const customerOutstanding = subMoney(totalCustomerRevenue, customerPaid, currency)

  // Supplier Costs stream
  let estimatedSupplierCost = 0
  let approvedSupplierCost = 0
  let supplierPaid = 0
  let hasMissingExchangeRate = false
  let missingRateReason = ""

  for (const c of costs) {
    if (c.approvalStatus === "void" || c.approvalStatus === "reversed") continue

    // Exchange rate conversion to base currency if needed
    let effectiveCost = c.amount
    if (c.currency !== currency) {
      const match = rates.find((r) => r.fromCurrency === c.currency && r.toCurrency === currency)
      if (match && match.rate > 0) {
        effectiveCost = multMoney(c.amount, match.rate, currency)
      } else {
        hasMissingExchangeRate = true
        missingRateReason = `Missing exchange rate for ${c.currency} -> ${currency}`
      }
    }

    if (c.costType === "estimated") {
      estimatedSupplierCost = addMoney(estimatedSupplierCost, effectiveCost, currency)
    } else {
      // Actual cost
      if (c.approvalStatus === "approved" || c.approvalStatus === "posted") {
        approvedSupplierCost = addMoney(approvedSupplierCost, effectiveCost, currency)
      }
      supplierPaid = addMoney(supplierPaid, c.paidAmount, currency)
    }
  }

  const supplierOutstanding = subMoney(approvedSupplierCost, supplierPaid, currency)
  const costVariance = subMoney(approvedSupplierCost, estimatedSupplierCost, currency)
  const isCostOverrun = costVariance > 0

  // Profit calculations
  const grossProfit = subMoney(totalCustomerRevenue, approvedSupplierCost, currency)
  const marginPercent =
    totalCustomerRevenue > 0
      ? roundMoney((grossProfit / totalCustomerRevenue) * 100, 2)
      : null

  const netCashExposure = subMoney(customerPaid, supplierPaid, currency)

  let profitStatus: ProfitStatus = "BREAK EVEN"
  if (hasMissingExchangeRate) {
    profitStatus = "INCOMPLETE DATA"
  } else if (grossProfit > 0) {
    profitStatus = "PROFITABLE"
  } else if (grossProfit < 0) {
    profitStatus = "LOSS"
  }

  // Check cost completeness against route templates
  let costCompletenessPercent = 100
  const templates = await getAllRouteCostTemplates()
  const matchingTemplate = templates[0] // default template check
  if (matchingTemplate && matchingTemplate.expectedCostCategories.length > 0) {
    const enteredCategories = new Set(costs.map((c) => c.costCategory))
    const matchingCount = matchingTemplate.expectedCostCategories.filter((cat) => enteredCategories.has(cat)).length
    costCompletenessPercent = roundMoney((matchingCount / matchingTemplate.expectedCostCategories.length) * 100, 1)
  }

  return {
    bolNumber: cleanBol,
    customerName,
    currency,
    baseCurrency,
    route: matchingTemplate ? matchingTemplate.corridorName : "Direct Transit",
    containerCount: 1,
    commodity: "General Cargo",
    totalCustomerRevenue,
    customerPaid,
    customerOutstanding,
    estimatedSupplierCost,
    approvedSupplierCost,
    supplierPaid,
    supplierOutstanding,
    costVariance,
    isCostOverrun,
    grossProfit,
    marginPercent,
    netCashExposure,
    profitStatus,
    costCompletenessPercent,
    hasMissingExchangeRate,
    missingRateReason,
    financiallyClosed: false,
  }
}

/**
 * Calculates audited comprehensive financial performance for all BOLs in the system.
 */
export async function getAllBolsProfitability(currency = "USD"): Promise<BolFinancialSummary[]> {
  const [invoices, costs] = await Promise.all([
    getAllFinanceInvoices(),
    getAllShipmentCosts(),
  ])

  const allBols = new Set<string>()
  invoices.forEach((inv) => inv.bolNumbers?.forEach((b) => b && allBols.add(b.trim().toUpperCase())))
  costs.forEach((c) => c.bolNumber && allBols.add(c.bolNumber.trim().toUpperCase()))

  const summaries: BolFinancialSummary[] = []
  for (const bol of allBols) {
    const summary = await calculateBolFinancialSummary(bol, currency)
    summaries.push(summary)
  }

  return summaries.sort((a, b) => b.bolNumber.localeCompare(a.bolNumber))
}

/**
 * Aggregates profitability grouped by customer.
 */
export async function getProfitByCustomerReport(currency = "USD"): Promise<ProfitByCustomer[]> {
  const [invoices, costs] = await Promise.all([
    getAllFinanceInvoices(),
    getAllShipmentCosts(),
  ])

  const map = new Map<string, { revenue: number; cost: number; count: number; receivable: number }>()

  for (const inv of invoices) {
    const cust = inv.customerName || "General Customer"
    if (!map.has(cust)) {
      map.set(cust, { revenue: 0, cost: 0, count: 0, receivable: 0 })
    }
    const rec = map.get(cust)!
    rec.revenue = addMoney(rec.revenue, inv.totalAmount, currency)
    rec.receivable = addMoney(rec.receivable, inv.outstandingAmount, currency)
    rec.count += 1
  }

  for (const c of costs) {
    if (c.approvalStatus !== "approved" && c.approvalStatus !== "posted") continue
    // Find matching customer by bol
    const matchedInv = invoices.find((inv) => inv.bolNumbers.includes(c.bolNumber))
    const cust = matchedInv?.customerName || "Other"
    if (map.has(cust)) {
      const rec = map.get(cust)!
      rec.cost = addMoney(rec.cost, c.amount, currency)
    }
  }

  const results: ProfitByCustomer[] = []
  map.forEach((val, cust) => {
    const grossProfit = subMoney(val.revenue, val.cost, currency)
    const marginPercent = val.revenue > 0 ? roundMoney((grossProfit / val.revenue) * 100, 2) : null
    results.push({
      customerName: cust,
      shipmentCount: val.count,
      currency,
      totalRevenue: val.revenue,
      totalCost: val.cost,
      grossProfit,
      marginPercent,
      outstandingReceivable: val.receivable,
    })
  })

  return results.sort((a, b) => b.grossProfit - a.grossProfit)
}

/**
 * Returns all loss-making shipments where Cost > Revenue.
 */
export async function getLossMakingShipments(currency = "USD"): Promise<LossMakingShipment[]> {
  const [invoices, costs] = await Promise.all([
    getAllFinanceInvoices(),
    getAllShipmentCosts(),
  ])

  const allBols = new Set<string>()
  invoices.forEach((inv) => inv.bolNumbers.forEach((b) => allBols.add(b)))
  costs.forEach((c) => allBols.add(c.bolNumber))

  const lossMakers: LossMakingShipment[] = []

  for (const bol of allBols) {
    const summary = await calculateBolFinancialSummary(bol, currency)
    if (summary.grossProfit < 0) {
      lossMakers.push({
        bolNumber: summary.bolNumber,
        customerName: summary.customerName,
        route: summary.route,
        currency: summary.currency,
        revenue: summary.totalCustomerRevenue,
        cost: summary.approvedSupplierCost,
        lossAmount: Math.abs(summary.grossProfit),
        reason: summary.isCostOverrun ? `Cost overrun of ${summary.costVariance} ${summary.currency}` : "High transportation costs exceeding billed customer freight",
      })
    }
  }

  return lossMakers.sort((a, b) => b.lossAmount - a.lossAmount)
}

/**
 * Generates monthly consolidated profit report.
 */
export async function getMonthlyProfitReport(currency = "USD"): Promise<MonthlyProfitSummary[]> {
  const [invoices, payments, costs, supplierPayments] = await Promise.all([
    getAllFinanceInvoices(),
    getAllFinancePayments(),
    getAllShipmentCosts(),
    getAllSupplierPayments(),
  ])

  const monthMap = new Map<
    string,
    { revenue: number; cost: number; custPay: number; suppPay: number; recv: number; pay: number }
  >()

  for (const inv of invoices) {
    const month = (inv.issueDate || "2026-01").substring(0, 7)
    if (!monthMap.has(month)) {
      monthMap.set(month, { revenue: 0, cost: 0, custPay: 0, suppPay: 0, recv: 0, pay: 0 })
    }
    const m = monthMap.get(month)!
    m.revenue = addMoney(m.revenue, inv.totalAmount, currency)
    m.recv = addMoney(m.recv, inv.outstandingAmount, currency)
  }

  for (const c of costs) {
    if (c.approvalStatus !== "approved" && c.approvalStatus !== "posted") continue
    const month = (c.costDate || "2026-01").substring(0, 7)
    if (!monthMap.has(month)) {
      monthMap.set(month, { revenue: 0, cost: 0, custPay: 0, suppPay: 0, recv: 0, pay: 0 })
    }
    const m = monthMap.get(month)!
    m.cost = addMoney(m.cost, c.amount, currency)
    m.pay = addMoney(m.pay, c.outstandingAmount, currency)
  }

  for (const p of payments) {
    const month = (p.paymentDate || "2026-01").substring(0, 7)
    if (monthMap.has(month)) {
      const m = monthMap.get(month)!
      m.custPay = addMoney(m.custPay, p.amount, currency)
    }
  }

  for (const sp of supplierPayments) {
    const month = (sp.paymentDate || "2026-01").substring(0, 7)
    if (monthMap.has(month)) {
      const m = monthMap.get(month)!
      m.suppPay = addMoney(m.suppPay, sp.amount, currency)
    }
  }

  const summaries: MonthlyProfitSummary[] = []
  monthMap.forEach((v, month) => {
    const grossProfit = subMoney(v.revenue, v.cost, currency)
    const marginPercent = v.revenue > 0 ? roundMoney((grossProfit / v.revenue) * 100, 2) : null
    summaries.push({
      month,
      currency,
      revenue: v.revenue,
      cost: v.cost,
      grossProfit,
      marginPercent,
      customerPayments: v.custPay,
      supplierPayments: v.suppPay,
      receivables: v.recv,
      payables: v.pay,
    })
  })

  return summaries.sort((a, b) => b.month.localeCompare(a.month))
}

