export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'WAITING' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED'

export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export type TaskType =
  | 'DOCUMENT_PREPARATION'
  | 'DOCUMENT_REVIEW'
  | 'TRACKING_UPDATE'
  | 'CUSTOMER_UPDATE'
  | 'BOOKING_CONFIRMATION'
  | 'CONTAINER_ASSIGNMENT'
  | 'EMPTY_PICKUP'
  | 'STUFFING'
  | 'VGM_SUBMISSION'
  | 'GATE_IN'
  | 'SHIPPING_INSTRUCTION'
  | 'BL_REVIEW'
  | 'PAYMENT_FOLLOWUP'
  | 'EMPTY_RETURN'
  | 'CUSTOMS_FOLLOWUP'
  | 'PORT_FOLLOWUP'
  | 'OTHER'

export type WorkflowSourceModule =
  | 'BOL'
  | 'TRACKING'
  | 'BOOKING'
  | 'DOCUMENTS'
  | 'ACCOUNTING'
  | 'WHATSAPP'
  | 'MANUAL'

export interface TaskChecklistItem {
  id: string
  text: string
  completed: boolean
  completedAt?: string
  completedBy?: string
}

export interface TaskComment {
  id: string
  taskId: string
  userName: string
  userRole?: string
  content: string
  createdAt: string
}

export interface TaskHistoryItem {
  id: string
  taskId: string
  timestamp: string
  action: 'CREATED' | 'ASSIGNED' | 'STATUS_CHANGED' | 'PRIORITY_CHANGED' | 'REOPENED' | 'CANCELLED' | 'COMMENT_ADDED' | 'CHECKLIST_UPDATED' | 'AUTO_COMPLETED'
  actorName: string
  details: string
  previousValue?: string
  newValue?: string
}

export interface WorkflowTask {
  id: string
  taskNumber: string // e.g. TSK-2026-0001
  fingerprint?: string // Unique deduplication key (e.g. ruleId::shipmentId::taskType)
  title: string
  description?: string
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  sourceModule: WorkflowSourceModule
  
  // Assignments
  assignedTo?: string // Username or Full Name
  assignedTeam?: 'Operations' | 'Documentation' | 'Finance' | 'Customs' | 'Border'
  
  // Deadlines
  dueDate?: string // ISO string or YYYY-MM-DD
  dueTime?: string
  
  // Relational context links
  bolNumber?: string
  shipmentId?: string
  bookingNo?: string
  containerNo?: string
  companyId?: string
  customerName?: string
  destination?: string
  route?: string
  
  // Prerequisites / Dependency blocking
  dependencies?: string[] // IDs of prerequisite tasks that must be COMPLETED
  blockedReason?: string

  // State-driven auto-completion criteria
  autoCompleteRule?: {
    triggerType: 'DOCUMENT_READY' | 'CONTAINER_ASSIGNED' | 'PAYMENT_POSTED' | 'MILESTONE_REACHED'
    targetId?: string
    targetDocType?: 'COMMERCIAL_INVOICE' | 'PACKING_LIST' | 'TRANSIT_PAPER' | 'PHYTO' | 'BILL_OF_LADING'
  }

  // Interactive items
  checklist?: TaskChecklistItem[]
  comments?: TaskComment[]
  
  // Metadata & Multi-PC conflict safety
  version: number // Incrementing integer for optimistic locking
  ruleId?: string // If created by an automated rule
  createdBy: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  completedBy?: string
  cancelledAt?: string
  cancellationReason?: string
  reopenedAt?: string
  reopenReason?: string
}

export type WorkflowEventType =
  | 'BOL_CREATED'
  | 'BOL_UPDATED'
  | 'BOOKING_CREATED'
  | 'BOOKING_CONFIRMED'
  | 'CONTAINER_ASSIGNED'
  | 'CONTAINER_STUFFED'
  | 'VGM_SUBMITTED'
  | 'GATE_IN_RECORDED'
  | 'DOCUMENT_CREATED'
  | 'DOCUMENT_APPROVED'
  | 'INVOICE_CREATED'
  | 'INVOICE_OVERDUE'
  | 'PAYMENT_RECEIVED'
  | 'SHIPMENT_STATUS_CHANGED'
  | 'TRACKING_STALE_DETECTED'
  | 'CUSTOMS_CLEARED'
  | 'SHIPMENT_DELIVERED'

export interface WorkflowEvent {
  id: string
  type: WorkflowEventType
  timestamp: string
  actor?: string
  bolNumber?: string
  shipmentId?: string
  bookingNo?: string
  containerNo?: string
  companyId?: string
  customerName?: string
  invoiceNumber?: string
  documentType?: string
  data?: Record<string, any>
}

export interface WorkflowRule {
  id: string
  name: string
  description: string
  eventType: WorkflowEventType
  enabled: boolean
  taskType: TaskType
  taskTitleTemplate: string
  taskDescriptionTemplate: string
  defaultPriority: TaskPriority
  defaultTeam?: 'Operations' | 'Documentation' | 'Finance' | 'Customs' | 'Border'
  dueOffsetHours: number // e.g. 24 hours from event
  autoCompleteOn?: 'DOCUMENT_READY' | 'CONTAINER_ASSIGNED' | 'PAYMENT_POSTED' | 'MILESTONE_REACHED'
  targetDocType?: 'COMMERCIAL_INVOICE' | 'PACKING_LIST' | 'TRANSIT_PAPER' | 'PHYTO' | 'BILL_OF_LADING'
  requiredPrerequisites?: TaskType[] // Generate with dependencies on tasks of these types
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'Export' | 'Transit' | 'Border' | 'Accounting'
  milestones: {
    title: string
    type: TaskType
    priority: TaskPriority
    team: 'Operations' | 'Documentation' | 'Finance' | 'Customs' | 'Border'
    offsetDays: number
    dependsOnPrevious?: boolean
  }[]
}

export interface WorkflowSummaryMetrics {
  totalOpen: number
  myTasks: number
  dueToday: number
  overdue: number
  blocked: number
  inProgress: number
  completedLast7Days: number
  completionRatePercent: number
  byPriority: {
    URGENT: number
    HIGH: number
    NORMAL: number
    LOW: number
  }
  byStatus: {
    PENDING: number
    IN_PROGRESS: number
    WAITING: number
    BLOCKED: number
    COMPLETED: number
    CANCELLED: number
  }
}
