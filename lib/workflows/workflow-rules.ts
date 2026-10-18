import { WorkflowRule, WorkflowTemplate, TaskType } from '@/lib/types/workflow'

export const DEFAULT_WORKFLOW_RULES: WorkflowRule[] = [
  {
    id: 'RULE_BOL_CREATED_DOCS_CI',
    name: 'Auto-Generate Commercial Invoice Task',
    description: 'When a new BOL is created, generate a document preparation task for Commercial Invoice.',
    eventType: 'BOL_CREATED',
    enabled: true,
    taskType: 'DOCUMENT_PREPARATION',
    taskTitleTemplate: 'Prepare Commercial Invoice for BOL {bolNumber}',
    taskDescriptionTemplate: 'Review exporter/consignee details and finalize official Commercial Invoice with exact declared value.',
    defaultPriority: 'HIGH',
    defaultTeam: 'Documentation',
    dueOffsetHours: 24,
    autoCompleteOn: 'DOCUMENT_READY',
    targetDocType: 'COMMERCIAL_INVOICE',
  },
  {
    id: 'RULE_BOL_CREATED_DOCS_PL',
    name: 'Auto-Generate Packing List Task',
    description: 'When a new BOL is created, generate a task to prepare the Packing List.',
    eventType: 'BOL_CREATED',
    enabled: true,
    taskType: 'DOCUMENT_PREPARATION',
    taskTitleTemplate: 'Prepare Packing List for BOL {bolNumber}',
    taskDescriptionTemplate: 'Verify carton count, net weight, and gross weight specs from shipment draft.',
    defaultPriority: 'HIGH',
    defaultTeam: 'Documentation',
    dueOffsetHours: 24,
    autoCompleteOn: 'DOCUMENT_READY',
    targetDocType: 'PACKING_LIST',
  },
  {
    id: 'RULE_BOOKING_CONFIRMED_ASSIGN_CTR',
    name: 'Assign Container on Booking Confirmation',
    description: 'When a carrier booking is confirmed, schedule container allocation.',
    eventType: 'BOOKING_CONFIRMED',
    enabled: true,
    taskType: 'CONTAINER_ASSIGNMENT',
    taskTitleTemplate: 'Assign Container for Booking {bookingNo}',
    taskDescriptionTemplate: 'Select available 20FT/40FT/40HC container unit from carrier depot inventory.',
    defaultPriority: 'NORMAL',
    defaultTeam: 'Operations',
    dueOffsetHours: 48,
    autoCompleteOn: 'CONTAINER_ASSIGNED',
  },
  {
    id: 'RULE_CONTAINER_ASSIGNED_STUFFING',
    name: 'Stuffing & Cargo Loading',
    description: 'When a container is assigned, dispatch loading instructions to depot.',
    eventType: 'CONTAINER_ASSIGNED',
    enabled: true,
    taskType: 'STUFFING',
    taskTitleTemplate: 'Cargo Stuffing & Seal Verification for {containerNo}',
    taskDescriptionTemplate: 'Supervise cargo loading, record high-security bolt seal number, and verify carton stability.',
    defaultPriority: 'HIGH',
    defaultTeam: 'Operations',
    dueOffsetHours: 48,
  },
  {
    id: 'RULE_CONTAINER_STUFFED_VGM',
    name: 'Submit Verified Gross Mass (VGM)',
    description: 'Immediately after cargo stuffing, submit SOLAS VGM certificate to terminal.',
    eventType: 'CONTAINER_STUFFED',
    enabled: true,
    taskType: 'VGM_SUBMISSION',
    taskTitleTemplate: 'Submit Verified Gross Mass (VGM) for {containerNo}',
    taskDescriptionTemplate: 'Weigh container on certified weighbridge and file VGM before cutoff.',
    defaultPriority: 'URGENT',
    defaultTeam: 'Documentation',
    dueOffsetHours: 24,
  },
  {
    id: 'RULE_VGM_SUBMITTED_GATE_IN',
    name: 'Terminal Gate-In Clearance',
    description: 'Gate-in container at port terminal once VGM is filed.',
    eventType: 'VGM_SUBMITTED',
    enabled: true,
    taskType: 'GATE_IN',
    taskTitleTemplate: 'Port Gate-In for {containerNo}',
    taskDescriptionTemplate: 'Deliver sealed container to port terminal yard prior to vessel gate cutoff.',
    defaultPriority: 'HIGH',
    defaultTeam: 'Operations',
    dueOffsetHours: 24,
    requiredPrerequisites: ['VGM_SUBMISSION'],
  },
  {
    id: 'RULE_SHIPMENT_DELIVERED_EMPTY_RETURN',
    name: 'Empty Container Return to Depot',
    description: 'When consignee takes delivery, monitor empty container return to prevent detention fees.',
    eventType: 'SHIPMENT_DELIVERED',
    enabled: true,
    taskType: 'EMPTY_RETURN',
    taskTitleTemplate: 'Verify Empty Return for {containerNo} - Avoid Demurrage',
    taskDescriptionTemplate: 'Confirm empty equipment returned to shipping line depot and obtain EIR receipt.',
    defaultPriority: 'NORMAL',
    defaultTeam: 'Operations',
    dueOffsetHours: 72,
  },
  {
    id: 'RULE_INVOICE_OVERDUE_PAYMENT',
    name: 'Customer Invoice Payment Follow-up',
    description: 'Create follow-up task when a customer invoice passes payment due date.',
    eventType: 'INVOICE_OVERDUE',
    enabled: true,
    taskType: 'PAYMENT_FOLLOWUP',
    taskTitleTemplate: 'Payment Follow-up: Invoice {invoiceNumber} ({customerName})',
    taskDescriptionTemplate: 'Contact customer finance representative to confirm bank transfer status.',
    defaultPriority: 'HIGH',
    defaultTeam: 'Finance',
    dueOffsetHours: 24,
    autoCompleteOn: 'PAYMENT_POSTED',
  },
  {
    id: 'RULE_TRACKING_STALE',
    name: 'Stale Tracking Milestones Audit',
    description: 'Create operational update task if active shipment has had no position ping in 48 hours.',
    eventType: 'TRACKING_STALE_DETECTED',
    enabled: true,
    taskType: 'TRACKING_UPDATE',
    taskTitleTemplate: 'Audit Stale Tracking for BOL {bolNumber}',
    taskDescriptionTemplate: 'Contact transit driver or border customs clearing agent to record latest waypoint.',
    defaultPriority: 'NORMAL',
    defaultTeam: 'Operations',
    dueOffsetHours: 12,
  },
]

