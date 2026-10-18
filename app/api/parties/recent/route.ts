import { NextResponse } from "next/server"
import shipperSeedData from "@/lib/data/shippers-from-pdf.json"
import consigneeSeedData from "@/lib/data/consignees-from-pdf.json"
import notifyPartySeedData from "@/lib/data/notify-parties-from-pdf.json"
import { getFastApiBaseUrl, isFastApiHealthy } from "@/lib/api/backend-url"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const role = (searchParams.get("role") || "ALL").toUpperCase()

  // 1. Probe FastAPI SQLite backend
  try {
    if (await isFastApiHealthy()) {
      const fastUrl = new URL(`${getFastApiBaseUrl()}/api/v1/parties/recent`)
      if (role && role !== "ALL") fastUrl.searchParams.set("role", role)

      const fastRes = await fetch(fastUrl.toString(), {
        signal: AbortSignal.timeout(600),
        headers: { Accept: "application/json" },
      })

      if (fastRes.ok) {
        const fastResult = await fastRes.json()
        if (fastResult && Array.isArray(fastResult.data) && fastResult.data.length > 0) {
          return NextResponse.json({
            success: true,
            data: fastResult.data,
            source: "fastapi-sqlite",
          })
        }
      }
    }
  } catch {
    // Seamless fallback
  }

  // 2. Fallback: First 10 items from seed list
  let sourceList: any[] = []
  if (role === "SHIPPER") {
    sourceList = shipperSeedData.slice(0, 10).map((s) => ({
      id: s.id,
      name: s.name,
      role: "SHIPPER",
      phone: s.contact || null,
      email: s.email || null,
      address: s.address || null,
    }))
  } else if (role === "CONSIGNEE") {
    sourceList = consigneeSeedData.slice(0, 10).map((c) => ({
      id: c.id,
      name: c.name,
      role: "CONSIGNEE",
      phone: c.contact || null,
      email: c.email || null,
      address: c.address || null,
    }))
  } else if (role === "NOTIFY_PARTY") {
    sourceList = notifyPartySeedData.slice(0, 10).map((n) => ({
      id: n.id,
      name: n.name,
      role: "NOTIFY_PARTY",
      phone: n.contact || null,
      email: n.email || null,
      address: n.address || null,
    }))
  } else {
    sourceList = [
      ...shipperSeedData.slice(0, 4).map((s) => ({ id: s.id, name: s.name, role: "SHIPPER", address: s.address })),
      ...consigneeSeedData.slice(0, 4).map((c) => ({ id: c.id, name: c.name, role: "CONSIGNEE", address: c.address })),
    ]
  }

  return NextResponse.json({
    success: true,
    data: sourceList,
    source: "local-seed",
  })
}
