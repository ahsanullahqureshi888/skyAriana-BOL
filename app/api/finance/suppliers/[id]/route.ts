import { NextResponse } from "next/server"
import {
  getSupplierById,
  deleteSupplierProfile,
  getSupplierBillsBySupplier,
  getSupplierPaymentsBySupplier,
  getSupplierLedgerTransactionsBySupplier,
} from "@/lib/services/finance-storage-service"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supplier = await getSupplierById(id)
    if (!supplier) {
      return NextResponse.json({ success: false, error: "Supplier not found" }, { status: 404 })
    }

    const [bills, payments, ledger] = await Promise.all([
      getSupplierBillsBySupplier(supplier.id),
      getSupplierPaymentsBySupplier(supplier.id),
      getSupplierLedgerTransactionsBySupplier(supplier.id),
    ])

    return NextResponse.json({
      success: true,
      supplier,
      bills,
      payments,
      ledger,
    })
  } catch (error: any) {
    console.error("[api/finance/suppliers/[id] GET] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const deleted = await deleteSupplierProfile(id)
    return NextResponse.json({ success: deleted })
  } catch (error: any) {
    console.error("[api/finance/suppliers/[id] DELETE] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
