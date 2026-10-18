import { ExtendedUser, RoleDefinition, StaffRole } from "./rbac-types"
import { DEFAULT_SYSTEM_ROLES, ALL_PERMISSIONS } from "./permissions-config"
import { logAuditEvent } from "./audit-service"
import { User } from "../types"

const ROLES_STORAGE_KEY = "skyariana_rbac_roles_v1"
let memoryRoles: RoleDefinition[] = [...DEFAULT_SYSTEM_ROLES]

// Normalize role aliases
export function normalizeRole(role?: string): string {
  if (!role) return "viewer"
  const r = role.toLowerCase().trim()
  if (r === "accountant") return "accounting"
  if (r === "shipper") return "client"
  return r
}

// -------------------------------------------------------------
// Role Definitions Management
// -------------------------------------------------------------
export function getStoredRoles(): RoleDefinition[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(ROLES_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Ensure all system roles are preserved
        const merged = [...parsed]
        for (const sysRole of DEFAULT_SYSTEM_ROLES) {
          if (!merged.some((r: RoleDefinition) => r.id === sysRole.id)) {
            merged.push(sysRole)
          }
        }
        return merged
      }
    } catch {}
  }
  return memoryRoles
}

export function saveRole(role: RoleDefinition, actorId = "system", actorName = "Admin"): RoleDefinition[] {
  const current = getStoredRoles()
  const idx = current.findIndex((r) => r.id === role.id)
  let updated: RoleDefinition[]

  if (idx >= 0) {
    updated = [...current]
    updated[idx] = { ...role, updated_at: new Date().toISOString() }
  } else {
    updated = [...current, role]
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(updated))
  }
  memoryRoles = updated

  logAuditEvent({
    userId: actorId,
    userName: actorName,
    action: "ROLE_UPDATED",
    entityType: "role",
    entityId: role.id,
    description: `Updated permissions for role ${role.name} (${role.permissions.length} permissions)`,
    newValues: { roleId: role.id, permissionsCount: role.permissions.length },
  })

  return updated
}

export function cloneRole(
  sourceRoleId: string,
  newRoleId: string,
  newName: string,
  newDescription: string,
  actorId = "system",
  actorName = "Admin"
): RoleDefinition {
  const roles = getStoredRoles()
  const source = roles.find((r) => r.id === sourceRoleId)
  if (!source) throw new Error(`Source role ${sourceRoleId} not found`)

  const newRole: RoleDefinition = {
    id: newRoleId.toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
    name: newName,
    description: newDescription,
    system_role: false,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    permissions: [...source.permissions],
  }

  saveRole(newRole, actorId, actorName)
  return newRole
}

// -------------------------------------------------------------
// Permission Resolution
// -------------------------------------------------------------
export function getUserPermissions(user: ExtendedUser | User | null | undefined): string[] {
  if (!user) return []

  // Check account status
  const status = (user as any).status
  if (status === "suspended" || status === "locked" || status === "inactive" || status === "disabled") {
    return []
  }

  const normRole = normalizeRole(user.role)

  // Superadmin has all permissions
  if (normRole === "superadmin") {
    return ALL_PERMISSIONS.map((p) => p.permission_key)
  }

  // Look up role in configured roles
  const roles = getStoredRoles()
  const roleDef = roles.find((r) => r.id === normRole)
  let permissions: Set<string> = new Set(roleDef ? roleDef.permissions : [])

  // Apply user-specific overrides if any
  const overrides = (user as ExtendedUser).permissions_override
  if (Array.isArray(overrides)) {
    for (const ov of overrides) {
      if (ov.allowed) {
        permissions.add(ov.permission_key)
      } else {
        permissions.delete(ov.permission_key)
      }
    }
  }

  return Array.from(permissions)
}

