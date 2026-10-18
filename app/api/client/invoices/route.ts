import { NextResponse } from "next/server"
import { requireClientSession, assertFinancialAccess } from "@/lib/auth/client-auth"
import { getAllInvoices, type InvoiceRecord } from "@/lib/services/invoice-storage-service"
import { getAllShipments } from "@/lib/services/shipment-service"
import { getAccessByCompanyId } from "@/lib/data/client-access"

export async function GET() {
  try {
    const session = await requireClientSession()
    assertFinancialAccess(session)

    const companyName = (session.companyName || "").trim().toLowerCase()
    const companyId = (session.companyId || "").trim().toLowerCase()

    // Authorized BOL numbers
    const accessRules = getAccessByCompanyId(session.companyId)
    const ruleBolIds = new Set(accessRules.map(r => (r.bol_id || "").trim().toLowerCase()))
    const allShipments = await getAllShipments()
    const authorizedBols = new Set(
      allShipments
        .filter(s => {
          const sId = (s.id || "").trim().toLowerCase()
          const bNum = ((s as any).bolNumber || "").trim().toLowerCase()
          const refNum = (s.referenceNumber || "").trim().toLowerCase()
          return (
            ruleBolIds.has(sId) || (bNum && ruleBolIds.has(bNum)) || (refNum && ruleBolIds.has(refNum)) ||
            (s.shipper?.id && s.shipper.id.toLowerCase() === companyId) ||
            (companyName && s.shipper?.name && s.shipper.name.toLowerCase().includes(companyName))
          )
        })
        .map(s => ((s as any).bolNumber || s.referenceNumber || "").trim().toLowerCase())
    )

    const allInvoices = await getAllInvoices()
    const clientInvoices = allInvoices.filter((inv: InvoiceRecord) => {
      const buyer = (inv.buyer_name || "").trim().toLowerCase()
      const bl = (inv.bl_no || "").trim().toLowerCase()
      return (
        (companyName && (buyer === companyName || buyer.includes(companyName) || companyName.includes(buyer))) ||
        (bl && authorizedBols.has(bl))
      )
    })

    const safeInvoices = clientInvoices.map((inv: InvoiceRecord) => {
      const subtotal = (inv.items || []).reduce((acc: number, item: any) => {
        const qty = parseFloat(item.quantity) || 0
        const rate = parseFloat(item.unitPrice) || 0
        return acc + qty * rate
      }, 0)

      const tax = parseFloat(inv.tax) || 0
      const discount = parseFloat(inv.discount) || 0
      const totalAmount = Math.max(0, subtotal + tax - discount)

      const status = (inv.payment_status || "UNPAID").toUpperCase()
      const isPaid = status === "PAID"
      const paidAmount = isPaid ? totalAmount : 0
      const outstandingAmount = isPaid ? 0 : totalAmount

      const dueDate = inv.due_date || ""
      const isOverdue = !isPaid && dueDate ? new Date(dueDate) < new Date() : false
      const daysOverdue = isOverdue ? Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0

      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        bolNumber: inv.bl_no || "N/A",
        invoiceDate: inv.invoice_date,
        dueDate: inv.due_date,
        currency: (inv.currency || "USD").toUpperCase(),
        totalAmount,
        paidAmount,
        outstandingAmount,
        status: isOverdue ? "OVERDUE" : status,
        daysOverdue,
        cargoDescription: inv.commodity || inv.cargo_description || "",
        buyerName: inv.buyer_name,
        sellerName: inv.seller_name,
      }
    })

    return NextResponse.json({ success: true, invoices: safeInvoices })
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Client Invoices API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
