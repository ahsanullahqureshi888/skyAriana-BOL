import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import * as localStorage from "@/lib/services/local-storage-service"

// GET: Fetch a single BOL by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("bill_of_lading")
      .select("*")
      .or(`id.eq.${id},bol_number.eq.${id}`)
      .single()
    
    let resultDoc = data
    if (error || !resultDoc) {
      const localBol = await localStorage.getLocalBOL(id)
      if (localBol) {
        resultDoc = localBol
      } else {
        return NextResponse.json({ error: error?.message || "BOL not found" }, { status: 404 })
      }
    }

    // Backend Authorization Check: Prevent Shipper ID manipulation
    const shipperFilter = request.headers.get("x-shipper-name") || new URL(request.url).searchParams.get("shipper_name")
    const roleFilter = request.headers.get("x-user-role") || new URL(request.url).searchParams.get("role")

    if (roleFilter === "shipper" && shipperFilter) {
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
    console.error("[v0] Unexpected error fetching BOL:", err)
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
  const { id } = await params
  
  try {
    const body = await request.json()
    
    // Always update local storage as well
    await localStorage.updateLocalBOL(id, body)

    let savedData = {
      id,
      ...body,
      updated_at: new Date().toISOString(),
    }
    let savedToSupabase = false
    
    try {
      const supabase = await createClient()

      // Try updating by UUID or by bol_number
      let { data, error } = await supabase
        .from("bill_of_lading")
        .update({
          ...body,
          updated_at: new Date().toISOString(),
        })
        .or(`id.eq.${id},bol_number.eq.${id}`)
        .select()
        .maybeSingle()

      // If no row existed to update in Supabase, insert it as a new record
      if (!data && (!error || error.code === "PGRST116")) {
        const { id: rawId, ...cleanBody } = body
        const insertPayload = {
          bol_number: body.bol_number || id,
          issue_date: body.issue_date || new Date().toISOString().split("T")[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...cleanBody,
        }
        const insertRes = await supabase
          .from("bill_of_lading")
          .insert(insertPayload)
          .select()
          .single()
        data = insertRes.data
        error = insertRes.error
      }

      if (error) {
        console.error("[v0] Error updating/upserting BOL in Supabase:", error.message)
      } else if (data) {
        savedData = data
        savedToSupabase = true
        console.log("[v0] BOL updated/upserted in Supabase:", data.id)
      }
    } catch (supabaseErr) {
      console.error("[v0] Supabase connection failed, updating locally:", 
        supabaseErr instanceof Error ? supabaseErr.message : String(supabaseErr))
    }
    
    return NextResponse.json({ 
      success: true,
      data: savedData,
      saved_to: savedToSupabase ? "supabase" : "local"
    })
  } catch (err) {
    console.error("[v0] Error in BOL update:", err)
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : "Failed to update BOL" 
    }, { status: 400 })
  }
}

// DELETE: Delete a BOL
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    let deletedFromSupabase = false
    
    try {
      const supabase = await createClient()
      
      const { error } = await supabase
        .from("bill_of_lading")
        .delete()
        .eq("id", id)
      
      if (error) {
        console.error("[v0] Error deleting BOL from Supabase:", error.message)
      } else {
        deletedFromSupabase = true
        console.log("[v0] BOL deleted from Supabase:", id)
      }
    } catch (supabaseErr) {
      console.error("[v0] Supabase connection failed, deleting locally:", 
        supabaseErr instanceof Error ? supabaseErr.message : String(supabaseErr))
    }
    
    // Also delete from local storage
    await localStorage.deleteLocalBOL(id)
    
    return NextResponse.json({ 
      success: true,
      deleted_from: deletedFromSupabase ? "supabase" : "local"
    })
  } catch (err) {
    console.error("[v0] Error in BOL deletion:", err)
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : "Failed to delete BOL" 
    }, { status: 500 })
  }
}
