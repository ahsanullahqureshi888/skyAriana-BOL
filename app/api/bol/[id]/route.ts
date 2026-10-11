import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import * as localStorage from "@/lib/services/local-storage-service"
import { advanceBolSequenceIfHigher } from "@/lib/services/bol-sequence"
import { getFastApiBaseUrl, isFastApiHealthy } from "@/lib/api/backend-url"
import { checkBolLedgerReferences } from "@/lib/services/bol-ledger-safety"
import { logBolLifecycleAudit } from "@/lib/services/bol-audit-service"

export const dynamic = "force-dynamic"
export const revalidate = 0

const isUUID = (str?: string | null): boolean => {
  if (!str) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim())
}

// GET: Fetch a single BOL by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user: any = null
  let supabase: any = null

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      supabase = await createClient()
      const { data, error: authError } = await supabase.auth.getUser()
      if (authError || !data?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      user = data.user
    } catch (err) {
      console.warn("[v0] Supabase auth check error:", err)
    }
  }

  const { id } = await params
  
  // 1. Authoritative Full-Fidelity Local Storage Document Lookup
  // .local-bols.json contains all 40+ form fields, notes, contacts, bilingual labels, and route stops
  try {
    const localBol = await localStorage.getLocalBOL(id)
    if (localBol && (localBol.bol_number || localBol.id)) {
      return NextResponse.json({ data: localBol, source: "local-storage" })
    }
  } catch (err) {
    console.warn("[bol/[id] API] Error reading localBol:", err)
  }

  // 2. Fallback: Ultra-fast FastAPI SQLite backend details lookup (<10ms)
  try {
    if (await isFastApiHealthy()) {
      const fastUrl = `${getFastApiBaseUrl()}/api/v1/bols/${encodeURIComponent(id)}/details`
      const fastRes = await fetch(fastUrl, {
        signal: AbortSignal.timeout(600),
        headers: { Accept: "application/json" },
      })
      if (fastRes.ok) {
        const fastResult = await fastRes.json()
        if (fastResult && fastResult.data) {
          return NextResponse.json({ data: fastResult.data, source: "fastapi-sqlite" })
        }
      }
    }
  } catch {
    // Fallback to Supabase / local
  }

  try {
    let resultDoc: any = null
    let data: any = null
    
    if (supabase) {
      try {
        let query = supabase.from("bill_of_lading").select("*")
        if (isUUID(id)) {
          query = query.or(`id.eq.${id},bol_number.eq.${id}`)
        } else {
          query = query.eq("bol_number", id)
        }
        
        const res = await query.maybeSingle()
        data = res.data
        if (data) {
          resultDoc = data
        }
      } catch (err) {
        console.warn("[v0] Supabase get error:", err)
      }
    }
    
    if (!resultDoc) {
      const localBol = await localStorage.getLocalBOL(id)
      if (localBol) {
        resultDoc = localBol
      } else {
        return NextResponse.json({ error: "BOL not found" }, { status: 404 })
      }
    }

    // Backend Authorization Check: Prevent Shipper ID manipulation
    const shipperFilter = request.headers.get("x-shipper-name") || new URL(request.url).searchParams.get("shipper_name")
    const roleFilter = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || new URL(request.url).searchParams.get("role") || "").toLowerCase()

    if ((roleFilter === "shipper" || roleFilter === "client") && shipperFilter) {
      const sFilter = shipperFilter.trim().toLowerCase()
      const docShipper = (resultDoc.shipper_name || "").toLowerCase()
      const docClientId = (resultDoc.client_id || "").toLowerCase()
      const isMatch = docShipper === sFilter || docShipper.includes(sFilter) || sFilter.includes(docShipper) || docClientId === sFilter

      if (!isMatch) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to access this Bill of Lading record" },
          { status: 403 }
        )
      }
    }
    
    return NextResponse.json({ data: resultDoc, source: data ? "supabase" : "local" })
  } catch (err) {
    console.error("[bol/[id] API] GET error:", err)
    const localBol = await localStorage.getLocalBOL(id)
    if (localBol) {
      return NextResponse.json({ data: localBol, source: "local" })
    }
    return NextResponse.json({ error: "Failed to fetch BOL" }, { status: 500 })
  }
}

