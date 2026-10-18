import { NextResponse } from "next/server"
import { requireClientSession } from "@/lib/auth/client-auth"
import { getAllShipments } from "@/lib/services/shipment-service"
import { getAccessByCompanyId } from "@/lib/data/client-access"
import { getAllShipmentDocuments } from "@/lib/services/shipment-document-storage"

export async function GET() {
  try {
    const session = await requireClientSession()
    const companyId = (session.companyId || "").trim().toLowerCase()
    const companyName = (session.companyName || "").trim().toLowerCase()

    const accessRules = getAccessByCompanyId(session.companyId)
    const ruleBolIds = new Set(accessRules.map(r => (r.bol_id || "").trim().toLowerCase()))

    const allShipments = await getAllShipments()
    const clientShipments = allShipments.filter(s => {
      const sId = (s.id || "").trim().toLowerCase()
      const bNum = ((s as any).bolNumber || "").trim().toLowerCase()
      const refNum = (s.referenceNumber || "").trim().toLowerCase()

      if (ruleBolIds.has(sId) || (bNum && ruleBolIds.has(bNum)) || (refNum && ruleBolIds.has(refNum))) return true

      const shipperId = (s.shipper?.id || "").trim().toLowerCase()
      const shipperName = (s.shipper?.name || "").trim().toLowerCase()
      const consigneeId = (s.consignee?.id || "").trim().toLowerCase()
      const consigneeName = (s.consignee?.name || "").trim().toLowerCase()

      return (
        (companyId && shipperId === companyId) ||
        (companyName && shipperName && (shipperName === companyName || shipperName.includes(companyName) || companyName.includes(shipperName))) ||
        (companyId && consigneeId === companyId) ||
        (companyName && consigneeName && (consigneeName === companyName || consigneeName.includes(companyName) || companyName.includes(consigneeName)))
      )
    })

    const allDocs = await getAllShipmentDocuments()

    const clientBols = clientShipments.map(s => {
      const bolNum = ((s as any).bolNumber || s.referenceNumber || "").trim().toLowerCase()
      const docsCount = allDocs.filter(d => 
        (d.bolNumber || "").trim().toLowerCase() === bolNum &&
        (d.clientVisible || d.status === "approved" || d.status === "issued" || d.status === "ready")
      ).length

      return {
        id: s.id,
        bolNumber: (s as any).bolNumber || s.referenceNumber,
        date: s.createdAt,
        containerNumber: s.container?.containerNumber || ((s as any).containers?.[0]?.containerNumber) || "Assigned",
        commodity: s.cargo?.commodity || "General Cargo",
        origin: s.transport?.origin || "Afghanistan",
        destination: s.transport?.finalDestination || s.transport?.portOfDischarge || "India",
        status: s.status,
        eta: s.eta || "Pending",
        packages: s.cargo?.cartons || 0,
        grossWeight: s.cargo?.grossWeightKg || 0,
        documentsCount: docsCount,
      }
    })

    return NextResponse.json({ success: true, bols: clientBols })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Client BOLs API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
