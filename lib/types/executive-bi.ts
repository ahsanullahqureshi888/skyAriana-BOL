/**
 * Sky Ariana Logistics — Executive BI, KPI & Analytics Center Types
 * Phase 27: Centralized Executive Intelligence Layer
 * Strictly derived from canonical operational, financial, and commercial modules.
 */

export type AnalyticsPeriodPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"
  | "custom"

export type AnalyticsComparisonMode =
  | "prev_period"
  | "prev_month"
  | "prev_year"
  | "none"

export type MetricTrendPolarity =
  | "higher_is_positive"
  | "higher_is_negative"
  | "neutral"

export type MetricCategory =
  | "OPERATIONAL"
  | "FINANCIAL"
  | "COMMERCIAL"
  | "PROCUREMENT"
  | "RISK_COMPLIANCE"

export type MetricFormat =
  | "currency"
  | "number"
  | "percentage"
  | "days"
  | "decimal"

export interface KpiDefinition {
  id: string
  code: string
  title: string
  titleFa: string
  category: MetricCategory
  description: string
  formula: string
  dateBasis: string
  polarity: MetricTrendPolarity
  format: MetricFormat
  requiredPermission?: string
  currencySensitive?: boolean
}

export interface KpiCardData {
  id: string
  title: string
  titleFa: string
  value: string | number
  rawValue: number | null
  unit?: string
  currency?: string
  format: MetricFormat
  changePercent?: number | null
  changeText?: string
  trend: "up" | "down" | "flat"
  status: "positive" | "negative" | "neutral"
  comparisonLabel: string
  explanation: string
  formula: string
  dateBasis: string
  isRedacted?: boolean
  drilldownAvailable?: boolean
  drilldownKpiKey?: string
}

export interface ExecutiveBiFilters {
  period: AnalyticsPeriodPreset
  comparison: AnalyticsComparisonMode
  startDate?: string
  endDate?: string
  customer?: string
  route?: string
  mode?: "all" | "road" | "sea" | "air" | "multimodal"
  commodity?: string
  containerType?: string
  supplier?: string
  currencyMode: "segregated" | "USD" | "AFN" | "AED"
}

export interface CurrencyAmountBucket {
  currency: string
  amount: number
  count: number
}

export interface AgingScheduleBucket {
  current: number
  days1To30: number
  days31To60: number
  days61To90: number
  daysOver90: number
  total: number
}

export interface AgingByCurrency {
  currency: string
  buckets: AgingScheduleBucket
}

export interface OperationalAttentionItem {
  id: string
  severity: "critical" | "warning" | "info"
  category: "OVERDUE_INVOICE" | "BORDER_HOLD" | "STALE_TRACKING" | "OPEN_CLAIM" | "UNPOSTED_DOCUMENT" | "CONTAINER_DETENTION"
  title: string
  description: string
  referenceId: string
  referenceType: "shipment" | "invoice" | "claim" | "tracking" | "bol"
  date: string
  daysElapsed: number
  financialImpact?: {
    amount: number
    currency: string
  }
  recommendedAction: string
}

export interface RouteCorridorPerformance {
  corridorKey: string
  origin: string
  destination: string
  borderStation?: string
  mode: string
  shipmentCount: number
  totalPackages: number
  totalGrossWeightKg: number
  totalRevenueUSD?: number
  totalCostUSD?: number
  grossMarginUSD?: number
  grossMarginPct?: number | null
  avgTransitDays: number
  activeHoldCount: number
}

export interface CustomerVolumePerformance {
  customerId: string
  customerName: string
  shipmentCount: number
  packageCount: number
  grossWeightKg: number
  revenueUSD?: number
  marginUSD?: number
  marginPct?: number | null
  outstandingReceivableUSD?: number
  activeShipments: number
  shareOfVolumePct: number
}

export interface SupplierVolumePerformance {
  supplierId: string
  supplierName: string
  category: string
  shipmentCount: number
  totalCostUSD?: number
  outstandingPayableUSD?: number
  activeDispatches: number
  shareOfCostPct: number
}

