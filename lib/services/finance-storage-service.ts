import crypto from "crypto"
import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, mutateJsonFile, writeJsonFile } from "./blob-db"
import type {
  FinanceInvoiceRecord,
  FinancePaymentRecord,
  FinanceReceiptRecord,
  FinanceDebitNote,
  FinanceCreditNote,
  ShipmentFinanceRecord,
  FinanceExpenseRecord,
  DatedExchangeRate,
  SupplierProfile,
  ShipmentCostRecord,
  SupplierBillRecord,
  SupplierPaymentRecord,
  SupplierLedgerTransaction,
  RouteCostTemplate,
} from "@/lib/types/finance"

const INVOICES_FILE = getDataPath(".local-finance-invoices.json")
const PAYMENTS_FILE = getDataPath(".local-finance-payments.json")
const RECEIPTS_FILE = getDataPath(".local-finance-receipts.json")
const DEBIT_NOTES_FILE = getDataPath(".local-finance-debit-notes.json")
const CREDIT_NOTES_FILE = getDataPath(".local-finance-credit-notes.json")
const SHIPMENT_FINANCE_FILE = getDataPath(".local-finance-shipments.json")
const EXPENSES_FILE = getDataPath(".local-finance-expenses.json")
const RATES_FILE = getDataPath(".local-finance-rates.json")
const COUNTERS_FILE = getDataPath(".local-finance-counters.json")
const SUPPLIERS_FILE = getDataPath(".local-suppliers.json")
const COSTS_FILE = getDataPath(".local-shipment-costs.json")
const SUPPLIER_BILLS_FILE = getDataPath(".local-supplier-bills.json")
const SUPPLIER_PAYMENTS_FILE = getDataPath(".local-supplier-payments.json")
const SUPPLIER_LEDGERS_FILE = getDataPath(".local-supplier-ledgers.json")
const ROUTE_TEMPLATES_FILE = getDataPath(".local-route-cost-templates.json")

interface SequenceCounters {
  invoice: number
  payment: number
  receipt: number
  debitNote: number
  creditNote: number
  supplier: number
  cost: number
  supplierBill: number
  supplierPayment: number
}

const DEFAULT_COUNTERS: SequenceCounters = {
  invoice: 1,
  payment: 1,
  receipt: 1,
  debitNote: 1,
  creditNote: 1,
  supplier: 1,
  cost: 1,
  supplierBill: 1,
  supplierPayment: 1,
}

export async function getNextSequenceNumber(type: keyof SequenceCounters, prefix: string): Promise<string> {
  const currentYear = new Date().getFullYear()
  let nextVal = 1

  await mutateJsonFile<SequenceCounters>(COUNTERS_FILE, DEFAULT_COUNTERS, (current) => {
    const existing = current && typeof current === "object" ? current : DEFAULT_COUNTERS
    nextVal = Number.isSafeInteger(existing[type]) && existing[type] > 0 ? existing[type] : 1
    return {
      ...existing,
      [type]: nextVal + 1,
    }
  })

  return `${prefix}-${currentYear}-${String(nextVal).padStart(4, "0")}`
}

export async function nextInvoiceNumber(): Promise<string> {
  return getNextSequenceNumber("invoice", "SA-INV")
}

export async function nextPaymentNumber(): Promise<string> {
  return getNextSequenceNumber("payment", "SA-PAY")
}

export async function nextReceiptNumber(): Promise<string> {
  return getNextSequenceNumber("receipt", "SA-RCP")
}

export async function nextDebitNoteNumber(): Promise<string> {
  return getNextSequenceNumber("debitNote", "SA-DN")
}

export async function nextCreditNoteNumber(): Promise<string> {
  return getNextSequenceNumber("creditNote", "SA-CN")
}

export async function nextSupplierNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()
  let nextVal = 1
  await mutateJsonFile<SequenceCounters>(COUNTERS_FILE, DEFAULT_COUNTERS, (current) => {
    const existing = current && typeof current === "object" ? current : DEFAULT_COUNTERS
    nextVal = Number.isSafeInteger(existing.supplier) && existing.supplier > 0 ? existing.supplier : 1
    return { ...existing, supplier: nextVal + 1 }
  })
  return `SA-SUP-${String(nextVal).padStart(4, "0")}`
}

export async function nextCostNumber(): Promise<string> {
  return getNextSequenceNumber("cost", "SA-COST")
}

export async function nextSupplierBillNumber(): Promise<string> {
  return getNextSequenceNumber("supplierBill", "SA-SBILL")
}

