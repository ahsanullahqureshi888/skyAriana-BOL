import { NextResponse } from "next/server"
import { getAllInvoices, nextInvoiceNumber, saveInvoice } from "@/lib/services/invoice-storage-service"
import { createClient } from "@/lib/supabase/server"
import { assertAccountingPeriodOpen } from "@/lib/accounting/period-closing/period-service"

export async function GET(request: Request) {
  let user: any = null
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient()
    const { data, error: authError } = await supabase.auth.getUser()
    if (authError || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    user = data.user
  }

  const { searchParams } = new URL(request.url)

  if (searchParams.get("action") === "next-number") {
    return NextResponse.json({ invoiceNumber: await nextInvoiceNumber() })
  }

  let allInvoices = await getAllInvoices()
  
  const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || searchParams.get("role") || "").toLowerCase()
  const shipperIdentity = user?.user_metadata?.shipper_name || user?.email || request.headers.get("x-shipper-name") || searchParams.get("shipper_name")

  if ((role === "shipper" || role === "client") && shipperIdentity) {
    const sFilter = shipperIdentity.trim().toLowerCase()
    allInvoices = allInvoices.filter((inv: any) => {
      const sName = (inv.shipper || inv.companyName || "").toLowerCase()
      const cId = (inv.companyId || inv.clientId || "").toLowerCase()
      return sName === sFilter || sName.includes(sFilter) || sFilter.includes(sName) || cId === sFilter
    })
  }

  return NextResponse.json({ data: allInvoices, source: "local" })
}

export async function POST(request: Request) {
  let user: any = null
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient()
    const { data, error: authError } = await supabase.auth.getUser()
    if (authError || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    user = data.user
  }

  const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || "").toLowerCase()
  if (role === "shipper" || role === "client" || role === "viewer") {
    return NextResponse.json({ error: "Forbidden: Unauthorized to create invoices" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const postingDate = body.posting_date || body.postingDate || body.date || body.invoice_date || body.invoiceDate
    try {
      await assertAccountingPeriodOpen(postingDate, {
        role,
        actor: user?.email || role || "user",
        entityType: "invoice",
        entityId: body.invoice_number || body.invoiceNumber,
      })
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        error: err.message,
        period_locked: true,
      }, { status: 403 })
    }

    const invoice = await saveInvoice(body)
    return NextResponse.json({ success: true, data: invoice })
  } catch (error) {
    console.error("[invoices API] POST error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to save invoice" },
      { status: 400 }
    )
  }
}
