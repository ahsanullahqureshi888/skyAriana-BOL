import { NextRequest, NextResponse } from "next/server"
import { getExecutiveOverviewData } from "@/lib/reports/management-reporting-service"
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
    return NextResponse.json({ success: false, error: "Forbidden: Client portal users cannot access internal management reports" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const filters = {
      datePreset: (url.searchParams.get("datePreset") || "this_month") as any,
      startDate: url.searchParams.get("startDate") || undefined,
      endDate: url.searchParams.get("endDate") || undefined,
      periodCode: url.searchParams.get("periodCode") || undefined,
      branch: url.searchParams.get("branch") || undefined,
      currency: url.searchParams.get("currency") || "ALL",
    }

    const data = await getExecutiveOverviewData(filters, role)
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[Management Overview API] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to load executive overview" }, { status: 500 })
  }
}
