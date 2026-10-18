import { NextRequest, NextResponse } from "next/server"
import { getTreasuryDashboardData, getOperationalCashFlowReport } from "@/lib/treasury/treasury-service"
import { createClient } from "@/lib/supabase/server"

async function resolveUser(request: NextRequest) {
  let user: any = null
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = await createClient()
      const { data } = await supabase.auth.getUser()
      if (data?.user) user = data.user
    } catch (e) {}
  }
  const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || "").toLowerCase()
  return { user, role }
}

export async function GET(request: NextRequest) {
  const { role } = await resolveUser(request)
  if (role === "shipper" || role === "client") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get("type") || "cash_position"
    const periodStart = searchParams.get("startDate") || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
    const periodEnd = searchParams.get("endDate") || new Date().toISOString().split("T")[0]

    if (reportType === "cash_flow") {
      const cashFlow = await getOperationalCashFlowReport(periodStart, periodEnd)
      return NextResponse.json({
        success: true,
        report_type: "cash_flow",
        period_start: periodStart,
        period_end: periodEnd,
        data: cashFlow,
      })
    }

    const dashboard = await getTreasuryDashboardData()
    return NextResponse.json({
      success: true,
      report_type: reportType,
      cash_positions: dashboard.cashPositions,
      today_movements: dashboard.todayMovements,
    })
  } catch (error: any) {
    console.error("[Treasury Reports API] GET error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
