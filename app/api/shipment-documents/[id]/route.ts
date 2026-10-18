import { NextResponse } from "next/server"
import {
  getShipmentDocumentById,
  saveShipmentDocument,
} from "@/lib/services/shipment-document-storage"
import { computeMissingFields } from "@/lib/services/shipment-document-service"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const doc = await getShipmentDocumentById(id)
    if (!doc) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: doc })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const doc = await getShipmentDocumentById(id)
    if (!doc) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 })
    }

    // Merge updated payload
    const updatedPayload = {
      ...doc.documentData,
      ...(body.documentData || body),
    }

    const { missing, score, status } = computeMissingFields(doc.documentType, updatedPayload)

    doc.documentData = updatedPayload
    doc.missingFields = missing
    doc.completenessScore = score
    if (doc.status !== "issued" && doc.status !== "approved") {
      doc.status = status
    }
    doc.updatedAt = new Date().toISOString()

    const saved = await saveShipmentDocument(doc)
    return NextResponse.json({ success: true, data: saved })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
