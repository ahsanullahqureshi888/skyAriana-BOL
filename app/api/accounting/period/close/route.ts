import { NextResponse } from "next/server"
import { executeMonthClose } from "@/lib/accounting/period-closing/close-execution-service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { period_id, actor, notes, bypassWarnings } = body

    if (!period_id) {
      return NextResponse.json({ success: false, error: "period_id is required" }, { status: 400 })
    }

    const result = await executeMonthClose({
      period_id,
      actor: actor || "Chief Accountant",
      notes,
      bypassWarnings: Boolean(bypassWarnings),
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[api/accounting/period/close POST] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
