/**
 * Sky Ariana BOL — Conflict Resolver & Staging Manager
 * Manages active sync conflicts, non-destructive resolutions, and BOL number collisions.
 */

import fs from "fs"
import path from "path"
import { getDataPath } from "@/lib/server-paths"
import { computeRecordChecksum } from "./checksums"
import type { SyncConflict, SyncRecord } from "./types"

const CONFLICTS_FILE = getDataPath(".local-conflicts.json")
const CLIENT_STORAGE_KEY = "skybol:conflicts"

let cachedConflicts: SyncConflict[] | null = null

function readConflictsFromDisk(): SyncConflict[] {
  if (typeof window === "undefined") {
    try {
      if (fs.existsSync(CONFLICTS_FILE)) {
        const raw = fs.readFileSync(CONFLICTS_FILE, "utf-8")
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
      }
    } catch {
      return []
    }
    return []
  } else {
    try {
      const raw = window.localStorage.getItem(CLIENT_STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }
}

function writeConflictsToDisk(conflicts: SyncConflict[]): void {
  cachedConflicts = conflicts
  if (typeof window === "undefined") {
    try {
      const dir = path.dirname(CONFLICTS_FILE)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      const tmpPath = `${CONFLICTS_FILE}.tmp.${Date.now()}`
      fs.writeFileSync(tmpPath, JSON.stringify(conflicts, null, 2), "utf-8")
      try {
        fs.renameSync(tmpPath, CONFLICTS_FILE)
      } catch {
        fs.copyFileSync(tmpPath, CONFLICTS_FILE)
        try { fs.unlinkSync(tmpPath) } catch {}
      }
    } catch (e) {
      console.error("[conflict-resolver] Failed to write conflicts file:", e)
    }
  } else {
    try {
      window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(conflicts))
    } catch (_) {}
  }
}

export function getConflicts(): SyncConflict[] {
  if (!cachedConflicts) {
    cachedConflicts = readConflictsFromDisk()
  }
  return cachedConflicts.filter((c) => !c.resolved)
}

export function getConflictById(id: string): SyncConflict | undefined {
  return getConflicts().find((c) => c.id === id)
}

export function registerConflict(
  recordId: string,
  recordType: SyncConflict["recordType"],
  localRecord: SyncRecord,
  cloudRecord: SyncRecord,
  conflictingFields: string[]
): SyncConflict {
  const list = readConflictsFromDisk()
  // Check if conflict already exists for this record
  const existingIdx = list.findIndex((c) => c.recordId === recordId && !c.resolved)

  const conflict: SyncConflict = {
    id: `conflict-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    recordId,
    recordType,
    localRecord,
    cloudRecord,
    conflictingFields,
    resolved: false,
  }

  if (existingIdx >= 0) {
    list[existingIdx] = conflict
  } else {
    list.unshift(conflict)
  }

  writeConflictsToDisk(list)
  return conflict
}

export interface ResolveConflictOptions {
  strategy: "keep_local" | "keep_cloud" | "merge" | "keep_both"
  customData?: any
  resolvedByDevice: string
}

export interface ResolvedConflictOutput {
  winningRecord: SyncRecord
  duplicateRecord?: SyncRecord // Present if strategy is 'keep_both'
}

/**
 * Resolves a conflict using user-chosen non-destructive resolution strategy.
 */
export function resolveConflict(
  conflictId: string,
  options: ResolveConflictOptions
): ResolvedConflictOutput {
  const list = readConflictsFromDisk()
  const conflict = list.find((c) => c.id === conflictId)

  if (!conflict) {
    throw new Error(`Conflict with id ${conflictId} not found`)
  }

  let winningRecord: SyncRecord
  let duplicateRecord: SyncRecord | undefined

  const nextVersion = Math.max(conflict.localRecord.version, conflict.cloudRecord.version) + 1
  const now = new Date().toISOString()

  switch (options.strategy) {
    case "keep_local":
      winningRecord = {
        ...conflict.localRecord,
        version: nextVersion,
        updatedAt: now,
        updatedByDevice: options.resolvedByDevice,
        checksum: computeRecordChecksum(conflict.localRecord.data),
      }
      break

    case "keep_cloud":
      winningRecord = {
        ...conflict.cloudRecord,
        version: nextVersion,
        updatedAt: now,
        updatedByDevice: options.resolvedByDevice,
        checksum: computeRecordChecksum(conflict.cloudRecord.data),
      }
      break

    case "merge":
      const mergedData = options.customData || { ...conflict.cloudRecord.data, ...conflict.localRecord.data }
      winningRecord = {
        ...conflict.localRecord,
        version: nextVersion,
        updatedAt: now,
        updatedByDevice: options.resolvedByDevice,
        checksum: computeRecordChecksum(mergedData),
        data: mergedData,
      }
      break

    case "keep_both":
      winningRecord = {
        ...conflict.localRecord,
        version: nextVersion,
        updatedAt: now,
        updatedByDevice: options.resolvedByDevice,
        checksum: computeRecordChecksum(conflict.localRecord.data),
      }

      // Clone cloud record with new unique ID and disambiguated title/number
      const cloudData = { ...conflict.cloudRecord.data }
      if (cloudData.bol_number) {
        cloudData.bol_number = `${cloudData.bol_number}-CLOUD`
      }
      if (cloudData.invoice_number) {
        cloudData.invoice_number = `${cloudData.invoice_number}-CLOUD`
      }

      duplicateRecord = {
        ...conflict.cloudRecord,
        id: `${conflict.cloudRecord.id}-copy-${Date.now()}`,
        version: 1,
        createdAt: now,
        updatedAt: now,
        updatedByDevice: options.resolvedByDevice,
        checksum: computeRecordChecksum(cloudData),
        data: cloudData,
      }
      break

    default:
      throw new Error(`Unsupported conflict resolution strategy: ${options.strategy}`)
  }

  // Mark conflict as resolved
  conflict.resolved = true
  conflict.resolutionStrategy = options.strategy
  conflict.resolvedAt = now

  writeConflictsToDisk(list)

  return { winningRecord, duplicateRecord }
}
