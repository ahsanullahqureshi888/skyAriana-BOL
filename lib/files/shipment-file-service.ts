/**
 * Sky Ariana Logistics — Shipment File & Attachment Service Layer
 * Phase 14: Document Upload, Automatic Attachment Organization & Digital Shipment Folder
 */

import crypto from "crypto"
import path from "path"
import AdmZip from "adm-zip"
import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, writeJsonFile, mutateJsonFile } from "@/lib/services/blob-db"
import { FileStorageProvider } from "./storage-provider"
import { DEFAULT_DOCUMENT_CATEGORIES, DEFAULT_REQUIREMENT_RULES } from "./category-seed"
import type {
  ShipmentFileRecord,
  DocumentCategory,
  DocumentCategoryCode,
  DocumentRequirementRule,
  BOLChecklistSummary,
  DocumentChecklistItem,
  DocumentRequestRecord,
  FileCenterFilterOptions,
  FileCenterSummaryKPI,
  DigitalShipmentFolder,
  FileVersionStatus,
  DocumentType,
  FileSource,
  PhotoType,
} from "@/lib/types/shipment-file"
import { getAllLocalBOLs } from "@/lib/services/local-storage-service"

const FILES_DB_PATH = getDataPath(".local-shipment-files.json")
const CATEGORIES_DB_PATH = getDataPath(".local-document-categories.json")
const RULES_DB_PATH = getDataPath(".local-document-rules.json")
const REQUESTS_DB_PATH = getDataPath(".local-document-requests.json")

// ----------------------------------------------------------------------
// Category Management
// ----------------------------------------------------------------------

export async function getDocumentCategories(): Promise<DocumentCategory[]> {
  const existing = await readJsonFile<DocumentCategory[]>(CATEGORIES_DB_PATH, [])
  if (existing.length === 0) {
    await writeJsonFile(CATEGORIES_DB_PATH, DEFAULT_DOCUMENT_CATEGORIES)
    return DEFAULT_DOCUMENT_CATEGORIES
  }
  return existing.filter((c) => c.active !== false)
}

export async function getCategoryByCode(code: DocumentCategoryCode): Promise<DocumentCategory | null> {
  const categories = await getDocumentCategories()
  return categories.find((c) => c.code === code) || null
}

export async function saveDocumentCategory(category: DocumentCategory): Promise<DocumentCategory> {
  return await mutateJsonFile<DocumentCategory[]>(CATEGORIES_DB_PATH, DEFAULT_DOCUMENT_CATEGORIES, (current) => {
    const idx = current.findIndex((c) => c.id === category.id || c.code === category.code)
    const now = new Date().toISOString()
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...category, updated_at: now }
      return current
    }
    current.push({ ...category, created_at: now, updated_at: now })
    return current
  }).then((all) => all.find((c) => c.id === category.id || c.code === category.code)!)
}

// ----------------------------------------------------------------------
// Requirement Rules Management
// ----------------------------------------------------------------------

export async function getRequirementRules(): Promise<DocumentRequirementRule[]> {
  const existing = await readJsonFile<DocumentRequirementRule[]>(RULES_DB_PATH, [])
  if (existing.length === 0) {
    await writeJsonFile(RULES_DB_PATH, DEFAULT_REQUIREMENT_RULES)
    return DEFAULT_REQUIREMENT_RULES
  }
  return existing
}

// ----------------------------------------------------------------------
// File Records Query & Retrieval
// ----------------------------------------------------------------------

export async function getAllShipmentFiles(): Promise<ShipmentFileRecord[]> {
  return await readJsonFile<ShipmentFileRecord[]>(FILES_DB_PATH, [])
}

export async function getFileById(fileId: string): Promise<ShipmentFileRecord | null> {
  const files = await getAllShipmentFiles()
  return files.find((f) => f.id === fileId) || null
}

export async function getFilesForBol(bolIdOrNumber: string, includeArchived = false): Promise<ShipmentFileRecord[]> {
  const files = await getAllShipmentFiles()
  const needle = bolIdOrNumber.trim().toLowerCase()
  return files.filter((f) => {
    if (!includeArchived && (f.status === "ARCHIVED" || f.status === "VOID")) return false
    const matchId = f.bol_id?.toLowerCase() === needle
    const matchNumber = f.bol_number?.toLowerCase() === needle
    return matchId || matchNumber
  })
}

/**
 * Filtered file query with sorting and search
 */
