/**
 * Sky Ariana Daily Operations & End-of-Day Reporting Engine
 * Phase 15 Core Service
 */

import path from 'path'
import { readJsonFile, mutateJsonFile } from '@/lib/services/blob-db'
import { getDataPath } from '@/lib/server-paths'
import {
  DailyTask,
  DailyTaskType,
  DailyTaskPriority,
  DailyTaskStatus,
  DailyTaskDepartment,
  DailyOperationsConfig,
  DailyOperationsSummaryMetrics,
  DailyOperationsReportRecord,
  DailyReportShipmentItem,
  DailyReportBorderItem,
  DailyReportPortItem,
  DailyReportVesselItem,
  DailyReportDocumentItem,
  DailyReportPaymentItem,
  DailyReportOutstandingItem,
  DailyReportSupplierItem,
  DailyReportApprovalItem,
  DailyReportIssueItem,
  CurrencyTotal,
  CollectionNote,
} from '@/lib/types/daily-operations'

// Storage files
const TASKS_FILE = getDataPath('.local-daily-tasks.json')
const REPORTS_FILE = getDataPath('.local-daily-reports.json')
const CONFIG_FILE = getDataPath('.local-daily-ops-settings.json')

// Default operational configuration
export const DEFAULT_DAILY_CONFIG: DailyOperationsConfig = {
  trackingFollowUpHoursRoad: 24,
  trackingFollowUpHoursPort: 48,
  trackingFollowUpHoursSea: 72,
  borderFollowUpHours: 48,
  portFollowUpHours: 72,
  etaReminderDays: 2,
  documentReminderDays: 3,
  customerCollectionReminderDays: 7,
  supplierDueReminderDays: 3,
  autoAssignRules: {
    tracking: 'Tracking',
    documents: 'Documents',
    accounting: 'Accounting',
    operations: 'Operations',
  },
  reportSections: {
    showOperations: true,
    showTracking: true,
    showBorder: true,
    showPort: true,
    showDocuments: true,
    showPayments: true,
    showOutstanding: true,
    showSuppliers: true,
    showApprovals: true,
    showTasks: true,
    showIssues: true,
  },
}

// ============================================================================
// 1. Configuration Management
// ============================================================================

export async function getDailyOperationsConfig(): Promise<DailyOperationsConfig> {
  return await readJsonFile<DailyOperationsConfig>(CONFIG_FILE, DEFAULT_DAILY_CONFIG)
}

export async function updateDailyOperationsConfig(
  updates: Partial<DailyOperationsConfig>
): Promise<DailyOperationsConfig> {
  return await mutateJsonFile<DailyOperationsConfig>(CONFIG_FILE, DEFAULT_DAILY_CONFIG, (current) => ({
    ...current,
    ...updates,
    autoAssignRules: {
      ...current.autoAssignRules,
      ...(updates.autoAssignRules || {}),
    },
    reportSections: {
      ...current.reportSections,
      ...(updates.reportSections || {}),
    },
  }))
}

// ============================================================================
// 2. Task Management & Filtering
// ============================================================================

export interface DailyTaskFilter {
  status?: DailyTaskStatus | DailyTaskStatus[]
  priority?: DailyTaskPriority | DailyTaskPriority[]
  department?: DailyTaskDepartment | DailyTaskDepartment[]
  assignedTo?: string
  taskType?: DailyTaskType | DailyTaskType[]
  entityType?: string
  search?: string
  dueDateRange?: { from?: string; to?: string }
  isOverdue?: boolean
  carriedOverOnly?: boolean
}

export async function getAllDailyTasks(): Promise<DailyTask[]> {
  return await readJsonFile<DailyTask[]>(TASKS_FILE, [])
}

export async function getDailyTasks(filter?: DailyTaskFilter): Promise<DailyTask[]> {
  const allTasks = await getAllDailyTasks()
  const todayStr = new Date().toISOString().split('T')[0]

  let results = allTasks.map((task) => {
    // Dynamically mark as OVERDUE if due_date has passed and not completed/cancelled
    let status = task.status
    if (
      status !== 'COMPLETED' &&
      status !== 'CANCELLED' &&
      task.due_date &&
      task.due_date < todayStr &&
      status !== 'OVERDUE'
    ) {
      status = 'OVERDUE'
    }
    return { ...task, status }
  })

  if (!filter) return results

  if (filter.status) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status]
    results = results.filter((t) => statuses.includes(t.status))
  }

  if (filter.priority) {
    const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority]
    results = results.filter((t) => priorities.includes(t.priority))
  }

  if (filter.department) {
    const depts = Array.isArray(filter.department) ? filter.department : [filter.department]
    results = results.filter((t) => depts.includes(t.assigned_department))
  }

  if (filter.assignedTo) {
    const user = filter.assignedTo.toLowerCase()
    results = results.filter(
      (t) => (t.assigned_to && t.assigned_to.toLowerCase() === user) ||
             (t.assigned_to_name && t.assigned_to_name.toLowerCase().includes(user))
    )
  }

  if (filter.taskType) {
    const types = Array.isArray(filter.taskType) ? filter.taskType : [filter.taskType]
    results = results.filter((t) => types.includes(t.task_type))
  }

  if (filter.entityType) {
    results = results.filter((t) => t.entity_type === filter.entityType)
  }

  if (filter.isOverdue) {
    results = results.filter((t) => t.status === 'OVERDUE' || (t.due_date && t.due_date < todayStr && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'))
  }

  if (filter.carriedOverOnly) {
    // Tasks created before today that remain unresolved
    results = results.filter((t) => {
      const createdDay = (t.created_at || '').split('T')[0]
      return createdDay < todayStr && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
    })
  }

  if (filter.search) {
    const q = filter.search.toLowerCase().trim()
    results = results.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.bol_number && t.bol_number.toLowerCase().includes(q)) ||
        (t.container_number && t.container_number.toLowerCase().includes(q)) ||
        (t.account_name && t.account_name.toLowerCase().includes(q)) ||
        (t.invoice_number && t.invoice_number.toLowerCase().includes(q)) ||
        (t.supplier_name && t.supplier_name.toLowerCase().includes(q))
    )
  }

  return results
}

