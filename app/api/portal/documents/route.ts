import { NextRequest, NextResponse } from "next/server"
import { requirePortalSession } from "@/lib/auth/portal-auth-guard"
import { getCustomerDocuments } from "@/lib/services/customer-portal-service"

export async function GET(request: NextRequest) {
  const auth = requirePortalSession(request)
  if ("errorResponse" in auth) return auth.errorResponse

  if (!auth.session.permissions.viewDocuments && !auth.session.permissions.viewBol) {
    return NextResponse.json(
      { success: false, error: "Access denied: You do not have permission to view documents" },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const shipmentId = searchParams.get("shipmentId") || undefined

  try {
    const documents = await getCustomerDocuments(auth.session, shipmentId)
    return NextResponse.json({ success: true, documents })
  } catch (err: any) {
    console.error("[portal-documents] Error:", err)
    return NextResponse.json({ success: false, error: "Failed to load documents" }, { status: 500 })
  }
}
