/**
 * Server-Side Search Permissions & Tenant Isolation Gate
 * Sky Ariana Multi-Modal Logistics & Financial Suite
 */

import type { User, ExtendedUser } from "@/lib/rbac/rbac-types"
import type { SearchResultItem } from "./search-types"
import { hasPermission, canViewProfit, canViewCosts, normalizeRole } from "@/lib/rbac/rbac-service"
import { normalizeCompanyName } from "./search-normalizer"

export interface SearchSecurityContext {
  user?: ExtendedUser | User | null
  isClient: boolean
  authorizedClientId?: string
  authorizedCompanyName?: string
  canViewAccounting: boolean
  canViewCosts: boolean
  canViewProfit: boolean
}

/**
 * Builds a search security context from user profile
 */
export function buildSearchSecurityContext(user?: ExtendedUser | User | null): SearchSecurityContext {
  if (!user) {
    // Default safe guest / viewer context
    return {
      user: null,
      isClient: false,
      canViewAccounting: false,
      canViewCosts: false,
      canViewProfit: false,
    }
  }

  const role = normalizeRole(user.role)
  const isClient = role === "client" || role === "shipper"

  return {
    user,
    isClient,
    authorizedClientId: (user as ExtendedUser).clientId || (user as any).client_id,
    authorizedCompanyName: (user as ExtendedUser).clientName || (user as any).client_name,
    canViewAccounting: !isClient && (hasPermission(user, "accounting_view") || hasPermission(user, "ledger_view") || role === "superadmin" || role === "admin"),
    canViewCosts: !isClient && canViewCosts(user),
    canViewProfit: !isClient && canViewProfit(user),
  }
}

/**
 * Enforces server-side permissions and client portal tenant isolation on search results.
 */
export function filterResultsByPermission(
  results: SearchResultItem[],
  context: SearchSecurityContext
): SearchResultItem[] {
  const { isClient, authorizedClientId, authorizedCompanyName, canViewAccounting, canViewCosts: allowCosts, canViewProfit: allowProfit } = context

  return results.filter((item) => {
    // -----------------------------------------------------------------
    // 1. Client Portal Tenant Isolation
    // -----------------------------------------------------------------
    if (isClient) {
      // Client can only search BOLs, containers, invoices, documents, and tracking
      const allowedClientTypes = ["bol", "shipment", "container", "invoice", "document", "tracking"]
      if (!allowedClientTypes.includes(item.type)) {
        return false
      }

      // Must match authorized client ID or company name
      const meta = item.metadata || {}
      const targetClientId = meta.clientId || meta.client_id
      const conn = item.connectedSummary

      const targetNames = [
        meta.clientName,
        meta.client_name,
        meta.companyName,
        meta.company_name,
        meta.shipper_name,
        meta.shipperName,
        typeof meta.shipper === "string" ? meta.shipper : meta.shipper?.name,
        meta.consignee_name,
        meta.consigneeName,
        typeof meta.consignee === "string" ? meta.consignee : meta.consignee?.name,
        meta.recipientName,
        meta.buyer_name,
        meta.buyerName,
        conn?.shipperName,
        conn?.consigneeName,
      ].filter(Boolean) as string[]

      if (authorizedClientId && targetClientId) {
        if (targetClientId !== authorizedClientId) return false
      } else if (authorizedCompanyName) {
        const normAuth = normalizeCompanyName(authorizedCompanyName)
        const hasMatch = targetNames.some((n) => {
          const normN = normalizeCompanyName(n)
          return normN.includes(normAuth) || normAuth.includes(normN)
        })
        if (!hasMatch) return false
      } else {
        // If client has no bound company/id, deny access for safety
        return false
      }
    }

    // -----------------------------------------------------------------
    // 2. Financial & Accounting Permission Gate
    // -----------------------------------------------------------------
    if (!canViewAccounting && !isClient) {
      if (item.type === "invoice" || item.type === "ledger" || item.type === "payment" || item.type === "supplier") {
        return false
      }
    }

    return true
  }).map((item) => sanitizeResultItemFinancials(item, allowCosts, allowProfit))
}

/**
 * Sanitizes financial values in search result item based on user role
 */
function sanitizeResultItemFinancials(
  item: SearchResultItem,
  allowCosts: boolean,
  allowProfit: boolean
): SearchResultItem {
  if (allowCosts && allowProfit) return item

  const cloned = structuredClone(item)
  const meta = cloned.metadata || {}
  const summary = cloned.connectedSummary || {}

  // Strip profit and margin
  if (!allowProfit) {
    delete meta.profit
    delete meta.profitOrLoss
    delete meta.margin
    delete meta.marginPercentage
    if (summary) {
      delete (summary as any).profit
      delete (summary as any).profitOrLoss
    }
  }

  // Strip internal supplier costs
  if (!allowCosts) {
    delete meta.supplierCost
    delete meta.driverRent
    delete meta.driverFreight
    delete meta.truckFreight
    delete meta.supplierOutstanding
    if (summary) {
      delete (summary as any).supplierCost
      delete (summary as any).driverRent
    }
  }

  cloned.metadata = meta
  cloned.connectedSummary = summary
  return cloned
}
