/**
 * Phase 24: Claims, Damage, Detention & Incident Management Center Types
 * Single source of truth for operational incidents and commercial claims across Sky Ariana Limited.
 * 
 * Strict Guarantees:
 * - Clear separation between Incident (operational mishap) and Claim (commercial/financial demand).
 * - NO automatic legal liability assignment (Responsibility defaults to NOT_ASSESSED or UNDER_REVIEW).
 * - NO damage incident automatically reducing warehouse inventory.
 * - NO estimated detention treated as actual carrier charge.
 * - Multi-currency segregation: values preserved in original currency without mixing.
 * - Customer data isolation: internal fault analysis, supplier costs, and negotiation limits scrubbed.
 */

export type IncidentType =
  | 'CARGO_DAMAGE'
  | 'CARGO_SHORTAGE'
  | 'CARGO_EXCESS'
  | 'CARGO_LOSS'
  | 'PACKAGING_DAMAGE'
  | 'WET_CARGO'
  | 'CONTAINER_DAMAGE'
  | 'SEAL_ISSUE'
  | 'TEMPERATURE_EXCEPTION'
  | 'TRUCK_BREAKDOWN'
  | 'TRUCK_ACCIDENT'
  | 'WAREHOUSE_INCIDENT'
  | 'CUSTOMS_INCIDENT'
  | 'PORT_INCIDENT'
  | 'OCEAN_INCIDENT'
  | 'AIR_FREIGHT_INCIDENT'
  | 'DETENTION'
  | 'DEMURRAGE'
  | 'STORAGE'
  | 'DELIVERY_INCIDENT'
  | 'DOCUMENT_INCIDENT'
  | 'OTHER'

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type IncidentStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'EVIDENCE_COLLECTION'
  | 'ACTION_REQUIRED'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED'

export type ReportedBySource =
  | 'STAFF'
  | 'DRIVER'
  | 'WAREHOUSE'
  | 'CUSTOMER'
  | 'AGENT'
  | 'CARRIER'
  | 'SHIPPING_LINE'
  | 'AIRLINE'
  | 'CUSTOMS'
  | 'OTHER'

export type DamageType =
  | 'WET'
  | 'TORN'
  | 'CRUSHED'
  | 'BROKEN'
  | 'CONTAMINATED'
  | 'TEMPERATURE'
  | 'MISSING_CONTENTS'
  | 'PACKAGING_FAILURE'
  | 'OTHER'

export interface DamageDetails {
  damageType: DamageType
  packagesAffected: number
  totalShipmentPackages: number
  unaffectedPackages: number
  weightAffectedKg?: number
  description: string
  observedAt: string
  conditionBefore?: string
  conditionAfter?: string
  inspectionNotes?: string
}

export interface ShortageDetails {
  expectedQuantity: number
  actualQuantity: number
  shortageQuantity: number
  packageType: string
  whereDiscovered: string
}

export interface WeightShortageDetails {
  expectedNetKg: number
  actualNetKg: number
  differenceKg: number
  whereWeighed: string
}

export interface ContainerDamageDetails {
  containerNumber: string
  damageLocation: string
  damageType: string
  beforeCondition?: string
  afterCondition?: string
  inspectionReference?: string
  repairEstimateUsd?: number
  repairInvoiceRef?: string
  carrierReportRef?: string
}

export interface SealIncidentDetails {
  expectedSealNumber: string
  observedSealNumber: string
  sealStatus: 'BROKEN' | 'MISSING' | 'CHANGED' | 'INTACT'
  newSealNumber?: string
  reason?: string
  authorityOrPerson?: string
}

export interface TemperatureIncidentDetails {
  expectedRange: string // e.g. "+2°C to +8°C"
  recordedTemperature: number
  unit: string // "°C"
  source: string
  recordedAt: string
  durationHours?: number
  affectedCargo: string
}

export interface TruckIncidentDetails {
  truckPlate: string
  driverName: string
  location: string
  dateTime: string
  cargoImpactDescription: string
  authorityReportRef?: string
  injuryReported: boolean
  notes?: string
}

export interface DetentionDisputeDetails {
  containerNumber: string
  carrierName: string
  arrivalDate: string
  freeDays: number
  lastFreeDay: string
  actualEmptyReturnDate: string
  chargeDays: number
  carrierInvoiceRef?: string
  configuredDailyRate: number
  estimatedExposure: number
  actualCarrierCharge: number
  disputedAmount: number
  disputeReason: string
  resolutionStatus: string
}

export type EvidenceType =
  | 'PHOTO'
  | 'VIDEO'
  | 'PDF'
  | 'REPORT'
  | 'EMAIL'
  | 'MESSAGE'
  | 'INVOICE'
  | 'RECEIPT'
  | 'OTHER'

export interface EvidenceRecord {
  id: string
  incidentId: string
  evidenceType: EvidenceType
  documentId?: string // Link to Document Center
  fileName: string
  fileUrl?: string
  capturedDate: string
  source: string
  description: string
  annotationNote?: string
  customerVisible: boolean
  internalOnly: boolean
  versionNumber: number
  createdAt: string
}

