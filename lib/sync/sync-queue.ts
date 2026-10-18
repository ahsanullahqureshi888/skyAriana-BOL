/**
 * Sky Ariana BOL — Offline-First Persistent Sync Queue
 * Manages background queued changes, retry backoff, and ensures offline mutations are safely stored.
 */

import fs from "fs"
import path from "path"
import { getDataPath } from "@/lib/server-paths"
import type { SyncQueueItem, SyncRecordType, SyncOperation } from "./types"

const QUEUE_FILE = getDataPath(".local-sync-queue.json")
const CLIENT_STORAGE_KEY = "skybol:sync-queue"
const MAX_RETRIES = 5

let cachedQueue: SyncQueueItem[] | null = null

function readQueueFromDisk(): SyncQueueItem[] {
  if (typeof window === "undefined") {
    try {
      if (fs.existsSync(QUEUE_FILE)) {
        const raw = fs.readFileSync(QUEUE_FILE, "utf-8")
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

function writeQueueToDisk(queue: SyncQueueItem[]): void {
  cachedQueue = queue
  if (typeof window === "undefined") {
    try {
      const dir = path.dirname(QUEUE_FILE)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      const tmpPath = `${QUEUE_FILE}.tmp.${Date.now()}`
      fs.writeFileSync(tmpPath, JSON.stringify(queue, null, 2), "utf-8")
      try {
        fs.renameSync(tmpPath, QUEUE_FILE)
      } catch {
        fs.copyFileSync(tmpPath, QUEUE_FILE)
        try { fs.unlinkSync(tmpPath) } catch {}
      }
    } catch (e) {
      console.error("[sync-queue] Failed to write queue file:", e)
    }
  } else {
    try {
      window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(queue))
    } catch (_) {}
  }
}

export function getQueue(): SyncQueueItem[] {
  if (!cachedQueue) {
    cachedQueue = readQueueFromDisk()
  }
  return cachedQueue
}

export function getPendingQueueItems(): SyncQueueItem[] {
  return getQueue().filter((item) => item.status === "pending" || item.status === "failed")
}

export function getQueueStats(): { pending: number; failed: number; uploading: number; synced: number } {
  const items = getQueue()
  let pending = 0
  let failed = 0
  let uploading = 0
  let synced = 0

  for (const item of items) {
    if (item.status === "pending") pending++
    else if (item.status === "failed") failed++
    else if (item.status === "uploading") uploading++
    else if (item.status === "synced") synced++
  }

  return { pending, failed, uploading, synced }
}

/**
 * Enqueue a change to be synchronized in the background.
 * Debounces duplicate pending changes for the same record.
 */
export function enqueueChange(
  recordId: string,
  recordType: SyncRecordType,
  operation: SyncOperation,
  payload: any
): SyncQueueItem {
  const queue = getQueue()
  const existingIdx = queue.findIndex(
    (item) => item.recordId === recordId && (item.status === "pending" || item.status === "failed")
  )

  const now = new Date().toISOString()
  if (existingIdx >= 0) {
    // Update existing pending change
    queue[existingIdx].operation = operation
    queue[existingIdx].payload = payload
    queue[existingIdx].status = "pending"
    queue[existingIdx].updatedAt = now
    writeQueueToDisk(queue)
    return queue[existingIdx]
  }

  const newItem: SyncQueueItem = {
    id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    recordId,
    recordType,
    operation,
    payload,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  }

  queue.push(newItem)
  writeQueueToDisk(queue)
  return newItem
}

export function markQueueItemUploading(id: string): void {
  const queue = getQueue()
  const item = queue.find((i) => i.id === id)
  if (item) {
    item.status = "uploading"
    item.updatedAt = new Date().toISOString()
    writeQueueToDisk(queue)
  }
}

export function markQueueItemSynced(id: string): void {
  const queue = getQueue()
  const itemIndex = queue.findIndex((i) => i.id === id)
  if (itemIndex >= 0) {
    // Remove completed item from queue to keep it fast and compact
    queue.splice(itemIndex, 1)
    writeQueueToDisk(queue)
  }
}

export function markQueueItemFailed(id: string, errorMessage: string): void {
  const queue = getQueue()
  const item = queue.find((i) => i.id === id)
  if (item) {
    item.attempts += 1
    item.status = "failed"
    item.lastError = errorMessage
    item.updatedAt = new Date().toISOString()
    writeQueueToDisk(queue)
  }
}

export function retryAllFailedItems(): number {
  const queue = getQueue()
  let count = 0
  for (const item of queue) {
    if (item.status === "failed") {
      item.status = "pending"
      item.attempts = 0
      item.lastError = undefined
      item.updatedAt = new Date().toISOString()
      count++
    }
  }
  if (count > 0) writeQueueToDisk(queue)
  return count
}

export function clearSyncedItems(): void {
  const queue = getQueue().filter((item) => item.status !== "synced")
  writeQueueToDisk(queue)
}
