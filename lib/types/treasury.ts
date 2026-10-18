/**
 * Sky Ariana Logistics — Enterprise Treasury & Cash/Bank Management Types
 * Phase 18: Bank Accounts, Cash Boxes, Treasury, Currency Exchange & Transfer Tracking
 */

export type TreasuryAccountType =
  | "BANK"
  | "CASH"
  | "EXCHANGE_DEALER"
  | "MOBILE_DIGITAL"
  | "PETTY_CASH"
  | "CLEARING"
  | "OTHER"

export type TreasuryAccountStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "FROZEN"
  | "CLOSED"

export type TreasuryTransactionType =
  | "CUSTOMER_RECEIPT"
  | "SUPPLIER_PAYMENT"
  | "INTERNAL_TRANSFER_IN"
  | "INTERNAL_TRANSFER_OUT"
  | "EXCHANGE_OUT"
  | "EXCHANGE_IN"
  | "BANK_FEE"
  | "CASH_ADJUSTMENT"
  | "OPENING_BALANCE"
  | "OTHER_RECEIPT"
  | "OTHER_PAYMENT"
  | "REVERSAL"

export type TreasuryTransactionStatus =
  | "POSTED"
  | "PENDING_APPROVAL"
  | "REVERSED"

export type RateDirection = "AED_PER_USD" | "USD_PER_AED" | "AFN_PER_USD" | "USD_PER_AFN" | "CUSTOM"

