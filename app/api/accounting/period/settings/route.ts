import { NextResponse } from "next/server"
import { getPeriodSettings, savePeriodSettings } from "@/lib/accounting/period-closing/period-service"

export async function GET() {
  try {
    const settings = await getPeriodSettings()
    return NextResponse.json({ success: true, settings })
  } catch (error: any) {
    console.error("[api/accounting/period/settings GET] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { settings, actor } = body

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ success: false, error: "Settings object is required" }, { status: 400 })
    }

    const updated = await savePeriodSettings(settings, actor || "Administrator")
    return NextResponse.json({ success: true, settings: updated })
  } catch (error: any) {
    console.error("[api/accounting/period/settings PUT] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
