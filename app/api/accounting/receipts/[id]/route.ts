import { NextResponse } from "next/server"
import { getReceiptById } from "@/lib/accounting/payment-receipt-service"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: "Receipt ID is required" }, { status: 400 })
    }

    const receipt = await getReceiptById(id)
    if (!receipt) {
      return NextResponse.json({ success: false, error: "Receipt not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, receipt })
  } catch (error: any) {
    console.error("[api/accounting/receipts GET] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
