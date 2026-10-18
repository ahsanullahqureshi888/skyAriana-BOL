import { NextResponse } from "next/server"
import {
  readDriveSettings,
  updateDriveSettings,
} from "@/lib/google-drive/storage-settings"

export async function GET() {
  try {
    const settings = await readDriveSettings()
    return NextResponse.json({ success: true, settings })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load Google Drive settings" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const updated = await updateDriveSettings(body)
    return NextResponse.json({ success: true, settings: updated })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update Google Drive settings" },
      { status: 500 }
    )
  }
}
