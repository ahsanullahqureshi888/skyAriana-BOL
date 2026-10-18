import { NextRequest, NextResponse } from "next/server"
import { requirePortalSession } from "@/lib/auth/portal-auth-guard"
import { getCustomerShipmentById } from "@/lib/services/customer-portal-service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requirePortalSession(request)
  if ("errorResponse" in auth) return auth.errorResponse

  if (!auth.session.permissions.viewShipments) {
    return NextResponse.json(
      { success: false, error: "Access denied: You do not have permission to view shipments" },
      { status: 403 }
    )
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ success: false, error: "Shipment ID required" }, { status: 400 })
  }

  try {
    // STRICT IDOR CHECK: If not owned by customer, returns null
    const shipment = await getCustomerShipmentById(auth.session, id)
    if (!shipment) {
      return NextResponse.json(
        { success: false, error: "Shipment not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, shipment })
  } catch (err: any) {
    console.error("[portal-shipment-detail] Error:", err)
    return NextResponse.json({ success: false, error: "Failed to load shipment details" }, { status: 500 })
  }
}
