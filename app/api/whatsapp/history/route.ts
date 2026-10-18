import { NextRequest, NextResponse } from "next/server"
import { appendWhatsAppHistory, getWhatsAppHistory } from "@/lib/whatsapp/whatsapp-storage"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "100", 10)
    const history = await getWhatsAppHistory(limit)
    return NextResponse.json({ success: true, history })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to load history" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.bolNumber || !body.action) {
      return NextResponse.json({ success: false, error: "bolNumber and action are required" }, { status: 400 })
    }

    const entry = await appendWhatsAppHistory({
      bolNumber: body.bolNumber,
      templateId: body.templateId,
      language: body.language || "en",
      messageType: body.messageType || "customer_update",
      recipientType: body.recipientType,
      recipientPhone: body.recipientPhone,
      action: body.action,
      generatedBy: body.generatedBy || "Staff",
      isInternal: Boolean(body.isInternal),
      messageText: body.messageText,
    })

    return NextResponse.json({ success: true, entry })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to record history" }, { status: 500 })
  }
}
