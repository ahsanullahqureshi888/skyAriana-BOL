import { NextRequest, NextResponse } from "next/server"

export interface ClerkAuthUser {
  id: string
  email?: string
  orgId?: string
  orgRole?: string
  isLocal: boolean
  claims?: Record<string, any>
}

export interface ClerkAuthResult {
  isAuthenticated: boolean
  user?: ClerkAuthUser
  error?: string
  status?: number
}

export interface ClerkGuardOptions {
  requiredRole?: string
  allowLocalDesktop?: boolean
}

/**
 * Verifies authentication via Clerk Backend REST API or local desktop fallback.
 */
export async function verifyClerkRequest(
  request: Request | NextRequest,
  options: ClerkGuardOptions = { allowLocalDesktop: true }
): Promise<ClerkAuthResult> {
  const secretKey = process.env.CLERK_SECRET_KEY

  // Extract token from Authorization header or cookie
  const authHeader = request.headers.get("authorization") || ""
  let token = ""

  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim()
  } else {
    // Check for Clerk __session cookie
    const cookieHeader = request.headers.get("cookie") || ""
    const match = cookieHeader.match(/__session=([^;]+)/)
    if (match && match[1]) {
      token = match[1].trim()
    }
  }

  // If no Clerk secret key is configured in the environment
  if (!secretKey) {
    if (options.allowLocalDesktop) {
      // Local Desktop / Electron offline mode fallback
      return {
        isAuthenticated: true,
        user: {
          id: "local-desktop-operator",
          email: "desktop@skyariana.local",
          orgId: "org-local-primary",
          orgRole: "org:admin",
          isLocal: true,
        },
      }
    }
    return {
      isAuthenticated: false,
      error: "Clerk authentication is not configured on server (missing CLERK_SECRET_KEY)",
      status: 500,
    }
  }

  // If token is missing
  if (!token) {
    // In local development or Electron desktop environment without an active cloud session
    const host = request.headers.get("host") || ""
    const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1")
    if (isLocalhost && options.allowLocalDesktop) {
      return {
        isAuthenticated: true,
        user: {
          id: "local-desktop-operator",
          email: "desktop@skyariana.local",
          orgId: "org-local-primary",
          orgRole: "org:admin",
          isLocal: true,
        },
      }
    }

    return {
      isAuthenticated: false,
      error: "Missing authorization token",
      status: 401,
    }
  }

  // Verify token against Clerk Backend API
  try {
    // Decode and verify session token or authenticate against Clerk API
    const verifyRes = await fetch("https://api.clerk.com/v1/client/verify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    })

    if (!verifyRes.ok) {
      // Fallback: Verify as session token
      const sessionRes = await fetch(`https://api.clerk.com/v1/sessions/${token}/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      })

      if (!sessionRes.ok) {
        return {
          isAuthenticated: false,
          error: "Invalid or expired Clerk session token",
          status: 401,
        }
      }

      const sessionData = await sessionRes.json()
      return {
        isAuthenticated: true,
        user: {
          id: sessionData.user_id,
          orgId: sessionData.last_active_organization_id,
          orgRole: sessionData.actor?.role || "org:member",
          isLocal: false,
          claims: sessionData,
        },
      }
    }

    const clientData = await verifyRes.json()
    const activeSession = clientData.sessions?.find((s: any) => s.status === "active") || clientData.sessions?.[0]
    
    if (!activeSession) {
      return {
        isAuthenticated: false,
        error: "No active session associated with token",
        status: 401,
      }
    }

    // Role check if required
    const userRole = activeSession.actor?.role || "org:member"
    if (options.requiredRole && userRole !== options.requiredRole && userRole !== "org:admin") {
      return {
        isAuthenticated: false,
        error: `Forbidden: requires ${options.requiredRole} privileges`,
        status: 403,
      }
    }

    return {
      isAuthenticated: true,
      user: {
        id: activeSession.user_id,
        orgId: activeSession.last_active_organization_id,
        orgRole: userRole,
        isLocal: false,
        claims: activeSession,
      },
    }
  } catch (err: any) {
    console.error("[clerk-guard] Verification error:", err)
    return {
      isAuthenticated: false,
      error: "Authentication service error",
      status: 500,
    }
  }
}

/**
 * Higher-order Route Handler wrapper with Clerk authentication and role enforcement
 */
export function withClerkGuard(
  handler: (req: NextRequest, user: ClerkAuthUser) => Promise<NextResponse>,
  options?: ClerkGuardOptions
) {
  return async function (request: NextRequest) {
    const authResult = await verifyClerkRequest(request, options)

    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized", code: "CLERK_UNAUTHORIZED" },
        { status: authResult.status || 401 }
      )
    }

    return handler(request, authResult.user)
  }
}

/**
 * Clerk Backend API Client Helper for Fast-Path Operations
 */
export class ClerkBackendClient {
  private secretKey: string

  constructor(secretKey?: string) {
    this.secretKey = secretKey || process.env.CLERK_SECRET_KEY || ""
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.secretKey) {
      throw new Error("CLERK_SECRET_KEY is not configured")
    }

    const res = await fetch(`https://api.clerk.com/v1${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.errors?.[0]?.message || `Clerk API error: ${res.status}`)
    }
    return data as T
  }

  async listUsers(params: { limit?: number; offset?: number } = {}) {
    const query = new URLSearchParams()
    if (params.limit) query.set("limit", String(params.limit))
    if (params.offset) query.set("offset", String(params.offset))
    return this.request(`/users?${query.toString()}`)
  }

  async getUser(userId: string) {
    return this.request(`/users/${userId}`)
  }

  async listOrganizations(params: { limit?: number; offset?: number } = {}) {
    const query = new URLSearchParams()
    if (params.limit) query.set("limit", String(params.limit))
    if (params.offset) query.set("offset", String(params.offset))
    return this.request(`/organizations?${query.toString()}`)
  }

  async createOrganization(name: string, createdBy: string) {
    return this.request(`/organizations`, {
      method: "POST",
      body: JSON.stringify({ name, created_by: createdBy }),
    })
  }

  async inviteMember(organizationId: string, emailAddress: string, role: "org:admin" | "org:member" = "org:member") {
    return this.request(`/organizations/${organizationId}/invitations`, {
      method: "POST",
      body: JSON.stringify({ email_address: emailAddress, role }),
    })
  }

  async updateUserPublicMetadata(userId: string, metadata: Record<string, any>) {
    // Safe spread: fetch existing metadata first to prevent overwrite
    const user = await this.getUser(userId)
    const existing = user.public_metadata || {}
    return this.request(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({
        public_metadata: {
          ...existing,
          ...metadata,
        },
      }),
    })
  }
}
