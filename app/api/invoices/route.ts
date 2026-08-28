import { NextResponse } from "next/server"
import { getAllInvoices, nextInvoiceNumber, saveInvoice } from "@/lib/services/invoice-storage-service"
import { tryPythonBackend } from "@/lib/services/python-backend-proxy"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  if (searchParams.get("action") === "next-number") {
    const pythonNumber = await tryPythonBackend("/api/invoices/tools/next-number")
    if (pythonNumber) return NextResponse.json({ invoiceNumber: pythonNumber.invoiceNumber, source: "python-fastapi" })
    return NextResponse.json({ invoiceNumber: await nextInvoiceNumber() })
  }

  const pythonInvoices = await tryPythonBackend(`/api/invoices${searchParams.get("q") ? `?q=${encodeURIComponent(searchParams.get("q") || "")}` : ""}`)
  if (pythonInvoices) return NextResponse.json(pythonInvoices)

  let allInvoices = await getAllInvoices()
  const shipperFilter = searchParams.get("shipper_name") || searchParams.get("client_name") || request.headers.get("x-shipper-name")
  const roleFilter = searchParams.get("role") || request.headers.get("x-user-role")

  if ((roleFilter === "shipper" || shipperFilter) && shipperFilter) {
    const sFilter = shipperFilter.trim().toLowerCase()
    allInvoices = allInvoices.filter((inv: any) => {
      const sName = (inv.shipper || inv.companyName || "").toLowerCase()
      const cId = (inv.companyId || inv.clientId || "").toLowerCase()
      return sName === sFilter || sName.includes(sFilter) || sFilter.includes(sName) || cId === sFilter
    })
  }

  return NextResponse.json({ data: allInvoices, source: "local" })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const pythonInvoice = await tryPythonBackend("/api/invoices", {
      method: "POST",
      body: JSON.stringify(body),
    })
    if (pythonInvoice) return NextResponse.json(pythonInvoice)

    const invoice = await saveInvoice(body)
    return NextResponse.json({ success: true, data: invoice })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to save invoice" },
      { status: 400 }
    )
  }
}
