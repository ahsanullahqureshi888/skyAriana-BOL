import { NextResponse } from "next/server"
import { getBolAccounting, saveBolAccounting } from "@/lib/accounting/bol-accounting-service"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bolId: string }> }
) {
  try {
    const { bolId } = await params
    if (!bolId) {
      return NextResponse.json({ success: false, error: "bolId is required" }, { status: 400 })
    }

    const data = await getBolAccounting(bolId)
    return NextResponse.json({ success: true, ...data })
  } catch (error: any) {
    console.error("[api/accounting/bol GET] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bolId: string }> }
) {
  try {
    const { bolId } = await params
    if (!bolId) {
      return NextResponse.json({ success: false, error: "bolId is required" }, { status: 400 })
    }

    const body = await request.json()
    const {
      bolNumber,
      billToPartyType,
      billToCompanyName,
      accountId,
      currency,
      paymentTerms,
      creditDays,
      billingContact,
      billingNotes,
      charges,
      user,
      metadata,
    } = body

    if (!bolNumber) {
      return NextResponse.json({ success: false, error: "bolNumber is required" }, { status: 400 })
    }

    if (!accountId) {
      return NextResponse.json({ success: false, error: "accountId is required" }, { status: 400 })
    }

    const result = await saveBolAccounting({
      bolId,
      bolNumber,
      billToPartyType: billToPartyType || "shipper",
      billToCompanyName: billToCompanyName || "Customer",
      accountId,
      currency: currency || "USD",
      paymentTerms: paymentTerms || "30 Days",
      creditDays: Number(creditDays) || 30,
      billingContact,
      billingNotes,
      charges: Array.isArray(charges) ? charges : [],
      user: user || "System",
      metadata,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[api/accounting/bol POST] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
