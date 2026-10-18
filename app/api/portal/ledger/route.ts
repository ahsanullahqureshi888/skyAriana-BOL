import { NextRequest, NextResponse } from "next/server"
import { requirePortalSession } from "@/lib/auth/portal-auth-guard"
import { getCustomerLedger } from "@/lib/services/customer-portal-service"

export async function GET(request: NextRequest) {
  const auth = requirePortalSession(request)
  if ("errorResponse" in auth) return auth.errorResponse

  if (!auth.session.permissions.viewAccountLedger) {
    return NextResponse.json(
      { success: false, error: "Access denied: You do not have permission to view account ledgers" },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const dateFilter = (searchParams.get("filter") || "all") as "month" | "year" | "all"

  try {
    const ledger = await getCustomerLedger(auth.session, dateFilter)
    return NextResponse.json({ success: true, ledger })
  } catch (err: any) {
    console.error("[portal-ledger] Error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load customer ledger" },
      { status: 500 }
    )
  }
}
