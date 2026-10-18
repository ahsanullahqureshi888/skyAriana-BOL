import { NextResponse } from 'next/server'
import { IncidentClaimsStore } from '@/lib/services/incident-claims-service'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const store = IncidentClaimsStore.getInstance()

    if (!body.claimId || !body.settlementData) {
      return NextResponse.json({ success: false, error: 'claimId and settlementData are required' }, { status: 400 })
    }

    const updated = store.recordSettlement(body.claimId, body.settlementData)
    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
