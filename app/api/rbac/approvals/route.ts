import { NextResponse } from "next/server"
import {
  getApprovalRequests,
  getApprovalRules,
  createApprovalRequest,
  processApprovalAction,
  saveApprovalRule,
} from "@/lib/rbac/approval-service"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const status = url.searchParams.get("status") as any
    const requestedBy = url.searchParams.get("requestedBy") || undefined
    const entityId = url.searchParams.get("entityId") || undefined

    const requests = getApprovalRequests({ status, requestedBy, entityId })
    const rules = getApprovalRules()

    return NextResponse.json({
      success: true,
      requests,
      rules,
      count: requests.length,
      pendingCount: requests.filter((r) => r.status === "PENDING").length,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, requestParams, actionParams, ruleParams, actor } = body

    if (action === "CREATE_REQUEST") {
      const result = createApprovalRequest(requestParams)
      return NextResponse.json({ success: true, ...result })
    }

    if (action === "PROCESS_ACTION") {
      const result = processApprovalAction({
        requestId: actionParams.requestId,
        userId: actor?.id || actionParams.userId,
        userName: actor?.name || actionParams.userName,
        userRole: actor?.role || actionParams.userRole,
        action: actionParams.action,
        comment: actionParams.comment || "",
      })
      return NextResponse.json({ ...result })
    }

    if (action === "SAVE_RULE") {
      const updated = saveApprovalRule(ruleParams, actor?.id, actor?.name)
      return NextResponse.json({ success: true, rules: updated })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
