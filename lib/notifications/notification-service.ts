import path from 'path'
import { mutateJsonFile, readJsonFile } from '@/lib/services/blob-db'
import {
  NotificationEvent,
  NotificationDelivery,
  UserNotificationView,
  UserNotificationSettings,
  NotificationMetrics,
  NotificationCategory,
  NotificationSeverity,
  getDefaultNotificationSettings,
} from '@/lib/types/notification'
import { User } from '@/lib/types'

const NOTIFICATIONS_FILE = path.join(process.cwd(), '.local-notifications.json')
const DELIVERIES_FILE = path.join(process.cwd(), '.local-notification-deliveries.json')
const SETTINGS_FILE = path.join(process.cwd(), '.local-notification-settings.json')

export interface NotificationFilter {
  category?: NotificationCategory | 'ALL'
  severity?: NotificationSeverity | 'ALL'
  unreadOnly?: boolean
  criticalOnly?: boolean
  activeOnly?: boolean
  search?: string
}

function isFinanceAuthorized(role?: string): boolean {
  if (!role) return false
  const r = role.toLowerCase()
  return r === 'admin' || r === 'superadmin' || r === 'accountant'
}

function isAdminAuthorized(role?: string): boolean {
  if (!role) return false
  const r = role.toLowerCase()
  return r === 'admin' || r === 'superadmin'
}

export { getDefaultNotificationSettings } from '@/lib/types/notification'

/**
 * Retrieves all events visible to the given user, joined with their individual delivery state.
 */
