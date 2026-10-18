import { ApprovalRule, ApprovalRequest, ApprovalAction, ApprovalActionType, ApprovalStatus } from "./rbac-types"
import { DEFAULT_APPROVAL_RULES } from "./permissions-config"
import { logAuditEvent } from "./audit-service"

const APPROVAL_RULES_STORAGE_KEY = "skyariana_approval_rules_v1"
const APPROVAL_REQUESTS_STORAGE_KEY = "skyariana_approval_requests_v1"
const APPROVAL_ACTIONS_STORAGE_KEY = "skyariana_approval_actions_v1"

let memoryRules: ApprovalRule[] = [...DEFAULT_APPROVAL_RULES]
let memoryRequests: ApprovalRequest[] = []
let memoryActions: ApprovalAction[] = []

function safeHash(payload: any): string {
  try {
    const str = typeof payload === "string" ? payload : JSON.stringify(payload)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash |= 0
    }
    return `hash-${Math.abs(hash)}`
  } catch {
    return `hash-${Date.now()}`
  }
}

// -------------------------------------------------------------
// Approval Rules Management
// -------------------------------------------------------------
export function getApprovalRules(): ApprovalRule[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(APPROVAL_RULES_STORAGE_KEY)
      if (stored) return JSON.parse(stored)
    } catch {}
  }
  return memoryRules
}

export function saveApprovalRule(rule: ApprovalRule, actorId = "system", actorName = "Admin"): ApprovalRule[] {
  const current = getApprovalRules()
  const idx = current.findIndex((r) => r.id === rule.id)
  let updated: ApprovalRule[]
  if (idx >= 0) {
    updated = [...current]
    updated[idx] = { ...rule, updated_at: new Date().toISOString() }
  } else {
    updated = [rule, ...current]
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(APPROVAL_RULES_STORAGE_KEY, JSON.stringify(updated))
  }
  memoryRules = updated

  logAuditEvent({
    userId: actorId,
    userName: actorName,
    action: "APPROVAL_RULE_UPDATED",
    entityType: "approval_rule",
    entityId: rule.id,
    description: `Updated approval rule for ${rule.name} (Min: ${rule.min_amount} ${rule.currency})`,
    newValues: rule,
  })

  return updated
}

// -------------------------------------------------------------
// Rule Evaluation
// -------------------------------------------------------------
export function checkApprovalRequirement(
  actionType: ApprovalActionType,
  amount: number,
  currency: string,
  requesterRole: string
): { requiresApproval: boolean; matchingRule?: ApprovalRule } {
  const rules = getApprovalRules().filter((r) => r.active && r.action_type === actionType)
  if (rules.length === 0) return { requiresApproval: false }

  const normCurr = (currency || "USD").toUpperCase()
  const normRole = (requesterRole || "").toLowerCase()

  for (const rule of rules) {
    const currMatch = rule.currency === "ANY" || rule.currency === normCurr
    const roleMatch = rule.requester_roles.length === 0 || rule.requester_roles.map((r) => r.toLowerCase()).includes(normRole)

    if (currMatch && roleMatch) {
      if (rule.min_amount === 0 || amount >= rule.min_amount) {
        return { requiresApproval: true, matchingRule: rule }
      }
    }
  }

  return { requiresApproval: false }
}

// -------------------------------------------------------------
// Approval Requests Management
// -------------------------------------------------------------
export function getApprovalRequests(filter?: {
  status?: ApprovalStatus
  requestedBy?: string
  entityId?: string
}): ApprovalRequest[] {
  let requests = memoryRequests
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(APPROVAL_REQUESTS_STORAGE_KEY)
      if (stored) requests = JSON.parse(stored)
    } catch {}
  }

  if (!filter) return requests

  return requests.filter((r) => {
    if (filter.status && r.status !== filter.status) return false
    if (filter.requestedBy && r.requested_by !== filter.requestedBy) return false
    if (filter.entityId && r.entity_id !== filter.entityId) return false
    return true
  })
}

