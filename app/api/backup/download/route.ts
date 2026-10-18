import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs/promises"
import fsSync from "node:fs"
import path from "node:path"
import os from "node:os"
import { getDataPath, getBackupRoot } from "@/lib/server-paths"
import { readJsonFile } from "@/lib/services/blob-db"
import type { BackupItem } from "@/lib/backup/backup-types"

export const dynamic = "force-dynamic"

const BACKUPS_CATALOG_FILE = getDataPath(".local-backups-catalog.json")

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const fileName = searchParams.get("fileName")

    if (!id && !fileName) {
      return NextResponse.json(
        { success: false, error: "id or fileName parameter required" },
        { status: 400 }
      )
    }

    const catalog = await readJsonFile<BackupItem[]>(BACKUPS_CATALOG_FILE, [])
    const target = catalog.find((b) => (id && b.id === id) || (fileName && b.fileName === fileName))

    let resolvedPath = target?.filePath
    let downloadFileName = target?.fileName || "sky-ariana-backup.zip"

    if (!resolvedPath || !fsSync.existsSync(/*turbopackIgnore: true*/ resolvedPath)) {
      // Check backup roots directly
      if (fileName && !fileName.includes("..")) {
        const candidatePaths = [
          path.join(getBackupRoot(), fileName),
          path.join(process.cwd(), "data", "backups", fileName),
          path.join(os.tmpdir(), "backups", fileName),
        ]
        for (const candidate of candidatePaths) {
          if (fsSync.existsSync(/*turbopackIgnore: true*/ candidate)) {
            resolvedPath = candidate
            downloadFileName = fileName
            break
          }
        }
      }
    }

    if (!resolvedPath || !fsSync.existsSync(/*turbopackIgnore: true*/ resolvedPath)) {
      return NextResponse.json(
        { success: false, error: "Backup file not found on server" },
        { status: 404 }
      )
    }

    const fileBuffer = await fs.readFile(resolvedPath)
    const isJson = downloadFileName.toLowerCase().endsWith(".json")
    const contentType = isJson ? "application/json; charset=utf-8" : "application/zip"

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${downloadFileName}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to download backup" },
      { status: 500 }
    )
  }
}
