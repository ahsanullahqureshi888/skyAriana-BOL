import crypto from "crypto"
import {
  getLedgerSystemDb,
  saveLedgerSystemDb,
  recalculateAccountBalances,
  syncToLegacyStorage,
  generateFingerprint,
} from "../services/ledger-db-service"
import {
  BolAccountingRecord,
  BolChargeRecord,
  PaymentAllocationRecord,
  PaymentReceiptRecord,
  AccountingStatus,
  PaymentStatus,
  PaymentTerms,
} from "../types/bol-accounting"
import {
  LedgerTransactionRecord,
  PaymentRecord,
  AuditLogRecord,
  AccountRecord,
} from "../types/ledger-system"
import { calculateFinancialTotals, roundMoney, subtractMoney } from "./money"
import { getAccountingSettings } from "../services/accounting-settings-service"
import {
  createOrUpdateInvoiceFromBol,
  generateNextInvoiceNumber,
  isInvoiceOverdue,
} from "./invoice-generator"
import { createPaymentReceipt } from "./payment-receipt-service"
import { getInvoice, saveInvoice } from "../services/invoice-storage-service"
import { assertAccountingPeriodOpen } from "./period-closing/period-service"

export async function getBolAccounting(bolId: string): Promise<{
  accounting: BolAccountingRecord | null
  charges: BolChargeRecord[]
  allocations: PaymentAllocationRecord[]
  payments: PaymentRecord[]
  receipts: PaymentReceiptRecord[]
  invoice: any | null
}> {
  const db = await getLedgerSystemDb()

  const accounting = (db.bol_accounting || []).find((b) => b.bol_id === bolId) || null
  const charges = (db.bol_charges || []).filter((c) => c.bol_id === bolId)
  const allocations = (db.payment_allocations || []).filter((a) => a.bol_id === bolId)
  const allocationPaymentIds = new Set(allocations.map((a) => a.payment_id))
  const payments = db.payments.filter(
    (p) => allocationPaymentIds.has(p.id) || p.bol_reference === accounting?.bol_number
  )
  const receipts = (db.payment_receipts || []).filter(
    (r) => r.applied_bol === accounting?.bol_number || allocationPaymentIds.has(r.payment_id)
  )

  let invoice = null
  if (accounting?.invoice_id || accounting?.invoice_number) {
    invoice = await getInvoice(accounting.invoice_id || accounting.invoice_number || "")
  }

  return { accounting, charges, allocations, payments, receipts, invoice }
}

