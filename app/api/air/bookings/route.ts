import { NextResponse } from 'next/server'
import { airFreightStore } from '@/lib/services/air-freight-service'

export async function GET() {
  try {
    const store = airFreightStore
    const board = store.getShipmentBoardItems()
    const kpis = store.getSummaryKpis()
    return NextResponse.json({ success: true, count: board.length, kpis, data: board })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const store = airFreightStore

    if (body.action === 'OFFLOAD') {
      const result = store.recordOffload({
        bookingId: body.bookingId,
        originalFlightNumber: body.originalFlightNumber,
        offloadAirportIata: body.offloadAirportIata,
        offloadAirportName: body.offloadAirportName,
        reason: body.reason,
        detailedReason: body.detailedReason,
        rebookedFlightNumber: body.rebookedFlightNumber,
        rebookedDate: body.rebookedDate,
        recordedBy: body.recordedBy || 'Air Operations API',
      })
      return NextResponse.json({ success: true, data: result })
    }

    if (body.action === 'ACCEPTANCE') {
      const result = store.recordCargoAcceptance(body.data)
      return NextResponse.json({ success: true, data: result })
    }

    if (body.action === 'RELEASE') {
      const result = store.updateReleaseTracker(body.releaseId, body.updates)
      return NextResponse.json({ success: true, data: result })
    }

    // Default: save booking
    const saved = store.saveBooking(body)
    return NextResponse.json({ success: true, data: saved })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
