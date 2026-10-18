import fs from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { getServerPaths, ensureServerDirectoriesSync } from "./paths"

export interface AuditLogEntry {
  id: string
  timestamp: string
  action: string
  entity: "bol" | "invoice" | "ledger" | "device" | "backup" | "system" | "auth" | "sync"
  entityId?: string
  actor: string
  ip?: string
  details?: Record<string, unknown> | string
}

function getAuditLogPath(): string {
  try {
    const paths = ensureServerDirectoriesSync()
    return path.join(paths.logs, "audit.jsonl")
  } catch {
    return path.resolve(process.cwd(), "logs", "audit.jsonl")
  }
}

/**
 * Appends an audit event to the append-only audit log file.
 */
export async function logAuditEvent(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<AuditLogEntry> {
  const logFile = getAuditLogPath()
  const logDir = path.dirname(logFile)

  try {
    if (!existsSync(logDir)) {
      await fs.mkdir(logDir, { recursive: true })
    }

    const fullEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    }

    const line = JSON.stringify(fullEntry) + "\n"
    await fs.appendFile(logFile, line, "utf-8")
    return fullEntry
  } catch (err) {
    console.error("[AuditLog] Failed to write audit log entry:", err)
    return {
      id: "error",
      timestamp: new Date().toISOString(),
      ...entry,
    }
  }
}

/**
 * Reads the most recent audit log entries.
 */
export async function getRecentAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
  const logFile = getAuditLogPath()
  try {
    if (!existsSync(logFile)) return []

    const content = await fs.readFile(logFile, "utf-8")
    const lines = content.trim().split("\n").filter(Boolean)
    const entries: AuditLogEntry[] = []

    for (let i = lines.length - 1; i >= 0 && entries.length < limit; i--) {
      try {
        entries.push(JSON.parse(lines[i]))
      } catch {
        // Skip malformed lines
      }
    }

    return entries
  } catch (err) {
    console.error("[AuditLog] Failed to read audit logs:", err)
    return []
  }
}
