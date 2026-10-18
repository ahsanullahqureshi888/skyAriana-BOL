import { NextResponse } from "next/server"
import { getGoogleDriveStatus } from "@/lib/google-drive/sync"

export async function GET() {
  try {
    const status = await getGoogleDriveStatus()
    return NextResponse.json(status)
  } catch (error: any) {
    return NextResponse.json(
      {
        state: "failed",
        error: error?.message || "Failed to determine Google Drive status",
        settings: {
          autoBackupEnabled: false,
          autoBackupInterval: "daily",
          retentionLimit: 10,
          includePdfs: true,
          includeDocuments: true,
          autoUploadPdfs: false,
          wifiOnly: false,
        },
        pendingOfflineBackup: false,
      },
      { status: 200 }
    )
  }
}
