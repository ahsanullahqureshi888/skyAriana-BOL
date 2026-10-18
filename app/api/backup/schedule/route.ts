import { NextRequest, NextResponse } from "next/server"
import {
  getBackupScheduleConfig,
  saveBackupScheduleConfig,
  evaluateBackupSchedule,
  runScheduledBackup,
  getBackupJobHistory,
} from "@/lib/backup/backup-scheduler-service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [config, evaluation, jobs] = await Promise.all([
      getBackupScheduleConfig(),
      evaluateBackupSchedule(),
      getBackupJobHistory(20),
    ])

    return NextResponse.json({
      success: true,
      config,
      evaluation,
      jobs,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load backup schedule" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = body.action || "save_config"

    if (action === "run_scheduled") {
      const trigger = body.trigger || "SCHEDULED_DAILY"
      const result = await runScheduledBackup(trigger)
      return NextResponse.json({ success: true, result })
    }

    if (action === "run_missed") {
      const result = await runScheduledBackup("MISSED_RECOVERY")
      return NextResponse.json({ success: true, result })
    }

    // Default: update configuration
    const updated = await saveBackupScheduleConfig(body.config || body)
    return NextResponse.json({ success: true, config: updated })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to process schedule request" },
      { status: 500 }
    )
  }
}
