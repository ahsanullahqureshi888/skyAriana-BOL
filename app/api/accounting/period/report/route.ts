import { NextResponse } from "next/server"
import {
  getMonthlyClosingStatementData,
  generateWhatsAppMonthlySummary,
  exportBalancesToCsv,
} from "@/lib/accounting/period-closing/period-report-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get("periodId")
    const format = searchParams.get("format") // "json" | "whatsapp" | "csv"

    if (!periodId) {
      return NextResponse.json({ success: false, error: "periodId is required" }, { status: 400 })
    }

    if (format === "whatsapp") {
      const whatsappText = await generateWhatsAppMonthlySummary(periodId)
      return NextResponse.json({ success: true, text: whatsappText })
    }

    const data = await getMonthlyClosingStatementData(periodId)

    if (format === "csv") {
      const csv = exportBalancesToCsv(data.balances)
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="SkyAriana-Period-${data.period.code}-Balances.csv"`,
        },
      })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[api/accounting/period/report GET] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
