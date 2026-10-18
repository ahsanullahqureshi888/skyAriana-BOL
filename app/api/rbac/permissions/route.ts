import { NextResponse } from "next/server"
import { getStoredRoles, saveRole, cloneRole, requirePermission } from "@/lib/rbac/rbac-service"
import { ALL_PERMISSIONS, DEFAULT_SYSTEM_ROLES } from "@/lib/rbac/permissions-config"
import { logAuditEvent } from "@/lib/rbac/audit-service"

export async function GET() {
  try {
    const roles = getStoredRoles()
    return NextResponse.json({
      success: true,
      roles,
      permissions: ALL_PERMISSIONS,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, role, cloneParams, actor } = body

    if (action === "SAVE_ROLE") {
      if (!role || !role.id) {
        return NextResponse.json({ success: false, error: "Missing role payload" }, { status: 400 })
      }
      const updated = saveRole(role, actor?.id || "admin", actor?.name || "Administrator")
      return NextResponse.json({ success: true, roles: updated })
    }

    if (action === "CLONE_ROLE") {
      const { sourceRoleId, newRoleId, newName, newDescription } = cloneParams || {}
      if (!sourceRoleId || !newRoleId || !newName) {
        return NextResponse.json({ success: false, error: "Missing clone parameters" }, { status: 400 })
      }
      const created = cloneRole(
        sourceRoleId,
        newRoleId,
        newName,
        newDescription || "",
        actor?.id || "admin",
        actor?.name || "Administrator"
      )
      return NextResponse.json({ success: true, role: created, roles: getStoredRoles() })
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
