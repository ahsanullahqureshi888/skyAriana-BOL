"use client"

import { useMemo, useCallback } from "react"
import { useApp } from "@/lib/app-context"
import {
  hasPermission as checkPermission,
  canViewProfit as checkProfit,
  canViewCosts as checkCosts,
  getUserPermissions,
  normalizeRole,
} from "@/lib/rbac/rbac-service"
import { checkApprovalRequirement, getApprovalRules } from "@/lib/rbac/approval-service"
import { ApprovalActionType } from "@/lib/rbac/rbac-types"

export function usePermissions() {
  const { currentUser } = useApp()

  const permissions = useMemo(() => {
    return getUserPermissions(currentUser)
  }, [currentUser])

  const role = useMemo(() => {
    return normalizeRole(currentUser?.role)
  }, [currentUser?.role])

  const isSuperAdmin = role === "superadmin"
  const isAdmin = role === "admin" || isSuperAdmin
  const isManagement = role === "management" || isSuperAdmin
  const isOperations = role === "operations"
  const isAccounting = role === "accounting" || (currentUser?.role as any) === "accountant"
  const isDocuments = role === "documents"
  const isTracking = role === "tracking"
  const isViewer = role === "viewer"
  const isClient = role === "client" || (currentUser?.role as any) === "shipper"

  const hasPerm = useCallback(
    (permissionKey: string): boolean => {
      return checkPermission(currentUser, permissionKey)
    },
    [currentUser]
  )

  const canViewProfit = useMemo(() => {
    return checkProfit(currentUser)
  }, [currentUser])

  const canViewCosts = useMemo(() => {
    return checkCosts(currentUser)
  }, [currentUser])

  const canAccessModule = useCallback(
    (moduleName: string): boolean => {
      if (isSuperAdmin) return true
      const m = moduleName.toLowerCase()
      switch (m) {
        case "bol":
        case "bol-editor":
          return hasPerm("bol_view")
        case "shipments":
          return hasPerm("shipment_view")
        case "tracking":
          return hasPerm("tracking_view")
        case "documents":
        case "compliance":
          return hasPerm("documents_view")
        case "accounting":
        case "accounting-finance":
          return hasPerm("accounting_view")
        case "ledger":
          return hasPerm("ledger_view")
        case "reports":
          return hasPerm("management_profit_report") || hasPerm("accounting_view") || isManagement
        case "bulk-entry":
          return hasPerm("bulk_import") || hasPerm("bol_bulk_create")
        case "customer-portal-admin":
          return hasPerm("client_user_view") || hasPerm("client_access_manage")
        case "settings":
          return hasPerm("settings_view")
        default:
          return true
      }
    },
    [isSuperAdmin, hasPerm, isManagement]
  )

  const canApprove = useCallback(
    (actionType: ApprovalActionType, amount: number, currency: string): boolean => {
      if (isSuperAdmin) return true
      const { requiresApproval, matchingRule } = checkApprovalRequirement(actionType, amount, currency, role)
      if (!requiresApproval) return true
      const allowedApprovers = matchingRule?.approver_roles.map((r) => r.toLowerCase()) || []
      return allowedApprovers.includes(role)
    },
    [isSuperAdmin, role]
  )

  return {
    currentUser,
    role,
    permissions,
    hasPermission: hasPerm,
    canViewProfit,
    canViewCosts,
    canAccessModule,
    canApprove,
    isSuperAdmin,
    isAdmin,
    isManagement,
    isOperations,
    isAccounting,
    isDocuments,
    isTracking,
    isViewer,
    isClient,
  }
}