export function hasPermission(user: ExtendedUser | User | null | undefined, permissionKey: string): boolean {
  if (!user) return false
  const status = (user as any).status
  if (status === "suspended" || status === "locked" || status === "inactive" || status === "disabled") {
    return false
  }

  const normRole = normalizeRole(user.role)
  if (normRole === "superadmin") return true

  const userPerms = getUserPermissions(user)
  return userPerms.includes(permissionKey)
}

export function requirePermission(
  user: ExtendedUser | User | null | undefined,
  permissionKey: string,
  customMessage?: string
): void {
  if (!hasPermission(user, permissionKey)) {
    const roleName = user?.role || "Guest"
    const msg =
      customMessage ||
      `Access Denied (403): User '${user?.name || "Unknown"}' with role '${roleName}' lacks required permission '${permissionKey}'.`
    throw new Error(msg)
  }
}

export function canViewProfit(user: ExtendedUser | User | null | undefined): boolean {
  return hasPermission(user, "profit_view")
}

export function canViewCosts(user: ExtendedUser | User | null | undefined): boolean {
  return hasPermission(user, "cost_view_internal") || hasPermission(user, "cost_view")
}

// -------------------------------------------------------------
// Server-Side Data Sanitization (Prevent Profit & Cost Leaks)
// -------------------------------------------------------------
export function filterFinancials<T extends Record<string, any>>(
  user: ExtendedUser | User | null | undefined,
  data: T
): T {
  if (!data || typeof data !== "object") return data

  const showProfit = canViewProfit(user)
  const showCosts = canViewCosts(user)

  // If user has both, return unmodified
  if (showProfit && showCosts) return data

  const sanitizeObj = (obj: any): any => {
    if (!obj || typeof obj !== "object") return obj
    if (Array.isArray(obj)) return obj.map(sanitizeObj)

    const clean: Record<string, any> = {}
    for (const [k, v] of Object.entries(obj)) {
      const lower = k.toLowerCase()

      // Strip profit fields if not authorized
      if (!showProfit) {
        if (
          lower.includes("profit") ||
          lower.includes("margin") ||
          lower === "markup" ||
          lower === "grossprofit" ||
          lower === "netprofit"
        ) {
          continue
        }
      }

      // Strip internal supplier costs if not authorized
      if (!showCosts) {
        if (
          lower === "suppliercosts" ||
          lower === "internalcost" ||
          lower === "costprice" ||
          lower === "carrierfreight" ||
          lower === "supplier_costs"
        ) {
          continue
        }
      }

      clean[k] = typeof v === "object" && v !== null ? sanitizeObj(v) : v
    }
    return clean
  }

  return sanitizeObj(data)
}

// -------------------------------------------------------------
// Last Super Admin Protection
// -------------------------------------------------------------
export function validateSuperAdminProtection(
  allUsers: (User | ExtendedUser)[],
  targetUserId: string,
  nextRole?: string,
  nextStatus?: string
): void {
  const target = allUsers.find((u) => u.id === targetUserId)
  if (!target) return

  const isCurrentSuper = normalizeRole(target.role) === "superadmin"
  if (!isCurrentSuper) return

  // Count active superadmins excluding target
  const otherActiveSuperAdmins = allUsers.filter((u) => {
    if (u.id === targetUserId) return false
    const isSuper = normalizeRole(u.role) === "superadmin"
    const isActive = (u as any).status !== "disabled" && (u as any).status !== "suspended" && (u as any).status !== "inactive"
    return isSuper && isActive
  })

  const willBeDemoted = nextRole && normalizeRole(nextRole) !== "superadmin"
  const willBeDeactivated =
    nextStatus && (nextStatus === "disabled" || nextStatus === "suspended" || nextStatus === "inactive")

  if ((willBeDemoted || willBeDeactivated) && otherActiveSuperAdmins.length === 0) {
    throw new Error(
      "Super Admin Protection: Cannot demote, deactivate, or delete the last remaining active Super Admin. Create or promote another Super Admin first."
    )
  }
}