export async function saveBolAccounting(params: {
  bolId: string
  bolNumber: string
  billToPartyType: any
  billToCompanyName: string
  accountId: string
  currency: string
  paymentTerms: PaymentTerms
  creditDays?: number
  billingContact?: string
  billingNotes?: string
  charges: Omit<BolChargeRecord, "id" | "bol_id" | "created_at" | "updated_at">[]
  user?: string
  metadata?: {
    shipper?: string
    consignee?: string
    origin?: string
    destination?: string
    containerNo?: string
    truckNo?: string
    vesselVoyage?: string
  }
}): Promise<{ accounting: BolAccountingRecord; charges: BolChargeRecord[] }> {
  const {
    bolId,
    bolNumber,
    billToPartyType,
    billToCompanyName,
    accountId,
    currency,
    paymentTerms,
    creditDays = 30,
    billingContact = "",
    billingNotes = "",
    charges: rawCharges,
    user = "System",
    metadata,
  } = params

  const db = await getLedgerSystemDb()
  if (!db.bol_accounting) db.bol_accounting = []
  if (!db.bol_charges) db.bol_charges = []

  const now = new Date().toISOString()
  const totals = calculateFinancialTotals(rawCharges)

  // Find or create accounting record
  let record = db.bol_accounting.find((b) => b.bol_id === bolId)

  const isExisting = Boolean(record)
  const currentStatus: AccountingStatus = record ? record.accounting_status : "DRAFT"
  const currentPaid = record ? record.amount_paid : 0
  const outstanding = Math.max(0, subtractMoney(totals.grandTotal, currentPaid))

  let paymentStatus: PaymentStatus = "UNPAID"
  if (currentPaid > 0 && outstanding > 0) paymentStatus = "PARTIAL"
  else if (currentPaid > 0 && outstanding === 0) paymentStatus = "PAID"
  else if (currentPaid > totals.grandTotal) paymentStatus = "CREDIT"

  const updatedRecord: BolAccountingRecord = {
    id: record ? record.id : `BOL-ACC-${crypto.randomBytes(6).toString("hex")}`,
    bol_id: bolId,
    bol_number: bolNumber,
    bill_to_party_type: billToPartyType,
    bill_to_company_name: billToCompanyName,
    account_id: accountId,
    invoice_id: record?.invoice_id || null,
    invoice_number: record?.invoice_number || null,
    currency: currency || "USD",
    payment_terms: paymentTerms || "30 Days",
    credit_days: creditDays,
    billing_contact: billingContact,
    billing_notes: billingNotes,
    subtotal: totals.subtotal,
    discount: totals.totalDiscount,
    tax: totals.totalTax,
    total_charges: totals.grandTotal,
    amount_paid: currentPaid,
    outstanding_balance: outstanding,
    accounting_status: currentStatus,
    payment_status: paymentStatus,
    posted_at: record?.posted_at || null,
    posted_by: record?.posted_by || null,
    source_mode: "LIVE",
    created_at: record?.created_at || now,
    updated_at: now,
  }

  // Replace charges for this BOL
  db.bol_charges = db.bol_charges.filter((c) => c.bol_id !== bolId)

  const newChargeRecords: BolChargeRecord[] = rawCharges.map((c, idx) => ({
    id: `CHG-${bolId}-${idx + 1}-${crypto.randomBytes(3).toString("hex")}`,
    bol_id: bolId,
    invoice_id: updatedRecord.invoice_id,
    charge_type: c.charge_type,
    description: c.description || "",
    quantity: Number(c.quantity) || 1,
    rate: Number(c.rate) || 0,
    amount: roundMoney((Number(c.quantity) || 1) * (Number(c.rate) || 0)),
    currency: c.currency || currency || "USD",
    tax: Number(c.tax) || 0,
    discount: Number(c.discount) || 0,
    container_id: c.container_id || null,
    shipment_leg_id: c.shipment_leg_id || null,
    truck_id: c.truck_id || null,
    remarks: c.remarks || null,
    cost_carrier: c.cost_carrier || null,
    cost_amount: c.cost_amount ?? null,
    gross_margin: c.cost_amount != null ? roundMoney(((Number(c.quantity) || 1) * (Number(c.rate) || 0)) - Number(c.cost_amount)) : null,
    status: currentStatus === "POSTED" ? "posted" : "draft",
    ledger_transaction_id: null,
    created_at: now,
    updated_at: now,
  }))

  db.bol_charges.push(...newChargeRecords)

  // Check accounting settings for auto-creating invoice
  const settings = await getAccountingSettings()
  if (settings.autoCreateInvoice && rawCharges.length > 0) {
    try {
      const inv = await createOrUpdateInvoiceFromBol({
        bolId,
        bolNumber,
        accountId,
        accountName: billToCompanyName,
        existingInvoiceId: updatedRecord.invoice_id,
        charges: newChargeRecords,
        currency,
        paymentTerms,
        creditDays,
        shipper: metadata?.shipper,
        consignee: metadata?.consignee,
        origin: metadata?.origin,
        destination: metadata?.destination,
        containerNo: metadata?.containerNo,
        truckNo: metadata?.truckNo,
        vesselVoyage: metadata?.vesselVoyage,
      })

      updatedRecord.invoice_id = inv.id
      updatedRecord.invoice_number = inv.invoice_number

      // Update charges with invoice_id
      for (const chg of newChargeRecords) {
        chg.invoice_id = inv.id
      }
    } catch (invErr) {
      console.error("[saveBolAccounting] auto-create invoice error:", invErr)
    }
  }

  if (isExisting) {
    const idx = db.bol_accounting.findIndex((b) => b.bol_id === bolId)
    db.bol_accounting[idx] = updatedRecord
  } else {
    db.bol_accounting.push(updatedRecord)
  }

  await saveLedgerSystemDb(db)
  return { accounting: updatedRecord, charges: newChargeRecords }
}

