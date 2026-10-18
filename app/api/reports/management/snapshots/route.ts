import { NextRequest, NextResponse } from "next/server"
import {
  finalizeManagementReportSnapshot,
  getManagementReportSnapshots,
} from "@/lib/reports/management-reporting-service"
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
  const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || "admin").toLowerCase()
  return { user, role }
}

export async function GET(request: NextRequest) {
  const { role } = await resolveUser(request)
  if (role === "client" || role === "shipper") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const periodCode = url.searchParams.get("periodCode") || undefined
    const snapshots = await getManagementReportSnapshots(periodCode)
    return NextResponse.json({ success: true, snapshots })
  } catch (error: any) {
    console.error("[Report Snapshots API] GET error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch snapshots" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { user, role } = await resolveUser(request)
  if (role !== "superadmin" && role !== "admin" && role !== "management") {
    return NextResponse.json({ success: false, error: "Forbidden: Unauthorized to finalize management snapshots" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { period_code, filters } = body
    if (!period_code) {
      return NextResponse.json({ success: false, error: "period_code is required" }, { status: 400 })
    }

    const actor = user?.email || role || "Super Admin"
    const snapshot = await finalizeManagementReportSnapshot(period_code, filters || { datePreset: "this_month" }, actor)

    return NextResponse.json({
      success: true,
      snapshot,
      message: `Management report snapshot for ${period_code} finalized successfully. Version: ${snapshot.snapshotVersion}. Hash: ${snapshot.dataHash}`,
    })
  } catch (error: any) {
    console.error("[Report Snapshots API] POST error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to finalize snapshot" }, { status: 500 })
  }
}
