import { NextRequest, NextResponse } from "next/server"
import { getPayablesAgingReport, canViewFinancials } from "@/lib/reports/management-reporting-service"
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
    return NextResponse.json({ success: false, error: "Forbidden: Unauthorized to view Payables reports" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const filters = {
      datePreset: (url.searchParams.get("datePreset") || "this_month") as any,
      startDate: url.searchParams.get("startDate") || undefined,
      endDate: url.searchParams.get("endDate") || undefined,
      periodCode: url.searchParams.get("periodCode") || undefined,
      currency: url.searchParams.get("currency") || "ALL",
      supplier: url.searchParams.get("supplier") || undefined,
    }

    const report = await getPayablesAgingReport(filters, role)
    return NextResponse.json({ success: true, report })
  } catch (error: any) {
    console.error("[Payables API] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to generate Payables report" }, { status: 500 })
  }
}