export async function createDailyTask(
  data: Omit<DailyTask, 'id' | 'created_at' | 'updated_at'>,
  actor = 'System'
): Promise<DailyTask> {
  const now = new Date().toISOString()
  const year = new Date().getFullYear()

  let createdTask: DailyTask | null = null

  await mutateJsonFile<DailyTask[]>(TASKS_FILE, [], (tasks) => {
    // 1. Deduplication check: task_type + entity_id (or explicit deduplication_key)
    const dedupKey = data.deduplication_key || `${data.task_type}::${data.entity_id}`
    const existingIndex = tasks.findIndex(
      (t) => t.deduplication_key === dedupKey && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
    )

    if (existingIndex >= 0) {
      // Update existing task instead of creating duplicate
      const existing = tasks[existingIndex]
      const updated: DailyTask = {
        ...existing,
        ...data,
        id: existing.id,
        deduplication_key: dedupKey,
        updated_at: now,
        priority: data.priority || existing.priority,
        explanation: data.explanation || existing.explanation,
        outstanding_amount: data.outstanding_amount ?? existing.outstanding_amount,
        days_overdue: data.days_overdue ?? existing.days_overdue,
        activity_history: [
          ...(existing.activity_history || []),
          {
            id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: now,
            user: actor,
            action: 'NOTE_ADDED',
            details: `Task refreshed during daily operations scan. Details: ${data.title}`,
          },
        ],
      }
      tasks[existingIndex] = updated
      createdTask = updated
      return tasks
    }

    // Generate readable sequence ID: TSK-YYYY-XXXX
    const count = tasks.length + 1
    const seq = String(count).padStart(4, '0')
    const id = `TSK-${year}-${seq}`

    const newTask: DailyTask = {
      ...data,
      id,
      deduplication_key: dedupKey,
      created_at: now,
      updated_at: now,
      activity_history: [
        {
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: now,
          user: actor,
          action: 'CREATED',
          details: `Task created: ${data.title}`,
        },
      ],
    }

    createdTask = newTask
    return [newTask, ...tasks]
  })

  return createdTask!
}

export async function updateDailyTask(
  id: string,
  updates: Partial<DailyTask>,
  actor = 'User'
): Promise<DailyTask> {
  const now = new Date().toISOString()
  let updatedTask: DailyTask | null = null

  await mutateJsonFile<DailyTask[]>(TASKS_FILE, [], (tasks) => {
    const idx = tasks.findIndex((t) => t.id === id)
    if (idx === 0 || idx > 0) {
      const current = tasks[idx]
      const activity = [...(current.activity_history || [])]

      if (updates.status && updates.status !== current.status) {
        activity.push({
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: now,
          user: actor,
          action: 'STATUS_CHANGED',
          details: `Status changed from ${current.status} to ${updates.status}`,
        })
      }

      if (updates.priority && updates.priority !== current.priority) {
        activity.push({
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: now,
          user: actor,
          action: 'PRIORITY_CHANGED',
          details: `Priority changed from ${current.priority} to ${updates.priority}`,
        })
      }

      if (updates.assigned_to && updates.assigned_to !== current.assigned_to) {
        activity.push({
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: now,
          user: actor,
          action: 'ASSIGNED',
          details: `Assigned to ${updates.assigned_to_name || updates.assigned_to}`,
        })
      }

      const completedAt =
        updates.status === 'COMPLETED' ? now : current.completed_at
      const completedBy =
        updates.status === 'COMPLETED' ? actor : current.completed_by

      const updated: DailyTask = {
        ...current,
        ...updates,
        id: current.id,
        updated_at: now,
        completed_at: completedAt,
        completed_by: completedBy,
        activity_history: activity,
      }

      tasks[idx] = updated
      updatedTask = updated
    }
    return tasks
  })

  if (!updatedTask) {
    throw new Error(`Task ${id} not found`)
  }

  return updatedTask
}

