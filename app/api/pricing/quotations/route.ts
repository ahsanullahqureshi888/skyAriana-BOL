import { NextResponse } from 'next/server'
import { freightPricingService } from '@/lib/services/freight-pricing-service'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const customer = searchParams.get('customer')
    const query = searchParams.get('q')

    let quotes = freightPricingService.getQuotations()

    if (status && status !== 'ALL') {
      quotes = quotes.filter((q) => q.status === status)
    }

    if (customer) {
      quotes = quotes.filter((q) => q.customerName.toLowerCase().includes(customer.toLowerCase()))
    }

    if (query) {
      const q = query.trim().toLowerCase()
      quotes = quotes.filter(
        (qt) =>
          qt.quotationNumber.toLowerCase().includes(q) ||
          qt.customerName.toLowerCase().includes(q) ||
          qt.originName.toLowerCase().includes(q) ||
          qt.destinationName.toLowerCase().includes(q)
      )
    }

    // Customer-safe flag: If requested by client portal or external integration, scrub internal costs!
    const isCustomerSafe = searchParams.get('customerSafe') === 'true'
    if (isCustomerSafe) {
      quotes = quotes.map((q) => ({
        ...q,
        totalBuyCost: 0,
        estimatedGrossMargin: 0,
        marginPercentage: 0,
        internalNotes: undefined,
        pricingLines: q.pricingLines.map((l) => ({
          ...l,
          buyAmount: 0,
        })),
      }))
    }

    return NextResponse.json({
      success: true,
      count: quotes.length,
      data: quotes,
    })
  } catch (error: any) {
    console.error('[API /api/pricing/quotations GET] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.customerName || !body.pricingLines) {
      return NextResponse.json(
        { success: false, error: 'Customer name and pricingLines are required' },
        { status: 400 }
      )
    }

    const created = freightPricingService.createQuotation(body)
    return NextResponse.json({
      success: true,
      data: created,
    })
  } catch (error: any) {
    console.error('[API /api/pricing/quotations POST] Error:', error)
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
        { success: false, error: 'Quotation id is required for update' },
        { status: 400 }
      )
    }

    const updated = freightPricingService.updateQuotation(body.id, body)
    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error: any) {
    console.error('[API /api/pricing/quotations PUT] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
