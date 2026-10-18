import {
  WorkflowEvent,
  WorkflowTask,
  WorkflowRule,
  TaskType,
} from '@/lib/types/workflow'
import {
  getWorkflowRules,
  getWorkflowTasks,
  createWorkflowTask,
  updateWorkflowTask,
} from './task-service'
import { computeTaskFingerprint, interpolateTemplate } from './workflow-rules'

export interface WorkflowEngineResult {
  tasksCreated: WorkflowTask[]
  tasksCompleted: WorkflowTask[]
  errors?: string[]
}

/**
 * Dispatches a business operational event through the workflow automation engine.
 * Idempotent: Never creates duplicate tasks for the same event fingerprint.
 * State-driven: Auto-resolves pending tasks when verified conditions are satisfied.
 */
export async function emitWorkflowEvent(
  event: WorkflowEvent
): Promise<WorkflowEngineResult> {
  const result: WorkflowEngineResult = {
    tasksCreated: [],
    tasksCompleted: [],
    errors: [],
  }

  try {
    const rules = await getWorkflowRules()
    const activeTasks = await getWorkflowTasks()

    // =========================================================================
    // 1. STATE-DRIVEN AUTO-COMPLETION EVALUATION
    // =========================================================================
    for (const task of activeTasks) {
      if (task.status === 'COMPLETED' || task.status === 'CANCELLED') continue
      if (!task.autoCompleteRule) continue

      const rule = task.autoCompleteRule
      let shouldAutoComplete = false
      let resolutionReason = ''

      // A. Document ready auto-completion
      if (
        (event.type === 'DOCUMENT_APPROVED' || event.type === 'DOCUMENT_CREATED') &&
        rule.triggerType === 'DOCUMENT_READY'
      ) {
        const matchesDoc = !rule.targetDocType || rule.targetDocType === event.documentType
        const matchesBol = !task.bolNumber || !event.bolNumber || task.bolNumber.trim().toUpperCase() === event.bolNumber.trim().toUpperCase()
        if (matchesDoc && matchesBol) {
          shouldAutoComplete = true
          resolutionReason = `Verified ${event.documentType || 'document'} ready for ${event.bolNumber || 'shipment'}`
        }
      }

      // B. Container assigned auto-completion
      if (
        event.type === 'CONTAINER_ASSIGNED' &&
        rule.triggerType === 'CONTAINER_ASSIGNED'
      ) {
        const matchesBooking = !task.bookingNo || !event.bookingNo || task.bookingNo.trim().toUpperCase() === event.bookingNo.trim().toUpperCase()
        const matchesBol = !task.bolNumber || !event.bolNumber || task.bolNumber.trim().toUpperCase() === event.bolNumber.trim().toUpperCase()
        if (matchesBooking || matchesBol) {
          shouldAutoComplete = true
          resolutionReason = `Container ${event.containerNo || ''} assigned to booking/BOL`
        }
      }

      // C. Payment posted auto-completion
      if (
        event.type === 'PAYMENT_RECEIVED' &&
        rule.triggerType === 'PAYMENT_POSTED'
      ) {
        const matchesInvoice = !task.description?.includes(event.invoiceNumber || '___') || (event.invoiceNumber && task.description.includes(event.invoiceNumber))
        const matchesCustomer = !task.customerName || !event.customerName || task.customerName.trim().toLowerCase() === event.customerName.trim().toLowerCase()
        if (matchesInvoice && matchesCustomer) {
          shouldAutoComplete = true
          resolutionReason = `Payment posted for invoice ${event.invoiceNumber || ''}`
        }
      }

      // D. Milestone reached auto-completion
      if (
        event.type === 'SHIPMENT_STATUS_CHANGED' &&
        rule.triggerType === 'MILESTONE_REACHED'
      ) {
        const matchesBol = !task.bolNumber || !event.bolNumber || task.bolNumber.trim().toUpperCase() === event.bolNumber.trim().toUpperCase()
        if (matchesBol && event.data?.status === 'Delivered' && task.type === 'TRACKING_UPDATE') {
          shouldAutoComplete = true
          resolutionReason = `Shipment reached Delivered milestone`
        }
      }

      if (shouldAutoComplete) {
        const updated = await updateWorkflowTask(
          task.id,
          { status: 'COMPLETED' },
          event.actor || 'Workflow-Engine',
          resolutionReason
        )
        if (updated.updated) {
          result.tasksCompleted.push(updated.task)
        }
      }
    }

    // =========================================================================
    // 2. NEW TASK CREATION FROM MATCHING AUTOMATION RULES
    // =========================================================================
    const matchingRules = rules.filter((r) => r.enabled && r.eventType === event.type)

    for (const rule of matchingRules) {
      // Fingerprint deduplication key
      const fingerprint = computeTaskFingerprint(
        rule.id,
        event.bolNumber,
        event.shipmentId,
        rule.taskType,
        rule.targetDocType
      )

      // Calculate due date based on rule offset
      const baseTime = event.timestamp ? new Date(event.timestamp).getTime() : Date.now()
      const dueTimestamp = baseTime + (rule.dueOffsetHours || 24) * 60 * 60 * 1000
      const dueDate = new Date(dueTimestamp).toISOString().split('T')[0]

      // Format template variables
      const templateVars: Record<string, string | number | undefined | null> = {
        bolNumber: event.bolNumber || 'N/A',
        bookingNo: event.bookingNo || 'N/A',
        containerNo: event.containerNo || 'N/A',
        customerName: event.customerName || 'Customer',
        invoiceNumber: event.invoiceNumber || 'N/A',
        documentType: rule.targetDocType || 'Document',
        route: event.data?.route || 'Transit Corridor',
        destination: event.data?.destination || '',
      }

      const title = interpolateTemplate(rule.taskTitleTemplate, templateVars)
      const description = interpolateTemplate(rule.taskDescriptionTemplate, templateVars)

      // Look up prerequisite task IDs for dependency chaining
      const dependencies: string[] = []
      if (rule.requiredPrerequisites && rule.requiredPrerequisites.length > 0) {
        const prereqTasks = activeTasks.filter(
          (t) =>
            rule.requiredPrerequisites?.includes(t.type) &&
            ((t.bolNumber && event.bolNumber && t.bolNumber === event.bolNumber) ||
             (t.containerNo && event.containerNo && t.containerNo === event.containerNo)) &&
            t.status !== 'CANCELLED'
        )
        for (const pt of prereqTasks) {
          dependencies.push(pt.id)
        }
      }

      const taskPayload: Partial<WorkflowTask> = {
        fingerprint,
        ruleId: rule.id,
        title,
        description,
        type: rule.taskType,
        priority: rule.defaultPriority,
        sourceModule: getModuleFromEvent(event.type),
        assignedTeam: rule.defaultTeam || 'Operations',
        dueDate,
        bolNumber: event.bolNumber,
        shipmentId: event.shipmentId,
        bookingNo: event.bookingNo,
        containerNo: event.containerNo,
        companyId: event.companyId,
        customerName: event.customerName,
        destination: event.data?.destination,
        route: event.data?.route,
        dependencies,
        autoCompleteRule: rule.autoCompleteOn
          ? {
              triggerType: rule.autoCompleteOn,
              targetDocType: rule.targetDocType,
            }
          : undefined,
      }

      const createdRes = await createWorkflowTask(taskPayload, event.actor || 'Workflow-Engine')
      if (createdRes.created) {
        result.tasksCreated.push(createdRes.task)
      }
    }
  } catch (err: any) {
    console.error('[WorkflowEngine] Error processing event:', err)
    result.errors?.push(err?.message || 'Unknown workflow error')
  }

  return result
}

