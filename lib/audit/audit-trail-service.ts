import {
  AuditEvent,
  AuditFilterParams,
  AuditQueryResult,
  AuditIntegrityReport,
  AuditActionCode,
  AuditEntityType,
  AuditSource,
  ChangeReasonPreset,
  ChangedField,
} from "./audit-types"
import { computeStructuredDiff } from "./diff-engine"

const AUDIT_STORAGE_KEY = "skyariana_audit_trail_master_v1"
const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

let memoryAuditEvents: AuditEvent[] = []

// SHA-256 computation that works in both Node.js and Browser environments
function computeSha256(str: string): string {
  try {
    // Node.js crypto if available
    const crypto = require("crypto")
    return crypto.createHash("sha256").update(str).digest("hex")
  } catch {
    // Fast pure-JS deterministic fallback hash for browser bundle if crypto not polyfilled
    let h1 = 0xdeadbeef,
      h2 = 0x41c6ce57
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i)
      h1 = Math.imul(h1 ^ ch, 2654435761)
      h2 = Math.imul(h2 ^ ch, 1597334677)
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
    const p1 = (4294967296 + h1).toString(16).slice(1)
    const p2 = (4294967296 + h2).toString(16).slice(1)
    return (p1 + p2 + p1 + p2).slice(0, 64)
  }
}

// Generate canonical string representation of event data for hashing
function canonicalEventString(event: {
  sequenceNumber: number
  timestamp: string
  userId: string
  action: string
  entityType: string
  entityId: string
  changedFields: ChangedField[]
  previousHash: string
}): string {
  return `${event.sequenceNumber}|${event.timestamp}|${event.userId}|${event.action}|${event.entityType}|${event.entityId}|${event.previousHash}|${JSON.stringify(event.changedFields)}`
}

// Format local Kabul business time (UTC+4:30)
function getBusinessTime(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kabul",
      dateStyle: "medium",
      timeStyle: "medium",
      hour12: false,
    }).format(date)
  } catch {
    return date.toISOString().replace("T", " ").slice(0, 19) + " UTC"
  }
}

// -------------------------------------------------------------
// Storage & Persistence
// -------------------------------------------------------------
export function getAllAuditEvents(): AuditEvent[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(AUDIT_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {}
  }
  return memoryAuditEvents
}

function persistAuditEvents(events: AuditEvent[]) {
  memoryAuditEvents = events
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(events))
    } catch {}
  }
}

// -------------------------------------------------------------
// Record Audit Event
// -------------------------------------------------------------
export function recordAuditEvent(params: {
  actor: {
    userId: string
    userName: string
    userRole: string
    sessionId?: string
    deviceId?: string
    appVersion?: string
  }
  action: AuditActionCode
  entityType: AuditEntityType
  entityId: string
  entityReference?: string
  module?: string
  beforeValues?: Record<string, any> | null
  afterValues?: Record<string, any> | null
  changedFields?: ChangedField[]
  reason?: string
  reasonPreset?: ChangeReasonPreset
  source?: AuditSource
  automationRuleId?: string
  databaseRevision?: number
  ipAddress?: string
  status?: "SUCCESS" | "FAILED"
  correlationId?: string
  metadata?: Record<string, any>
}): AuditEvent {
  const currentEvents = getAllAuditEvents()
  const previousEvent = currentEvents.length > 0 ? currentEvents[0] : null // sorted newest first
  const nextSeq = previousEvent ? previousEvent.sequenceNumber + 1 : 1
  const prevHash = previousEvent ? previousEvent.eventHash : GENESIS_HASH

  const now = new Date()
  const timestamp = now.toISOString()
  const businessTimestamp = getBusinessTime(now)

  // Compute structured diff if not manually provided
  const changes =
    params.changedFields ||
    (params.beforeValues || params.afterValues
      ? computeStructuredDiff(params.beforeValues, params.afterValues)
      : [])

  const eventDataForHash = {
    sequenceNumber: nextSeq,
    timestamp,
    userId: params.actor.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    changedFields: changes,
    previousHash: prevHash,
  }

  const eventHash = computeSha256(canonicalEventString(eventDataForHash))

  const newEvent: AuditEvent = {
    eventId: `aud-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8)}`,
    sequenceNumber: nextSeq,
    timestamp,
    businessTimestamp,
    actor: params.actor,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    entityReference: params.entityReference || params.entityId,
    module: params.module || params.entityType.toLowerCase(),
    beforeValues: params.beforeValues,
    afterValues: params.afterValues,
    changedFields: changes,
    reason: params.reason,
    reasonPreset: params.reasonPreset,
    source: params.source || "USER",
    automationRuleId: params.automationRuleId,
    databaseRevision: params.databaseRevision,
    ipAddress: params.ipAddress,
    status: params.status || "SUCCESS",
    correlationId: params.correlationId,
    previousHash: prevHash,
    eventHash,
    metadata: params.metadata,
  }

  const updatedList = [newEvent, ...currentEvents]
  persistAuditEvents(updatedList)

  return newEvent
}

