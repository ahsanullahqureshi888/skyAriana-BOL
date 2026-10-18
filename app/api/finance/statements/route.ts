import { NextResponse } from "next/server"
import { generateCustomerStatement } from "@/lib/services/finance-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customer = searchParams.get("customer")
    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer parameter is required" }, { status: 400 })
    }

    const currency = searchParams.get("currency") || "USD"
    const startDate = searchParams.get("startDate") || undefined
    const endDate = searchParams.get("endDate") || undefined

    const statement = await generateCustomerStatement({
      customerIdOrName: customer,
      currency,
      startDate,
      endDate,
    })

    return NextResponse.json({ success: true, data: statement })
  } catch (error: any) {
    console.error("[finance/statements API] GET Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
