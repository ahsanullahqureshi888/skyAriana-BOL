import { NextRequest, NextResponse } from 'next/server'
import { warehouseCargoService } from '@/lib/services/warehouse-cargo-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'plans' | 'sessions' | 'dispatches' | 'kpi' | 'consistency'
    const shipmentId = searchParams.get('shipmentId')
    const bolNumber = searchParams.get('bolNumber')

    if (type === 'sessions') {
      const sessions = warehouseCargoService.getLoadingSessions()
      return NextResponse.json({ success: true, count: sessions.length, data: sessions })
    }

    if (type === 'dispatches') {
      const dispatches = warehouseCargoService.getDispatches()
      return NextResponse.json({ success: true, count: dispatches.length, data: dispatches })
    }

    if (type === 'kpi') {
      const kpi = warehouseCargoService.getSummaryKpi()
      return NextResponse.json({ success: true, data: kpi })
    }

    if (type === 'consistency' && bolNumber) {
      const report = warehouseCargoService.getDataConsistencyCheck(shipmentId || '', bolNumber)
      return NextResponse.json({ success: true, data: report })
    }

    const plans = warehouseCargoService.getLoadingPlans()
    return NextResponse.json({ success: true, count: plans.length, data: plans })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'create-plan') {
      const plan = warehouseCargoService.createLoadingPlan(body)
      return NextResponse.json({ success: true, data: plan }, { status: 201 })
    }

    if (action === 'start-session') {
      const { loadingPlanId, supervisorName } = body
      if (!loadingPlanId) {
        return NextResponse.json({ success: false, error: 'Missing loadingPlanId' }, { status: 400 })
      }
      const session = warehouseCargoService.startLoadingSession(loadingPlanId, supervisorName || 'Supervisor')
      if (!session) {
        return NextResponse.json({ success: false, error: 'Loading plan not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true, data: session })
    }

    if (action === 'add-quantity') {
      const { sessionId, cargoLotId, quantity } = body
      if (!sessionId || !cargoLotId || !quantity) {
        return NextResponse.json({ success: false, error: 'Missing sessionId, cargoLotId, or quantity' }, { status: 400 })
      }
      const res = warehouseCargoService.addLoadedQuantity(sessionId, cargoLotId, quantity)
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, data: res.session })
    }

    if (action === 'complete-session') {
      const { sessionId, completionData } = body
      if (!sessionId || !completionData) {
        return NextResponse.json({ success: false, error: 'Missing sessionId or completionData' }, { status: 400 })
      }
      const res = warehouseCargoService.completeLoadingSession(sessionId, completionData)
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, data: res.session })
    }

    if (action === 'dispatch') {
      const dispatch = warehouseCargoService.dispatchCargo(body)
      return NextResponse.json({ success: true, data: dispatch }, { status: 201 })
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
