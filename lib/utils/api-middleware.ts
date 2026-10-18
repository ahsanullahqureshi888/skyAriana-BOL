import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { verifyClerkRequest, ClerkAuthUser } from '@/lib/auth/clerk-guard'

/**
 * Middleware to check authentication on API routes (Supports Clerk & Local Fallback)
 */
export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest, user: ClerkAuthUser | any) => Promise<NextResponse>,
  options?: { requiredRole?: string; allowLocalDesktop?: boolean }
) {
  try {
    // 1. Prioritize Clerk Authentication if configured or local desktop mode
    if (process.env.CLERK_SECRET_KEY) {
      const clerkAuth = await verifyClerkRequest(request, options)
      if (!clerkAuth.isAuthenticated || !clerkAuth.user) {
        return NextResponse.json(
          { error: clerkAuth.error || 'Unauthorized', code: 'CLERK_UNAUTHORIZED' },
          { status: clerkAuth.status || 401 }
        )
      }
      return handler(request, clerkAuth.user)
    }

    // 2. Legacy Supabase auth check if Supabase keys exist
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = await createClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      return handler(request, user)
    }

    // 3. Local Desktop / Offline fallback
    const localUser: ClerkAuthUser = {
      id: 'local-desktop-operator',
      email: 'desktop@skyariana.local',
      orgId: 'org-local-primary',
      orgRole: 'org:admin',
      isLocal: true,
    }
    return handler(request, localUser)
  } catch (error) {
    console.error('[api-middleware] Authentication error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Parse request body safely
 */
export async function parseRequestBody(request: NextRequest) {
  try {
    const body = await request.json()
    return body
  } catch {
    throw new Error('Invalid request body')
  }
}

/**
 * Get query parameter from request
 */
export function getQueryParam(request: NextRequest, param: string): string | null {
  const { searchParams } = new URL(request.url)
  return searchParams.get(param)
}

/**
 * Get all query parameters from request
 */
export function getQueryParams(request: NextRequest): Record<string, string> {
  const { searchParams } = new URL(request.url)
  const params: Record<string, string> = {}
  
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  
  return params
}
