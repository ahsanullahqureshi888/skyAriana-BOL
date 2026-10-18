/**
 * Phase 23: Air Freight & AWB Operations Center Types
 * Single source of truth for Air Cargo Movement across Sky Ariana Limited.
 * Reuses Company Master (role === 'AIRLINE'), Route & Location Master (AIRPORT, TERMINAL),
 * Document Center (MAWB, HAWB), Warehouse Receipts, and Accounting Ledgers without duplication.
 */

export type AirlineStatus = 'ACTIVE' | 'SUSPENDED' | 'SEASONAL' | 'INACTIVE'

export interface AirlineRecord {
  id: string
  legalName: string
  displayName: string
  iataCode: string // e.g. "EK", "QR", "TK", "FG", "RQ"
  icaoCode?: string // e.g. "UAE", "QTR", "THY", "KMF", "AFG"
  awbPrefix: string // 3-digit prefix, e.g. "176", "157", "235", "384", "255"
  country: string
  bookingContact?: string
  cargoContact?: string
  documentationContact?: string
  accountsContact?: string
  website?: string
  notes?: string
  status: AirlineStatus
  createdAt: string
  updatedAt: string
}

export interface CargoTerminalRecord {
  id: string
  airportId: string
  airportIata: string // e.g. "KBL", "DXB"
  terminalName: string // e.g. "Dnata Cargo Terminal 1", "Kabul International Cargo Complex"
  terminalCode?: string
  handlingAgentName: string // e.g. "Dnata", "Ariana Ground Handling"
  customsOnsite: boolean
  coldStorageAvailable: boolean
  dangerousGoodsCertified: boolean
  operatingHours?: string
}

export type AirBookingStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'CARGO_NOT_RECEIVED'
  | 'CARGO_RECEIVED'
  | 'ACCEPTED_BY_AIRLINE'
  | 'AWB_PENDING'
  | 'AWB_ISSUED'
  | 'FLIGHT_CONFIRMED'
  | 'READY_FOR_DEPARTURE'
  | 'DEPARTED'
  | 'IN_TRANSIT'
  | 'TRANSIT_AIRPORT'
  | 'REBOOKED'
  | 'OFFLOADED'
  | 'ARRIVED'
  | 'CARGO_AVAILABLE'
  | 'RELEASED'
  | 'COMPLETED'
  | 'CANCELLED'

export interface DimensionItem {
  id: string
  lengthCm: number
  widthCm: number
  heightCm: number
  quantity: number
  unit: 'CM' | 'IN'
}

export interface AirBookingRecord {
  id: string
  bookingReference: string // Carrier-provided reference
  bolId?: string
  bolNumber?: string
  airlineId: string
  airlineName: string
  airlineAwbPrefix: string
  customerName: string
  shipper: string
  consignee: string
  commodity: string
  packagesCount: number
  packagingType: 'BOXES' | 'CARTONS' | 'CRATES' | 'PALLETS' | 'BAGS' | 'DRUMS' | 'OTHER'
  grossWeightKg: number
  dimensions: DimensionItem[]
  volumetricDivisor: number // Configurable: 6000 (IATA standard) or 5000 (Express)
  volumetricWeightKg: number
  chargeableWeightKg: number
  isWeightManualOverride: boolean
  weightOverrideReason?: string
  originAirportIata: string
  originAirportName: string
  destinationAirportIata: string
  destinationAirportName: string
  transitAirportsIata: string[]
  flightNumber: string
  flightDate: string // YYYY-MM-DD
  plannedEtd: string // ISO timestamp
  plannedEta: string // ISO timestamp
  serviceType: 'DIRECT' | 'CONNECTING' | 'EXPRESS' | 'GENERAL' | 'PERISHABLE'
  status: AirBookingStatus
  mawbNumber?: string
  hawbNumbers: string[]
  warehouseReceiptRef?: string // Link to Warehouse Cargo Receipt
  notes?: string
  createdAt: string
  updatedAt: string
}

export type FlightStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CHECK_IN'
  | 'CARGO_LOADING'
  | 'DEPARTED'
  | 'IN_FLIGHT'
  | 'ARRIVED'
  | 'CANCELLED'
  | 'DELAYED_SCHEDULE'
  | 'DIVERTED'
  | 'COMPLETED'

export type ScheduleSource =
  | 'MANUAL'
  | 'AIRLINE'
  | 'AGENT'
  | 'IMPORTED'
  | 'API'

export interface FlightScheduleHistoryItem {
  id: string
  changeTimestamp: string
  previousEtd?: string
  newEtd: string
  previousEta?: string
  newEta: string
  reason?: string
  source: ScheduleSource
  changedBy: string
}

