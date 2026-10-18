import { NextResponse } from "next/server"
import {
  getShipmentCostById,
  deleteShipmentCost,
} from "@/lib/services/finance-storage-service"
import {
  postCostToSupplierLedger,
  reverseShipmentCost,
  createOrUpdateShipmentCost,
} from "@/lib/services/finance-service"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cost = await getShipmentCostById(id)
    if (!cost) {
      return NextResponse.json({ success: false, error: "Cost not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, cost })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, reason } = body

    if (action === "post" || action === "approve") {
      const updated = await postCostToSupplierLedger(id)
      return NextResponse.json({ success: true, cost: updated })
    }

    if (action === "reverse") {
      const updated = await reverseShipmentCost(id, reason || "Manual reversal")
      return NextResponse.json({ success: true, cost: updated })
    }

    // Default update
    const updated = await createOrUpdateShipmentCost({ ...body, id })
    return NextResponse.json({ success: true, cost: updated })
  } catch (error: any) {
    console.error("[api/finance/costs/[id] PATCH] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cost = await getShipmentCostById(id)
    if (cost?.postedToLedger) {
      return NextResponse.json(
        { success: false, error: "Cannot delete a posted cost; please reverse it instead" },
        { status: 400 }
      )
    }
    const deleted = await deleteShipmentCost(id)
    return NextResponse.json({ success: deleted })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