export async function getFilteredFiles(
  filters: FileCenterFilterOptions = {},
  options: {
    page?: number
    pageSize?: number
    sortBy?: "newest" | "oldest" | "name" | "date" | "category"
    includeArchived?: boolean
    userRole?: string
    clientCompanyId?: string // If accessed from client portal
  } = {}
): Promise<{ files: ShipmentFileRecord[]; total: number; page: number; pageSize: number }> {
  let files = await getAllShipmentFiles()
  const {
    page = 1,
    pageSize = 50,
    sortBy = "newest",
    includeArchived = false,
    userRole,
    clientCompanyId,
  } = options

  // Client Portal Isolation
  if (clientCompanyId || userRole === "shipper") {
    files = files.filter(
      (f) =>
        f.client_visible === true &&
        f.status !== "VOID" &&
        f.status !== "ARCHIVED" &&
        (f.company_id === clientCompanyId || f.company_name?.toLowerCase() === clientCompanyId?.toLowerCase())
    )
  }

  // Filter archived
  if (!includeArchived && !filters.status) {
    files = files.filter((f) => f.status !== "ARCHIVED" && f.status !== "VOID")
  }

  // Filter by BOL Number
  if (filters.bolNumber) {
    const q = filters.bolNumber.trim().toLowerCase()
    files = files.filter((f) => f.bol_number?.toLowerCase().includes(q) || f.bol_id?.toLowerCase().includes(q))
  }

  // Filter by Container
  if (filters.containerNumber) {
    const q = filters.containerNumber.trim().toLowerCase()
    files = files.filter((f) => f.container_number?.toLowerCase().includes(q))
  }

  // Filter by Company
  if (filters.companyName) {
    const q = filters.companyName.trim().toLowerCase()
    files = files.filter((f) => f.company_name?.toLowerCase().includes(q))
  }

  // Filter by Category
  if (filters.categoryCode && filters.categoryCode !== "ALL") {
    files = files.filter((f) => f.document_category_code === filters.categoryCode)
  }

  // Filter by Document Type
  if (filters.documentType && filters.documentType !== "ALL") {
    files = files.filter((f) => f.document_type === filters.documentType)
  }

  // Filter by Status
  if (filters.status && filters.status !== "ALL") {
    files = files.filter((f) => f.status === filters.status)
  }

  // Filter by Client Visible
  if (typeof filters.clientVisible === "boolean") {
    files = files.filter((f) => f.client_visible === filters.clientVisible)
  }

  // Filter by Date Range
  if (filters.dateFrom) {
    files = files.filter((f) => (f.document_date || f.uploaded_at) >= filters.dateFrom!)
  }
  if (filters.dateTo) {
    files = files.filter((f) => (f.document_date || f.uploaded_at) <= filters.dateTo!)
  }

  // Filter by Expired Status
  if (filters.isExpired) {
    const today = new Date().toISOString().split("T")[0]
    files = files.filter((f) => f.expiry_date && f.expiry_date < today)
  }

  // Search keyword (doc number, filename, description, tags, BOL)
  if (filters.search) {
    const s = filters.search.trim().toLowerCase()
    files = files.filter(
      (f) =>
        f.file_name.toLowerCase().includes(s) ||
        f.original_file_name.toLowerCase().includes(s) ||
        f.bol_number?.toLowerCase().includes(s) ||
        f.container_number?.toLowerCase().includes(s) ||
        f.document_number?.toLowerCase().includes(s) ||
        f.description?.toLowerCase().includes(s) ||
        f.tags.some((t) => t.toLowerCase().includes(s))
    )
  }

  // Sort
  files.sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return a.uploaded_at.localeCompare(b.uploaded_at)
      case "name":
        return a.file_name.localeCompare(b.file_name)
      case "date":
        return (b.document_date || b.uploaded_at).localeCompare(a.document_date || a.uploaded_at)
      case "category":
        return a.document_category_code.localeCompare(b.document_category_code)
      case "newest":
      default:
        return b.uploaded_at.localeCompare(a.uploaded_at)
    }
  })

  const total = files.length
  const startIndex = (page - 1) * pageSize
  const paginated = files.slice(startIndex, startIndex + pageSize)

  return { files: paginated, total, page, pageSize }
}

// ----------------------------------------------------------------------
// File Upload & Versioning
// ----------------------------------------------------------------------

