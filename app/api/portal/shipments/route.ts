import { NextRequest, NextResponse } from "next/server"
import { requirePortalSession } from "@/lib/auth/portal-auth-guard"
import { getCustomerShipments } from "@/lib/services/customer-portal-service"

export async function GET(request: NextRequest) {
  const auth = requirePortalSession(request)
  if ("errorResponse" in auth) return auth.errorResponse

  if (!auth.session.permissions.viewShipments) {
    return NextResponse.json(
      { success: false, error: "Access denied: You do not have permission to view shipments" },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") || searchParams.get("query") || undefined
  const status = searchParams.get("status") || undefined
  const origin = searchParams.get("origin") || undefined
  const destination = searchParams.get("destination") || undefined
  const startDate = searchParams.get("startDate") || undefined
  const endDate = searchParams.get("endDate") || undefined
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = parseInt(searchParams.get("limit") || "20", 10)

  try {
    const result = await getCustomerShipments(auth.session, {
      query,
      status,
      origin,
      destination,
      startDate,
      endDate,
      page,
      limit,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error("[portal-shipments] Error:", err)
    return NextResponse.json({ success: false, error: "Failed to load shipments" }, { status: 500 })
  }
}