export const DEFAULT_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'TEMPLATE_EXPORT_FULL_CYCLE',
    name: 'Standard Afghan Transit & Export Pipeline',
    description: 'Comprehensive 8-step pipeline from booking, container stuffing, border crossing to delivery.',
    category: 'Export',
    milestones: [
      { title: 'Prepare Packing List & Commercial Invoice', type: 'DOCUMENT_PREPARATION', priority: 'HIGH', team: 'Documentation', offsetDays: 1 },
      { title: 'Depot Container Assignment', type: 'CONTAINER_ASSIGNMENT', priority: 'NORMAL', team: 'Operations', offsetDays: 2 },
      { title: 'Cargo Stuffing & Bolt Seal Record', type: 'STUFFING', priority: 'NORMAL', team: 'Operations', offsetDays: 3, dependsOnPrevious: true },
      { title: 'SOLAS Weighbridge & VGM Filing', type: 'VGM_SUBMISSION', priority: 'URGENT', team: 'Documentation', offsetDays: 4, dependsOnPrevious: true },
      { title: 'Port Gate-In Verification', type: 'GATE_IN', priority: 'HIGH', team: 'Operations', offsetDays: 5, dependsOnPrevious: true },
      { title: 'Transit Border Customs Clearance', type: 'CUSTOMS_FOLLOWUP', priority: 'HIGH', team: 'Border', offsetDays: 7, dependsOnPrevious: true },
      { title: 'Customer Arrival Notice & WhatsApp Notification', type: 'CUSTOMER_UPDATE', priority: 'NORMAL', team: 'Operations', offsetDays: 10 },
      { title: 'Empty Equipment Return Receipt', type: 'EMPTY_RETURN', priority: 'NORMAL', team: 'Operations', offsetDays: 14, dependsOnPrevious: true },
    ],
  },
  {
    id: 'TEMPLATE_BORDER_TRUCKING',
    name: 'Cross-Border Trucking Fast-Track',
    description: 'Expedited dry fruit/produce overland customs and border manifest workflow.',
    category: 'Border',
    milestones: [
      { title: 'Phytosanitary & Export Certificate Issuance', type: 'DOCUMENT_PREPARATION', priority: 'URGENT', team: 'Documentation', offsetDays: 1 },
      { title: 'Afghan Truck Driver Rent & Plate Registration', type: 'DOCUMENT_REVIEW', priority: 'HIGH', team: 'Operations', offsetDays: 1 },
      { title: 'Border Crossing Inspection (Islam Qala / Hairatan / Torghundi)', type: 'CUSTOMS_FOLLOWUP', priority: 'HIGH', team: 'Border', offsetDays: 2, dependsOnPrevious: true },
      { title: 'Final Destination Unloading Confirmation', type: 'TRACKING_UPDATE', priority: 'NORMAL', team: 'Operations', offsetDays: 4, dependsOnPrevious: true },
    ],
  },
]

export function computeTaskFingerprint(
  ruleId: string,
  bolNumber?: string,
  shipmentId?: string,
  taskType?: string,
  qualifier?: string
): string {
  const entityId = (bolNumber || shipmentId || 'global').trim().toUpperCase()
  const type = (taskType || 'TASK').trim().toUpperCase()
  const q = (qualifier || '').trim().toUpperCase()
  return `${ruleId}::${entityId}::${type}${q ? `::${q}` : ''}`
}

export function interpolateTemplate(
  template: string,
  vars: Record<string, string | number | undefined | null>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key]
    return val !== undefined && val !== null ? String(val) : ''
  })
}
