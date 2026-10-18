import { NextResponse } from "next/server"
import { executeGoogleDriveDatabaseBackup, ZeroRecordDataLossError } from "@/lib/google-drive/database-backup"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { encrypt, passphrase, isAutoBackup, force } = body

    const result = await executeGoogleDriveDatabaseBackup({
      encrypt: Boolean(encrypt),
      passphrase,
      isAutoBackup: Boolean(isAutoBackup),
      force: Boolean(force),
    })

    return NextResponse.json({
      success: true,
      fileName: result.fileName,
      fileId: result.fileId,
      recordCounts: result.recordCounts,
      databaseRevision: result.databaseRevision,
      manifest: result.manifest,
    })
  } catch (error: any) {
    console.error("[gdrive-backup] Backup route error:", error)

    if (error instanceof ZeroRecordDataLossError) {
      return NextResponse.json(
        {
          success: false,
          dataLossWarning: true,
          error: error.message,
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Google Drive backup could not be completed. Your local data is safe.",
      },
      { status: 500 }
    )
  }
}
