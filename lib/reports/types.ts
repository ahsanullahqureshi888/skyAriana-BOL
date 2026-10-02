/**
 * Sky Ariana Logistics — Report Center Type Definitions
 */

export interface SavedDocument {
  id: string
  bol_number: string
  issue_date: string
  shipper_name: string
  consignee_name: string
  notify_party_name?: string
  truck_number?: string
  driver_name?: string
  driver_father_name?: string
  driver_contact?: string
  driver_rent?: string
  number_of_packages?: string
  kgs_per_carton?: string
  gross_weight_per_carton?: string
  rate_per_kgs?: string
  goods_value?: string
  net_weight?: string
  gross_weight?: string
  goods_description?: string
  description_of_goods?: string
  cargo_description?: string
  invoice_no?: string
  invoice_number?: string
  remarks?: string
  port_of_loading?: string
  port_of_discharge?: string
  place_of_delivery?: string
  origin_country?: string
  destination_country?: string
  container_numbers?: string
  seal_numbers?: string
  measurement?: string
  cargo_route_note?: string
  routes?: Array<{
    id?: string
    location?: string
    locationPersian?: string
    stopOrder?: number
    transportMode?: string
    stopLabel?: string
  }>
  borderCrossing?: string
  route_name?: string
  driverFreight?: string
  created_at: string
  pdf_url?: string | null
  pdf_uploaded_at?: string | null
  commodity?: string
  shipper_address?: string
  consignee_address?: string
  notify_party_address?: string
  shipper_phone?: string
  consignee_phone?: string
  shipper_email?: string
  consignee_email?: string
  rate_per_kg?: string
  ocean_vessel?: string
  voyage_no?: string
  place_of_receipt?: string
  first_leg_bl?: string
  switch_bl?: string
  booking_no?: string
}

export interface BolRouteInfo {
  display: string
  shortDisplay: string
  origin: string
  destination: string
  via?: string
  borderCrossing?: string
  hasReefer?: boolean
  isFullReefer?: boolean
  hasSwitchBl?: boolean
  rawNote?: string
  isPersian: boolean
  stopsCount?: number
}

export type ReportTab =
  | "operations"
  | "overview"
  | "detailed"
  | "shippers"
  | "consignees"
  | "commodities"
  | "routes"
  | "destinations"
  | "containers"
  | "trucks"
  | "monthly"
  | "financial"
  | "missing_data"
  | "saved_reports"

export type ComparisonMode =
  | "off"
  | "previous_period"
  | "previous_month"
  | "previous_year"
  | "custom"

export interface CurrencyTotal {
  currency: string
  amount: number
}

export interface OverviewKpis {
  totalBols: number
  totalShipments: number
  totalPackages: number
  packageUnitsBreakdown?: Record<string, number>
  totalNetWeightKg: number
  totalGrossWeightKg: number
  currencyTotals: CurrencyTotal[]
  totalContainers: number
  totalShippers: number
  totalConsignees: number
  totalDestinations: number
  bolsWithPdf: number
  bolsWithoutPdf: number
  exportShipments: number
  importShipments: number
  reeferContainers: number
  dryContainers: number
  missingDataCount?: number
  dataQualityScore?: number
}

export interface MetricDelta {
  current: number
  previous: number
  changePercent: number
  isNew: boolean
  direction: "up" | "down" | "flat"
}

export interface PeriodComparisonResult {
  mode: ComparisonMode
  comparisonLabel: string
  bols: MetricDelta
  weightKg: MetricDelta
  goodsValueUsd: MetricDelta
  containers: MetricDelta
}

export interface ShipperSummary {
  shipperName: string
  bolCount: number
  packages: number
  netWeightKg: number
  grossWeightKg: number
  goodsValueByCurrency: Record<string, number>
  containerCount: number
  topDestination: string
  lastShipmentDate: string
  commodities?: string[]
  topCommodity?: string
  topConsignee?: string
}

export interface ConsigneeSummary {
  consigneeName: string
  bolCount: number
  shipperCount: number
  packages: number
  netWeightKg: number
  grossWeightKg: number
  goodsValueByCurrency: Record<string, number>
  containerCount: number
  topDestination: string
  lastShipmentDate: string
  topShipper?: string
  topCommodity?: string
  commodities?: string[]
}

