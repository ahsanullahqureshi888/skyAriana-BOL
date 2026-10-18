import { NextResponse } from 'next/server'
import { routeLocationService, SEED_LOCATIONS } from '@/lib/services/route-location-service'
import { LocationRecord } from '@/lib/types/route-locations'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const country = searchParams.get('country')
    const query = searchParams.get('q')

    let locations = routeLocationService.getLocations()

    if (type && type !== 'ALL') {
      locations = locations.filter((l) => l.type === type)
    }

    if (country && country !== 'ALL') {
      locations = locations.filter((l) => l.countryCode === country)
    }

    if (query) {
      const q = query.trim().toLowerCase()
      locations = locations.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.unlocode && l.unlocode.toLowerCase().includes(q)) ||
          (l.iataCode && l.iataCode.toLowerCase().includes(q)) ||
          (l.aliases && l.aliases.some((a) => a.toLowerCase().includes(q)))
      )
    }

    return NextResponse.json({
      success: true,
      count: locations.length,
      data: locations,
    })
  } catch (error: any) {
    console.error('[API /api/locations GET] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Location name is required' },
        { status: 400 }
      )
    }

    const created = routeLocationService.createLocation(body)
    return NextResponse.json({
      success: true,
      data: created,
    })
  } catch (error: any) {
    console.error('[API /api/locations POST] Error:', error)
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
        { success: false, error: 'Location id is required for update' },
        { status: 400 }
      )
    }

    const updated = routeLocationService.updateLocation(body.id, body)
    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error: any) {
    console.error('[API /api/locations PUT] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
