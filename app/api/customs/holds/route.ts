import { NextRequest, NextResponse } from 'next/server'
import { customsBorderService } from '@/lib/services/customs-border-service'
import { CustomsHoldRecord } from '@/lib/types/customs-border'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined

    const holds: CustomsHoldRecord[] = customsBorderService.getHolds({ status })

    return NextResponse.json({
      success: true,
      count: holds.length,
      data: holds,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'release') {
      const { holdId, releasedBy, resolutionNote } = body
      if (!holdId || !resolutionNote) {
        return NextResponse.json({ success: false, error: 'Missing holdId or resolutionNote' }, { status: 400 })
      }
      const res = customsBorderService.releaseHold(
        holdId,
        releasedBy || 'Border Operations Officer',
        resolutionNote
      )
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, data: res.hold })
    }

    if (!body.borderOperationId || !body.holdType || !body.reason) {
      return NextResponse.json(
        { success: false, error: 'Required fields: borderOperationId, holdType, reason' },
        { status: 400 }
      )
    }

    const hold = customsBorderService.createHold(body)
    return NextResponse.json({ success: true, data: hold }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
