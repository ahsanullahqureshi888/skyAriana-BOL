import { NextRequest, NextResponse } from "next/server"
import {
  auditStartupDatabaseHealth,
  discoverBackupsOnDisk,
  executeDisasterRecovery,
} from "@/lib/backup/disaster-recovery-service"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const customFolder = searchParams.get("customFolder") || undefined

    const [status, discovered] = await Promise.all([
      auditStartupDatabaseHealth(),
      discoverBackupsOnDisk(customFolder),
    ])

    return NextResponse.json({
      success: true,
      status,
      discoveredBackups: discovered,
      recommendedRecoveryPoint: status.recommendedRecoveryPoint || discovered[0] || null,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to audit disaster recovery status" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const backupFilePath = body.backupFilePath
    const actor = body.actor || "Disaster Recovery Admin"

    if (!backupFilePath) {
      return NextResponse.json(
        { success: false, error: "backupFilePath is required to execute disaster recovery." },
        { status: 400 }
      )
    }

    const result = await executeDisasterRecovery(backupFilePath, actor)
    return NextResponse.json({ success: result.success, result })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Disaster recovery execution failed" },
      { status: 500 }
    )
  }
}
