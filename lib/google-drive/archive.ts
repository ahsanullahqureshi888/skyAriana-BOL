import zlib from "node:zlib"

export interface ArchiveEntry {
  path: string
  data: Buffer | string
}

// Precomputed CRC32 table for standard ZIP checksums
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[i] = c >>> 0
}

export function crc32(buffer: Buffer): number {
  if (typeof (zlib as any).crc32 === "function") {
    return (zlib as any).crc32(buffer) >>> 0
  }
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function toDosDateTime(date: Date): { time: number; date: number } {
  const dosTime =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((Math.floor(date.getSeconds() / 2) & 0x1f) >>> 0)
  const dosDate =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0xf) << 5) |
    (date.getDate() & 0x1f)
  return { time: dosTime, date: dosDate }
}

/**
 * Creates a standard, fully compatible ZIP archive containing the provided entries.
 * Uses DEFLATE compression via Node's native zlib.
 */
export function createZipArchive(entries: ArchiveEntry[]): Buffer {
  const now = new Date()
  const { time: dosTime, date: dosDate } = toDosDateTime(now)

  const localHeadersAndData: Buffer[] = []
  const centralDirEntries: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const entryAny = entry as any
    const rawPath = entry.path || entryAny.filename || entryAny.name || ""
    const rawPayload = entry.data !== undefined ? entry.data : entryAny.content
    const rawData = Buffer.isBuffer(rawPayload)
      ? rawPayload
      : Buffer.from(rawPayload || "", "utf8")
    const cleanPath = (entryAny.preserveRawPath || entryAny.rawPath)
      ? String(rawPath)
      : String(rawPath).replace(/\\/g, "/").replace(/^\/+/, "")
    const pathBuffer = Buffer.from(cleanPath, "utf8")

    const compressedData = zlib.deflateRawSync(rawData, { level: 9 })
    const crc = crc32(rawData)

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0) // Signature
    localHeader.writeUInt16LE(20, 4) // Version needed (2.0)
    localHeader.writeUInt16LE(0x0800, 6) // Flags (UTF-8)
    localHeader.writeUInt16LE(8, 8) // Compression: Deflate
    localHeader.writeUInt16LE(dosTime, 10)
    localHeader.writeUInt16LE(dosDate, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(compressedData.length, 18)
    localHeader.writeUInt32LE(rawData.length, 22)
    localHeader.writeUInt16LE(pathBuffer.length, 26)
    localHeader.writeUInt16LE(0, 28) // Extra length

    const localChunk = Buffer.concat([localHeader, pathBuffer, compressedData])
    localHeadersAndData.push(localChunk)

    // Central directory header (46 bytes + filename)
    const cdHeader = Buffer.alloc(46)
    cdHeader.writeUInt32LE(0x02014b50, 0) // Signature
    cdHeader.writeUInt16LE(20, 4) // Made by version
    cdHeader.writeUInt16LE(20, 6) // Version needed
    cdHeader.writeUInt16LE(0x0800, 8) // Flags (UTF-8)
    cdHeader.writeUInt16LE(8, 10) // Compression: Deflate
    cdHeader.writeUInt16LE(dosTime, 12)
    cdHeader.writeUInt16LE(dosDate, 14)
    cdHeader.writeUInt32LE(crc, 16)
    cdHeader.writeUInt32LE(compressedData.length, 20)
    cdHeader.writeUInt32LE(rawData.length, 24)
    cdHeader.writeUInt16LE(pathBuffer.length, 28)
    cdHeader.writeUInt16LE(0, 30) // Extra length
    cdHeader.writeUInt16LE(0, 32) // Comment length
    cdHeader.writeUInt16LE(0, 34) // Disk number start
    cdHeader.writeUInt16LE(0, 36) // Internal attributes
    cdHeader.writeUInt32LE(0, 38) // External attributes
    cdHeader.writeUInt32LE(offset, 42) // Relative offset of local header

    centralDirEntries.push(Buffer.concat([cdHeader, pathBuffer]))
    offset += localChunk.length
  }

  const centralDirBuffer = Buffer.concat(centralDirEntries)

  // End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0) // Signature
  eocd.writeUInt16LE(0, 4) // Disk number
  eocd.writeUInt16LE(0, 6) // Start disk
  eocd.writeUInt16LE(entries.length, 8) // Disk entries
  eocd.writeUInt16LE(entries.length, 10) // Total entries
  eocd.writeUInt32LE(centralDirBuffer.length, 12) // Central dir size
  eocd.writeUInt32LE(offset, 16) // Central dir offset
  eocd.writeUInt16LE(0, 20) // Comment length

  return Buffer.concat([...localHeadersAndData, centralDirBuffer, eocd])
}

