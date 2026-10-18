import { NextResponse } from "next/server"
import { finalizeDocument } from "@/lib/services/shipment-document-service"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const user = body.user || "Authorized User"

    const finalized = await finalizeDocument(id, user)
    return NextResponse.json({ success: true, data: finalized })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