export interface CommoditySummary {
  commodityName: string
  bolCount: number
  cargoRowCount?: number
  packages: number
  packageUnit?: string
  netWeightKg: number
  grossWeightKg?: number
  goodsValueByCurrency: Record<string, number>
  averageValueUsd: number
  averageRate?: string
  topShipper?: string
  topConsignee?: string
  topDestination?: string
  destinations: string[]
}

export interface RouteSummary {
  routePath: string
  origin: string
  destination: string
  via?: string
  borderCrossing?: string
  bolCount: number
  packages: number
  netWeightKg: number
  grossWeightKg: number
  goodsValueByCurrency: Record<string, number>
  reeferCount: number
  dryCount: number
}

export interface TruckSummary {
  truckNumber: string
  plateRegion?: string
  bolCount: number
  lastDriver: string
  lastDriverPhone: string
  lastShipmentDate: string
  totalDriverRent: Record<string, number>
  routesUsed: string[]
  topRoute?: string
  topShipper: string
}

export interface DestinationSummary {
  locationName: string
  country?: string
  type: "POL" | "POD" | "Final Destination"
  bolCount: number
  packages?: number
  netWeightKg: number
  grossWeightKg?: number
  goodsValueByCurrency: Record<string, number>
  topShippers: string[]
  topShipper?: string
  topCommodity?: string
  lastShipmentDate?: string
}

export interface ContainerRecord {
  containerNumber: string
  containerType: "20 FT" | "40 FT" | "40 HC" | "40 RF" | "Reefer" | "Dry" | "Other"
  bolNumber: string
  shipper: string
  consignee: string
  commodity: string
  weightKg: number
  origin: string
  destination: string
  date: string
}

export interface ContainerSummaryStats {
  total: number
  dry: number
  reefer: number
  twentyFt: number
  fortyFt: number
  fortyHc: number
  fortyRf: number
  other: number
}

export interface MonthlySummary {
  monthKey: string // "YYYY-MM"
  monthLabel: string // "Sep 2026"
  bolCount: number
  packages: number
  netWeightKg: number
  goodsValueByCurrency: Record<string, number>
  containerCount: number
  shipperCount: number
  consigneeCount: number
}

export interface FinancialBreakdown {
  currencyTotals: Record<string, number>
  averageValuePerBol: Record<string, number>
  highestValue: { amount: number; currency: string; bolNumber: string; shipper: string } | null
  lowestValue: { amount: number; currency: string; bolNumber: string; shipper: string } | null
  byShipper: { name: string; currencyTotals: Record<string, number>; bolCount: number }[]
  byCommodity: { name: string; currencyTotals: Record<string, number>; bolCount: number }[]
  byDestination: { name: string; currencyTotals: Record<string, number>; bolCount: number }[]
  byMonth: { monthLabel: string; currencyTotals: Record<string, number> }[]
}

export type SeverityLevel = "critical" | "warning" | "optional"

export interface MissingDataIssue {
  field: string
  label: string
  severity: SeverityLevel
  missingCount: number
  affectedDocIds: string[]
}

export interface DataQualityAudit {
  totalRecords: number
  completeRecords: number
  attentionRecords: number
  qualityScorePercent: number
  issues: MissingDataIssue[]
}

export interface PossibleDuplicate {
  reason: "Same BOL Number" | "Same Invoice Number" | "Same Container Number" | "Same Shipper + Consignee + Date" | "Same Truck Number"
  identifier: string
  docs: SavedDocument[]
}

export interface ReportFilterCriteria {
  searchQuery?: string
  dateFrom?: string
  dateTo?: string
  shipper?: string
  consignee?: string
  notify?: string
  commodity?: string
  pol?: string
  pod?: string
  destination?: string
  containerType?: string
  containerNumber?: string
  truckNumber?: string
  invoiceNumber?: string
  bolNumber?: string
  currency?: string
  shipmentType?: "all" | "export" | "import"
  hasPdf?: "all" | "yes" | "no"
  route?: string
  missingData?: "all" | "container" | "invoice" | "truck" | "driver" | "route" | "rate" | "pdf"
}

