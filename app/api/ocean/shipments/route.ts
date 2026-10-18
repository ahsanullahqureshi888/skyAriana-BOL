import { NextResponse } from 'next/server'
import { OceanVesselStore } from '@/lib/services/ocean-vessel-service'

export async function GET() {
  try {
    const store = OceanVesselStore.getInstance()
    const board = store.getShipmentBoard()
    const kpis = store.getSummaryKpis()
    return NextResponse.json({ success: true, count: board.length, kpis, data: board })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const store = OceanVesselStore.getInstance()

    if (body.action === 'RECORD_LOAD') {
      const result = store.recordContainerLoad(
        body.bookingId,
        body.containerNumber,
        body.vesselName,
        body.voyageNumber,
        body.port,
        body.date
      )
      return NextResponse.json(result)
    }

    if (body.action === 'RECORD_DISCHARGE') {
      const result = store.recordContainerDischarge(
        body.bookingId,
        body.containerNumber,
        body.port,
        body.date
      )
      return NextResponse.json(result)
    }

    if (body.action === 'ROLLOVER') {
      const result = store.recordRollover(body)
      return NextResponse.json(result)
    }

    if (body.action === 'ASSIGN_LEG') {
      const result = store.saveOceanLeg(body.leg)
      return NextResponse.json(result)
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
