/**
 * Sky Ariana BOL — Google Drive REST v3 Client
 * High-performance, lightweight Google Drive integration with folder hierarchy management.
 */

import { getDataPath } from "@/lib/server-paths"
import fs from "fs"
import path from "path"

export interface GDriveCredentials {
  accessToken?: string
  refreshToken?: string
  clientId?: string
  clientSecret?: string
  folderId?: string
}

export interface GDriveFileMetadata {
  id: string
  name: string
  mimeType: string
  modifiedTime?: string
  size?: string
}

const CREDENTIALS_FILE = getDataPath(".local-gdrive-credentials.json")
const CLIENT_STORAGE_KEY = "skybol:gdrive-credentials"

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3"
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3"

let cachedCredentials: GDriveCredentials | null = null
const folderCache = new Map<string, string>() // "path/to/folder" -> folderId

export function getGDriveCredentials(): GDriveCredentials {
  if (cachedCredentials) return cachedCredentials

  if (typeof window === "undefined") {
    try {
      if (fs.existsSync(CREDENTIALS_FILE)) {
        const raw = fs.readFileSync(CREDENTIALS_FILE, "utf-8")
        cachedCredentials = JSON.parse(raw)
        return cachedCredentials || {}
      }
      const tokensFile = getDataPath(".local-gdrive-tokens.json")
      if (fs.existsSync(tokensFile)) {
        const raw = fs.readFileSync(tokensFile, "utf-8")
        const parsed = JSON.parse(raw)
        if (parsed && (parsed.accessToken || parsed.refreshToken)) {
          cachedCredentials = {
            accessToken: parsed.accessToken,
            refreshToken: parsed.refreshToken,
            clientId: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_DRIVE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_DRIVE_CLIENT_SECRET,
          }
          return cachedCredentials
        }
      }
    } catch {}
  } else {
    try {
      const raw = window.localStorage.getItem(CLIENT_STORAGE_KEY)
      if (raw) {
        cachedCredentials = JSON.parse(raw)
        return cachedCredentials || {}
      }
    } catch {}
  }

  // Also check environment variables
  cachedCredentials = {
    accessToken: process.env.GOOGLE_DRIVE_ACCESS_TOKEN,
    refreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
  }

  return cachedCredentials
}

export function saveGDriveCredentials(creds: GDriveCredentials): void {
  cachedCredentials = { ...getGDriveCredentials(), ...creds }

  if (typeof window === "undefined") {
    try {
      const dir = path.dirname(CREDENTIALS_FILE)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(cachedCredentials, null, 2), "utf-8")
    } catch (e) {
      console.error("[gdrive-client] Failed to save credentials file:", e)
    }
  } else {
    try {
      window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(cachedCredentials))
    } catch {}
  }
}

/**
 * Check if the user has active or configured Google Drive credentials.
 */
export function isGoogleDriveConnected(): boolean {
  const creds = getGDriveCredentials()
  return !!(creds.accessToken || creds.refreshToken)
}

/**
 * Refresh expired Google OAuth2 access token using refresh token.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const creds = getGDriveCredentials()
  if (!creds.refreshToken || !creds.clientId || !creds.clientSecret) {
    return null
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: creds.refreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (response.ok) {
      const json = await response.json()
      if (json.access_token) {
        saveGDriveCredentials({ accessToken: json.access_token })
        return json.access_token
      }
    }
  } catch (err) {
    console.error("[gdrive-client] Failed to refresh Google access token:", err)
  }

  return null
}

async function authenticatedFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const creds = getGDriveCredentials()
  let token = creds.accessToken

  if (!token && creds.refreshToken) {
    token = (await refreshAccessToken()) || undefined
  }

  if (!token) {
    throw new Error("Google Drive access token not found. Please connect your Google account.")
  }

  const headers = new Headers(options.headers || {})
  headers.set("Authorization", `Bearer ${token}`)

  let response = await fetch(endpoint, { ...options, headers })

  // If unauthorized (401), try refreshing token once
  if (response.status === 401 && creds.refreshToken) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      headers.set("Authorization", `Bearer ${refreshed}`)
      response = await fetch(endpoint, { ...options, headers })
    }
  }

  return response
}

/**
 * Find or create a folder by name inside a parent folder on Google Drive.
 */
export async function ensureDriveFolder(folderName: string, parentFolderId?: string): Promise<string> {
  const cacheKey = `${parentFolderId || "root"}/${folderName}`
  if (folderCache.has(cacheKey)) {
    return folderCache.get(cacheKey)!
  }

  // Check if simulated mode (no credentials)
  if (!isGoogleDriveConnected()) {
    const mockId = `sim_folder_${folderName}`
    folderCache.set(cacheKey, mockId)
    return mockId
  }

  // 1. Search for existing folder
  let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`
  }

  const searchRes = await authenticatedFetch(
    `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`
  )

  if (searchRes.ok) {
    const data = await searchRes.json()
    if (data.files && data.files.length > 0) {
      const existingId = data.files[0].id
      folderCache.set(cacheKey, existingId)
      return existingId
    }
  }

  // 2. Folder doesn't exist, create it
  const createPayload: Record<string, any> = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  }
  if (parentFolderId) {
    createPayload.parents = [parentFolderId]
  }

  const createRes = await authenticatedFetch(`${DRIVE_API_BASE}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(createPayload),
  })

  if (!createRes.ok) {
    throw new Error(`Failed to create Google Drive folder: ${folderName}`)
  }

  const created = await createRes.json()
  folderCache.set(cacheKey, created.id)
  return created.id
}

