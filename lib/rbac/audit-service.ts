import { AuditLog } from "./rbac-types"

const AUDIT_STORAGE_KEY = "skyariana_audit_logs_v1"
const MAX_IN_MEMORY_LOGS = 2000

// Safe in-memory cache for serverless environments
let serverMemoryLogs: AuditLog[] = []

// Filter out passwords and secrets
function sanitizePayload(data: any): any {
  if (!data || typeof data !== "object") return data
  if (Array.isArray(data)) return data.map(sanitizePayload)

  const sanitized: Record<string, any> = {}
  const sensitiveKeys = ["password", "token", "secret", "apikey", "authorization", "auth", "secretkey"]

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = "[REDACTED]"
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizePayload(value)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

export function logAuditEvent(params: {
  userId: string
  userName: string
  action: string
  entityType: string
  entityId: string
  description: string
  oldValues?: Record<string, any> | null
  newValues?: Record<string, any> | null
  metadata?: {
    ip?: string
    userAgent?: string
    branch?: string
    department?: string
  }
}): AuditLog {
  const newLog: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: params.userId || "anonymous",
    user_name: params.userName || "System",
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    description: params.description,
    old_values: sanitizePayload(params.oldValues),
    new_values: sanitizePayload(params.newValues),
    metadata: params.metadata,
    created_at: new Date().toISOString(),
  }

  // Update memory cache
  serverMemoryLogs.unshift(newLog)
  if (serverMemoryLogs.length > MAX_IN_MEMORY_LOGS) {
    serverMemoryLogs = serverMemoryLogs.slice(0, MAX_IN_MEMORY_LOGS)
  }

  // Persist in localStorage if running client-side
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(AUDIT_STORAGE_KEY)
      const existing: AuditLog[] = stored ? JSON.parse(stored) : []
      existing.unshift(newLog)
      const trimmed = existing.slice(0, MAX_IN_MEMORY_LOGS)
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(trimmed))
    } catch {
      // LocalStorage quota fallback
    }
  }

  return newLog
}

export function getAuditLogs(filters?: {
  userId?: string
  entityType?: string
  action?: string
  startDate?: string
  endDate?: string
  search?: string
  limit?: number
}): AuditLog[] {
  let logs: AuditLog[] = []

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(AUDIT_STORAGE_KEY)
      if (stored) logs = JSON.parse(stored)
    } catch {
      logs = []
    }
  } else {
    logs = [...serverMemoryLogs]
  }

  // Apply filters
  if (!filters) return logs

  return logs.filter((log) => {
    if (filters.userId && log.user_id !== filters.userId) return false
    if (filters.entityType && log.entity_type !== filters.entityType) return false
    if (filters.action && log.action !== filters.action) return false
    if (filters.startDate && new Date(log.created_at) < new Date(filters.startDate)) return false
    if (filters.endDate && new Date(log.created_at) > new Date(filters.endDate)) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const match =
        log.user_name.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q) ||
        log.entity_id.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  }).slice(0, filters.limit || 500)
}

export function exportAuditLogsToCsv(logs?: AuditLog[]): string {
  const targetLogs = logs || getAuditLogs({ limit: 1000 })
  const headers = ["ID", "Timestamp", "User ID", "User Name", "Action", "Entity Type", "Entity ID", "Description"]

  const rows = targetLogs.map((log) => [
    `"${log.id}"`,
    `"${log.created_at}"`,
    `"${log.user_id}"`,
    `"${log.user_name.replace(/"/g, '""')}"`,
    `"${log.action}"`,
    `"${log.entity_type}"`,
    `"${log.entity_id}"`,
    `"${log.description.replace(/"/g, '""')}"`,
  ])

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
}