export async function getNotificationsForUser(
  user: User,
  filter?: NotificationFilter
): Promise<UserNotificationView[]> {
  const events = await readJsonFile<NotificationEvent[]>(NOTIFICATIONS_FILE, [])
  const deliveries = await readJsonFile<NotificationDelivery[]>(DELIVERIES_FILE, [])

  const now = new Date().toISOString()
  const userId = user.username || user.id

  // 1. Permission and Role Filtering
  const isShipper = user.role === 'shipper'
  const hasFinance = isFinanceAuthorized(user.role)
  const hasAdmin = isAdminAuthorized(user.role)

  const visibleEvents = events.filter((evt) => {
    // A. Shipper Customer Portal isolation
    if (isShipper) {
      if (user.clientId && evt.clientId && evt.clientId !== user.clientId) return false
      if (user.clientName && evt.relatedCustomer && !evt.relatedCustomer.toLowerCase().includes(user.clientName.toLowerCase())) return false
      // Only allow customer-safe categories for shippers
      if (['FINANCE', 'SYSTEM', 'BACKUP', 'SYNC', 'COMPLIANCE'].includes(evt.category)) return false
      return true
    }

    // B. Internal staff filtering
    if (evt.targetUser && evt.targetUser.toLowerCase() !== userId.toLowerCase()) return false
    if (evt.targetRole && evt.targetRole !== user.role && !hasAdmin) return false
    if ((evt.category === 'SYSTEM' || evt.category === 'BACKUP') && !hasAdmin) return false
    if (evt.category === 'FINANCE' && !hasFinance) return false

    return true
  })

  // 2. Synthesize Deliveries for visible events
  const deliveryMap = new Map<string, NotificationDelivery>()
  for (const d of deliveries) {
    if (d.userId.toLowerCase() === userId.toLowerCase()) {
      deliveryMap.set(d.notificationId, d)
    }
  }

  const missingDeliveries: NotificationDelivery[] = []
  for (const evt of visibleEvents) {
    if (!deliveryMap.has(evt.id)) {
      const newDel: NotificationDelivery = {
        id: `del-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        notificationId: evt.id,
        userId,
        read: false,
        acknowledged: false,
        pinned: false,
        createdAt: now,
      }
      deliveryMap.set(evt.id, newDel)
      missingDeliveries.push(newDel)
    }
  }

  if (missingDeliveries.length > 0) {
    await mutateJsonFile<NotificationDelivery[]>(DELIVERIES_FILE, [], (list) => {
      return [...list, ...missingDeliveries]
    })
  }

  // 3. Assemble UserNotificationView
  let views: UserNotificationView[] = visibleEvents.map((evt) => {
    const delivery = deliveryMap.get(evt.id)!
    const isSnoozed = !!(delivery.snoozedUntil && delivery.snoozedUntil > now)

    // Mask finance figures if user is not finance authorized but event allowed
    let message = evt.message
    let title = evt.title
    if (evt.financeRestricted && !hasFinance) {
      message = message.replace(/\$[\d,]+(\.\d{2})?/g, '$***').replace(/\b\d+,\d{3}\b/g, '***')
      title = title.replace(/\$[\d,]+(\.\d{2})?/g, '$***')
    }

    return {
      ...evt,
      title,
      message,
      deliveryId: delivery.id,
      read: delivery.read,
      readAt: delivery.readAt,
      acknowledged: delivery.acknowledged,
      acknowledgedAt: delivery.acknowledgedAt,
      snoozedUntil: delivery.snoozedUntil,
      pinned: delivery.pinned,
      isSnoozed,
    }
  })

  // 4. Apply Filters
  if (filter) {
    if (filter.category && filter.category !== 'ALL') {
      views = views.filter((v) => v.category === filter.category)
    }
    if (filter.severity && filter.severity !== 'ALL') {
      views = views.filter((v) => v.severity === filter.severity)
    }
    if (filter.unreadOnly) {
      views = views.filter((v) => !v.read)
    }
    if (filter.criticalOnly) {
      views = views.filter((v) => v.severity === 'CRITICAL')
    }
    if (filter.activeOnly) {
      views = views.filter((v) => !v.isResolved)
    }
    if (filter.search && filter.search.trim()) {
      const q = filter.search.toLowerCase().trim()
      views = views.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.message.toLowerCase().includes(q) ||
          (v.relatedBol && v.relatedBol.toLowerCase().includes(q)) ||
          (v.relatedContainer && v.relatedContainer.toLowerCase().includes(q)) ||
          (v.relatedCustomer && v.relatedCustomer.toLowerCase().includes(q)) ||
          (v.sourceRecordId && v.sourceRecordId.toLowerCase().includes(q))
      )
    }
  }

  // Sort: Pinned first, then unresolved, then critical/warning/info, then creation date desc
  const severityWeight: Record<NotificationSeverity, number> = {
    CRITICAL: 4,
    WARNING: 3,
    INFO: 2,
    SUCCESS: 1,
  }

  views.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (a.isResolved !== b.isResolved) return a.isResolved ? 1 : -1
    const sDiff = severityWeight[b.severity] - severityWeight[a.severity]
    if (sDiff !== 0) return sDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return views
}

export async function getNotificationMetricsForUser(user: User): Promise<NotificationMetrics> {
  const views = await getNotificationsForUser(user)
  const todayStr = new Date().toISOString().split('T')[0]

  let totalUnread = 0
  let totalCritical = 0
  let totalWarning = 0
  let totalInfo = 0
  let totalActiveIssues = 0
  let resolvedToday = 0
  const byCategory: Partial<Record<NotificationCategory, number>> = {}

  for (const v of views) {
    if (!v.read) totalUnread++

    if (!v.isResolved) {
      totalActiveIssues++
      if (v.severity === 'CRITICAL') totalCritical++
      if (v.severity === 'WARNING') totalWarning++
      if (v.severity === 'INFO' || v.severity === 'SUCCESS') totalInfo++
      byCategory[v.category] = (byCategory[v.category] || 0) + 1
    } else if (v.resolvedAt && v.resolvedAt.startsWith(todayStr)) {
      resolvedToday++
    }
  }

  return {
    totalUnread,
    totalCritical,
    totalWarning,
    totalInfo,
    totalActiveIssues,
    resolvedToday,
    byCategory,
  }
}

export async function markDeliveryAsRead(deliveryId: string, userId: string): Promise<boolean> {
  let success = false
  await mutateJsonFile<NotificationDelivery[]>(DELIVERIES_FILE, [], (list) => {
    const idx = list.findIndex(
      (d) => d.id === deliveryId && d.userId.toLowerCase() === userId.toLowerCase()
    )
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        read: true,
        readAt: new Date().toISOString(),
      }
      success = true
    }
    return list
  })
  return success
}

export async function markAllDeliveriesAsRead(userId: string): Promise<number> {
  let count = 0
  const now = new Date().toISOString()
  await mutateJsonFile<NotificationDelivery[]>(DELIVERIES_FILE, [], (list) => {
    return list.map((d) => {
      if (d.userId.toLowerCase() === userId.toLowerCase() && !d.read) {
        count++
        return {
          ...d,
          read: true,
          readAt: now,
        }
      }
      return d
    })
  })
  return count
}

export async function acknowledgeDelivery(deliveryId: string, userId: string): Promise<boolean> {
  let success = false
  await mutateJsonFile<NotificationDelivery[]>(DELIVERIES_FILE, [], (list) => {
    const idx = list.findIndex(
      (d) => d.id === deliveryId && d.userId.toLowerCase() === userId.toLowerCase()
    )
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        acknowledged: true,
        acknowledgedAt: new Date().toISOString(),
        read: true,
      }
      success = true
    }
    return list
  })
  return success
}

export async function snoozeDelivery(
  deliveryId: string,
  userId: string,
  untilISO: string
): Promise<boolean> {
  let success = false
  await mutateJsonFile<NotificationDelivery[]>(DELIVERIES_FILE, [], (list) => {
    const idx = list.findIndex(
      (d) => d.id === deliveryId && d.userId.toLowerCase() === userId.toLowerCase()
    )
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        snoozedUntil: untilISO,
      }
      success = true
    }
    return list
  })
  return success
}

export async function pinDelivery(
  deliveryId: string,
  userId: string,
  pinned: boolean
): Promise<boolean> {
  let success = false
  await mutateJsonFile<NotificationDelivery[]>(DELIVERIES_FILE, [], (list) => {
    const idx = list.findIndex(
      (d) => d.id === deliveryId && d.userId.toLowerCase() === userId.toLowerCase()
    )
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        pinned,
      }
      success = true
    }
    return list
  })
  return success
}

/**
 * Ingests a business notification event idempotently using eventKey.
 * If an active event with identical eventKey already exists, updates severity/message without duplicate creation.
 */
export async function createOrUpdateNotificationEvent(
  input: Partial<NotificationEvent>
): Promise<{ event: NotificationEvent; created: boolean }> {
  let resultEvent: NotificationEvent | null = null
  let isCreated = false

  await mutateJsonFile<NotificationEvent[]>(NOTIFICATIONS_FILE, [], (events) => {
    const eventKey = input.eventKey || `${input.type || 'EVENT'}::${input.sourceRecordId || 'GEN'}::default`
    const existingIndex = events.findIndex((e) => e.eventKey === eventKey && !e.isResolved)

    const now = new Date().toISOString()

    if (existingIndex !== -1) {
      // Update existing alert (e.g. cut-off escalation from WARNING to CRITICAL)
      const existing = events[existingIndex]
      const updated: NotificationEvent = {
        ...existing,
        severity: input.severity || existing.severity,
        title: input.title || existing.title,
        message: input.message || existing.message,
        actionContext: input.actionContext || existing.actionContext,
        expiresAt: input.expiresAt || existing.expiresAt,
      }
      events[existingIndex] = updated
      resultEvent = updated
      isCreated = false
      return events
    }

    // Create fresh notification
    const newEvent: NotificationEvent = {
      id: input.id || `ntf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      eventKey,
      type: input.type || 'GENERAL_ALERT',
      category: input.category || 'OPERATIONS',
      severity: input.severity || 'INFO',
      title: input.title || 'Operational Notification',
      message: input.message || '',
      sourceModule: input.sourceModule || 'MANUAL',
      sourceRecordId: input.sourceRecordId || 'GLOBAL',
      relatedBol: input.relatedBol,
      relatedShipment: input.relatedShipment,
      relatedBooking: input.relatedBooking,
      relatedContainer: input.relatedContainer,
      relatedCustomer: input.relatedCustomer,
      clientId: input.clientId,
      targetUser: input.targetUser,
      targetTeam: input.targetTeam,
      targetRole: input.targetRole,
      financeRestricted: input.financeRestricted || false,
      actionContext: input.actionContext,
      isResolved: false,
      createdAt: now,
      expiresAt: input.expiresAt,
    }

    events.unshift(newEvent)
    resultEvent = newEvent
    isCreated = true
    return events
  })

  return { event: resultEvent!, created: isCreated }
}

