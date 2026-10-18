import { NextResponse } from "next/server"
import { getFinanceOverview } from "@/lib/services/finance-service"
import { getAllFinanceInvoices, getAllFinancePayments } from "@/lib/services/finance-storage-service"

export async function GET() {
  try {
    const overview = await getFinanceOverview()
    const invoices = await getAllFinanceInvoices()
    const payments = await getAllFinancePayments()

    return NextResponse.json({
      success: true,
      overview,
      recentInvoices: invoices.slice(0, 10),
      recentPayments: payments.slice(0, 10),
    })
  } catch (error: any) {
    console.error("[finance/overview API] Error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load finance overview" },
      { status: 500 }
    )
  }
}
