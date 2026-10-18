import { NextResponse } from "next/server"
import * as localStorage from "@/lib/services/local-storage-service"
import { getFastApiBaseUrl, isFastApiHealthy } from "@/lib/api/backend-url"
import { computeBolSummary, isMeaningfulBOL } from "@/lib/utils/bol-filters"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  // Compute canonical local storage summary (ultra fast in-memory cache)
  let localSummary: any = null
  try {
    const localBols = await localStorage.getAllLocalBOLs()
    localSummary = computeBolSummary(localBols)
  } catch (err) {
    console.error("[bol/summary API] Error loading local BOLs:", err)
  }

  // 1. Try ultra-fast FastAPI SQLite backend (<5ms)
  try {
    if (await isFastApiHealthy()) {
      const fastRes = await fetch(`${getFastApiBaseUrl()}/api/v1/bols/summary`, {
        signal: AbortSignal.timeout(600),
        headers: { Accept: "application/json" },
      })
      if (fastRes.ok) {
        const json = await fastRes.json()
        const data = json?.data
        if (data && typeof data.total_bols === "number") {
          // Strict Sanity Guards: reject corrupt extreme numbers or truncated counts
          const isSane =
            data.total_packages > 0 &&
            data.total_packages < 10_000_000 &&
            data.total_weight > 0 &&
            data.total_weight < 50_000_000 &&
            data.total_bols >= 100

          if (isSane) {
            // Merge with canonical goods value if SQLite freight_fee sum was 0
            const goodsValue = (data.total_goods_value && data.total_goods_value > 0)
              ? data.total_goods_value
              : (localSummary?.total_goods_value || 0)

            const packagesDisplay = data.packages_display || localSummary?.packages_display || `${data.total_packages.toLocaleString()} PKGS`
            const packageUnitsBreakdown = data.package_units_breakdown || localSummary?.package_units_breakdown || {}

            return NextResponse.json({
              success: true,
              data: {
                total_bols: data.total_bols,
                total_packages: data.total_packages,
                total_weight: Math.round(data.total_weight),
                total_goods_value: Math.round(goodsValue * 100) / 100,
                package_units_breakdown: packageUnitsBreakdown,
                packages_display: packagesDisplay,
              },
              source: "fastapi-sqlite-enriched",
            })
          }
        }
      }
    }
  } catch {
    // Fall through to local storage
  }

  // 2. Return canonical local summary
  if (localSummary) {
    return NextResponse.json({
      success: true,
      data: localSummary,
      source: "local-storage",
    })
  }

  return NextResponse.json(
    {
      success: false,
      error: "Failed to compute BOL summary",
      data: { total_bols: 0, total_packages: 0, total_weight: 0, total_goods_value: 0 },
    },
    { status: 500 }
  )
}
