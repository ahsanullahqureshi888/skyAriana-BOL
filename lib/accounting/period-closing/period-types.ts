/**
 * Sky Ariana Enterprise Financial Period Closing & Multi-Currency Engine
 * Phase 17: Monthly Accounting Close, Period Lock & Year-End Carry-Forward
 */

export type PeriodStatus = "OPEN" | "CLOSING" | "CLOSED" | "REOPENED" | "ARCHIVED"

export interface AccountingPeriod {
  id: string                   // e.g. "period-2026-09"
  period_type: "MONTHLY" | "YEARLY"
  year: number                 // e.g. 2026
  month: number                // 1 - 12 (0 for pure annual roll)
  name: string                 // "September 2026"
  code: string                 // "2026-09"
  start_date: string           // "2026-09-01"
  end_date: string             // "2026-09-30"
  status: PeriodStatus
  opened_at: string
  opened_by: string
  closing_started_at?: string
  closed_at?: string
  closed_by?: string
  reopened_at?: string
  reopened_by?: string
  reopen_reason?: string
  lock_level: "FULL" | "SOFT" | "NONE"
  snapshot_id?: string
  pre_close_backup_id?: string
  post_close_backup_id?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface AccountPeriodBalance {
  id: string
  period_id: string
  period_code: string
  account_id: string
  account_name: string
  account_type: "customer" | "supplier" | "general"
  currency: string
  opening_balance: number
  period_debit: number
  period_credit: number
  closing_balance: number
  transaction_count: number
  snapshot_hash: string
  created_at: string
  updated_at?: string
}

export interface CurrencyBalanceSummary {
  currency: string
  openingBalance: number
  periodDebit: number
  periodCredit: number
  closingBalance: number
  netChange: number
}

export interface CloseChecklistItem {
  key: string
  title: string
  description: string
  status: "PASS" | "WARNING" | "BLOCKING_ERROR"
  details?: string
  count?: number
  canBypass?: boolean
}

export interface PeriodSnapshotSummary {
  totalAccounts: number
  activeAccounts: number
  totalTransactions: number
  currencyTotals: CurrencyBalanceSummary[]
  receivablesTotal: number
  payablesTotal: number
  customerCreditsTotal: number
  supplierAdvancesTotal: number
  revenueTotal: number
  costsTotal: number
  grossProfitTotal: number
  paymentTotals: number
  supplierPaymentTotals: number
  reconciliationValid: boolean
  checklistResults: CloseChecklistItem[]
}

export interface PeriodSnapshot {
  id: string
  period_id: string
  period_code: string
  snapshot_version: number      // 1, 2, ...
  created_at: string
  created_by: string
  data_hash: string
  status: "ACTIVE" | "SUPERSEDED"
  pre_backup_id?: string
  backup_id?: string
  summary: PeriodSnapshotSummary
  balances: AccountPeriodBalance[]
}

export interface AccountingPeriodSettings {
  enablePeriodLock: boolean
  currentPeriodId: string
  requireBackupBeforeClose: boolean
  requireReconciliationBeforeClose: boolean
  allowWarningsOnClose: boolean
  requireApprovalToReopen: boolean
  allowCurrentPeriodAdjustment: boolean
  updated_at?: string
  updated_by?: string
}

export interface PeriodAuditRecord {
  id: string
  period_id: string
  period_code: string
  action: "OPEN" | "CLOSE" | "REOPEN" | "FORCE_OVERRIDE" | "BALANCE_CARRY_FORWARD" | "YEAR_END_CLOSE"
  actor: string
  reason?: string
  timestamp: string
  snapshot_version?: number
  snapshot_hash?: string
  details?: Record<string, any>
}

export interface AssertPeriodOpenOptions {
  actor?: string
  role?: string
  allowOverride?: boolean
  entityType?: string
  entityId?: string
}

export interface PeriodReopenRequest {
  period_id: string
  reason: string
  actor: string
  role?: string
}

export interface MonthCloseOptions {
  period_id: string
  actor: string
  notes?: string
  bypassWarnings?: boolean
}

export interface YearEndCloseOptions {
  year: number
  actor: string
  notes?: string
}

export interface SnapshotDiffItem {
  account_id: string
  account_name: string
  currency: string
  v1_closing: number
  v2_closing: number
  delta: number
  v1_debit: number
  v2_debit: number
  v1_credit: number
  v2_credit: number
}

export interface SnapshotDiffResult {
  period_code: string
  v1_version: number
  v2_version: number
  v1_created_at: string
  v2_created_at: string
  differences: SnapshotDiffItem[]
  totalDelta: Record<string, number>
}
