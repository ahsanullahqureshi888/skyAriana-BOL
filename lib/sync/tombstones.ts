/**
 * Sky Ariana BOL — Tombstone Manager
 * Tracks deleted records to prevent cross-device resurrection and powers "Recently Deleted" restore UI.
 */

import fs from "fs"
import path from "path"
import { getDataPath } from "@/lib/server-paths"
import { getDeviceProfile } from "./device"
import type { Tombstone, SyncRecordType } from "./types"

const TOMBSTONES_FILE = getDataPath(".local-tombstones.json")
const CLIENT_STORAGE_KEY = "skybol:tombstones"
const DEFAULT_RETENTION_DAYS = 30

let cachedTombstones: Tombstone[] | null = null

function readTombstonesFromDisk(): Tombstone[] {
  if (typeof window === "undefined") {
    try {
      if (fs.existsSync(TOMBSTONES_FILE)) {
        const raw = fs.readFileSync(TOMBSTONES_FILE, "utf-8")
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
      }
    } catch (e) {
      console.error("[tombstones] Failed to read tombstones file:", e)
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

function writeTombstonesToDisk(list: Tombstone[]): void {
  cachedTombstones = list
  if (typeof window === "undefined") {
    try {
      const dir = path.dirname(TOMBSTONES_FILE)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      const tmpPath = `${TOMBSTONES_FILE}.tmp.${Date.now()}`
      fs.writeFileSync(tmpPath, JSON.stringify(list, null, 2), "utf-8")
      try {
        fs.renameSync(tmpPath, TOMBSTONES_FILE)
      } catch {
        fs.copyFileSync(tmpPath, TOMBSTONES_FILE)
        try { fs.unlinkSync(tmpPath) } catch {}
      }
    } catch (e) {
      console.error("[tombstones] Failed to write tombstones file:", e)
    }
  } else {
    try {
      window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(list))
    } catch (_) {}
  }
}

export function getTombstones(): Tombstone[] {
  if (!cachedTombstones) {
    cachedTombstones = readTombstonesFromDisk()
  }
  return cachedTombstones
}

export function isRecordTombstoned(recordId: string): boolean {
  if (!recordId) return false
  const list = getTombstones()
  return list.some((t) => t.recordId === recordId)
}

export function addTombstone(
  recordId: string,
  type: SyncRecordType,
  version = 1,
  title?: string,
  originalData?: any
): Tombstone {
  const device = getDeviceProfile()
  const list = getTombstones().filter((t) => t.recordId !== recordId)

  const tombstone: Tombstone = {
    recordId,
    type,
    deletedAt: new Date().toISOString(),
    deletedByDevice: device.deviceId,
    version: version + 1,
    title: title || `${type.toUpperCase()} ${recordId}`,
    originalData,
  }

  list.unshift(tombstone)
  writeTombstonesToDisk(list)
  return tombstone
}

export function permanentlyDelete(recordId: string): void {
  const list = getTombstones().filter((t) => t.recordId !== recordId)
  writeTombstonesToDisk(list)
}

export function restoreRecord(recordId: string): any {
  const list = getTombstones()
  const found = list.find((t) => t.recordId === recordId)
  if (!found) return null

  // Remove tombstone so it can be re-synchronized as active
  const remaining = list.filter((t) => t.recordId !== recordId)
  writeTombstonesToDisk(remaining)

  return found.originalData || null
}

export function purgeExpiredTombstones(retentionDays = DEFAULT_RETENTION_DAYS): number {
  const list = getTombstones()
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  const active = list.filter((t) => new Date(t.deletedAt).getTime() > cutoffTime)
  const purgedCount = list.length - active.length

  if (purgedCount > 0) {
    writeTombstonesToDisk(active)
  }
  return purgedCount
}

export const createTombstone = addTombstone
export const removeTombstone = permanentlyDelete
