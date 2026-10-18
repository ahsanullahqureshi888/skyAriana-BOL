import { NextRequest, NextResponse } from "next/server"
import { aggregateControlTowerData } from "@/lib/control-tower/control-tower-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roleParam = searchParams.get("role")
    const headerRole = request.headers.get("x-user-role")
    const clientId = request.headers.get("x-client-id") || searchParams.get("clientId") || undefined

    const userRole = (headerRole || roleParam || "admin").toLowerCase()

    // Shipper / Customer Portal users cannot access the administrative Logistics Control Tower
    if (userRole === "shipper" || userRole === "client") {
      return NextResponse.json(
        { error: "Forbidden: Control Tower is restricted to internal operational and management staff." },
        { status: 403 }
      )
    }

    const towerData = await aggregateControlTowerData({
      userRole,
      clientId,
    })

    return NextResponse.json(towerData, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (error) {
    console.error("[Control Tower API Error]:", error)
    return NextResponse.json(
      { error: "Failed to aggregate control tower data", details: String(error) },
      { status: 500 }
    )
  }
}
