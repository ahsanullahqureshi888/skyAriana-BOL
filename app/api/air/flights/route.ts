import { NextResponse } from 'next/server'
import { airFreightStore } from '@/lib/services/air-freight-service'

export async function GET() {
  try {
    const store = airFreightStore
    const flights = store.getFlights()
    return NextResponse.json({ success: true, count: flights.length, data: flights })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const store = airFreightStore

    if (body.action === 'UPDATE_STATUS') {
      const flight = store.updateFlightStatus(
        body.flightId,
        body.status,
        body.actualTime,
        body.notes
      )
      return NextResponse.json({ success: true, data: flight })
    }

    const saved = store.saveFlight(body)
    return NextResponse.json({ success: true, data: saved })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
