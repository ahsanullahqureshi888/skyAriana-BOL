export type BulkRowStatus = 
  | "VALID"
  | "WARNING"
  | "ERROR"
  | "DUPLICATE"
  | "EXISTING_MATCH"
  | "READY"
  | "CREATED"
  | "SKIPPED"
  | "FAILED"

export interface BulkImportBatch {
  id: string
  batchReference: string
  sourceType: "MANUAL" | "EXCEL" | "CSV" | "JSON" | "WHATSAPP" | "BACKUP"
  sourceFile?: string
  createdBy: string
  startedAt: string
  completedAt?: string
  
  // Stats
  rowsFound: number
  rowsValid: number
  rowsWarning: number
  rowsError: number
  rowsCreated: number
  rowsLinked: number
  rowsSkipped: number
  
  companiesCreated: number
  bolsCreated: number
  containersCreated: number
  documentsCreated: number
  
  status: "DRAFT" | "REVIEWED" | "APPROVED" | "IMPORTED" | "ROLLED_BACK"
}

export interface ParsedBulkRow {
  date?: string
  shipper?: string
  consignee?: string
  notifyParty?: string
  billTo?: string
  invoiceNumber?: string
  bolNumber?: string
  commodity?: string
  hsCode?: string
  packages?: string
  packageType?: string
  unitWeight?: string
  grossWeight?: string
  netWeight?: string
  containerType?: string
  containerNumber?: string
  sealNumber?: string
  truckNumber?: string
  driver?: string
  driverPhone?: string
  origin?: string
  route?: string
  destination?: string
  shippingLine?: string
  vessel?: string
  voyage?: string
  etd?: string
  eta?: string
  status?: string
  remarks?: string
  rate?: string
  mark?: string
}

export interface BulkImportRow {
  id: string
  batchId: string
  sourceRowIndex: number
  rawData: any // Original pasted/uploaded row
  parsedData: ParsedBulkRow // Mapped to standard fields
  fingerprint: string // SHA-256 deterministic hash
  
  status: BulkRowStatus
  errorMessages: string[]
  warningMessages: string[]
  
  // Result Links
  bolId?: string
  shipmentId?: string
  containerId?: string
  
  createdAt: string
}

export interface ColumnMapping {
  sourceColumn: string
  targetField: keyof ParsedBulkRow | "IGNORE"
}

export interface WhatsAppParsedResult {
  field: keyof ParsedBulkRow
  originalText: string
  parsedValue: string
  confidence: "CONFIRMED" | "REVIEW" | "MISSING"
}
