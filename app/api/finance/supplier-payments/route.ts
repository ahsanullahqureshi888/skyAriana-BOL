import { NextResponse } from "next/server"
import {
  getAllSupplierPayments,
  getSupplierPaymentsBySupplier,
} from "@/lib/services/finance-storage-service"
import { recordSupplierPayment } from "@/lib/services/finance-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get("supplierId")

    const payments = supplierId
      ? await getSupplierPaymentsBySupplier(supplierId)
      : await getAllSupplierPayments()

    return NextResponse.json({ success: true, count: payments.length, data: payments })
  } catch (error: any) {
    console.error("[api/finance/supplier-payments GET] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.supplierId || !body.supplierName || !body.amount) {
      return NextResponse.json(
        { success: false, error: "Supplier ID, supplier name, and payment amount are required" },
        { status: 400 }
      )
    }

    const payment = await recordSupplierPayment(body)
    return NextResponse.json({ success: true, payment })
  } catch (error: any) {
    console.error("[api/finance/supplier-payments POST] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
