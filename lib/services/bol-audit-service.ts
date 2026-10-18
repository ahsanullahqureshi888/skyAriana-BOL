/**
 * Bill of Lading Lifecycle Audit Logger
 * Maintains non-destructive historical traceability for BOL mutations, duplicates, archive, and file operations.
 */

import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, mutateJsonFile } from "@/lib/services/blob-db"

export type BolLifecycleAction =
  | "BOL_CREATED"
  | "BOL_DUPLICATED"
  | "BOL_UPDATED"
  | "BOL_ARCHIVED"
  | "BOL_RESTORED"
  | "BOL_DELETED"
  | "PDF_GENERATED"
  | "PDF_REGENERATED"
  | "FILE_ATTACHED"
  | "FILE_DELETED"

export interface BolLifecycleAuditEntry {
  id: string
  action: BolLifecycleAction
  entityId: string
  bolNumber: string
  timestamp: string
  actor: string
  metadata?: Record<string, any>
}

const AUDIT_FILE = getDataPath(".local-bol-audit-log.json")

/**
 * Appends an audit entry compactly without storing huge binaries or PDF payloads.
 */
export async function logBolLifecycleAudit(
  entry: Omit<BolLifecycleAuditEntry, "id" | "timestamp"> & { timestamp?: string }
): Promise<BolLifecycleAuditEntry> {
  const record: BolLifecycleAuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    ...entry,
  }

  try {
    await mutateJsonFile<BolLifecycleAuditEntry[]>(AUDIT_FILE, [], (current) => {
      const list = Array.isArray(current) ? current : []
      // Prepend newest first, cap at 1000 entries
      return [record, ...list].slice(0, 1000)
    })
  } catch (err) {
    console.warn("[bol-audit-service] Failed to persist audit log:", err)
  }

  return record
}

/**
 * Returns recent audit entries for a specific BOL or globally.
 */
export async function getBolAuditHistory(bolIdOrNumber?: string, limit = 50): Promise<BolLifecycleAuditEntry[]> {
  try {
    const all = await readJsonFile<BolLifecycleAuditEntry[]>(AUDIT_FILE, [])
    if (!bolIdOrNumber) return all.slice(0, limit)
    const needle = bolIdOrNumber.trim().toLowerCase()
    return all
      .filter((e) => e.bolNumber?.toLowerCase() === needle || e.entityId?.toLowerCase() === needle)
      .slice(0, limit)
  } catch {
    return []
  }
}
