import { NextResponse } from 'next/server'
import { crmSalesService } from '@/lib/services/crm-sales-service'

export async function GET() {
  try {
    const serviceRequests = crmSalesService.getServiceRequests()
    return NextResponse.json({ success: true, serviceRequests })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const serviceRequest = crmSalesService.saveServiceRequest(body)
    return NextResponse.json({ success: true, serviceRequest })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
