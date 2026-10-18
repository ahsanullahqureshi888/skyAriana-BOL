import { NextRequest, NextResponse } from "next/server"
import {
  getExecutiveBiData,
  getExecutiveDrilldown,
  invalidateAnalyticsCache,
} from "@/lib/analytics/executive-bi-service"
import { ExecutiveBiFilters, AnalyticsPeriodPreset, AnalyticsComparisonMode } from "@/lib/types/executive-bi"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userRole = request.headers.get("x-user-role") || searchParams.get("role") || "admin"

    const period = (searchParams.get("period") || "this_month") as AnalyticsPeriodPreset
    const comparison = (searchParams.get("comparison") || "prev_month") as AnalyticsComparisonMode
    const startDate = searchParams.get("startDate") || undefined
    const endDate = searchParams.get("endDate") || undefined
    const customer = searchParams.get("customer") || undefined
    const route = searchParams.get("route") || undefined
    const mode = (searchParams.get("mode") || "all") as any
    const commodity = searchParams.get("commodity") || undefined
    const containerType = searchParams.get("containerType") || undefined
    const supplier = searchParams.get("supplier") || undefined
    const currencyMode = (searchParams.get("currencyMode") || "segregated") as any
    const drilldownKpi = searchParams.get("drilldownKpi")

    const filters: ExecutiveBiFilters = {
      period,
      comparison,
      startDate,
      endDate,
      customer,
      route,
      mode,
      commodity,
      containerType,
      supplier,
      currencyMode,
    }

    // If client requested specific KPI drill-down records
    if (drilldownKpi) {
      const records = await getExecutiveDrilldown(drilldownKpi, filters)
      return NextResponse.json({
        success: true,
        drilldownKpi,
        totalRecords: records.length,
        records,
      })
    }

    const payload = await getExecutiveBiData(filters, userRole)
    return NextResponse.json({
      success: true,
      data: payload,
    })
  } catch (error: any) {
    console.error("[Executive BI API] Error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate executive analytics" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const userRole = request.headers.get("x-user-role") || body.role || "admin"

    // Invalidate in-memory cache
    invalidateAnalyticsCache()

    const filters: ExecutiveBiFilters = {
      period: body.period || "this_month",
      comparison: body.comparison || "prev_month",
      startDate: body.startDate,
      endDate: body.endDate,
      customer: body.customer,
      route: body.route,
      mode: body.mode || "all",
      commodity: body.commodity,
      containerType: body.containerType,
      supplier: body.supplier,
      currencyMode: body.currencyMode || "segregated",
    }

    const startPerf = Date.now()
    const payload = await getExecutiveBiData(filters, userRole)
    const durationMs = Date.now() - startPerf

    return NextResponse.json({
      success: true,
      durationMs,
      message: "Derived executive analytics recalculated from canonical stores.",
      data: payload,
    })
  } catch (error: any) {
    console.error("[Executive BI API POST] Error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to recompute executive analytics" },
      { status: 500 }
    )
  }
}