export interface ClaimIncidentMetric {
  totalClaimsCount: number
  openClaimsCount: number
  settledClaimsCount: number
  rejectedClaimsCount: number
  claimedAmountUSD: number
  settledAmountUSD: number
  avgResolutionDays: number
  claimsByType: {
    type: string
    count: number
    claimedUSD: number
  }[]
}

export interface SalesPipelineMetric {
  totalInquiries: number
  totalQuotationsSent: number
  acceptedQuotesCount: number
  rejectedQuotesCount: number
  pendingQuotesCount: number
  convertedShipmentsCount: number
  quoteConversionRatePct: number | null // Converted / Accepted
  quoteWinRatePct: number | null // Accepted / (Accepted + Rejected)
  activeOpportunitiesValueUSD: number
}

export interface ExecutiveMacroTrendPoint {
  periodLabel: string
  date: string
  shipmentCount: number
  deliveredCount: number
  serviceRevenueUSD?: number
  directCostUSD?: number
  grossMarginUSD?: number
  openAttentionCount: number
}

export interface ExecutiveDrilldownRecord {
  id: string
  referenceId?: string
  referenceNumber: string
  type: "shipment" | "invoice" | "payable" | "claim" | "quote" | "tracking"
  recordType?: string
  date: string
  entityName: string
  originDestination?: string
  status: string
  amount?: number
  currency?: string
  detail: string
  actionUrl?: string
}

export interface ExecutiveBiPayload {
  asOf: string
  periodLabel: string
  comparisonLabel: string
  appliedFilters: ExecutiveBiFilters
  userRole: string
  isFinanceRedacted: boolean

  // Summary Scorecard KPIs
  kpis: {
    activeShipments: KpiCardData
    deliveredShipments: KpiCardData
    serviceRevenue: KpiCardData
    directCost: KpiCardData
    grossMargin: KpiCardData
    grossMarginPct: KpiCardData
    activeContainers: KpiCardData
    activeTrucks: KpiCardData
    borderClearanceTurnaround: KpiCardData
    quoteConversionRate: KpiCardData
    overdueReceivables: KpiCardData
    overduePayables: KpiCardData
    openClaims: KpiCardData
    unpostedDocs: KpiCardData
    operationalAttentionCount: KpiCardData
  }

  // Scorecard Array & Financial Summary
  kpiScorecard?: KpiCardData[]
  financialSummary?: {
    isFinanceRedacted: boolean
    serviceRevenueUSD?: number
    directShipmentCostUSD?: number
    shipmentGrossMarginUSD?: number
    revenueByCurrency?: Record<string, { currency: string; amount: number }>
    directCostByCurrency?: Record<string, { currency: string; amount: number }>
  }

  // Currency Multi-Bucket Real Revenue (USD, AFN, AED segregated)
  revenueByCurrency: CurrencyAmountBucket[]
  directCostByCurrency: CurrencyAmountBucket[]
  grossMarginByCurrency: CurrencyAmountBucket[]

  // Aging Schedules
  receivablesAging: AgingByCurrency[]
  payablesAging: AgingByCurrency[]

  // Tab Data Packages
  macroTrends: ExecutiveMacroTrendPoint[]
  corridorPerformance: RouteCorridorPerformance[]
  routeCorridorPerformance?: RouteCorridorPerformance[]
  customerPerformance: CustomerVolumePerformance[]
  supplierPerformance: SupplierVolumePerformance[]
  salesPipeline: SalesPipelineMetric
  claimsSummary: ClaimIncidentMetric
  attentionQueue: OperationalAttentionItem[]
  operationalAttentionQueue?: OperationalAttentionItem[]

  // Volume by Mode Breakdown
  volumeByMode: {
    mode: string
    count: number
    percentage: number
  }[]

  // Volume by Status Breakdown
  volumeByStatus: {
    status: string
    count: number
    percentage: number
  }[]
}

export interface ExecutiveSnapshotRecord {
  id: string
  snapshotCode: string
  title: string
  generatedAt: string
  generatedBy: string
  periodPreset: AnalyticsPeriodPreset
  periodStart: string
  periodEnd: string
  currencyMode: string
  totalShipments: number
  totalRevenueUSD?: number
  grossMarginUSD?: number
  integrityHash: string
  payload: ExecutiveBiPayload
}
