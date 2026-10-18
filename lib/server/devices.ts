import path from "node:path"
import { readJsonFile, mutateJsonFile } from "../services/blob-db"
import { getServerPaths, ensureServerDirectoriesSync } from "./paths"
import { type ServerUserRole, revokeDeviceSessions } from "./auth"

export interface ServerDeviceRecord {
  id: string
  name: string
  role: ServerUserRole
  ip: string
  platform: string
  pairedAt: string
  lastSeenAt: string
  revoked: boolean
  blocked: boolean
  notes?: string
}

export function getDevicesFilePath(): string {
  try {
    const paths = ensureServerDirectoriesSync()
    return path.join(paths.config, "devices.json")
  } catch {
    return path.resolve(process.cwd(), ".local-server-devices.json")
  }
}

/**
 * Returns all registered client devices.
 */
export async function getDevices(): Promise<ServerDeviceRecord[]> {
  const filePath = getDevicesFilePath()
  try {
    const data = await readJsonFile<Record<string, ServerDeviceRecord>>(filePath, {})
    return Object.values(data).sort((a, b) => {
      return new Date(b.lastSeenAt || b.pairedAt).getTime() - new Date(a.lastSeenAt || a.pairedAt).getTime()
    })
  } catch {
    return []
  }
}

/**
 * Retrieves a single device record by its ID.
 */
export async function getDeviceById(id: string): Promise<ServerDeviceRecord | null> {
  const filePath = getDevicesFilePath()
  try {
    const data = await readJsonFile<Record<string, ServerDeviceRecord>>(filePath, {})
    return data[id] || null
  } catch {
    return null
  }
}

/**
 * Registers a newly paired device.
 */
export async function registerDevice(options: {
  id: string
  name: string
  role: ServerUserRole
  ip?: string
  platform?: string
  notes?: string
}): Promise<ServerDeviceRecord> {
  const filePath = getDevicesFilePath()
  const now = new Date().toISOString()

  const record: ServerDeviceRecord = {
    id: options.id,
    name: options.name.trim() || `Client-${options.id.slice(0, 6)}`,
    role: options.role,
    ip: options.ip || "127.0.0.1",
    platform: options.platform || "windows",
    pairedAt: now,
    lastSeenAt: now,
    revoked: false,
    blocked: false,
    notes: options.notes,
  }

  await mutateJsonFile<Record<string, ServerDeviceRecord>>(filePath, {}, (current) => ({
    ...(current || {}),
    [record.id]: record,
  }))

  return record
}

/**
 * Updates a device's lastSeenAt timestamp and optionally IP.
 */
export async function updateDeviceLastSeen(deviceId: string, ip?: string): Promise<void> {
  const filePath = getDevicesFilePath()
  const now = new Date().toISOString()

  await mutateJsonFile<Record<string, ServerDeviceRecord>>(filePath, {}, (current) => {
    if (!current[deviceId]) return current
    return {
      ...current,
      [deviceId]: {
        ...current[deviceId],
        lastSeenAt: now,
        ...(ip ? { ip } : {}),
      },
    }
  })
}

/**
 * Renames a registered device.
 */
export async function renameDevice(deviceId: string, newName: string): Promise<ServerDeviceRecord> {
  const filePath = getDevicesFilePath()
  const cleanName = newName.trim()
  if (!cleanName) {
    throw new Error("Device name cannot be blank.")
  }

  let updatedRecord: ServerDeviceRecord | null = null

  await mutateJsonFile<Record<string, ServerDeviceRecord>>(filePath, {}, (current) => {
    if (!current[deviceId]) {
      throw new Error(`Device ${deviceId} not found.`)
    }
    updatedRecord = {
      ...current[deviceId],
      name: cleanName,
    }
    return {
      ...current,
      [deviceId]: updatedRecord,
    }
  })

  if (!updatedRecord) {
    throw new Error(`Device ${deviceId} not found.`)
  }

  return updatedRecord
}

/**
 * Updates a registered device's role.
 */
export async function updateDeviceRole(
  deviceId: string,
  role: ServerUserRole
): Promise<ServerDeviceRecord> {
  const filePath = getDevicesFilePath()
  let updatedRecord: ServerDeviceRecord | null = null

  await mutateJsonFile<Record<string, ServerDeviceRecord>>(filePath, {}, (current) => {
    if (!current[deviceId]) {
      throw new Error(`Device ${deviceId} not found.`)
    }
    updatedRecord = {
      ...current[deviceId],
      role,
    }
    return {
      ...current,
      [deviceId]: updatedRecord,
    }
  })

  if (!updatedRecord) {
    throw new Error(`Device ${deviceId} not found.`)
  }

  return updatedRecord
}

/**
 * Revokes a device. The device token will immediately become invalid.
 */
export async function revokeDevice(deviceId: string): Promise<void> {
  const filePath = getDevicesFilePath()

  await mutateJsonFile<Record<string, ServerDeviceRecord>>(filePath, {}, (current) => {
    if (!current[deviceId]) return current
    return {
      ...current,
      [deviceId]: {
        ...current[deviceId],
        revoked: true,
      },
    }
  })

  await revokeDeviceSessions(deviceId)
}

/**
 * Unrevokes a previously revoked device.
 */
export async function unrevokeDevice(deviceId: string): Promise<void> {
  const filePath = getDevicesFilePath()

  await mutateJsonFile<Record<string, ServerDeviceRecord>>(filePath, {}, (current) => {
    if (!current[deviceId]) return current
    return {
      ...current,
      [deviceId]: {
        ...current[deviceId],
        revoked: false,
      },
    }
  })
}

/**
 * Blocks a device entirely from connecting.
 */
export async function blockDevice(deviceId: string): Promise<void> {
  const filePath = getDevicesFilePath()

  await mutateJsonFile<Record<string, ServerDeviceRecord>>(filePath, {}, (current) => {
    if (!current[deviceId]) return current
    return {
      ...current,
      [deviceId]: {
        ...current[deviceId],
        blocked: true,
        revoked: true,
      },
    }
  })

  await revokeDeviceSessions(deviceId)
}

/**
 * Unblocks a device.
 */
export async function unblockDevice(deviceId: string): Promise<void> {
  const filePath = getDevicesFilePath()

  await mutateJsonFile<Record<string, ServerDeviceRecord>>(filePath, {}, (current) => {
    if (!current[deviceId]) return current
    return {
      ...current,
      [deviceId]: {
        ...current[deviceId],
        blocked: false,
        revoked: false,
      },
    }
  })
}

/**
 * Deletes a device registration permanently.
 */
export async function deleteDevice(deviceId: string): Promise<void> {
  const filePath = getDevicesFilePath()

  await mutateJsonFile<Record<string, ServerDeviceRecord>>(filePath, {}, (current) => {
    const copy = { ...current }
    delete copy[deviceId]
    return copy
  })

  await revokeDeviceSessions(deviceId)
}
