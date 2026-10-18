import { NextResponse } from "next/server"
import crypto from "crypto"
import { getAllExchangeRates, saveExchangeRate } from "@/lib/services/finance-storage-service"

export async function GET() {
  try {
    const rates = await getAllExchangeRates()
    return NextResponse.json({ success: true, data: rates })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const now = new Date().toISOString()
    const rate = await saveExchangeRate({
      id: body.id || `rate-${crypto.randomBytes(4).toString("hex")}`,
      effectiveDate: body.effectiveDate || now.split("T")[0],
      fromCurrency: (body.fromCurrency || "USD").toUpperCase(),
      toCurrency: (body.toCurrency || "AED").toUpperCase(),
      rate: Number(body.rate) || 1,
      sourceOrNote: body.sourceOrNote || "Manual Entry",
      createdAt: now,
    })

    return NextResponse.json({ success: true, data: rate })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
