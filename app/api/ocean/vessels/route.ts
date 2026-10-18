import { NextResponse } from 'next/server'
import { OceanVesselStore } from '@/lib/services/ocean-vessel-service'
import { VesselRecord } from '@/lib/types/ocean-vessel'

export async function GET() {
  try {
    const store = OceanVesselStore.getInstance()
    const vessels = store.getVessels()
    return NextResponse.json({ success: true, count: vessels.length, data: vessels })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body: VesselRecord = await req.json()
    const store = OceanVesselStore.getInstance()
    const result = store.saveVessel(body)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
