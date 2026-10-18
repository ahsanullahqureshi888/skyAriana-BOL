import { NextRequest, NextResponse } from "next/server"
import { recordCustomerReceipt, getTreasuryTransactions } from "@/lib/treasury/treasury-service"
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
  const shipperIdentity = user?.user_metadata?.shipper_name || user?.email || request.headers.get("x-shipper-name")
  return { user, role, shipperIdentity }
}

export async function GET(request: NextRequest) {
  const { role, shipperIdentity } = await resolveUser(request)

  try {
    const transactions = await getTreasuryTransactions()
    let receipts = transactions.filter((t) => t.transaction_type === "CUSTOMER_RECEIPT")

    // Client Portal Security: Clients can only see receipts issued to their account
    if (role === "shipper" || role === "client") {
      const sFilter = (shipperIdentity || "").trim().toLowerCase()
      receipts = receipts.filter((r) => {
        const party = (r.party_name || "").toLowerCase()
        return party === sFilter || party.includes(sFilter)
      })
    }

    return NextResponse.json({
      success: true,
      data: receipts,
      count: receipts.length,
    })
  } catch (error: any) {
    console.error("[Treasury Receipts API] GET error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { user, role } = await resolveUser(request)
  if (role === "shipper" || role === "client" || role === "viewer") {
    return NextResponse.json({ success: false, error: "Forbidden: Unauthorized to record customer receipts" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const actor = user?.email || role || "Cashier"

    const result = await recordCustomerReceipt(body, { actor, role })
    return NextResponse.json({
      success: true,
      ...result,
      message: `Customer receipt [${result.receiptNumber}] posted successfully.`,
    }, { status: 201 })
  } catch (error: any) {
    console.error("[Treasury Receipts API] POST error:", error)
    const isLocked = error.message?.includes("Financial Period Lock Enforced")
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to record customer receipt",
      period_locked: Boolean(isLocked),
    }, { status: isLocked ? 403 : 400 })
  }
}
