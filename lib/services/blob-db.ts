import fs from "fs"
import path from "path"
import os from "os"
import { put, list } from "@vercel/blob"

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const fileName = path.basename(filePath)
  const blobName = `databases/${fileName.replace(/^\.+/, '')}`

  if (token) {
    try {
      const blobs = await list({ prefix: blobName, token })
      const file = blobs.blobs.find(b => b.pathname === blobName)
      if (file) {
        const response = await fetch(file.url, { cache: "no-store" })
        if (response.ok) {
          return (await response.json()) as T
        }
      }
    } catch (error) {
      console.error(`[blob-db] Failed to read ${fileName} from Vercel Blob:`, error)
    }
  }

  // 1. Try reading from requested filePath
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(await fs.promises.readFile(filePath, "utf-8")) as T
    }
  } catch (error) {
    // ignore
  }

  // 2. Try reading from os.tmpdir() fallback
  try {
    const tmpPath = path.join(os.tmpdir(), fileName)
    if (fs.existsSync(tmpPath)) {
      return JSON.parse(await fs.promises.readFile(tmpPath, "utf-8")) as T
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

  // 1. Try writing to requested path
  try {
    await fs.promises.writeFile(filePath, jsonStr, "utf-8")
  } catch (error) {
    // 2. Fallback to writing to os.tmpdir() (Vercel serverless writable path)
    try {
      const tmpPath = path.join(os.tmpdir(), fileName)
      await fs.promises.writeFile(tmpPath, jsonStr, "utf-8")
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