export async function postBolToLedger(
  bolId: string,
  user = "Administrator"
): Promise<{
  success: boolean
  code?: string
  message: string
  transaction?: LedgerTransactionRecord
  accounting?: BolAccountingRecord
}> {
  const db = await getLedgerSystemDb()
  const accounting = (db.bol_accounting || []).find((b) => b.bol_id === bolId)

  if (!accounting) {
    return { success: false, code: "NOT_FOUND", message: "BOL accounting record not found." }
  }

  // Idempotency check: verify if already posted
  if (accounting.accounting_status === "POSTED") {
    const existingTx = db.ledger_transactions.find(
      (t) =>
        !t.is_deleted &&
        t.account_id === accounting.account_id &&
        (t.bol_id === bolId || (t.bol_number && t.bol_number === accounting.bol_number)) &&
        t.source_file === "BOL_SYSTEM"
    )
    return {
      success: false,
      code: "ALREADY_POSTED",
      message: "THIS BOL HAS ALREADY BEEN POSTED TO LEDGER.",
      transaction: existingTx,
      accounting,
    }
  }

  const account = db.accounts.find((a) => a.id === accounting.account_id)
  if (!account) {
    return { success: false, code: "ACCOUNT_NOT_FOUND", message: "Target account was not found in ledger database." }
  }

  const charges = (db.bol_charges || []).filter((c) => c.bol_id === bolId)
  if (charges.length === 0) {
    return { success: false, code: "NO_CHARGES", message: "Cannot post BOL with zero charges." }
  }

  const totals = calculateFinancialTotals(charges)
  if (totals.grandTotal <= 0) {
    return { success: false, code: "ZERO_TOTAL", message: "Total charges must be greater than zero to post to ledger." }
  }

  // 1. Ensure Invoice is created and issued
  let invoiceId = accounting.invoice_id
  let invoiceNumber = accounting.invoice_number

  if (!invoiceId) {
    const inv = await createOrUpdateInvoiceFromBol({
      bolId,
      bolNumber: accounting.bol_number,
      accountId: account.id,
      accountName: account.account_name,
      charges,
      currency: accounting.currency,
      paymentTerms: accounting.payment_terms,
      creditDays: accounting.credit_days,
    })
    invoiceId = inv.id
    invoiceNumber = inv.invoice_number
  } else {
    // Mark existing invoice as Issued
    const inv = await getInvoice(invoiceId)
    if (inv) {
      inv.payment_status = "Unpaid"
      await saveInvoice(inv)
    }
  }

  const now = new Date().toISOString()
  const txDate = now.split("T")[0]

  await assertAccountingPeriodOpen(txDate, {
    actor: user,
    entityType: "bol_posting",
    entityId: bolId,
  })

  const txId = `TX-BOL-${bolId}-${Date.now()}`

  const chargeLinesDesc = charges
    .map((c) => `${c.charge_type}: ${c.amount} ${c.currency}`)
    .join("; ")

  const fp = generateFingerprint({
    account_name: account.account_name,
    source_sheet: "BOL_SYSTEM",
    date: txDate,
    debit: totals.grandTotal,
    credit: 0,
    reference: accounting.bol_number,
    invoice: invoiceNumber || "",
    bol: accounting.bol_number,
  })

  // 2. Create Debit Ledger Transaction
  const debitTx: LedgerTransactionRecord = {
    id: txId,
    account_id: account.id,
    transaction_date: txDate,
    transaction_type: "invoice",
    description: `Freight & Service Charges — BOL ${accounting.bol_number}`,
    reference_number: accounting.bol_number,
    invoice_number: invoiceNumber || "",
    bol_number: accounting.bol_number,
    bol_id: bolId,
    invoice_id: invoiceId || undefined,
    debit: totals.grandTotal,
    credit: 0,
    running_balance: 0, // Recalculated below
    currency: accounting.currency,
    remarks: `Posted charges: ${chargeLinesDesc}`,
    source_file: "BOL_SYSTEM",
    source_sheet: "ACTIVE_BOLS",
    fingerprint: fp,
    created_at: now,
    updated_at: now,
  }

  db.ledger_transactions.push(debitTx)

  // 3. Recalculate account running balances
  const { updatedAccount, updatedTransactions } = recalculateAccountBalances(account, db.ledger_transactions)
  const accIndex = db.accounts.findIndex((a) => a.id === account.id)
  db.accounts[accIndex] = updatedAccount

  // Update in transactions array
  const postedTx = updatedTransactions.find((t) => t.id === txId) || debitTx

  // 4. Update BOL Accounting Status
  accounting.accounting_status = "POSTED"
  accounting.posted_at = now
  accounting.posted_by = user
  accounting.invoice_id = invoiceId
  accounting.invoice_number = invoiceNumber
  accounting.total_charges = totals.grandTotal
  accounting.subtotal = totals.subtotal
  accounting.discount = totals.totalDiscount
  accounting.tax = totals.totalTax
  accounting.outstanding_balance = Math.max(0, subtractMoney(totals.grandTotal, accounting.amount_paid))
  accounting.updated_at = now

  // Update charge records
  for (const c of charges) {
    c.status = "posted"
    c.ledger_transaction_id = txId
    c.invoice_id = invoiceId
    c.updated_at = now
  }

  // 5. Create Audit Log
  const auditLog: AuditLogRecord = {
    id: `AUDIT-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    entity_type: "bol_accounting",
    entity_id: bolId,
    account_id: account.id,
    action: "post",
    user,
    timestamp: now,
    reason: `Posted ${totals.grandTotal} ${accounting.currency} debit to ${account.account_name} for BOL ${accounting.bol_number}`,
  }
  db.audit_logs.push(auditLog)

  await saveLedgerSystemDb(db)
  await syncToLegacyStorage(db)

  return {
    success: true,
    message: `Successfully posted ${totals.grandTotal} ${accounting.currency} to ${account.account_name}.`,
    transaction: postedTx,
    accounting,
  }
}

export async function createBolAdjustment(params: {
  bolId: string
  newTotal: number
  reason: string
  user?: string
}): Promise<{ success: boolean; message: string; transaction?: LedgerTransactionRecord }> {
  const { bolId, newTotal, reason, user = "Administrator" } = params
  const db = await getLedgerSystemDb()

  const accounting = (db.bol_accounting || []).find((b) => b.bol_id === bolId)
  if (!accounting || accounting.accounting_status !== "POSTED") {
    return { success: false, message: "Only posted BOLs can have accounting adjustments created." }
  }

  const account = db.accounts.find((a) => a.id === accounting.account_id)
  if (!account) return { success: false, message: "Account not found." }

  const diff = subtractMoney(newTotal, accounting.total_charges)
  if (diff === 0) {
    return { success: false, message: "New total is identical to current total; no adjustment needed." }
  }

  const now = new Date().toISOString()
  const txDate = now.split("T")[0]

  await assertAccountingPeriodOpen(txDate, {
    actor: user,
    entityType: "bol_adjustment",
    entityId: bolId,
  })

  const isIncrease = diff > 0
  const absDiff = Math.abs(diff)

  const adjTx: LedgerTransactionRecord = {
    id: `TX-ADJ-${bolId}-${Date.now()}`,
    account_id: account.id,
    transaction_date: txDate,
    transaction_type: isIncrease ? "adjustment" : "adjustment",
    description: isIncrease
      ? `Adjustment — Freight Charge Increase — BOL ${accounting.bol_number}`
      : `Adjustment — Freight Charge Reduction — BOL ${accounting.bol_number}`,
    reference_number: accounting.bol_number,
    invoice_number: accounting.invoice_number || "",
    bol_number: accounting.bol_number,
    bol_id: bolId,
    invoice_id: accounting.invoice_id || undefined,
    is_adjustment: true,
    debit: isIncrease ? absDiff : 0,
    credit: isIncrease ? 0 : absDiff,
    running_balance: 0,
    currency: accounting.currency,
    remarks: `Reason: ${reason || "Charge adjustment after posting"}`,
    source_file: "BOL_SYSTEM",
    source_sheet: "ACTIVE_BOLS",
    created_at: now,
    updated_at: now,
  }

  db.ledger_transactions.push(adjTx)

  accounting.total_charges = newTotal
  accounting.outstanding_balance = Math.max(0, subtractMoney(newTotal, accounting.amount_paid))
  accounting.updated_at = now

  const { updatedAccount, updatedTransactions } = recalculateAccountBalances(account, db.ledger_transactions)
  const accIndex = db.accounts.findIndex((a) => a.id === account.id)
  db.accounts[accIndex] = updatedAccount

  const createdTx = updatedTransactions.find((t) => t.id === adjTx.id) || adjTx

  db.audit_logs.push({
    id: `AUDIT-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    entity_type: "bol_accounting",
    entity_id: bolId,
    account_id: account.id,
    action: "adjust",
    user,
    timestamp: now,
    reason: `Adjustment of ${diff} ${accounting.currency} created for BOL ${accounting.bol_number}: ${reason}`,
  })

  await saveLedgerSystemDb(db)
  await syncToLegacyStorage(db)

  return {
    success: true,
    message: `Created adjustment of ${absDiff} ${accounting.currency} (${isIncrease ? "Debit" : "Credit"}).`,
    transaction: createdTx,
  }
}

