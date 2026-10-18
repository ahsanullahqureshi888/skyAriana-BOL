import { NextResponse } from "next/server"
import {
  getAccountingSettings,
  updateAccountingSettings,
} from "@/lib/services/accounting-settings-service"

export async function GET() {
  try {
    const settings = await getAccountingSettings()
    return NextResponse.json({ success: true, settings })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const updated = await updateAccountingSettings(body)
    return NextResponse.json({ success: true, settings: updated })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
