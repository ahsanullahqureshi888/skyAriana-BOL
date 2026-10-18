import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, mutateJsonFile } from "@/lib/services/blob-db"

const REVISION_FILE = getDataPath(".local-database-revision.json")

export interface DatabaseRevisionInfo {
  revision: number
  lastUpdated: string
  updatedByDevice?: string
  lastAction?: string
}

const DEFAULT_REVISION_INFO: DatabaseRevisionInfo = {
  revision: 1000,
  lastUpdated: new Date().toISOString(),
  updatedByDevice: "local-device",
  lastAction: "initial",
}

/**
 * Reads the current local database revision number.
 */
export async function getDatabaseRevision(): Promise<number> {
  try {
    const data = await readJsonFile<DatabaseRevisionInfo>(REVISION_FILE, DEFAULT_REVISION_INFO)
    return data?.revision || 1000
  } catch {
    return 1000
  }
}

/**
 * Reads the full database revision metadata.
 */
export async function getDatabaseRevisionInfo(): Promise<DatabaseRevisionInfo> {
  try {
    return await readJsonFile<DatabaseRevisionInfo>(REVISION_FILE, DEFAULT_REVISION_INFO)
  } catch {
    return { ...DEFAULT_REVISION_INFO }
  }
}

/**
 * Increments the database revision monotonically and records the action.
 */
export async function incrementDatabaseRevision(
  action = "data_updated",
  deviceId?: string
): Promise<number> {
  const updated = await mutateJsonFile<DatabaseRevisionInfo>(
    REVISION_FILE,
    DEFAULT_REVISION_INFO,
    (current) => {
      const currentRev = current?.revision && Number.isFinite(current.revision) ? current.revision : 1000
      return {
        revision: currentRev + 1,
        lastUpdated: new Date().toISOString(),
        updatedByDevice: deviceId || current?.updatedByDevice || "local-device",
        lastAction: action,
      }
    }
  )
  return updated.revision
}

/**
 * Updates the database revision to at least the specified revision.
 */
export async function setDatabaseRevisionIfHigher(
  targetRevision: number,
  action = "synced_from_cloud"
): Promise<number> {
  const updated = await mutateJsonFile<DatabaseRevisionInfo>(
    REVISION_FILE,
    DEFAULT_REVISION_INFO,
    (current) => {
      const currentRev = current?.revision || 1000
      const newRev = Math.max(currentRev, targetRevision)
      return {
        revision: newRev,
        lastUpdated: new Date().toISOString(),
        updatedByDevice: current?.updatedByDevice || "local-device",
        lastAction: action,
      }
    }
  )
  return updated.revision
}
