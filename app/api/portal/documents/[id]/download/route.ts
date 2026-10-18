import { NextRequest, NextResponse } from "next/server"
import { requirePortalSession } from "@/lib/auth/portal-auth-guard"
import { getCustomerShipmentById } from "@/lib/services/customer-portal-service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requirePortalSession(request)
  if ("errorResponse" in auth) return auth.errorResponse

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const shipmentId = searchParams.get("shipmentId")

  if (!shipmentId) {
    return NextResponse.json(
      { success: false, error: "Shipment association required" },
      { status: 400 }
    )
  }

  // STRICT IDOR VERIFICATION: Verify customer owns the target shipment
  const shipment = await getCustomerShipmentById(auth.session, shipmentId)
  if (!shipment) {
    return NextResponse.json(
      { success: false, error: "Document access denied or shipment not found" },
      { status: 403 }
    )
  }

  // Permission checks
  if (id.startsWith("bol-") && !auth.session.permissions.downloadBolPdf) {
    return NextResponse.json(
      { success: false, error: "Access denied: You do not have permission to download BOL PDFs" },
      { status: 403 }
    )
  }

  if (!id.startsWith("bol-") && !auth.session.permissions.downloadDocuments) {
    return NextResponse.json(
      { success: false, error: "Access denied: You do not have permission to download documents" },
      { status: 403 }
    )
  }

  const filename = `${shipment.bolNumber || "shipment"}-${id}.pdf`
  const mockPdfContent = `%PDF-1.4\n% Sky Ariana Customer Portal Document: ${filename}\n% Customer: ${auth.session.customerName}\n% Verified: True\n%%EOF`

  return new NextResponse(mockPdfContent, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  })
}
