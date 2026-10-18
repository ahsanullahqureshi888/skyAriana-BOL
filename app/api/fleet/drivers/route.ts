import { NextRequest, NextResponse } from 'next/server'
import { fleetOperationsService } from '@/lib/services/fleet-operations-service'
import { DriverRecord } from '@/lib/types/fleet-operations'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as any
    const country = searchParams.get('country') || undefined
    const search = searchParams.get('search') || undefined

    const drivers = fleetOperationsService.getDrivers({ status, country, search })
    return NextResponse.json({ success: true, count: drivers.length, data: drivers })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: DriverRecord = await request.json()
    if (!body.fullName || !body.primaryPhone) {
      return NextResponse.json(
        { success: false, error: 'Driver full name and primary phone are required' },
        { status: 400 }
      )
    }

    const saved = fleetOperationsService.saveDriver(body)
    return NextResponse.json({ success: true, data: saved }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: DriverRecord = await request.json()
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'Driver ID is required' }, { status: 400 })
    }

    const saved = fleetOperationsService.saveDriver(body)
    return NextResponse.json({ success: true, data: saved })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
