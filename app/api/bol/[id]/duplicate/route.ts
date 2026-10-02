import { NextResponse } from "next/server"
import * as localStorage from "@/lib/services/local-storage-service"
import { getNextAtomicBolNumber, advanceBolSequenceIfHigher } from "@/lib/services/bol-sequence"
import { getFastApiBaseUrl, isFastApiHealthy } from "@/lib/api/backend-url"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  let targetBolNumber = (searchParams.get("new_bol_number") || "").trim()

  if (!targetBolNumber) {
    targetBolNumber = await getNextAtomicBolNumber()
  }

  // 1. Probe FastAPI backend (<10ms atomic clone)
  try {
    if (await isFastApiHealthy()) {
      const fastUrl = new URL(`${getFastApiBaseUrl()}/api/v1/bols/${encodeURIComponent(id)}/duplicate`)
      fastUrl.searchParams.set("new_bol_number", targetBolNumber)

      const fastRes = await fetch(fastUrl.toString(), {
        method: "POST",
        signal: AbortSignal.timeout(1200),
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
    // Seamless local fallback
  }

  // 2. Local Fallback Duplication
  try {
    const sourceBol = await localStorage.getLocalBOL(id)
    if (!sourceBol) {
      return NextResponse.json({ error: "Source BOL not found" }, { status: 404 })
    }

    const now = new Date().toISOString()
    const clonedBol = {
      ...sourceBol,
      id: targetBolNumber,
      bol_number: targetBolNumber,
      issue_date: now.split("T")[0],
      created_at: now,
      updated_at: now,
      revision: 1,
    }

    await localStorage.storeLocalBOL(targetBolNumber, clonedBol)
    await advanceBolSequenceIfHigher(targetBolNumber)

    return NextResponse.json({
      success: true,
      data: {
        id: targetBolNumber,
        bol_number: targetBolNumber,
        revision: 1,
        status: "active",
        updated_at: now,
        message: "BOL duplicated successfully",
      },
      source: "local-file",
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to duplicate BOL" }, { status: 500 })
  }
}
