import { NextRequest, NextResponse } from "next/server"
import { getTreasuryDashboardData } from "@/lib/treasury/treasury-service"
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
  // Client Security Isolation: shippers/clients must never see company treasury balances
  if (role === "shipper" || role === "client") {
    return NextResponse.json({ success: false, error: "Forbidden: Unauthorized access to Treasury" }, { status: 403 })
  }

  try {
    const data = await getTreasuryDashboardData()
    return NextResponse.json({ success: true, ...data })
  } catch (error: any) {
    console.error("[Treasury API] GET Dashboard error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to load treasury data" }, { status: 500 })
  }
}