/**
 * Initialize the full Sky Ariana BOL folder tree on Google Drive.
 */
export async function initializeDriveFolderTree(): Promise<Record<string, string>> {
  const rootId = await ensureDriveFolder("Sky Ariana BOL")
  const syncId = await ensureDriveFolder("Sync", rootId)
  const recordsId = await ensureDriveFolder("records", rootId)
  const bolsId = await ensureDriveFolder("bols", recordsId)
  const invoicesId = await ensureDriveFolder("invoices", recordsId)
  const ledgersId = await ensureDriveFolder("ledgers", recordsId)
  const companiesId = await ensureDriveFolder("companies", recordsId)
  const contactsId = await ensureDriveFolder("contacts", recordsId)
  const devicesId = await ensureDriveFolder("devices", rootId)
  const tombstonesId = await ensureDriveFolder("tombstones", rootId)
  const conflictsId = await ensureDriveFolder("conflicts", rootId)
  const attachmentsId = await ensureDriveFolder("attachments", rootId)
  const indexesId = await ensureDriveFolder("indexes", rootId)
  const backupsId = await ensureDriveFolder("Backups", rootId)
  const documentsId = await ensureDriveFolder("Documents", rootId)

  return {
    root: rootId,
    sync: syncId,
    records: recordsId,
    bols: bolsId,
    invoices: invoicesId,
    ledgers: ledgersId,
    companies: companiesId,
    contacts: contactsId,
    devices: devicesId,
    tombstones: tombstonesId,
    conflicts: conflictsId,
    attachments: attachmentsId,
    indexes: indexesId,
    backups: backupsId,
    documents: documentsId,
  }
}

/**
 * Upload or update a JSON file on Google Drive inside a specified folder.
 */
export async function uploadJsonFile(
  fileName: string,
  content: any,
  parentFolderId: string
): Promise<{ fileId: string; modifiedTime: string }> {
  if (!isGoogleDriveConnected()) {
    return { fileId: `sim_file_${fileName}`, modifiedTime: new Date().toISOString() }
  }

  const jsonString = typeof content === "string" ? content : JSON.stringify(content, null, 2)

  // 1. Check if file already exists in folder
  const query = `name = '${fileName}' and '${parentFolderId}' in parents and trashed = false`
  const searchRes = await authenticatedFetch(
    `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`
  )

  let existingFileId: string | null = null
  if (searchRes.ok) {
    const list = await searchRes.json()
    if (list.files && list.files.length > 0) {
      existingFileId = list.files[0].id
    }
  }

  // 2. Perform multipart upload
  const boundary = "-------314159265358979323846"
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const metadata = {
    name: fileName,
    mimeType: "application/json",
    ...(existingFileId ? {} : { parents: [parentFolderId] }),
  }

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    jsonString +
    closeDelimiter

  const endpoint = existingFileId
    ? `${DRIVE_UPLOAD_BASE}/files/${existingFileId}?uploadType=multipart&fields=id,modifiedTime`
    : `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,modifiedTime`

  const res = await authenticatedFetch(endpoint, {
    method: existingFileId ? "PATCH" : "POST",
    headers: {
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Google Drive upload failed for ${fileName}: ${errorText}`)
  }

  const result = await res.json()
  return { fileId: result.id, modifiedTime: result.modifiedTime || new Date().toISOString() }
}

/**
 * Download a JSON file from Google Drive by its file ID or file name inside a parent folder.
 */
export async function downloadJsonFile<T = any>(
  fileName: string,
  parentFolderId: string
): Promise<T | null> {
  if (!isGoogleDriveConnected()) {
    return null
  }

  const query = `name = '${fileName}' and '${parentFolderId}' in parents and trashed = false`
  const searchRes = await authenticatedFetch(
    `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`
  )

  if (!searchRes.ok) return null
  const list = await searchRes.json()
  if (!list.files || list.files.length === 0) return null

  const fileId = list.files[0].id
  const downloadRes = await authenticatedFetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`)
  if (!downloadRes.ok) return null

  return (await downloadRes.json()) as T
}

/**
 * Download a binary file (like a ZIP backup) from Google Drive by its file ID.
 */
export async function downloadBinaryFile(fileId: string): Promise<Buffer | null> {
  const downloadRes = await authenticatedFetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`)
  if (!downloadRes.ok) return null
  const arrayBuffer = await downloadRes.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * List files within a Google Drive folder.
 */
export async function listFolderFiles(parentFolderId: string): Promise<GDriveFileMetadata[]> {
  if (!isGoogleDriveConnected()) {
    return []
  }

  const query = `'${parentFolderId}' in parents and trashed = false`
  const res = await authenticatedFetch(
    `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime,size)`
  )

  if (!res.ok) return []
  const data = await res.json()
  return data.files || []
}
