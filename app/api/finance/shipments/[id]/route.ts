import { NextResponse } from "next/server"
import {
  getOrComputeShipmentFinance,
  updateShipmentFinance,
} from "@/lib/services/finance-service"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const record = await getOrComputeShipmentFinance(id)
    return NextResponse.json({ success: true, data: record })
  } catch (error: any) {
    console.error("[finance/shipments API] GET Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const updated = await updateShipmentFinance(id, body)
    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error("[finance/shipments API] POST Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
