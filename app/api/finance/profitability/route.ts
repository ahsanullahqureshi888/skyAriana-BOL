import { NextResponse } from "next/server"
import {
  calculateBolFinancialSummary,
  getAllBolsProfitability,
  getProfitByCustomerReport,
  getLossMakingShipments,
  getMonthlyProfitReport,
} from "@/lib/services/finance-service"
import { getAllRouteCostTemplates } from "@/lib/services/finance-storage-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get("view") || "overview"
    const bol = searchParams.get("bol")
    const currency = (searchParams.get("currency") || "USD").toUpperCase()

    if (bol) {
      const summary = await calculateBolFinancialSummary(bol, currency)
      return NextResponse.json({ success: true, summary })
    }

    if (view === "bols") {
      const data = await getAllBolsProfitability(currency)
      return NextResponse.json({ success: true, count: data.length, data })
    }

    if (view === "customers") {
      const data = await getProfitByCustomerReport(currency)
      return NextResponse.json({ success: true, count: data.length, data })
    }

    if (view === "loss-makers") {
      const data = await getLossMakingShipments(currency)
      return NextResponse.json({ success: true, count: data.length, data })
    }

    if (view === "monthly") {
      const data = await getMonthlyProfitReport(currency)
      return NextResponse.json({ success: true, count: data.length, data })
    }

    if (view === "templates") {
      const data = await getAllRouteCostTemplates()
      return NextResponse.json({ success: true, count: data.length, data })
    }

    // Default: return customer profitability + monthly summary + loss makers
    const [customers, monthly, lossMakers, templates] = await Promise.all([
      getProfitByCustomerReport(currency),
      getMonthlyProfitReport(currency),
      getLossMakingShipments(currency),
      getAllRouteCostTemplates(),
    ])

    return NextResponse.json({
      success: true,
      customers,
      monthly,
      lossMakers,
      templates,
    })
  } catch (error: any) {
    console.error("[api/finance/profitability GET] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