export interface UploadShipmentFileInput {
  fileBuffer: Buffer
  originalFileName: string
  bolNumber: string
  bolId?: string
  containerNumber?: string
  containerId?: string
  companyName?: string
  companyId?: string
  documentCategoryCode: DocumentCategoryCode
  documentType: DocumentType
  documentNumber?: string
  documentDate?: string
  expiryDate?: string
  description?: string
  clientVisible?: boolean
  clientDownloadable?: boolean
  source?: FileSource
  uploadedBy?: string
  tags?: string[]
  replaceFileId?: string // If explicitly uploading a new version of an existing file
  allowDuplicate?: boolean // If user confirmed uploading even if checksum matched
  photoType?: PhotoType | null
  customsCountry?: string
  customsPort?: string
}

export async function uploadShipmentFile(input: UploadShipmentFileInput): Promise<{
  file: ShipmentFileRecord
  isNewVersion: boolean
  isDuplicateWarning?: boolean
  existingDuplicateId?: string
}> {
  const {
    fileBuffer,
    originalFileName,
    bolNumber,
    bolId,
    containerNumber,
    containerId,
    companyName,
    companyId,
    documentCategoryCode,
    documentType,
    documentNumber,
    documentDate,
    expiryDate,
    description,
    clientVisible = false,
    clientDownloadable = false,
    source = "STAFF_UPLOAD",
    uploadedBy = "System User",
    tags = [],
    replaceFileId,
    allowDuplicate = false,
    photoType,
    customsCountry,
    customsPort,
  } = input

  // Checksum calculation & Duplicate detection
  const checksum = FileStorageProvider.calculateChecksum(fileBuffer)
  const existingFiles = await getAllShipmentFiles()

  const duplicateOnBol = existingFiles.find(
    (f) =>
      f.bol_number?.toLowerCase() === bolNumber.toLowerCase() &&
      f.checksum === checksum &&
      f.status !== "VOID" &&
      f.status !== "ARCHIVED"
  )

  if (duplicateOnBol && !allowDuplicate && !replaceFileId) {
    return {
      file: duplicateOnBol,
      isNewVersion: false,
      isDuplicateWarning: true,
      existingDuplicateId: duplicateOnBol.id,
    }
  }

  // Check versioning
  let targetVersion = 1
  let previousVersionId: string | null = null
  let fileToSupersede: ShipmentFileRecord | null = null

  if (replaceFileId) {
    fileToSupersede = existingFiles.find((f) => f.id === replaceFileId) || null
  } else {
    // If not specified, check if there's already an active version of this exact document type on this container/BOL
    const existingActive = existingFiles.find(
      (f) =>
        f.bol_number?.toLowerCase() === bolNumber.toLowerCase() &&
        f.document_type === documentType &&
        (containerNumber ? f.container_number === containerNumber : true) &&
        f.is_current_version &&
        f.status !== "VOID" &&
        f.status !== "ARCHIVED" &&
        documentCategoryCode !== "PHOTOS" // Photos don't auto-supersede
    )
    if (existingActive) {
      fileToSupersede = existingActive
    }
  }

  if (fileToSupersede) {
    targetVersion = fileToSupersede.version + 1
    previousVersionId = fileToSupersede.id
  }

  // Generate safe storage record
  const fileId = `file-${crypto.randomBytes(8).toString("hex")}`
  const stored = await FileStorageProvider.saveFile(
    fileBuffer,
    fileId,
    originalFileName,
    bolNumber,
    documentCategoryCode
  )

  const now = new Date().toISOString()
  const category = (await getCategoryByCode(documentCategoryCode)) || DEFAULT_DOCUMENT_CATEGORIES[0]

  const newFileRecord: ShipmentFileRecord = {
    id: fileId,
    bol_id: bolId || bolNumber,
    bol_number: bolNumber,
    container_id: containerId,
    container_number: containerNumber,
    company_id: companyId,
    company_name: companyName,
    document_category_id: category.id,
    document_category_code: documentCategoryCode,
    document_type: documentType,
    file_name: FileStorageProvider.sanitizeFilename(originalFileName),
    original_file_name: originalFileName,
    storage_name: stored.storageName,
    storage_path: stored.storagePath,
    mime_type: stored.mimeType,
    file_extension: stored.fileExtension,
    file_size: stored.fileSize,
    checksum: stored.checksum,
    document_number: documentNumber,
    document_date: documentDate || now.split("T")[0],
    expiry_date: expiryDate,
    status: source === "CLIENT_PORTAL" ? "RECEIVED" : "APPROVED",
    version: targetVersion,
    is_current_version: true,
    previous_version_id: previousVersionId,
    description: description || "",
    client_visible: clientVisible,
    client_downloadable: clientDownloadable,
    source,
    uploaded_by: uploadedBy,
    uploaded_at: now,
    updated_at: now,
    tags,
    internal_notes: [],
    audit_history: [
      {
        event: targetVersion > 1 ? "NEW_VERSION_CREATED" : "UPLOADED",
        user: uploadedBy,
        timestamp: now,
        details:
          targetVersion > 1
            ? `Uploaded as Version ${targetVersion}, superseding previous file (${previousVersionId})`
            : `Initial upload (${stored.fileSize} bytes)`,
      },
    ],
    photo_type: photoType,
    customs_country: customsCountry,
    customs_port: customsPort,
  }

  // Atomically persist to database
  await mutateJsonFile<ShipmentFileRecord[]>(FILES_DB_PATH, [], (files) => {
    // If superseding previous file, mark it SUPERSEDED
    if (fileToSupersede) {
      const prevIdx = files.findIndex((f) => f.id === fileToSupersede!.id)
      if (prevIdx >= 0) {
        files[prevIdx] = {
          ...files[prevIdx],
          status: "SUPERSEDED",
          is_current_version: false,
          updated_at: now,
          audit_history: [
            ...files[prevIdx].audit_history,
            {
              event: "NEW_VERSION_CREATED",
              user: uploadedBy,
              timestamp: now,
              details: `Superseded by Version ${targetVersion} (${fileId})`,
            },
          ],
        }
      }
    }
    files.push(newFileRecord)
    return files
  })

  return {
    file: newFileRecord,
    isNewVersion: targetVersion > 1,
  }
}