export async function voidBolPosting(
  bolId: string,
  reason: string,
  user = "Administrator"
): Promise<{ success: boolean; message: string; reversalTransaction?: LedgerTransactionRecord }> {
  const db = await getLedgerSystemDb()
  const accounting = (db.bol_accounting || []).find((b) => b.bol_id === bolId)

  if (!accounting || accounting.accounting_status !== "POSTED") {
    return { success: false, message: "Only posted BOLs can be voided or reversed." }
  }

  const account = db.accounts.find((a) => a.id === accounting.account_id)
  if (!account) return { success: false, message: "Account not found." }

  // Find original debit transaction
  const origTx = db.ledger_transactions.find(
    (t) => !t.is_deleted && t.bol_id === bolId && t.debit > 0 && t.source_file === "BOL_SYSTEM"
  )

  const reversalAmount = origTx ? origTx.debit : accounting.total_charges
  const now = new Date().toISOString()
  const txDate = now.split("T")[0]

  await assertAccountingPeriodOpen(txDate, {
    actor: user,
    entityType: "bol_void",
    entityId: bolId,
  })

  // Create balancing credit reversal transaction
  const reversalTx: LedgerTransactionRecord = {
    id: `TX-REV-${bolId}-${Date.now()}`,
    account_id: account.id,
    transaction_date: txDate,
    transaction_type: "credit_note",
    description: `Reversal — BOL ${accounting.bol_number}`,
    reference_number: accounting.bol_number,
    invoice_number: accounting.invoice_number || "",
    bol_number: accounting.bol_number,
    bol_id: bolId,
    invoice_id: accounting.invoice_id || undefined,
    reversal_of_transaction_id: origTx?.id,
    debit: 0,
    credit: reversalAmount,
    running_balance: 0,
    currency: accounting.currency,
    remarks: `Void / Reversal: ${reason || "Posting cancelled"}`,
    source_file: "BOL_SYSTEM",
    source_sheet: "ACTIVE_BOLS",
    created_at: now,
    updated_at: now,
  }

  db.ledger_transactions.push(reversalTx)

  accounting.accounting_status = "VOID"
  accounting.payment_status = "VOID"
  accounting.updated_at = now

  if (accounting.invoice_id) {
    const inv = await getInvoice(accounting.invoice_id)
    if (inv) {
      inv.payment_status = "Cancelled"
      await saveInvoice(inv)
    }
  }

  const { updatedAccount, updatedTransactions } = recalculateAccountBalances(account, db.ledger_transactions)
  const accIndex = db.accounts.findIndex((a) => a.id === account.id)
  db.accounts[accIndex] = updatedAccount

  const createdRevTx = updatedTransactions.find((t) => t.id === reversalTx.id) || reversalTx

  db.audit_logs.push({
    id: `AUDIT-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    entity_type: "bol_accounting",
    entity_id: bolId,
    account_id: account.id,
    action: "void",
    user,
    timestamp: now,
    reason: `Reversed posting for BOL ${accounting.bol_number}: ${reason}`,
  })

  await saveLedgerSystemDb(db)
  await syncToLegacyStorage(db)

  return {
    success: true,
    message: `Posting for BOL ${accounting.bol_number} successfully reversed with balancing credit of ${reversalAmount} ${accounting.currency}.`,
    reversalTransaction: createdRevTx,
  }
}

export async function recordBolPayment(params: {
  bolId: string
  amount: number
  date: string
  currency: string
  paymentMethod: string
  reference?: string
  bankReference?: string
  notes?: string
  user?: string
}): Promise<{
  success: boolean
  message: string
  payment: PaymentRecord
  creditTransaction: LedgerTransactionRecord
  receipt: PaymentReceiptRecord
  unallocatedCredit: number
}> {
  const {
    bolId,
    amount,
    date,
    currency,
    paymentMethod,
    reference = "",
    bankReference = "",
    notes = "",
    user = "Administrator",
  } = params

  if (amount <= 0) {
    throw new Error("Payment amount must be greater than zero.")
  }

  const db = await getLedgerSystemDb()
  const accounting = (db.bol_accounting || []).find((b) => b.bol_id === bolId)
  if (!accounting) {
    throw new Error("BOL accounting record not found.")
  }

  const account = db.accounts.find((a) => a.id === accounting.account_id)
  if (!account) {
    throw new Error("Linked ledger account not found.")
  }

  // Multi-currency check: payment currency must match account/invoice currency
  if (currency && accounting.currency && currency.toUpperCase() !== accounting.currency.toUpperCase()) {
    throw new Error(
      `Currency mismatch: Invoice is in ${accounting.currency}, but payment is in ${currency}. Multi-currency payments require explicit conversion.`
    )
  }

  const now = new Date().toISOString()
  const payDate = date || now.split("T")[0]

  await assertAccountingPeriodOpen(payDate, {
    actor: user,
    entityType: "bol_payment",
    entityId: bolId,
  })

  const payId = `PAY-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`

  // 1. Create Payment Record
  const payment: PaymentRecord = {
    id: payId,
    account_id: account.id,
    payment_date: payDate,
    amount,
    currency: accounting.currency,
    payment_method: paymentMethod as any,
    reference,
    bank_reference: bankReference,
    bol_reference: accounting.bol_number,
    invoice_reference: accounting.invoice_number || "",
    notes,
    created_by: user,
    created_at: now,
  }
  db.payments.push(payment)

  // 2. Create Credit Ledger Transaction
  const creditTx: LedgerTransactionRecord = {
    id: `TX-PAY-${payId}`,
    account_id: account.id,
    transaction_date: payDate,
    transaction_type: "payment",
    description: `Payment Received — INV-${accounting.invoice_number || accounting.bol_number}`,
    reference_number: reference || bankReference || accounting.bol_number,
    invoice_number: accounting.invoice_number || "",
    bol_number: accounting.bol_number,
    bol_id: bolId,
    debit: 0,
    credit: amount,
    running_balance: 0,
    currency: accounting.currency,
    remarks: notes || `Payment received via ${paymentMethod}`,
    source_file: "BOL_SYSTEM",
    source_sheet: "ACTIVE_BOLS",
    created_at: now,
    updated_at: now,
  }
  db.ledger_transactions.push(creditTx)

  // 3. Allocate Payment to Invoice / Overpayment handling
  const currentOutstanding = accounting.outstanding_balance
  const allocatedToInvoice = Math.min(amount, currentOutstanding)
  const unallocatedCredit = Math.max(0, subtractMoney(amount, allocatedToInvoice))

  if (!db.payment_allocations) db.payment_allocations = []
  const allocation: PaymentAllocationRecord = {
    id: `ALLOC-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    payment_id: payId,
    invoice_id: accounting.invoice_id || accounting.bol_id,
    bol_id: bolId,
    allocated_amount: allocatedToInvoice,
    currency: accounting.currency,
    created_at: now,
  }
  db.payment_allocations.push(allocation)

  // 4. Update BOL Accounting Status
  accounting.amount_paid = roundMoney(accounting.amount_paid + allocatedToInvoice)
  accounting.outstanding_balance = Math.max(0, subtractMoney(accounting.total_charges, accounting.amount_paid))

  if (accounting.outstanding_balance === 0) {
    accounting.payment_status = "PAID"
    if (accounting.accounting_status === "POSTED") accounting.accounting_status = "PAID"
  } else {
    accounting.payment_status = "PARTIAL"
    if (accounting.accounting_status === "POSTED") accounting.accounting_status = "PARTIALLY_PAID"
  }
  accounting.updated_at = now

  // 5. Update Invoice if present
  if (accounting.invoice_id) {
    const inv = await getInvoice(accounting.invoice_id)
    if (inv) {
      if (accounting.outstanding_balance === 0) {
        inv.payment_status = "Paid"
      } else {
        inv.payment_status = "Partially Paid"
      }
      await saveInvoice(inv)
    }
  }

  // 6. Recalculate account balances chronologically
  const { updatedAccount, updatedTransactions } = recalculateAccountBalances(account, db.ledger_transactions)
  const accIndex = db.accounts.findIndex((a) => a.id === account.id)
  db.accounts[accIndex] = updatedAccount

  const finalCreditTx = updatedTransactions.find((t) => t.id === creditTx.id) || creditTx

  // 7. Generate Payment Receipt
  const receipt = await createPaymentReceipt({
    paymentId: payId,
    date: payDate,
    receivedFrom: accounting.bill_to_company_name,
    accountId: account.id,
    accountName: account.account_name,
    amount,
    currency: accounting.currency,
    paymentMethod,
    reference,
    appliedInvoice: accounting.invoice_number,
    appliedBol: accounting.bol_number,
    remainingBalance: accounting.outstanding_balance,
    unallocatedCredit,
    receivedBy: user,
    notes,
  })

  // 8. Audit Log
  db.audit_logs.push({
    id: `AUDIT-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    entity_type: "payment",
    entity_id: payId,
    account_id: account.id,
    action: "create",
    user,
    timestamp: now,
    reason: `Recorded payment of ${amount} ${accounting.currency} for BOL ${accounting.bol_number} (Allocated: ${allocatedToInvoice}, Unallocated credit: ${unallocatedCredit})`,
  })

  await saveLedgerSystemDb(db)
  await syncToLegacyStorage(db)

  return {
    success: true,
    message: `Payment of ${amount} ${accounting.currency} successfully recorded.`,
    payment,
    creditTransaction: finalCreditTx,
    receipt,
    unallocatedCredit,
  }
}
