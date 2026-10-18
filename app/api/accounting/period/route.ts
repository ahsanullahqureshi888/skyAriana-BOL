import { NextResponse } from "next/server"
import {
  getPeriods,
  getActivePeriod,
  getPeriodSettings,
  ensureDefaultPeriods,
} from "@/lib/accounting/period-closing/period-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")

    const periods = await getPeriods()
    const activePeriod = await getActivePeriod()
    const settings = await getPeriodSettings()

    if (code) {
      const p = periods.find((item) => item.code === code)
      return NextResponse.json({ success: true, period: p || null })
    }

    return NextResponse.json({
      success: true,
      periods,
      activePeriod,
      settings,
    })
  } catch (error: any) {
    console.error("[api/accounting/period GET] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const periods = await ensureDefaultPeriods()
    const activePeriod = await getActivePeriod()
    return NextResponse.json({
      success: true,
      message: "Accounting periods initialized successfully",
      periods,
      activePeriod,
    })
  } catch (error: any) {
    console.error("[api/accounting/period POST] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