export async function nextSupplierPaymentNumber(): Promise<string> {
  return getNextSequenceNumber("supplierPayment", "SA-SPAY")
}

// --- Invoices ---

export async function getAllFinanceInvoices(): Promise<FinanceInvoiceRecord[]> {
  const invoices = await readJsonFile<FinanceInvoiceRecord[]>(INVOICES_FILE, [])
  if (!Array.isArray(invoices)) return []
  return invoices.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
}

export async function getFinanceInvoiceById(id: string): Promise<FinanceInvoiceRecord | null> {
  const all = await getAllFinanceInvoices()
  return all.find((i) => i.id === id || i.invoiceNumber === id) || null
}

export async function saveFinanceInvoice(invoice: FinanceInvoiceRecord): Promise<FinanceInvoiceRecord> {
  await mutateJsonFile<FinanceInvoiceRecord[]>(INVOICES_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    const idx = existing.findIndex((i) => i.id === invoice.id || i.invoiceNumber === invoice.invoiceNumber)
    if (idx >= 0) {
      existing[idx] = { ...invoice, updatedAt: new Date().toISOString() }
      return existing
    }
    return [invoice, ...existing]
  })
  return invoice
}

// --- Payments ---

export async function getAllFinancePayments(): Promise<FinancePaymentRecord[]> {
  const payments = await readJsonFile<FinancePaymentRecord[]>(PAYMENTS_FILE, [])
  if (!Array.isArray(payments)) return []
  return payments.sort((a, b) => (b.paymentDate || "").localeCompare(a.paymentDate || ""))
}

export async function saveFinancePayment(payment: FinancePaymentRecord): Promise<FinancePaymentRecord> {
  await mutateJsonFile<FinancePaymentRecord[]>(PAYMENTS_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    const idx = existing.findIndex((p) => p.id === payment.id || p.paymentNumber === payment.paymentNumber)
    if (idx >= 0) {
      existing[idx] = { ...payment, updatedAt: new Date().toISOString() }
      return existing
    }
    return [payment, ...existing]
  })
  return payment
}

// --- Receipts ---

export async function getAllFinanceReceipts(): Promise<FinanceReceiptRecord[]> {
  const receipts = await readJsonFile<FinanceReceiptRecord[]>(RECEIPTS_FILE, [])
  if (!Array.isArray(receipts)) return []
  return receipts.sort((a, b) => (b.receiptDate || "").localeCompare(a.receiptDate || ""))
}

export async function getFinanceReceiptById(id: string): Promise<FinanceReceiptRecord | null> {
  const all = await getAllFinanceReceipts()
  return all.find((r) => r.id === id || r.receiptNumber === id) || null
}

export async function saveFinanceReceipt(receipt: FinanceReceiptRecord): Promise<FinanceReceiptRecord> {
  await mutateJsonFile<FinanceReceiptRecord[]>(RECEIPTS_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    const idx = existing.findIndex((r) => r.id === receipt.id || r.receiptNumber === receipt.receiptNumber)
    if (idx >= 0) {
      existing[idx] = receipt
      return existing
    }
    return [receipt, ...existing]
  })
  return receipt
}

// --- Debit Notes ---

export async function getAllDebitNotes(): Promise<FinanceDebitNote[]> {
  const notes = await readJsonFile<FinanceDebitNote[]>(DEBIT_NOTES_FILE, [])
  if (!Array.isArray(notes)) return []
  return notes.sort((a, b) => (b.date || "").localeCompare(a.date || ""))
}

export async function saveDebitNote(note: FinanceDebitNote): Promise<FinanceDebitNote> {
  await mutateJsonFile<FinanceDebitNote[]>(DEBIT_NOTES_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    const idx = existing.findIndex((n) => n.id === note.id || n.noteNumber === note.noteNumber)
    if (idx >= 0) {
      existing[idx] = { ...note, updatedAt: new Date().toISOString() }
      return existing
    }
    return [note, ...existing]
  })
  return note
}

// --- Credit Notes ---

export async function getAllCreditNotes(): Promise<FinanceCreditNote[]> {
  const notes = await readJsonFile<FinanceCreditNote[]>(CREDIT_NOTES_FILE, [])
  if (!Array.isArray(notes)) return []
  return notes.sort((a, b) => (b.date || "").localeCompare(a.date || ""))
}

