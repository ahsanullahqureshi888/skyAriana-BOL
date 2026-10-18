/**
 * Sky Ariana Logistics — Notification Center Service
 * Phase 20: Persistent, deduplicated notification management with system event evaluator
 */

import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, mutateJsonFile } from "./blob-db"
import type {
  NotificationCategory,
  NotificationPriority,
  NotificationRecord,
} from "@/lib/types/communication"
import { getAllLocalBOLs } from "./local-storage-service"
import { getAllInvoices } from "./invoice-storage-service"
import { getAllShipmentDocuments } from "./shipment-document-storage"
import { computeInvoiceTotal } from "./communication-service"

const NOTIFICATIONS_FILE = getDataPath(".local-notifications.json")

export interface NotificationFilters {
  user_id?: string
  category?: NotificationCategory
  unreadOnly?: boolean
  priority?: NotificationPriority
  search?: string
  limit?: number
  offset?: number
}

export interface NotificationSummary {
  total: number
  unreadCount: number
  byCategory: Record<NotificationCategory, number>
  byPriority: Record<NotificationPriority, number>
}

export interface GetNotificationsResult {
  notifications: NotificationRecord[]
  summary: NotificationSummary
}

/**
 * Get all notifications with optional filtering and summary stats
 */
export async function getNotifications(
  filters: NotificationFilters = {}
): Promise<GetNotificationsResult> {
  const all = await readJsonFile<NotificationRecord[]>(NOTIFICATIONS_FILE, [])
  const list = Array.isArray(all) ? all : []

  // Calculate summary stats across all notifications
  const summary: NotificationSummary = {
    total: list.length,
    unreadCount: 0,
    byCategory: {
      SHIPMENT: 0,
      TRACKING: 0,
      DOCUMENTS: 0,
      ACCOUNTING: 0,
      PAYMENTS: 0,
      SUPPLIERS: 0,
      APPROVALS: 0,
      TASKS: 0,
      SYSTEM: 0,
    },
    byPriority: {
      INFO: 0,
      NORMAL: 0,
      HIGH: 0,
      URGENT: 0,
    },
  }

  for (const n of list) {
    if (!n.read_at) {
      summary.unreadCount++
    }
    if (n.category && summary.byCategory[n.category] !== undefined) {
      summary.byCategory[n.category]++
    }
    if (n.priority && summary.byPriority[n.priority] !== undefined) {
      summary.byPriority[n.priority]++
    }
  }

  // Filter items
  let filtered = [...list]

  if (filters.user_id && filters.user_id !== "all") {
    filtered = filtered.filter(
      (n) => n.user_id === "all" || n.user_id === filters.user_id
    )
  }

  if (filters.category) {
    filtered = filtered.filter((n) => n.category === filters.category)
  }

  if (filters.priority) {
    filtered = filtered.filter((n) => n.priority === filters.priority)
  }

  if (filters.unreadOnly) {
    filtered = filtered.filter((n) => !n.read_at)
  }

  if (filters.search) {
    const q = filters.search.trim().toLowerCase()
    filtered = filtered.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.entity_id.toLowerCase().includes(q) ||
        (n.type && n.type.toLowerCase().includes(q))
    )
  }

  // Sort newest first
  filtered.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const offset = filters.offset || 0
  const limit = filters.limit || 100
  const paged = filtered.slice(offset, offset + limit)

  return {
    notifications: paged,
    summary,
  }
}

/**
 * Create a new notification with deduplication guarantee.
 * If deduplication_key already exists, returns existing notification and isDuplicate: true.
 */
