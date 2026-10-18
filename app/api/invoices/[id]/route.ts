import { NextResponse } from "next/server"
import { deleteInvoice, getInvoice, saveInvoice } from "@/lib/services/invoice-storage-service"
import { createClient } from "@/lib/supabase/server"
import { assertAccountingPeriodOpen } from "@/lib/accounting/period-closing/period-service"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user: any = null
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient()
    const { data, error: authError } = await supabase.auth.getUser()
    if (authError || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    user = data.user
  }

  const { id } = await params
  const invoice = await getInvoice(id)

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || "").toLowerCase()
  const shipperIdentity = user?.user_metadata?.shipper_name || user?.email || request.headers.get("x-shipper-name")

  if (role === "shipper" || role === "client") {
    const sFilter = (shipperIdentity || "").trim().toLowerCase()
    const invShipper = (invoice.shipper || (invoice as any).companyName || "").toLowerCase()
    const invClientId = ((invoice as any).companyId || (invoice as any).clientId || "").toLowerCase()
    const isOwner = Boolean(sFilter && (invShipper.includes(sFilter) || sFilter.includes(invShipper) || invClientId === sFilter))
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden: You do not have access to this invoice" }, { status: 403 })
    }
  }

  return NextResponse.json({ data: invoice })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user: any = null
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient()
    const { data, error: authError } = await supabase.auth.getUser()
    if (authError || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    user = data.user
  }

  const { id } = await params
  const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || "").toLowerCase()
  if (role === "shipper" || role === "client" || role === "viewer") {
    return NextResponse.json({ error: "Forbidden: Clients cannot modify invoices" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const existing = await getInvoice(id)
    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const existingDate = (existing as any).posting_date || (existing as any).postingDate || (existing as any).date || (existing as any).invoice_date || (existing as any).invoiceDate
    const newDate = body.posting_date || body.postingDate || body.date || body.invoice_date || body.invoiceDate || existingDate
    try {
      await assertAccountingPeriodOpen(existingDate, {
        role,
        actor: user?.email || role || "user",
        entityType: "invoice",
        entityId: id,
      })
      if (newDate && newDate !== existingDate) {
        await assertAccountingPeriodOpen(newDate, {
          role,
          actor: user?.email || role || "user",
          entityType: "invoice",
          entityId: id,
        })
      }
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        error: err.message,
        period_locked: true,
      }, { status: 403 })
    }

    const invoice = await saveInvoice({ ...existing, ...body, id: existing?.id || id })
    return NextResponse.json({ success: true, data: invoice })
  } catch (error) {
    console.error("[invoices/[id] API] PUT error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update invoice" },
      { status: 400 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user: any = null
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient()
    const { data, error: authError } = await supabase.auth.getUser()
    if (authError || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    user = data.user
  }

  const { id } = await params
  const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || "").toLowerCase()
  if (role === "shipper" || role === "client" || role === "viewer") {
    return NextResponse.json({ error: "Forbidden: Unauthorized to delete invoices" }, { status: 403 })
  }
  
  const existing = await getInvoice(id)
  if (existing) {
    const existingDate = (existing as any).posting_date || (existing as any).postingDate || (existing as any).date || (existing as any).invoice_date || (existing as any).invoiceDate
    try {
      await assertAccountingPeriodOpen(existingDate, {
        role,
        actor: user?.email || role || "user",
        entityType: "invoice",
        entityId: id,
      })
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        error: err.message,
        period_locked: true,
      }, { status: 403 })
    }
  }

  await deleteInvoice(id)
  return NextResponse.json({ success: true })
}
