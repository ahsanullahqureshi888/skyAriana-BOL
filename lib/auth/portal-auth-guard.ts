import { NextRequest, NextResponse } from "next/server"
import { verifySessionToken } from "@/lib/services/customer-portal-storage"
import type { CustomerPortalSession } from "@/lib/types/customer-portal"

export function getPortalSessionFromRequest(request: Request | NextRequest): CustomerPortalSession | null {
  const authHeader = request.headers.get("authorization") || ""
  let token = ""

  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim()
  } else {
    const cookieHeader = request.headers.get("cookie") || ""
    const match = cookieHeader.match(/portal_session=([^;]+)/)
    if (match && match[1]) {
      token = match[1].trim()
    }
  }

  if (!token) return null
  return verifySessionToken(token)
}

/**
 * Route middleware wrapper to enforce authenticated Customer Portal session.
 */
export function requirePortalSession(
  request: Request | NextRequest
): { session: CustomerPortalSession } | { errorResponse: NextResponse } {
  const session = getPortalSessionFromRequest(request)
  if (!session) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: "Unauthorized: Please log in to your customer portal" },
        { status: 401 }
      ),
    }
  }
  return { session }
}