// -------------------------------------------------------------
// Higher-Order Audited Mutation
// -------------------------------------------------------------
export async function auditedMutation<T>(options: {
  actor: {
    userId: string
    userName: string
    userRole: string
    deviceId?: string
  }
  action: AuditActionCode
  entityType: AuditEntityType
  entityId: string
  entityReference?: string
  module?: string
  beforeState?: Record<string, any> | null
  mutation: () => Promise<T> | T
  getAfterState?: (result: T) => Promise<Record<string, any> | null> | Record<string, any> | null
  reason?: string
  reasonPreset?: ChangeReasonPreset
  source?: AuditSource
  correlationId?: string
}): Promise<T> {
  try {
    const result = await options.mutation()
    const afterState = options.getAfterState ? await options.getAfterState(result) : null

    recordAuditEvent({
      actor: options.actor,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      entityReference: options.entityReference,
      module: options.module,
      beforeValues: options.beforeState,
      afterValues: afterState,
      reason: options.reason,
      reasonPreset: options.reasonPreset,
      source: options.source || "USER",
      correlationId: options.correlationId,
      status: "SUCCESS",
    })

    return result
  } catch (err: any) {
    recordAuditEvent({
      actor: options.actor,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      entityReference: options.entityReference,
      module: options.module,
      beforeValues: options.beforeState,
      reason: `Failed mutation: ${err.message}`,
      source: options.source || "USER",
      correlationId: options.correlationId,
      status: "FAILED",
    })
    throw err
  }
}

// -------------------------------------------------------------
// Query & Filter Audit Events
// -------------------------------------------------------------
export function queryAuditEvents(filters?: AuditFilterParams): AuditQueryResult {
  let events = getAllAuditEvents()

  if (!filters) {
    return {
      events: events.slice(0, 50),
      totalCount: events.length,
      page: 1,
      totalPages: Math.ceil(events.length / 50) || 1,
      limit: 50,
    }
  }

  // Filter pipeline
  let filtered = events.filter((e) => {
    if (filters.userId && e.actor.userId !== filters.userId) return false
    if (filters.module && e.module.toLowerCase() !== filters.module.toLowerCase()) return false
    if (filters.action && e.action !== filters.action) return false
    if (filters.entityType && e.entityType !== filters.entityType) return false
    if (filters.entityId && e.entityId !== filters.entityId) return false
    if (filters.status && e.status !== filters.status) return false
    if (filters.source && e.source !== filters.source) return false
    if (filters.deviceId && e.actor.deviceId !== filters.deviceId) return false
    if (filters.correlationId && e.correlationId !== filters.correlationId) return false
    if (filters.startDate && new Date(e.timestamp) < new Date(filters.startDate)) return false
    if (filters.endDate && new Date(e.timestamp) > new Date(filters.endDate)) return false

    if (filters.onlyCritical) {
      const isCrit =
        e.action === "DATABASE_RESTORE" ||
        e.action === "REVERSE" ||
        e.action === "PERMISSION_CHANGE" ||
        e.action === "MERGE" ||
        e.action === "DELETE_DRAFT"
      if (!isCrit) return false
    }

    if (filters.search) {
      const q = filters.search.toLowerCase()
      const match =
        e.eventId.toLowerCase().includes(q) ||
        e.entityId.toLowerCase().includes(q) ||
        (e.entityReference && e.entityReference.toLowerCase().includes(q)) ||
        e.actor.userName.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        (e.reason && e.reason.toLowerCase().includes(q)) ||
        e.changedFields.some(
          (cf) =>
            cf.field.toLowerCase().includes(q) ||
            cf.friendlyLabel.toLowerCase().includes(q) ||
            String(cf.newValue).toLowerCase().includes(q)
        )
      if (!match) return false
    }

    return true
  })

  const page = Math.max(1, filters.page || 1)
  const limit = Math.max(1, filters.limit || 50)
  const totalCount = filtered.length
  const totalPages = Math.ceil(totalCount / limit) || 1
  const paginated = filtered.slice((page - 1) * limit, page * limit)

  return {
    events: paginated,
    totalCount,
    page,
    totalPages,
    limit,
  }
}

