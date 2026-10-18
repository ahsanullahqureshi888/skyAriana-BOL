import { getValidAccessToken } from "./auth"
import {
  readCachedFolders,
  saveCachedFolders,
} from "./storage-settings"
import type {
  GoogleDriveBackupItem,
  GoogleDriveFolderConfig,
} from "./types"

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files"
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
const DRIVE_ABOUT_URL = "https://www.googleapis.com/drive/v3/about"

/**
 * Searches for an existing folder or creates it if missing.
 * Reuses existing folder to prevent duplicate folder creation (e.g. 'Sky Ariana BOL (1)').
 */
export async function findOrCreateFolder(
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  const token = await getValidAccessToken()

  const parentQuery = parentFolderId
    ? `'${parentFolderId}' in parents`
    : `'root' in parents`
  const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false and ${parentQuery}`

  const searchRes = await fetch(
    `${DRIVE_FILES_URL}?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=1`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )

  if (searchRes.ok) {
    const data = await searchRes.json()
    if (data.files && data.files.length > 0) {
      return data.files[0].id
    }
  }

  // Create folder if not found
  const createRes = await fetch(DRIVE_FILES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentFolderId ? [parentFolderId] : undefined,
    }),
  })

  if (!createRes.ok) {
    const errJson = await createRes.json().catch(() => ({}))
    throw new Error(
      errJson.error?.message || `Failed to create folder '${folderName}' in Google Drive`
    )
  }

  const created = await createRes.json()
  return created.id
}

/**
 * Searches for a file by name inside a parent folder.
 */
export async function findFileByName(
  fileName: string,
  parentFolderId: string
): Promise<{ id: string; name: string } | null> {
  const token = await getValidAccessToken()
  const query = `'${parentFolderId}' in parents and name = '${fileName.replace(/'/g, "\\'")}' and trashed = false`

  const res = await fetch(
    `${DRIVE_FILES_URL}?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=1`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )

  if (!res.ok) return null
  const data = await res.json()
  if (data.files && data.files.length > 0) {
    return { id: data.files[0].id, name: data.files[0].name }
  }
  return null
}

/**
 * Ensures the root 'Sky Ariana BOL' folder and all standard subfolders exist:
 * Sky Ariana BOL/
 * ├── Database/        (holds Sky-Ariana-Database-Latest.zip)
 * ├── Backups/         (holds historical Sky-Ariana-Database-YYYY-MM-DD-HHmmss.zip)
 * ├── BOL/
 * ├── Invoices/
 * ├── Packing Lists/
 * ├── Cargo Stickers/
 * ├── Ledgers/
 * ├── Documents/
 * ├── System/
 * └── Exports/
 *
 * Folder IDs are cached locally so they are reused without issuing redundant Drive queries.
 */
export async function ensureSkyArianaFolders(): Promise<GoogleDriveFolderConfig> {
  const cached = await readCachedFolders()
  if (cached && cached.databaseFolderId && cached.systemFolderId) {
    return cached
  }

  // 1. Root folder
  const rootFolderId = await findOrCreateFolder("Sky Ariana BOL")

  // 2. Subfolders
  const [
    databaseFolderId,
    backupsFolderId,
    bolFolderId,
    invoicesFolderId,
    packingListsFolderId,
    cargoStickersFolderId,
    ledgersFolderId,
    documentsFolderId,
    systemFolderId,
    exportsFolderId,
  ] = await Promise.all([
    findOrCreateFolder("Database", rootFolderId),
    findOrCreateFolder("Backups", rootFolderId),
    findOrCreateFolder("BOL", rootFolderId),
    findOrCreateFolder("Invoices", rootFolderId),
    findOrCreateFolder("Packing Lists", rootFolderId),
    findOrCreateFolder("Cargo Stickers", rootFolderId),
    findOrCreateFolder("Ledgers", rootFolderId),
    findOrCreateFolder("Documents", rootFolderId),
    findOrCreateFolder("System", rootFolderId),
    findOrCreateFolder("Exports", rootFolderId),
  ])

  const config: GoogleDriveFolderConfig = {
    rootFolderId,
    databaseFolderId,
    backupsFolderId,
    bolFolderId,
    invoicesFolderId,
    packingListsFolderId,
    cargoStickersFolderId,
    ledgersFolderId,
    documentsFolderId,
    systemFolderId,
    exportsFolderId,
    updatedAt: new Date().toISOString(),
  }

  await saveCachedFolders(config)
  return config
}

export interface UploadFileOptions {
  name: string
  mimeType: string
  buffer: Buffer
  parentFolderId: string
  description?: string
  properties?: Record<string, string>
}

/**
 * Uploads a file to Google Drive using multipart/related upload.
 */
export async function uploadFileToDrive(options: UploadFileOptions): Promise<{ id: string; name: string }> {
  const token = await getValidAccessToken()
  const boundary = `----SkyArianaBoundary${Date.now()}`

  const metadata: Record<string, any> = {
    name: options.name,
    parents: [options.parentFolderId],
    description: options.description || "",
    properties: options.properties || {},
  }

  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const metaHeader = `Content-Type: application/json; charset=UTF-8\r\n\r\n`
  const metaBody = JSON.stringify(metadata)

  const mediaHeader = `Content-Type: ${options.mimeType}\r\nContent-Transfer-Encoding: binary\r\n\r\n`

  const bodyParts = [
    Buffer.from(delimiter + metaHeader + metaBody + delimiter + mediaHeader),
    options.buffer,
    Buffer.from(closeDelimiter),
  ]

  const multipartBody = Buffer.concat(bodyParts)

  const response = await fetch(DRIVE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(multipartBody.length),
    },
    body: multipartBody,
  })

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}))
    throw new Error(
      errJson.error?.message || `Failed to upload '${options.name}' to Google Drive (${response.status})`
    )
  }

  const result = await response.json()
  return { id: result.id, name: result.name }
}

