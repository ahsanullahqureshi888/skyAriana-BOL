import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const host = request.nextUrl.hostname
  const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1'
  const isCloudDeployment = Boolean(
    process.env.VERCEL ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    host.endsWith('.vercel.app')
  )
  const pathname = request.nextUrl.pathname

  // Cloud deployments (e.g. Vercel) and localhost bypass local office LAN pairing checks
  if (isCloudDeployment || isLocalhost) {
    if (pathname === '/lan-auth') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Allow static assets, images, Next.js internals, and Auth/Pairing APIs
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/fonts/') ||
    /^\/[^/]+\.(?:png|jpg|jpeg|svg|ico|webp|css|js|webmanifest)$/.test(pathname) ||
    pathname === '/manifest.json' ||
    pathname === '/api/health' ||
    pathname === '/api/server/auth/login' ||
    pathname === '/api/server/auth/verify' ||
    pathname === '/api/server/pairing' ||
    (pathname === '/api/server/admin/setup' && request.method === 'GET') ||
    // Customer APIs authenticate their own customer sessions, not LAN sessions.
    pathname === '/client' || pathname.startsWith('/client/') ||
    pathname.startsWith('/api/client/') ||
    (pathname.startsWith('/api/portal/') && !pathname.startsWith('/api/portal/admin/'))
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get('sky_auth_token')?.value
  
  if (!token) {
    // Redirect unauthenticated LAN users to pairing screen
    if (!pathname.startsWith('/api/') && pathname !== '/lan-auth') {
      return NextResponse.redirect(new URL('/lan-auth', request.url))
    }
    // Block unauthorized API requests
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized LAN Access. Please pair device.' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Token exists, verify it by making a fast internal call to our verify endpoint
  try {
    const verifyUrl = new URL('/api/server/auth/verify', request.nextUrl.origin)
    const res = await fetch(verifyUrl, {
      headers: { Cookie: `sky_auth_token=${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    
    if (!res.ok) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Invalid LAN session' }, { status: 401 })
      }
      if (pathname !== '/lan-auth') {
        const response = NextResponse.redirect(new URL('/lan-auth', request.url))
        response.cookies.delete('sky_auth_token')
        return response
      }
    } else {
      // Valid token, if they are on /lan-auth, redirect to home
      if (pathname === '/lan-auth') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  } catch (err) {
    // If fetch fails (server booting), fail closed for APIs
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Verification service unavailable' }, { status: 503 })
    }
    if (pathname !== '/lan-auth') {
      return NextResponse.redirect(new URL('/lan-auth', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/).*)'],
}
