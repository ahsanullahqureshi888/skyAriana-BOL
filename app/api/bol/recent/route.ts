import { NextResponse } from "next/server"
import * as localStorage from "@/lib/services/local-storage-service"
import { getFastApiBaseUrl, isFastApiHealthy } from "@/lib/api/backend-url"
import { isMeaningfulBOL, parseBolSeq, toLightweightBol, enrichBolListWithLocal } from "@/lib/utils/bol-filters"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limitParam = parseInt(searchParams.get("limit") || "6", 10)
  const limit = Math.max(1, Math.min(20, isNaN(limitParam) ? 6 : limitParam))

  const localBols = await localStorage.getAllLocalBOLs().catch(() => [])

  // 1. Try ultra-fast FastAPI SQLite backend (<5ms)
  try {
    if (await isFastApiHealthy()) {
      const fastRes = await fetch(`${getFastApiBaseUrl()}/api/v1/bols/recent?limit=${limit}`, {
        signal: AbortSignal.timeout(600),
        headers: { Accept: "application/json" },
      })
      if (fastRes.ok) {
        const json = await fastRes.json()
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          const enriched = enrichBolListWithLocal(json.data, localBols)
          const activeOnly = enriched.filter((b: any) => !b.isArchived && b.status !== "archived")
          return NextResponse.json({
            success: true,
            data: activeOnly.map(toLightweightBol),
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
    const valid = localBols
      .filter((b: any) => isMeaningfulBOL(b) && !b.isArchived && b.status !== "archived")
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.updated_at || a.issue_date || 0).getTime()
        const dateB = new Date(b.created_at || b.updated_at || b.issue_date || 0).getTime()
        if (dateB !== dateA) return dateB - dateA
        return parseBolSeq(b.bol_number || "") - parseBolSeq(a.bol_number || "")
      })
      .slice(0, limit)
      .map(toLightweightBol)

    return NextResponse.json({
      success: true,
      data: valid,
      source: "local-storage",
    })
  } catch (err) {
    console.error("[bol/recent API] Error fetching recent BOLs:", err)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch recent BOLs",
        data: [],
      },
      { status: 500 }
    )
  }
}