// ----------------------------------------------------------------------
// File Actions: Review, Release, Archive, Delete
// ----------------------------------------------------------------------

export async function updateFileMetadata(
  fileId: string,
  updates: Partial<Pick<ShipmentFileRecord, "file_name" | "document_number" | "document_date" | "expiry_date" | "description" | "tags" | "client_visible" | "client_downloadable">>,
  userId = "Staff User"
): Promise<ShipmentFileRecord> {
  const now = new Date().toISOString()
  return await mutateJsonFile<ShipmentFileRecord[]>(FILES_DB_PATH, [], (files) => {
    const idx = files.findIndex((f) => f.id === fileId)
    if (idx < 0) throw new Error(`File ${fileId} not found`)

    files[idx] = {
      ...files[idx],
      ...updates,
      updated_at: now,
      audit_history: [
        ...files[idx].audit_history,
        {
          event: "METADATA_UPDATED",
          user: userId,
          timestamp: now,
          details: `Updated metadata fields: ${Object.keys(updates).join(", ")}`,
        },
      ],
    }
    return files
  }).then((files) => files.find((f) => f.id === fileId)!)
}

export async function addFileInternalNote(
  fileId: string,
  text: string,
  userId = "Staff User"
): Promise<ShipmentFileRecord> {
  const now = new Date().toISOString()
  return await mutateJsonFile<ShipmentFileRecord[]>(FILES_DB_PATH, [], (files) => {
    const idx = files.findIndex((f) => f.id === fileId)
    if (idx < 0) throw new Error(`File ${fileId} not found`)

    const newNote = {
      id: `note-${Date.now()}`,
      user: userId,
      text,
      date: now,
    }

    files[idx].internal_notes = [...(files[idx].internal_notes || []), newNote]
    files[idx].updated_at = now
    return files
  }).then((files) => files.find((f) => f.id === fileId)!)
}

export async function reviewFile(
  fileId: string,
  action: "ACCEPT" | "REJECT" | "RECLASSIFY",
  details: {
    reclassifiedCategory?: DocumentCategoryCode
    reclassifiedType?: DocumentType
    reclassifiedBol?: string
    notes?: string
  } = {},
  userId = "Reviewing Staff"
): Promise<ShipmentFileRecord> {
  const now = new Date().toISOString()
  return await mutateJsonFile<ShipmentFileRecord[]>(FILES_DB_PATH, [], (files) => {
    const idx = files.findIndex((f) => f.id === fileId)
    if (idx < 0) throw new Error(`File ${fileId} not found`)

    let newStatus: FileVersionStatus = files[idx].status
    let logMsg = `File reviewed: ${action}`

    if (action === "ACCEPT") {
      newStatus = "APPROVED"
      logMsg = "Document approved by staff review"
    } else if (action === "REJECT") {
      newStatus = "VOID"
      logMsg = `Document rejected: ${details.notes || "Not accepted"}`
    } else if (action === "RECLASSIFY") {
      if (details.reclassifiedCategory) files[idx].document_category_code = details.reclassifiedCategory
      if (details.reclassifiedType) files[idx].document_type = details.reclassifiedType
      if (details.reclassifiedBol) files[idx].bol_number = details.reclassifiedBol
      logMsg = `Reclassified to ${files[idx].document_category_code} / ${files[idx].document_type}`
    }

    files[idx] = {
      ...files[idx],
      status: newStatus,
      updated_at: now,
      audit_history: [
        ...files[idx].audit_history,
        {
          event: action === "ACCEPT" ? "APPROVED" : "REVIEWED",
          user: userId,
          timestamp: now,
          details: logMsg,
        },
      ],
    }
    return files
  }).then((files) => files.find((f) => f.id === fileId)!)
}

