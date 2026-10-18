import { NextResponse } from "next/server"
import { requireClientSession, assertFinancialAccess } from "@/lib/auth/client-auth"
import { getAllInvoices, type InvoiceRecord } from "@/lib/services/invoice-storage-service"

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const targetId = decodeURIComponent(params.id || "").trim().toLowerCase()
    const session = await requireClientSession()
    assertFinancialAccess(session)

    const companyName = (session.companyName || "").trim().toLowerCase()

    const allInvoices = await getAllInvoices()
    const invoice = allInvoices.find((inv: InvoiceRecord) => 
      (inv.id || "").toLowerCase() === targetId ||
      (inv.invoice_number || "").toLowerCase() === targetId
    )

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const buyer = (invoice.buyer_name || "").trim().toLowerCase()
    const isOwner = companyName && (buyer === companyName || buyer.includes(companyName) || companyName.includes(buyer))

    if (!isOwner) {
      return NextResponse.json({ error: "Access denied to this invoice" }, { status: 403 })
    }

    const subtotal = (invoice.items || []).reduce((acc: number, item: any) => {
      const qty = parseFloat(item.quantity) || 0
      const rate = parseFloat(item.unitPrice) || 0
      return acc + qty * rate
    }, 0)

    const tax = parseFloat(invoice.tax) || 0
    const discount = parseFloat(invoice.discount) || 0
    const totalAmount = Math.max(0, subtotal + tax - discount)

    const status = (invoice.payment_status || "UNPAID").toUpperCase()
    const isPaid = status === "PAID"

    const safeInvoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      bolNumber: invoice.bl_no || "N/A",
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      currency: (invoice.currency || "USD").toUpperCase(),
      subtotal,
      tax,
      discount,
      totalAmount,
      paidAmount: isPaid ? totalAmount : 0,
      outstandingAmount: isPaid ? 0 : totalAmount,
      status,
      buyerName: invoice.buyer_name,
      buyerAddress: invoice.buyer_address,
      buyerContact: invoice.buyer_contact,
      sellerName: invoice.seller_name,
      sellerAddress: invoice.seller_address,
      commodity: invoice.commodity || invoice.cargo_description || "",
      items: (invoice.items || []).map((i: any) => ({
        id: i.id,
        description: i.description,
        quantity: i.quantity,
        unit: i.unit || "Unit",
        unitPrice: i.unitPrice,
        amount: (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0),
      })),
      notes: invoice.notes || "",
      terms: invoice.terms || "",
      bankDetails: {
        bankName: invoice.bank_name || "",
        accountName: invoice.account_name || "",
        accountNumber: invoice.account_number || "",
        iban: invoice.iban || "",
        swiftCode: invoice.swift_code || "",
      }
    }

    return NextResponse.json({ success: true, invoice: safeInvoice })
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Client Invoice Detail Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
