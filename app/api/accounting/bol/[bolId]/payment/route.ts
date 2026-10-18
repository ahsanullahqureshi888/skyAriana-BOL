import { NextResponse } from "next/server"
import { recordBolPayment } from "@/lib/accounting/bol-accounting-service"

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
    const {
      amount,
      date,
      currency,
      paymentMethod,
      reference,
      bankReference,
      notes,
      user,
    } = body

    const payAmount = Number(amount)
    if (isNaN(payAmount) || payAmount <= 0) {
      return NextResponse.json({ success: false, error: "Valid positive payment amount is required" }, { status: 400 })
    }

    const result = await recordBolPayment({
      bolId,
      amount: payAmount,
      date: date || new Date().toISOString().split("T")[0],
      currency: currency || "USD",
      paymentMethod: paymentMethod || "Cash",
      reference,
      bankReference,
      notes,
      user: user || "Administrator",
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[api/accounting/bol/payment POST] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
