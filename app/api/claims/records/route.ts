import { NextResponse } from 'next/server'
import { IncidentClaimsStore } from '@/lib/services/incident-claims-service'

export async function GET() {
  try {
    const store = IncidentClaimsStore.getInstance()
    const claims = store.getClaims()
    const kpis = store.getSummaryKpis()
    return NextResponse.json({ success: true, count: claims.length, kpis, data: claims })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const store = IncidentClaimsStore.getInstance()

    if (body.action === 'DELETE' && body.id) {
      const deleted = store.deleteClaim(body.id)
      return NextResponse.json({ success: true, deleted })
    }

    if (body.action === 'ASSESS_RESPONSIBILITY') {
      const updated = store.recordResponsibilityAssessment(body.claimId, body.assessment)
      return NextResponse.json({ success: true, data: updated })
    }

    if (body.action === 'GENERATE_WHATSAPP_UPDATE' && body.claimId) {
      const update = store.generateCustomerWhatsAppUpdate(body.claimId)
      return NextResponse.json({ success: true, whatsappUpdate: update })
    }

    const saved = store.saveClaim(body)
    return NextResponse.json({ success: true, data: saved })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
