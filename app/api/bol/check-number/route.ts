import { NextResponse } from "next/server"
import * as localStorage from "@/lib/services/local-storage-service"

import { getFastApiBaseUrl, isFastApiHealthy } from "@/lib/api/backend-url"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const number = (searchParams.get("number") || "").trim()
  const excludeId = searchParams.get("exclude_id") || undefined

  if (!number) {
    return NextResponse.json({ error: "Missing BOL number" }, { status: 400 })
  }

  // 1. Probe FastAPI backend (<10ms indexed check)
  try {
    if (await isFastApiHealthy()) {
      const fastUrl = new URL(`${getFastApiBaseUrl()}/api/v1/bols/check-number`)
      fastUrl.searchParams.set("number", number)
      if (excludeId) fastUrl.searchParams.set("exclude_id", excludeId)

      const fastRes = await fetch(fastUrl.toString(), {
        signal: AbortSignal.timeout(600),
        headers: { Accept: "application/json" },
      })

      if (fastRes.ok) {
        const fastResult = await fastRes.json()
        if (fastResult && fastResult.data) {
          return NextResponse.json({
            success: true,
            data: fastResult.data,
            source: "fastapi-sqlite",
          })
        }
      }
    }
  } catch {
    // Fallback
  }

  // 2. Fallback: Check local files
  const localBols = await localStorage.getAllLocalBOLs()
  const match = localBols.find(
    (b) => (b.bol_number || "").toLowerCase() === number.toLowerCase() && (!excludeId || b.id !== excludeId)
  )

  return NextResponse.json({
    success: true,
    data: {
      exists: Boolean(match),
      bol_number: number,
      matched_id: match ? (match.id || match.bol_number) : null,
    },
    source: "local-file",
  })
}
