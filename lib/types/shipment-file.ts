/**
 * Sky Ariana Logistics — Shipment File & Attachment Management Types
 * Phase 14: Document Upload, Automatic Attachment Organization & Digital Shipment Folder
 */

export type DocumentCategoryCode =
  | "SHIPPING"
  | "CUSTOMS"
  | "COMMERCIAL"
  | "CERTIFICATES"
  | "TRANSPORT"
  | "FINANCIAL"
  | "PHOTOS"
  | "OTHER"

export interface DocumentCategory {
  id: string
  name: string
  name_fa?: string
  code: DocumentCategoryCode
  parent_category_id: string | null
  description: string
  active: boolean
  required_for_route: string[] // route pattern or ['*']
  required_for_commodity: string[] // commodity pattern or ['*']
  client_visible_default: boolean
  icon?: string
  color?: string
  created_at: string
  updated_at: string
}

export type SpecialBLType =
  | "FIRST_LEG_BL"
  | "SECOND_LEG_BL"
  | "FINAL_BL"
  | "SWITCH_BL"
  | "HOUSE_BL"
  | "MASTER_BL"
  | "DRAFT_BL"
  | "SEAWAY_BILL"

export type DocumentType =
  // Shipping
  | SpecialBLType
  | "BOOKING_CONFIRMATION"
  | "CONTAINER_RELEASE"
  | "DELIVERY_ORDER"
  | "VGM_DECLARATION"
  | "SHIPPING_OTHER"
  // Customs
  | "AFGHAN_CUSTOMS_CLEARANCE"
  | "IRAN_CUSTOMS_CLEARANCE"
  | "UAE_CUSTOMS_CLEARANCE"
  | "TURKEY_CUSTOMS_CLEARANCE"
  | "TRANSIT_PERMIT"
  | "BORDER_INSPECTION_SLIP"
  | "CUSTOMS_DUTY_RECEIPT"
  | "CUSTOMS_OTHER"
  // Commercial
  | "COMMERCIAL_INVOICE"
  | "PACKING_LIST"
  | "PURCHASE_INVOICE"
  | "SALES_INVOICE"
  | "PROFORMA_INVOICE"
  | "COMMERCIAL_OTHER"
  // Certificates
  | "PHYTOSANITARY_CERTIFICATE"
  | "CERTIFICATE_OF_ORIGIN"
  | "QUARANTINE_CERTIFICATE"
  | "FUMIGATION_CERTIFICATE"
  | "QUALITY_INSPECTION_CERTIFICATE"
  | "CERTIFICATE_OTHER"
  // Transport & Driver
  | "TRUCK_REGISTRATION"
  | "DRIVER_LICENSE"
  | "DRIVER_TAZKIRA_ID"
  | "ROAD_TRANSPORT_PERMIT"
  | "VEHICLE_INSURANCE"
  | "TRANSPORT_OTHER"
  // Financial
  | "PAYMENT_RECEIPT"
  | "BANK_SLIP"
  | "CUSTOMER_INVOICE"
  | "SUPPLIER_INVOICE"
  | "FREIGHT_INVOICE"
  | "EXPENSE_VOUCHER"
  | "FINANCIAL_OTHER"
  // Photos
  | "PHOTO_CARGO"
  | "PHOTO_TRUCK"
  | "PHOTO_CONTAINER"
  | "PHOTO_SEAL"
  | "PHOTO_LOADING"
  | "PHOTO_UNLOADING"
  | "PHOTO_DAMAGE"
  | "PHOTO_CUSTOMS"
  | "PHOTO_OTHER"
  // Other
  | "SUPPORTING_DOCUMENT"
  | "GENERAL_OTHER"

export type FileVersionStatus =
  | "DRAFT"
  | "RECEIVED"
  | "REVIEWED"
  | "APPROVED"
  | "FINAL"
  | "SUPERSEDED"
  | "VOID"
  | "ARCHIVED"

export type FileSource =
  | "SYSTEM_GENERATED"
  | "CUSTOMER_UPLOAD"
  | "STAFF_UPLOAD"
  | "AGENT"
  | "SHIPPING_LINE"
  | "CUSTOMS"
  | "SUPPLIER"
  | "CLIENT_PORTAL"
  | "IMPORT"

export type PhotoType =
  | "cargo"
  | "truck"
  | "container"
  | "seal"
  | "loading"
  | "unloading"
  | "damage"
  | "customs"
  | "other"

