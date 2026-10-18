import { NextRequest, NextResponse } from "next/server"
import { executeCurrencyExchange, getCurrencyExchanges } from "@/lib/treasury/treasury-service"
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

export async function GET(request: NextRequest) {
  const { role } = await resolveUser(request)
  if (role === "shipper" || role === "client") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const exchanges = await getCurrencyExchanges()
    return NextResponse.json({ success: true, data: exchanges, count: exchanges.length })
  } catch (error: any) {
    console.error("[Treasury Exchange API] GET error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { user, role } = await resolveUser(request)
  if (role === "shipper" || role === "client" || role === "viewer") {
    return NextResponse.json({ success: false, error: "Forbidden: Unauthorized to execute currency exchanges" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const actor = user?.email || role || "Treasurer"

    const result = await executeCurrencyExchange(body, { actor, role })
    return NextResponse.json({
      success: true,
      ...result,
      message: `Currency exchange [${result.exchange.exchange_number}] executed successfully.`,
    }, { status: 201 })
  } catch (error: any) {
    console.error("[Treasury Exchange API] POST error:", error)
    const isLocked = error.message?.includes("Financial Period Lock Enforced")
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to execute currency exchange",
      period_locked: Boolean(isLocked),
    }, { status: isLocked ? 403 : 400 })
  }
}
