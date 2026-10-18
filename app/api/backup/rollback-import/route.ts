import { NextRequest, NextResponse } from "next/server"
import {
  listImportBatches,
  executeImportRollback,
} from "@/lib/backup/import-rollback-service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const batches = await listImportBatches()
    return NextResponse.json({ success: true, batches })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to list import batches" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const batchId = body.batchId
    const force = Boolean(body.force)
    const actor = body.actor || "Admin Import Rollback"

    if (!batchId) {
      return NextResponse.json(
        { success: false, error: "batchId is required" },
        { status: 400 }
      )
    }

    const result = await executeImportRollback(batchId, { actor, force })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          conflicts: result.conflictsEncountered,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to execute rollback" },
      { status: 500 }
    )
  }
}
