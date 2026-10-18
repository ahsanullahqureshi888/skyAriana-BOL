import { NextResponse } from "next/server"
import { reopenAccountingPeriod } from "@/lib/accounting/period-closing/reopen-service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { period_id, reason, actor, role } = body

    if (!period_id) {
      return NextResponse.json({ success: false, error: "period_id is required" }, { status: 400 })
    }

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: "A specific business justification (minimum 10 characters) is required to reopen a closed financial period." },
        { status: 400 }
      )
    }

    const result = await reopenAccountingPeriod({
      period_id,
      reason,
      actor: actor || "Super Admin",
      role: role || "superadmin",
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[api/accounting/period/reopen POST] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