export async function addCollectionNote(
  taskId: string,
  noteData: Omit<CollectionNote, 'id'>,
  actor = 'Accountant'
): Promise<DailyTask> {
  const noteId = `cn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const now = new Date().toISOString()
  const fullNote: CollectionNote = { id: noteId, ...noteData }

  let updatedTask: DailyTask | null = null

  await mutateJsonFile<DailyTask[]>(TASKS_FILE, [], (tasks) => {
    const idx = tasks.findIndex((t) => t.id === taskId)
    if (idx >= 0) {
      const current = tasks[idx]
      const notes = [fullNote, ...(current.collection_notes || [])]
      const activity = [
        ...(current.activity_history || []),
        {
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: now,
          user: actor,
          action: 'NOTE_ADDED' as const,
          details: `Collection follow-up recorded: ${noteData.contactMethod} - ${noteData.note.slice(0, 50)}${noteData.promisedDate ? ` (Promise: ${noteData.promisedDate})` : ''}`,
        },
      ]

      const updated: DailyTask = {
        ...current,
        collection_notes: notes,
        last_follow_up_date: noteData.date,
        promised_payment_date: noteData.promisedDate || current.promised_payment_date,
        follow_up_date: noteData.promisedDate || current.follow_up_date,
        updated_at: now,
        activity_history: activity,
      }
      tasks[idx] = updated
      updatedTask = updated
    }
    return tasks
  })

  if (!updatedTask) throw new Error(`Task ${taskId} not found`)
  return updatedTask
}

// ============================================================================
// 3. Automatic Task Generation Engine
// ============================================================================

/**
 * Evaluates active database records against operational thresholds.
 * Strictly avoids duplicate task creation via stable deduplication keys.
 */
export async function generateAutomaticDailyTasks(actor = 'System Engine'): Promise<{
  createdCount: number
  updatedCount: number
  totalActiveTasks: number
}> {
  const config = await getDailyOperationsConfig()
  const now = new Date()
  const nowMs = now.getTime()
  const todayStr = now.toISOString().split('T')[0]

  // Read operational database collections
  const [
    shipments,
    bols,
    invoices,
    accounts,
    documentsDb,
    approvals,
    supplierBills,
  ] = await Promise.all([
    readJsonFile<any[]>(getDataPath('.local-shipments.json'), []),
    readJsonFile<any[]>(getDataPath('.local-bols.json'), []),
    readJsonFile<any[]>(getDataPath('.local-invoices.json'), []),
    readJsonFile<any[]>(getDataPath('.local-accounts.json'), []),
    readJsonFile<any>(getDataPath('document-compliance.json'), { documents: [], versions: [] }),
    readJsonFile<any[]>(getDataPath('.local-approval-requests.json'), []),
    readJsonFile<any[]>(getDataPath('.local-supplier-bills.json'), []),
  ])

  let createdCount = 0
  let updatedCount = 0

  // --------------------------------------------------------------------------
  // Rule 1: Tracking Reminders (Road: 24h, Port: 48h, Sea: 72h)
  // --------------------------------------------------------------------------
  for (const s of shipments) {
    if (s.status === 'delivered' || s.status === 'cancelled' || s.status === 'draft') continue

    const lastUpdateDate = s.updatedAt || s.createdAt || s.date
    const lastUpdateMs = lastUpdateDate ? new Date(lastUpdateDate).getTime() : nowMs
    const hoursSinceUpdate = Math.round((nowMs - lastUpdateMs) / (1000 * 60 * 60))

    const isRoad = s.status === 'in_transit' || s.status === 'cargo_loaded'
    const isPort = s.status === 'at_port' || s.status === 'container_loading'
    const isSea = s.status === 'on_vessel' || s.status === 'vessel_departed'

    let thresholdHours = config.trackingFollowUpHoursRoad
    let stageName = 'Road Transit'
    let taskType: DailyTaskType = 'TRACKING_UPDATE_REQUIRED'

    if (isPort) {
      thresholdHours = config.trackingFollowUpHoursPort
      stageName = 'Port'
      taskType = 'PORT_FOLLOWUP'
    } else if (isSea) {
      thresholdHours = config.trackingFollowUpHoursSea
      stageName = 'Sea Passage'
      taskType = 'VESSEL_FOLLOWUP'
    }

    if (hoursSinceUpdate >= thresholdHours) {
      const dedupKey = `${taskType}::${s.id || s.referenceNumber}`
      const res = await createDailyTask(
        {
          task_type: taskType,
          title: `Tracking Update Required: ${s.referenceNumber || s.bolNumber} (${s.shipper?.name || 'Cargo'})`,
          description: `Shipment at ${stageName} has had no confirmed update for ${hoursSinceUpdate} hours (configured threshold: ${thresholdHours}h). Current location: ${s.currentLocation || 'Unknown'}.`,
          explanation: `Tracking follow-up required because the last confirmed status update was ${hoursSinceUpdate} hours ago. Configured policy requires an update every ${thresholdHours} hours during ${stageName}.`,
          entity_type: 'shipment',
          entity_id: s.id || s.referenceNumber,
          bol_id: s.bolId || s.bolNumber,
          bol_number: s.bolNumber || s.referenceNumber,
          shipment_id: s.id,
          shipment_ref: s.referenceNumber,
          container_number: s.container?.containerNumber || s.containerNumber,
          assigned_department: config.autoAssignRules.tracking,
          priority: hoursSinceUpdate > thresholdHours * 1.5 ? 'HIGH' : 'NORMAL',
          status: 'OPEN',
          source: 'AUTOMATIC',
          deduplication_key: dedupKey,
          due_date: todayStr,
        },
        actor
      )
      if (res.activity_history?.length === 1) createdCount++
      else updatedCount++
    }

    // ------------------------------------------------------------------------
    // Rule 2: Border Delays (Islam Qala, Torghundi, Hairatan, Spin Boldak)
    // ------------------------------------------------------------------------
    if (s.status === 'at_border' || s.status === 'customs_pending') {
      const borderHours = hoursSinceUpdate
      if (borderHours >= config.borderFollowUpHours) {
        const dedupKey = `BORDER_FOLLOWUP::${s.id || s.referenceNumber}`
        const res = await createDailyTask(
          {
            task_type: 'BORDER_FOLLOWUP',
            title: `Border Follow-Up: ${s.referenceNumber || s.bolNumber} held at ${s.currentLocation || 'Border Station'}`,
            description: `Truck plate ${s.truck?.afghanPlate || 'Unknown'} has been waiting at border for ${borderHours} hours (threshold: ${config.borderFollowUpHours}h). Driver: ${s.truck?.driverName || 'N/A'}.`,
            explanation: `Border clearance delay: shipment has been queued for ${borderHours} hours without forward transit confirmation.`,
            entity_type: 'shipment',
            entity_id: s.id || s.referenceNumber,
            bol_number: s.bolNumber || s.referenceNumber,
            shipment_id: s.id,
            container_number: s.container?.containerNumber,
            assigned_department: config.autoAssignRules.operations,
            priority: borderHours > config.borderFollowUpHours * 2 ? 'URGENT' : 'HIGH',
            status: 'OPEN',
            source: 'AUTOMATIC',
            deduplication_key: dedupKey,
            due_date: todayStr,
          },
          actor
        )
        if (res.activity_history?.length === 1) createdCount++
        else updatedCount++
      }
    }

    // ------------------------------------------------------------------------
    // Rule 3: ETA Follow-up & Arrival Confirmation
    // ------------------------------------------------------------------------
    if (s.vessel?.eta || s.eta) {
      const etaStr = (s.vessel?.eta || s.eta || '').split('T')[0]
      const diffDays = Math.round(
        (new Date(etaStr).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
      )

      if (diffDays < 0 && s.status !== 'arrived_destination' && s.status !== 'customs_cleared') {
        const dedupKey = `ETA_PASSED::${s.id || s.referenceNumber}`
        const res = await createDailyTask(
          {
            task_type: 'ETA_FOLLOWUP',
            title: `Arrival Confirmation Required: ${s.referenceNumber} ETA was ${etaStr}`,
            description: `Planned arrival date (${etaStr}) has passed by ${Math.abs(diffDays)} days without arrival confirmation at ${s.destination || 'destination'}.`,
            explanation: `ETA passed follow-up: destination arrival event has not been posted despite passing scheduled ETA.`,
            entity_type: 'shipment',
            entity_id: s.id || s.referenceNumber,
            bol_number: s.bolNumber || s.referenceNumber,
            shipment_id: s.id,
            container_number: s.container?.containerNumber,
            assigned_department: config.autoAssignRules.tracking,
            priority: 'URGENT',
            status: 'OPEN',
            source: 'AUTOMATIC',
            deduplication_key: dedupKey,
            due_date: todayStr,
          },
          actor
        )
        if (res.activity_history?.length === 1) createdCount++
        else updatedCount++
      } else if (diffDays >= 0 && diffDays <= config.etaReminderDays) {
        const dedupKey = `ETA_APPROACHING::${s.id || s.referenceNumber}`
        const res = await createDailyTask(
          {
            task_type: 'ETA_FOLLOWUP',
            title: `ETA Approaching: ${s.referenceNumber} arriving ${diffDays === 0 ? 'TODAY' : `in ${diffDays} day(s)`}`,
            description: `Vessel/Cargo scheduled to arrive at ${s.destination || 'destination port'} on ${etaStr}. Verify berthing and customs readiness.`,
            explanation: `Approaching ETA alert (${diffDays} days away).`,
            entity_type: 'shipment',
            entity_id: s.id || s.referenceNumber,
            bol_number: s.bolNumber || s.referenceNumber,
            shipment_id: s.id,
            assigned_department: config.autoAssignRules.operations,
            priority: diffDays === 0 ? 'HIGH' : 'NORMAL',
            status: 'OPEN',
            source: 'AUTOMATIC',
            deduplication_key: dedupKey,
            due_date: etaStr,
          },
          actor
        )
        if (res.activity_history?.length === 1) createdCount++
        else updatedCount++
      }
    }

    // ------------------------------------------------------------------------
    // Rule 4: Data Quality & Missing Critical Identifiers
    // ------------------------------------------------------------------------
    if (
      s.status !== 'draft' &&
      s.status !== 'cancelled' &&
      (!s.container?.containerNumber || s.container?.containerNumber.trim() === '')
    ) {
      const dedupKey = `MISSING_CONTAINER::${s.id || s.referenceNumber}`
      const res = await createDailyTask(
        {
          task_type: 'MISSING_CONTAINER_NUMBER',
          title: `Missing Container Number: ${s.referenceNumber || s.bolNumber}`,
          description: `Shipment is active in "${s.status}" stage but container ID is not assigned. Required for port handling and tracking.`,
          explanation: `Data quality rule: active multi-modal freight requires confirmed container number.`,
          entity_type: 'shipment',
          entity_id: s.id || s.referenceNumber,
          bol_number: s.bolNumber || s.referenceNumber,
          shipment_id: s.id,
          assigned_department: config.autoAssignRules.operations,
          priority: 'HIGH',
          status: 'OPEN',
          source: 'AUTOMATIC',
          deduplication_key: dedupKey,
          due_date: todayStr,
        },
        actor
      )
      if (res.activity_history?.length === 1) createdCount++
      else updatedCount++
    }
  }

  // --------------------------------------------------------------------------
  // Rule 5: Document Incompleteness & Missing Requirements
  // --------------------------------------------------------------------------
  const allDocs = documentsDb.documents || []
  for (const b of bols) {
    if (!b.bolNumber) continue

    const bDocs = allDocs.filter((d: any) => d.bolId === b.id || d.bolNumber === b.bolNumber)
    const requiredTypes = ['COMMERCIAL_INVOICE', 'PACKING_LIST', 'TRANSIT_PAPER']

    for (const reqType of requiredTypes) {
      const match = bDocs.find((d: any) => d.type === reqType && !d.isArchived)
      const missingItems: string[] = []

      let isIncomplete = false
      let docTitle = reqType.replace(/_/g, ' ')

      if (!match) {
        isIncomplete = true
        missingItems.push(`Document draft not created`)
      } else if (match.status === 'DRAFT' || match.status === 'PENDING') {
        if (!b.grossWeight && !b.grossWeightKg) missingItems.push('Gross Weight')
        if (!b.containers?.[0]?.sealNumber && !b.sealNumber) missingItems.push('Seal Number')
        if (!b.consignee?.name && !b.consigneeName) missingItems.push('Consignee Details')
        isIncomplete = missingItems.length > 0 || match.status === 'DRAFT'
      }

      if (isIncomplete) {
        const dedupKey = `DOC_INCOMPLETE::${b.id || b.bolNumber}::${reqType}`
        const res = await createDailyTask(
          {
            task_type: 'DOCUMENT_INCOMPLETE',
            title: `Document Incomplete: ${docTitle} for BOL ${b.bolNumber}`,
            description: `Required export documentation is incomplete. Missing: ${missingItems.length ? missingItems.join(', ') : 'Finalization & Sign-off'}.`,
            explanation: `Document readiness rule: border clearance requires finalized ${docTitle}.`,
            entity_type: 'document',
            entity_id: `${b.bolNumber}-${reqType}`,
            bol_id: b.id,
            bol_number: b.bolNumber,
            account_name: b.shipper?.name || b.shipperName,
            missing_items: missingItems,
            assigned_department: config.autoAssignRules.documents,
            priority: 'HIGH',
            status: 'OPEN',
            source: 'AUTOMATIC',
            deduplication_key: dedupKey,
            due_date: todayStr,
          },
          actor
        )
        if (res.activity_history?.length === 1) createdCount++
        else updatedCount++
      }
    }
  }

  // --------------------------------------------------------------------------
  // Rule 6: Customer Overdue Invoices & Collection Follow-Ups
  // --------------------------------------------------------------------------
  for (const inv of invoices) {
    if (inv.status === 'paid' || inv.isPaid) continue

    const dueDate = inv.due_date || inv.dueDate
    if (!dueDate) continue

    const daysOverdue = Math.round(
      (new Date(todayStr).getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysOverdue > 0) {
      const outstanding = Number(inv.total_amount || inv.totalAmount || inv.amount || 0) - Number(inv.paid_amount || inv.paidAmount || 0)
      if (outstanding <= 0) continue

      const currency = inv.currency || 'USD'
      const customerName = inv.buyer_name || inv.buyerName || inv.clientName || 'Customer'
      const dedupKey = `INV_OVERDUE::${inv.id || inv.invoice_number}`

      const res = await createDailyTask(
        {
          task_type: 'CUSTOMER_PAYMENT_FOLLOWUP',
          title: `Payment Follow-Up: ${customerName} (${outstanding.toLocaleString()} ${currency})`,
          description: `Invoice ${inv.invoice_number} is overdue by ${daysOverdue} days. Total outstanding: ${outstanding.toLocaleString()} ${currency}.`,
          explanation: `Financial collection rule: invoice exceeded due date (${dueDate}) without full settlement.`,
          entity_type: 'invoice',
          entity_id: inv.id || inv.invoice_number,
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          account_name: customerName,
          outstanding_amount: outstanding,
          currency,
          days_overdue: daysOverdue,
          assigned_department: config.autoAssignRules.accounting,
          priority: daysOverdue > 14 ? 'URGENT' : daysOverdue > 7 ? 'HIGH' : 'NORMAL',
          status: 'OPEN',
          source: 'AUTOMATIC',
          deduplication_key: dedupKey,
          due_date: todayStr,
        },
        actor
      )
      if (res.activity_history?.length === 1) createdCount++
      else updatedCount++
    }
  }

  // --------------------------------------------------------------------------
  // Rule 7: Supplier Bills Due / Overdue
  // --------------------------------------------------------------------------
  for (const sb of supplierBills) {
    if (sb.status === 'PAID') continue

    const dueDate = sb.dueDate || sb.due_date
    if (!dueDate) continue

    const diffDays = Math.round(
      (new Date(dueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays <= config.supplierDueReminderDays) {
      const outstanding = Number(sb.outstandingAmount || sb.totalAmount || 0)
      if (outstanding <= 0) continue

      const currency = sb.currency || 'USD'
      const supplierName = sb.supplierName || 'Supplier'
      const isOverdue = diffDays < 0
      const dedupKey = `SUPPLIER_DUE::${sb.id || sb.billNumber}`

      const res = await createDailyTask(
        {
          task_type: 'SUPPLIER_PAYMENT_DUE',
          title: `Supplier Bill Due: ${supplierName} (${outstanding.toLocaleString()} ${currency})`,
          description: `Bill ${sb.billNumber || sb.id} for ${supplierName} is ${isOverdue ? `overdue by ${Math.abs(diffDays)} days` : diffDays === 0 ? 'due TODAY' : `due in ${diffDays} days`}.`,
          explanation: `Accounts payable reminder: supplier bill requires scheduling and payment authorization.`,
          entity_type: 'supplier_bill',
          entity_id: sb.id || sb.billNumber,
          supplier_bill_id: sb.id,
          supplier_name: supplierName,
          bol_number: sb.bolNumber,
          outstanding_amount: outstanding,
          currency,
          days_overdue: isOverdue ? Math.abs(diffDays) : 0,
          assigned_department: config.autoAssignRules.accounting,
          priority: isOverdue ? 'HIGH' : 'NORMAL',
          status: 'OPEN',
          source: 'AUTOMATIC',
          deduplication_key: dedupKey,
          due_date: dueDate,
        },
        actor
      )
      if (res.activity_history?.length === 1) createdCount++
      else updatedCount++
    }
  }

  // --------------------------------------------------------------------------
  // Rule 8: Pending Four-Eyes Approvals
  // --------------------------------------------------------------------------
  for (const app of approvals) {
    if (app.status === 'PENDING') {
      const dedupKey = `APPROVAL_PENDING::${app.id}`
      const waitHours = Math.round((nowMs - new Date(app.created_at).getTime()) / (1000 * 60 * 60))

      const res = await createDailyTask(
        {
          task_type: 'APPROVAL_REQUIRED',
          title: `Approval Required: ${app.request_type} (${(app.amount || 0).toLocaleString()} ${app.currency || 'USD'})`,
          description: `Requested by ${app.requested_by_name || app.requested_by} for ${app.entity_type} (${app.entity_ref || app.entity_id}). Waiting for ${waitHours} hours.`,
          explanation: `Governance rule: sensitive action requires authorized manager approval under Four-Eyes policy.`,
          entity_type: 'approval',
          entity_id: app.id,
          approval_id: app.id,
          outstanding_amount: app.amount,
          currency: app.currency,
          assigned_department: 'Management',
          priority: waitHours > 24 ? 'URGENT' : 'HIGH',
          status: 'OPEN',
          source: 'AUTOMATIC',
          deduplication_key: dedupKey,
          due_date: todayStr,
        },
        actor
      )
      if (res.activity_history?.length === 1) createdCount++
      else updatedCount++
    }
  }

  const allActive = await getDailyTasks({ status: ['OPEN', 'IN PROGRESS', 'WAITING', 'OVERDUE'] })

  return {
    createdCount,
    updatedCount,
    totalActiveTasks: allActive.length,
  }
}

// ============================================================================
// 4. Automatic Task Auto-Resolver
// ============================================================================

/**
 * Checks open tasks and automatically marks them COMPLETED when the underlying
 * issue has been resolved in the database.
 */
export async function autoResolveDailyTasks(actor = 'System Engine'): Promise<number> {
  const openTasks = await getDailyTasks({ status: ['OPEN', 'IN PROGRESS', 'WAITING', 'OVERDUE'] })
  if (openTasks.length === 0) return 0

  const [shipments, invoices, documentsDb, approvals] = await Promise.all([
    readJsonFile<any[]>(getDataPath('.local-shipments.json'), []),
    readJsonFile<any[]>(getDataPath('.local-invoices.json'), []),
    readJsonFile<any>(getDataPath('document-compliance.json'), { documents: [] }),
    readJsonFile<any[]>(getDataPath('.local-approval-requests.json'), []),
  ])

  let resolvedCount = 0

  for (const task of openTasks) {
    let shouldResolve = false
    let resolveNote = ''

    // 1. Missing Container: check if container number was added
    if (task.task_type === 'MISSING_CONTAINER_NUMBER') {
      const s = shipments.find((item) => item.id === task.entity_id || item.referenceNumber === task.entity_id)
      if (s && (s.container?.containerNumber || s.containerNumber)) {
        shouldResolve = true
        resolveNote = `Container number ${s.container?.containerNumber || s.containerNumber} was assigned to shipment.`
      }
    }

    // 2. Overdue Invoice / Customer follow-up: check if invoice was paid
    else if (task.task_type === 'CUSTOMER_PAYMENT_FOLLOWUP' || task.task_type === 'INVOICE_FOLLOWUP') {
      const inv = invoices.find((i) => i.id === task.entity_id || i.invoice_number === task.entity_id)
      if (inv && (inv.status === 'paid' || inv.isPaid)) {
        shouldResolve = true
        resolveNote = `Invoice ${inv.invoice_number} has been settled in full.`
      }
    }

    // 3. Document Incomplete: check if document was finalized
    else if (task.task_type === 'DOCUMENT_INCOMPLETE') {
      const allDocs = documentsDb.documents || []
      const [bolNum, docType] = (task.entity_id || '').split('-')
      const doc = allDocs.find((d: any) => d.bolNumber === bolNum && d.type === docType && !d.isArchived)
      if (doc && (doc.status === 'COMPLETED' || doc.status === 'VERIFIED')) {
        shouldResolve = true
        resolveNote = `Document ${docType} has been finalized and verified.`
      }
    }

    // 4. Approval Required: check if approval is no longer PENDING
    else if (task.task_type === 'APPROVAL_REQUIRED') {
      const app = approvals.find((a) => a.id === task.entity_id)
      if (app && app.status !== 'PENDING') {
        shouldResolve = true
        resolveNote = `Approval request was ${app.status.toLowerCase()} by ${app.action_by_name || 'approver'}.`
      }
    }

    if (shouldResolve) {
      await updateDailyTask(
        task.id,
        {
          status: 'COMPLETED',
          completion_note: resolveNote,
        },
        actor
      )
      resolvedCount++
    }
  }

  return resolvedCount
}

// ============================================================================
// 5. End-of-Day Status Report Generator & History
// ============================================================================

export async function getAllDailyReports(): Promise<DailyOperationsReportRecord[]> {
  return await readJsonFile<DailyOperationsReportRecord[]>(REPORTS_FILE, [])
}

export async function generateDailyOperationsReport(
  reportDate?: string,
  actor = 'Operations Manager',
  options: { managementNote?: string; forceRegenerate?: boolean } = {}
): Promise<DailyOperationsReportRecord> {
  const targetDate = reportDate || new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()

  const allReports = await getAllDailyReports()
  const existingForDate = allReports.filter((r) => r.reportDate === targetDate)

  // If a finalized report already exists and forceRegenerate is false, return the finalized snapshot
  const finalized = existingForDate.find((r) => r.status === 'FINAL')
  if (finalized && !options.forceRegenerate) {
    return finalized
  }

  // Next version number for this date
  const version = existingForDate.length > 0 ? Math.max(...existingForDate.map((r) => r.version)) + 1 : 1

  // Gather live database data
  const [
    shipments,
    bols,
    invoices,
    accounts,
    documentsDb,
    approvals,
    supplierBills,
    tasks,
  ] = await Promise.all([
    readJsonFile<any[]>(getDataPath('.local-shipments.json'), []),
    readJsonFile<any[]>(getDataPath('.local-bols.json'), []),
    readJsonFile<any[]>(getDataPath('.local-invoices.json'), []),
    readJsonFile<any[]>(getDataPath('.local-accounts.json'), []),
    readJsonFile<any>(getDataPath('document-compliance.json'), { documents: [] }),
    readJsonFile<any[]>(getDataPath('.local-approval-requests.json'), []),
    readJsonFile<any[]>(getDataPath('.local-supplier-bills.json'), []),
    getAllDailyTasks(),
  ])

  // 1. Operations & Shipments
  const activeShipments = shipments.filter(
    (s) => s.status !== 'delivered' && s.status !== 'cancelled' && s.status !== 'draft'
  )

  const opItems: DailyReportShipmentItem[] = activeShipments.map((s) => ({
    bolNumber: s.bolNumber || s.referenceNumber || 'N/A',
    containerNumber: s.container?.containerNumber || s.containerNumber || 'PENDING',
    origin: s.origin || 'Kandahar',
    destination: s.destination || 'Nhava Sheva',
    currentLocation: s.currentLocation || 'In Transit',
    status: s.status,
    latestUpdate: s.updatedAt || s.createdAt || now,
    nextDestination: s.nextStop || s.destination,
    eta: s.vessel?.eta || s.eta,
    carrier: s.vessel?.shippingLine || s.truck?.driverName,
  }))

  // 2. Border Trucks & Containers
  const borderItems: DailyReportBorderItem[] = shipments
    .filter((s) => s.status === 'at_border' || s.status === 'customs_pending')
    .map((s) => {
      const waitHours = s.updatedAt
        ? Math.round((new Date(now).getTime() - new Date(s.updatedAt).getTime()) / (1000 * 60 * 60))
        : 24
      return {
        bolNumber: s.bolNumber || s.referenceNumber,
        truckPlate: s.truck?.afghanPlate || 'N/A',
        driverName: s.truck?.driverName || 'N/A',
        borderName: s.currentLocation || 'Islam Qala Border',
        arrivalDate: (s.updatedAt || now).split('T')[0],
        waitingDurationHours: waitHours,
        status: s.status,
      }
    })

  // 3. Port Operations
  const portItems: DailyReportPortItem[] = shipments
    .filter((s) => s.status === 'at_port' || s.status === 'container_loading')
    .map((s) => ({
      bolNumber: s.bolNumber || s.referenceNumber,
      containerNumber: s.container?.containerNumber || 'N/A',
      portName: s.currentLocation || 'Bandar Abbas',
      status: s.status,
      vesselName: s.vessel?.vesselName,
      voyageNumber: s.vessel?.voyageNumber,
      etd: s.vessel?.etd,
      eta: s.vessel?.eta,
    }))

  // 4. Vessels in Sea Transit
  const vesselItems: DailyReportVesselItem[] = shipments
    .filter((s) => s.status === 'on_vessel' || s.status === 'vessel_departed')
    .map((s) => ({
      vesselName: s.vessel?.vesselName || 'Ocean Vessel',
      voyageNumber: s.vessel?.voyageNumber || 'N/A',
      shippingLine: s.vessel?.shippingLine || 'MSC',
      containerCount: 1,
      etd: s.vessel?.etd,
      eta: s.vessel?.eta,
      destinationPort: s.destination || 'Jebel Ali',
    }))

  // 5. Incomplete / Pending Documents
  const allDocs = documentsDb.documents || []
  const docItems: DailyReportDocumentItem[] = allDocs
    .filter((d: any) => !d.isArchived && d.status !== 'COMPLETED')
    .map((d: any) => ({
      bolNumber: d.bolNumber || 'N/A',
      customerName: d.shipperName || 'Client',
      documentName: d.name || d.type,
      status: d.status,
      missingItems: d.missingFields || ['Sign-off Required'],
      dueDate: d.dueDate || targetDate,
    }))

  // 6. Customer Payments (Demarcated Multi-Currency)
  const paymentTotalsMap = new Map<string, number>()
  const customerPaymentItems: DailyReportPaymentItem[] = []

  // Extract from invoices that recorded payments on target date
  for (const inv of invoices) {
    if (inv.payments && Array.isArray(inv.payments)) {
      for (const p of inv.payments) {
        const pDate = (p.date || '').split('T')[0]
        if (pDate === targetDate) {
          const amt = Number(p.amount || 0)
          const curr = p.currency || inv.currency || 'USD'
          paymentTotalsMap.set(curr, (paymentTotalsMap.get(curr) || 0) + amt)
          customerPaymentItems.push({
            customerName: inv.buyer_name || inv.clientName || 'Client',
            amount: amt,
            currency: curr,
            reference: p.reference || p.id || 'Bank Transfer',
            invoiceNumber: inv.invoice_number,
            date: pDate,
          })
        }
      }
    }
  }

  const customerPaymentTotals: CurrencyTotal[] = Array.from(paymentTotalsMap.entries()).map(
    ([currency, amount]) => ({ currency, amount })
  )

  // 7. Outstanding Customer Accounts & Overdue Invoices
  const outstandingTotalsMap = new Map<string, number>()
  const outstandingItems: DailyReportOutstandingItem[] = []

  for (const inv of invoices) {
    if (inv.status !== 'paid' && !inv.isPaid) {
      const outstanding =
        Number(inv.total_amount || inv.amount || 0) - Number(inv.paid_amount || 0)
      if (outstanding > 0) {
        const curr = inv.currency || 'USD'
        outstandingTotalsMap.set(curr, (outstandingTotalsMap.get(curr) || 0) + outstanding)

        const dueDate = inv.due_date || inv.dueDate || targetDate
        const daysOver = Math.max(
          0,
          Math.round(
            (new Date(targetDate).getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)
          )
        )

        outstandingItems.push({
          customerName: inv.buyer_name || inv.clientName || 'Client',
          invoiceNumber: inv.invoice_number || inv.id,
          outstandingAmount: outstanding,
          currency: curr,
          daysOverdue: daysOver,
          nextAction: daysOver > 7 ? 'Legal / Direct Call' : 'WhatsApp Statement Reminder',
        })
      }
    }
  }

  const outstandingTotals: CurrencyTotal[] = Array.from(outstandingTotalsMap.entries()).map(
    ([currency, amount]) => ({ currency, amount })
  )

  // 8. Supplier Payments & Payables
  const supplierTotalsMap = new Map<string, number>()
  const supplierItems: DailyReportSupplierItem[] = supplierBills.map((sb) => {
    const total = Number(sb.totalAmount || 0)
    const paid = Number(sb.paidAmount || 0)
    const outstanding = Number(sb.outstandingAmount || total - paid)
    const curr = sb.currency || 'USD'

    if (outstanding > 0) {
      supplierTotalsMap.set(curr, (supplierTotalsMap.get(curr) || 0) + outstanding)
    }

    const dueDate = sb.dueDate || targetDate
    const diff = Math.round(
      (new Date(dueDate).getTime() - new Date(targetDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    let status: 'DUE_SOON' | 'DUE_TODAY' | 'OVERDUE' | 'PAID' = 'DUE_SOON'
    if (outstanding <= 0) status = 'PAID'
    else if (diff < 0) status = 'OVERDUE'
    else if (diff === 0) status = 'DUE_TODAY'

    return {
      supplierName: sb.supplierName || 'Carrier / Agent',
      billNumber: sb.billNumber || sb.id,
      bolNumber: sb.bolNumber,
      totalAmount: total,
      paidAmount: paid,
      outstandingAmount: outstanding,
      currency: curr,
      dueDate,
      status,
    }
  })

  const supplierTotals: CurrencyTotal[] = Array.from(supplierTotalsMap.entries()).map(
    ([currency, amount]) => ({ currency, amount })
  )

  // 9. Approvals
  const approvalItems: DailyReportApprovalItem[] = approvals.map((app) => ({
    type: app.request_type,
    amount: app.amount || 0,
    currency: app.currency || 'USD',
    requester: app.requested_by_name || app.requested_by,
    waitingDurationHours: Math.round(
      (new Date(now).getTime() - new Date(app.created_at).getTime()) / (1000 * 60 * 60)
    ),
    status: app.status,
  }))

  // 10. Task Progress
  const completedToday = tasks.filter(
    (t) => t.status === 'COMPLETED' && (t.completed_at || '').split('T')[0] === targetDate
  ).length
  const openTasksCount = tasks.filter((t) => t.status === 'OPEN' || t.status === 'IN PROGRESS').length
  const overdueTasksCount = tasks.filter((t) => t.status === 'OVERDUE').length
  const dueTomorrowCount = tasks.filter((t) => {
    const tomorrowStr = new Date(new Date(targetDate).getTime() + 86400000).toISOString().split('T')[0]
    return t.due_date === tomorrowStr && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
  }).length

  // 11. Critical Issues & Alerts
  const issues: DailyReportIssueItem[] = []
  if (borderItems.some((b) => b.waitingDurationHours > 48)) {
    issues.push({
      severity: 'CRITICAL',
      category: 'SHIPMENT',
      title: 'Severe Border Clearance Congestion',
      description: `${borderItems.filter((b) => b.waitingDurationHours > 48).length} truck(s) delayed at border customs for >48 hours.`,
    })
  }
  if (outstandingItems.some((o) => o.daysOverdue > 14)) {
    issues.push({
      severity: 'CRITICAL',
      category: 'FINANCE',
      title: 'High-Risk Customer Receivables (>14 Days Overdue)',
      description: `${outstandingItems.filter((o) => o.daysOverdue > 14).length} customer invoice(s) severely overdue.`,
    })
  }
  if (docItems.length > 5) {
    issues.push({
      severity: 'WARNING',
      category: 'DOCUMENT',
      title: 'Documentation Backlog',
      description: `${docItems.length} documents remain unfinalized across active shipments.`,
    })
  }

  // Summary Metrics
  const summary: DailyOperationsSummaryMetrics = {
    activeShipments: activeShipments.length,
    updatesNeeded: opItems.filter((i) => i.status === 'in_transit').length,
    atBorder: borderItems.length,
    atPort: portItems.length,
    atSea: vesselItems.length,
    arrivingSoon: opItems.filter((i) => i.eta && i.eta >= targetDate).length,
    documentsPending: docItems.length,
    invoicesOverdue: outstandingItems.filter((i) => i.daysOverdue > 0).length,
    customerFollowUps: outstandingItems.length,
    supplierPaymentsDue: supplierItems.filter((i) => i.status === 'DUE_TODAY' || i.status === 'OVERDUE').length,
    pendingApprovals: approvalItems.filter((i) => i.status === 'PENDING').length,
    criticalIssues: issues.filter((i) => i.severity === 'CRITICAL').length,

    tasksCompletedToday: completedToday,
    tasksOpenToday: openTasksCount,
    trackingUpdatesAddedToday: opItems.length,
    documentsFinalizedToday: allDocs.filter((d: any) => (d.updatedAt || '').split('T')[0] === targetDate).length,
    paymentsRecordedToday: customerPaymentItems.length,
    bolsCreatedToday: bols.filter((b: any) => (b.createdAt || b.date || '').split('T')[0] === targetDate).length,
  }

  const reportId = `DOP-${targetDate.replace(/-/g, '')}-V${version}`
  const report: DailyOperationsReportRecord = {
    id: reportId,
    reportDate: targetDate,
    version,
    status: 'DRAFT',
    generatedAt: now,
    generatedBy: actor,
    managementNote: options.managementNote,
    summary,
    operations: opItems,
    border: borderItems,
    port: portItems,
    vessel: vesselItems,
    documents: docItems,
    customerPayments: customerPaymentItems,
    customerPaymentTotals,
    outstanding: outstandingItems,
    outstandingTotals,
    supplierPayments: supplierItems,
    supplierTotals,
    approvals: approvalItems,
    tasks: {
      completedCount: completedToday,
      openCount: openTasksCount,
      overdueCount: overdueTasksCount,
      dueTomorrowCount,
    },
    issues,
  }

  // Save report record
  await mutateJsonFile<DailyOperationsReportRecord[]>(REPORTS_FILE, [], (current) => {
    const filtered = current.filter((r) => r.id !== reportId)
    return [report, ...filtered]
  })

  return report
}

export async function finalizeDailyReport(
  reportId: string,
  actor = 'Authorized Director'
): Promise<DailyOperationsReportRecord> {
  const now = new Date().toISOString()
  let finalizedReport: DailyOperationsReportRecord | null = null

  await mutateJsonFile<DailyOperationsReportRecord[]>(REPORTS_FILE, [], (reports) => {
    const idx = reports.findIndex((r) => r.id === reportId)
    if (idx >= 0) {
      const cur = reports[idx]
      const updated: DailyOperationsReportRecord = {
        ...cur,
        status: 'FINAL',
        finalizedAt: now,
        finalizedBy: actor,
      }
      reports[idx] = updated
      finalizedReport = updated
    }
    return reports
  })

  if (!finalizedReport) throw new Error(`Report ${reportId} not found`)
  return finalizedReport
}

// ============================================================================
// 6. Multilingual WhatsApp Daily Status Generator
// ============================================================================

export function generateDailyWhatsAppStatus(
  report: DailyOperationsReportRecord,
  mode: 'SHORT' | 'DETAILED' = 'SHORT',
  language: 'EN' | 'PS' | 'FA' = 'EN'
): string {
  const { summary, reportDate } = report

  // Multi-currency formatting
  const formatCurrencies = (totals: CurrencyTotal[]) => {
    if (!totals || totals.length === 0) return '0.00 USD'
    return totals.map((t) => `${t.amount.toLocaleString()} ${t.currency}`).join(' | ')
  }

  // English
  if (language === 'EN') {
    if (mode === 'SHORT') {
      return `*SKY ARIANA LIMITED — DAILY OPERATIONS STATUS*
📅 *Date:* ${reportDate}

📊 *Operational Summary:*
• Active Shipments: ${summary.activeShipments}
• At Border: ${summary.atBorder}
• At Port: ${summary.atPort}
• At Sea: ${summary.atSea}
• Arriving Soon: ${summary.arrivingSoon}

⚠️ *Items Requiring Attention:*
• Tracking Updates Needed: ${summary.updatesNeeded}
• Documents Incomplete: ${summary.documentsPending}
• Invoices Overdue: ${summary.invoicesOverdue}
• Pending Approvals: ${summary.pendingApprovals}
• Critical Issues: ${summary.criticalIssues}

💰 *Financials (Segregated):*
• Collections Today: ${formatCurrencies(report.customerPaymentTotals)}
• Overdue Receivables: ${formatCurrencies(report.outstandingTotals)}

${report.managementNote ? `📝 *Management Note:* ${report.managementNote}\n` : ''}
Generated via Sky Ariana Logistics System.`
    }

    // Detailed English
    const opLines = report.operations
      .slice(0, 5)
      .map(
        (o, idx) =>
          `${idx + 1}. *${o.bolNumber}* (${o.containerNumber}): ${o.currentLocation} ➔ ${o.destination} [${o.status}]`
      )
      .join('\n')

    return `*SKY ARIANA LIMITED — DETAILED OPERATIONS DISPATCH*
📅 *Date:* ${reportDate} (Status: ${report.status})

🚢 *Key Active Dispatches:*
${opLines || 'No active dispatches.'}

🚧 *Border Stations:*
${report.border.map((b) => `• ${b.bolNumber} (${b.truckPlate}): ${b.borderName} (Waiting ${b.waitingDurationHours}h)`).join('\n') || 'None'}

⚓ *Port Operations:*
${report.port.map((p) => `• ${p.bolNumber} (${p.containerNumber}): ${p.portName} [${p.status}]`).join('\n') || 'None'}

📋 *Tasks Progress:*
• Completed Today: ${report.tasks.completedCount}
• Still Open: ${report.tasks.openCount}
• Overdue: ${report.tasks.overdueCount}

💵 *Outstanding Accounts:*
${formatCurrencies(report.outstandingTotals)}

Sky Ariana Operations Command Center.`
  }

  // Pashto (پښتو)
  if (language === 'PS') {
    return `*د سکای آریانا لمټیډ د ورځنیو عملیاتو راپور*
📅 *نېټه:* ${reportDate}

📊 *عملیاتي لنډیز:*
• فعال کارګوګانې: ${summary.activeShipments}
• په سرحد کې: ${summary.atBorder}
• په بندر کې: ${summary.atPort}
• په بحر کې: ${summary.atSea}
• رارسېدونکي: ${summary.arrivingSoon}

⚠️ *هغه توکي چې پاملرنې ته اړتیا لري:*
• د ټریکینګ تازه کول: ${summary.updatesNeeded}
• نیمګړي اسناد: ${summary.documentsPending}
• پاتې پیسې/انوایسونه: ${summary.invoicesOverdue}
• تایید ته پاتې: ${summary.pendingApprovals}

💰 *مالي وضعیت:*
• ننني وصول شوي: ${formatCurrencies(report.customerPaymentTotals)}
• ټول باقیداري: ${formatCurrencies(report.outstandingTotals)}

${report.managementNote ? `📝 *یادښت:* ${report.managementNote}\n` : ''}
سکای آریانا لوژستیک مرکز.`
  }

  // Persian / Dari (دری)
  return `*گزارش روزانه عملیاتی شرکت بین‌المللی اسکای آریانا*
📅 *تاریخ:* ${reportDate}

📊 *خلاصه وضعیت عملیات:*
• محموله‌های فعال: ${summary.activeShipments}
• در مرز: ${summary.atBorder}
• در بندر: ${summary.atPort}
• در مسیر دریایی: ${summary.atSea}
• در حال رسیدن: ${summary.arrivingSoon}

⚠️ *موارد نیازمند پیگیری فوری:*
• نیاز به بروزرسانی رهگیری: ${summary.updatesNeeded}
• اسناد ناقص: ${summary.documentsPending}
• فاکتورهای سررسید شده: ${summary.invoicesOverdue}
• تاییدیه‌های معلق: ${summary.pendingApprovals}

💰 *گزارش مالی تفکیک‌شده:*
• وصولی‌های امروز: ${formatCurrencies(report.customerPaymentTotals)}
• مطالبات معوقه: ${formatCurrencies(report.outstandingTotals)}

${report.managementNote ? `📝 *یادداشت مدیریت:* ${report.managementNote}\n` : ''}
مرکز فرماندهی لوجستیک اسکای آریانا.`
}
