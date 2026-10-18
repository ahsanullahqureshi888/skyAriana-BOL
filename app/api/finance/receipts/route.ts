import { NextResponse } from "next/server"
import {
  getAllFinanceReceipts,
  getFinanceReceiptById,
} from "@/lib/services/finance-storage-service"
import { buildPaymentReceiptWhatsAppMessage } from "@/lib/services/finance-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (id) {
      const receipt = await getFinanceReceiptById(id)
      if (!receipt) {
        return NextResponse.json({ success: false, error: "Receipt not found" }, { status: 404 })
      }
      const whatsappText = buildPaymentReceiptWhatsAppMessage(receipt)
      return NextResponse.json({ success: true, data: receipt, whatsappText })
    }

    let receipts = await getAllFinanceReceipts()
    const customer = searchParams.get("customer")
    if (customer) {
      const c = customer.toLowerCase().trim()
      receipts = receipts.filter(
        (r) => r.customerName.toLowerCase().includes(c) || r.customerId.toLowerCase() === c
      )
    }

    return NextResponse.json({ success: true, data: receipts })
  } catch (error: any) {
    console.error("[finance/receipts API] GET Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
