import { NextResponse } from "next/server"
import { voidBolPosting } from "@/lib/accounting/bol-accounting-service"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bolId: string }> }
) {
  try {
    const { bolId } = await params
    if (!bolId) {
      return NextResponse.json({ success: false, error: "bolId is required" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const reason = body.reason || "Posting cancelled / voided"
    const user = body.user || "Administrator"

    const result = await voidBolPosting(bolId, reason, user)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[api/accounting/bol/void POST] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