/**
 * Marks active events matching eventKey or sourceRecordId as RESOLVED.
 */
export async function autoResolveNotification(
  eventKeyOrSourceId: string,
  reason = 'Underlying issue resolved'
): Promise<boolean> {
  let resolved = false
  const now = new Date().toISOString()
  await mutateJsonFile<NotificationEvent[]>(NOTIFICATIONS_FILE, [], (events) => {
    return events.map((e) => {
      if ((e.eventKey === eventKeyOrSourceId || e.sourceRecordId === eventKeyOrSourceId) && !e.isResolved) {
        resolved = true
        return {
          ...e,
          isResolved: true,
          resolvedAt: now,
          resolvedReason: reason,
        }
      }
      return e
    })
  })
  return resolved
}

export async function getUserNotificationSettings(userId: string): Promise<UserNotificationSettings> {
  const settingsList = await readJsonFile<UserNotificationSettings[]>(SETTINGS_FILE, [])
  const found = settingsList.find((s) => s.userId.toLowerCase() === userId.toLowerCase())
  return found || getDefaultNotificationSettings(userId)
}

export async function saveUserNotificationSettings(
  userId: string,
  updates: Partial<UserNotificationSettings>
): Promise<UserNotificationSettings> {
  let result: UserNotificationSettings | null = null
  await mutateJsonFile<UserNotificationSettings[]>(SETTINGS_FILE, [], (list) => {
    const idx = list.findIndex((s) => s.userId.toLowerCase() === userId.toLowerCase())
    const cur = idx !== -1 ? list[idx] : getDefaultNotificationSettings(userId)
    const updated: UserNotificationSettings = {
      ...cur,
      ...updates,
      userId,
      updatedAt: new Date().toISOString(),
    }
    if (idx !== -1) {
      list[idx] = updated
    } else {
      list.push(updated)
    }
    result = updated
    return list
  })
  return result!
}
