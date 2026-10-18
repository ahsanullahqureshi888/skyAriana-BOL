import { NextResponse } from 'next/server'
import { crmSalesService } from '@/lib/services/crm-sales-service'

export async function GET() {
  try {
    const opportunities = crmSalesService.getOpportunities()
    return NextResponse.json({ success: true, opportunities })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const opportunity = crmSalesService.saveOpportunity(body)
    return NextResponse.json({ success: true, opportunity })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
