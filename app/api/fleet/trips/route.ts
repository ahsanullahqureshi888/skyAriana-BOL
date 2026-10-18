import { NextRequest, NextResponse } from 'next/server'
import { fleetOperationsService } from '@/lib/services/fleet-operations-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as any
    const bolNumber = searchParams.get('bolNumber') || undefined
    const search = searchParams.get('search') || undefined

    const trips = fleetOperationsService.getTrips({ status, bolNumber, search })
    return NextResponse.json({ success: true, count: trips.length, data: trips })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { allowDoubleAssignmentOverride, overrideReason, ...tripData } = body

    if (!tripData.truckId || !tripData.driverId || !tripData.bolNumber) {
      return NextResponse.json(
        { success: false, error: 'Truck, Driver, and BOL Number are required for dispatch' },
        { status: 400 }
      )
    }

    const result = fleetOperationsService.createRoadTrip(tripData, {
      allowDoubleAssignmentOverride,
      overrideReason,
    })

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 409 })
    }

    return NextResponse.json({ success: true, data: result.trip }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