export interface SavedFilterPreset {
  id: string
  name: string
  criteria: ReportFilterCriteria
  createdAt: string
}

export interface SavedReportPreset {
  id: string
  name: string
  reportType: ReportTab
  filters: ReportFilterCriteria
  groupBy: string
  orientation: "portrait" | "landscape" | "auto"
  includeCharts: boolean
  includeCover: boolean
  createdAt: string
  isDefault?: boolean
  visibleColumns?: string[]
  densityMode?: "compact" | "normal"
  sortColumn?: string
  sortDirection?: "asc" | "desc"
}

export interface ReportHistoryEntry {
  id: string
  reportName: string
  reportType: string
  createdDate: string
  createdBy: string
  filterRange: string
  recordCount: number
  fileName: string
}

// ==================================================
// OPERATIONS REPORTS TYPES & MODELS
// ==================================================

export type OperationsPeriodType =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "custom"

export interface OperationsPeriod {
  type: OperationsPeriodType
  label: string
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  businessTimezone: string
}

export interface OperationsReportMetadata {
  reportId: string
  reportTitle: string
  generatedAt: string
  generatedBy: string
  businessTimezone: string
  operationsNotes?: string
  // Aliases for presentation & exports
  title: string
  dateRangeLabel: string
  periodType: OperationsPeriodType
  notes?: string
  period: OperationsPeriod
  appliedFilters: {
    origin?: string
    destination?: string
    status?: string
    carrier?: string
  }
}

export interface OperationsReportSummary {
  totalBols: number
  totalShipments: number
  activeShipments: number
  deliveredShipments: number
  totalContainers: number
  dryContainers: number
  reeferContainers: number
  totalTrucks: number
  totalPackages: number
  totalNetWeightKg: number
  totalGrossWeightKg: number
  needsAttentionCount: number
  statusCategories: StatusCategorySummary[]
  goodsValueByCurrency: Array<{ currency: string; amount: number }>
  totalRevenueByCurrency: Record<string, number>
  totalDriverRentByCurrency: Record<string, number>
  newBolsCount: number
  updatedBolsCount: number
  bolsWithPdf: number
  bolsWithoutPdf: number
  exportShipments: number
  importShipments: number
}

export interface ShipmentActivityItem {
  id: string
  bolNumber: string
  trackingNumber: string
  issueDate: string
  createdDate: string
  updatedDate?: string
  shipper: string
  shipperName: string
  consignee: string
  consigneeName: string
  commodity: string
  packages: number
  packageUnit: string
  netWeightKg: number
  grossWeightKg: number
  goodsValue?: { amount: number; currency: string }
  containerType: string
  containerNumber: string
  truckNumber: string
  driverName: string
  driverFatherName?: string
  driverPhone?: string
  driverRent: number
  rentCurrency: string
  origin: string
  currentLocation: string
  destination: string
  borderCrossing: string
  port: string
  status: string
  statusCategory: string
  operationalStatus: string
  vesselName?: string
  voyageNumber?: string
  etd?: string
  eta?: string
  route: string
  hasPdf: boolean
  documentsStatus: {
    bol: "Complete" | "Missing"
    invoice: "Complete" | "Missing"
    packingList: "Complete" | "Missing"
    transitPaper: "Complete" | "Missing" | "Not Required"
    phytosanitary: "Complete" | "Missing" | "Not Required"
  }
  needsAttention: boolean
  attentionReasons: string[]
}

export interface StatusCategorySummary {
  key?: string
  statusCategory: string
  count: number
  percentage: number
  shipmentIds?: string[]
}

export interface RouteActivityItem {
  route: string
  origin: string
  border: string
  port: string
  destination: string
  shipmentCount: number
  containerCount: number
  grossWeightKg: number
  shipmentsCount?: number
  containersCount?: number
  totalWeightKg?: number
  latestStatus?: string
}