function getModuleFromEvent(type: string): WorkflowTask['sourceModule'] {
  if (type.startsWith('BOL_')) return 'BOL'
  if (type.startsWith('BOOKING_') || type.startsWith('CONTAINER_') || type.startsWith('VGM_') || type.startsWith('GATE_IN_')) return 'BOOKING'
  if (type.startsWith('DOCUMENT_')) return 'DOCUMENTS'
  if (type.startsWith('INVOICE_') || type.startsWith('PAYMENT_')) return 'ACCOUNTING'
  if (type.startsWith('TRACKING_') || type.startsWith('SHIPMENT_')) return 'TRACKING'
  return 'MANUAL'
}

/**
 * Dry-run testing method for evaluating rules without saving changes.
 */
export function evaluateRuleDryRun(
  rule: WorkflowRule,
  sampleEvent: WorkflowEvent
): {
  matches: boolean
  fingerprint: string
  simulatedTitle: string
  simulatedDescription: string
  simulatedDueDate: string
} {
  const matches = rule.enabled && rule.eventType === sampleEvent.type
  const fingerprint = computeTaskFingerprint(
    rule.id,
    sampleEvent.bolNumber,
    sampleEvent.shipmentId,
    rule.taskType,
    rule.targetDocType
  )

  const baseTime = sampleEvent.timestamp ? new Date(sampleEvent.timestamp).getTime() : Date.now()
  const dueTimestamp = baseTime + (rule.dueOffsetHours || 24) * 60 * 60 * 1000
  const simulatedDueDate = new Date(dueTimestamp).toISOString().split('T')[0]

  const templateVars: Record<string, string | number | undefined | null> = {
    bolNumber: sampleEvent.bolNumber || 'BOL-SAMPLE-01',
    bookingNo: sampleEvent.bookingNo || 'BKG-SAMPLE-01',
    containerNo: sampleEvent.containerNo || 'MSCU1234567',
    customerName: sampleEvent.customerName || 'Sample Merchant Ltd',
    invoiceNumber: sampleEvent.invoiceNumber || 'INV-2026-001',
    documentType: rule.targetDocType || 'Document',
  }

  return {
    matches,
    fingerprint,
    simulatedTitle: interpolateTemplate(rule.taskTitleTemplate, templateVars),
    simulatedDescription: interpolateTemplate(rule.taskDescriptionTemplate, templateVars),
    simulatedDueDate,
  }
}
