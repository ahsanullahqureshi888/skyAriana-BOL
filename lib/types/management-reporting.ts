/**
 * Sky Ariana Logistics — Management Reporting Center Data Types & Contracts
 * Phase 19: Enterprise Executive Dashboards, P&L, Cash Flow, Aging & Profitability
 */

import type { TreasuryAccountType } from "@/lib/types/treasury"

export type ReportDatePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "last_year"
  | "ytd"
  | "custom"

export interface ReportFilters {
  datePreset: ReportDatePreset
  startDate?: string
  endDate?: string
  periodCode?: string // e.g. "2026-09"
  branch?: string // "Kandahar" | "Dubai" | "Bandar Abbas" | "All"
  department?: string
  customer?: string
  shipper?: string
  consignee?: string
  supplier?: string
  route?: string
  origin?: string
  destination?: string
  commodity?: string
  containerType?: string
  shippingLine?: string
  vessel?: string
  currency?: string // "ALL" | "USD" | "AED" | "AFN" | etc.
  baseCurrency?: string // Optional conversion: "USD" | "AED" | "AFN"
  shipmentStatus?: string
  documentStatus?: string
  includeDrafts?: boolean
}

// -------------------------------------------------------------
// Executive Dashboard Overview
// -------------------------------------------------------------
export interface ExecutiveKpiCard {
  id: string
  title: string
  periodLabel: string // e.g. "September 2026"
  value: number | string
  currency?: string
  changePct?: number
  changeDirection?: "up" | "down" | "neutral"
  comparisonLabel?: string // e.g. "vs Aug 2026"
  drilldownKey: string
  category: "FINANCIAL" | "OPERATIONS" | "TREASURY" | "RECEIVABLES" | "PAYABLES" | "RISK"
  badgeText?: string
  badgeVariant?: "default" | "destructive" | "secondary" | "outline" | "success" | "warning"
}

export interface ExecutiveDashboardData {
  periodLabel: string
  dateRange: { start: string; end: string }
  kpis: ExecutiveKpiCard[]
  currencySummaries: {
    currency: string
    revenue: number
    directCosts: number
    grossProfit: number
    operatingExpenses: number
    operatingProfit: number
    receivables: number
    payables: number
    cashBalance: number
  }[]
  operationalHighlights: {
    activeShipments: number
    deliveredShipments: number
    delayedShipments: number
    totalContainers: number
    borderWaitingCount: number
    portDwellCount: number
    missingDocumentsCount: number
    overdueInvoicesCount: number
  }
  attentionItems: {
    id: string
    type: "OVERDUE_INVOICE" | "OVERDUE_BILL" | "DELAYED_SHIPMENT" | "MISSING_DOCS" | "COST_INCOMPLETE"
    title: string
    description: string
    severity: "CRITICAL" | "WARNING" | "INFO"
    reference: string
    date?: string
    amount?: number
    currency?: string
  }[]
  dataQuality: {
    totalShipmentsAnalyzed: number
    costIncompleteCount: number
    revenueNotPostedCount: number
    unallocatedPaymentsCount: number
    missingBranchCount: number
    qualityScorePct: number
  }
}

// -------------------------------------------------------------
// Profit & Loss (P&L)
// -------------------------------------------------------------
export interface PnLSubItem {
  id: string
  name: string
  amount: number
  drilldownKey: string
}

export interface PnLSection {
  title: string
  total: number
  items: PnLSubItem[]
}

export interface PnLCurrencyReport {
  currency: string
  revenue: {
    freightRevenue: number
    documentationRevenue: number
    handlingRevenue: number
    otherServiceRevenue: number
    totalRevenue: number
    items: PnLSubItem[]
  }
  directCosts: {
    shippingLineCosts: number
    truckCosts: number
    portCosts: number
    agentCosts: number
    customsTransitCosts: number
    otherDirectCosts: number
    totalDirectCosts: number
    items: PnLSubItem[]
  }
  grossProfit: number
  grossMarginPct: number
  operatingExpenses: {
    officeRent: number
    payroll: number
    utilities: number
    travel: number
    it: number
    bankCharges: number
    marketing: number
    otherOverhead: number
    totalOperatingExpenses: number
    items: PnLSubItem[]
  }
  operatingProfit: number
  operatingMarginPct: number

  // Prior Period Comparison & Variance
  comparison?: {
    priorPeriodLabel: string
    isPartialComparison?: boolean // e.g. Sep 1-23 vs Aug 1-31
    revenuePrior: number
    revenueVarianceAbs: number
    revenueVariancePct: number
    directCostsPrior: number
    directCostsVarianceAbs: number
    directCostsVariancePct: number
    grossProfitPrior: number
    grossProfitVarianceAbs: number
    grossProfitVariancePct: number
    expensesPrior: number
    expensesVarianceAbs: number
    expensesVariancePct: number
    operatingProfitPrior: number
    operatingProfitVarianceAbs: number
    operatingProfitVariancePct: number
  }
}

