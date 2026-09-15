import fs from "fs"
import path from "path"
import os from "os"
import { put, list } from "@vercel/blob"

interface MemoryCacheEntry {
  mtimeMs: number
  data: unknown
  timestamp: number
}

const fileCache = new Map<string, MemoryCacheEntry>()
const fileOperations = new Map<string, Promise<void>>()

function queueFileOperation<T>(filePath: string, operation: () => Promise<T>): Promise<T> {
  const key = path.resolve(filePath)
  const previous = fileOperations.get(key) ?? Promise.resolve()
  const result = previous.catch(() => undefined).then(operation)
  const settled = result.then(() => undefined, () => undefined)
  fileOperations.set(key, settled)
  void settled.finally(() => {
    if (fileOperations.get(key) === settled) fileOperations.delete(key)
  })
  return result
}

/**
 * Crash-proof atomic write helper:
 * 1. Writes payload to a unique temporary file
 * 2. Optionally creates a .bak backup of the previous target
 * 3. Atomically replaces targetPath via fs.promises.rename with retry on Windows
 */
async function atomicWriteFile(targetPath: string, content: string): Promise<void> {
  const dir = path.dirname(targetPath)
  const tempPath = path.join(dir, `.${path.basename(targetPath)}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 8)}`)

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true })
  }

  // 1. Write to temp file
  const handle = await fs.promises.open(tempPath, "wx")
  try {
    await handle.writeFile(content, "utf-8")
    await handle.sync()
  } finally {
    await handle.close()
  }

  // 2. If target exists, create a backup copy (.bak)
  try {
    if (fs.existsSync(targetPath)) {
      const bakPath = `${targetPath}.bak`
      await fs.promises.copyFile(targetPath, bakPath)
    }
  } catch (_) {}

  // 3. Atomically rename temp file to target with retry for Windows locks
  let attempts = 0
  try {
    while (attempts < 5) {
      try {
        await fs.promises.rename(tempPath, targetPath)
        return
      } catch (error) {
        attempts++
        if (attempts >= 5) throw error
        await new Promise((resolve) => setTimeout(resolve, 20 * attempts))
      }
    }
  } finally {
    try {
      await fs.promises.unlink(tempPath)
    } catch {}
  }
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const fileName = path.basename(filePath)
  const blobName = `databases/${fileName.replace(/^\.+/, "")}`

  if (token) {
    try {
      const cached = fileCache.get(`blob:${blobName}`)
      if (cached && Date.now() - cached.timestamp < 10000) {
        return structuredClone(cached.data) as T
      }

      const blobs = await list({ prefix: blobName, token })
      const file = blobs.blobs.find((b) => b.pathname === blobName)
      if (file) {
        const response = await fetch(file.url, { cache: "no-store" })
        if (response.ok) {
          const parsed = (await response.json()) as T
          fileCache.set(`blob:${blobName}`, { mtimeMs: Date.now(), data: parsed, timestamp: Date.now() })
          return structuredClone(parsed)
        }
      }
    } catch (error) {
      console.error(`[blob-db] Failed to read ${fileName} from Vercel Blob:`, error)
    }
  }

  // 1. Try reading from requested filePath with mtime caching
  try {
    if (fs.existsSync(filePath)) {
      const stat = await fs.promises.stat(filePath)
      const cached = fileCache.get(filePath)
      if (cached && cached.mtimeMs === stat.mtimeMs) {
        return structuredClone(cached.data) as T
      }
      const raw = await fs.promises.readFile(filePath, "utf-8")
      const parsed = JSON.parse(raw) as T
      fileCache.set(filePath, { mtimeMs: stat.mtimeMs, data: parsed, timestamp: Date.now() })
      return structuredClone(parsed)
    }
  } catch (error) {
    // Check if backup .bak exists in case of corruption
    try {
      const bakPath = `${filePath}.bak`
      if (fs.existsSync(bakPath)) {
        const raw = await fs.promises.readFile(bakPath, "utf-8")
        const parsed = JSON.parse(raw) as T
        return parsed
      }
    } catch (_) {}
  }

  // 2. Try reading from os.tmpdir() fallback
  try {
    const tmpPath = path.join(os.tmpdir(), fileName)
    if (fs.existsSync(tmpPath)) {
      const stat = await fs.promises.stat(tmpPath)
      const cached = fileCache.get(tmpPath)
      if (cached && cached.mtimeMs === stat.mtimeMs) {
        return structuredClone(cached.data) as T
      }
      const raw = await fs.promises.readFile(tmpPath, "utf-8")
      const parsed = JSON.parse(raw) as T
      fileCache.set(tmpPath, { mtimeMs: stat.mtimeMs, data: parsed, timestamp: Date.now() })
      return structuredClone(parsed)
    }
  } catch (error) {
    // ignore
  }

  return structuredClone(fallback)
}

async function writeJsonFileUnqueued<T>(filePath: string, value: T): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const fileName = path.basename(filePath)
  const blobName = `databases/${fileName.replace(/^\.+/, "")}`
  const jsonStr = JSON.stringify(value, null, 2)
  // Cache exactly what was serialized, without retaining the caller's references.
  const persistedValue: unknown = JSON.parse(jsonStr)
  const now = Date.now()

  let persisted = false

  // 1. Try atomic write to requested path
  try {
    await atomicWriteFile(filePath, jsonStr)
    persisted = true
    try {
      const stat = await fs.promises.stat(filePath)
      fileCache.set(filePath, { mtimeMs: stat.mtimeMs, data: persistedValue, timestamp: Date.now() })
    } catch (_) {}
  } catch (error) {
    // 2. Fallback to writing to os.tmpdir() (Vercel serverless writable path)
    try {
      const tmpPath = path.join(os.tmpdir(), fileName)
      await atomicWriteFile(tmpPath, jsonStr)
      persisted = true
      const stat = await fs.promises.stat(tmpPath)
      fileCache.set(tmpPath, { mtimeMs: stat.mtimeMs, data: persistedValue, timestamp: Date.now() })
    } catch (tmpErr) {
      console.error(`[blob-db] Failed to write ${fileName} to local & tmp database:`, tmpErr)
    }
  }

  if (token) {
    try {
      await put(blobName, jsonStr, {
        access: "public",
        addRandomSuffix: false, // ensures it overwrites the same file
        token,
        contentType: "application/json",
      })
      persisted = true
      fileCache.set(`blob:${blobName}`, { mtimeMs: now, data: persistedValue, timestamp: now })
    } catch (error) {
      console.error(`[blob-db] Failed to write ${fileName} to Vercel Blob:`, error)
    }
  }

  if (!persisted) {
    fileCache.delete(filePath)
    fileCache.delete(`blob:${blobName}`)
    throw new Error(`Unable to persist JSON database ${fileName}`)
  }
}

export async function writeJsonFile<T>(filePath: string, value: T): Promise<void> {
  const snapshot: T = JSON.parse(JSON.stringify(value))
  return queueFileOperation(filePath, () => writeJsonFileUnqueued(filePath, snapshot))
}

/** Serialize a complete read-modify-write cycle for one JSON database file. */
export async function mutateJsonFile<T>(
  filePath: string,
  fallback: T,
  updater: (current: T) => T | Promise<T>,
): Promise<T> {
  return queueFileOperation(filePath, async () => {
    fileCache.delete(filePath)
    const blobName = `databases/${path.basename(filePath).replace(/^\.+/, "")}`
    fileCache.delete(`blob:${blobName}`)
    const current = await readJsonFile<T>(filePath, fallback)
    const next = await updater(current)
    await writeJsonFileUnqueued(filePath, next)
    return next
  })
}



