import { NextResponse } from "next/server"
import { executeYearEndClose } from "@/lib/accounting/period-closing/year-end-service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { year, actor, notes } = body

    if (!year) {
      return NextResponse.json({ success: false, error: "Fiscal year is required (e.g. 2026)" }, { status: 400 })
    }

    const result = await executeYearEndClose({
      year: Number(year),
      actor: actor || "Chief Financial Officer",
      notes,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[api/accounting/period/year-end POST] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
