import { NextResponse } from "next/server"
import { createDocumentRevision } from "@/lib/services/shipment-document-service"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const reason = body.reason || "Source BOL data updated"
    const user = body.user || "Authorized User"
    const latestBolData = body.bolData

    const revised = await createDocumentRevision(id, reason, user, latestBolData)
    return NextResponse.json({ success: true, data: revised })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
