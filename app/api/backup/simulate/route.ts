import { NextRequest, NextResponse } from "next/server"
import { simulateAQRestore, getSimulationHistory } from "@/lib/backup/restore-simulation-service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const history = await getSimulationHistory(20)
    return NextResponse.json({ success: true, history })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load simulation history" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const filePath = body.filePath
    const actor = body.actor || "User Simulator"

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: "filePath is required to run restore simulation." },
        { status: 400 }
      )
    }

    const result = await simulateAQRestore(filePath, actor)
    return NextResponse.json({ success: result.success, result })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Simulation execution failed" },
      { status: 500 }
    )
  }
}
