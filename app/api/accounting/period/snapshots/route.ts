import { NextResponse } from "next/server"
import { getPeriodSnapshots } from "@/lib/accounting/period-closing/period-service"
import { comparePeriodSnapshots } from "@/lib/accounting/period-closing/reopen-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get("periodId")
    const diff = searchParams.get("diff") === "true"
    const v1 = searchParams.get("v1") ? parseInt(searchParams.get("v1")!, 10) : undefined
    const v2 = searchParams.get("v2") ? parseInt(searchParams.get("v2")!, 10) : undefined

    if (diff && periodId) {
      const diffResult = await comparePeriodSnapshots(periodId, v1, v2)
      return NextResponse.json({ success: true, diff: diffResult })
    }

    const snapshots = await getPeriodSnapshots(periodId || undefined)
    return NextResponse.json({ success: true, count: snapshots.length, snapshots })
  } catch (error: any) {
    console.error("[api/accounting/period/snapshots GET] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