export async function releaseFileToClient(fileId: string, userId = "Staff User"): Promise<ShipmentFileRecord> {
  const now = new Date().toISOString()
  return await mutateJsonFile<ShipmentFileRecord[]>(FILES_DB_PATH, [], (files) => {
    const idx = files.findIndex((f) => f.id === fileId)
    if (idx < 0) throw new Error(`File ${fileId} not found`)

    files[idx] = {
      ...files[idx],
      client_visible: true,
      client_downloadable: true,
      status: "FINAL",
      updated_at: now,
      audit_history: [
        ...files[idx].audit_history,
        {
          event: "RELEASED_TO_CLIENT",
          user: userId,
          timestamp: now,
          details: "Document marked final and released for customer portal view & download",
        },
      ],
    }
    return files
  }).then((files) => files.find((f) => f.id === fileId)!)
}

export async function archiveFile(fileId: string, reason: string, userId = "Staff User"): Promise<ShipmentFileRecord> {
  const now = new Date().toISOString()
  return await mutateJsonFile<ShipmentFileRecord[]>(FILES_DB_PATH, [], (files) => {
    const idx = files.findIndex((f) => f.id === fileId)
    if (idx < 0) throw new Error(`File ${fileId} not found`)

    files[idx] = {
      ...files[idx],
      status: "ARCHIVED",
      archived_at: now,
      updated_at: now,
      audit_history: [
        ...files[idx].audit_history,
        {
          event: "ARCHIVED",
          user: userId,
          timestamp: now,
          details: `Archived: ${reason}`,
        },
      ],
    }
    return files
  }).then((files) => files.find((f) => f.id === fileId)!)
}

export async function restoreArchivedFile(fileId: string, userId = "Staff User"): Promise<ShipmentFileRecord> {
  const now = new Date().toISOString()
  return await mutateJsonFile<ShipmentFileRecord[]>(FILES_DB_PATH, [], (files) => {
    const idx = files.findIndex((f) => f.id === fileId)
    if (idx < 0) throw new Error(`File ${fileId} not found`)

    files[idx] = {
      ...files[idx],
      status: "APPROVED",
      archived_at: null,
      updated_at: now,
      audit_history: [
        ...files[idx].audit_history,
        {
          event: "RESTORED",
          user: userId,
          timestamp: now,
          details: "Restored from archive to active status",
        },
      ],
    }
    return files
  }).then((files) => files.find((f) => f.id === fileId)!)
}

export async function deleteShipmentFile(
  fileId: string,
  reason: string,
  userId = "Staff User",
  forceDeleteApproved = false
): Promise<void> {
  const file = await getFileById(fileId)
  if (!file) return

  // Prevent silent deletion of finalized official audited records without override
  if ((file.status === "FINAL" || file.status === "APPROVED") && !forceDeleteApproved) {
    throw new Error(
      "Cannot permanently delete an approved or final document. Use Archive instead to maintain an audit trail."
    )
  }

  // Remove physical file safely
  await FileStorageProvider.deleteFile(file.storage_path)

  // Remove from database
  await mutateJsonFile<ShipmentFileRecord[]>(FILES_DB_PATH, [], (files) => {
    return files.filter((f) => f.id !== fileId)
  })
}

// ----------------------------------------------------------------------
// Digital Shipment Folder & Missing Document Checklist
// ----------------------------------------------------------------------

