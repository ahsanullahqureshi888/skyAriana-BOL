import { NextResponse } from "next/server"
import { queryAuditEvents, recordAuditEvent, exportAuditCsv } from "@/lib/audit/audit-trail-service"
import { AuditFilterParams } from "@/lib/audit/audit-types"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const format = url.searchParams.get("format")
    const search = url.searchParams.get("search") || undefined
    const userId = url.searchParams.get("userId") || undefined
    const module = url.searchParams.get("module") || undefined
    const action = (url.searchParams.get("action") as any) || undefined
    const entityType = (url.searchParams.get("entityType") as any) || undefined
    const entityId = url.searchParams.get("entityId") || undefined
    const onlyCritical = url.searchParams.get("critical") === "true"
    const page = url.searchParams.get("page") ? parseInt(url.searchParams.get("page")!, 10) : 1
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!, 10) : 50

    const filters: AuditFilterParams = {
      search,
      userId,
      module,
      action,
      entityType,
      entityId,
      onlyCritical,
      page,
      limit,
    }

    const queryResult = queryAuditEvents(filters)

    if (format === "csv") {
      const csv = exportAuditCsv(queryResult.events, true)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="skyariana-audit-trail-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      ...queryResult,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const event = recordAuditEvent(body)
    return NextResponse.json({ success: true, event })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
