import { NextResponse } from "next/server"
import { getFinanceInvoiceById, saveFinanceInvoice } from "@/lib/services/finance-storage-service"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const invoice = await getFinanceInvoiceById(id)
    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: invoice })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const invoice = await getFinanceInvoiceById(id)
    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 })
    }

    const body = await request.json()
    const updated = await saveFinanceInvoice({
      ...invoice,
      ...body,
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