export async function createNotification(
  data: Omit<NotificationRecord, "id" | "created_at">
): Promise<{ notification: NotificationRecord; isDuplicate: boolean }> {
  let createdNotification: NotificationRecord | null = null
  let duplicateFound: NotificationRecord | null = null

  await mutateJsonFile<NotificationRecord[]>(
    NOTIFICATIONS_FILE,
    [],
    (notifications) => {
      const list = Array.isArray(notifications) ? notifications : []

      // Check deduplication
      if (data.deduplication_key) {
        const existing = list.find(
          (n) => n.deduplication_key === data.deduplication_key
        )
        if (existing) {
          duplicateFound = existing
          return list
        }
      }

      const newNotif: NotificationRecord = {
        ...data,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        created_at: new Date().toISOString(),
        read_at: data.read_at || null,
        user_id: data.user_id || "all",
      }

      createdNotification = newNotif
      return [newNotif, ...list]
    }
  )

  if (duplicateFound) {
    return { notification: duplicateFound, isDuplicate: true }
  }

  return { notification: createdNotification!, isDuplicate: false }
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(id: string): Promise<NotificationRecord | null> {
  let updatedRecord: NotificationRecord | null = null

  await mutateJsonFile<NotificationRecord[]>(
    NOTIFICATIONS_FILE,
    [],
    (notifications) => {
      const list = Array.isArray(notifications) ? notifications : []
      const idx = list.findIndex((n) => n.id === id)
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          read_at: new Date().toISOString(),
        }
        updatedRecord = list[idx]
      }
      return list
    }
  )

  return updatedRecord
}

/**
 * Mark all notifications as read (optionally for a specific user)
 */
export async function markAllAsRead(
  userId?: string
): Promise<{ updatedCount: number }> {
  let count = 0
  const now = new Date().toISOString()

  await mutateJsonFile<NotificationRecord[]>(
    NOTIFICATIONS_FILE,
    [],
    (notifications) => {
      const list = Array.isArray(notifications) ? notifications : []
      for (let i = 0; i < list.length; i++) {
        if (!list[i].read_at) {
          if (!userId || userId === "all" || list[i].user_id === userId || list[i].user_id === "all") {
            list[i] = { ...list[i], read_at: now }
            count++
          }
        }
      }
      return list
    }
  )

  return { updatedCount: count }
}

/**
 * Delete a notification by ID
 */
