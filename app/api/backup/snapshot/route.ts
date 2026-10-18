import { NextRequest, NextResponse } from "next/server"
import {
  createSystemSnapshot,
  type SnapshotReason,
} from "@/lib/backup/snapshot-service"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const reason = (body.reason || "CUSTOM_SNAPSHOT") as SnapshotReason
    const actor = body.actor || "User Admin"
    const note = body.note || ""
    const targetVersion = body.targetVersion
    const period = body.period

    const result = await createSystemSnapshot({
      reason,
      actor,
      note,
      targetVersion,
      period,
    })

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create system snapshot" },
      { status: 500 }
    )
  }
}
