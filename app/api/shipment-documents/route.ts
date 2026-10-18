import { NextResponse } from "next/server"
import {
  getAllShipmentDocuments,
  getShipmentDocumentsByBol,
} from "@/lib/services/shipment-document-storage"
import { getOrCreateShipmentDocumentPackage } from "@/lib/services/shipment-document-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bol = searchParams.get("bol")
    const type = searchParams.get("type")
    const status = searchParams.get("status")

    let docs = bol
      ? await getShipmentDocumentsByBol(bol)
      : await getAllShipmentDocuments()

    if (type && type !== "all") {
      docs = docs.filter((d) => d.documentType === type)
    }

    if (status && status !== "all") {
      docs = docs.filter((d) => d.status === status)
    }

    return NextResponse.json({ success: true, data: docs })
  } catch (error: any) {
    console.error("[shipment-documents API] GET Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.bol_number) {
      return NextResponse.json(
        { success: false, error: "bol_number is required to prepare document package" },
        { status: 400 }
      )
    }

    const pkg = await getOrCreateShipmentDocumentPackage(body)
    return NextResponse.json({ success: true, package: pkg })
  } catch (error: any) {
    console.error("[shipment-documents API] POST Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
