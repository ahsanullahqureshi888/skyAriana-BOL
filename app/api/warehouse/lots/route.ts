import { NextRequest, NextResponse } from 'next/server'
import { warehouseCargoService } from '@/lib/services/warehouse-cargo-service'
import { CargoLotRecord } from '@/lib/types/warehouse-cargo'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status')

    let lots: CargoLotRecord[] = warehouseCargoService.getLots()

    if (warehouseId && warehouseId !== 'all') {
      lots = lots.filter((l: CargoLotRecord) => l.warehouseLocationId === warehouseId)
    }
    if (customerId) {
      lots = lots.filter((l: CargoLotRecord) => l.customerId === customerId)
    }
    if (status) {
      lots = lots.filter((l: CargoLotRecord) => l.status === status)
    }

    return NextResponse.json({
      success: true,
      count: lots.length,
      data: lots,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'allocate') {
      const { cargoLotId, shipmentId, bolNumber, quantity } = body
      if (!cargoLotId || !bolNumber || !quantity) {
        return NextResponse.json(
          { success: false, error: 'Missing cargoLotId, bolNumber, or quantity' },
          { status: 400 }
        )
      }
      const res = warehouseCargoService.allocateCargo(cargoLotId, shipmentId || '', bolNumber, quantity)
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, data: res.lot })
    }

    if (action === 'adjust') {
      const { cargoLotId, adjustmentQuantity, reason, authorizedUser } = body
      if (!cargoLotId || adjustmentQuantity === undefined || !reason) {
        return NextResponse.json(
          { success: false, error: 'Missing cargoLotId, adjustmentQuantity, or reason' },
          { status: 400 }
        )
      }
      const res = warehouseCargoService.executeStockAdjustment(
        cargoLotId,
        adjustmentQuantity,
        reason,
        authorizedUser || 'Warehouse Manager'
      )
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, data: res.lot })
    }

    if (action === 'repack') {
      const record = warehouseCargoService.executeRepacking(body)
      return NextResponse.json({ success: true, data: record })
    }

    if (action === 'damage') {
      const report = warehouseCargoService.recordDamage(body)
      return NextResponse.json({ success: true, data: report })
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
