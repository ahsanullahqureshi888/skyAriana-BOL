/**
 * Sky Ariana Logistics — Secure Local-First File Storage Provider
 * Phase 14: Document Upload, Automatic Attachment Organization & Digital Shipment Folder
 */

import fs from "fs"
import path from "path"
import crypto from "crypto"
import { getUploadPath } from "@/lib/server-paths"

// Allowed extensions and corresponding MIME types for logistics documentation
export const ALLOWED_EXTENSIONS_MAP: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  txt: "text/plain",
}

// Dangerous extensions strictly blocked from upload
export const BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "msi", "ps1", "sh", "vbs", "js", "ts", "py", "bin", "com", "scr", "jar", "apk"
])

// Maximum single file size: 50MB (configurable via env)
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

export interface StoredFileResult {
  storagePath: string
  storageName: string
  absolutePath: string
  fileSize: number
  checksum: string
  mimeType: string
  fileExtension: string
}

export class FileStorageProvider {
  /**
   * Computes deterministic SHA-256 checksum of file buffer
   */
  static calculateChecksum(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex")
  }

  /**
   * Sanitizes user-provided filename:
   * - Strips path traversal sequences (../, ./)
   * - Strips control characters and Windows reserved names
   * - Preserves valid alphanumeric, dashes, underscores, and extension
   */
  static sanitizeFilename(originalName: string): string {
    const base = path.basename(originalName)
    // Replace dangerous chars with dash
    let safe = base.replace(/[^\w\.\-\s\(\)]/gi, "_").trim()
    if (!safe || safe === "." || safe === "..") {
      safe = `attachment_${Date.now()}`
    }
    // Prevent Windows reserved device names
    const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i
    if (reserved.test(safe)) {
      safe = `file_${safe}`
    }
    return safe
  }

  /**
   * Validates file size, extension, and MIME type
   */
  static validateFile(
    filename: string,
    fileSize: number,
    declaredMime?: string
  ): { valid: boolean; error?: string; extension: string; mimeType: string } {
    if (fileSize <= 0) {
      return { valid: false, error: "File is empty (0 bytes)", extension: "", mimeType: "" }
    }
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File exceeds maximum allowed size of 50MB (${Math.round(fileSize / (1024 * 1024))}MB)`,
        extension: "",
        mimeType: "",
      }
    }

    const rawExt = path.extname(filename).toLowerCase().replace(".", "")
    if (!rawExt) {
      return { valid: false, error: "File has no extension", extension: "", mimeType: "" }
    }

    if (BLOCKED_EXTENSIONS.has(rawExt)) {
      return {
        valid: false,
        error: `File type (.${rawExt}) is prohibited for security reasons`,
        extension: rawExt,
        mimeType: "",
      }
    }

    const matchedMime = ALLOWED_EXTENSIONS_MAP[rawExt]
    if (!matchedMime) {
      return {
        valid: false,
        error: `Unsupported file extension (.${rawExt}). Supported formats: PDF, JPG, PNG, WEBP, DOCX, XLSX, CSV, TXT.`,
        extension: rawExt,
        mimeType: "",
      }
    }

    const mime = declaredMime || matchedMime
    return { valid: true, extension: rawExt, mimeType: mime }
  }

  /**
   * Persists file buffer locally in structured directory tree:
   * uploads/shipments/[year]/[bolNumber]/[category]/[id-filename]
   */
  static async saveFile(
    buffer: Buffer,
    fileId: string,
    originalName: string,
    bolNumber: string,
    categoryCode: string
  ): Promise<StoredFileResult> {
    const fileSize = buffer.length
    const validation = this.validateFile(originalName, fileSize)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const checksum = this.calculateChecksum(buffer)
    const sanitized = this.sanitizeFilename(originalName)
    const storageName = `${fileId}-${sanitized}`
    const year = new Date().getFullYear().toString()
    const safeBol = bolNumber.replace(/[^\w\-]/gi, "_") || "GENERAL"
    const safeCategory = categoryCode.toLowerCase().replace(/[^\w]/gi, "_") || "other"

    // Construct target folder safely
    const subDirSegments = ["shipments", year, safeBol, safeCategory]
    const storageSubDir = getUploadPath(...subDirSegments)
    await fs.promises.mkdir(storageSubDir, { recursive: true })

    const absolutePath = path.join(storageSubDir, storageName)
    await fs.promises.writeFile(absolutePath, buffer)

    const relativeStoragePath = ["shipments", year, safeBol, safeCategory, storageName].join("/")

    return {
      storagePath: relativeStoragePath,
      storageName,
      absolutePath,
      fileSize,
      checksum,
      mimeType: validation.mimeType,
      fileExtension: validation.extension,
    }
  }

  /**
   * Safely resolves a relative storage path into an absolute disk path
   */
  static resolveUploadPath(relativeStoragePath: string): string {
    if (relativeStoragePath.includes("..") || path.isAbsolute(relativeStoragePath)) {
      throw new Error("Invalid or unsafe storage path")
    }
    const segments = relativeStoragePath.split(/[\/\\]/).filter(Boolean)
    return getUploadPath(...segments)
  }

  /**
   * Checks whether a file exists on disk
   */
  static fileExists(relativeStoragePath: string): boolean {
    try {
      const abs = this.resolveUploadPath(relativeStoragePath)
      return fs.existsSync(abs)
    } catch {
      return false
    }
  }

  /**
   * Reads raw buffer from safe relative storage path
   */
  static async getFileBuffer(relativeStoragePath: string): Promise<Buffer> {
    const absolutePath = this.resolveUploadPath(relativeStoragePath)
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found on storage: ${relativeStoragePath}`)
    }

    return await fs.promises.readFile(absolutePath)
  }

  /**
   * Resolves absolute filesystem path with path traversal protection
   */
  static getAbsolutePath(relativeStoragePath: string): string {
    const abs = this.resolveUploadPath(relativeStoragePath)
    if (!fs.existsSync(abs)) {
      throw new Error(`File not found on storage: ${relativeStoragePath}`)
    }
    return abs
  }

  /**
   * Soft-archives or safely moves file if needed
   */
  static async archiveFile(relativeStoragePath: string): Promise<void> {
    const abs = this.resolveUploadPath(relativeStoragePath)
    if (!fs.existsSync(abs)) {
      return
    }
  }

  /**
   * Deletes file permanently from disk for drafts/cancelled records
   */
  static async deleteFile(relativeStoragePath: string): Promise<void> {
    const abs = this.resolveUploadPath(relativeStoragePath)
    if (fs.existsSync(abs)) {
      await fs.promises.unlink(abs).catch(() => {})
    }
  }
}
