import { NextResponse } from 'next/server'
import { routeLocationService } from '@/lib/services/route-location-service'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode')
    const query = searchParams.get('q')

    let routes = routeLocationService.getRoutes()

    if (mode && mode !== 'ALL') {
      routes = routes.filter((r) => r.transitMode === mode)
    }

    if (query) {
      const q = query.trim().toLowerCase()
      routes = routes.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          (r.namePersian && r.namePersian.toLowerCase().includes(q))
      )
    }

    return NextResponse.json({
      success: true,
      count: routes.length,
      data: routes,
    })
  } catch (error: any) {
    console.error('[API /api/routes GET] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.name || !body.legs || !Array.isArray(body.legs)) {
      return NextResponse.json(
        { success: false, error: 'Route name and legs array are required' },
        { status: 400 }
      )
    }

    const created = routeLocationService.createRoute(body)
    return NextResponse.json({
      success: true,
      data: created,
    })
  } catch (error: any) {
    console.error('[API /api/routes POST] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Route id is required for update' },
        { status: 400 }
      )
    }

    const updated = routeLocationService.updateRoute(body.id, body)
    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error: any) {
    console.error('[API /api/routes PUT] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
