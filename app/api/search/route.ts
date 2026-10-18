import { NextResponse } from "next/server"
import { globalSearch } from "@/lib/search/global-search-service"
import type { ExtendedUser, StaffRole } from "@/lib/rbac/rbac-types"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""
    const category = searchParams.get("category") || undefined
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined

    // Extract authentication & role context from headers if provided
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

    const searchResult = await globalSearch(query, user, {
      category,
      limit,
      strictClientIsolation: userRole === "client" || userRole === "shipper",
      authorizedClientId: clientId,
      authorizedCompanyName: clientName,
    })

    return NextResponse.json(searchResult)
  } catch (error: any) {
    console.error("[api/search] Error executing global search:", error)
    return NextResponse.json(
      { error: "Failed to execute global search", message: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
