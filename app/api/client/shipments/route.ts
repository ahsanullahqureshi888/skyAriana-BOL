import { NextResponse } from "next/server"
import { requireClientSession } from "@/lib/auth/client-auth"
import { getAllShipments } from "@/lib/services/shipment-service"
import { getAccessByCompanyId } from "@/lib/data/client-access"
import type { ShipmentMaster } from "@/lib/types/shipment"

export async function GET() {
  try {
    const session = await requireClientSession()
    const companyId = (session.companyId || "").trim().toLowerCase()
    const companyName = (session.companyName || "").trim().toLowerCase()

    // 1. Get explicit access rules
    const accessRules = getAccessByCompanyId(session.companyId)
    const ruleBolIds = new Set(accessRules.map(r => (r.bol_id || "").trim().toLowerCase()))

    const allShipments = await getAllShipments()

    // 2. Strict company isolation
    const clientShipments = allShipments.filter(s => {
      const sId = (s.id || "").trim().toLowerCase()
      const bNum = ((s as any).bolNumber || s.referenceNumber || "").trim().toLowerCase()
      const refNum = (s.referenceNumber || "").trim().toLowerCase()

      if (ruleBolIds.has(sId) || ruleBolIds.has(bNum) || ruleBolIds.has(refNum)) return true

      const shipperId = (s.shipper?.id || "").trim().toLowerCase()
      const shipperName = (s.shipper?.name || "").trim().toLowerCase()
      const consigneeId = (s.consignee?.id || "").trim().toLowerCase()
      const consigneeName = (s.consignee?.name || "").trim().toLowerCase()
      const notifyId = (s.notifyParty?.id || "").trim().toLowerCase()
      const notifyName = (s.notifyParty?.name || "").trim().toLowerCase()

      return (
        (companyId && shipperId === companyId) ||
        (companyName && shipperName && (shipperName === companyName || shipperName.includes(companyName) || companyName.includes(shipperName))) ||
        (companyId && consigneeId === companyId) ||
        (companyName && consigneeName && (consigneeName === companyName || consigneeName.includes(companyName) || companyName.includes(consigneeName))) ||
        (companyId && notifyId === companyId) ||
        (companyName && notifyName && (notifyName === companyName || notifyName.includes(companyName) || companyName.includes(notifyName)))
      )
    })

    // 3. Scrub data! Never expose internal notes, supplier costs, driver rent, or internal hold milestones
    const safeShipments = clientShipments.map(s => {
      const rawTimeline = (s as any).timeline || s.milestones || []
      const safeTimeline = (rawTimeline as any[])
        .filter((evt: any) => {
          if (evt.visibility === "INTERNAL" || evt.customerVisible === false) return false
          const desc = (evt.description || "").toLowerCase()
          const title = (evt.title || "").toLowerCase()
          return !desc.includes("driver rent") && !desc.includes("internal hold") && !title.includes("internal")
        })
        .map((evt: any) => ({
          id: evt.id,
          location: evt.location || "",
          title: evt.title || "",
          description: evt.description || "",
          status: evt.status || "",
          timestamp: evt.timestamp || evt.actualDate || "",
          completed: evt.completed ?? true,
        }))

      const containerList = s.container ? [{
        containerNumber: s.container.containerNumber,
        type: s.container.containerType,
        sealNumber: s.container.sealNumber,
        grossWeight: s.cargo?.grossWeightKg ?? 0,
        packages: s.cargo?.cartons ?? 0
      }] : ((s as any).containers || [])

      return {
        id: s.id,
        bolNumber: (s as any).bolNumber || s.referenceNumber,
        referenceNumber: s.referenceNumber,
        status: s.status,
        overallProgress: (s as any).overallProgress ?? (s.status === "delivered" ? 100 : 60),
        currentLocation: s.currentLocation || "In Transit",
        origin: s.transport?.origin || s.transport?.loadingPlace || "Afghanistan",
        destination: s.transport?.finalDestination || s.transport?.portOfDischarge || "India",
        eta: s.eta || "Pending Confirmation",
        createdAt: s.createdAt,
        updatedAt: s.updatedAt || new Date().toISOString(),
        commodity: s.cargo?.commodity || "General Merchandise",
        containers: containerList,
        shipper: { name: s.shipper?.name || "" },
        consignee: { name: s.consignee?.name || "" },
        timeline: safeTimeline,
      }
    })

    return NextResponse.json({ success: true, shipments: safeShipments })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Client Shipments API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
