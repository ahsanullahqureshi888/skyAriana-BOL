/**
 * Sky Ariana Daily Operations Workflow & End-of-Day Reporting
 * Phase 15 Data Models & Contracts
 */

export type DailyTaskType =
  | 'TRACKING_UPDATE_REQUIRED'
  | 'BORDER_FOLLOWUP'
  | 'PORT_FOLLOWUP'
  | 'VESSEL_FOLLOWUP'
  | 'ETA_FOLLOWUP'
  | 'MISSING_CONTAINER_NUMBER'
  | 'MISSING_BOL_NUMBER'
  | 'MISSING_VESSEL'
  | 'MISSING_SHIPPING_LINE'
  | 'DOCUMENT_INCOMPLETE'
  | 'DOCUMENT_APPROVAL_REQUIRED'
  | 'INVOICE_FOLLOWUP'
  | 'CUSTOMER_PAYMENT_FOLLOWUP'
  | 'SUPPLIER_PAYMENT_DUE'
  | 'PAYMENT_PROOF_REVIEW'
  | 'APPROVAL_REQUIRED'
  | 'DATA_RECONCILIATION'
  | 'DATA_QUALITY'
  | 'MANUAL'

export type DailyTaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export type DailyTaskStatus =
  | 'OPEN'
  | 'IN PROGRESS'
  | 'WAITING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'OVERDUE'

export type DailyTaskDepartment =
  | 'Operations'
  | 'Tracking'
  | 'Documents'
  | 'Accounting'
  | 'Management'
  | 'Customs'

export type TaskEntityType =
  | 'shipment'
  | 'bol'
  | 'container'
  | 'customer'
  | 'invoice'
  | 'supplier_bill'
  | 'document'
  | 'approval'
  | 'general'

export interface CollectionNote {
  id: string
  date: string
  user: string
  contactMethod: 'Phone' | 'WhatsApp' | 'Email' | 'In Person' | 'Other'
  note: string
  promisedDate?: string
  result?: 'Payment Promised' | 'Awaiting Bank Transfer' | 'Disputed' | 'Follow Up Later' | 'No Answer'
}

export interface DailyTaskComment {
  id: string
  user: string
  userRole?: string
  text: string
  createdAt: string
}

export interface DailyTaskAttachment {
  id: string
  name: string
  url: string
  type: string
  sizeBytes?: number
  uploadedAt: string
}

export interface DailyTaskActivity {
  id: string
  timestamp: string
  user: string
  action:
    | 'CREATED'
    | 'ASSIGNED'
    | 'STATUS_CHANGED'
    | 'PRIORITY_CHANGED'
    | 'COMMENT_ADDED'
    | 'NOTE_ADDED'
    | 'DUE_DATE_CHANGED'
    | 'COMPLETED'
    | 'REOPENED'
    | 'AUTO_RESOLVED'
  details: string
}

export interface DailyTask {
  id: string // Format: TSK-YYYY-NNNN or auto id
  task_type: DailyTaskType
  title: string
  description?: string
  explanation?: string // Transparent reason why this automatic task was generated
  entity_type: TaskEntityType
  entity_id: string
  
  // Relational links
  bol_id?: string
  bol_number?: string
  shipment_id?: string
  shipment_ref?: string
  container_id?: string
  container_number?: string
  account_id?: string
  account_name?: string
  invoice_id?: string
  invoice_number?: string
  supplier_bill_id?: string
  supplier_name?: string
  document_id?: string
  document_name?: string
  approval_id?: string

  // Assignments & Organization
  assigned_to?: string // User ID or username
  assigned_to_name?: string
  assigned_department: DailyTaskDepartment
  branch?: string

  // Classification & Timing
  priority: DailyTaskPriority
  status: DailyTaskStatus
  source: 'AUTOMATIC' | 'MANUAL' | 'BOL' | 'ACCOUNT' | 'SUPPLIER'
  deduplication_key: string // Stable key: e.g. `${task_type}::${entity_id}`

  // Dates
  due_date?: string // YYYY-MM-DD
  follow_up_date?: string // YYYY-MM-DD
  created_at: string
  updated_at: string
  completed_at?: string
  completed_by?: string
  completion_note?: string

  // Financial & Collection tracking details
  outstanding_amount?: number
  currency?: string
  days_overdue?: number
  last_payment_date?: string
  last_follow_up_date?: string
  promised_payment_date?: string
  collection_notes?: CollectionNote[]

  // Incomplete document specifics
  missing_items?: string[] // e.g. ["Gross Weight", "Seal Number", "Customs Stamp"]

  // Comments & Attachments
  comments?: DailyTaskComment[]
  attachments?: DailyTaskAttachment[]
  activity_history?: DailyTaskActivity[]
}

