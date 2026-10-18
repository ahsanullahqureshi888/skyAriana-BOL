import { NextResponse } from "next/server"
import { getAllFinancePayments } from "@/lib/services/finance-storage-service"
import { recordPaymentReceived } from "@/lib/services/finance-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    let payments = await getAllFinancePayments()

    const customer = searchParams.get("customer")
    if (customer) {
      const c = customer.toLowerCase().trim()
      payments = payments.filter(
        (p) => p.customerName.toLowerCase().includes(c) || p.customerId.toLowerCase() === c
      )
    }

    const currency = searchParams.get("currency")
    if (currency && currency !== "all") {
      payments = payments.filter((p) => p.currency.toUpperCase() === currency.toUpperCase())
    }

    return NextResponse.json({ success: true, data: payments })
  } catch (error: any) {
    console.error("[finance/payments API] GET Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await recordPaymentReceived(body)
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error("[finance/payments API] POST Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
