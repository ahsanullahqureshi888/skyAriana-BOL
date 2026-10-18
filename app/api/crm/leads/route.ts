import { NextResponse } from 'next/server'
import { crmSalesService } from '@/lib/services/crm-sales-service'

export async function GET() {
  try {
    const leads = crmSalesService.getLeads()
    return NextResponse.json({ success: true, leads })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const lead = crmSalesService.saveLead(body)
    return NextResponse.json({ success: true, lead })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
