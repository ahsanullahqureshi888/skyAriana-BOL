import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { getExecutiveBiData } from "@/lib/analytics/executive-bi-service"
import { ExecutiveBiFilters, AnalyticsPeriodPreset, AnalyticsComparisonMode } from "@/lib/types/executive-bi"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const format = (searchParams.get("format") || "excel").toLowerCase()
    const userRole = request.headers.get("x-user-role") || searchParams.get("role") || "admin"

    const period = (searchParams.get("period") || "this_month") as AnalyticsPeriodPreset
    const comparison = (searchParams.get("comparison") || "prev_month") as AnalyticsComparisonMode
    const startDate = searchParams.get("startDate") || undefined
    const endDate = searchParams.get("endDate") || undefined
    const customer = searchParams.get("customer") || undefined
    const route = searchParams.get("route") || undefined
    const mode = (searchParams.get("mode") || "all") as any
    const currencyMode = (searchParams.get("currencyMode") || "segregated") as any

    const filters: ExecutiveBiFilters = {
      period,
      comparison,
      startDate,
      endDate,
      customer,
      route,
      mode,
      currencyMode,
    }

    const payload = await getExecutiveBiData(filters, userRole)

    if (format === "csv") {
      // Generate CSV of corridor performance
      const headers = ["Corridor", "Origin", "Destination", "Border", "Mode", "Shipments", "Packages", "Gross Weight (kg)", "Avg Transit Days"]
      const rows = payload.corridorPerformance.map((c) => [
        `"${c.corridorKey}"`,
        `"${c.origin}"`,
        `"${c.destination}"`,
        `"${c.borderStation || ""}"`,
        `"${c.mode}"`,
        c.shipmentCount,
        c.totalPackages,
        c.totalGrossWeightKg,
        c.avgTransitDays,
      ])
      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="SkyAriana_Corridor_Performance_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      })
    }

    // Default: Multi-sheet Excel workbook
    const wb = XLSX.utils.book_new()

    // Sheet 1: Executive KPI Scorecard
    const kpiRows = [
      ["Metric Code", "KPI Name (EN)", "KPI Name (FA)", "Value", "Trend %", "Status", "Formula / Basis"],
      ...Object.values(payload.kpis).map((k) => [
        k.id,
        k.title,
        k.titleFa,
        String(k.value),
        k.changeText || "N/A",
        k.status.toUpperCase(),
        k.formula,
      ]),
    ]
    const wsKpis = XLSX.utils.aoa_to_sheet(kpiRows)
    XLSX.utils.book_append_sheet(wb, wsKpis, "KPI Scorecard")

    // Sheet 2: Transit Corridor Performance
    const corridorRows = [
      ["Corridor Route", "Origin", "Destination", "Border Station", "Mode", "Shipments", "Cartons", "Weight (kg)", "Avg Days", "Border Holds"],
      ...payload.corridorPerformance.map((c) => [
        c.corridorKey,
        c.origin,
        c.destination,
        c.borderStation || "N/A",
        c.mode.toUpperCase(),
        c.shipmentCount,
        c.totalPackages,
        c.totalGrossWeightKg,
        c.avgTransitDays,
        c.activeHoldCount,
      ]),
    ]
    const wsCorridors = XLSX.utils.aoa_to_sheet(corridorRows)
    XLSX.utils.book_append_sheet(wb, wsCorridors, "Corridors")

    // Sheet 3: Customer Performance
    const customerRows = [
      ["Customer ID", "Company Name", "Volume (BOLs)", "Packages", "Weight (kg)", "Active Shipments", "Volume Share %"],
      ...payload.customerPerformance.map((c) => [
        c.customerId,
        c.customerName,
        c.shipmentCount,
        c.packageCount,
        c.grossWeightKg,
        c.activeShipments,
        `${c.shareOfVolumePct}%`,
      ]),
    ]
    const wsCustomers = XLSX.utils.aoa_to_sheet(customerRows)
    XLSX.utils.book_append_sheet(wb, wsCustomers, "Customers")

    // Sheet 4: Operational Attention Items
    const attentionRows = [
      ["Severity", "Category", "Title", "Reference", "Type", "Days Elapsed", "Action Required"],
      ...payload.attentionQueue.map((item) => [
        item.severity.toUpperCase(),
        item.category,
        item.title,
        item.referenceId,
        item.referenceType,
        item.daysElapsed,
        item.recommendedAction,
      ]),
    ]
    const wsAttention = XLSX.utils.aoa_to_sheet(attentionRows)
    XLSX.utils.book_append_sheet(wb, wsAttention, "Attention Queue")

    // Generate binary buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="SkyAriana_Executive_Management_Pack_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    })
  } catch (error: any) {
    console.error("[Executive Export API] Error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate management pack export" },
      { status: 500 }
    )
  }
}
