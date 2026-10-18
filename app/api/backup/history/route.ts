import { NextRequest, NextResponse } from "next/server"
import { getDataPath } from "@/lib/server-paths"
import { readJsonFile } from "@/lib/services/blob-db"
import { rollbackRestore, type RestoreHistoryItem } from "@/lib/backup/central-backup-service"

export const dynamic = "force-dynamic"

const RESTORE_HISTORY_FILE = getDataPath(".local-restore-history.json")

export async function GET() {
  try {
    const history = await readJsonFile<RestoreHistoryItem[]>(RESTORE_HISTORY_FILE, [])
    return NextResponse.json({ success: true, history })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch restore history" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const restoreId = body.restoreId
    const actor = body.actor || "Admin User"

    if (!restoreId) {
      return NextResponse.json({ success: false, error: "restoreId is required" }, { status: 400 })
    }

    const result = await rollbackRestore(restoreId, actor)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, rolledBackToSnapshot: result.rolledBackToSnapshot })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to rollback restore" },
      { status: 500 }
    )
  }
}
