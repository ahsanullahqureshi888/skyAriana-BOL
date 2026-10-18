/**
 * Phase 22: Shipping Line, Vessel & Ocean Operations Center Types
 * Single source of truth for Sea Freight Movement across Sky Ariana Limited.
 * Enforces strict canonical reuse of Companies, Contacts, Bookings, Containers,
 * Document Center BL records, and Finance/Accounting Ledgers without duplication.
 */

export type VesselStatus = 'ACTIVE' | 'IN_DRYDOCK' | 'LAID_UP' | 'UNDER_REPAIR' | 'DECOMMISSIONED'

export type VesselType =
  | 'CONTAINER_FEEDER'
  | 'CONTAINER_MOTHER'
  | 'GENERAL_CARGO'
  | 'BULK_CARRIER'
  | 'RORO'
  | 'BARGE'
  | 'OTHER'

export interface VesselRecord {
  id: string
  name: string
  imoNumber?: string // Stable international maritime identifier
  carrierId: string // Reference to Company Master (role === 'SHIPPING_LINE')
  carrierName: string
  vesselType: VesselType
  flag?: string
  builtYear?: number
  teuCapacity?: number
  status: VesselStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

export type VoyageStatus =
  | 'PLANNED'
  | 'CONFIRMED'
  | 'OPEN_FOR_BOOKING'
  | 'DELAYED_SCHEDULE'
  | 'AT_ORIGIN_PORT'
  | 'LOADING'
  | 'SAILED'
  | 'IN_TRANSIT'
  | 'AT_TRANSSHIPMENT'
  | 'DISCHARGING'
  | 'ARRIVED'
  | 'COMPLETED'
  | 'CANCELLED'

export type ScheduleSource =
  | 'MANUAL'
  | 'SHIPPING_LINE'
  | 'IMPORTED'
  | 'API'
  | 'AGENT_UPDATE'

export interface ScheduleHistoryItem {
  id: string
  voyageId: string
  changeTimestamp: string
  previousEtd?: string
  newEtd: string
  previousEta?: string
  newEta: string
  reason?: string
  source: ScheduleSource
  changedBy: string
}

export type PortCallStatus =
  | 'PLANNED'
  | 'ARRIVING'
  | 'BERTHED'
  | 'OPERATING'
  | 'DEPARTED'
  | 'SKIPPED'
  | 'CANCELLED'

export type BerthStatus = 'WAITING_BERTH' | 'BERTHING_SCHEDULED' | 'BERTHED'

export interface PortCallRecord {
  id: string
  sequence: number
  portId: string // Reference to Route & Location Master (LocationType === 'SEAPORT' | 'TRANSSHIPMENT_PORT')
  portName: string
  terminalName?: string
  countryCode: string // e.g. "IR", "AE", "IN", "PK"
  plannedArrival: string // ISO date
  plannedDeparture: string // ISO date
  actualArrival?: string // Stored separately from planned
  actualDeparture?: string // Stored separately from planned
  status: PortCallStatus
  berthStatus?: BerthStatus
  notes?: string
}

export interface VoyageRecord {
  id: string
  vesselId: string
  vesselNameSnapshot: string // Preserves historical name even if master changes
  imoNumber?: string
  voyageNumber: string
  carrierId: string
  carrierName: string
  serviceName?: string // e.g. "Gulf-India Express (GIX)"
  originPortId: string
  originPortName: string
  destinationPortId: string
  destinationPortName: string
  portCalls: PortCallRecord[]
  plannedEtd: string // ISO date
  plannedEta: string // ISO date
  actualDeparture?: string // Never overwrites planned ETD
  actualArrival?: string // Never overwrites planned ETA
  status: VoyageStatus
  source: ScheduleSource
  lastUpdated: string
  scheduleHistory: ScheduleHistoryItem[]
  notes?: string
}

export type OceanLegStatus =
  | 'PENDING'
  | 'WAITING_VESSEL'
  | 'LOADED'
  | 'SAILED'
  | 'IN_TRANSIT'
  | 'AT_TRANSSHIPMENT'
  | 'DISCHARGED'
  | 'COMPLETED'
  | 'ROLLED_OVER'
  | 'CANCELLED'

export interface OceanLegRecord {
  id: string
  legNumber: number // Unlimited legs: 1, 2, 3...
  legLabel: string // "First Leg", "Second Leg", "Feeder Leg", "Mother Vessel Leg"
  bookingId: string
  bookingNumber: string
  bolId?: string
  bolNumber?: string
  carrierId: string
  carrierName: string
  vesselId: string
  vesselName: string
  voyageId: string
  voyageNumber: string
  polId: string
  polName: string
  podId: string
  podName: string
  etd: string
  eta: string
  actualDeparture?: string
  actualArrival?: string
  status: OceanLegStatus
  containerNumbers: string[]
  blReference?: string
  notes?: string
}

export interface TransshipmentConnection {
  id: string
  transshipmentPortId: string
  transshipmentPortName: string
  incomingLegId: string
  incomingVesselName: string
  incomingVoyageNumber: string
  dischargeDate?: string
  outgoingLegId?: string
  outgoingVesselName?: string
  outgoingVoyageNumber?: string
  nextEtd?: string
  dwellHours?: number // Computed between discharge and outgoing ETD / actual departure
  connectionStatus:
    | 'WAITING_DISCHARGE'
    | 'DISCHARGED_WAITING_VESSEL'
    | 'NEXT_VESSEL_ASSIGNED'
    | 'CONNECTION_RISK'
    | 'LOADED_ON_NEXT_VESSEL'
    | 'DEPARTED'
  connectionRiskAlert?: string // e.g. "Next ETD is less than 24h from incoming arrival"
}

export interface RolloverRecord {
  id: string
  containerNumber: string
  bookingId: string
  bookingNumber: string
  bolNumber?: string
  originalVesselId: string
  originalVesselName: string
  originalVoyageNumber: string
  originalEtd: string
  newVesselId: string
  newVesselName: string
  newVoyageNumber: string
  newEtd: string
  reason: string
  rolloverDate: string
  recordedBy: string
}

export type ContainerOceanStage =
  | 'GATE_IN'
  | 'WAITING_LOADING'
  | 'LOADED_ON_VESSEL'
  | 'DEPARTED'
  | 'TRANSSHIPMENT_DISCHARGE'
  | 'TRANSSHIPMENT_LOAD'
  | 'DESTINATION_ARRIVAL'
  | 'DISCHARGED'
  | 'AVAILABLE'
  | 'RELEASED'

export interface ContainerOceanStatus {
  containerNumber: string
  bookingId: string
  bookingNumber: string
  bolNumber?: string
  currentLegNumber: number
  currentVesselName: string
  currentVoyageNumber: string
  pol: string
  pod: string
  stage: ContainerOceanStage
  isLoadConfirmed: boolean // Explicit flag: vessel departure does not automatically confirm load
  isRolledOver: boolean
  lastEventDate: string
  sealNumbers: string[]
  vgmWeightKg?: number
  vgmVerified: boolean
  gateInDate?: string
  loadDate?: string
  dischargeDate?: string
  availableDate?: string
  releasedDate?: string
  notes?: string
}

export type SIStatus =
  | 'NOT_STARTED'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'CORRECTION_REQUIRED'
  | 'ACCEPTED'
  | 'FINALIZED'

export type BLDocType =
  | 'ORIGINAL_BL'
  | 'SEA_WAYBILL'
  | 'SURRENDER_BL'
  | 'TELEX_RELEASE'
  | 'SWITCH_BL'
  | 'HOUSE_BL'
  | 'MASTER_BL'

export type BLReleaseStatus =
  | 'DRAFT_PENDING'
  | 'DRAFT_APPROVED'
  | 'ISSUED'
  | 'SURRENDER_REQUESTED'
  | 'SURRENDER_CONFIRMED'
  | 'TELEX_RELEASE_REQUESTED'
  | 'TELEX_RELEASE_CONFIRMED'
  | 'SWB_ISSUED'
  | 'DELIVERY_ORDER_ISSUED'

export interface BLDraftVersion {
  versionNumber: number // 1, 2, 3...
  receivedDate: string
  notes?: string
  documentUrl?: string
  correctionsRequested?: string
  approvedDate?: string
  approvedBy?: string
}

export interface BLWorkflowRecord {
  id: string
  bookingId: string
  bookingNumber: string
  bolNumber: string
  carrierId: string
  carrierName: string
  blNumber?: string
  blType: BLDocType
  siStatus: SIStatus
  siSubmittedAt?: string
  siSubmittedBy?: string
  siCutOff?: string
  draftVersions: BLDraftVersion[]
  currentDraftVersion: number
  isDraftApproved: boolean
  finalBlIssuedDate?: string
  firstLegBlDocId?: string
  secondLegBlDocId?: string
  // Switch BL fields (never overwrites original BL)
  isSwitchBl: boolean
  originalBlNumber?: string
  switchBlNumber?: string
  switchLocation?: string
  switchIssueDate?: string
  switchReason?: string
  releaseStatus: BLReleaseStatus
  deliveryOrderIssued: boolean
  deliveryOrderDate?: string
  releaseBlocked: boolean
  releaseBlockReason?: string
}

export type FreightPaymentStatus =
  | 'NOT_INVOICED'
  | 'INVOICE_RECEIVED'
  | 'PAYMENT_PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'

export interface CarrierFinanceLink {
  id: string
  bookingId: string
  carrierId: string
  carrierName: string
  invoiceNumber?: string
  amount: number
  currency: string // USD, EUR, AED, etc.
  dueDate?: string
  paidAmount: number
  paymentStatus: FreightPaymentStatus
  accountingTxRef?: string // Reference to Canonical Transaction in Accounting
  requiresPaymentForBlRelease: boolean
  notes?: string
}

export interface OceanShipmentBoardItem {
  id: string
  bolNumber: string
  bookingNumber: string
  customerName: string
  carrierName: string
  containerNumbers: string[]
  currentLegNumber: number
  totalLegs: number
  currentVesselName: string
  currentVoyageNumber: string
  pol: string
  pod: string
  etd: string
  eta: string
  actualDeparture?: string
  actualArrival?: string
  oceanStatus: OceanLegStatus
  blStatus: BLReleaseStatus
  freightPaymentStatus: FreightPaymentStatus
  attentionReason?: string
  isRolledOver: boolean
  isTransshipment: boolean
  dwellHours?: number
}

export interface OceanSummaryKpi {
  activeOceanShipments: number
  bookingPending: number
  awaitingVessel: number
  gateInComplete: number
  waitingLoading: number
  onVessel: number
  atTransshipment: number
  rolledOver: number
  arrivingSoon: number
  discharged: number
  blPending: number
  freightPaymentPending: number
  releasePending: number
}

/**
 * Carrier Provider Interface for Future Shipping Line API Integrations
 */
export interface OceanCarrierProvider {
  carrierCode: string // e.g. "MAEU", "MSCU", "CMAU"
  carrierName: string
  getBooking(bookingNumber: string): Promise<{ success: boolean; data?: any; error?: string }>
  getVoyage(vesselName: string, voyageNumber: string): Promise<{ success: boolean; data?: any; error?: string }>
  getContainerEvents(containerNumber: string): Promise<{ success: boolean; events?: any[]; error?: string }>
  getBLStatus(blNumber: string): Promise<{ success: boolean; status?: string; error?: string }>
}