export async function getMissingDocumentChecklist(bolNumber: string): Promise<BOLChecklistSummary> {
  const allBols = await getAllLocalBOLs()
  const cleanTarget = bolNumber.trim().toUpperCase()
  const targetDigits = (cleanTarget.match(/\d+$/) || [])[0]
  let bol = allBols.find((b) => {
    if (!b) return false
    const num = (b.bol_number || "").trim().toUpperCase()
    return num === cleanTarget || b.id === bolNumber
  })
  if (!bol && targetDigits) {
    bol = allBols.find((b) => {
      if (!b) return false
      const num = (b.bol_number || "").trim().toUpperCase()
      return num.endsWith(targetDigits)
    })
  }

  const activeFiles = await getFilesForBol(bolNumber, false)
  const rules = await getRequirementRules()

  const destination = bol?.destination || ""
  const commodity = bol?.goods_description || ""
  const today = new Date().toISOString().split("T")[0]

  const items: DocumentChecklistItem[] = []

  for (const rule of rules) {
    // Check route match
    if (rule.route_pattern && rule.route_pattern !== "*") {
      const match = rule.route_pattern.split(",").some((p) => destination.toLowerCase().includes(p.trim().toLowerCase()))
      if (!match) continue
    }

    // Check commodity match
    if (rule.commodity_pattern && rule.commodity_pattern !== "*") {
      const match = rule.commodity_pattern.split(",").some((p) => commodity.toLowerCase().includes(p.trim().toLowerCase()))
      if (!match) continue
    }

    // Find if a valid file exists for this requirement
    const matchedFile = activeFiles.find((f) => f.document_type === rule.document_type && f.is_current_version)

    let status: DocumentChecklistItem["status"] = "MISSING"
    if (matchedFile) {
      if (matchedFile.expiry_date && matchedFile.expiry_date < today) {
        status = "EXPIRED"
      } else if (matchedFile.status === "RECEIVED" || matchedFile.status === "DRAFT") {
        status = "PENDING_REVIEW"
      } else {
        status = "AVAILABLE"
      }
    }

    items.push({
      document_type: rule.document_type,
      name: rule.name,
      category_code: rule.document_category_code,
      is_mandatory: rule.is_mandatory,
      status,
      file: matchedFile,
    })
  }

  const requiredCount = items.filter((it) => it.is_mandatory).length
  const availableCount = items.filter((it) => it.is_mandatory && it.status === "AVAILABLE").length
  const isComplete = requiredCount > 0 && availableCount >= requiredCount

  return {
    bol_id: bol?.id || bolNumber,
    bol_number: bol?.bol_number || bolNumber,
    total_required: requiredCount,
    total_available: availableCount,
    completeness_ratio: `${availableCount} / ${requiredCount}`,
    completeness_percentage: requiredCount > 0 ? Math.round((availableCount / requiredCount) * 100) : 100,
    is_complete: isComplete,
    items,
  }
}

export async function getDigitalShipmentFolder(bolNumber: string): Promise<DigitalShipmentFolder> {
  const allBols = await getAllLocalBOLs()
  const cleanTarget = bolNumber.trim().toUpperCase()
  const targetDigits = (cleanTarget.match(/\d+$/) || [])[0]
  let bol = allBols.find((b) => {
    if (!b) return false
    const num = (b.bol_number || "").trim().toUpperCase()
    return num === cleanTarget || b.id === bolNumber
  })
  if (!bol && targetDigits) {
    bol = allBols.find((b) => {
      if (!b) return false
      const num = (b.bol_number || "").trim().toUpperCase()
      return num.endsWith(targetDigits)
    })
  }

  const files = await getFilesForBol(bolNumber, true)
  const categories = await getDocumentCategories()
  const checklist = await getMissingDocumentChecklist(bolNumber)

  const categorizedList = categories.map((cat) => {
    return {
      category_code: cat.code,
      category_name: cat.name,
      files: files.filter((f) => f.document_category_code === cat.code),
    }
  })

  let customerName =
    bol?.consignee_name?.trim() ||
    (bol as any)?.consigneeName?.trim() ||
    (bol as any)?.consignee?.trim() ||
    bol?.shipper_name?.trim() ||
    (bol as any)?.shipperName?.trim() ||
    (bol as any)?.shipper?.trim()

  if (!customerName || customerName === "Unassigned Customer") {
    try {
      const { getAllShipments } = await import("@/lib/services/shipment-service")
      const allShipments = await getAllShipments()
      const shp = allShipments.find((s) => {
        if (!s) return false
        const ref = (s.referenceNumber || s.id || "").toUpperCase()
        if (ref === cleanTarget || ref.includes(cleanTarget)) return true
        if (targetDigits && ref.endsWith(targetDigits)) return true
        return false
      })
      if (shp?.consignee?.name && shp.consignee.name !== "Unknown Consignee") {
        customerName = shp.consignee.name.trim()
      } else if (shp?.shipper?.name && shp.shipper.name !== "Unknown Shipper") {
        customerName = shp.shipper.name.trim()
      }
    } catch {}
  }

  if (!customerName) {
    customerName = "Unassigned Customer"
  }

  const originPort =
    bol?.origin_country ||
    (bol as any)?.origin ||
    bol?.port_of_loading ||
    "Origin Port"

  const destinationPort =
    bol?.destination_country ||
    (bol as any)?.destination ||
    bol?.port_of_discharge ||
    "Destination Port"

  return {
    bol_id: bol?.id || bolNumber,
    bol_number: bol?.bol_number || bolNumber,
    customer_name: customerName,
    origin: originPort,
    destination: destinationPort,
    total_files: files.length,
    checklist,
    categories: categorizedList,
  }
}