export interface FlightRecord {
  id: string
  airlineId: string
  airlineName: string
  flightNumber: string // Preserves IATA prefix e.g. "EK123"
  originAirportIata: string
  originAirportName: string
  destinationAirportIata: string
  destinationAirportName: string
  flightDate: string // YYYY-MM-DD
  scheduledDeparture: string // ISO timestamp (ETD)
  scheduledArrival: string // ISO timestamp (ETA)
  actualDeparture?: string // Never overwrites scheduled ETD
  actualArrival?: string // Never overwrites scheduled ETA
  aircraftType?: string // e.g. "B777-200F", "A330-300"
  status: FlightStatus
  source: ScheduleSource
  scheduleHistory: FlightScheduleHistoryItem[]
  notes?: string
  lastUpdated: string
}

export type AirLegStatus =
  | 'PLANNED'
  | 'CONFIRMED'
  | 'DEPARTED'
  | 'IN_TRANSIT'
  | 'ARRIVED_TRANSIT'
  | 'OFFLOADED'
  | 'REBOOKED'
  | 'ARRIVED_DESTINATION'
  | 'COMPLETED'
  | 'CANCELLED'

export interface AirLegRecord {
  id: string
  legNumber: number // 1, 2, 3...
  legLabel: string // "Leg 1 (Origin Flight)", "Leg 2 (Connecting Flight)"
  bookingId: string
  bookingReference: string
  mawbNumber?: string
  airlineId: string
  airlineName: string
  flightNumber: string
  originAirportIata: string
  originAirportName: string
  destinationAirportIata: string
  destinationAirportName: string
  scheduledDeparture: string
  scheduledArrival: string
  actualDeparture?: string
  actualArrival?: string
  status: AirLegStatus
  notes?: string
}

export interface TransitConnection {
  id: string
  transitAirportIata: string
  transitAirportName: string
  bookingReference: string
  mawbNumber: string
  incomingLegId: string
  incomingFlightNumber: string
  incomingArrival?: string
  outgoingLegId?: string
  outgoingFlightNumber?: string
  outgoingDeparture?: string
  dwellHours?: number
  connectionStatus:
    | 'WAITING_TRANSIT_ARRIVAL'
    | 'CARGO_OFFLOADED'
    | 'WAITING_CONNECTING_FLIGHT'
    | 'CONNECTION_RISK'
    | 'LOADED_CONNECTING_FLIGHT'
    | 'DEPARTED_TRANSIT'
  connectionRiskAlert?: string // e.g. "Tight transit window: connecting flight departs in less than 3 hours"
}

export type ULDBuildUpStatus =
  | 'AWAITING_BUILDUP'
  | 'BUILT_UP'
  | 'READY_FOR_AIRCRAFT'
  | 'LOADED'

export interface ULDRecord {
  id: string
  uldNumber: string // e.g. "PMC12345EK", "PAG44012QR"
  uldType: 'PMC' | 'PAG' | 'AKE' | 'ALF' | 'OTHER'
  palletPosition?: string
  bookingReference: string
  packagesCount: number
  grossWeightKg: number
  tareWeightKg?: number
  buildUpStatus: ULDBuildUpStatus
  loadedFlightNumber?: string
  notes?: string
}

export type OffloadReason =
  | 'AIRCRAFT_PAYLOAD_LIMIT'
  | 'WEATHER_RESTRICTION'
  | 'TECHNICAL_AIRCRAFT_CHANGE'
  | 'COMMERCIAL_PRIORITY'
  | 'DOCUMENTATION_DISCREPANCY'
  | 'CUSTOMS_HOLD'
  | 'SECURITY_CHECK_DELAY'
  | 'OTHER'

export interface OffloadRecord {
  id: string
  bookingId: string
  bookingReference: string
  mawbNumber: string
  originalFlightNumber: string
  offloadAirportIata: string
  offloadAirportName: string
  reason: OffloadReason
  detailedReason: string
  offloadDate: string
  rebookedFlightNumber?: string
  rebookedDate?: string
  status: 'OFFLOADED' | 'REBOOKING_PENDING' | 'REBOOKED'
  recordedBy: string
}

export type AWBStatus =
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'CORRECTION_REQUIRED'
  | 'APPROVED'
  | 'ISSUED'
  | 'CANCELLED'

export interface AWBDraftVersion {
  versionNumber: number
  receivedDate: string
  notes?: string
  correctionsRequested?: string
  approvedDate?: string
  approvedBy?: string
  documentUrl?: string
}

