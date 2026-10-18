import { NextResponse } from 'next/server'
import { OceanVesselStore } from '@/lib/services/ocean-vessel-service'

export async function GET() {
  try {
    const store = OceanVesselStore.getInstance()
    const workflows = store.getBLWorkflows()
    return NextResponse.json({ success: true, count: workflows.length, data: workflows })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const store = OceanVesselStore.getInstance()

    if (body.action === 'ADD_DRAFT') {
      const result = store.addDraftBLVersion(body.bookingId, body.notes)
      return NextResponse.json(result)
    }

    if (body.action === 'REQUEST_CORRECTION') {
      const result = store.requestBLCorrection(body.bookingId, body.correctionsRequested)
      return NextResponse.json(result)
    }

    if (body.action === 'APPROVE_DRAFT') {
      const result = store.approveDraftBL(body.bookingId, body.approvedBy)
      return NextResponse.json(result)
    }

    if (body.action === 'ISSUE_FINAL') {
      const result = store.issueFinalBL(body.bookingId, body.blNumber, body.blType)
      return NextResponse.json(result)
    }

    if (body.action === 'SWITCH_BL') {
      const result = store.createSwitchBL(
        body.bookingId,
        body.switchBlNumber,
        body.switchLocation,
        body.reason
      )
      return NextResponse.json(result)
    }

    if (body.action === 'UPDATE_RELEASE') {
      const result = store.updateBLReleaseStatus(body.bookingId, body.releaseStatus)
      return NextResponse.json(result)
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