// ----------------------------------------------------------------------
// Document Requests & WhatsApp Generator
// ----------------------------------------------------------------------

export async function getDocumentRequests(): Promise<DocumentRequestRecord[]> {
  return await readJsonFile<DocumentRequestRecord[]>(REQUESTS_DB_PATH, [])
}

export async function createDocumentRequest(input: {
  bolNumber: string
  bolId?: string
  containerNumber?: string
  documentType: DocumentType
  requestedFrom: DocumentRequestRecord["requested_from"]
  contactName: string
  contactPhone?: string
  dueDate: string
  note?: string
  assignedStaff?: string
}): Promise<DocumentRequestRecord> {
  const record: DocumentRequestRecord = {
    id: `req-${Date.now()}`,
    bol_id: input.bolId || input.bolNumber,
    bol_number: input.bolNumber,
    container_number: input.containerNumber,
    document_type: input.documentType,
    requested_from: input.requestedFrom,
    contact_name: input.contactName,
    contact_phone: input.contactPhone,
    due_date: input.dueDate,
    note: input.note,
    assigned_staff: input.assignedStaff || "Operations Desk",
    status: "REQUESTED",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  await mutateJsonFile<DocumentRequestRecord[]>(REQUESTS_DB_PATH, [], (records) => {
    records.push(record)
    return records
  })

  return record
}

export function generateWhatsAppDocumentRequestMessage(
  documentTypeNameOrInput:
    | string
    | {
        documentTypeName?: string
        missingTypes?: string[]
        bolNumber: string
        containerNumber?: string
        dueDate?: string
        contactName?: string
        language?: "en" | "ps" | "fa"
      },
  bolNumber?: string,
  containerNumber?: string,
  dueDate?: string,
  contactName?: string
): string {
  let docName = ""
  let bol = ""
  let container = containerNumber
  let due = dueDate
  let contact = contactName
  let lang: "en" | "ps" | "fa" = "en"

  if (typeof documentTypeNameOrInput === "object" && documentTypeNameOrInput !== null) {
    const input = documentTypeNameOrInput
    bol = input.bolNumber
    container = input.containerNumber
    due = input.dueDate
    contact = input.contactName
    lang = input.language || "en"
    if (input.missingTypes && input.missingTypes.length > 0) {
      docName = input.missingTypes.join(", ")
    } else {
      docName = input.documentTypeName || "Required Shipment Documents"
    }
  } else {
    docName = documentTypeNameOrInput || "Required Document"
    bol = bolNumber || ""
  }

  const containerStr = container ? ` / Container: ${container}` : ""
  const dueStr = due ? `\n📅 Due Date: ${due}` : ""

  if (lang === "ps") {
    const greeting = contact ? `محترم ${contact} صاحب سلامونه،` : "محترمه، سلامونه او احترامات!"
    return `${greeting}

مهرباني وکړئ د لاندې بارنامې اړوند اسناد ژر تر ژره راولېږئ:
📄 اړین اسناد: *${docName}*
🚢 بارنامه / B/L شمېره: *${bol}*${containerStr}${dueStr}

د ګمرکي مراحلو او ګړندي تحویلۍ لپاره د یادو اسنادو رالېږل اړین دي.

مننه،
*د سکای آریانا لوجیستیک شرکت*`
  }

  if (lang === "fa") {
    const greeting = contact ? `محترم ${contact} گرامی با سلام،` : "با سلام و احترام،"
    return `${greeting}

لطفاً اسناد ذیل مربوط به محموله ترانزیتی را ارسال فرمایید:
📄 اسناد مورد نیاز: *${docName}*
🚢 شماره بارنامه: *${bol}*${containerStr}${dueStr}

جهت تسریع مراحل ترخیص گمرکی و امور ترانزیت، ارسال هرچه سریع‌تر این اسناد ضروری می‌باشد.

با تشکر،
*شرکت لوجستیک سکای آریانا*`
  }

  const greeting = contact ? `Dear ${contact},` : "Salam,"
  return `${greeting}

REQUIRED DOCUMENTS NOTICE
Please provide the official document for our active shipment:
📄 Document: *${docName}*
🚢 Bill of Lading: *${bol}*${containerStr}${dueStr}

Kindly send the scan or PDF so our customs & clearance operations can proceed smoothly.

Thank you,
*SKY ARIANA LOGISTICS*`
}

// ----------------------------------------------------------------------
// ZIP Document Package Generator
// ----------------------------------------------------------------------

export async function generateShipmentDocumentsZip(
  bolNumber: string,
  options: {
    scope?: "all" | "official" | "client" | "category"
    categoryCode?: DocumentCategoryCode
  } = {}
): Promise<{ zipBuffer: Buffer; fileName: string; fileCount: number }> {
  const { scope = "all", categoryCode } = options
  let files = await getFilesForBol(bolNumber, false)

  if (scope === "official") {
    files = files.filter((f) => f.status === "FINAL" || f.status === "APPROVED")
  } else if (scope === "client") {
    files = files.filter((f) => f.client_visible === true)
  } else if (scope === "category" && categoryCode) {
    files = files.filter((f) => f.document_category_code === categoryCode)
  }

  const zip = new AdmZip()
  const manifestItems: any[] = []

  for (const f of files) {
    try {
      const buffer = await FileStorageProvider.getFileBuffer(f.storage_path)
      // Folder category name
      const folderName = f.document_category_code.charAt(0) + f.document_category_code.slice(1).toLowerCase()
      const zipEntryPath = `${folderName}/${f.file_name}`

      zip.addFile(zipEntryPath, buffer)

      manifestItems.push({
        id: f.id,
        category: f.document_category_code,
        documentType: f.document_type,
        documentNumber: f.document_number,
        fileName: f.file_name,
        version: f.version,
        fileSize: f.file_size,
        uploadedAt: f.uploaded_at,
        checksum: f.checksum,
      })
    } catch (err) {
      console.warn(`[ZipPackage] Failed to add file ${f.file_name}:`, err)
    }
  }

  // Add Manifest JSON
  const manifest = {
    bolNumber,
    generatedAt: new Date().toISOString(),
    totalFiles: manifestItems.length,
    scope,
    files: manifestItems,
  }
  zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2), "utf-8"))

  const safeBol = bolNumber.replace(/[^\w\-]/gi, "_")
  const outFileName = `${safeBol}-DOCUMENTS.zip`

  return {
    zipBuffer: zip.toBuffer(),
    fileName: outFileName,
    fileCount: manifestItems.length,
  }
}

