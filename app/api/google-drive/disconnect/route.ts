import { NextResponse } from "next/server"
import { disconnectGoogleDrive } from "@/lib/google-drive/auth"

export async function POST() {
  try {
    await disconnectGoogleDrive()
    return NextResponse.json({ success: true, message: "Google Drive disconnected" })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to disconnect Google Drive" },
      { status: 500 }
    )
  }
}
