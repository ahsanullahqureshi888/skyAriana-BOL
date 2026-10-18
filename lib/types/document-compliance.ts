export type DocumentStatus = 
  | 'NOT_STARTED'
  | 'DRAFT'
  | 'PENDING'
  | 'UPLOADED'
  | 'GENERATED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'NEEDS_CORRECTION'
  | 'EXPIRED'
  | 'MISSING'
  | 'NOT_REQUIRED'

export type DocumentCategory = 
  | 'AFGHAN_DOCUMENTS'
  | 'TRANSPORT_DOCUMENTS'
  | 'SHIPPING_DOCUMENTS'
  | 'CUSTOMS_DOCUMENTS'
  | 'COMMERCIAL_DOCUMENTS'
  | 'AGRICULTURE_DOCUMENTS'
  | 'DESTINATION_DOCUMENTS'
  | 'ACCOUNTING_DOCUMENTS'
  | 'OTHER_DOCUMENTS'

export type DocumentType =
  | 'BILL_OF_LADING'
  | 'COMMERCIAL_INVOICE'
  | 'PACKING_LIST'
  | 'TRANSIT_PAPER'
  | 'PHYTOSANITARY_CERTIFICATE'
  | 'CERTIFICATE_OF_ORIGIN'
  | 'QUARANTINE_CERTIFICATE'
  | 'FIRST_LEG_BL'
  | 'SECOND_LEG_BL'
  | 'SWITCH_BL'
  | 'ROAD_WAYBILL'
  | 'CMR'
  | 'TRUCK_MANIFEST'
  | 'PROFORMA_INVOICE'
  | 'FREIGHT_INVOICE'
  | 'AIR_WAYBILL'
  | 'MAWB'
  | 'HAWB'
  | 'CARGO_ACCEPTANCE_RECEIPT'
  | 'CLAIM_FORM'
  | 'CARGO_DAMAGE_REPORT'
  | 'SURVEY_REPORT'
  | 'CARRIER_STATEMENT'
  | 'INSPECTION_REPORT'
  | 'REPAIR_ESTIMATE'
  | 'INSURANCE_CLAIM_FILE'
  | 'OTHER'

export type VisibilityLevel = 'INTERNAL_ONLY' | 'CUSTOMER_VISIBLE'
export type SourceSystem = 'GENERATED' | 'UPLOADED' | 'IMPORTED' | 'SYNCED' | 'EXTERNAL'

export interface DocumentMetadata {
  id: string
  bolId: string
  type: DocumentType
  category: DocumentCategory
  status: DocumentStatus
  visibility: VisibilityLevel
  source: SourceSystem
  
  // Identifying fields
  documentNumber?: string
  issueDate?: string
  expiryDate?: string
  
  // File References
  filePath?: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  
  // Versions
  version: number
  isArchived: boolean
  
  // Audit
  createdBy: string
  createdAt: string
  updatedAt: string
  approvedBy?: string
  approvedAt?: string
  
  // Correction notes
  correctionReason?: string
  overrideReason?: string
}

export interface ComplianceProfile {
  id: string
  name: string
  isDefault: boolean
  
  // Matching criteria
  origin?: string[]
  destination?: string[]
  route?: string[]
  commodity?: string[]
  transportMode?: string[]
  containerType?: string[]
  
  // Requirements mapping DocumentType -> isRequired
  requirements: Record<string, boolean>
  stageRequirements: Record<string, string[]> // Stage -> DocumentType[]
}

export interface ComplianceValidationResult {
  bolId: string
  completionScore: number // 0-100 percentage
  requiredCount: number
  completedCount: number
  missingDocs: DocumentType[]
  pendingDocs: DocumentType[]
  correctionDocs: DocumentType[]
  
  stageReadiness: Record<string, boolean> // Stage -> Is Ready
  
  dataMismatches: DataConsistencyMatch[]
}

export interface DataConsistencyMatch {
  field: string // e.g. "Shipper", "HS Code"
  status: 'MATCHED' | 'WARNING' | 'MISMATCH' | 'NOT_CHECKED'
  bolValue: any
  documentValues: Record<string, any> // DocumentType -> value
}

export interface DocumentVersion {
  versionId: string
  documentId: string
  versionNumber: number
  filePath: string
  createdAt: string
  createdBy: string
  status: DocumentStatus
}
