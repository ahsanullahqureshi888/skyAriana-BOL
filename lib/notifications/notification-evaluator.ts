import {
  createOrUpdateNotificationEvent,
  autoResolveNotification,
} from './notification-service'
import { getAllLocalBOLs } from '@/lib/services/local-storage-service'
import { getAllShipments } from '@/lib/services/shipment-service'
import { getAllShipmentDocuments } from '@/lib/services/shipment-document-storage'
import { getWorkflowTasks } from '@/lib/workflows/task-service'
import { readJsonFile } from '@/lib/services/blob-db'
import { Invoice } from '@/lib/types'
import { ShipmentMaster } from '@/lib/types/shipment'
import path from 'path'

const INVOICES_FILE = path.join(process.cwd(), '.local-invoices.json')

/**
 * Runs a unified evaluation pass across shipments, bookings, documents, finance, and workflow tasks.
 * Generates proactive notifications with stable event keys, and auto-resolves completed issues.
 */
export async function runNotificationEvaluationPass(): Promise<{
  createdOrUpdated: number
  resolved: number
}> {
  let createdOrUpdated = 0
  let resolved = 0

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  try {
    // 1. Fetch source records
    const [bols, shipments, docs, tasks, invoices] = await Promise.all([
      getAllLocalBOLs().catch(() => []),
      getAllShipments().catch(() => [] as ShipmentMaster[]),
      getAllShipmentDocuments().catch(() => []),
      getWorkflowTasks().catch(() => []),
      readJsonFile<Invoice[]>(INVOICES_FILE, []).catch(() => []),
    ])

    // =========================================================================
    // A. MISSING DOCUMENT AUDIT
    // =========================================================================
    const docsByBol = new Map<string, Set<string>>()
    for (const d of docs) {
      const b = ((d as any).bolNumber || '').trim().toUpperCase()
      if (b) {
        if (!docsByBol.has(b)) docsByBol.set(b, new Set())
        docsByBol.get(b)!.add(d.documentType)
      }
    }

    for (const bol of bols) {
      const bNum = (bol.bill_of_lading_number || '').trim().toUpperCase()
      if (!bNum) continue

      const existingTypes = docsByBol.get(bNum) || new Set()

      // Check Commercial Invoice
      const ciKey = `MISSING_DOC::${bNum}::COMMERCIAL_INVOICE`
      if (!existingTypes.has('COMMERCIAL_INVOICE')) {
        const res = await createOrUpdateNotificationEvent({
          eventKey: ciKey,
          type: 'MISSING_DOCUMENT',
          category: 'DOCUMENTS',
          severity: 'WARNING',
          title: `Commercial Invoice Missing for BOL ${bNum}`,
          message: `Official Commercial Invoice has not been compiled or finalized for export shipment ${bNum}.`,
          sourceModule: 'DOCUMENTS',
          sourceRecordId: bNum,
          relatedBol: bNum,
          relatedCustomer: bol.consignee_name || bol.shipper_name,
          targetTeam: 'Documentation',
          actionContext: {
            targetView: 'document-compliance',
            param: bNum,
            label: 'Open Document Center',
          },
        })
        if (res.created) createdOrUpdated++
      } else {
        const didResolve = await autoResolveNotification(ciKey, 'Commercial Invoice was uploaded and approved')
        if (didResolve) resolved++
      }

      // Check Packing List
      const plKey = `MISSING_DOC::${bNum}::PACKING_LIST`
      if (!existingTypes.has('PACKING_LIST')) {
        const res = await createOrUpdateNotificationEvent({
          eventKey: plKey,
          type: 'MISSING_DOCUMENT',
          category: 'DOCUMENTS',
          severity: 'WARNING',
          title: `Packing List Missing for BOL ${bNum}`,
          message: `Verified cargo packing list is required prior to customs clearance for ${bNum}.`,
          sourceModule: 'DOCUMENTS',
          sourceRecordId: bNum,
          relatedBol: bNum,
          relatedCustomer: bol.consignee_name || bol.shipper_name,
          targetTeam: 'Documentation',
          actionContext: {
            targetView: 'document-compliance',
            param: bNum,
            label: 'Generate Packing List',
          },
        })
        if (res.created) createdOrUpdated++
      } else {
        const didResolve = await autoResolveNotification(plKey, 'Packing List was verified')
        if (didResolve) resolved++
      }
    }

    // =========================================================================
    // B. STALE TRACKING AUDIT (> 48h without milestone update)
    // =========================================================================
    for (const shp of shipments) {
      if (shp.status === 'delivered') continue
      const bNum = ((shp as any).bolNumber || shp.referenceNumber || shp.id).trim().toUpperCase()

      const lastUpdate = shp.updatedAt || shp.createdAt
      if (lastUpdate) {
        const diffHours = (now.getTime() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60)
        const staleKey = `STALE_TRACKING::${bNum}::48H`

        if (diffHours > 48) {
          const res = await createOrUpdateNotificationEvent({
            eventKey: staleKey,
            type: 'TRACKING_STALE',
            category: 'TRACKING',
            severity: 'WARNING',
            title: `Tracking Stale for BOL ${bNum}`,
            message: `Shipment has had no position ping or border milestone recorded for ${Math.round(diffHours)} hours.`,
            sourceModule: 'TRACKING',
            sourceRecordId: bNum,
            relatedBol: bNum,
            relatedContainer: (shp as any).container?.containerNumber,
            relatedCustomer: (shp as any).consignee?.name || (shp as any).shipper?.name,
            targetTeam: 'Operations',
            actionContext: {
              targetView: 'shipments',
              param: bNum,
              label: 'Update Live Tracking',
            },
          })
          if (res.created) createdOrUpdated++
        } else {
          const didResolve = await autoResolveNotification(staleKey, 'Tracking position updated')
          if (didResolve) resolved++
        }
      }
    }

    // =========================================================================
    // C. OVERDUE WORKFLOW TASKS
    // =========================================================================
    for (const t of tasks) {
      const taskKey = `TASK_OVERDUE::${t.id}::OVERDUE`
      if (t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.dueDate && t.dueDate < todayStr) {
        const res = await createOrUpdateNotificationEvent({
          eventKey: taskKey,
          type: 'TASK_OVERDUE',
          category: 'WORKFLOW',
          severity: t.priority === 'URGENT' ? 'CRITICAL' : 'WARNING',
          title: `Overdue Task: ${t.title}`,
          message: `Task ${t.taskNumber} assigned to ${t.assignedTo || t.assignedTeam || 'Operations'} passed its deadline (${t.dueDate}).`,
          sourceModule: 'WORKFLOW',
          sourceRecordId: t.id,
          relatedBol: (t as any).bolNumber,
          relatedContainer: (t as any).containerNo,
          relatedCustomer: (t as any).customerName,
          targetUser: t.assignedTo,
          targetTeam: t.assignedTeam,
          actionContext: {
            targetView: 'workflow',
            param: t.id,
            label: 'Open Task Center',
          },
        })
        if (res.created) createdOrUpdated++
      } else if (t.status === 'COMPLETED' || t.status === 'CANCELLED') {
        const didResolve = await autoResolveNotification(taskKey, 'Task completed')
        if (didResolve) resolved++
      }
    }

    // =========================================================================
    // D. OVERDUE INVOICE AUDIT (Permission-Guarded)
    // =========================================================================
    for (const inv of invoices) {
      const invKey = `INVOICE_OVERDUE::${inv.invoiceNo}::OVERDUE`
      if (inv.date && inv.grandTotal > 0) {
        // Consider overdue if invoice date > 30 days old and unpaid
        const invAgeDays = (now.getTime() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24)
        if (invAgeDays > 30) {
          const res = await createOrUpdateNotificationEvent({
            eventKey: invKey,
            type: 'INVOICE_OVERDUE',
            category: 'FINANCE',
            severity: 'CRITICAL',
            title: `Invoice ${inv.invoiceNo} Overdue (${inv.companyName})`,
            message: `Outstanding balance of $${inv.grandTotal.toLocaleString()} for ${inv.companyName} is past the 30-day credit term.`,
            sourceModule: 'FINANCE',
            sourceRecordId: inv.invoiceNo,
            relatedCustomer: inv.companyName,
            relatedBol: inv.blNo,
            targetTeam: 'Finance',
            targetRole: 'accountant',
            financeRestricted: true,
            actionContext: {
              targetView: 'accounting',
              param: inv.companyName,
              label: 'Open Customer Ledger',
            },
          })
          if (res.created) createdOrUpdated++
        }
      }
    }
  } catch (err) {
    console.error('[NotificationEvaluator] Error in evaluation pass:', err)
  }

  return { createdOrUpdated, resolved }
}
