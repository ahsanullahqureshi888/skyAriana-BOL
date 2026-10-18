import { NextResponse } from "next/server"
import { requireClientSession } from "@/lib/auth/client-auth"
import { getAllShipments } from "@/lib/services/shipment-service"
import { getAccessByCompanyId } from "@/lib/data/client-access"

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

    const containersList: Array<{
      id: string
      containerNumber: string
      type: string
      sealNumber: string
      bolNumber: string
      shipmentId: string
      commodity: string
      currentLocation: string
      status: string
      vesselName: string
      eta: string
      lastUpdated: string
    }> = []

    clientShipments.forEach(s => {
      const cList = s.container ? [s.container] : ((s as any).containers || [])
      cList.forEach((c: any) => {
        if (c.containerNumber) {
          containersList.push({
            id: `${s.id}-${c.containerNumber}`,
            containerNumber: c.containerNumber,
            type: c.containerType || "40HC",
            sealNumber: c.sealNumber || "Pending",
            bolNumber: (s as any).bolNumber || s.referenceNumber,
            shipmentId: s.id,
            commodity: s.cargo?.commodity || "Commercial Goods",
            currentLocation: s.currentLocation || "In Transit",
            status: s.status,
            vesselName: (s.vessel as any)?.vesselName || (s as any).vesselName || "Connecting Line",
            eta: s.eta || "Pending",
            lastUpdated: s.updatedAt || new Date().toISOString(),
          })
        }
      })
    })

    return NextResponse.json({ success: true, containers: containersList })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Client Containers API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
