import { NextResponse } from "next/server"
import {
  getAllShipmentsFinance,
  updateShipmentFinance,
  getOrComputeShipmentFinance,
} from "@/lib/services/finance-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bol = searchParams.get("bol")

    if (bol) {
      const record = await getOrComputeShipmentFinance(bol)
      return NextResponse.json({ success: true, data: [record] })
    }

    const records = await getAllShipmentsFinance()
    return NextResponse.json({ success: true, data: records })
  } catch (error: any) {
    console.error("[finance/shipments API] GET Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const bolNumber = body.bolNumber
    if (!bolNumber) {
      return NextResponse.json({ success: false, error: "bolNumber is required" }, { status: 400 })
    }

    const updated = await updateShipmentFinance(bolNumber, body)
    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error("[finance/shipments API] POST Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
