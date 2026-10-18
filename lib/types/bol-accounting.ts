export type AccountingStatus =
  | "DRAFT"
  | "NOT_POSTED"
  | "POSTED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CREDIT"
  | "VOID"
  | "REVERSED"

export type PaymentStatus =
  | "UNPAID"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "CREDIT"
  | "VOID"

export type BillToPartyType =
  | "shipper"
  | "consignee"
  | "notify_party"
  | "agent"
  | "customer"
  | "custom"

export type PaymentTerms =
  | "Due Immediately"
  | "7 Days"
  | "15 Days"
  | "30 Days"
  | "45 Days"
  | "60 Days"
  | "Custom"

export const DEFAULT_CHARGE_TYPES = [
  "Ocean Freight",
  "Road Freight",
  "Reefer Charge",
  "Documentation Fee",
  "BOL Fee",
  "Customs Service",
  "Transit Service",
  "Port Charges",
  "Handling Fee",
  "Container Charges",
  "Detention",
  "Demurrage",
  "Inspection Charge",
  "Switch B/L Fee",
  "Transportation Fee",
  "Loading",
  "Unloading",
  "Other",
] as const

export type ChargeType = typeof DEFAULT_CHARGE_TYPES[number] | string

export interface BolChargeRecord {
  id: string
  bol_id: string
  invoice_id?: string | null
  charge_type: ChargeType
  description: string
  quantity: number
  rate: number
  amount: number // quantity * rate
  currency: string
  tax: number
  discount: number
  container_id?: string | null
  shipment_leg_id?: string | null
  truck_id?: string | null
  remarks?: string | null
  cost_carrier?: string | null
  cost_amount?: number | null
  gross_margin?: number | null
  status: "draft" | "posted" | "adjusted" | "void"
  ledger_transaction_id?: string | null
  created_at: string
  updated_at: string
}

export interface BolAccountingRecord {
  id: string
  bol_id: string
  bol_number: string
  bill_to_party_type: BillToPartyType
  bill_to_company_name: string
  account_id: string
  invoice_id?: string | null
  invoice_number?: string | null
  currency: string
  payment_terms: PaymentTerms
  credit_days: number
  billing_contact?: string
  billing_notes?: string
  subtotal: number
  discount: number
  tax: number
  total_charges: number
  amount_paid: number
  outstanding_balance: number
  accounting_status: AccountingStatus
  payment_status: PaymentStatus
  posted_at?: string | null
  posted_by?: string | null
  source_mode: "LIVE" | "IMPORTED"
  created_at: string
  updated_at: string
}

export interface PaymentAllocationRecord {
  id: string
  payment_id: string
  invoice_id: string
  bol_id?: string | null
  allocated_amount: number
  currency: string
  created_at: string
}

export interface PaymentReceiptRecord {
  id: string
  receipt_number: string // RCPT-2026-0001
  payment_id: string
  date: string
  received_from: string
  account_id: string
  account_name: string
  amount: number
  currency: string
  payment_method: string
  reference?: string
  applied_invoice?: string | null
  applied_bol?: string | null
  remaining_balance: number
  unallocated_credit?: number
  received_by: string
  notes?: string
  created_at: string
}

export interface AccountingSettings {
  autoCreateInvoice: boolean
  autoPostLedger: boolean
  requireApprovalBeforePosting: boolean
  defaultCurrency: "USD" | "AFN" | "AED"
  invoicePrefix: string
  receiptPrefix: string
  creditNotePrefix: string
  debitNotePrefix: string
  defaultPaymentTerms: PaymentTerms
  enableCreditLimits: boolean
  enablePeriodLock: boolean
  lockedBeforeDate?: string
  allowOverpayments: boolean
  defaultTaxRate: number
  decimalPrecision: number
}
