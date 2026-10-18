import { getDataPath } from "../server-paths"
import { mutateJsonFile } from "../services/blob-db"
import { getAccountingSettings } from "../services/accounting-settings-service"
import { PaymentReceiptRecord } from "../types/bol-accounting"
import { getLedgerSystemDb, saveLedgerSystemDb } from "../services/ledger-db-service"

const RECEIPT_COUNTER_FILE = getDataPath(".receipt-counter")

export async function generateNextReceiptNumber(): Promise<string> {
  const settings = await getAccountingSettings()
  const prefix = settings.receiptPrefix || "RCPT"
  const currentYear = new Date().getFullYear()

  let counter = 1
  await mutateJsonFile<number>(RECEIPT_COUNTER_FILE, 1, (current) => {
    counter = Number.isSafeInteger(current) && current > 0 ? current : 1
    return counter + 1
  })

  return `${prefix}-${currentYear}-${String(counter).padStart(4, "0")}`
}

export async function createPaymentReceipt(params: {
  paymentId: string
  date: string
  receivedFrom: string
  accountId: string
  accountName: string
  amount: number
  currency: string
  paymentMethod: string
  reference?: string
  appliedInvoice?: string | null
  appliedBol?: string | null
  remainingBalance: number
  unallocatedCredit?: number
  receivedBy: string
  notes?: string
}): Promise<PaymentReceiptRecord> {
  const receiptNumber = await generateNextReceiptNumber()
  const db = await getLedgerSystemDb()

  if (!db.payment_receipts) {
    db.payment_receipts = []
  }

  const receipt: PaymentReceiptRecord = {
    id: `RCPT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    receipt_number: receiptNumber,
    payment_id: params.paymentId,
    date: params.date,
    received_from: params.receivedFrom,
    account_id: params.accountId,
    account_name: params.accountName,
    amount: params.amount,
    currency: params.currency,
    payment_method: params.paymentMethod,
    reference: params.reference || "",
    applied_invoice: params.appliedInvoice || null,
    applied_bol: params.appliedBol || null,
    remaining_balance: params.remainingBalance,
    unallocated_credit: params.unallocatedCredit || 0,
    received_by: params.receivedBy,
    notes: params.notes || "",
    created_at: new Date().toISOString(),
  }

  db.payment_receipts.unshift(receipt)
  await saveLedgerSystemDb(db)

  return receipt
}

export async function getReceiptById(receiptIdOrNumber: string): Promise<PaymentReceiptRecord | null> {
  const db = await getLedgerSystemDb()
  if (!db.payment_receipts) return null
  return (
    db.payment_receipts.find(
      (r) => r.id === receiptIdOrNumber || r.receipt_number === receiptIdOrNumber
    ) || null
  )
}

export async function getReceiptsForPayment(paymentId: string): Promise<PaymentReceiptRecord[]> {
  const db = await getLedgerSystemDb()
  if (!db.payment_receipts) return []
  return db.payment_receipts.filter((r) => r.payment_id === paymentId)
}