export async function saveCreditNote(note: FinanceCreditNote): Promise<FinanceCreditNote> {
  await mutateJsonFile<FinanceCreditNote[]>(CREDIT_NOTES_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    const idx = existing.findIndex((n) => n.id === note.id || n.noteNumber === note.noteNumber)
    if (idx >= 0) {
      existing[idx] = { ...note, updatedAt: new Date().toISOString() }
      return existing
    }
    return [note, ...existing]
  })
  return note
}

// --- Shipment Finance ---

export async function getAllShipmentFinanceRecords(): Promise<ShipmentFinanceRecord[]> {
  const list = await readJsonFile<ShipmentFinanceRecord[]>(SHIPMENT_FINANCE_FILE, [])
  if (!Array.isArray(list)) return []
  return list
}

export async function getShipmentFinanceByBol(bolOrShipmentId: string): Promise<ShipmentFinanceRecord | null> {
  const all = await getAllShipmentFinanceRecords()
  const clean = bolOrShipmentId.trim().toLowerCase()
  return all.find((s) => s.bolNumber.toLowerCase() === clean || s.shipmentId.toLowerCase() === clean) || null
}

export async function saveShipmentFinanceRecord(record: ShipmentFinanceRecord): Promise<ShipmentFinanceRecord> {
  await mutateJsonFile<ShipmentFinanceRecord[]>(SHIPMENT_FINANCE_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    const idx = existing.findIndex((s) => s.bolNumber === record.bolNumber || s.shipmentId === record.shipmentId)
    if (idx >= 0) {
      existing[idx] = { ...record, updatedAt: new Date().toISOString() }
      return existing
    }
    return [record, ...existing]
  })
  return record
}

// --- Expenses ---

export async function getAllFinanceExpenses(): Promise<FinanceExpenseRecord[]> {
  const expenses = await readJsonFile<FinanceExpenseRecord[]>(EXPENSES_FILE, [])
  if (!Array.isArray(expenses)) return []
  return expenses.sort((a, b) => (b.date || "").localeCompare(a.date || ""))
}

export async function saveFinanceExpense(expense: FinanceExpenseRecord): Promise<FinanceExpenseRecord> {
  await mutateJsonFile<FinanceExpenseRecord[]>(EXPENSES_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    const idx = existing.findIndex((e) => e.id === expense.id)
    if (idx >= 0) {
      existing[idx] = expense
      return existing
    }
    return [expense, ...existing]
  })
  return expense
}

// --- Dated Exchange Rates ---

export async function getAllExchangeRates(): Promise<DatedExchangeRate[]> {
  const rates = await readJsonFile<DatedExchangeRate[]>(RATES_FILE, [
    { id: "rate-usd-aed", effectiveDate: "2026-01-01", fromCurrency: "USD", toCurrency: "AED", rate: 3.6725, createdAt: new Date().toISOString() },
    { id: "rate-usd-afn", effectiveDate: "2026-01-01", fromCurrency: "USD", toCurrency: "AFN", rate: 66.5, createdAt: new Date().toISOString() },
    { id: "rate-usd-eur", effectiveDate: "2026-01-01", fromCurrency: "USD", toCurrency: "EUR", rate: 0.92, createdAt: new Date().toISOString() },
    { id: "rate-usd-inr", effectiveDate: "2026-01-01", fromCurrency: "USD", toCurrency: "INR", rate: 83.5, createdAt: new Date().toISOString() },
    { id: "rate-usd-try", effectiveDate: "2026-01-01", fromCurrency: "USD", toCurrency: "TRY", rate: 34.2, createdAt: new Date().toISOString() },
  ])
  return rates.sort((a, b) => (b.effectiveDate || "").localeCompare(a.effectiveDate || ""))
}

export async function saveExchangeRate(rate: DatedExchangeRate): Promise<DatedExchangeRate> {
  await mutateJsonFile<DatedExchangeRate[]>(RATES_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    const idx = existing.findIndex((r) => r.id === rate.id)
    if (idx >= 0) {
      existing[idx] = rate
      return existing
    }
    return [rate, ...existing]
  })
  return rate
}

// ====================================================
// SUPPLIERS STORAGE (PHASE 8)
// ====================================================

export async function getAllSuppliers(): Promise<SupplierProfile[]> {
  const suppliers = await readJsonFile<SupplierProfile[]>(SUPPLIERS_FILE, [])
  if (!Array.isArray(suppliers)) return []
  return suppliers.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
}

export async function getSupplierById(id: string): Promise<SupplierProfile | null> {
  const all = await getAllSuppliers()
  return all.find((s) => s.id === id || s.supplierNumber.toLowerCase() === id.toLowerCase() || s.name.toLowerCase() === id.toLowerCase()) || null
}