export async function deleteNotification(id: string): Promise<boolean> {
  let deleted = false

  await mutateJsonFile<NotificationRecord[]>(
    NOTIFICATIONS_FILE,
    [],
    (notifications) => {
      const list = Array.isArray(notifications) ? notifications : []
      const before = list.length
      const remaining = list.filter((n) => n.id !== id)
      deleted = remaining.length < before
      return remaining
    }
  )

  return deleted
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(
  userId?: string
): Promise<{ deletedCount: number }> {
  let deletedCount = 0

  await mutateJsonFile<NotificationRecord[]>(
    NOTIFICATIONS_FILE,
    [],
    (notifications) => {
      const list = Array.isArray(notifications) ? notifications : []
      if (!userId || userId === "all") {
        deletedCount = list.length
        return []
      }
      const remaining = list.filter((n) => n.user_id !== userId && n.user_id !== "all")
      deletedCount = list.length - remaining.length
      return remaining
    }
  )

  return { deletedCount }
}

/**
 * System Event Evaluator:
 * Scans live database state (BOLs, Invoices, Documents) to detect events
 * and generates deduplicated notifications.
 */
export async function evaluateSystemEvents(): Promise<{
  newNotificationsCount: number
}> {
  let newlyCreated = 0

  try {
    // 1. Scan Invoices for overdue items
    const invoices = await getAllInvoices()
    const now = new Date()

    for (const inv of invoices) {
      if (inv.due_date) {
        const dueDate = new Date(inv.due_date)
        const isPastDue = dueDate.getTime() < now.getTime()
        const isUnpaid =
          inv.payment_status?.toLowerCase() !== "paid" &&
          inv.payment_status?.toLowerCase() !== "settled"

        if (isPastDue && isUnpaid) {
          const daysOverdue = Math.floor(
            (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
          )
          const amountDue = (inv as any).total || computeInvoiceTotal(inv)
          const curr = inv.currency || "USD"

          const dedupKey = `INVOICE_OVERDUE:${inv.id || inv.invoice_number}:${inv.due_date}`
          const res = await createNotification({
            user_id: "all",
            type: "INVOICE_OVERDUE",
            category: "ACCOUNTING",
            priority: daysOverdue > 14 ? "URGENT" : daysOverdue > 7 ? "HIGH" : "NORMAL",
            title: `Invoice ${inv.invoice_number} is Overdue (${daysOverdue} days)`,
            message: `Invoice for ${inv.buyer_name || "Customer"} of ${curr} ${amountDue} was due on ${inv.due_date}.`,
            entity_type: "INVOICE",
            entity_id: inv.invoice_number || inv.id,
            invoice_id: inv.id,
            deduplication_key: dedupKey,
            action_url: `/invoices?id=${inv.id}`,
          })

          if (!res.isDuplicate) {
            newlyCreated++
          }
        }
      }
    }

    // 2. Scan BOLs for delays or status changes
    const bols = await getAllLocalBOLs()
    for (const bol of bols) {
      const bolNo = bol.bol_number || bol.bolNumber || "BOL-N/A"
      const status = bol.status || bol.shipment_status || ""
      const isDelayed =
        bol.isDelayed ||
        status.toLowerCase().includes("delayed") ||
        status.toLowerCase().includes("hold")

      if (isDelayed) {
        const dedupKey = `SHIPMENT_DELAYED:${bol.id || bolNo}:${bol.updated_at || bol.created_at || "latest"}`
        const res = await createNotification({
          user_id: "all",
          type: "SHIPMENT_DELAYED",
          category: "SHIPMENT",
          priority: "HIGH",
          title: `Shipment Delayed: ${bolNo}`,
          message: `BOL ${bolNo} (${bol.consignee || bol.buyer || "Consignee"}) has status: ${status}. Reason: ${bol.delay_reason || "Operational review"}.`,
          entity_type: "BOL",
          entity_id: bolNo,
          bol_id: bol.id,
          deduplication_key: dedupKey,
          action_url: `/bol?id=${bol.id}`,
        })
        if (!res.isDuplicate) newlyCreated++
      }

      // Check if ETA is approaching (within 24 hours) or changed
      if (bol.eta) {
        const etaDate = new Date(bol.eta)
        const diffHours = (etaDate.getTime() - now.getTime()) / (1000 * 60 * 60)
        if (diffHours >= 0 && diffHours <= 24 && status.toLowerCase() !== "delivered") {
          const dedupKey = `ETA_ARRIVING_SOON:${bol.id || bolNo}:${bol.eta.slice(0, 10)}`
          const res = await createNotification({
            user_id: "all",
            type: "ETA_ARRIVING_SOON",
            category: "TRACKING",
            priority: "NORMAL",
            title: `Shipment Arriving Soon: ${bolNo}`,
            message: `BOL ${bolNo} is estimated to arrive within 24 hours (ETA: ${bol.eta}).`,
            entity_type: "BOL",
            entity_id: bolNo,
            bol_id: bol.id,
            deduplication_key: dedupKey,
            action_url: `/tracking?bol=${bolNo}`,
          })
          if (!res.isDuplicate) newlyCreated++
        }
      }
    }

    // 3. Scan Shipment Documents for released packages
    const docs = await getAllShipmentDocuments()
    for (const doc of docs) {
      if (doc.status === "ready" || doc.status === "issued" || doc.status === "approved") {
        const dedupKey = `DOCUMENT_RELEASED:${doc.id}:${doc.updatedAt || doc.createdAt}`
        const res = await createNotification({
          user_id: "all",
          type: "DOCUMENT_READY",
          category: "DOCUMENTS",
          priority: "INFO",
          title: `Document Ready: ${doc.documentType.toUpperCase()}`,
          message: `Document ${doc.documentNumber} for BOL ${doc.bolNumber} has been finalized and is ready for dispatch.`,
          entity_type: "DOCUMENT",
          entity_id: doc.documentNumber,
          document_id: doc.id,
          bol_id: doc.bolNumber,
          deduplication_key: dedupKey,
          action_url: `/shipment-documents?bol=${doc.bolNumber}`,
        })
        if (!res.isDuplicate) newlyCreated++
      }
    }
  } catch (err) {
    console.error("[NotificationCenterService] evaluateSystemEvents error:", err)
  }

  return { newNotificationsCount: newlyCreated }
}
