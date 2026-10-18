import { NextRequest, NextResponse } from "next/server"
import {
  getDisasterRecoveryConfig,
  saveDisasterRecoveryConfig,
  enforceBackupRetentionPolicy,
} from "@/lib/backup/backup-retention-service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const config = await getDisasterRecoveryConfig()
    return NextResponse.json({ success: true, config })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load config" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const updated = await saveDisasterRecoveryConfig(body)

    // If retention pruning requested
    let pruneResult = null
    if (body.runPrune) {
      pruneResult = await enforceBackupRetentionPolicy("Admin Config")
    }

    return NextResponse.json({
      success: true,
      config: updated,
      pruneResult,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update config" },
      { status: 500 }
    )
  }
}
