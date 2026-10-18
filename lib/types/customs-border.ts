/**
 * Customs, Border & Transit Operations Center Types
 * Sky Ariana Limited — Cross-Border & Customs Operations
 */

export type BorderStatus =
  | 'PLANNED'
  | 'APPROACHING_BORDER'
  | 'ARRIVED_BORDER'
  | 'WAITING_ENTRY'
  | 'ENTERED_CUSTOMS'
  | 'DOCUMENT_REVIEW'
  | 'INSPECTION'
  | 'ON_HOLD'
  | 'CUSTOMS_PROCESSING'
  | 'CLEARED'
  | 'WAITING_EXIT'
  | 'BORDER_CROSSED'
  | 'TRANSIT_IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

export type BorderSide = 'SIDE_A' | 'SIDE_B' // Side A (e.g. Afghanistan) vs Side B (e.g. Iran / Uzbekistan)

export type CustomsDeclarationType =
  | 'EXPORT'
  | 'TRANSIT'
  | 'IMPORT'
  | 'TEMPORARY_ADMISSION'

export type DeclarationStatus =
  | 'DRAFT'
  | 'PREPARED'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REVIEW'
  | 'INSPECTION'
  | 'HOLD'
  | 'CLEARED'
  | 'REJECTED'
  | 'CANCELLED'

export type TransitPaperStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'PREPARED'
  | 'ISSUED'
  | 'ACTIVE'
  | 'USED'
  | 'CLOSED'
  | 'CORRECTION_REQUIRED'
  | 'EXPIRED'

export type TransitStage =
  | 'ENTERED_TRANSIT'
  | 'IN_TRANSIT'
  | 'REACHED_EXIT_BORDER'
  | 'TRANSIT_CLOSED'

export type InspectionType =
  | 'DOCUMENTARY_CHECK'
  | 'X_RAY_SCAN'
  | 'PHYSICAL_TAILGATE'
  | 'FULL_DESTUFFING_INSPECTION'
  | 'QUARANTINE_SAMPLING'

export type InspectionStatus =
  | 'REQUESTED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FOLLOW_UP_REQUIRED'

export type CustomsHoldType =
  | 'DOCUMENT_HOLD'
  | 'INSPECTION_HOLD'
  | 'PAYMENT_HOLD'
  | 'CUSTOMS_REVIEW'
  | 'SEAL_ISSUE'
  | 'DATA_MISMATCH'
  | 'OTHER'

export type CustomsHoldStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'RELEASED'
  | 'CANCELLED'

export type DocumentCheckStatus =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'UPLOADED'
  | 'VERIFIED'
  | 'EXPIRED'
  | 'NOT_REQUIRED'

export interface CustomsDocumentItem {
  id: string
  name: string
  category: 'AFGHAN_EXPORT' | 'TRANSIT' | 'VEHICLE' | 'COMMERCIAL'
  required: boolean
  status: DocumentCheckStatus
  documentNumber?: string
  issueDate?: string
  expiryDate?: string
  verified: boolean
  verifiedBy?: string
  verifiedAt?: string
  documentUrl?: string
  notes?: string
}

export interface CustomsInspectionRecord {
  id: string
  borderOperationId: string
  inspectionType: InspectionType
  status: InspectionStatus
  requestedDate: string
  inspectionDate?: string
  authority: string
  reason?: string
  result?: string // Objective factual outcome
  inspectorName?: string
  notes?: string
  photos?: string[]
  createdAt: string
  updatedAt: string
}

export interface CustomsHoldRecord {
  id: string
  borderOperationId: string
  bolNumber: string
  holdType: CustomsHoldType
  status: CustomsHoldStatus
  openedAt: string
  authority: string
  reason: string
  responsibleParty: string
  requiredAction: string
  releasedAt?: string
  releasedBy?: string
  resolutionNote?: string
  notes?: string
  createdAt: string
}