// ----------------------------------------------------------------------
// File Center KPI Summary
// ----------------------------------------------------------------------

export async function getFileCenterKPI(): Promise<FileCenterSummaryKPI> {
  const files = await getAllShipmentFiles()
  const activeFiles = files.filter((f) => f.status !== "ARCHIVED" && f.status !== "VOID")

  const todayStr = new Date().toISOString().split("T")[0]
  let totalBytes = 0
  let uploadedToday = 0
  let pendingReview = 0
  let expired = 0
  let clientReady = 0

  for (const f of activeFiles) {
    totalBytes += f.file_size || 0
    if (f.uploaded_at?.startsWith(todayStr)) {
      uploadedToday++
    }
    if (f.status === "RECEIVED" || f.status === "DRAFT") {
      pendingReview++
    }
    if (f.expiry_date && f.expiry_date < todayStr) {
      expired++
    }
    if (f.client_visible && (f.status === "APPROVED" || f.status === "FINAL")) {
      clientReady++
    }
  }

  // Format bytes
  let storageFormatted = "0 MB"
  if (totalBytes > 1024 * 1024 * 1024) {
    storageFormatted = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  } else {
    storageFormatted = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return {
    totalFiles: activeFiles.length,
    totalStorageBytes: totalBytes,
    storageFormatted,
    filesUploadedToday: uploadedToday,
    pendingReviewCount: pendingReview,
    missingRequiredCount: 0, // Computed by checklist
    expiredDocsCount: expired,
    clientDocumentsReadyCount: clientReady,
  }
}
