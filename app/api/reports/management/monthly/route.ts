import { NextRequest, NextResponse } from "next/server"
import { getMonthlyComparisonReport, canViewFinancials } from "@/lib/reports/management-reporting-service"
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
  if (!canViewFinancials(role)) {
    return NextResponse.json({ success: false, error: "Forbidden: Unauthorized to view Financial reports" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const filters = {
      datePreset: (url.searchParams.get("datePreset") || "this_year") as any,
      currency: url.searchParams.get("currency") || "ALL",
    }

    const rows = await getMonthlyComparisonReport(filters, role)
    return NextResponse.json({ success: true, rows })
  } catch (error: any) {
    console.error("[Monthly Comparison API] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to generate Monthly report" }, { status: 500 })
  }
}