export interface IncidentRecord {
  id: string
  incidentNumber: string // e.g. "INC-2026-00125"
  incidentType: IncidentType
  incidentDate: string // YYYY-MM-DD
  reportedDate: string // ISO timestamp
  shipmentRef: string
  bolId?: string
  bolNumber?: string
  bookingReference?: string
  containerNumber?: string
  truckPlate?: string
  driverName?: string
  warehouseName?: string
  borderStation?: string
  portName?: string
  vesselOrFlight?: string
  customerName: string
  locationName: string
  locationType: string
  description: string // Factual description only
  quantityAffected: number
  weightAffectedKg: number
  estimatedValueAffected: number
  currency: string
  severity: IncidentSeverity
  status: IncidentStatus
  reportedBySource: ReportedBySource
  reportedByName: string
  assignedTo: string
  evidenceStatus: 'NONE' | 'PARTIAL' | 'COMPLETE'
  claimLinked: boolean
  linkedClaimIds: string[]
  notes?: string
  damageDetails?: DamageDetails
  shortageDetails?: ShortageDetails
  weightShortageDetails?: WeightShortageDetails
  containerDamageDetails?: ContainerDamageDetails
  sealDetails?: SealIncidentDetails
  truckIncidentDetails?: TruckIncidentDetails
  temperatureDetails?: TemperatureIncidentDetails
  detentionDetails?: DetentionDisputeDetails
  createdAt: string
  updatedAt: string
}

export type ClaimType =
  | 'CUSTOMER_CLAIM'
  | 'CARRIER_CLAIM'
  | 'SUPPLIER_CLAIM'
  | 'INSURANCE_CLAIM'
  | 'DETENTION_DISPUTE'
  | 'DEMURRAGE_DISPUTE'
  | 'STORAGE_DISPUTE'
  | 'DAMAGE_CLAIM'
  | 'SHORTAGE_CLAIM'
  | 'LOSS_CLAIM'
  | 'OTHER'

export type ClaimStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'DOCUMENTS_PENDING'
  | 'UNDER_REVIEW'
  | 'SUBMITTED'
  | 'AWAITING_RESPONSE'
  | 'NEGOTIATION'
  | 'PARTIALLY_ACCEPTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'SETTLED'
  | 'WITHDRAWN'
  | 'CLOSED'

export type ResponsibilityStatus =
  | 'NOT_ASSESSED'
  | 'UNDER_REVIEW'
  | 'AGREED_PARTY_RESPONSIBILITY'
  | 'SHARED_RESPONSIBILITY'
  | 'DISPUTED'
  | 'NO_RESPONSIBILITY_ASSIGNED'

export interface ResponsiblePartyAssessment {
  status: ResponsibilityStatus
  assessedPartyName?: string
  partyType?: string
  reason?: string
  evidenceReference?: string
  assessedBy?: string
  assessedDate?: string
  previousAssessments?: {
    status: ResponsibilityStatus
    assessedPartyName?: string
    changedBy: string
    timestamp: string
    reason: string
  }[]
}

export type SettlementType =
  | 'CASH_PAYMENT'
  | 'BANK_PAYMENT'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'INSURANCE_RECOVERY'
  | 'SERVICE_CREDIT'
  | 'OTHER'

export interface SettlementRecord {
  id: string
  claimId: string
  settlementType: SettlementType
  settlementAmount: number
  currency: string
  settlementDate: string
  approvedBy: string
  financeTransactionRef?: string
  idempotencyKey: string
  notes?: string
}

export interface ClaimChecklistItem {
  id: string
  documentType: string
  title: string
  required: boolean
  isCompleted: boolean
  documentCenterId?: string
}

export type CommunicationChannel =
  | 'EMAIL'
  | 'WHATSAPP'
  | 'PHONE'
  | 'LETTER'
  | 'PORTAL'
  | 'MEETING'
  | 'OTHER'

export interface ClaimCommunicationItem {
  id: string
  date: string
  party: string
  channel: CommunicationChannel
  subject: string
  summary: string
  evidenceId?: string
}

export interface ClaimRecord {
  id: string
  claimNumber: string // e.g. "CLM-2026-00088"
  incidentId: string
  incidentNumber: string
  claimType: ClaimType
  claimStatus: ClaimStatus
  customerName: string
  claimant: string
  claimAgainst: string
  claimDate: string
  claimAmount: number
  currency: string
  acceptedAmount: number
  settlementAmount: number
  recoveredAmount: number
  outstandingExposure: number
  claimBasisDescription: string
  assignedTo: string
  responseDueDate?: string
  closedDate?: string
  responsibilityStatus: ResponsibilityStatus
  responsiblePartyName?: string
  responsiblePartyAssessment?: ResponsiblePartyAssessment
  notes?: string // Internal only - strictly never exposed to customer
  checklist: ClaimChecklistItem[]
  communications: ClaimCommunicationItem[]
  settlements: SettlementRecord[]
  createdAt: string
  updatedAt: string
}

export interface InsurancePolicyRecord {
  id: string
  policyNumber: string
  insurerName: string
  insuredParty: string
  coveragePeriod: string
  coverageLimit: number
  deductible: number
  currency: string
  policyDocumentRef?: string
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING'
}

export interface InsuranceClaimRecord {
  id: string
  claimId: string
  policyNumber: string
  claimNumberFromInsurer: string
  insurerName: string
  submittedDate: string
  claimAmount: number
  acceptedAmount?: number
  currency: string
  surveyorName?: string
  surveyReportDate?: string
  status: 'SUBMITTED' | 'SURVEY_SCHEDULED' | 'UNDER_ADJUSTMENT' | 'SETTLED' | 'REJECTED'
}

export interface ClaimsSummaryKpi {
  openIncidents: number
  openClaims: number
  cargoDamageCount: number
  shortageClaimsCount: number
  containerDamageCount: number
  detentionDisputesCount: number
  insuranceClaimsCount: number
  awaitingDocumentsCount: number
  underReviewCount: number
  awaitingResponseCount: number
  totalFinancialExposureUsd: number
  settledThisMonthCount: number
}