export interface ZipExtractionOptions {
  maxTotalUncompressedSize?: number
  maxFilesCount?: number
  maxSingleFileSize?: number
  maxCompressionRatio?: number
  allowExecutables?: boolean
}

export const DEFAULT_ZIP_LIMITS = {
  maxTotalUncompressedSize: 500 * 1024 * 1024, // 500 MB
  maxFilesCount: 5000,
  maxSingleFileSize: 100 * 1024 * 1024, // 100 MB
  maxCompressionRatio: 100, // 100:1 ratio limit
}

const FORBIDDEN_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".ps1", ".sh", ".vbs", ".js", ".mjs", ".cjs",
  ".com", ".scr", ".msi", ".dll", ".wsf", ".hta", ".cpl", ".pif", ".reg"
])

/**
 * Extracts files from a ZIP archive buffer.
 * Includes zip-slip path traversal sanitization, resource exhaustion guards (ZIP bomb),
 * script/executable rejection, and CRC32 verification.
 */
export function extractZipArchive(
  zipBuffer: Buffer,
  options: ZipExtractionOptions = {}
): Map<string, Buffer> {
  const result = new Map<string, Buffer>()

  // Locate End of Central Directory (EOCD)
  let eocdOffset = -1
  for (let i = zipBuffer.length - 22; i >= Math.max(0, zipBuffer.length - 65557); i--) {
    if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i
      break
    }
  }

  if (eocdOffset === -1) {
    throw new Error("Invalid ZIP archive: End of Central Directory signature not found")
  }

  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10)
  const centralDirOffset = zipBuffer.readUInt32LE(eocdOffset + 16)

  const maxFiles = options.maxFilesCount ?? DEFAULT_ZIP_LIMITS.maxFilesCount
  if (totalEntries > maxFiles) {
    throw new Error(
      `Suspicious archive: Entry count (${totalEntries}) exceeds maximum safety limit (${maxFiles})`
    )
  }

  let totalExtractedBytes = 0
  const maxTotalBytes = options.maxTotalUncompressedSize ?? DEFAULT_ZIP_LIMITS.maxTotalUncompressedSize
  const maxSingleBytes = options.maxSingleFileSize ?? DEFAULT_ZIP_LIMITS.maxSingleFileSize
  const maxRatio = options.maxCompressionRatio ?? DEFAULT_ZIP_LIMITS.maxCompressionRatio

  let cdPointer = centralDirOffset
  for (let i = 0; i < totalEntries; i++) {
    if (zipBuffer.readUInt32LE(cdPointer) !== 0x02014b50) {
      throw new Error(`Corrupted Central Directory at entry ${i}`)
    }

    const compressionMethod = zipBuffer.readUInt16LE(cdPointer + 10)
    const expectedCrc = zipBuffer.readUInt32LE(cdPointer + 16)
    const compressedSize = zipBuffer.readUInt32LE(cdPointer + 20)
    const uncompressedSize = zipBuffer.readUInt32LE(cdPointer + 24)
    const nameLength = zipBuffer.readUInt16LE(cdPointer + 28)
    const extraLength = zipBuffer.readUInt16LE(cdPointer + 30)
    const commentLength = zipBuffer.readUInt16LE(cdPointer + 32)
    const localHeaderOffset = zipBuffer.readUInt32LE(cdPointer + 42)

    const rawPath = zipBuffer.toString("utf8", cdPointer + 46, cdPointer + 46 + nameLength)
    cdPointer += 46 + nameLength + extraLength + commentLength

    // 1. PATH TRAVERSAL GUARDS (ZIP-Slip, drive letters, UNC, null bytes)
    if (rawPath.includes("\0")) {
      throw new Error(`Suspicious archive entry path (Null byte detected): ${rawPath}`)
    }
    if (/^[a-zA-Z]:/.test(rawPath)) {
      throw new Error(`Suspicious archive entry path (Drive letter detected): ${rawPath}`)
    }
    if (/^[/\\]{2}/.test(rawPath)) {
      throw new Error(`Suspicious archive entry path (UNC path detected): ${rawPath}`)
    }
    if (rawPath.startsWith("/") || rawPath.startsWith("\\")) {
      throw new Error(`Suspicious archive entry path (Absolute path detected): ${rawPath}`)
    }
    if (rawPath.includes("..") || rawPath.includes("../") || rawPath.includes("..\\")) {
      throw new Error(`Suspicious archive entry path (Directory traversal attack detected): ${rawPath}`)
    }

    const normalized = rawPath.replace(/\\/g, "/").replace(/^\/+/, "")
    if (normalized.includes("..") || normalized.startsWith("/")) {
      throw new Error(`Suspicious archive entry path (Directory traversal attack detected): ${rawPath}`)
    }

    // 2. EXECUTABLE & SCRIPT REJECTION (Req 9: Backup files are DATA only)
    const extMatch = normalized.match(/\.([a-zA-Z0-9]+)$/)
    const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ""
    if (!options.allowExecutables && FORBIDDEN_EXTENSIONS.has(ext)) {
      throw new Error(
        `Security violation: Archive contains forbidden executable or script file "${normalized}" (${ext}). Backups may only contain data.`
      )
    }

    // 3. ZIP BOMB / RESOURCE EXHAUSTION GUARDS (Req 11)
    if (uncompressedSize > maxSingleBytes) {
      throw new Error(
        `Archive entry "${normalized}" uncompressed size (${uncompressedSize} bytes) exceeds maximum limit (${maxSingleBytes} bytes)`
      )
    }
    if (compressedSize > 0 && uncompressedSize > 1024 * 1024) {
      const ratio = uncompressedSize / compressedSize
      if (ratio > maxRatio) {
        throw new Error(
          `Potential ZIP bomb detected: compression ratio for "${normalized}" is ${ratio.toFixed(1)}:1 (exceeds limit ${maxRatio}:1)`
        )
      }
    }
    totalExtractedBytes += uncompressedSize
    if (totalExtractedBytes > maxTotalBytes) {
      throw new Error(
        `Total uncompressed archive size (${totalExtractedBytes} bytes) exceeds maximum safety limit (${maxTotalBytes} bytes)`
      )
    }

    // Read local header to find data start
    if (zipBuffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new Error(`Corrupted Local File Header at offset ${localHeaderOffset}`)
    }
    const localNameLength = zipBuffer.readUInt16LE(localHeaderOffset + 26)
    const localExtraLength = zipBuffer.readUInt16LE(localHeaderOffset + 28)
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength
    const compressedData = zipBuffer.subarray(dataStart, dataStart + compressedSize)

    let extracted: Buffer
    if (compressionMethod === 0) {
      extracted = Buffer.from(compressedData)
    } else if (compressionMethod === 8) {
      extracted = zlib.inflateRawSync(compressedData)
    } else {
      throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`)
    }

    if (crc32(extracted) !== expectedCrc) {
      throw new Error(`CRC-32 checksum mismatch for extracted file: ${normalized}`)
    }

    // 4. UNTRUSTED SVG SCRIPT INSPECTION
    if (ext === ".svg") {
      const text = extracted.toString("utf8")
      if (/<script/i.test(text) || /javascript:/i.test(text) || /onload\s*=/i.test(text) || /onerror\s*=/i.test(text)) {
        throw new Error(`Security violation: Untrusted SVG in archive entry "${normalized}" contains embedded script execution.`)
      }
    }

    result.set(normalized, extracted)
  }

  return result
}
