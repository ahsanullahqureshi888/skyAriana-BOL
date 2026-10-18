import { NextResponse } from 'next/server'
import { IncidentClaimsStore } from '@/lib/services/incident-claims-service'

export async function GET() {
  try {
    const store = IncidentClaimsStore.getInstance()
    const incidents = store.getIncidents()
    const kpis = store.getSummaryKpis()
    return NextResponse.json({ success: true, count: incidents.length, kpis, data: incidents })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const store = IncidentClaimsStore.getInstance()

    if (body.action === 'DELETE' && body.id) {
      const deleted = store.deleteIncident(body.id)
      return NextResponse.json({ success: true, deleted })
    }

    if (body.action === 'GENERATE_NOTICE' && body.id) {
      const notice = store.generateFactualIncidentNotice(body.id)
      return NextResponse.json({ success: true, notice })
    }

    const saved = store.saveIncident(body)
    return NextResponse.json({ success: true, data: saved })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
