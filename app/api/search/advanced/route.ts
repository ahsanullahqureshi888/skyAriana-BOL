import { NextResponse } from "next/server"
import { globalSearch } from "@/lib/search/global-search-service"
import type { AdvancedSearchFilters, SearchResultItem } from "@/lib/search/search-types"
import type { ExtendedUser, StaffRole } from "@/lib/rbac/rbac-types"

export async function POST(request: Request) {
  try {
    const filters: AdvancedSearchFilters = await request.json()
    const query = filters.query || ""
    const page = Math.max(1, filters.page || 1)
    const limit = Math.min(100, Math.max(5, filters.limit || 20))

    const userRole = (request.headers.get("x-user-role") || "admin") as StaffRole
    const userId = request.headers.get("x-user-id") || "staff"
    const userName = request.headers.get("x-user-name") || "Staff User"
    const clientId = request.headers.get("x-client-id") || undefined
    const clientName = request.headers.get("x-client-name") || undefined

    const user: ExtendedUser = {
      id: userId,
      username: userId,
      name: userName,
      role: userRole,
      status: "active",
      clientId,
      clientName,
    }

    // Run global search with broad query or default wildcard
    const baseResponse = await globalSearch(query || " ", user, {
      category: filters.recordType !== "all" ? filters.recordType : undefined,
      strictClientIsolation: userRole === "client" || userRole === "shipper",
      authorizedClientId: clientId,
      authorizedCompanyName: clientName,
    })

    let filtered = baseResponse.results

    // Apply specific advanced filters
    if (filters.recordType && filters.recordType !== "all") {
      filtered = filtered.filter((r) => r.type === filters.recordType)
    }

    if (filters.status && filters.status !== "all") {
      const sLower = filters.status.toLowerCase()
      filtered = filtered.filter((r) => {
        const itemStatus = (r.badgeText || r.metadata?.status || "").toLowerCase()
        return itemStatus.includes(sLower)
      })
    }

    if (filters.companyName) {
      const cLower = filters.companyName.toLowerCase()
      filtered = filtered.filter((r) => {
        const text = `${r.title} ${r.subtitle} ${r.connectedSummary?.shipperName || ""} ${r.connectedSummary?.consigneeName || ""}`.toLowerCase()
        return text.includes(cLower)
      })
    }

    if (filters.commodity) {
      const comLower = filters.commodity.toLowerCase()
      filtered = filtered.filter((r) => {
        const text = `${r.subtitle} ${r.metadata?.cargo_description || ""} ${r.metadata?.commodity || ""}`.toLowerCase()
        return text.includes(comLower)
      })
    }

    if (filters.route) {
      const rLower = filters.route.toLowerCase()
      filtered = filtered.filter((r) => {
        const text = `${r.subtitle} ${r.metadata?.route || ""} ${r.connectedSummary?.currentLocation || ""}`.toLowerCase()
        return text.includes(rLower)
      })
    }

    // Amount range filtering for financial records
    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      filtered = filtered.filter((r) => {
        const amount = Number(r.metadata?.total_amount || r.metadata?.amount || r.connectedSummary?.invoiceTotal || 0)
        if (filters.minAmount !== undefined && amount < filters.minAmount) return false
        if (filters.maxAmount !== undefined && amount > filters.maxAmount) return false
        return true
      })
    }

    // Date range filtering
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter((r) => {
        const dateStr = r.metadata?.issue_date || r.metadata?.invoice_date || r.metadata?.created_at || r.metadata?.paymentDate || ""
        if (!dateStr) return true
        const recordDate = new Date(dateStr).getTime()
        if (filters.dateFrom && recordDate < new Date(filters.dateFrom).getTime()) return false
        if (filters.dateTo && recordDate > new Date(filters.dateTo).getTime()) return false
        return true
      })
    }

    const totalMatches = filtered.length
    const totalPages = Math.ceil(totalMatches / limit) || 1
    const offset = (page - 1) * limit
    const paginatedResults = filtered.slice(offset, offset + limit)

    return NextResponse.json({
      results: paginatedResults,
      pagination: {
        page,
        limit,
        totalMatches,
        totalPages,
      },
      categoryCounts: baseResponse.categoryCounts,
    })
  } catch (error: any) {
    console.error("[api/search/advanced] Error in advanced search:", error)
    return NextResponse.json(
      { error: "Failed to perform advanced search", message: error?.message },
      { status: 500 }
    )
  }
}