// PUT: Update a BOL
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let user: any = null
    let supabase: any = null

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        supabase = await createClient()
        const { data, error: authError } = await supabase.auth.getUser()
        if (authError || !data?.user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        user = data.user
      } catch (err) {
        console.warn("[v0] Supabase auth check error:", err)
      }
    }

    const { id } = await params

    const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || "").toLowerCase().trim()
    if (role === "shipper" || role === "client" || role === "viewer") {
      return NextResponse.json(
        { error: "Forbidden: Clients cannot modify Bill of Lading records directly." },
        { status: 403 }
      )
    }

    let body: any = {}
    try {
      const rawText = await request.text()
      if (rawText && rawText.trim().length > 0) {
        body = JSON.parse(rawText)
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }
    let targetBolNumber = (!isUUID(body.bol_number) ? body.bol_number : "") || (!isUUID(id) ? id : "")
    if (!targetBolNumber) {
      // Look up existing BOL to preserve its legitimate bol_number
      const existing = await localStorage.getLocalBOL(id)
      if (existing?.bol_number && !isUUID(existing.bol_number)) {
        targetBolNumber = existing.bol_number
      } else {
        const { getNextAtomicBolNumber } = await import("@/lib/services/bol-sequence")
        targetBolNumber = await getNextAtomicBolNumber()
      }
    }

    // Forward partial update with optimistic concurrency to FastAPI SQLite backend
    try {
      if (await isFastApiHealthy()) {
        const fastUrl = `${getFastApiBaseUrl()}/api/v1/bols/${encodeURIComponent(id)}`
        let targetRevision = Number(body.revision) || 1
        try {
          const detailsRes = await fetch(`${getFastApiBaseUrl()}/api/v1/bols/${encodeURIComponent(id)}/details`, { signal: AbortSignal.timeout(400) })
          if (detailsRes.ok) {
            const detailsJson = await detailsRes.json()
            if (detailsJson?.data?.revision) {
              targetRevision = detailsJson.data.revision
            }
          }
        } catch {}

        const fastRes = await fetch(fastUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            ...body,
            revision: targetRevision,
            bol_number: targetBolNumber,
          }),
          signal: AbortSignal.timeout(1200),
        })

        if (fastRes.status === 409) {
          const errJson = await fastRes.json().catch(() => ({}))
          return NextResponse.json(
            { error: errJson.detail || "This BOL was updated elsewhere. Refresh before saving." },
            { status: 409 }
          )
        }
      }
    } catch {
      // Fallback
    }
    
    const existing = await localStorage.getLocalBOL(id)
    const newRevision = (Number(existing?.revision) || Number(body.revision) || 1) + 1

    // Detect if document content changed compared to existing record with generated PDF
    let pdfStatus = existing?.pdf_status || (existing?.pdf_url ? "ready" : "none")
    if (existing?.pdf_url) {
      const isDocumentChanged =
        (body.shipper_name && body.shipper_name !== existing.shipper_name) ||
        (body.consignee_name && body.consignee_name !== existing.consignee_name) ||
        (body.cargo_description && body.cargo_description !== existing.cargo_description) ||
        (body.number_of_packages && body.number_of_packages !== existing.number_of_packages) ||
        (body.net_weight && body.net_weight !== existing.net_weight) ||
        (body.gross_weight && body.gross_weight !== existing.gross_weight) ||
        (body.truck_number && body.truck_number !== existing.truck_number) ||
        (body.driver_name && body.driver_name !== existing.driver_name) ||
        (body.driver_rent && body.driver_rent !== existing.driver_rent) ||
        (body.issue_date && body.issue_date !== existing.issue_date)
      if (isDocumentChanged) {
        pdfStatus = "outdated"
      }
    }

    const isArchiving = body.action === "archive" || body.isArchived === true || body.status === "archived"
    const isRestoring = body.action === "restore" || (body.isArchived === false && body.status === "active")

    const updatePayload: Record<string, any> = {
      ...body,
      bol_number: targetBolNumber,
      revision: newRevision,
      pdf_status: pdfStatus,
      updated_at: new Date().toISOString(),
    }

    const notifyPartyValue = body.notify_party_name || body.notify_party || body.notifyParty || undefined
    const notifyAddressValue = body.notify_party_address || body.notifyAddress || undefined
    if (notifyPartyValue) {
      updatePayload.notify_party = updatePayload.notify_party || notifyPartyValue
      updatePayload.notify_party_name = updatePayload.notify_party_name || notifyPartyValue
    }
    if (notifyAddressValue) {
      updatePayload.notify_party_address = updatePayload.notify_party_address || notifyAddressValue
    }

    if (isArchiving) {
      updatePayload.isArchived = true
      updatePayload.status = "archived"
      updatePayload.archived_at = body.archived_at || new Date().toISOString()
      updatePayload.archived_by = body.archived_by || user?.email || "user"
      updatePayload.archive_reason = body.archive_reason || "Archived by user"
    } else if (isRestoring) {
      updatePayload.isArchived = false
      updatePayload.status = "active"
      updatePayload.archived_at = null
      updatePayload.restored_at = new Date().toISOString()
    }

    // Always update local storage first
    await localStorage.updateLocalBOL(id, updatePayload)
    if (targetBolNumber !== id) {
      await localStorage.updateLocalBOL(targetBolNumber, updatePayload)
    }
    if (!isUUID(targetBolNumber)) {
      await advanceBolSequenceIfHigher(targetBolNumber)
    }

    const fullUpdated = await localStorage.getLocalBOL(targetBolNumber || id)

    let savedData = fullUpdated || {
      id,
      ...updatePayload,
    }
    let savedToSupabase = false
    
    if (supabase) {
      try {
        // Sanitize payload: strip non-UUID id so PostgreSQL never throws invalid UUID error
        const { id: rawId, ...cleanBody } = body
        const updatePayload: Record<string, any> = {
          ...cleanBody,
          bol_number: targetBolNumber,
          updated_at: new Date().toISOString(),
        }
        if (isUUID(rawId)) {
          updatePayload.id = rawId
        }

        // 1. Try updating by UUID or bol_number
        let updateQuery = supabase.from("bill_of_lading").update(updatePayload)
        if (isUUID(id)) {
          updateQuery = updateQuery.or(`id.eq.${id},bol_number.eq.${targetBolNumber}`)
        } else {
          updateQuery = updateQuery.eq("bol_number", id)
        }
        let { data, error } = await updateQuery.select().maybeSingle()

        // 2. If no match by id, try updating by targetBolNumber
        if (!data && targetBolNumber !== id) {
          const res2 = await supabase
            .from("bill_of_lading")
            .update(updatePayload)
            .eq("bol_number", targetBolNumber)
            .select()
            .maybeSingle()
          if (res2.data) {
            data = res2.data
            error = res2.error
          }
        }

        // 3. If no row existed in Supabase, insert it as a new record
        if (!data) {
          const insertPayload: Record<string, any> = {
            ...updatePayload,
            issue_date: body.issue_date || new Date().toISOString().split("T")[0],
            created_at: body.created_at || new Date().toISOString(),
          }
          if (isUUID(rawId)) {
            insertPayload.id = rawId
          }
          const insertRes = await supabase
            .from("bill_of_lading")
            .insert(insertPayload)
            .select()
            .maybeSingle()
          if (insertRes.data) {
            data = insertRes.data
            error = insertRes.error
          }
        }

        if (error) {
          console.error("[v0] Error updating/upserting BOL in Supabase:", error.message)
        } else if (data) {
          savedData = {
            ...updatePayload,
            ...fullUpdated,
            ...(data || {}),
            ...updatePayload,
            id: data?.id || updatePayload.id || id,
          }
          savedToSupabase = true
        }
      } catch (supabaseErr) {
        console.error("[v0] Supabase connection failed, updated locally:", supabaseErr)
      }
    }
    
    // Non-destructive lifecycle audit log
    if (isArchiving) {
      void logBolLifecycleAudit({
        action: "BOL_ARCHIVED",
        entityId: id,
        bolNumber: targetBolNumber,
        actor: user?.email || updatePayload.archived_by || "user",
        metadata: { reason: updatePayload.archive_reason },
      })
    } else if (isRestoring) {
      void logBolLifecycleAudit({
        action: "BOL_RESTORED",
        entityId: id,
        bolNumber: targetBolNumber,
        actor: user?.email || "user",
      })
    } else {
      void logBolLifecycleAudit({
        action: "BOL_UPDATED",
        entityId: id,
        bolNumber: targetBolNumber,
        actor: user?.email || "user",
        metadata: { revision: newRevision, pdf_status: pdfStatus },
      })
    }

    return NextResponse.json({ 
      success: true,
      data: savedData,
      saved_to: savedToSupabase ? "supabase" : "local"
    })
  } catch (err) {
    console.error("[bol/[id] API] PUT error:", err)
    return NextResponse.json({ 
      error: "Failed to update BOL" 
    }, { status: 400 })
  }
}