export async function saveSupplierProfile(supplier: SupplierProfile): Promise<SupplierProfile> {
  await mutateJsonFile<SupplierProfile[]>(SUPPLIERS_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    const idx = existing.findIndex((s) => s.id === supplier.id)
    if (idx >= 0) {
      existing[idx] = { ...supplier, updatedAt: new Date().toISOString() }
      return existing
    }
    return [supplier, ...existing]
  })
  return supplier
}

export async function deleteSupplierProfile(id: string): Promise<boolean> {
  let found = false
  await mutateJsonFile<SupplierProfile[]>(SUPPLIERS_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    const filtered = existing.filter((s) => {
      if (s.id === id) {
        found = true
        return false
      }
      return true
    })
    return filtered
  })
  return found
}

// ====================================================
// SHIPMENT COSTS STORAGE (PHASE 8)
// ====================================================

export async function getAllShipmentCosts(): Promise<ShipmentCostRecord[]> {
  const costs = await readJsonFile<ShipmentCostRecord[]>(COSTS_FILE, [])
  if (!Array.isArray(costs)) return []
  return costs.sort((a, b) => (b.costDate || "").localeCompare(a.costDate || ""))
}

export async function getShipmentCostById(id: string): Promise<ShipmentCostRecord | null> {
  const all = await getAllShipmentCosts()
  return all.find((c) => c.id === id || c.costNumber.toLowerCase() === id.toLowerCase()) || null
}

export async function getShipmentCostsByBol(bolNumber: string): Promise<ShipmentCostRecord[]> {
  const all = await getAllShipmentCosts()
  const clean = bolNumber.trim().toLowerCase()
  return all.filter((c) => c.bolNumber.trim().toLowerCase() === clean)
}

export async function saveShipmentCost(cost: ShipmentCostRecord): Promise<ShipmentCostRecord> {
  await mutateJsonFile<ShipmentCostRecord[]>(COSTS_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    const idx = existing.findIndex((c) => c.id === cost.id)
    if (idx >= 0) {
      existing[idx] = { ...cost, updatedAt: new Date().toISOString() }
      return existing
    }
    return [cost, ...existing]
  })
  return cost
}

export async function deleteShipmentCost(id: string): Promise<boolean> {
  let found = false
  await mutateJsonFile<ShipmentCostRecord[]>(COSTS_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    const filtered = existing.filter((c) => {
      if (c.id === id) {
        found = true
        return false
      }
      return true
    })
    return filtered
  })
  return found
}

// ====================================================
// SUPPLIER BILLS STORAGE (PHASE 8)
// ====================================================

export async function getAllSupplierBills(): Promise<SupplierBillRecord[]> {
  const bills = await readJsonFile<SupplierBillRecord[]>(SUPPLIER_BILLS_FILE, [])
  if (!Array.isArray(bills)) return []
  return bills.sort((a, b) => (b.billDate || "").localeCompare(a.billDate || ""))
}

export async function getSupplierBillById(id: string): Promise<SupplierBillRecord | null> {
  const all = await getAllSupplierBills()
  return all.find((b) => b.id === id || b.billNumber.toLowerCase() === id.toLowerCase()) || null
}

export async function getSupplierBillsBySupplier(supplierId: string): Promise<SupplierBillRecord[]> {
  const all = await getAllSupplierBills()
  return all.filter((b) => b.supplierId === supplierId)
}

export async function saveSupplierBill(bill: SupplierBillRecord): Promise<SupplierBillRecord> {
  await mutateJsonFile<SupplierBillRecord[]>(SUPPLIER_BILLS_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    const idx = existing.findIndex((b) => b.id === bill.id)
    if (idx >= 0) {
      existing[idx] = { ...bill, updatedAt: new Date().toISOString() }
      return existing
    }
    return [bill, ...existing]
  })
  return bill
}

// ====================================================
// SUPPLIER PAYMENTS STORAGE (PHASE 8)
// ====================================================

export async function getAllSupplierPayments(): Promise<SupplierPaymentRecord[]> {
  const payments = await readJsonFile<SupplierPaymentRecord[]>(SUPPLIER_PAYMENTS_FILE, [])
  if (!Array.isArray(payments)) return []
  return payments.sort((a, b) => (b.paymentDate || "").localeCompare(a.paymentDate || ""))
}

export async function getSupplierPaymentById(id: string): Promise<SupplierPaymentRecord | null> {
  const all = await getAllSupplierPayments()
  return all.find((p) => p.id === id || p.paymentNumber.toLowerCase() === id.toLowerCase()) || null
}