/**
 * Uploads or updates an existing file in-place (used for Sky-Ariana-Database-Latest.zip).
 */
export async function uploadOrUpdateFile(options: UploadFileOptions): Promise<{ id: string; name: string }> {
  const existing = await findFileByName(options.name, options.parentFolderId)
  if (!existing) {
    return uploadFileToDrive(options)
  }

  const token = await getValidAccessToken()
  const boundary = `----SkyArianaUpdateBoundary${Date.now()}`

  const metadata: Record<string, any> = {
    name: options.name,
    description: options.description || "",
    properties: options.properties || {},
  }

  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const metaHeader = `Content-Type: application/json; charset=UTF-8\r\n\r\n`
  const metaBody = JSON.stringify(metadata)

  const mediaHeader = `Content-Type: ${options.mimeType}\r\nContent-Transfer-Encoding: binary\r\n\r\n`

  const bodyParts = [
    Buffer.from(delimiter + metaHeader + metaBody + delimiter + mediaHeader),
    options.buffer,
    Buffer.from(closeDelimiter),
  ]

  const multipartBody = Buffer.concat(bodyParts)

  const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`
  const response = await fetch(updateUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(multipartBody.length),
    },
    body: multipartBody,
  })

  if (!response.ok) {
    // If update fails, fallback to fresh upload
    return uploadFileToDrive(options)
  }

  const result = await response.json()
  return { id: result.id, name: result.name }
}

/**
 * Downloads the binary content of a file from Google Drive.
 */
export async function downloadFileFromDrive(fileId: string): Promise<Buffer> {
  const token = await getValidAccessToken()

  const response = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}))
    throw new Error(
      errJson.error?.message || `Failed to download file ${fileId} from Google Drive`
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Lists backups in the Sky Ariana BOL Backups folder.
 */
export async function listBackupsFromDrive(
  backupsFolderId: string
): Promise<GoogleDriveBackupItem[]> {
  const token = await getValidAccessToken()

  const query = `'${backupsFolderId}' in parents and trashed = false`
  const fields = "files(id,name,size,createdTime,modifiedTime,description,properties)"

  const response = await fetch(
    `${DRIVE_FILES_URL}?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=createdTime%20desc&pageSize=50`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}))
    throw new Error(
      errJson.error?.message || "Failed to list backups from Google Drive"
    )
  }

  const data = await response.json()
  const files: any[] = data.files || []

  return files.map((f) => {
    let manifest: any
    if (f.description) {
      try {
        manifest = JSON.parse(f.description)
      } catch {}
    }

    const props = f.properties || {}

    return {
      id: f.id,
      name: f.name,
      sizeBytes: parseInt(f.size || "0", 10),
      createdAt: f.createdTime,
      modifiedAt: f.modifiedTime,
      appVersion: props.appVersion || manifest?.appVersion || "5.1.0",
      databaseRevision: parseInt(props.databaseRevision || manifest?.databaseRevision || "0", 10),
      bolCount: parseInt(props.bolCount || manifest?.counts?.bols || manifest?.recordCounts?.bols || "0", 10),
      invoiceCount: parseInt(props.invoiceCount || manifest?.counts?.invoices || manifest?.recordCounts?.invoices || "0", 10),
      companyCount: parseInt(props.companyCount || manifest?.counts?.companies || manifest?.recordCounts?.companies || "0", 10),
      ledgerCount: parseInt(props.ledgerCount || manifest?.counts?.ledgerEntries || manifest?.recordCounts?.ledgerEntries || "0", 10),
      checksum: props.checksum || manifest?.checksum,
      encrypted: props.encrypted === "true" || manifest?.encrypted === true,
      manifest,
    }
  })
}

/**
 * Permanently deletes or trashes a file in Google Drive.
 */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = await getValidAccessToken()

  const response = await fetch(`${DRIVE_FILES_URL}/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok && response.status !== 404) {
    const errJson = await response.json().catch(() => ({}))
    throw new Error(
      errJson.error?.message || `Failed to delete file ${fileId} from Google Drive`
    )
  }
}

/**
 * Retrieves user account info and storage quota from Google Drive.
 */
export async function getDriveStorageInfo(): Promise<{
  email?: string
  name?: string
  picture?: string
  totalSpaceBytes?: number
  usedSpaceBytes?: number
  trashSpaceBytes?: number
}> {
  const token = await getValidAccessToken()

  const response = await fetch(`${DRIVE_ABOUT_URL}?fields=user,storageQuota`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    return {}
  }

  const data = await response.json()
  const user = data.user || {}
  const quota = data.storageQuota || {}
  return {
    email: user.emailAddress,
    name: user.displayName,
    picture: user.photoLink,
    totalSpaceBytes: quota.limit ? parseInt(quota.limit, 10) : undefined,
    usedSpaceBytes: quota.usage ? parseInt(quota.usage, 10) : undefined,
    trashSpaceBytes: quota.usageInTrash ? parseInt(quota.usageInTrash, 10) : undefined,
  }
}