// DELETE: Delete a BOL
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user: any = null
  let supabase: any = null

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      supabase = await createClient()
      const { data, error: authError } = await supabase.auth.getUser()
      if (authError || !data?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      user = data.user
    } catch (err) {
      console.warn("[v0] Supabase auth check error:", err)
    }
  }

  const { id } = await params
  
  try {
    const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || "").toLowerCase().trim()
    if (role === "shipper" || role === "client" || role === "viewer") {
      return NextResponse.json(
        { error: "Forbidden: Clients cannot delete Bill of Lading records." },
        { status: 403 }
      )
    }

    // Financial Invariance & Ledger Integrity Guard: Block hard delete if active financial records depend on this BOL
    const force = new URL(request.url).searchParams.get("force") === "true"
    if (!force) {
      const ledgerCheck = await checkBolLedgerReferences(id)
      if (ledgerCheck.hasReferences) {
        return NextResponse.json(
          {
            error: "Cannot hard-delete Bill of Lading: active financial ledger records are linked to this BOL.",
            blocked: true,
            ledgerCount: ledgerCheck.count,
            matchedBolNumber: ledgerCheck.matchedBolNumber,
            details: ledgerCheck.details,
            message: "Accounting invariance requires ledger history to be preserved. Please use 'Archive BOL' instead.",
          },
          { status: 400 }
        )
      }
    }

    let deletedFromSupabase = false
    
    if (supabase) {
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        let query = supabase.from("bill_of_lading").delete()
        if (isUUID) {
          query = query.or(`id.eq.${id},bol_number.eq.${id}`)
        } else {
          query = query.eq("bol_number", id)
        }
        
        const { error } = await query
        if (!error) {
          deletedFromSupabase = true
        }
      } catch (supabaseErr) {
        console.error("[v0] Supabase connection failed, deleting locally:", supabaseErr)
      }
    }

    // Forward delete to FastAPI SQLite backend
    try {
      if (await isFastApiHealthy()) {
        await fetch(`${getFastApiBaseUrl()}/api/v1/bols/${encodeURIComponent(id)}`, {
          method: "DELETE",
          signal: AbortSignal.timeout(600),
        })
      }
    } catch {}

    // Also delete from local storage
    await localStorage.deleteLocalBOL(id)
    
    void logBolLifecycleAudit({
      action: "BOL_DELETED",
      entityId: id,
      bolNumber: id,
      actor: user?.email || "user",
    })

    return NextResponse.json({ 
      success: true,
      deleted_from: deletedFromSupabase ? "supabase" : "local"
    })
  } catch (err: any) {
    console.error("[bol/[id] API] DELETE error:", err)
    return NextResponse.json({ 
      error: "Failed to delete BOL",
      details: err?.message || String(err)
    }, { status: 500 })
  }
}

export const PATCH = PUT
