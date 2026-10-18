import { NextRequest, NextResponse } from 'next/server'
import { customsBorderService } from '@/lib/services/customs-border-service'
import { BorderOperationRecord } from '@/lib/types/customs-border'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const borderLocationId = searchParams.get('borderLocationId') || undefined
    const status = searchParams.get('status') as any
    const search = searchParams.get('search') || undefined

    const ops: BorderOperationRecord[] = customsBorderService.getOperations({
      borderLocationId,
      status,
      search,
    })

    return NextResponse.json({
      success: true,
      count: ops.length,
      data: ops,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'update-status') {
      const { operationId, newStatus, locationName, notes, recordedBy, side } = body
      if (!operationId || !newStatus) {
        return NextResponse.json({ success: false, error: 'Missing operationId or newStatus' }, { status: 400 })
      }
      const res = customsBorderService.updateOperationStatus(
        operationId,
        newStatus,
        locationName,
        notes,
        recordedBy,
        side
      )
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, data: res.operation })
    }

    if (action === 'arrival') {
      const { operationId, arrivalDate, queuePosition, notes, recordedBy } = body
      const res = customsBorderService.recordBorderArrival(
        operationId,
        arrivalDate,
        queuePosition,
        notes,
        recordedBy
      )
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, data: res.operation })
    }

    if (action === 'clearance') {
      const { operationId, clearanceDate, declarationRef, clearedBy, notes } = body
      const res = customsBorderService.recordClearance(
        operationId,
        clearanceDate,
        declarationRef,
        clearedBy,
        notes
      )
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, data: res.operation })
    }

    if (action === 'border-exit') {
      const { operationId, exitDate, nextDestination, notes, recordedBy } = body
      const res = customsBorderService.recordBorderExit(
        operationId,
        exitDate,
        nextDestination,
        notes,
        recordedBy
      )
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, data: res.operation })
    }

    // Default: create operation
    const op = customsBorderService.createOperation(body)
    return NextResponse.json({ success: true, data: op }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
