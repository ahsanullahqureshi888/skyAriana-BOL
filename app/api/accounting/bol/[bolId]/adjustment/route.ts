import { NextResponse } from "next/server"
import { createBolAdjustment } from "@/lib/accounting/bol-accounting-service"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bolId: string }> }
) {
  try {
    const { bolId } = await params
    if (!bolId) {
      return NextResponse.json({ success: false, error: "bolId is required" }, { status: 400 })
    }

    const body = await request.json()
    const { newTotal, reason, user } = body

    if (newTotal == null || isNaN(Number(newTotal))) {
      return NextResponse.json({ success: false, error: "Valid newTotal is required" }, { status: 400 })
    }

    const result = await createBolAdjustment({
      bolId,
      newTotal: Number(newTotal),
      reason: reason || "Charge adjustment after posting",
      user: user || "Administrator",
    })

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[api/accounting/bol/adjustment POST] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
