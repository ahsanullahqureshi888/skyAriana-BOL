export type PipelineStage =
  | "all"
  | "preparing"
  | "road_transit"
  | "border_clearance"
  | "port_operations"
  | "on_vessel"
  | "arrived_destination"
  | "delivered"
  | "delayed"

export type AttentionSeverity = "critical" | "warning" | "info"

export type AttentionCategory =
  | "cut_off"
  | "customs_border"
  | "detention_freedays"
  | "missing_docs"
  | "missing_data"
  | "overdue_finance"
  | "unresponsive_tracking"
  | "general"

export interface AttentionItem {
  id: string
  title: string
  description: string
  severity: AttentionSeverity
  category: AttentionCategory
  shipmentId?: string
  bolNumber?: string
  containerNumber?: string
  customerName?: string
  invoiceNumber?: string
  timestamp: string
  actionLabel: string
  targetView: "bol" | "shipments" | "accounting" | "document-compliance" | "booking-containers" | "whatsapp"
  targetParam?: string
  snoozedUntil?: number // timestamp ms
  acknowledged?: boolean
}

export interface OperationalKpiSummary {
  totalShipments: number
  activeMoving: number
  atBorder: number
  inRoadTransit: number
  atPort: number
  onVessel: number
  arrivedDestination: number
  deliveredTotal: number
  needsAttentionCount: number
  criticalAttentionCount: number
  warningAttentionCount: number
  infoAttentionCount: number
  vgmPendingCount: number
  cutOffsTodayCount: number
  cutOffsNext48hCount: number
  incompleteDocsCount: number
  detentionRiskCount: number
}

export interface CurrencyBalanceItem {
  currency: "USD" | "AED" | "AFN" | string
  receivables: number
  payables: number
  netBalance: number
}

export interface FinancialKpiSummary {
  isPermitted: boolean
  currencyBreakdown: CurrencyBalanceItem[]
  uninvoicedShipmentsCount: number
  overdueInvoicesCount: number
  totalInvoicedCount: number
  pendingReceiptsCount: number
}

export interface LiveShipmentRow {
  id: string
  referenceNumber: string
  bolNumber: string
  stage: PipelineStage
  status: string
  statusLabel: string
  origin: string
  destination: string
  currentLocation: string
  lastCheckpointTime?: string
  shipperName: string
  consigneeName: string
  containerNumber: string
  sealNumber: string
  truckPlate: string
  driverName: string
  driverPhone: string
  vesselName: string
  voyageNumber: string
  bookingNumber: string
  shippingLine: string
  packagesCount: number
  grossWeightKg: number
  commodity: string
  etaDischarge?: string
  portCutOff?: string
  vgmCutOff?: string
  docCutOff?: string
  daysInCurrentStage: number
  hasMissingDocs: boolean
  missingDocsList: string[]
  attentionItems: AttentionItem[]
  freightAmountUSD: number
  customerOutstandingUSD: number
}

export interface BorderStationSummary {
  stationName: string
  stationPersian: string
  activeCount: number
  truckPlates: string[]
  driverNames: string[]
  avgWaitDays: number
}

export interface PortOperationSummary {
  portName: string
  activeCount: number
  gateInCount: number
  loadingCount: number
  vesselDepartingCount: number
  upcomingCutoffsCount: number
}

export interface ContainerRiskSummary {
  containerNumber: string
  bookingNumber: string
  shippingLine: string
  shipmentId: string
  bolNumber: string
  dischargeDate?: string
  lastFreeDay?: string
  daysRemaining: number
  isOverdue: boolean
  estimatedDetentionUSD: number
  status: string
}

export interface DocumentComplianceRow {
  bolNumber: string
  shipmentId: string
  customerName: string
  hasBol: boolean
  hasCommercialInvoice: boolean
  hasPackingList: boolean
  hasTransitPaper: boolean
  hasPhytoDraft: boolean
  completenessPercent: number
  status: "complete" | "action_required" | "draft"
}

export interface OperationsTimelineEvent {
  id: string
  timestamp: string
  title: string
  description: string
  eventType: "milestone" | "border_arrival" | "port_gate" | "vessel_sail" | "document_issued" | "alert" | "payment"
  severity?: AttentionSeverity
  reference: string
  location?: string
  operator?: string
}

export interface ActiveRouteSummary {
  routeName: string
  activeCount: number
  containersCount: number
  currentStage: string
  borderCrossing?: string
}

export interface UpcomingCutOffItem {
  id: string
  bookingNumber: string
  containerNumber: string
  cutOffType: "Port" | "VGM" | "SI" | "Documentation" | "Gate-In"
  port: string
  deadline: string
  hoursRemaining: number
  severity: "critical" | "warning" | "normal" | "passed"
}

export interface UpcomingArrivalItem {
  bolNumber: string
  containerNumber: string
  vesselName: string
  destination: string
  eta: string
  customer: string
}

export interface UpcomingDepartureItem {
  bookingNumber: string
  vesselName: string
  voyage: string
  pol: string
  etd: string
  containersCount: number
  status: string
}

export interface VesselActivityItem {
  vesselName: string
  voyage: string
  route: string
  containersCount: number
  etd?: string
  eta?: string
  status: string
}

export interface OperationalReadiness {
  readyForBorder: number
  notReadyForBorder: number
  readyForVessel: number
  notReadyForVessel: number
}

export interface CustomerBalanceItem {
  customerName: string
  currency: string
  balance: number
  activeBolCount: number
}

export interface TodayPaymentsSummary {
  receivedByCurrency: Record<string, number>
  paidByCurrency: Record<string, number>
}

export interface ControlTowerModel {
  generatedAt: string
  kpis: OperationalKpiSummary
  financials: FinancialKpiSummary
  attentionItems: AttentionItem[]
  shipments: LiveShipmentRow[]
  stageCounts: Record<PipelineStage, number>
  borderStations: BorderStationSummary[]
  portOperations: PortOperationSummary[]
  containerRisks: ContainerRiskSummary[]
  documentCompliance: DocumentComplianceRow[]
  timelineEvents: OperationsTimelineEvent[]
  activeRoutes?: ActiveRouteSummary[]
  upcomingCutOffs?: UpcomingCutOffItem[]
  upcomingArrivals?: UpcomingArrivalItem[]
  upcomingDepartures?: UpcomingDepartureItem[]
  vesselActivity?: VesselActivityItem[]
  readiness?: OperationalReadiness
  topCustomerBalances?: CustomerBalanceItem[]
  todayPayments?: TodayPaymentsSummary
}

export interface OmniSearchResult {
  id: string
  type: "bol" | "container" | "booking" | "truck" | "customer" | "invoice" | "vessel"
  title: string
  subtitle: string
  badgeText: string
  badgeColor: string
  targetView: "bol" | "shipments" | "accounting" | "document-compliance" | "booking-containers"
  targetParam?: string
}
