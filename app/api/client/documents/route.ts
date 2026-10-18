import { NextResponse } from "next/server"
import { requireClientSession } from "@/lib/auth/client-auth"
import { getAllShipments } from "@/lib/services/shipment-service"
import { getAccessByCompanyId } from "@/lib/data/client-access"
import { getAllShipmentDocuments } from "@/lib/services/shipment-document-storage"

export async function GET(req: Request) {
  try {
    const session = await requireClientSession()
    const url = new URL(req.url)
    const categoryFilter = (url.searchParams.get("category") || "").toLowerCase()
    const bolFilter = (url.searchParams.get("bol") || "").trim().toLowerCase()

    const companyId = (session.companyId || "").trim().toLowerCase()
    const companyName = (session.companyName || "").trim().toLowerCase()

    // 1. Authorized BOL numbers for this company
    const accessRules = getAccessByCompanyId(session.companyId)
    const ruleBolIds = new Set(accessRules.map(r => (r.bol_id || "").trim().toLowerCase()))

    const allShipments = await getAllShipments()
    const authorizedBolSet = new Set<string>()

    allShipments.forEach(s => {
      const sId = (s.id || "").trim().toLowerCase()
      const bNum = ((s as any).bolNumber || "").trim().toLowerCase()
      const refNum = (s.referenceNumber || "").trim().toLowerCase()

      const shipperId = (s.shipper?.id || "").trim().toLowerCase()
      const shipperName = (s.shipper?.name || "").trim().toLowerCase()
      const consigneeId = (s.consignee?.id || "").trim().toLowerCase()
      const consigneeName = (s.consignee?.name || "").trim().toLowerCase()

      const isAuth =
        ruleBolIds.has(sId) || (bNum && ruleBolIds.has(bNum)) || (refNum && ruleBolIds.has(refNum)) ||
        (companyId && shipperId === companyId) ||
        (companyName && shipperName && (shipperName === companyName || shipperName.includes(companyName))) ||
        (companyId && consigneeId === companyId) ||
        (companyName && consigneeName && (consigneeName === companyName || consigneeName.includes(companyName)))

      if (isAuth) {
        if (sId) authorizedBolSet.add(sId)
        if (bNum) authorizedBolSet.add(bNum)
        if (refNum) authorizedBolSet.add(refNum)
      }
    })

    // 2. Query documents
    const allDocs = await getAllShipmentDocuments()
    const clientDocs = allDocs
      .filter(doc => {
        const docBol = (doc.bolNumber || "").trim().toLowerCase()
        if (!authorizedBolSet.has(docBol)) return false

        // Only approved / released documents
        const isReleased = doc.clientVisible || doc.status === "ready" || doc.status === "approved" || doc.status === "issued"
        if (!isReleased) return false

        // Exclude internal docs
        const docType = (doc.documentType || "").toLowerCase()
        if (docType === "cost_sheet" || docType === "internal_quote" || docType.includes("supplier")) return false

        if (categoryFilter && docType !== categoryFilter) return false
        if (bolFilter && !docBol.includes(bolFilter)) return false

        return true
      })
      .map(doc => ({
        id: doc.id,
        bolNumber: doc.bolNumber,
        documentType: doc.documentType,
        documentNumber: doc.documentNumber,
        status: doc.status,
        issuedDate: doc.createdAt,
        title: formatDocTitle(doc.documentType),
        downloadUrl: `/api/client/documents/${doc.id}/download`,
      }))

    return NextResponse.json({ success: true, documents: clientDocs })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Client Documents API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

function formatDocTitle(type: string): string {
  switch (type.toLowerCase()) {
    case "bol": return "Bill of Lading (بارنامه رسمی)"
    case "commercial_invoice": return "Commercial Invoice (فاکتور تجاری)"
    case "packing_list": return "Packing List (لیست عدلبندی)"
    case "transit_paper": return "Transit Paper (مجوز ترانزیت)"
    case "phytosanitary": return "Phytosanitary Certificate (گواهی صحت نباتات)"
    case "stickers": return "Container / Cargo Stickers (برچسب کانتینر)"
    default: return type.replace(/_/g, " ").toUpperCase()
  }
}
