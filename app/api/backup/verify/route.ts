import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs/promises"
import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, writeJsonFile } from "@/lib/services/blob-db"
import { validateBackupFile } from "@/lib/backup/validate-backup"
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

    const validation = await validateBackupFile(backup.filePath)

    // Update catalog item
    backup.verificationStatus = validation.isValid ? "VERIFIED" : "FAILED"
    if (!validation.isValid) {
      backup.status = "WARNING"
      backup.note = (backup.note || "") + ` (Verification issues: ${validation.errors.join(", ")})`
    } else {
      backup.status = "SUCCESS"
    }

    await writeJsonFile(BACKUPS_CATALOG_FILE, catalog)

    return NextResponse.json({
      success: true,
      backupId,
      isValid: validation.isValid,
      verificationStatus: backup.verificationStatus,
      invarianceValid: validation.invarianceValid,
      checksumsMatch: validation.checksumsMatch,
      recordCounts: validation.recordCounts,
      financialSummary: validation.financialSummary,
      errors: validation.errors,
      warnings: validation.warnings,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to verify backup" },
      { status: 500 }
    )
  }
}