export interface ProfitAndLossReport {
  periodLabel: string
  dateRange: { start: string; end: string }
  currencyReports: PnLCurrencyReport[]
  baseCurrencyConversion?: {
    baseCurrency: string
    ratesUsed: Record<string, number>
    convertedGrossProfit: number
    convertedOperatingProfit: number
  }
  isClosedPeriod?: boolean
  snapshotHash?: string
}

// -------------------------------------------------------------
// Operational Cash Flow
// -------------------------------------------------------------
export interface CashFlowInflows {
  customerReceipts: number
  otherReceipts: number
  totalInflows: number
  items: PnLSubItem[]
}

export interface CashFlowOutflows {
  supplierPayments: number
  officeExpensesPaid: number
  payrollPaid: number
  otherPayments: number
  totalOutflows: number
  items: PnLSubItem[]
}

export interface CashFlowCurrencyReport {
  currency: string
  inflows: CashFlowInflows
  outflows: CashFlowOutflows
  netOperationalCashFlow: number // Inflows - Outflows (excludes transfers & FX)
  openingCashBalance: number
  closingCashBalance: number
  accountBreakdown: {
    accountId: string
    accountName: string
    accountType: TreasuryAccountType
    openingBalance: number
    moneyIn: number
    moneyOut: number
    closingBalance: number
  }[]
  internalTransfersVolume: number // Tracked separately, NOT in net external cash flow
  currencyExchangeVolume: number // Tracked separately, NOT in net external cash flow
}

export interface ManagementCashFlowReport {
  periodLabel: string
  dateRange: { start: string; end: string }
  currencyReports: CashFlowCurrencyReport[]
}

// -------------------------------------------------------------
// Receivables & Payables Aging
// -------------------------------------------------------------
export interface AgingBuckets {
  current: number // Not due yet
  days1_30: number
  days31_60: number
  days61_90: number
  days91_120: number
  days120_plus: number
  totalOutstanding: number
}

export interface CustomerReceivableRow {
  customerId: string
  customerName: string
  currency: string
  openingBalance: number
  invoicedCharges: number
  paymentsReceived: number
  adjustments: number
  currentOutstanding: number
  customerCreditBalance: number // Unallocated credit advances kept strictly separate
  oldestInvoiceNo?: string
  oldestInvoiceDate?: string
  oldestDueDate?: string
  daysOutstanding: number
  aging: AgingBuckets
}

export interface ReceivablesReport {
  periodLabel: string
  dateRange: { start: string; end: string }
  currencySummaries: {
    currency: string
    totalOutstanding: number
    totalOverdue: number
    totalCreditAdvances: number
    customerCount: number
    overdueInvoicesCount: number
    aging: AgingBuckets
  }[]
  customers: CustomerReceivableRow[]
}

export interface SupplierPayableRow {
  supplierId: string
  supplierName: string
  currency: string
  openingBalance: number
  billsReceived: number
  paymentsMade: number
  adjustments: number
  currentPayable: number
  supplierAdvanceBalance: number // Prepayments kept strictly separate
  oldestBillNo?: string
  oldestBillDate?: string
  oldestDueDate?: string
  daysOutstanding: number
  aging: AgingBuckets
}

export interface PayablesReport {
  periodLabel: string
  dateRange: { start: string; end: string }
  currencySummaries: {
    currency: string
    totalPayable: number
    totalOverdue: number
    totalAdvances: number
    supplierCount: number
    overdueBillsCount: number
    aging: AgingBuckets
  }[]
  suppliers: SupplierPayableRow[]
}

// -------------------------------------------------------------
// Profitability Analytics: Customer, Route, Shipment
// -------------------------------------------------------------
export interface CustomerProfitabilityRow {
  customerId: string
  customerName: string
  currency: string
  shipmentsCount: number
  containersCount: number
  revenue: number
  directCosts: number
  grossProfit: number
  grossMarginPct: number
  outstandingReceivable: number
  paymentsReceived: number
  allocatedOverhead?: number
  netContribution?: number
}

export interface RoutePerformanceRow {
  routeId: string
  routeName: string
  origin: string
  borderStations: string[]
  destination: string
  currency: string
  shipmentsCount: number
  containersCount: number
  revenue: number
  directCosts: number
  grossProfit: number
  grossMarginPct: number
  avgRevenuePerShipment: number
  avgCostPerShipment: number
  avgGrossProfitPerShipment: number
  avgTransitDays: number
  delayedShipmentsCount: number
}

export interface ShipmentProfitabilityRow {
  bolId: string
  bolNumber: string
  shipmentDate: string
  customerName: string
  consigneeName?: string
  containerNumbers: string[]
  route: string
  origin: string
  destination: string
  currency: string
  revenue: number
  directCost: number
  grossProfit: number
  marginPct: number
  status: "COMPLETE" | "COST_INCOMPLETE" | "REVENUE_NOT_POSTED" | "PENDING_APPROVAL"
  outstandingReceivable: number
  costBreakdown: {
    truckCost: number
    shippingLineCost: number
    portCost: number
    customsCost: number
    otherCost: number
  }
}