export interface CustomsDeclarationRecord {
  id: string
  declarationNumber: string // Official customs clearance ref, e.g. "DEC-AF-2026-90412"
  declarationType: CustomsDeclarationType
  country: string
  customsOffice: string
  declarationDate: string
  exporter: string
  importer: string
  commodity: string
  hsCode: string
  packages: number
  packageType: string
  grossWeightKg: number
  netWeightKg: number
  declaredValue: number
  currency: 'USD' | 'AFN' | 'IRR' | 'AED' | 'EUR' | 'TRY'
  status: DeclarationStatus
  documentId?: string
  documentUrl?: string
  linkedBolNumber: string
  linkedShipmentId?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface TransitPaperRecord {
  id: string
  transitNumber: string // e.g. "TRN-IR-2026-8812"
  status: TransitPaperStatus
  issueDate: string
  expiryDate?: string
  entryBorder: string
  exitBorder: string
  routeCorridor?: string // e.g. "Dogharoon -> Tehran Transit Corridor -> Bazargan"
  truckPlate: string
  containerNumber?: string
  sealNumber: string
  transitStage: TransitStage
  closedAt?: string
  closedBy?: string
  linkedBolNumber: string
  linkedShipmentId?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface BorderOperationTimelineEvent {
  id: string
  stage: BorderStatus
  timestamp: string
  locationName: string
  side?: BorderSide
  recordedBy: string
  notes?: string
}

export interface BorderTransloadRecord {
  id: string
  transloadLocation: string
  transloadDate: string
  oldTruckPlate: string
  oldDriverName: string
  newTruckPlate: string
  newDriverName: string
  sealNumberBefore: string
  sealNumberAfter: string
  tallyCartonsCount: number
  remarks?: string
  recordedBy: string
}

export interface BorderOperationRecord {
  id: string
  operationNumber: string // e.g. "BOR-2026-00125"
  shipmentId: string
  bolNumber: string
  roadTripId?: string
  truckPlate: string
  truckId?: string
  driverName: string
  driverPhone?: string
  containerNumber?: string
  routeLeg?: string
  borderLocationId: string // Linked to Route & Location Master
  borderLocationName: string // e.g. "Islam Qala / Dogharoon"
  countryFrom: string // e.g. "AF"
  countryTo: string // e.g. "IR"
  currentSide: BorderSide
  
  // Chronological Timestamps
  arrivalDate?: string // Physical Arrival at Border
  queueEntryDate?: string
  queuePosition?: number | null // null = "Queue Position Not Recorded"
  waitingReason?: string
  customsEntryDate?: string // Physical Entry into Customs Gate
  inspectionDate?: string
  clearanceDate?: string // Official Customs Clearance Date
  borderExitDate?: string // Official Border Crossing Date
  
  status: BorderStatus
  agentId?: string
  agentName?: string
  agentContact?: string
  agentPhone?: string
  agentWhatsApp?: string
  
  customsReference?: string
  declarationNumber?: string
  transitReference?: string
  
  // Checklist & Documents
  documents: CustomsDocumentItem[]
  
  // Inspections & Holds
  inspections: CustomsInspectionRecord[]
  holds: CustomsHoldRecord[]
  transloads: BorderTransloadRecord[]
  
  // Timeline audit trail
  timeline: BorderOperationTimelineEvent[]
  
  // Operational Notes
  internalNotes?: string
  customerSafeNotes?: string
  
  createdAt: string
  updatedAt: string
}

export interface DataMismatchItem {
  field: string
  sourceA: { name: string; value: string | number }
  sourceB: { name: string; value: string | number }
  hasMismatch: boolean
  differenceNotes?: string
}

export interface BorderSummaryKpi {
  activeBorderShipments: number
  waitingBorderEntry: number
  inCustoms: number
  underInspection: number
  documentsPending: number
  customsHold: number
  clearedToday: number
  borderExitToday: number
  transitInProgress: number
  truckChangePending: number
  needsAttention: number
}
