import { NextRequest, NextResponse } from "next/server"
import { getTreasuryAccounts, createTreasuryAccount, updateTreasuryAccount } from "@/lib/treasury/treasury-service"
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
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const currency = searchParams.get("currency")

    let accounts = await getTreasuryAccounts()
    if (type) {
      accounts = accounts.filter((a) => a.account_type.toLowerCase() === type.toLowerCase())
    }
    if (currency) {
      accounts = accounts.filter((a) => a.currency.toUpperCase() === currency.toUpperCase())
    }

    return NextResponse.json({ success: true, data: accounts })
  } catch (error: any) {
    console.error("[Treasury Accounts API] GET error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { user, role } = await resolveUser(request)
  if (role === "shipper" || role === "client" || role === "viewer") {
    return NextResponse.json({ success: false, error: "Forbidden: Unauthorized to create treasury accounts" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const actor = user?.email || role || "Administrator"

    if (body.id && body.action === "update") {
      const updated = await updateTreasuryAccount(body.id, body, actor)
      return NextResponse.json({ success: true, data: updated, message: "Treasury account updated successfully" })
    }

    const created = await createTreasuryAccount(body, actor)
    return NextResponse.json({ success: true, data: created, message: "Treasury account created successfully" }, { status: 201 })
  } catch (error: any) {
    console.error("[Treasury Accounts API] POST error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
