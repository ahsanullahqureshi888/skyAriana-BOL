import { NextResponse } from "next/server"
import { getPeriodById, getActivePeriod } from "@/lib/accounting/period-closing/period-service"
import { runPeriodCloseChecklist } from "@/lib/accounting/period-closing/close-checklist-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get("periodId")

    const period = periodId ? await getPeriodById(periodId) : await getActivePeriod()
    if (!period) {
      return NextResponse.json({ success: false, error: "Target accounting period not found" }, { status: 404 })
    }

    const checklistResult = await runPeriodCloseChecklist(period)
    return NextResponse.json({ success: true, ...checklistResult })
  } catch (error: any) {
    console.error("[api/accounting/period/checklist GET] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
