import { NextResponse } from "next/server"
import {
  previewGoogleDriveBackup,
  restoreGoogleDriveBackup,
} from "@/lib/google-drive/database-restore"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action, fileId, restoreLatest, mode, passphrase } = body

    if (!fileId && !restoreLatest) {
      return NextResponse.json(
        { success: false, error: "fileId or restoreLatest is required" },
        { status: 400 }
      )
    }

    if (action === "preview") {
      if (!fileId) {
        return NextResponse.json(
          { success: false, error: "fileId is required to preview backup" },
          { status: 400 }
        )
      }
      const preview = await previewGoogleDriveBackup(fileId, passphrase)
      return NextResponse.json({ success: true, preview })
    }

    if (action === "restore") {
      const restoreMode = mode === "replace" ? "replace" : "merge"
      const result = await restoreGoogleDriveBackup({
        fileId,
        restoreLatest: Boolean(restoreLatest),
        mode: restoreMode,
        passphrase,
      })

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            rolledBack: result.rolledBack,
            preRestoreBackupFile: result.preRestoreBackupFile,
            error: result.error || "Restore failed. Pre-restore backup was reinstated.",
          },
          { status: 422 }
        )
      }

      return NextResponse.json({
        success: true,
        mode: result.mode,
        restoredCounts: result.restoredCounts,
        preRestoreBackupFile: result.preRestoreBackupFile,
        invarianceValid: result.invarianceValid,
      })
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Expected 'preview' or 'restore'." },
      { status: 400 }
    )
  } catch (error: any) {
    console.error("[gdrive-restore] Restore route error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to process backup restore" },
      { status: 500 }
    )
  }
}
