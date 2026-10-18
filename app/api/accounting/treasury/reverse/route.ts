import { NextRequest, NextResponse } from "next/server"
import { reverseTreasuryTransaction } from "@/lib/treasury/treasury-service"
import { createClient } from "@/lib/supabase/server"

async function resolveUser(request: NextRequest) {
  let user: any = null
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = await createClient()
      const { data } = await supabase.auth.getUser()
      if (data?.user) user = data.user
    } catch (e) {}
  }
  const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || "").toLowerCase()
  return { user, role }
}

export async function POST(request: NextRequest) {
  const { user, role } = await resolveUser(request)
  if (role !== "superadmin" && role !== "admin" && role !== "accountant") {
    return NextResponse.json({ success: false, error: "Forbidden: Unauthorized to reverse treasury transactions" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { transaction_id, reason, reversal_date } = body

    if (!transaction_id || !reason) {
      return NextResponse.json({ success: false, error: "Transaction ID and Reason are mandatory for reversal." }, { status: 400 })
    }

    const actor = user?.email || role || "Auditor"
    const result = await reverseTreasuryTransaction(transaction_id, reason, {
      actor,
      role,
      reversalDate: reversal_date,
    })

    return NextResponse.json({
      success: true,
      ...result,
      message: `Transaction [${result.originalTransaction.reference_number || transaction_id}] reversed successfully. Reversal Reference: ${result.reversalTransaction.reference_number}.`,
    })
  } catch (error: any) {
    console.error("[Treasury Reverse API] POST error:", error)
    const isLocked = error.message?.includes("Financial Period Lock Enforced")
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to reverse transaction",
      period_locked: Boolean(isLocked),
    }, { status: isLocked ? 403 : 400 })
  }
}
