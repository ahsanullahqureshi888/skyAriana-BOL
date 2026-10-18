import { NextRequest, NextResponse } from "next/server"
import { executeDatabaseRepair } from "@/lib/backup/database-health-service"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const actions: string[] = Array.isArray(body.actions) ? body.actions : ["ALL"]
    const actor: string = body.actor || "Admin Repair Tool"

    const result = await executeDatabaseRepair(actions, actor)

    if (!result.success && result.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          errors: result.errors,
          preRepairBackupFileName: result.preRepairBackupFileName,
          repairsApplied: result.repairsApplied,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      preRepairBackupFileName: result.preRepairBackupFileName,
      repairsApplied: result.repairsApplied,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Repair execution failed" },
      { status: 500 }
    )
  }
}
