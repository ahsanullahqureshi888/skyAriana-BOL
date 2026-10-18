import { NextRequest, NextResponse } from "next/server"
import { getLogisticsAnalyticsReport } from "@/lib/reports/management-reporting-service"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const filters = {
      datePreset: (url.searchParams.get("datePreset") || "this_month") as any,
      startDate: url.searchParams.get("startDate") || undefined,
      endDate: url.searchParams.get("endDate") || undefined,
      periodCode: url.searchParams.get("periodCode") || undefined,
    }

    const data = await getLogisticsAnalyticsReport(filters)
    return NextResponse.json({ success: true, ...data })
  } catch (error: any) {
    console.error("[Operations Analytics API] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to generate Operations report" }, { status: 500 })
  }
}
