import { NextRequest, NextResponse } from "next/server"
import { runDeepHealthScan } from "@/lib/backup/database-health-service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const report = await runDeepHealthScan()
    return NextResponse.json({ success: true, report })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Health scan failed" },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const report = await runDeepHealthScan()
    return NextResponse.json({ success: true, report })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Health scan failed" },
      { status: 500 }
    )
  }
}
