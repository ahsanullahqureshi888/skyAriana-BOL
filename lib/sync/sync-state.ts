/**
 * Sky Ariana BOL — Synchronization State & Configuration Manager
 * Manages explicit typed sync states, user preferences, and real-time UI notifications.
 */

import fs from "fs"
import path from "path"
import { getDataPath } from "@/lib/server-paths"
import { getDeviceProfile, updateDeviceName } from "./device"
import {
  type SyncStatusState,
  type SyncSettings,
  DEFAULT_SYNC_SETTINGS,
} from "./types"

const SETTINGS_FILE = getDataPath(".local-sync-settings.json")
const CLIENT_STORAGE_KEY = "skybol:sync-settings"

export interface SyncProgress {
  state: SyncStatusState
  currentStep?: string
  processedRecords?: number
  totalRecords?: number
  percentage?: number
  lastSyncTime?: string | null
  error?: string | null
}

type SyncStateListener = (progress: SyncProgress) => void

let currentProgress: SyncProgress = {
  state: "idle",
  lastSyncTime: null,
  processedRecords: 0,
  totalRecords: 0,
  percentage: 0,
}

const listeners = new Set<SyncStateListener>()

export function getSyncProgress(): SyncProgress {
  return { ...currentProgress }
}

export function updateSyncProgress(update: Partial<SyncProgress>): void {
  currentProgress = {
    ...currentProgress,
    ...update,
  }

  // Notify registered listeners
  listeners.forEach((listener) => {
    try {
      listener(currentProgress)
    } catch (e) {
      console.error("[sync-state] Error in sync state listener:", e)
    }
  })

  // Dispatch browser custom event if on client
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("skybol:sync-progress", {
        detail: currentProgress,
      })
    )
  }
}

export function subscribeToSyncProgress(listener: SyncStateListener): () => void {
  listeners.add(listener)
  listener(currentProgress)
  return () => {
    listeners.delete(listener)
  }
}

let cachedSettings: SyncSettings | null = null

export function getSyncSettings(): SyncSettings {
  if (cachedSettings) return cachedSettings

  const device = getDeviceProfile()

  if (typeof window === "undefined") {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const raw = fs.readFileSync(SETTINGS_FILE, "utf-8")
        const parsed = JSON.parse(raw) as Partial<SyncSettings>
        cachedSettings = {
          ...DEFAULT_SYNC_SETTINGS,
          ...parsed,
          deviceName: parsed.deviceName || device.deviceName,
        }
        return cachedSettings
      }
    } catch (e) {
      console.error("[sync-state] Failed to load settings from file:", e)
    }
  } else {
    try {
      const raw = window.localStorage.getItem(CLIENT_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SyncSettings>
        cachedSettings = {
          ...DEFAULT_SYNC_SETTINGS,
          ...parsed,
          deviceName: parsed.deviceName || device.deviceName,
        }
        return cachedSettings
      }
    } catch (_) {}
  }

  cachedSettings = {
    ...DEFAULT_SYNC_SETTINGS,
    deviceName: device.deviceName,
  }
  return cachedSettings
}

export function saveSyncSettings(updates: Partial<SyncSettings>): SyncSettings {
  const current = getSyncSettings()
  const next: SyncSettings = {
    ...current,
    ...updates,
    categories: {
      ...current.categories,
      ...(updates.categories || {}),
    },
  }

  if (updates.deviceName && updates.deviceName !== current.deviceName) {
    updateDeviceName(updates.deviceName)
  }

  cachedSettings = next

  if (typeof window === "undefined") {
    try {
      const dir = path.dirname(SETTINGS_FILE)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      const tmpPath = `${SETTINGS_FILE}.tmp.${Date.now()}`
      fs.writeFileSync(tmpPath, JSON.stringify(next, null, 2), "utf-8")
      try {
        fs.renameSync(tmpPath, SETTINGS_FILE)
      } catch {
        fs.copyFileSync(tmpPath, SETTINGS_FILE)
        try { fs.unlinkSync(tmpPath) } catch {}
      }
    } catch (e) {
      console.error("[sync-state] Failed to save settings to file:", e)
    }
  } else {
    try {
      window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(next))
      window.dispatchEvent(new CustomEvent("skybol:sync-settings-updated", { detail: next }))
    } catch (_) {}
  }

  return next
}
