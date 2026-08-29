import fs from "fs"
import path from "path"
import os from "os"
import { put, list } from "@vercel/blob"

interface MemoryCacheEntry {
  mtimeMs: number
  data: any
  timestamp: number
}

const fileCache = new Map<string, MemoryCacheEntry>()

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const fileName = path.basename(filePath)
  const blobName = `databases/${fileName.replace(/^\.+/, '')}`

  if (token) {
    try {
      const cached = fileCache.get(`blob:${blobName}`)
      if (cached && Date.now() - cached.timestamp < 10000) {
        return cached.data as T
      }

      const blobs = await list({ prefix: blobName, token })
      const file = blobs.blobs.find(b => b.pathname === blobName)
      if (file) {
        const response = await fetch(file.url, { cache: "no-store" })
        if (response.ok) {
          const parsed = (await response.json()) as T
          fileCache.set(`blob:${blobName}`, { mtimeMs: Date.now(), data: parsed, timestamp: Date.now() })
          return parsed
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
        return cached.data as T
      }
      const raw = await fs.promises.readFile(filePath, "utf-8")
      const parsed = JSON.parse(raw) as T
      fileCache.set(filePath, { mtimeMs: stat.mtimeMs, data: parsed, timestamp: Date.now() })
      return parsed
    }
  } catch (error) {
    // ignore
  }

  // 2. Try reading from os.tmpdir() fallback
  try {
    const tmpPath = path.join(os.tmpdir(), fileName)
    if (fs.existsSync(tmpPath)) {
      const stat = await fs.promises.stat(tmpPath)
      const cached = fileCache.get(tmpPath)
      if (cached && cached.mtimeMs === stat.mtimeMs) {
        return cached.data as T
      }
      const raw = await fs.promises.readFile(tmpPath, "utf-8")
      const parsed = JSON.parse(raw) as T
      fileCache.set(tmpPath, { mtimeMs: stat.mtimeMs, data: parsed, timestamp: Date.now() })
      return parsed
    }
  } catch (error) {
    // ignore
  }

  return fallback
}

export async function writeJsonFile<T>(filePath: string, value: T): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const fileName = path.basename(filePath)
  const blobName = `databases/${fileName.replace(/^\.+/, '')}`
  const jsonStr = JSON.stringify(value, null, 2)
  const now = Date.now()

  // Update in-memory cache immediately
  fileCache.set(filePath, { mtimeMs: now, data: value, timestamp: now })
  fileCache.set(`blob:${blobName}`, { mtimeMs: now, data: value, timestamp: now })

  // 1. Try writing to requested path
  try {
    await fs.promises.writeFile(filePath, jsonStr, "utf-8")
    try {
      const stat = await fs.promises.stat(filePath)
      fileCache.set(filePath, { mtimeMs: stat.mtimeMs, data: value, timestamp: Date.now() })
    } catch (_) {}
  } catch (error) {
    // 2. Fallback to writing to os.tmpdir() (Vercel serverless writable path)
    try {
      const tmpPath = path.join(os.tmpdir(), fileName)
      await fs.promises.writeFile(tmpPath, jsonStr, "utf-8")
      const stat = await fs.promises.stat(tmpPath)
      fileCache.set(tmpPath, { mtimeMs: stat.mtimeMs, data: value, timestamp: Date.now() })
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
    } catch (error) {
      console.error(`[blob-db] Failed to write ${fileName} to Vercel Blob:`, error)
    }
  }
}


