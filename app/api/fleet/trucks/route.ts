import { NextRequest, NextResponse } from 'next/server'
import { fleetOperationsService } from '@/lib/services/fleet-operations-service'
import { TruckRecord } from '@/lib/types/fleet-operations'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as any
    const country = searchParams.get('country') as any
    const search = searchParams.get('search') || undefined

    const trucks = fleetOperationsService.getTrucks({ status, country, search })
    return NextResponse.json({ success: true, count: trucks.length, data: trucks })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: TruckRecord = await request.json()
    if (!body.plateNumber) {
      return NextResponse.json({ success: false, error: 'License plate number is required' }, { status: 400 })
    }

    const saved = fleetOperationsService.saveTruck(body)
    return NextResponse.json({ success: true, data: saved }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: TruckRecord = await request.json()
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'Truck ID is required' }, { status: 400 })
    }

    const saved = fleetOperationsService.saveTruck(body)
    return NextResponse.json({ success: true, data: saved })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