export interface TreasuryAccount {
  id: string
  account_code: string
  account_name: string
  account_type: TreasuryAccountType
  bank_name?: string
  account_holder?: string
  account_number?: string
  iban?: string
  swift_code?: string
  branch?: string
  country?: string
  currency: string // USD, AED, AFN, etc.
  opening_balance: number
  current_balance: number
  allow_negative_balance: boolean
  overdraft_limit?: number
  status: TreasuryAccountStatus
  notes?: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface TreasuryTransaction {
  id: string
  treasury_account_id: string
  transaction_date: string // YYYY-MM-DD
  posting_date: string // YYYY-MM-DD
  transaction_type: TreasuryTransactionType
  description: string
  reference_number?: string
  amount_in: number
  amount_out: number
  currency: string
  balance_after: number
  customer_payment_id?: string
  supplier_payment_id?: string
  transfer_id?: string
  exchange_transaction_id?: string
  bol_id?: string
  invoice_id?: string
  account_id?: string // customer/supplier ledger account id
  party_name?: string // name of customer or supplier
  source?: string
  status: TreasuryTransactionStatus
  reversal_of_id?: string
  reversed_by_id?: string
  idempotency_key?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface TreasuryTransfer {
  id: string
  transfer_number: string // TRF-2026-000001
  from_account_id: string
  from_account_name: string
  to_account_id: string
  to_account_name: string
  transfer_date: string
  amount: number
  currency: string
  reference?: string
  fee: number
  status: "COMPLETED" | "PENDING_APPROVAL" | "REVERSED"
  remarks?: string
  out_transaction_id?: string
  in_transaction_id?: string
  created_by?: string
  approved_by?: string
  created_at: string
}

export interface CurrencyExchangeTransaction {
  id: string
  exchange_number: string // FX-2026-000001
  date: string
  from_treasury_account_id: string
  from_account_name: string
  from_currency: string
  from_amount: number
  to_treasury_account_id: string
  to_account_name: string
  to_currency: string
  to_amount: number
  exchange_rate: number
  rate_direction: RateDirection
  exchange_fee: number
  fee_currency?: string
  counterparty?: string // Dealer / Company Name
  counterparty_phone?: string
  reference?: string
  remarks?: string
  status: "COMPLETED" | "PENDING_APPROVAL" | "REVERSED"
  out_transaction_id?: string
  in_transaction_id?: string
  created_by?: string
  approved_by?: string
  created_at: string
}

export type ReconciliationStatus = "DRAFT" | "MATCHED" | "DIFFERENCE" | "RECONCILED"

export interface BankStatementLine {
  id: string
  date: string
  reference?: string
  description: string
  amount_in: number
  amount_out: number
  matched_transaction_id?: string
  status: "MATCHED" | "UNMATCHED" | "IGNORED"
}

export interface CashDenominationCount {
  denomination: number
  count: number
  total: number
}

export interface TreasuryReconciliation {
  id: string
  treasury_account_id: string
  treasury_account_name: string
  account_type: TreasuryAccountType
  period_start: string
  period_end: string
  system_balance: number
  actual_balance: number
  difference: number
  status: ReconciliationStatus
  notes?: string
  statement_lines?: BankStatementLine[]
  cash_denominations?: CashDenominationCount[]
  reconciled_by: string
  reconciled_at: string
}

export interface TreasurySettings {
  defaultReceiptAccount?: string
  defaultPaymentAccount?: string
  requirePaymentApproval: boolean
  requireCashCount: boolean
  reconciliationFrequency: "DAILY" | "WEEKLY" | "MONTHLY"
  allowNegativeCash: boolean
  receiptPrefix: string
  voucherPrefix: string
  transferPrefix: string
  exchangePrefix: string
  updated_at: string
  updated_by: string
}

export interface CustomerReceiptRequest {
  idempotency_key?: string
  customer_name: string
  account_id?: string
  invoice_id?: string
  invoice_number?: string
  bol_id?: string
  bol_number?: string
  amount: number
  currency: string
  received_into_account_id: string // Mandate: Where did money land?
  payment_method: "CASH" | "BANK_TRANSFER" | "EXCHANGE_DEALER" | "CHEQUE" | "INTERNAL_TRANSFER" | "OTHER"
  reference?: string
  transaction_date: string
  posting_date?: string
  applied_exchange_rate?: number
  invoice_currency?: string
  allocated_amount_invoice_currency?: number
  remarks?: string
  attachment_url?: string
  received_by?: string
}

export interface SupplierPaymentRequest {
  idempotency_key?: string
  supplier_name: string
  supplier_id?: string
  bill_id?: string
  bill_number?: string
  bol_id?: string
  bol_number?: string
  amount: number
  currency: string
  paid_from_account_id: string // Mandate: Where did money come from?
  payment_method: "CASH" | "BANK_TRANSFER" | "EXCHANGE_DEALER" | "CHEQUE" | "INTERNAL_TRANSFER" | "OTHER"
  reference?: string
  transaction_date: string
  posting_date?: string
  remarks?: string
  attachment_url?: string
  paid_by?: string
}

export interface InternalTransferRequest {
  from_account_id: string
  to_account_id: string
  amount: number
  transfer_date: string
  reference?: string
  fee?: number
  remarks?: string
  created_by?: string
}

export interface CurrencyExchangeRequest {
  from_account_id: string
  from_amount: number
  to_account_id: string
  to_amount: number
  exchange_rate?: number
  rate_direction?: RateDirection
  exchange_fee?: number
  counterparty?: string
  reference?: string
  date: string
  remarks?: string
  created_by?: string
}

export interface CashPositionSummary {
  currency: string
  bank_total: number
  cash_total: number
  exchange_total: number
  other_total: number
  total_balance: number
  account_count: number
}

export interface DailyCashMovementSummary {
  currency: string
  opening_balance: number
  money_in: number
  money_out: number
  net_movement: number
  closing_balance: number
}

export interface OperationalCashFlowSummary {
  period_start: string
  period_end: string
  currency: string
  customer_receipts: number
  supplier_payments: number
  operational_expenses: number
  net_operational_cash_flow: number
  internal_transfers_volume: number
  currency_exchange_volume: number
}

export interface TreasuryDashboardData {
  accounts: TreasuryAccount[]
  cashPositions: CashPositionSummary[]
  todayMovements: DailyCashMovementSummary[]
  recentTransactions: TreasuryTransaction[]
  pendingReconciliationsCount: number
  kpi: {
    totalAccounts: number
    bankAccountsCount: number
    cashBoxesCount: number
    exchangeAccountsCount: number
    todayInflowUSD: number
    todayOutflowUSD: number
    todayInflowAED: number
    todayOutflowAED: number
    todayInflowAFN: number
    todayOutflowAFN: number
  }
}