export interface FileAuditEntry {
  event:
    | "UPLOADED"
    | "METADATA_UPDATED"
    | "REVIEWED"
    | "APPROVED"
    | "RELEASED_TO_CLIENT"
    | "DOWNLOADED"
    | "ARCHIVED"
    | "RESTORED"
    | "DELETED"
    | "NEW_VERSION_CREATED"
  user: string
  timestamp: string
  details?: string
  ip_address?: string
}

export interface FileInternalNote {
  id: string
  user: string
  text: string
  date: string
}

export interface ShipmentFileRecord {
  id: string
  bol_id: string
  bol_number: string
  shipment_id?: string
  container_id?: string
  container_number?: string
  company_id?: string
  company_name?: string
  document_category_id: string
  document_category_code: DocumentCategoryCode
  document_type: DocumentType
  file_name: string // Safe display name (editable)
  original_file_name: string // Exact original client filename
  storage_name: string // Unique disk filename
  storage_path: string // Relative storage path
  mime_type: string
  file_extension: string
  file_size: number // Bytes
  checksum: string // SHA-256
  document_number?: string
  document_date?: string
  expiry_date?: string
  status: FileVersionStatus
  version: number
  is_current_version: boolean
  previous_version_id?: string | null
  description?: string
  client_visible: boolean
  client_downloadable: boolean
  source: FileSource
  uploaded_by: string
  uploaded_at: string
  updated_at: string
  archived_at?: string | null
  tags: string[]
  internal_notes: FileInternalNote[]
  audit_history: FileAuditEntry[]
  // Customs specific
  customs_country?: string
  customs_port?: string
  customs_office?: string
  // Financial linking
  linked_invoice_id?: string | null
  linked_payment_id?: string | null
  linked_supplier_bill_id?: string | null
  // Tracking linking
  linked_tracking_event_id?: string | null
  // Photo classification
  photo_type?: PhotoType | null
}

export interface DocumentRequirementRule {
  id: string
  name: string
  document_type: DocumentType
  document_category_code: DocumentCategoryCode
  route_pattern?: string // e.g. "AFG -> UAE" or "*"
  commodity_pattern?: string // e.g. "Dry Fruit" or "*"
  is_mandatory: boolean
  description?: string
}

export interface DocumentChecklistItem {
  document_type: DocumentType
  name: string
  category_code: DocumentCategoryCode
  is_mandatory: boolean
  status: "AVAILABLE" | "MISSING" | "EXPIRED" | "PENDING_REVIEW"
  file?: ShipmentFileRecord
}

export interface BOLChecklistSummary {
  bol_id: string
  bol_number: string
  total_required: number
  total_available: number
  completeness_ratio: string // "7 / 9"
  completeness_percentage: number // 78
  is_complete: boolean
  items: DocumentChecklistItem[]
}

export interface DocumentRequestRecord {
  id: string
  bol_id: string
  bol_number: string
  container_number?: string
  document_type: DocumentType
  requested_from: "Customer" | "Agent" | "Supplier" | "Driver" | "Internal Staff"
  contact_name: string
  contact_phone?: string
  due_date: string
  note?: string
  assigned_staff: string
  status: "REQUESTED" | "RECEIVED" | "UNDER_REVIEW" | "COMPLETED" | "CANCELLED"
  created_at: string
  updated_at: string
}

export interface FileCenterFilterOptions {
  search?: string
  bolNumber?: string
  containerNumber?: string
  companyName?: string
  categoryCode?: DocumentCategoryCode | "ALL"
  documentType?: DocumentType | "ALL"
  status?: FileVersionStatus | "ALL"
  clientVisible?: boolean
  dateFrom?: string
  dateTo?: string
  hasExpiry?: boolean
  isExpired?: boolean
  uploader?: string
  tags?: string[]
}

export interface FileCenterSummaryKPI {
  totalFiles: number
  totalStorageBytes: number
  storageFormatted: string
  filesUploadedToday: number
  pendingReviewCount: number
  missingRequiredCount: number
  expiredDocsCount: number
  clientDocumentsReadyCount: number
}

export interface DigitalShipmentFolder {
  bol_id: string
  bol_number: string
  customer_name: string
  origin?: string
  destination?: string
  total_files: number
  checklist: BOLChecklistSummary
  categories: {
    category_code: DocumentCategoryCode
    category_name: string
    files: ShipmentFileRecord[]
  }[]
}
