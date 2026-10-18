import { NextResponse } from "next/server"
import { bulkCreateShipmentDocuments } from "@/lib/services/shipment-document-service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const bols = Array.isArray(body.bols) ? body.bols : []
    if (!bols.length) {
      return NextResponse.json(
        { success: false, error: "Array of bols is required" },
        { status: 400 }
      )
    }

    const report = await bulkCreateShipmentDocuments(bols)
    return NextResponse.json({ success: true, report })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