export interface ContainerActivityItem {
  containerNumber: string
  containerType: string
  type: string
  category: "Dry" | "Reefer" | "Special" | "Not Assigned"
  bolNumber: string
  shipper: string
  consignee: string
  commodity: string
  origin: string
  currentLocation: string
  destination: string
  port: string
  status: string
}

export interface TruckActivityItem {
  truckNumber: string
  driverName: string
  driverFatherName: string
  driverPhone: string
  origin: string
  borderCrossing: string
  destination: string
  bolNumber: string
  rentAmount: number
  rentCurrency: string
  shipper?: string
  commodity?: string
  currentLocation?: string
  status: string
  lastUpdate?: string
}

export interface BorderActivityItem {
  borderStation: string
  border: string
  shipmentCount: number
  grossWeightKg: number
  waiting: number
  processing: number
  crossed: number
  total: number
}

export interface PortActivityItem {
  portName: string
  port: string
  shipmentCount: number
  containerCount: number
  grossWeightKg: number
  shipmentsCount?: number
  containersCount?: number
  arrived: number
  departed: number
  pending: number
}

export interface VesselActivityItem {
  vessel: string
  voyage: string
  bolNumber: string
  container: string
  originPort: string
  destinationPort: string
  etd?: string
  eta?: string
  status: string
}

export interface EtaEtdItem {
  type: "departure" | "arrival"
  vessel: string
  voyage: string
  port: string
  date: string
  bolNumber: string
  container: string
}

export interface NeedsAttentionItem {
  category: string
  severity: "critical" | "high" | "warning" | "optional"
  issue: string
  description: string
  bolNumber: string
  shipper?: string
  suggestedAction: string
}

export interface DocumentStatusItem {
  bolNumber: string
  shipperName: string
  consigneeName: string
  hasBol: boolean
  hasCommercialInvoice: boolean
  hasPackingList: boolean
  hasTransitPaper: boolean
  hasPhyto: boolean
  missingCount: number
  isComplete: boolean
}

export interface DailyBreakdownItem {
  date: string
  displayDate?: string
  shipments: number
  containers: number
  grossWeightKg: number
  bolsCount?: number
  packagesCount?: number
  weightKg?: number
  goodsValueUsd?: number
  containersCount?: number
}

export interface OperationsReportModel {
  metadata: OperationsReportMetadata
  period: OperationsPeriod
  summary: OperationsReportSummary
  shipments: ShipmentActivityItem[]
  statusCategories: StatusCategorySummary[]
  routes: RouteActivityItem[]
  routeActivity: RouteActivityItem[]
  containers: ContainerActivityItem[]
  containerActivity: ContainerActivityItem[]
  trucks: TruckActivityItem[]
  truckActivity: TruckActivityItem[]
  borders: BorderActivityItem[]
  borderActivity: BorderActivityItem[]
  ports: PortActivityItem[]
  portActivity: PortActivityItem[]
  documentStatusSummary: DocumentStatusItem[]
  vessels: VesselActivityItem[]
  departures: EtaEtdItem[]
  arrivals: EtaEtdItem[]
  needsAttention: NeedsAttentionItem[]
  topShippers: Array<{ name: string; count: number; shipmentCount: number; containerCount: number; weightKg: number; grossWeightKg: number }>
  topConsignees: Array<{ name: string; count: number; shipmentCount: number; containerCount: number; weightKg: number; grossWeightKg: number }>
  topCommodities: Array<{ name: string; count: number; shipmentCount: number; containerCount: number; weightKg: number; grossWeightKg: number }>
  topDestinations: Array<{ name: string; count: number; weightKg: number }>
  topRoutes: Array<{ name: string; count: number }>
  completedShipments: ShipmentActivityItem[]
  openShipments: ShipmentActivityItem[]
  dailyBreakdown: DailyBreakdownItem[]
}

export interface OperationsSnapshotMetadata {
  id: string
  title: string
  periodType: OperationsPeriodType
  periodLabel: string
  savedAt: string
  generatedAt?: string
  generatedBy?: string
  shipmentCount: number
  recordCount?: number
  totalGrossWeightKg: number
  totalWeightKg?: number
  totalPackages?: number
  dateRangeLabel?: string
  snapshotData?: OperationsReportModel
}
