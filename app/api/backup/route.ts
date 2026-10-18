import { NextRequest, NextResponse } from "next/server"
import {
  listAllBackups,
  deleteBackupItem,
  isBackupOperationInProgress,
} from "@/lib/backup/create-backup"
import { getDisasterRecoveryConfig } from "@/lib/backup/backup-retention-service"
import {
  createAQBackup,
  getBackupOverviewStats,
} from "@/lib/backup/central-backup-service"
import type { AQBackupType, AQBackupExtension } from "@/lib/backup/backup-format"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [backups, config, overviewStats] = await Promise.all([
      listAllBackups(),
      getDisasterRecoveryConfig(),
      getBackupOverviewStats(),
    ])

    const verifiedList = backups.filter(
      (b) => b.verificationStatus === "VERIFIED" && b.status === "SUCCESS"
    )
    const lockStatus = isBackupOperationInProgress()

    const stats = {
      totalBackups: backups.length,
      verifiedBackups: verifiedList.length,
      protectedBackups: backups.filter((b) => b.protected).length,
      lastSuccessfulBackup: overviewStats.lastSuccessfulBackup,
      lastAutomaticBackup: overviewStats.lastAutomaticBackup,
      lastVerifiedTime: verifiedList[0]?.createdAt || null,
      totalStorageBytes: overviewStats.storageUsageBytes,
      dataIntegrityStatus: overviewStats.dataIntegrityStatus,
      restoreReadiness: overviewStats.restoreReadiness,
      backupLocation: overviewStats.backupLocation,
      preferredFolder: overviewStats.preferredFolder,
      databaseRevision: overviewStats.databaseRevision,
      isLocked: lockStatus.locked,
      lockedBy: lockStatus.holder,
    }

    return NextResponse.json({
      success: true,
      stats,
      overviewStats,
      config,
      backups,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to list backups" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const rawType = String(body.type || "full").toLowerCase()
    const type: AQBackupType = [
      "full",
      "data_only",
      "documents_only",
      "accounting_only",
      "bol_logistics_only",
      "settings_only",
      "custom",
    ].includes(rawType)
      ? (rawType as AQBackupType)
      : "full"

    const extension: AQBackupExtension = body.format === "zip" || body.extension === "zip" || body.includeAttachments ? "zip" : "json"
    const actor: string = body.actor || "User Admin"
    const note: string = body.note || ""
    const isProtected: boolean = Boolean(body.protected)
    const includeAttachments: boolean = body.includeAttachments !== false
    const selectedModules: string[] = Array.isArray(body.selectedModules) ? body.selectedModules : []

    const result = await createAQBackup({
      type,
      extension,
      actor,
      note,
      protected: isProtected,
      includeAttachments,
      selectedModules,
      customTargetDir: body.customTargetDir,
    })

    return NextResponse.json({
      success: true,
      backup: {
        id: result.backupId,
        fileName: result.fileName,
        filePath: result.filePath,
        fileSizeBytes: result.fileSizeBytes,
        checksum: result.checksum,
        verificationStatus: result.verificationPassed ? "VERIFIED" : "FAILED",
        status: result.verificationPassed ? "SUCCESS" : "FAILED",
        recordCounts: result.recordCounts,
        createdAt: result.createdAt,
      },
      completenessScore: result.completenessScore,
      warnings: result.warnings,
      envelope: result.envelope,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create backup" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const backupId = searchParams.get("id")
    const actor = searchParams.get("actor") || "Admin"

    if (!backupId) {
      return NextResponse.json(
        { success: false, error: "Backup ID parameter is required" },
        { status: 400 }
      )
    }

    const result = await deleteBackupItem(backupId, { actor })
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, deletedId: backupId })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete backup" },
      { status: 500 }
    )
  }
}
