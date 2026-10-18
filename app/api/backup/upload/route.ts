import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import crypto from "node:crypto"
import { getBackupRoot } from "@/lib/server-paths"
import { parseBackupFileContent, analyzeAndDryRunRestore } from "@/lib/backup/central-backup-service"
import { registerBackupInCatalog } from "@/lib/backup/create-backup"
import { CURRENT_APPLICATION_VERSION, CURRENT_DATABASE_SCHEMA_VERSION, computeSha256 } from "@/lib/backup/backup-format"
import type { BackupItem, BackupType } from "@/lib/backup/backup-types"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const note = (formData.get("note") as string) || "External backup upload"
    const actor = (formData.get("actor") as string) || "Admin"

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No backup file uploaded" },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Deep content validation (do NOT trust file extension)
    let parsed
    try {
      parsed = await parseBackupFileContent(buffer)
    } catch (parseErr: any) {
      return NextResponse.json(
        {
          success: false,
          error: "Uploaded file is not a valid AQ Companies backup file: " + (parseErr.message || String(parseErr)),
        },
        { status: 400 }
      )
    }

    const dryRun = await analyzeAndDryRunRestore(buffer)
    if (!dryRun.isCompatible && dryRun.compatibilityStatus === "CORRUPTED") {
      return NextResponse.json(
        {
          success: false,
          error: "Uploaded file failed integrity checks: " + dryRun.errors.join("; "),
          errors: dryRun.errors,
          warnings: dryRun.warnings,
        },
        { status: 400 }
      )
    }

    let backupDir = getBackupRoot()
    try {
      await fs.mkdir(backupDir, { recursive: true })
    } catch {
      backupDir = path.join(os.tmpdir(), "backups")
      await fs.mkdir(backupDir, { recursive: true }).catch(() => {})
    }

    const originalName = file.name || "uploaded-backup"
    const isZip = parsed.isZip
    const ext = isZip ? ".zip" : ".json"
    const baseName = path.basename(originalName).replace(/\.(json|zip)$/i, "").replace(/[^a-zA-Z0-9._-]/g, "_")
    const finalFileName = `${baseName}${ext}`
    const finalFilePath = path.join(backupDir, finalFileName)

    // Write file atomically (.tmp -> rename)
    const tempPath = path.join(backupDir, `.${finalFileName}.tmp.${Date.now()}`)
    await fs.writeFile(tempPath, buffer)
    await fs.rename(tempPath, finalFilePath)

    const backupId = `bkp-upload-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`
    const fileChecksum = computeSha256(buffer)

    const backupItem: BackupItem = {
      id: backupId,
      fileName: finalFileName,
      filePath: finalFilePath,
      type: "MANUAL",
      status: "SUCCESS",
      verificationStatus: dryRun.checksumValid ? "VERIFIED" : "WARNING" as any,
      createdAt: dryRun.createdAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      createdBy: `${actor} (Uploaded)`,
      appVersion: dryRun.applicationVersion || CURRENT_APPLICATION_VERSION,
      schemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
      databaseRevision: Date.now(),
      fileSizeBytes: buffer.length,
      databaseSizeBytes: Math.round(buffer.length * 0.8),
      checksum: fileChecksum,
      protected: false,
      note,
      recordCounts: dryRun.backupRecordCounts,
      storageLocation: "PRIMARY_LOCAL",
    }

    await registerBackupInCatalog(backupItem)

    return NextResponse.json({
      success: true,
      backup: backupItem,
      preview: dryRun,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to process uploaded backup" },
      { status: 500 }
    )
  }
}
