import { NextRequest, NextResponse } from "next/server"
import { toggleBackupProtection } from "@/lib/backup/create-backup"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const backupId = body.backupId
    const isProtected = Boolean(body.protected)

    if (!backupId) {
      return NextResponse.json(
        { success: false, error: "backupId is required" },
        { status: 400 }
      )
    }

    const success = await toggleBackupProtection(backupId, isProtected)
    if (!success) {
      return NextResponse.json(
        { success: false, error: `Backup ${backupId} not found` },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, backupId, protected: isProtected })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update backup protection" },
      { status: 500 }
    )
  }
}
