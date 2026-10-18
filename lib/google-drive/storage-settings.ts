import fs from "node:fs/promises"
import path from "node:path"
import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, mutateJsonFile } from "@/lib/services/blob-db"
import type {
  GoogleDriveFolderConfig,
  GoogleDriveSettings,
  GoogleDriveTokens,
} from "./types"

const TOKENS_FILE = getDataPath(".local-gdrive-tokens.json")
const CONFIG_FILE = getDataPath(".local-gdrive-config.json")
const FOLDERS_FILE = getDataPath(".local-gdrive-folders.json")
const PENDING_FILE = getDataPath(".local-gdrive-pending.json")

export const DEFAULT_GDRIVE_SETTINGS: GoogleDriveSettings = {
  autoBackupEnabled: false,
  autoBackupInterval: "daily",
  retentionLimit: 10,
  includePdfs: true,
  includeDocuments: true,
  autoUploadPdfs: false,
  wifiOnly: false,
}

// ---------------------------------------------------------------------------
// TOKENS STORAGE (Server-side only, never sent to browser)
// ---------------------------------------------------------------------------

export async function readStoredTokens(): Promise<GoogleDriveTokens | null> {
  try {
    const tokens = await readJsonFile<GoogleDriveTokens | null>(TOKENS_FILE, null)
    if (tokens && tokens.accessToken) {
      return tokens
    }
    return null
  } catch {
    return null
  }
}

export async function saveStoredTokens(tokens: GoogleDriveTokens): Promise<void> {
  await mutateJsonFile<GoogleDriveTokens>(TOKENS_FILE, tokens, () => tokens)
}

export async function clearStoredTokens(): Promise<void> {
  try {
    await fs.unlink(TOKENS_FILE)
  } catch {
    // File might not exist
  }
}

// ---------------------------------------------------------------------------
// SETTINGS STORAGE
// ---------------------------------------------------------------------------

export async function readDriveSettings(): Promise<GoogleDriveSettings> {
  try {
    const saved = await readJsonFile<Partial<GoogleDriveSettings>>(CONFIG_FILE, {})
    return {
      ...DEFAULT_GDRIVE_SETTINGS,
      ...saved,
    }
  } catch {
    return { ...DEFAULT_GDRIVE_SETTINGS }
  }
}

export async function updateDriveSettings(
  partial: Partial<GoogleDriveSettings>
): Promise<GoogleDriveSettings> {
  return mutateJsonFile<GoogleDriveSettings>(
    CONFIG_FILE,
    DEFAULT_GDRIVE_SETTINGS,
    (current) => ({
      ...DEFAULT_GDRIVE_SETTINGS,
      ...current,
      ...partial,
    })
  )
}

// ---------------------------------------------------------------------------
// FOLDER ID CACHE (Ensures Sky Ariana folders are never duplicated)
// ---------------------------------------------------------------------------

export async function readCachedFolders(): Promise<GoogleDriveFolderConfig | null> {
  try {
    const cached = await readJsonFile<GoogleDriveFolderConfig | null>(FOLDERS_FILE, null)
    if (cached && cached.rootFolderId && cached.backupsFolderId) {
      return cached
    }
    return null
  } catch {
    return null
  }
}

export async function saveCachedFolders(folders: GoogleDriveFolderConfig): Promise<void> {
  await mutateJsonFile<GoogleDriveFolderConfig>(FOLDERS_FILE, folders, () => folders)
}

export async function clearCachedFolders(): Promise<void> {
  try {
    await fs.unlink(FOLDERS_FILE)
  } catch {}
}

// ---------------------------------------------------------------------------
// OFFLINE PENDING BACKUP QUEUE
// ---------------------------------------------------------------------------

export interface PendingBackupRecord {
  pending: boolean
  queuedAt?: string
  lastAttemptAt?: string
  attemptCount: number
  lastError?: string
}

export async function getPendingBackupStatus(): Promise<PendingBackupRecord> {
  return readJsonFile<PendingBackupRecord>(PENDING_FILE, {
    pending: false,
    attemptCount: 0,
  })
}

export async function setPendingBackup(pending: boolean, error?: string): Promise<void> {
  await mutateJsonFile<PendingBackupRecord>(
    PENDING_FILE,
    { pending: false, attemptCount: 0 },
    (current) => ({
      pending,
      queuedAt: pending ? current.queuedAt || new Date().toISOString() : undefined,
      lastAttemptAt: new Date().toISOString(),
      attemptCount: pending ? (current.attemptCount || 0) + 1 : 0,
      lastError: error,
    })
  )
}
