import { NextRequest, NextResponse } from 'next/server'
import { warehouseCargoService } from '@/lib/services/warehouse-cargo-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')
    const customerId = searchParams.get('customerId')

    let receipts = warehouseCargoService.getReceipts()

    if (warehouseId && warehouseId !== 'all') {
      receipts = receipts.filter((r) => r.warehouseLocationId === warehouseId)
    }
    if (customerId) {
      receipts = receipts.filter((r) => r.customerId === customerId)
    }

    return NextResponse.json({
      success: true,
      count: receipts.length,
      data: receipts,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.warehouseLocationId || !body.customerName || !body.commodity || !body.totalPackages) {
      return NextResponse.json(
        {
          success: false,
          error: 'Required fields: warehouseLocationId, customerName, commodity, totalPackages',
        },
        { status: 400 }
      )
    }

    const result = warehouseCargoService.createReceipt(body)
    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
