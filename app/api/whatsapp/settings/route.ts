import { NextRequest, NextResponse } from "next/server"
import { getWhatsAppSettings, saveWhatsAppSettings } from "@/lib/whatsapp/whatsapp-storage"

export async function GET() {
  try {
    const settings = await getWhatsAppSettings()
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to read WhatsApp settings" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const updated = await saveWhatsAppSettings(body)
    return NextResponse.json({ success: true, settings: updated })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to save WhatsApp settings" }, { status: 500 })
  }
}
