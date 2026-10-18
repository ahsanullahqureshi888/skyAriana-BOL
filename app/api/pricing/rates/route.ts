import { NextResponse } from 'next/server'
import { freightPricingService } from '@/lib/services/freight-pricing-service'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const container = searchParams.get('container')
    const customerId = searchParams.get('customerId')
    const query = searchParams.get('q')

    let rates = freightPricingService.getRates()

    if (container && container !== 'ALL') {
      rates = rates.filter((r) => r.containerType === container)
    }

    if (customerId) {
      rates = rates.filter((r) => !r.customerId || r.customerId === customerId)
    }

    if (query) {
      const q = query.trim().toLowerCase()
      rates = rates.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.rateCode.toLowerCase().includes(q) ||
          r.originName.toLowerCase().includes(q) ||
          r.destinationName.toLowerCase().includes(q)
      )
    }

    return NextResponse.json({
      success: true,
      count: rates.length,
      data: rates,
    })
  } catch (error: any) {
    console.error('[API /api/pricing/rates GET] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.name || !body.baseSellRate) {
      return NextResponse.json(
        { success: false, error: 'Rate name and baseSellRate are required' },
        { status: 400 }
      )
    }

    const created = freightPricingService.createRate(body)
    return NextResponse.json({
      success: true,
      data: created,
    })
  } catch (error: any) {
    console.error('[API /api/pricing/rates POST] Error:', error)
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
        { success: false, error: 'Rate id is required for update' },
        { status: 400 }
      )
    }

    const updated = freightPricingService.updateRate(body.id, body)
    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error: any) {
    console.error('[API /api/pricing/rates PUT] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
