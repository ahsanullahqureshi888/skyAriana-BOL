import { NextRequest, NextResponse } from "next/server"
import { getMetricDrilldown, canViewFinancials } from "@/lib/reports/management-reporting-service"
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
  const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || "admin").toLowerCase()
  return { user, role }
}

export async function GET(request: NextRequest) {
  const { role } = await resolveUser(request)
  if (role === "client" || role === "shipper") {
    return NextResponse.json({ success: false, error: "Forbidden: Client portal users cannot access drilldown records" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const metricId = url.searchParams.get("metricId")
    if (!metricId) {
      return NextResponse.json({ success: false, error: "metricId parameter is required" }, { status: 400 })
    }

    const filters = {
      datePreset: (url.searchParams.get("datePreset") || "this_month") as any,
      startDate: url.searchParams.get("startDate") || undefined,
      endDate: url.searchParams.get("endDate") || undefined,
      periodCode: url.searchParams.get("periodCode") || undefined,
    }

    const drilldown = await getMetricDrilldown(metricId, filters, role)
    return NextResponse.json({ success: true, drilldown })
  } catch (error: any) {
    console.error("[Metric Drilldown API] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to resolve drilldown records" }, { status: 500 })
  }
}
