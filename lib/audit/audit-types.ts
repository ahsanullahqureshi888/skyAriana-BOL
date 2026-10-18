export type AuditActionCode =
  | "CREATE"
  | "UPDATE"
  | "DELETE_DRAFT"
  | "ARCHIVE"
  | "RESTORE"
  | "MERGE"
  | "APPROVE"
  | "REJECT"
  | "POST"
  | "REVERSE"
  | "CANCEL"
  | "ASSIGN"
  | "REASSIGN"
  | "STATUS_CHANGE"
  | "UPLOAD"
  | "DOWNLOAD"
  | "EXPORT"
  | "LOGIN"
  | "LOGOUT"
  | "PERMISSION_CHANGE"
  | "BACKUP"
  | "DATABASE_RESTORE"
  | "MIGRATION"
  | "ANNOTATION"

export type AuditEntityType =
  | "BOL"
  | "SHIPMENT"
  | "TRACKING_EVENT"
  | "BOOKING"
  | "CONTAINER"
  | "DOCUMENT"
  | "COMPANY"
  | "CONTACT"
  | "CUSTOMER_PORTAL_USER"
  | "LEDGER"
  | "INVOICE"
  | "PAYMENT"
  | "RECEIPT"
  | "DEBIT_NOTE"
  | "CREDIT_NOTE"
  | "EXPENSE"
  | "TASK"
  | "WORKFLOW_RULE"
  | "NOTIFICATION_RULE"
  | "USER"
  | "ROLE"
  | "SETTING"
  | "BACKUP"
  | "DATABASE"
  | "REPORT"

export type AuditSource =
  | "USER"
  | "WORKFLOW"
  | "SYSTEM"
  | "IMPORT"
  | "SYNC"
  | "MIGRATION"
  | "RESTORE"
  | "API"

export type ChangeReasonPreset =
  | "Customer Requested"
  | "Typing Correction"
  | "Document Correction"
  | "Carrier Update"
  | "Operational Change"
  | "Accounting Correction"
  | "Security Enforcement"
  | "System Migration"
  | "Other"

export interface ChangedField {
  field: string
  friendlyLabel: string
  oldValue: any
  newValue: any
  isSensitive?: boolean
  isFinancial?: boolean
}

export interface AuditEventActor {
  userId: string
  userName: string
  userRole: string
  sessionId?: string
  deviceId?: string
  appVersion?: string
}

export interface AuditEvent {
  eventId: string
  sequenceNumber: number
  timestamp: string // UTC ISO-8601
  businessTimestamp: string // Local business timezone (e.g. UTC+4:30)
  actor: AuditEventActor
  action: AuditActionCode
  entityType: AuditEntityType
  entityId: string
  entityReference?: string // e.g. "BOL-2026-NSA583", "INV-0034"
  module: string
  beforeValues?: Record<string, any> | null
  afterValues?: Record<string, any> | null
  changedFields: ChangedField[]
  reason?: string
  reasonPreset?: ChangeReasonPreset
  source: AuditSource
  automationRuleId?: string
  databaseRevision?: number
  ipAddress?: string
  status: "SUCCESS" | "FAILED"
  correlationId?: string // Groups related updates (e.g. company merge or import batch)
  previousHash?: string
  eventHash: string
  metadata?: Record<string, any>
}

export interface AuditFilterParams {
  search?: string
  startDate?: string
  endDate?: string
  userId?: string
  module?: string
  action?: AuditActionCode
  entityType?: AuditEntityType
  entityId?: string
  entityReference?: string
  status?: "SUCCESS" | "FAILED"
  source?: AuditSource
  deviceId?: string
  correlationId?: string
  page?: number
  limit?: number
  onlyCritical?: boolean
}

export interface AuditQueryResult {
  events: AuditEvent[]
  totalCount: number
  page: number
  totalPages: number
  limit: number
}

export interface AuditIntegrityReport {
  totalEvents: number
  verified: boolean
  firstEventTimestamp?: string
  lastEventTimestamp?: string
  tamperedEventId?: string
  brokenIndex?: number
  message: string
}
