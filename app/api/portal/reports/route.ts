import { NextRequest, NextResponse } from "next/server"
import { requirePortalSession } from "@/lib/auth/portal-auth-guard"
import { getCustomerReports } from "@/lib/services/customer-portal-service"

export async function GET(request: NextRequest) {
  const auth = requirePortalSession(request)
  if ("errorResponse" in auth) return auth.errorResponse

  if (!auth.session.permissions.viewReports) {
    return NextResponse.json(
      { success: false, error: "Access denied: You do not have permission to view reports" },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const reportType = (searchParams.get("type") || "monthly") as "monthly" | "containers" | "tracking"

  try {
    const reportData = await getCustomerReports(auth.session, reportType)
    return NextResponse.json({ success: true, report: reportData })
  } catch (err: any) {
    console.error("[portal-reports] Error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate report" },
      { status: 500 }
    )
  }
}