export interface MAWBRecord {
  id: string
  mawbNumber: string // Standard format: 3-digit prefix + 8 digits (e.g. "176-12345675")
  airlineId: string
  airlineName: string
  awbPrefix: string
  bookingId: string
  bookingReference: string
  bolNumber?: string
  shipper: string
  consignee: string
  originAirportIata: string
  destinationAirportIata: string
  packagesCount: number
  grossWeightKg: number
  chargeableWeightKg: number
  status: AWBStatus
  draftVersions: AWBDraftVersion[]
  currentDraftVersion: number
  isDraftApproved: boolean
  issueDate?: string
  flightNumber?: string
  documentUrl?: string
  notes?: string
}

export interface HAWBRecord {
  id: string
  hawbNumber: string // e.g. "SA-HAWB-2026-0041"
  mawbNumber: string // Link to parent MAWB
  bookingId: string
  shipper: string
  consignee: string
  commodity: string
  packagesCount: number
  grossWeightKg: number
  chargeableWeightKg: number
  issueDate?: string
  status: AWBStatus
  notes?: string
}

export type TerminalAcceptanceStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CORRECTION_REQUIRED'

export type SecurityScreeningStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'COMPLETED'
  | 'ISSUE'

export interface CargoAcceptanceRecord {
  id: string
  bookingId: string
  bookingReference: string
  mawbNumber?: string
  airportIata: string
  terminalName: string
  deliveryDate: string // When cargo arrived at airport
  deliveringTruckPlate?: string
  deliveringDriverName?: string
  packagesReceived: number
  grossWeightReceivedKg: number
  terminalReceiptNumber?: string
  securityStatus: SecurityScreeningStatus
  screeningNotes?: string
  airlineAcceptanceStatus: TerminalAcceptanceStatus
  airlineAcceptanceRef?: string
  airlineAcceptanceDate?: string
  rejectionReason?: string
  notes?: string
  recordedBy: string
}

export interface AirReleaseTracker {
  id: string
  bookingId: string
  mawbNumber: string
  airlineRelease: boolean
  airlineReleaseDate?: string
  airlineReleaseRef?: string
  customsRelease: boolean
  customsReleaseDate?: string
  terminalRelease: boolean
  terminalReleaseDate?: string
  deliveryOrderIssued: boolean
  deliveryOrderDate?: string
  cargoAvailableForPickup: boolean
  cargoAvailableDate?: string
  releaseBlocked: boolean
  releaseBlockReason?: string
}

export type AirFreightPaymentStatus =
  | 'NOT_INVOICED'
  | 'INVOICE_RECEIVED'
  | 'PAYMENT_PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'

export interface AirlineFinanceLink {
  id: string
  bookingId: string
  airlineId: string
  airlineName: string
  invoiceNumber?: string
  amount: number
  currency: string
  dueDate?: string
  paidAmount: number
  paymentStatus: AirFreightPaymentStatus
  requiresPaymentForRelease: boolean
  notes?: string
}

export interface AirShipmentBoardItem {
  id: string
  bookingReference: string
  bolNumber?: string
  mawbNumber: string
  customerName: string
  airlineName: string
  currentFlightNumber: string
  currentLegNumber: number
  totalLegs: number
  originAirportIata: string
  destinationAirportIata: string
  flightDate: string
  etd: string
  eta: string
  actualDeparture?: string
  actualArrival?: string
  packagesCount: number
  grossWeightKg: number
  chargeableWeightKg: number
  shipmentStatus: AirBookingStatus
  awbStatus: AWBStatus
  acceptanceStatus: TerminalAcceptanceStatus
  paymentStatus: AirFreightPaymentStatus
  attentionReason?: string
  isOffloaded: boolean
  isTransit: boolean
}

export interface AirSummaryKpi {
  activeAirShipments: number
  bookingPending: number
  awaitingAcceptance: number
  cargoAccepted: number
  awbPending: number
  flightConfirmed: number
  departingToday: number
  inTransit: number
  atTransitAirport: number
  offloaded: number
  arrivingSoon: number
  arrived: number
  releasePending: number
}

/**
 * Air Carrier Provider Interface for Future Airline API Integration
 */
export interface AirCarrierProvider {
  airlineIata: string
  airlineName: string
  getBooking(bookingRef: string): Promise<{ success: boolean; data?: any; error?: string }>
  getAWBStatus(mawbNumber: string): Promise<{ success: boolean; status?: string; error?: string }>
  getFlightSchedule(flightNumber: string, date: string): Promise<{ success: boolean; data?: any; error?: string }>
  getCargoStatus(mawbNumber: string): Promise<{ success: boolean; milestones?: any[]; error?: string }>
}
