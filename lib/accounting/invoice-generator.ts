import { getDataPath } from "../server-paths"
import { mutateJsonFile } from "../services/blob-db"
import { getAccountingSettings } from "../services/accounting-settings-service"
import { PaymentTerms, BolChargeRecord } from "../types/bol-accounting"
import { InvoiceItem, InvoiceRecord, saveInvoice } from "../services/invoice-storage-service"
import { calculateFinancialTotals, roundMoney } from "./money"

const INVOICE_COUNTER_FILE = getDataPath(".invoice-counter")

export async function generateNextInvoiceNumber(): Promise<string> {
  const settings = await getAccountingSettings()
  const prefix = settings.invoicePrefix || "INV"
  const currentYear = new Date().getFullYear()

  let counter = 1
  await mutateJsonFile<number>(INVOICE_COUNTER_FILE, 1, (current) => {
    counter = Number.isSafeInteger(current) && current > 0 ? current : 1
    return counter + 1
  })

  return `${prefix}-${currentYear}-${String(counter).padStart(4, "0")}`
}

export function calculateDueDate(invoiceDateStr: string, terms: PaymentTerms, customDays?: number): string {
  const baseDate = invoiceDateStr ? new Date(invoiceDateStr) : new Date()
  let daysToAdd = 0

  switch (terms) {
    case "Due Immediately":
      daysToAdd = 0
      break
    case "7 Days":
      daysToAdd = 7
      break
    case "15 Days":
      daysToAdd = 15
      break
    case "30 Days":
      daysToAdd = 30
      break
    case "45 Days":
      daysToAdd = 45
      break
    case "60 Days":
      daysToAdd = 60
      break
    case "Custom":
      daysToAdd = customDays ?? 30
      break
    default:
      daysToAdd = 30
  }

  const dueDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
  return dueDate.toISOString().split("T")[0]
}

export function isInvoiceOverdue(dueDateStr: string, outstanding: number): boolean {
  if (outstanding <= 0 || !dueDateStr) return false
  const today = new Date().toISOString().split("T")[0]
  return today > dueDateStr
}

export async function createOrUpdateInvoiceFromBol(params: {
  bolId: string
  bolNumber: string
  accountId: string
  accountName: string
  existingInvoiceId?: string | null
  charges: BolChargeRecord[]
  currency: string
  paymentTerms: PaymentTerms
  creditDays?: number
  shipper?: string
  consignee?: string
  origin?: string
  destination?: string
  containerNo?: string
  truckNo?: string
  vesselVoyage?: string
  notes?: string
}): Promise<InvoiceRecord> {
  const {
    bolId,
    bolNumber,
    accountName,
    existingInvoiceId,
    charges,
    currency,
    paymentTerms,
    creditDays,
    shipper,
    consignee,
    origin,
    destination,
    containerNo,
    truckNo,
    vesselVoyage,
    notes,
  } = params

  const totals = calculateFinancialTotals(charges)
  const invoiceDate = new Date().toISOString().split("T")[0]
  const dueDate = calculateDueDate(invoiceDate, paymentTerms, creditDays)

  const items: InvoiceItem[] = charges.map((c) => ({
    id: c.id,
    date: invoiceDate,
    description: `${c.charge_type}${c.description ? ` — ${c.description}` : ""}`,
    containerNo: c.container_id || containerNo || "",
    quantity: String(c.quantity || 1),
    unit: "Unit",
    unitPrice: String(c.rate || 0),
    currency: c.currency || currency,
  }))

  const invoiceData: Partial<InvoiceRecord> = {
    id: existingInvoiceId || undefined,
    invoice_date: invoiceDate,
    due_date: dueDate,
    payment_terms: paymentTerms,
    currency: currency,
    invoice_type: "Freight Invoice",
    buyer_name: accountName,
    shipper: shipper || "",
    consignee: consignee || "",
    origin: origin || "",
    destination: destination || "",
    bl_no: bolNumber,
    container_no: containerNo || "",
    truck_no: truckNo || "",
    vessel_voyage: vesselVoyage || "",
    items,
    freight_charges: String(totals.subtotal),
    tax: String(totals.totalTax),
    discount: String(totals.totalDiscount),
    notes: notes || `Generated from BOL ${bolNumber}`,
    payment_status: "Unpaid",
  }

  const saved = await saveInvoice(invoiceData)
  return saved
}
