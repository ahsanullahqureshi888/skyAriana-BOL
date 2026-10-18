import { NextResponse } from "next/server"
import { getAuditLogs, exportAuditLogsToCsv, logAuditEvent } from "@/lib/rbac/audit-service"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const format = url.searchParams.get("format")
    const userId = url.searchParams.get("userId") || undefined
    const entityType = url.searchParams.get("entityType") || undefined
    const action = url.searchParams.get("action") || undefined
    const startDate = url.searchParams.get("startDate") || undefined
    const endDate = url.searchParams.get("endDate") || undefined
    const search = url.searchParams.get("search") || undefined
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!, 10) : 500

    const logs = getAuditLogs({ userId, entityType, action, startDate, endDate, search, limit })

    if (format === "csv") {
      const csv = exportAuditLogsToCsv(logs)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="skyariana-audit-log-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, userName, action, entityType, entityId, description, oldValues, newValues, metadata } = body

    if (!action || !entityType || !entityId) {
      return NextResponse.json({ success: false, error: "Missing required audit fields" }, { status: 400 })
    }

    const created = logAuditEvent({
      userId,
      userName,
      action,
      entityType,
      entityId,
      description,
      oldValues,
      newValues,
      metadata,
    })

    return NextResponse.json({ success: true, log: created })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
