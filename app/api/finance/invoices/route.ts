import { NextResponse } from "next/server"
import {
  getAllFinanceInvoices,
  nextInvoiceNumber,
} from "@/lib/services/finance-storage-service"
import {
  createOrUpdateInvoice,
  postInvoiceToLedger,
} from "@/lib/services/finance-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    if (searchParams.get("action") === "next-number") {
      const invoiceNumber = await nextInvoiceNumber()
      return NextResponse.json({ success: true, invoiceNumber })
    }

    let invoices = await getAllFinanceInvoices()

    const customer = searchParams.get("customer")
    if (customer) {
      const c = customer.toLowerCase().trim()
      invoices = invoices.filter(
        (i) => i.customerName.toLowerCase().includes(c) || i.customerId.toLowerCase() === c
      )
    }

    const status = searchParams.get("status")
    if (status && status !== "all") {
      invoices = invoices.filter((i) => i.status === status)
    }

    const currency = searchParams.get("currency")
    if (currency && currency !== "all") {
      invoices = invoices.filter((i) => i.currency.toUpperCase() === currency.toUpperCase())
    }

    const bol = searchParams.get("bol")
    if (bol) {
      const b = bol.toLowerCase().trim()
      invoices = invoices.filter((i) => i.bolNumbers?.some((bn) => bn.toLowerCase().includes(b)))
    }

    return NextResponse.json({ success: true, data: invoices })
  } catch (error: any) {
    console.error("[finance/invoices API] GET Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Action: Post directly
    if (body.action === "post" && body.invoiceId) {
      const posted = await postInvoiceToLedger(body.invoiceId)
      return NextResponse.json({ success: true, data: posted, message: "Invoice posted to ledger successfully" })
    }

    const invoice = await createOrUpdateInvoice(body)

    // Auto-post if requested
    if (body.autoPost) {
      const posted = await postInvoiceToLedger(invoice.id)
      return NextResponse.json({ success: true, data: posted })
    }

    return NextResponse.json({ success: true, data: invoice })
  } catch (error: any) {
    console.error("[finance/invoices API] POST Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
