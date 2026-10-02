import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import * as localStorage from "@/lib/services/local-storage-service"
import { advanceBolSequenceIfHigher } from "@/lib/services/bol-sequence"
import { getFastApiBaseUrl, isFastApiHealthy } from "@/lib/api/backend-url"

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
      // Background-enrich from FastAPI if healthy, but NEVER allow FastAPI's minimal schema to strip rich document fields
      try {
        if (await isFastApiHealthy()) {
          const fastUrl = `${getFastApiBaseUrl()}/api/v1/bols/${encodeURIComponent(id)}/details`
          const fastRes = await fetch(fastUrl, {
            signal: AbortSignal.timeout(300),
            headers: { Accept: "application/json" },
          })
          if (fastRes.ok) {
            const fastResult = await fastRes.json()
            if (fastResult?.data) {
              const enriched = { ...localBol }
              if (fastResult.data.revision) enriched.revision = fastResult.data.revision
              if (fastResult.data.status) enriched.status = fastResult.data.status
              return NextResponse.json({ data: enriched, source: "local-storage" })
            }
          }
        }
      } catch {}

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
        { error: "Forbidden: Clients cannot modify Bill of Lading records directly." },
        { status: 403 }
      )
    }

    const body = await request.json()
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
        const fastRes = await fetch(fastUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            revision: body.revision || 1,
            ...body,
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
    
    // Always update local storage first
    await localStorage.updateLocalBOL(id, { ...body, bol_number: targetBolNumber })
    if (targetBolNumber !== id) {
      await localStorage.updateLocalBOL(targetBolNumber, { ...body, bol_number: targetBolNumber })
    }
    if (!isUUID(targetBolNumber)) {
      await advanceBolSequenceIfHigher(targetBolNumber)
    }

    let savedData = {
      id,
      ...body,
      bol_number: targetBolNumber,
      updated_at: new Date().toISOString(),
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
          savedData = data
          savedToSupabase = true
        }
      } catch (supabaseErr) {
        console.error("[v0] Supabase connection failed, updated locally:", supabaseErr)
      }
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
    
    return NextResponse.json({ 
      success: true,
      deleted_from: deletedFromSupabase ? "supabase" : "local"
    })
  } catch (err) {
    console.error("[bol/[id] API] DELETE error:", err)
    return NextResponse.json({ 
      error: "Failed to delete BOL" 
    }, { status: 500 })
  }
}
