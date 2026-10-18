import { NextRequest, NextResponse } from "next/server"
import { verifyClerkRequest, ClerkAuthUser } from "./clerk-guard"
import { createClient } from "@/lib/supabase/server"

export interface CloudAuthSession {
  user: ClerkAuthUser | any
  provider: "clerk" | "supabase" | "local"
}

/**
 * Universal Server-Side Cloud Auth Guard for Next.js Route Handlers.
 * - If CLERK_SECRET_KEY is present: enforces Clerk authentication.
 * - If SUPABASE keys are present (and Clerk is not): enforces Supabase authentication.
 * - If neither is present: allows local desktop / Electron offline operation.
 * 
 * Returns a Response (401/403/500) if unauthorized, or null if authorized.
 */
export async function requireCloudAuth(
  request: Request | NextRequest,
  options?: { requiredRole?: string; allowLocalDesktop?: boolean }
): Promise<NextResponse | null> {
  // 1. Clerk Authentication (Highest Priority)
  if (process.env.CLERK_SECRET_KEY) {
    const clerkResult = await verifyClerkRequest(request, options)
    if (!clerkResult.isAuthenticated || !clerkResult.user) {
      return NextResponse.json(
        {
          error: clerkResult.error || "Unauthorized",
          code: "CLERK_UNAUTHORIZED",
        },
        { status: clerkResult.status || 401 }
      )
    }
    return null // Authorized
  }

  // 2. Supabase Authentication
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        return NextResponse.json(
          { error: "Unauthorized", code: "SUPABASE_UNAUTHORIZED" },
          { status: 401 }
        )
      }
      return null // Authorized
    } catch (err: any) {
      console.error("[auth-guard] Supabase auth check error:", err)
      return NextResponse.json(
        { error: "Authentication verification failed", code: "AUTH_ERROR" },
        { status: 401 }
      )
    }
  }

  // 3. Local Desktop / Offline Fallback (No cloud keys configured)
  return null
}