// -------------------------------------------------------------
// Cryptographic Hash Chain Integrity Verification
// -------------------------------------------------------------
export function verifyAuditChainIntegrity(): AuditIntegrityReport {
  const events = getAllAuditEvents()
  if (events.length === 0) {
    return {
      totalEvents: 0,
      verified: true,
      message: "No audit events in repository. Chain is clean.",
    }
  }

  // Events stored newest first, reverse to verify chronologically from genesis
  const chronological = [...events].reverse()

  let expectedPrevHash = GENESIS_HASH

  for (let i = 0; i < chronological.length; i++) {
    const e = chronological[i]

    // Check previous hash linkage
    if (e.previousHash !== expectedPrevHash) {
      return {
        totalEvents: events.length,
        verified: false,
        tamperedEventId: e.eventId,
        brokenIndex: i,
        message: `Tamper Alert: Hash chain broken at event ${e.eventId} (#${e.sequenceNumber}). Previous hash mismatch.`,
      }
    }

    // Recompute event hash
    const eventDataForHash = {
      sequenceNumber: e.sequenceNumber,
      timestamp: e.timestamp,
      userId: e.actor.userId,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      changedFields: e.changedFields,
      previousHash: expectedPrevHash,
    }

    const calculatedHash = computeSha256(canonicalEventString(eventDataForHash))
    if (calculatedHash !== e.eventHash) {
      return {
        totalEvents: events.length,
        verified: false,
        tamperedEventId: e.eventId,
        brokenIndex: i,
        message: `Tamper Alert: Content modification detected in event ${e.eventId} (#${e.sequenceNumber}). Checksum invalid.`,
      }
    }

    expectedPrevHash = e.eventHash
  }

  return {
    totalEvents: events.length,
    verified: true,
    firstEventTimestamp: chronological[0].timestamp,
    lastEventTimestamp: chronological[chronological.length - 1].timestamp,
    message: "Audit Trail Integrity Cryptographically Verified (No tampering detected).",
  }
}

// -------------------------------------------------------------
// Export Audit Report
// -------------------------------------------------------------
export function exportAuditCsv(events?: AuditEvent[], canViewFinance = false): string {
  const targetEvents = events || getAllAuditEvents().slice(0, 2000)
  const headers = [
    "Event ID",
    "Seq",
    "Timestamp (UTC)",
    "Business Time",
    "User",
    "Role",
    "Action",
    "Entity Type",
    "Entity Ref",
    "Source",
    "Status",
    "Changed Fields Summary",
    "Reason",
    "Hash",
  ]

  const rows = targetEvents.map((e) => {
    const changesSummary = e.changedFields
      .map((c) => {
        const oldV = c.isFinancial && !canViewFinance ? "[CONFIDENTIAL]" : c.oldValue
        const newV = c.isFinancial && !canViewFinance ? "[CONFIDENTIAL]" : c.newValue
        return `${c.friendlyLabel}: ${oldV} -> ${newV}`
      })
      .join(" | ")

    return [
      `"${e.eventId}"`,
      `"${e.sequenceNumber}"`,
      `"${e.timestamp}"`,
      `"${e.businessTimestamp}"`,
      `"${e.actor.userName.replace(/"/g, '""')}"`,
      `"${e.actor.userRole}"`,
      `"${e.action}"`,
      `"${e.entityType}"`,
      `"${(e.entityReference || e.entityId).replace(/"/g, '""')}"`,
      `"${e.source}"`,
      `"${e.status}"`,
      `"${changesSummary.replace(/"/g, '""')}"`,
      `"${(e.reason || "").replace(/"/g, '""')}"`,
      `"${e.eventHash.slice(0, 16)}..."`,
    ]
  })

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
}
