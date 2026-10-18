import { NextRequest, NextResponse } from "next/server"
import {
  getProcurementRequests,
  saveProcurementRequest,
  getRFQs,
  saveRFQ,
  getSupplierQuotes,
  saveSupplierQuote,
  getServiceOrders,
  saveServiceOrder,
  getContracts,
  saveContract,
  getInvoiceMatches,
  saveInvoiceMatch
} from "@/lib/services/procurement-db-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entity = searchParams.get("entity")
    
    if (entity === "requests") {
      const data = await getProcurementRequests()
      return NextResponse.json(data)
    }
    if (entity === "rfqs") {
      const data = await getRFQs()
      return NextResponse.json(data)
    }
    if (entity === "quotes") {
      const data = await getSupplierQuotes()
      return NextResponse.json(data)
    }
    if (entity === "orders") {
      const data = await getServiceOrders()
      return NextResponse.json(data)
    }
    if (entity === "contracts") {
      const data = await getContracts()
      return NextResponse.json(data)
    }
    if (entity === "matches") {
      const data = await getInvoiceMatches()
      return NextResponse.json(data)
    }
    
    return NextResponse.json({ error: "Invalid entity" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entity = searchParams.get("entity")
    const body = await request.json()

    if (entity === "requests") {
      await saveProcurementRequest(body)
      return NextResponse.json({ success: true })
    }
    if (entity === "rfqs") {
      await saveRFQ(body)
      return NextResponse.json({ success: true })
    }
    if (entity === "quotes") {
      await saveSupplierQuote(body)
      return NextResponse.json({ success: true })
    }
    if (entity === "orders") {
      await saveServiceOrder(body)
      return NextResponse.json({ success: true })
    }
    if (entity === "contracts") {
      await saveContract(body)
      return NextResponse.json({ success: true })
    }
    if (entity === "matches") {
      const { match, order, supplierName } = body
      if (match) {
        await saveInvoiceMatch(match, order, supplierName)
      } else {
        await saveInvoiceMatch(body)
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid entity" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
