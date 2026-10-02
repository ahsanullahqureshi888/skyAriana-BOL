import { NextResponse } from "next/server"
import * as localStorage from "@/lib/services/local-storage-service"
import { getFastApiBaseUrl, isFastApiHealthy } from "@/lib/api/backend-url"
import { computeBolSummary, isMeaningfulBOL } from "@/lib/utils/bol-filters"

export async function GET() {
  // 1. Try ultra-fast FastAPI SQLite backend (<5ms)
  try {
    if (await isFastApiHealthy()) {
      const fastRes = await fetch(`${getFastApiBaseUrl()}/api/v1/bols/summary`, {
        signal: AbortSignal.timeout(600),
        headers: { Accept: "application/json" },
      })
      if (fastRes.ok) {
        const json = await fastRes.json()
        if (json && json.data) {
          return NextResponse.json({
            success: true,
            data: json.data,
            source: "fastapi-sqlite",
          })
        }
      }
    }
  } catch {
    // Fall through to local storage
  }

  // 2. Fallback to local storage
  try {
    const localBols = await localStorage.getAllLocalBOLs()
    const summary = computeBolSummary(localBols)
    return NextResponse.json({
      success: true,
      data: summary,
      source: "local-storage",
    })
  } catch (err) {
    console.error("[bol/summary API] Error computing summary:", err)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to compute BOL summary",
        data: { total_bols: 0, total_packages: 0, total_weight: 0, total_goods_value: 0 },
      },
      { status: 500 }
    )
  }
}