export function createApprovalRequest(params: {
  requestType: ApprovalActionType
  entityType: string
  entityId: string
  entityRef?: string
  requestedBy: string
  requestedByName: string
  amount: number
  currency: string
  reason: string
  payload?: any
  requesterRole?: string
}): { requiresApproval: boolean; request?: ApprovalRequest } {
  const { requiresApproval, matchingRule } = checkApprovalRequirement(
    params.requestType,
    params.amount,
    params.currency,
    params.requesterRole || "accounting"
  )

  if (!requiresApproval) {
    return { requiresApproval: false }
  }

  const snapshot = safeHash(params.payload || { amount: params.amount, currency: params.currency, entityId: params.entityId })

  const request: ApprovalRequest = {
    id: `appr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    request_type: params.requestType,
    entity_type: params.entityType,
    entity_id: params.entityId,
    entity_ref: params.entityRef || params.entityId,
    requested_by: params.requestedBy,
    requested_by_name: params.requestedByName,
    requested_at: new Date().toISOString(),
    amount: params.amount,
    currency: params.currency,
    reason: params.reason,
    status: "PENDING",
    current_step: 1,
    required_steps: matchingRule?.approvals_required || 1,
    payload_snapshot: snapshot,
  }

  const all = [request, ...getApprovalRequests()]
  if (typeof window !== "undefined") {
    localStorage.setItem(APPROVAL_REQUESTS_STORAGE_KEY, JSON.stringify(all))
  }
  memoryRequests = all

  logAuditEvent({
    userId: params.requestedBy,
    userName: params.requestedByName,
    action: "APPROVAL_REQUESTED",
    entityType: params.entityType,
    entityId: params.entityId,
    description: `Submitted ${params.requestType} for approval (${params.amount.toLocaleString()} ${params.currency}). Reason: ${params.reason}`,
    newValues: request,
  })

  return { requiresApproval: true, request }
}

export function processApprovalAction(params: {
  requestId: string
  userId: string
  userName: string
  userRole: string
  action: "APPROVE" | "REJECT" | "RETURN_FOR_CORRECTION" | "CANCEL"
  comment: string
}): { success: boolean; request: ApprovalRequest; message: string } {
  const allRequests = getApprovalRequests()
  const reqIdx = allRequests.findIndex((r) => r.id === params.requestId)
  if (reqIdx < 0) {
    throw new Error(`Approval request ${params.requestId} not found`)
  }

  const req = allRequests[reqIdx]
  if (req.status !== "PENDING") {
    throw new Error(`Cannot perform action: request is already ${req.status}`)
  }

  const rule = getApprovalRules().find((r) => r.action_type === req.request_type)
  const allowSelf = rule?.allow_self_approval ?? false

  // FOUR-EYES PRINCIPLE ENFORCEMENT:
  if (!allowSelf && req.requested_by === params.userId && params.action === "APPROVE") {
    throw new Error("Four-Eyes Security Violation: Self-approval is prohibited for sensitive financial transactions. Another authorized manager must approve.")
  }

  // Check approver role
  const normRole = (params.userRole || "").toLowerCase()
  const isSuper = normRole === "superadmin"
  const allowedApprovers = rule?.approver_roles.map((r) => r.toLowerCase()) || ["management", "superadmin", "admin"]

  if (!isSuper && !allowedApprovers.includes(normRole)) {
    throw new Error(`Unauthorized: Your role (${params.userRole}) is not permitted to approve this action. Required: ${allowedApprovers.join(", ")}`)
  }

  let nextStatus: ApprovalStatus = req.status
  if (params.action === "APPROVE") {
    nextStatus = "APPROVED"
  } else if (params.action === "REJECT") {
    nextStatus = "REJECTED"
  } else if (params.action === "CANCEL") {
    nextStatus = "CANCELLED"
  }

  const updatedReq: ApprovalRequest = {
    ...req,
    status: nextStatus,
    completed_at: new Date().toISOString(),
  }

  allRequests[reqIdx] = updatedReq
  if (typeof window !== "undefined") {
    localStorage.setItem(APPROVAL_REQUESTS_STORAGE_KEY, JSON.stringify(allRequests))
  }
  memoryRequests = allRequests

  // Record action history
  const actionRecord: ApprovalAction = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    approval_request_id: params.requestId,
    step: req.current_step,
    action: params.action,
    user_id: params.userId,
    user_name: params.userName,
    comment: params.comment,
    created_at: new Date().toISOString(),
  }

  let actions = memoryActions
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(APPROVAL_ACTIONS_STORAGE_KEY)
      if (stored) actions = JSON.parse(stored)
    } catch {}
  }
  actions = [actionRecord, ...actions]
  if (typeof window !== "undefined") {
    localStorage.setItem(APPROVAL_ACTIONS_STORAGE_KEY, JSON.stringify(actions))
  }
  memoryActions = actions

  logAuditEvent({
    userId: params.userId,
    userName: params.userName,
    action: `APPROVAL_${params.action}`,
    entityType: req.entity_type,
    entityId: req.entity_id,
    description: `${params.action} approval request for ${req.request_type} (${req.amount} ${req.currency}). Comment: ${params.comment}`,
    oldValues: { status: req.status },
    newValues: { status: nextStatus, comment: params.comment },
  })

  return {
    success: true,
    request: updatedReq,
    message: `Request successfully ${params.action.toLowerCase()}`,
  }
}

export function invalidateApprovalIfModified(
  entityId: string,
  newPayload: any,
  actorId = "system",
  actorName = "System"
): boolean {
  const requests = getApprovalRequests({ entityId })
  let invalidatedAny = false

  const updated = requests.map((req) => {
    if (req.status === "APPROVED" || req.status === "PENDING") {
      const newHash = safeHash(newPayload)
      if (req.payload_snapshot && req.payload_snapshot !== newHash) {
        invalidatedAny = true
        logAuditEvent({
          userId: actorId,
          userName: actorName,
          action: "APPROVAL_INVALIDATED_BY_MODIFICATION",
          entityType: req.entity_type,
          entityId: req.entity_id,
          description: `Previous approval voided because record was modified after approval. New hash: ${newHash}`,
          oldValues: { status: req.status },
          newValues: { status: "CANCELLED" },
        })
        return {
          ...req,
          status: "CANCELLED" as ApprovalStatus,
          invalidation_reason: "Record was materially modified after approval. Re-approval required.",
        }
      }
    }
    return req
  })

  if (invalidatedAny) {
    if (typeof window !== "undefined") {
      localStorage.setItem(APPROVAL_REQUESTS_STORAGE_KEY, JSON.stringify(updated))
    }
    memoryRequests = updated
  }

  return invalidatedAny
}
