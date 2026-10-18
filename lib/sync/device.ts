/**
 * Sky Ariana BOL — Device Identity Manager
 * Generates and maintains a permanent, stable device ID and friendly name profile.
 */

import fs from "fs"
import path from "path"
import os from "os"
import crypto from "crypto"
import { getDataPath } from "@/lib/server-paths"
import { CURRENT_SYSTEM_VERSION } from "@/lib/config/system-version"
import type { SyncDevice } from "./types"

const DEVICE_FILE = getDataPath(".local-device.json")
const CLIENT_STORAGE_KEY = "skybol:device-identity"

let cachedDevice: SyncDevice | null = null

export function detectPlatform(): "Windows" | "macOS" | "Linux" | "Web" | "Unknown" {
  if (typeof window !== "undefined") {
    const userAgent = window.navigator.userAgent.toLowerCase()
    if (userAgent.includes("win")) return "Windows"
    if (userAgent.includes("mac")) return "macOS"
    if (userAgent.includes("linux")) return "Linux"
    return "Web"
  }
  const platform = os.platform()
  if (platform === "win32") return "Windows"
  if (platform === "darwin") return "macOS"
  if (platform === "linux") return "Linux"
  return "Unknown"
}

function generateStableDeviceId(): string {
  // Generate a human-readable, unique station identifier e.g. KDH-OFFICE-9C4B2E
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase()
  const hostname = (os.hostname ? os.hostname() : "OFFICE").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()
  return `SKY-${hostname || "STATION"}-${rand}`
}

function generateDefaultDeviceName(): string {
  const platform = detectPlatform()
  if (typeof window !== "undefined" && window.location.hostname.includes("laptop")) {
    return "Ahsan Laptop"
  }
  return `Office Station (${platform})`
}

/**
 * Load existing device identity from disk or localStorage, or initialize once.
 */
export function getDeviceProfile(): SyncDevice {
  if (cachedDevice) {
    cachedDevice.lastSeenAt = new Date().toISOString()
    return cachedDevice
  }

  // 1. Try reading from server filesystem
  if (typeof window === "undefined") {
    try {
      if (fs.existsSync(DEVICE_FILE)) {
        const raw = fs.readFileSync(DEVICE_FILE, "utf-8")
        const parsed = JSON.parse(raw) as SyncDevice
        if (parsed.deviceId) {
          parsed.lastSeenAt = new Date().toISOString()
          parsed.isCurrentDevice = true
          cachedDevice = parsed
          saveDeviceProfile(parsed)
          return parsed
        }
      }
    } catch (e) {
      console.warn("[device] Error reading server device file, generating fallback:", e)
    }
  } else {
    // 2. Try reading from browser localStorage
    try {
      const raw = window.localStorage.getItem(CLIENT_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as SyncDevice
        if (parsed.deviceId) {
          parsed.lastSeenAt = new Date().toISOString()
          parsed.isCurrentDevice = true
          cachedDevice = parsed
          window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(parsed))
          return parsed
        }
      }
    } catch (_) {}
  }

  // 3. Create fresh permanent device profile
  const newProfile: SyncDevice = {
    deviceId: generateStableDeviceId(),
    deviceName: generateDefaultDeviceName(),
    platform: detectPlatform(),
    appVersion: CURRENT_SYSTEM_VERSION.version || "5.1.0",
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    isCurrentDevice: true,
  }

  saveDeviceProfile(newProfile)
  cachedDevice = newProfile
  return newProfile
}

export function saveDeviceProfile(device: SyncDevice): void {
  cachedDevice = { ...device, lastSeenAt: new Date().toISOString(), isCurrentDevice: true }

  if (typeof window === "undefined") {
    try {
      const dir = path.dirname(DEVICE_FILE)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      const tmpPath = `${DEVICE_FILE}.tmp.${Date.now()}`
      fs.writeFileSync(tmpPath, JSON.stringify(cachedDevice, null, 2), "utf-8")
      try {
        fs.renameSync(tmpPath, DEVICE_FILE)
      } catch {
        fs.copyFileSync(tmpPath, DEVICE_FILE)
        try { fs.unlinkSync(tmpPath) } catch {}
      }
    } catch (e) {
      console.error("[device] Failed to persist device profile to disk:", e)
    }
  } else {
    try {
      window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(cachedDevice))
    } catch (_) {}
  }
}

export function updateDeviceName(friendlyName: string): SyncDevice {
  const current = getDeviceProfile()
  const updated: SyncDevice = {
    ...current,
    deviceName: friendlyName.trim() || current.deviceName,
    lastSeenAt: new Date().toISOString(),
  }
  saveDeviceProfile(updated)
  return updated
}
