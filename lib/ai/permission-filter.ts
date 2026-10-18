/**
 * Sky Ariana AI Operations Assistant - Permission & RBAC Filter
 * Strict permission-first gatekeeping and tenant isolation
 */

import { hasPermission, canViewProfit, canViewCosts, normalizeRole } from '@/lib/rbac/rbac-service'
import { ExtendedUser } from '@/lib/rbac/rbac-types'
import { AIUserSessionContext, AIAssistantIntentType, AIActionType } from '@/lib/types/ai-assistant'
import { isShipmentOwnedByCustomer } from '@/lib/services/customer-portal-service'

export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
}

/**
 * Validates whether the user's role and RBAC permissions permit the intended query intent.
 * Gating happens BEFORE any database retrieval.
 */
export function checkIntentPermission(
  user: AIUserSessionContext,
  intent: AIAssistantIntentType
): PermissionCheckResult {
  const normRole = normalizeRole(user.role)

  // 1. Superadmin has full access
  if (normRole === 'superadmin') {
    return { allowed: true }
  }

  // 2. Suspended / locked users have zero access
  if ((user as any).status === 'suspended' || (user as any).status === 'locked') {
    return { allowed: false, reason: 'Your account is suspended or locked.' }
  }

  // Convert context to ExtendedUser-compatible shape for RBAC
  const extendedUser: ExtendedUser = {
    id: user.userId || 'usr-temp',
    username: user.username,
    name: user.name,
    role: user.role as any,
    status: 'active',
  }

  // Client users are strictly restricted to own shipments, tracking, and released documents
  if (user.isClientUser || normRole === 'client' || normRole === 'shipper') {
    if (
      intent === 'TASK_STATUS' ||
      intent === 'DAILY_REPORT' ||
      intent === 'AUDIT_HISTORY' ||
      intent === 'BORDER_STATUS' ||
      intent === 'STALE_TRACKING' ||
      intent === 'ACTION_PROPOSAL' ||
      intent === 'SHIPMENT_PROFIT' ||
      intent === 'TODAY_PAYMENTS'
    ) {
      return {
        allowed: false,
        reason: 'Customer portal accounts are limited to tracking their own cargo and viewing released documents.',
      }
    }
  }

  // 3. Profitability queries
  if (intent === 'SHIPMENT_PROFIT') {
    if (!canViewProfit(extendedUser)) {
      return {
        allowed: false,
        reason: 'You do not have permission to view shipment profitability and profit margins.',
      }
    }
  }

  // 4. Customer balance and financial ledgers
  if (intent === 'CUSTOMER_BALANCE' || intent === 'OVERDUE_INVOICES' || intent === 'TODAY_PAYMENTS') {
    // Client users can view their own ledger only if client financial access is allowed
    if (user.isClientUser || normRole === 'client' || normRole === 'shipper') {
      return { allowed: true } // Scoped at data query level
    }

    // Internal staff must have accounting or ledger permission
    const hasAcc =
      hasPermission(extendedUser, 'accounting_view') ||
      hasPermission(extendedUser, 'ledger_view') ||
      hasPermission(extendedUser, 'ledger_view_balance') ||
      normRole === 'admin' ||
      normRole === 'management' ||
      normRole === 'accounting'

    if (!hasAcc) {
      return {
        allowed: false,
        reason: 'You do not have permission to access financial ledger balances or invoices.',
      }
    }
  }

  // 5. Audit history questions
  if (intent === 'AUDIT_HISTORY') {
    const hasAudit =
      hasPermission(extendedUser, 'accounting_view_audit') ||
      normRole === 'admin' ||
      normRole === 'management'

    if (!hasAudit) {
      return {
        allowed: false,
        reason: 'You do not have permission to inspect system audit trail history.',
      }
    }
  }

  // 6. Action proposals (Write operations)
  if (intent === 'ACTION_PROPOSAL') {
    if (normRole === 'viewer') {
      return {
        allowed: false,
        reason: 'Viewer accounts have read-only access and cannot propose operational modifications.',
      }
    }
  }

  return { allowed: true }
}

/**
 * Validates permission for specific write actions
 */
