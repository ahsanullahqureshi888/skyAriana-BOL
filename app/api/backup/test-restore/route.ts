import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs/promises"
import { getDataPath } from "@/lib/server-paths"
import { readJsonFile } from "@/lib/services/blob-db"
import { testRestoreInSandbox } from "@/lib/backup/validate-backup"
import type { BackupItem } from "@/lib/backup/backup-types"

export const dynamic = "force-dynamic"

const BACKUPS_CATALOG_FILE = getDataPath(".local-backups-catalog.json")

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const backupId = body.backupId

    if (!backupId) {
      return NextResponse.json(
        { success: false, error: "backupId is required" },
        { status: 400 }
      )
    }

    const catalog = await readJsonFile<BackupItem[]>(BACKUPS_CATALOG_FILE, [])
    const backup = catalog.find((b) => b.id === backupId)

    if (!backup) {
      return NextResponse.json(
        { success: false, error: `Backup ${backupId} not found in catalog` },
        { status: 404 }
      )
    }

    const buffer = await fs.readFile(backup.filePath)
    const result = await testRestoreInSandbox(buffer)

    return NextResponse.json({
      success: true,
      backupId,
      fileName: backup.fileName,
      drillResult: result,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Sandbox test restore failed" },
      { status: 500 }
    )
  }
}
