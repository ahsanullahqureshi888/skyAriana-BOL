export type AccountType =
  | 'customer'
  | 'shipper'
  | 'consignee'
  | 'agent'
  | 'supplier'
  | 'company'
  | 'office_expense'
  | 'transportation'

export type TransactionType =
  | 'invoice'
  | 'charge'
  | 'payment'
  | 'opening_balance'
  | 'adjustment'
  | 'transfer'
  | 'debit_note'
  | 'credit_note'
  | 'expense'
  | 'refund'

export type PaymentMethod =
  | 'Cash'
  | 'Bank'
  | 'Exchange'
  | 'Transfer'
  | 'Other'

export interface AccountRecord {
  id: string
  account_code: string
  account_name: string
  display_name: string
  normalized_name: string
  aliases: string[]
  account_type: AccountType
  company_id?: string
  customer_id?: string
  shipper_id?: string
  consignee_id?: string
  agent_id?: string
  currency: string
  opening_balance: number
  total_debit: number
  total_credit: number
  current_balance: number
  status: 'active' | 'archived' | 'merged'
  merged_into?: string
  source: string
  notes?: string
  created_at: string
  updated_at: string
}

import type {
  BolAccountingRecord,
  BolChargeRecord,
  PaymentAllocationRecord,
  PaymentReceiptRecord,
} from "./bol-accounting"

export interface LedgerTransactionRecord {
  id: string
  account_id: string
  transaction_date: string
  transaction_type: TransactionType
  description: string
  reference_number?: string
  invoice_number?: string
  bol_number?: string
  bol_id?: string
  invoice_id?: string
  is_adjustment?: boolean
  reversal_of_transaction_id?: string
  shipment_id?: string
  container_number?: string
  container_type?: string
  consignee_name?: string
  shipper_name?: string
  truck_number?: string
  quantity_text?: string
  debit: number
  credit: number
  running_balance: number
  currency: string
  remarks?: string
  source_file?: string
  source_sheet?: string
  source_row?: number
  import_batch_id?: string
  fingerprint?: string
  is_deleted?: boolean
  deleted_at?: string
  deleted_by?: string
  created_at: string
  updated_at: string
}

export interface PaymentRecord {
  id: string
  account_id: string
  payment_date: string
  amount: number
  currency: string
  payment_method: PaymentMethod
  reference?: string
  bank_reference?: string
  bol_reference?: string
  invoice_reference?: string
  notes?: string
  attachment_url?: string
  created_by?: string
  created_at: string
}

export interface LedgerImportBatchRecord {
  id: string
  filename: string
  import_date: string
  imported_accounts: number
  imported_transactions: number
  skipped_rows: number
  duplicate_rows: number
  formula_errors: number
  warnings: string[]
  status: 'completed' | 'failed' | 'partial'
}

export interface AuditLogRecord {
  id: string
  entity_type: 'transaction' | 'account' | 'payment' | 'bol_accounting' | 'invoice'
  entity_id: string
  account_id: string
  action: 'create' | 'edit' | 'delete' | 'restore' | 'merge' | 'post' | 'adjust' | 'void'
  previous_value?: any
  new_value?: any
  user: string
  timestamp: string
  reason?: string
}

export interface LedgerDatabaseSchema {
  accounts: AccountRecord[]
  ledger_transactions: LedgerTransactionRecord[]
  payments: PaymentRecord[]
  import_batches: LedgerImportBatchRecord[]
  audit_logs: AuditLogRecord[]
  bol_accounting?: BolAccountingRecord[]
  bol_charges?: BolChargeRecord[]
  payment_allocations?: PaymentAllocationRecord[]
  payment_receipts?: PaymentReceiptRecord[]
  version: string
  updated_at: string
}