export function checkActionPermission(
  user: AIUserSessionContext,
  actionType: AIActionType
): PermissionCheckResult {
  const normRole = normalizeRole(user.role)

  if (normRole === 'superadmin') return { allowed: true }
  if (normRole === 'viewer') {
    return { allowed: false, reason: 'Viewer accounts are restricted to read-only access.' }
  }

  const extendedUser: ExtendedUser = {
    id: user.userId || 'usr-temp',
    username: user.username,
    name: user.name,
    role: user.role as any,
    status: 'active',
  }

  if (actionType === 'UPDATE_TRACKING') {
    const canTrack =
      hasPermission(extendedUser, 'tracking_update') ||
      normRole === 'operations' ||
      normRole === 'tracking' ||
      normRole === 'admin' ||
      normRole === 'management'
    if (!canTrack) {
      return { allowed: false, reason: 'You do not have permission to post tracking updates.' }
    }
  }

  if (actionType === 'CREATE_TASK') {
    if (normRole === 'client' || normRole === 'shipper') {
      return { allowed: false, reason: 'External portal users cannot assign internal tasks.' }
    }
  }

  if (actionType === 'PREPARE_DOCUMENT') {
    const canDoc =
      hasPermission(extendedUser, 'documents_create') ||
      hasPermission(extendedUser, 'documents_edit_draft') ||
      normRole === 'documents' ||
      normRole === 'operations' ||
      normRole === 'admin'
    if (!canDoc) {
      return { allowed: false, reason: 'You do not have permission to draft shipping documents.' }
    }
  }

  return { allowed: true }
}

/**
 * Strictly filters records for Customer Portal sessions so Customer A never sees Customer B data.
 */
export function filterCustomerPortalScope<T extends Record<string, any>>(
  user: AIUserSessionContext,
  records: T[],
  entityType: 'shipments' | 'containers' | 'invoices' | 'documents'
): T[] {
  if (!user.isClientUser && user.role !== 'client' && user.role !== 'shipper') {
    return records
  }

  const cid = user.clientId || ''
  const cname = user.clientName || ''

  if (!cid && !cname) {
    return [] // No assigned company -> zero records returned
  }

  if (entityType === 'shipments' || entityType === 'containers') {
    return records.filter((s: any) => {
      const ownership = isShipmentOwnedByCustomer(s, cid, cname)
      if (ownership.isOwner) return true
      const sName = (s.customerName || s.clientName || s.shipperName || s.receiverName || s.accountName || '').trim().toLowerCase()
      if (cname && sName && (sName === cname.toLowerCase() || sName.includes(cname.toLowerCase()) || cname.toLowerCase().includes(sName))) {
        return true
      }
      return false
    })
  }

  if (entityType === 'invoices') {
    return records.filter((inv: any) => {
      const bId = (inv.buyer_id || inv.buyerId || '').trim().toLowerCase()
      const bName = (inv.buyer_name || inv.buyerName || inv.clientName || '').trim().toLowerCase()
      const searchId = cid.toLowerCase()
      const searchName = cname.toLowerCase()
      return (
        (searchId && bId === searchId) ||
        (searchName && (bName === searchName || bName.includes(searchName) || searchName.includes(bName)))
      )
    })
  }

  if (entityType === 'documents') {
    return records.filter((d: any) => {
      // Must be released to client and owned by customer
      if (d.status !== 'RELEASED' && d.status !== 'COMPLETED' && !d.isReleasedToClient) {
        return false
      }
      const sName = (d.shipperName || d.accountName || '').trim().toLowerCase()
      return cname && (sName === cname.toLowerCase() || sName.includes(cname.toLowerCase()))
    })
  }

  return records
}

/**
 * Sanitizes records by stripping internal financial notes, profit margins, and supplier costs
 * if the user lacks explicit permissions.
 */
export function sanitizeRecordForAI<T extends Record<string, any>>(
  user: AIUserSessionContext,
  record: T
): T {
  if (!record || typeof record !== 'object') return record

  const extendedUser: ExtendedUser = {
    id: user.userId || 'usr-temp',
    username: user.username,
    name: user.name,
    role: user.role as any,
    status: 'active',
  }

  const showProfit = canViewProfit(extendedUser)
  const showCosts = canViewCosts(extendedUser)

  const sanitized = { ...record }

  if (!showProfit) {
    delete (sanitized as any).profit
    delete (sanitized as any).grossProfit
    delete (sanitized as any).netProfit
    delete (sanitized as any).gross_profit
    delete (sanitized as any).net_profit
    delete (sanitized as any).profitMargin
    delete (sanitized as any).profitMarginPercent
  }

  if (!showCosts) {
    delete (sanitized as any).supplierCost
    delete (sanitized as any).internalCost
    delete (sanitized as any).driverRentCost
    delete (sanitized as any).carrierFreightCost
    delete (sanitized as any).totalCost
    delete (sanitized as any).supplierBills
  }

  return sanitized
}
