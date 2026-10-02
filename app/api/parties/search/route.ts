import { NextResponse } from "next/server"
import shipperSeedData from "@/lib/data/shippers-from-pdf.json"
import consigneeSeedData from "@/lib/data/consignees-from-pdf.json"
import notifyPartySeedData from "@/lib/data/notify-parties-from-pdf.json"
import { getFastApiBaseUrl, isFastApiHealthy } from "@/lib/api/backend-url"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") || "").trim().toLowerCase()
  const role = (searchParams.get("role") || "ALL").toUpperCase()
  const limit = Math.max(1, Math.min(500, parseInt(searchParams.get("limit") || "50", 10)))

  // 1. Probe FastAPI SQLite backend (<10ms)
  try {
    if (await isFastApiHealthy()) {
      const fastUrl = new URL(`${getFastApiBaseUrl()}/api/v1/parties/search`)
      if (q) fastUrl.searchParams.set("q", q)
      if (role) fastUrl.searchParams.set("role", role)
      fastUrl.searchParams.set("limit", String(limit))

      const fastRes = await fetch(fastUrl.toString(), {
        signal: AbortSignal.timeout(600),
        headers: { Accept: "application/json" },
      })

      if (fastRes.ok) {
        const fastResult = await fastRes.json()
        if (fastResult && Array.isArray(fastResult.data)) {
          return NextResponse.json({
            success: true,
            data: fastResult.data,
            source: "fastapi-sqlite",
          })
        }
      }
    }
  } catch {
    // Seamless local fallback
  }

  // 2. Fallback: Search local seed data
  const results: any[] = []

  const searchInList = (list: any[], itemRole: string) => {
    for (const item of list) {
      if (results.length >= limit) break
      const name = (item.name || "").toLowerCase()
      const contact = (item.contact || "").toLowerCase()
      const email = (item.email || "").toLowerCase()
      const address = (item.address || "").toLowerCase()

      if (!q || name.startsWith(q) || name.includes(q) || contact.includes(q) || email.includes(q) || address.includes(q)) {
        results.push({
          id: item.id || `local-${itemRole.toLowerCase()}-${name.replace(/[^a-z0-9]/g, "-")}`,
          name: item.name,
          role: itemRole,
          contact_person: item.contact || null,
          phone: item.contact || null,
          email: item.email || null,
          address: item.address || null,
        })
      }
    }
  }

  if (role === "SHIPPER" || role === "ALL") {
    searchInList(shipperSeedData, "SHIPPER")
  }
  if ((role === "CONSIGNEE" || role === "ALL") && results.length < limit) {
    searchInList(consigneeSeedData, "CONSIGNEE")
  }
  if ((role === "NOTIFY_PARTY" || role === "ALL") && results.length < limit) {
    searchInList(notifyPartySeedData, "NOTIFY_PARTY")
  }

  return NextResponse.json({
    success: true,
    data: results.slice(0, limit),
    source: "local-seed",
  })
}
