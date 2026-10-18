export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL'

export type NotificationCategory =
  | 'OPERATIONS'
  | 'TRACKING'
  | 'BOOKING'
  | 'CONTAINER'
  | 'VESSEL'
  | 'DOCUMENTS'
  | 'COMPLIANCE'
  | 'FINANCE'
  | 'WORKFLOW'
  | 'CUSTOMER_PORTAL'
  | 'BACKUP'
  | 'SYNC'
  | 'SYSTEM'

export type NotificationSourceModule =
  | 'TRACKING'
  | 'BOOKING'
  | 'CONTAINER'
  | 'DOCUMENTS'
  | 'FINANCE'
  | 'WORKFLOW'
  | 'CUSTOMER_PORTAL'
  | 'BACKUP'
  | 'SYNC'
  | 'SYSTEM'
  | 'MANUAL'

export interface NotificationActionContext {
  targetView: 'bol' | 'shipments' | 'accounting' | 'document-compliance' | 'booking-containers' | 'whatsapp' | 'workflow' | 'customer-portal-admin' | 'settings' | 'reports'
  param?: string // e.g. bolNumber, invoiceNo, taskId, etc.
  label?: string // e.g. 'Open BOL', 'View Task', etc.
}

/**
 * Canonical Notification Event (Shared business operational fact)
 */
export interface NotificationEvent {
  id: string // e.g. ntf-evt-20260921-1234
  eventKey: string // Deduplication key: `${type}::${sourceRecordId}::${threshold || 'default'}`
  type: string // e.g. GATE_IN_CUTOFF, ETA_APPROACHING, MISSING_DOCUMENT, INVOICE_OVERDUE
  category: NotificationCategory
  severity: NotificationSeverity
  title: string
  message: string
  sourceModule: NotificationSourceModule
  sourceRecordId: string // e.g. bolNumber, bookingNo, containerNo, invoiceNo
  
  // Relational links
  relatedBol?: string
  relatedShipment?: string
  relatedBooking?: string
  relatedContainer?: string
  relatedCustomer?: string
  clientId?: string // For customer portal isolation
  
  // Targeted audience
  targetUser?: string // specific username
  targetTeam?: 'Operations' | 'Documentation' | 'Finance' | 'Customs' | 'Border' | 'Management'
  targetRole?: 'superadmin' | 'admin' | 'accountant' | 'viewer' | 'shipper'
  financeRestricted?: boolean // If true, sensitive financial numbers must be stripped for non-finance users
  
  // Contextual action
  actionContext?: NotificationActionContext
  
  // Resolution state
  isResolved: boolean
  resolvedAt?: string
  resolvedReason?: string
  
  createdAt: string
  expiresAt?: string
}

/**
 * User-Specific Notification Delivery State
 */
export interface NotificationDelivery {
  id: string // e.g. del-20260921-5678
  notificationId: string // References NotificationEvent.id
  userId: string // Username
  read: boolean
  readAt?: string
  acknowledged: boolean
  acknowledgedAt?: string
  snoozedUntil?: string // ISO timestamp string
  pinned: boolean
  createdAt: string
}

/**
 * Composite view presented to the user
 */
export interface UserNotificationView extends NotificationEvent {
  deliveryId: string
  read: boolean
  readAt?: string
  acknowledged: boolean
  acknowledgedAt?: string
  snoozedUntil?: string
  pinned: boolean
  isSnoozed: boolean
}

export interface UserNotificationSettings {
  userId: string
  desktopEnabled: boolean
  soundLevel: 'off' | 'critical_only' | 'warnings_critical' | 'all'
  quietHoursEnabled: boolean
  quietHoursStart: string // HH:MM, e.g. "22:00"
  quietHoursEnd: string // HH:MM, e.g. "07:00"
  allowCriticalInQuietHours: boolean
  categories: Partial<Record<NotificationCategory, 'all' | 'important_only' | 'off'>>
  updatedAt: string
}

export interface NotificationMetrics {
  totalUnread: number
  totalCritical: number
  totalWarning: number
  totalInfo: number
  totalActiveIssues: number
  resolvedToday: number
  byCategory: Partial<Record<NotificationCategory, number>>
}

export function getDefaultNotificationSettings(userId: string): UserNotificationSettings {
  return {
    userId,
    desktopEnabled: false,
    soundLevel: 'critical_only',
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    allowCriticalInQuietHours: true,
    categories: {
      OPERATIONS: 'all',
      TRACKING: 'all',
      BOOKING: 'all',
      CONTAINER: 'all',
      VESSEL: 'all',
      DOCUMENTS: 'all',
      COMPLIANCE: 'all',
      FINANCE: 'all',
      WORKFLOW: 'all',
      CUSTOMER_PORTAL: 'all',
      BACKUP: 'important_only',
      SYNC: 'important_only',
      SYSTEM: 'important_only',
    },
    updatedAt: new Date().toISOString(),
  }
}
