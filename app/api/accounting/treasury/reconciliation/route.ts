import { NextRequest, NextResponse } from "next/server"
import { executeReconciliation, getTreasuryReconciliations } from "@/lib/treasury/treasury-service"
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
    const accountId = searchParams.get("accountId") || undefined
    const reconciliations = await getTreasuryReconciliations(accountId)
    return NextResponse.json({ success: true, data: reconciliations, count: reconciliations.length })
  } catch (error: any) {
    console.error("[Treasury Reconciliation API] GET error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { user, role } = await resolveUser(request)
  if (role === "shipper" || role === "client" || role === "viewer") {
    return NextResponse.json({ success: false, error: "Forbidden: Unauthorized to perform reconciliation" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const actor = user?.email || role || "Auditor"

    const reconciliation = await executeReconciliation(body, actor)
    return NextResponse.json({
      success: true,
      data: reconciliation,
      message: `Reconciliation completed with status [${reconciliation.status}]. Difference: ${reconciliation.difference}.`,
    }, { status: 201 })
  } catch (error: any) {
    console.error("[Treasury Reconciliation API] POST error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
