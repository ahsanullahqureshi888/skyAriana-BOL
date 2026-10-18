import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs/promises"
import fsSync from "node:fs"
import { getDataPath } from "@/lib/server-paths"
import { readJsonFile } from "@/lib/services/blob-db"
import {
  analyzeAndDryRunRestore,
  executeAQRestore,
  rollbackRestore,
} from "@/lib/backup/central-backup-service"
import type { BackupItem } from "@/lib/backup/backup-types"

export const dynamic = "force-dynamic"

const BACKUPS_CATALOG_FILE = getDataPath(".local-backups-catalog.json")

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = body.action || "execute"
    const backupId = body.backupId
    const filePath = body.filePath

    // Rollback action
    if (action === "rollback") {
      const restoreId = body.restoreId
      if (!restoreId) {
        return NextResponse.json({ success: false, error: "restoreId is required for rollback" }, { status: 400 })
      }
      const rollbackRes = await rollbackRestore(restoreId, body.actor || "Admin")
      if (!rollbackRes.success) {
        return NextResponse.json({ success: false, error: rollbackRes.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, rolledBackToSnapshot: rollbackRes.rolledBackToSnapshot })
    }

    // Locate backup payload
    let targetPath = filePath
    if (!targetPath && backupId) {
      const catalog = await readJsonFile<BackupItem[]>(BACKUPS_CATALOG_FILE, [])
      const backup = catalog.find((b) => b.id === backupId)
      if (backup && fsSync.existsSync(backup.filePath)) {
        targetPath = backup.filePath
      } else {
        return NextResponse.json({ success: false, error: `Backup with ID ${backupId} not found on disk` }, { status: 404 })
      }
    }

    if (!targetPath && !body.rawContent) {
      return NextResponse.json({ success: false, error: "backupId, filePath, or rawContent is required" }, { status: 400 })
    }

    const payload = body.rawContent || (await fs.readFile(targetPath))

    // DRY RUN / PREVIEW
    if (action === "preview" || action === "dry_run") {
      const dryRunResult = await analyzeAndDryRunRestore(payload, {
        selectedModules: body.selectedModules,
      })
      return NextResponse.json({
        success: dryRunResult.success,
        preview: dryRunResult,
      })
    }

    // EXECUTION
    const mode = body.mode === "replace" ? "replace" : body.mode === "selective" ? "selective" : "merge"
    const actor = body.actor || "Admin User"
    const note = body.note || ""
    const confirmationText = body.confirmationText || ""
    const selectedModules = body.selectedModules
    const conflictResolutions = body.conflictResolutions

    const result = await executeAQRestore(payload, {
      mode,
      actor,
      note,
      confirmationText,
      selectedModules,
      conflictResolutions,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          rolledBack: result.rolledBack,
          warnings: result.warnings,
          preRestoreBackupFile: result.preRestoreSnapshotFile,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Restore operation failed" },
      { status: 500 }
    )
  }
}
