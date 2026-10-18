import { NextResponse } from "next/server"
import { requireClientSession } from "@/lib/auth/client-auth"
import { getShipmentDocumentById } from "@/lib/services/shipment-document-storage"
import { getAllShipments } from "@/lib/services/shipment-service"
import { getAccessByCompanyId } from "@/lib/data/client-access"

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const docId = params.id
    const session = await requireClientSession()

    const doc = await getShipmentDocumentById(docId)
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // 1. Verify company ownership of BOL
    const companyId = (session.companyId || "").trim().toLowerCase()
    const companyName = (session.companyName || "").trim().toLowerCase()
    const docBol = (doc.bolNumber || "").trim().toLowerCase()

    const accessRules = getAccessByCompanyId(session.companyId)
    const matchingRule = accessRules.find(r => (r.bol_id || "").trim().toLowerCase() === docBol)

    const allShipments = await getAllShipments()
    const shipment = allShipments.find(s => 
      ((s as any).bolNumber || "").trim().toLowerCase() === docBol ||
      (s.id || "").trim().toLowerCase() === docBol ||
      (s.referenceNumber || "").trim().toLowerCase() === docBol
    )

    const isShipper = shipment && ((companyId && shipment.shipper?.id?.toLowerCase() === companyId) || (companyName && shipment.shipper?.name?.toLowerCase().includes(companyName)))
    const isConsignee = shipment && ((companyId && shipment.consignee?.id?.toLowerCase() === companyId) || (companyName && shipment.consignee?.name?.toLowerCase().includes(companyName)))

    const isAuthorized = (matchingRule && matchingRule.can_view_documents !== false) || isShipper || isConsignee

    if (!isAuthorized) {
      return NextResponse.json({ error: "Access denied to this document" }, { status: 403 })
    }

    // 2. Verify document is approved / released
    const isReleased = doc.clientVisible || doc.status === "ready" || doc.status === "approved" || doc.status === "issued"
    if (!isReleased) {
      return NextResponse.json({ error: "Document is pending internal release" }, { status: 403 })
    }

    // Return document package data
    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        bolNumber: doc.bolNumber,
        documentType: doc.documentType,
        documentNumber: doc.documentNumber,
        status: doc.status,
        issuedDate: doc.createdAt,
        payload: doc.documentData,
      }
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Client Document Download Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
