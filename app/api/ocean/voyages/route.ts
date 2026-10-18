import { NextResponse } from 'next/server'
import { OceanVesselStore } from '@/lib/services/ocean-vessel-service'

export async function GET() {
  try {
    const store = OceanVesselStore.getInstance()
    const voyages = store.getVoyages()
    return NextResponse.json({ success: true, count: voyages.length, data: voyages })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const store = OceanVesselStore.getInstance()

    if (body.action === 'UPDATE_SCHEDULE') {
      const result = store.updateVoyageSchedule(
        body.voyageId,
        body.newEtd,
        body.newEta,
        body.reason || 'Schedule update',
        body.changedBy || 'Operations Lead',
        body.source || 'SHIPPING_LINE'
      )
      return NextResponse.json(result)
    }

    if (body.action === 'RECORD_DEPARTURE') {
      const result = store.recordVesselActualDeparture(body.voyageId, body.actualDeparture, body.notes)
      return NextResponse.json(result)
    }

    if (body.action === 'RECORD_ARRIVAL') {
      const result = store.recordVesselActualArrival(body.voyageId, body.actualArrival, body.notes)
      return NextResponse.json(result)
    }

    const result = store.saveVoyage(body)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