export interface DailyOperationsConfig {
  trackingFollowUpHoursRoad: number // Default 24h
  trackingFollowUpHoursPort: number // Default 48h
  trackingFollowUpHoursSea: number // Default 72h
  borderFollowUpHours: number // Default 48h
  portFollowUpHours: number // Default 72h
  etaReminderDays: number // Default 2 days
  documentReminderDays: number // Default 3 days
  customerCollectionReminderDays: number // Default 7 days
  supplierDueReminderDays: number // Default 3 days
  autoAssignRules: {
    tracking: DailyTaskDepartment
    documents: DailyTaskDepartment
    accounting: DailyTaskDepartment
    operations: DailyTaskDepartment
  }
  reportSections: {
    showOperations: boolean
    showTracking: boolean
    showBorder: boolean
    showPort: boolean
    showDocuments: boolean
    showPayments: boolean
    showOutstanding: boolean
    showSuppliers: boolean
    showApprovals: boolean
    showTasks: boolean
    showIssues: boolean
  }
}

export interface DailyOperationsSummaryMetrics {
  activeShipments: number
  updatesNeeded: number
  atBorder: number
  atPort: number
  atSea: number
  arrivingSoon: number
  documentsPending: number
  invoicesOverdue: number
  customerFollowUps: number
  supplierPaymentsDue: number
  pendingApprovals: number
  criticalIssues: number
  
  // Progress indicators
  tasksCompletedToday: number
  tasksOpenToday: number
  trackingUpdatesAddedToday: number
  documentsFinalizedToday: number
  paymentsRecordedToday: number
  bolsCreatedToday: number
}

export interface DailyReportShipmentItem {
  bolNumber: string
  containerNumber: string
  origin: string
  destination: string
  currentLocation: string
  status: string
  latestUpdate: string
  nextDestination?: string
  eta?: string
  carrier?: string
}

export interface DailyReportBorderItem {
  bolNumber: string
  truckPlate: string
  driverName: string
  borderName: string
  arrivalDate: string
  waitingDurationHours: number
  status: string
}

export interface DailyReportPortItem {
  bolNumber: string
  containerNumber: string
  portName: string
  status: string
  vesselName?: string
  voyageNumber?: string
  etd?: string
  eta?: string
}

export interface DailyReportVesselItem {
  vesselName: string
  voyageNumber: string
  shippingLine: string
  containerCount: number
  etd?: string
  eta?: string
  destinationPort: string
}

export interface DailyReportDocumentItem {
  bolNumber: string
  customerName: string
  documentName: string
  status: 'PENDING' | 'COMPLETED' | 'INCOMPLETE'
  missingItems?: string[]
  dueDate?: string
}

export interface CurrencyTotal {
  currency: string
  amount: number
}

export interface DailyReportPaymentItem {
  customerName: string
  amount: number
  currency: string
  reference: string
  invoiceNumber?: string
  bolNumber?: string
  date: string
}

export interface DailyReportOutstandingItem {
  customerName: string
  invoiceNumber: string
  outstandingAmount: number
  currency: string
  daysOverdue: number
  lastFollowUp?: string
  nextAction?: string
}

export interface DailyReportSupplierItem {
  supplierName: string
  billNumber: string
  bolNumber?: string
  totalAmount: number
  paidAmount: number
  outstandingAmount: number
  currency: string
  dueDate: string
  status: 'DUE_SOON' | 'DUE_TODAY' | 'OVERDUE' | 'PAID'
}

export interface DailyReportApprovalItem {
  type: string
  amount: number
  currency: string
  requester: string
  waitingDurationHours: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
}

export interface DailyReportTaskSummary {
  completedCount: number
  openCount: number
  overdueCount: number
  dueTomorrowCount: number
}

export interface DailyReportIssueItem {
  severity: 'CRITICAL' | 'WARNING'
  category: 'SHIPMENT' | 'TRACKING' | 'DOCUMENT' | 'FINANCE' | 'RECONCILIATION'
  title: string
  description: string
  bolNumber?: string
  containerNumber?: string
}

export interface DailyOperationsReportRecord {
  id: string
  reportDate: string // YYYY-MM-DD
  version: number
  status: 'DRAFT' | 'FINAL' | 'ARCHIVED'
  generatedAt: string
  generatedBy: string
  finalizedAt?: string
  finalizedBy?: string
  managementNote?: string
  
  summary: DailyOperationsSummaryMetrics
  operations: DailyReportShipmentItem[]
  border: DailyReportBorderItem[]
  port: DailyReportPortItem[]
  vessel: DailyReportVesselItem[]
  documents: DailyReportDocumentItem[]
  customerPayments: DailyReportPaymentItem[]
  customerPaymentTotals: CurrencyTotal[] // Strictly demarcated currencies
  outstanding: DailyReportOutstandingItem[]
  outstandingTotals: CurrencyTotal[] // Strictly demarcated currencies
  supplierPayments: DailyReportSupplierItem[]
  supplierTotals: CurrencyTotal[] // Strictly demarcated currencies
  approvals: DailyReportApprovalItem[]
  tasks: DailyReportTaskSummary
  issues: DailyReportIssueItem[]
}
