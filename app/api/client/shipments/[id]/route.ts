import { NextResponse } from "next/server"
import { requireClientSession } from "@/lib/auth/client-auth"
import { getAllShipments } from "@/lib/services/shipment-service"
import { getAccessByCompanyId } from "@/lib/data/client-access"
import { getShipmentDocumentsByBol } from "@/lib/services/shipment-document-storage"

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const targetId = decodeURIComponent(params.id || "").trim().toLowerCase()
    const session = await requireClientSession()
    const companyId = (session.companyId || "").trim().toLowerCase()
    const companyName = (session.companyName || "").trim().toLowerCase()

    const accessRules = getAccessByCompanyId(session.companyId)
    const ruleBolIds = new Set(accessRules.map(r => (r.bol_id || "").trim().toLowerCase()))

    const allShipments = await getAllShipments()
    const shipment = allShipments.find(s => {
      const sId = (s.id || "").trim().toLowerCase()
      const bNum = ((s as any).bolNumber || s.referenceNumber || "").trim().toLowerCase()
      const refNum = (s.referenceNumber || "").trim().toLowerCase()
      return sId === targetId || bNum === targetId || refNum === targetId
    })

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
    }

    // Verify company authorization
    const sId = (shipment.id || "").trim().toLowerCase()
    const bNum = ((shipment as any).bolNumber || shipment.referenceNumber || "").trim().toLowerCase()
    const refNum = (shipment.referenceNumber || "").trim().toLowerCase()

    const hasRule = ruleBolIds.has(sId) || ruleBolIds.has(bNum) || ruleBolIds.has(refNum)
    const shipperId = (shipment.shipper?.id || "").trim().toLowerCase()
    const shipperName = (shipment.shipper?.name || "").trim().toLowerCase()
    const consigneeId = (shipment.consignee?.id || "").trim().toLowerCase()
    const consigneeName = (shipment.consignee?.name || "").trim().toLowerCase()
    const notifyId = (shipment.notifyParty?.id || "").trim().toLowerCase()
    const notifyName = (shipment.notifyParty?.name || "").trim().toLowerCase()

    const isAuthorized =
      hasRule ||
      (companyId && shipperId === companyId) ||
      (companyName && shipperName && (shipperName === companyName || shipperName.includes(companyName) || companyName.includes(shipperName))) ||
      (companyId && consigneeId === companyId) ||
      (companyName && consigneeName && (consigneeName === companyName || consigneeName.includes(companyName) || companyName.includes(consigneeName))) ||
      (companyId && notifyId === companyId) ||
      (companyName && notifyName && (notifyName === companyName || notifyName.includes(companyName) || companyName.includes(notifyName)))

    if (!isAuthorized) {
      return NextResponse.json({ error: "Access denied to this shipment" }, { status: 403 })
    }

    // Filter milestones
    const rawTimeline = (shipment as any).timeline || shipment.milestones || []
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

    // Get released documents for this BOL
    const bolNum = (shipment as any).bolNumber || shipment.referenceNumber || ""
    const allDocs = await getShipmentDocumentsByBol(bolNum)
    const clientDocs = allDocs
      .filter(d => d.clientVisible || d.status === "ready" || d.status === "approved" || d.status === "issued")
      .map(d => ({
        id: d.id,
        documentType: d.documentType,
        documentNumber: d.documentNumber,
        title: d.documentType.replace(/_/g, " ").toUpperCase(),
        status: d.status,
        issuedDate: d.createdAt,
      }))

    const containerList = shipment.container ? [{
      containerNumber: shipment.container.containerNumber,
      type: shipment.container.containerType,
      sealNumber: shipment.container.sealNumber,
      grossWeight: shipment.cargo?.grossWeightKg ?? 0,
      packages: shipment.cargo?.cartons ?? 0
    }] : ((shipment as any).containers || [])

    const safeDetail = {
      id: shipment.id,
      bolNumber: (shipment as any).bolNumber || shipment.referenceNumber,
      referenceNumber: shipment.referenceNumber,
      status: shipment.status,
      currentLocation: shipment.currentLocation || "In Transit",
      overallProgress: (shipment as any).overallProgress ?? (shipment.status === "delivered" ? 100 : 60),
      eta: shipment.eta || "Pending Confirmation",
      commodity: shipment.cargo?.commodity || "General Merchandise",
      packages: shipment.cargo?.cartons ?? 0,
      grossWeight: shipment.cargo?.grossWeightKg ?? 0,
      netWeight: shipment.cargo?.netWeightKg ?? 0,
      shipper: { name: shipment.shipper?.name || "", address: shipment.shipper?.address || "" },
      consignee: { name: shipment.consignee?.name || "", address: shipment.consignee?.address || "" },
      notifyParty: { name: shipment.notifyParty?.name || "", address: shipment.notifyParty?.address || "" },
      route: {
        origin: shipment.transport?.origin || shipment.transport?.loadingPlace || "Afghanistan",
        destination: shipment.transport?.finalDestination || shipment.transport?.portOfDischarge || "India",
        portOfLoading: shipment.transport?.portOfLoading || "Bandar Abbas",
        portOfDischarge: shipment.transport?.portOfDischarge || "Nhava Sheva",
      },
      vessel: {
        name: (shipment.vessel as any)?.vesselName || (shipment as any).vesselName || "Connecting Vessel",
        voyage: (shipment.vessel as any)?.voyageNumber || (shipment as any).voyageNumber || "V.101",
        shippingLine: (shipment.vessel as any)?.shippingLine || "Container Line",
      },
      containers: containerList,
      timeline: safeTimeline,
      documents: clientDocs,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt || new Date().toISOString(),
    }

    return NextResponse.json({ success: true, shipment: safeDetail })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Client Shipment Detail API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