export async function getSupplierPaymentsBySupplier(supplierId: string): Promise<SupplierPaymentRecord[]> {
  const all = await getAllSupplierPayments()
  return all.filter((p) => p.supplierId === supplierId)
}

export async function saveSupplierPayment(payment: SupplierPaymentRecord): Promise<SupplierPaymentRecord> {
  await mutateJsonFile<SupplierPaymentRecord[]>(SUPPLIER_PAYMENTS_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    const idx = existing.findIndex((p) => p.id === payment.id)
    if (idx >= 0) {
      existing[idx] = { ...payment, updatedAt: new Date().toISOString() }
      return existing
    }
    return [payment, ...existing]
  })
  return payment
}

// ====================================================
// SUPPLIER LEDGERS STORAGE (PHASE 8)
// ====================================================

export async function getAllSupplierLedgerTransactions(): Promise<SupplierLedgerTransaction[]> {
  const txs = await readJsonFile<SupplierLedgerTransaction[]>(SUPPLIER_LEDGERS_FILE, [])
  if (!Array.isArray(txs)) return []
  return txs.sort((a, b) => (a.transactionDate || "").localeCompare(b.transactionDate || ""))
}

export async function getSupplierLedgerTransactionsBySupplier(supplierId: string): Promise<SupplierLedgerTransaction[]> {
  const all = await getAllSupplierLedgerTransactions()
  return all.filter((t) => t.supplierId === supplierId)
}

export async function saveSupplierLedgerTransaction(tx: SupplierLedgerTransaction): Promise<SupplierLedgerTransaction> {
  await mutateJsonFile<SupplierLedgerTransaction[]>(SUPPLIER_LEDGERS_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    const idx = existing.findIndex((t) => t.id === tx.id)
    if (idx >= 0) {
      existing[idx] = tx
      return existing
    }
    return [...existing, tx]
  })
  return tx
}

// ====================================================
// ROUTE COST TEMPLATES STORAGE (PHASE 8)
// ====================================================

export async function getAllRouteCostTemplates(): Promise<RouteCostTemplate[]> {
  const templates = await readJsonFile<RouteCostTemplate[]>(ROUTE_TEMPLATES_FILE, [
    {
      id: "tmpl-dgh-nsa",
      corridorName: "DOGHAROUN -> BANDAR ABBAS -> JEBEL ALI -> NHAVA SHEVA",
      origin: "Dogharoun",
      destination: "Nhava Sheva",
      legs: ["Dogharoun -> Bandar Abbas", "Bandar Abbas -> Jebel Ali", "Jebel Ali -> Nhava Sheva"],
      expectedCostCategories: [
        "Road Freight Cost",
        "Port Charges",
        "Ocean Freight Cost",
        "Terminal Charges",
        "Documentation Cost",
        "Customs Cost",
        "Agent Fee",
        "Container Cost",
      ],
      defaultEstimates: {
        "Road Freight Cost": 1800,
        "Port Charges": 350,
        "Ocean Freight Cost": 1500,
        "Terminal Charges": 250,
        "Documentation Cost": 120,
        "Customs Cost": 150,
        "Agent Fee": 200,
        "Container Cost": 300,
      },
      currency: "USD",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "tmpl-kbl-dxb",
      corridorName: "KABUL -> TORKHAM -> KARACHI -> JEBEL ALI",
      origin: "Kabul",
      destination: "Jebel Ali",
      legs: ["Kabul -> Torkham", "Torkham -> Karachi", "Karachi -> Jebel Ali"],
      expectedCostCategories: [
        "Road Freight Cost",
        "Border Cost",
        "Port Charges",
        "Ocean Freight Cost",
        "Documentation Cost",
        "Customs Cost",
      ],
      defaultEstimates: {
        "Road Freight Cost": 1200,
        "Border Cost": 250,
        "Port Charges": 300,
        "Ocean Freight Cost": 1100,
        "Documentation Cost": 100,
        "Customs Cost": 150,
      },
      currency: "USD",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ])
  if (!Array.isArray(templates)) return []
  return templates
}

export async function saveRouteCostTemplate(template: RouteCostTemplate): Promise<RouteCostTemplate> {
  await mutateJsonFile<RouteCostTemplate[]>(ROUTE_TEMPLATES_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    const idx = existing.findIndex((t) => t.id === template.id)
    if (idx >= 0) {
      existing[idx] = { ...template, updatedAt: new Date().toISOString() }
      return existing
    }
    return [template, ...existing]
  })
  return template
}

