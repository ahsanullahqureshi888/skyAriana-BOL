import { NextResponse } from "next/server"
import {
  getAllShipmentCosts,
  getShipmentCostsByBol,
} from "@/lib/services/finance-storage-service"
import { createOrUpdateShipmentCost } from "@/lib/services/finance-service"
import type { ShipmentCostRecord } from "@/lib/types/finance"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bol = searchParams.get("bol")
    const supplierId = searchParams.get("supplierId")
    const status = searchParams.get("status")
    const costType = searchParams.get("costType")

    let costs: ShipmentCostRecord[] = bol ? await getShipmentCostsByBol(bol) : await getAllShipmentCosts()

    if (supplierId) {
      costs = costs.filter((c: ShipmentCostRecord) => c.supplierId === supplierId)
    }
    if (status) {
      costs = costs.filter((c: ShipmentCostRecord) => c.approvalStatus === status)
    }
    if (costType) {
      costs = costs.filter((c: ShipmentCostRecord) => c.costType === costType)
    }

    return NextResponse.json({ success: true, count: costs.length, data: costs })
  } catch (error: any) {
    console.error("[api/finance/costs GET] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.bolNumber || !body.costCategory || (!body.amount && !body.rate)) {
      return NextResponse.json(
        { success: false, error: "BOL number, cost category, and amount/rate are required" },
        { status: 400 }
      )
    }

    const cost = await createOrUpdateShipmentCost(body)
    return NextResponse.json({ success: true, cost })
  } catch (error: any) {
    console.error("[api/finance/costs POST] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
