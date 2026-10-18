import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, mutateJsonFile } from "@/lib/services/blob-db"
import { getExecutiveBiData } from "@/lib/analytics/executive-bi-service"
import { ExecutiveSnapshotRecord, ExecutiveBiFilters } from "@/lib/types/executive-bi"

const SNAPSHOTS_FILE = getDataPath(".local-executive-bi-snapshots.json")

export async function GET(request: NextRequest) {
  try {
    const snapshots = await readJsonFile<ExecutiveSnapshotRecord[]>(SNAPSHOTS_FILE, [])
    return NextResponse.json({
      success: true,
      totalSnapshots: snapshots.length,
      snapshots: snapshots.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load executive snapshots" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userRole = request.headers.get("x-user-role") || body.role || "admin"

    const filters: ExecutiveBiFilters = {
      period: body.period || "this_month",
      comparison: body.comparison || "prev_month",
      startDate: body.startDate,
      endDate: body.endDate,
      currencyMode: body.currencyMode || "segregated",
    }

    const payload = await getExecutiveBiData(filters, userRole)

    // Compute cryptographic integrity SHA-256 hash
    const dataString = JSON.stringify(payload)
    const hash = crypto.createHash("sha256").update(dataString).digest("hex")

    const snapshotId = `SNAP-EXEC-${Date.now().toString(36).toUpperCase()}`
    const snapshotCode = `EX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

    const newSnapshot: ExecutiveSnapshotRecord = {
      id: snapshotId,
      snapshotCode,
      title: body.title || `Executive Management Brief (${payload.periodLabel})`,
      generatedAt: new Date().toISOString(),
      generatedBy: body.author || "Executive Management",
      periodPreset: filters.period,
      periodStart: payload.periodLabel,
      periodEnd: payload.asOf,
      currencyMode: filters.currencyMode,
      totalShipments: Number(payload.kpis.activeShipments.rawValue || 0) + Number(payload.kpis.deliveredShipments.rawValue || 0),
      totalRevenueUSD: Number(payload.kpis.serviceRevenue.rawValue || 0),
      grossMarginUSD: Number(payload.kpis.grossMargin.rawValue || 0),
      integrityHash: hash,
      payload,
    }

    await mutateJsonFile<ExecutiveSnapshotRecord[]>(SNAPSHOTS_FILE, [], (list) => {
      const existing = Array.isArray(list) ? list : []
      return [newSnapshot, ...existing]
    })

    return NextResponse.json({
      success: true,
      message: "Executive snapshot successfully frozen with cryptographic verification.",
      snapshot: newSnapshot,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to freeze executive snapshot" },
      { status: 500 }
    )
  }
}