// -------------------------------------------------------------
// Branch Performance
// -------------------------------------------------------------
export interface BranchPerformanceRow {
  branchId: string
  branchName: string // e.g. "Kandahar", "Bandar Abbas", "Dubai"
  currency: string
  shipmentsManaged: number
  revenue: number
  directCosts: number
  grossProfit: number
  operatingExpenses: number
  payroll: number
  operatingContribution: number
  activeTreasuryAccountsCount: number
  treasuryCashBalance: number
  pendingTasksCount: number
}

// -------------------------------------------------------------
// Operational Logistics Analytics
// -------------------------------------------------------------
export interface ContainerPerformanceRow {
  containerType: string // "40'RF" | "40'HC" | "20'DC" | "OTHER"
  count: number
  currency: string
  revenue: number
  directCosts: number
  grossProfit: number
  avgTransitDays: number
  topRoutes: string[]
}

export interface CommodityAnalysisRow {
  commodity: string
  shipmentsCount: number
  totalPackages: number
  totalWeightKg: number
  currency: string
  revenue: number
  topRoutes: string[]
  topDestinations: string[]
  avgShipmentWeightKg: number
}

export interface TrackingPerformanceData {
  activeShipments: number
  staleUpdatesCount: number
  avgUpdateFrequencyHours: number
  atBorderCount: number
  atPortCount: number
  atSeaCount: number
  delayedCount: number
  deliveredCount: number
  borderPerformance: {
    borderStation: string
    shipmentCount: number
    avgWaitHours: number
    longestWaitHours: number
    currentWaitingCount: number
  }[]
  portPerformance: {
    portName: string
    arrivalsCount: number
    avgDwellDays: number
    waitingVesselCount: number
    departuresCount: number
  }[]
}

export interface DocumentPerformanceData {
  totalBols: number
  commercialInvoicesCount: number
  packingListsCount: number
  transitPapersCount: number
  phytoDraftsCount: number
  readyCount: number
  incompleteCount: number
  issuedCount: number
  avgCompletionHours: number
  missingDocuments: {
    bolNumber: string
    customerName: string
    requiredDocument: string
    missingFields: string[]
    daysPending: number
    status: "CRITICAL" | "PENDING"
  }[]
}

// -------------------------------------------------------------
// Monthly Comparison & Year-to-Date (YTD)
// -------------------------------------------------------------
export interface MonthlyComparisonRow {
  monthCode: string // "2026-01", "2026-02", ...
  monthName: string
  isClosed: boolean
  shipmentsCount: number
  currency: string
  revenue: number
  directCost: number
  grossProfit: number
  operatingExpenses: number
  payroll: number
  operatingProfit: number
  customerReceipts: number
  supplierPayments: number
  closingReceivables: number
  closingPayables: number
}

// -------------------------------------------------------------
// Traceability & Drill-Down
// -------------------------------------------------------------
export interface MetricDrilldownRecord {
  id: string
  date: string
  postingDate: string
  entityType: "INVOICE" | "SUPPLIER_BILL" | "TREASURY_TX" | "LEDGER_ENTRY" | "BOL" | "EXPENSE" | "PAYROLL"
  referenceNumber: string
  partyName: string
  description: string
  amount: number
  currency: string
  status: string
  linkUrl?: string
}

export interface MetricDrilldownResponse {
  metricId: string
  metricTitle: string
  periodLabel: string
  currency: string
  formula: string
  definition: string
  includedRecordsCount: number
  totalCalculated: number
  records: MetricDrilldownRecord[]
}

// -------------------------------------------------------------
// Custom Reports & Snapshots
// -------------------------------------------------------------
export interface CustomReportConfig {
  id: string
  name: string
  description?: string
  dataset: "BOLS" | "SHIPMENTS" | "INVOICES" | "PAYMENTS" | "SUPPLIER_BILLS" | "EXPENSES" | "TREASURY" | "LEDGER"
  columns: string[]
  filters: ReportFilters
  groupBy?: "CUSTOMER" | "ROUTE" | "CURRENCY" | "MONTH" | "BRANCH" | "COMMODITY"
  sortBy?: string
  sortOrder?: "asc" | "desc"
  createdAt: string
  createdBy: string
}

export interface ManagementReportSnapshot {
  id: string
  periodCode: string
  snapshotVersion: number // 1, 2, ...
  snapshotStatus: "FINAL" | "SUPERSEDED"
  dataHash: string
  generatedAt: string
  generatedBy: string
  notes?: string
  pnlData: ProfitAndLossReport
  cashFlowData: ManagementCashFlowReport
  receivablesSummary: ReceivablesReport["currencySummaries"]
  payablesSummary: PayablesReport["currencySummaries"]
  kpis: ExecutiveKpiCard[]
}
