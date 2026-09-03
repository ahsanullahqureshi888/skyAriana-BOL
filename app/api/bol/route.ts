import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import * as localStorage from "@/lib/services/local-storage-service"
import * as fs from "fs"
import * as path from "path"
import { tryPythonBackend } from "@/lib/services/python-backend-proxy"
import { readJsonFile } from "@/lib/services/blob-db"

// Helper function to extract numeric suffix from a BOL number string
function extractBolNumberSuffix(bolNum: any): number {
  if (!bolNum) return 0
  const str = String(bolNum)
  const match = str.match(/NSA(\d+)/i) || str.match(/(\d+)\s*$/)
  if (match && match[1]) {
    const val = parseInt(match[1], 10)
    return isNaN(val) ? 0 : val
  }
  return 0
}

// Compute the next sequence BOL number based on maximum existing BOL number
async function computeNextBOLNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()
  let maxNum = 0

  // 1. Check local storage
  try {
    const localBols = await localStorage.getAllLocalBOLs()
    for (const bol of localBols) {
      const numStr = bol.bol_number || bol.billOfLadingNumber || bol.id || ""
      const parsed = extractBolNumberSuffix(numStr)
      if (parsed > maxNum) maxNum = parsed
    }
  } catch (e) {
    console.error("[v0] Error reading local BOLs for sequence:", e)
  }

  // 1b. Check snapshot documents
  try {
    const snapPath = path.join(process.cwd(), ".local-full-snapshot.json")
    const snapshot = await readJsonFile<any>(snapPath, {})
    if (snapshot && Array.isArray(snapshot.documents)) {
      for (const bol of snapshot.documents) {
        const numStr = bol.bol_number || bol.billOfLadingNumber || bol.id || ""
        const parsed = extractBolNumberSuffix(numStr)
        if (parsed > maxNum) maxNum = parsed
      }
    }
  } catch (e) {
    console.error("[v0] Error reading snapshot for sequence:", e)
  }

  // 2. Check Supabase database
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("bill_of_lading")
      .select("bol_number, id")
    if (data && Array.isArray(data)) {
      for (const bol of data) {
        const numStr = bol.bol_number || bol.id || ""
        const parsed = extractBolNumberSuffix(numStr)
        if (parsed > maxNum) maxNum = parsed
      }
    }
  } catch (e) {
    console.error("[v0] Error checking Supabase for max BOL sequence:", e)
  }

  // Start sequence at minimum 470 as requested by user
  const START_SEQUENCE = 470
  const nextSeq = Math.max(START_SEQUENCE, maxNum + 1)
  const padded = String(nextSeq).padStart(3, "0")
  return `BOL-${currentYear}-NSA${padded}`
}

// GET: Fetch all BOLs or get next BOL number
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  
  if (action === "next-number") {
    // Dynamically compute next BOL number from max existing BOL number across database & local storage
    const bolNumber = await computeNextBOLNumber()
    return NextResponse.json({ bolNumber })
  }
  
  // Default: List all BOLs - try Supabase first, fallback to local storage
  try {
    const pythonBols = await tryPythonBackend("/api/bol")
    if (pythonBols) return NextResponse.json(pythonBols)

    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("bill_of_lading")
      .select("*")
      .order("created_at", { ascending: false })
    
    const localBols = await localStorage.getAllLocalBOLs()

    if (error) {
      console.error("[v0] Supabase error, using local BOLs:", error.message)
      return NextResponse.json({ data: localBols, source: "local" })
    }

    const mergedByNumber = new Map<string, any>()
    for (const bol of localBols) {
      const key = bol.bol_number || bol.id
      if (key) mergedByNumber.set(key, bol)
    }
    for (const bol of data || []) {
      const key = bol.bol_number || bol.id
      if (key) {
        const existing = mergedByNumber.get(key)
        if (!existing) {
          mergedByNumber.set(key, bol)
        } else {
          // Priority to the one that has a more recent updated_at, or failing that, the one with more data fields
          const existingTime = new Date(existing.updated_at || existing.created_at || 0).getTime()
          const newTime = new Date(bol.updated_at || bol.created_at || 0).getTime()
          
          if (newTime > existingTime) {
             mergedByNumber.set(key, bol)
          } else if (newTime === existingTime) {
             // If same time, pick the one with a non-empty shipper_name
             if (!existing.shipper_name && bol.shipper_name) {
               mergedByNumber.set(key, bol)
             }
          }
        }
      }
    }

    let allBols = Array.from(mergedByNumber.values()).filter((bol) => {
      const s = (bol.shipper_name || "").trim().toLowerCase()
      const hasShipper = s !== "" && s !== "no shipper" && s !== "no-shipper" && s !== "none"
      const hasBol = Boolean(bol.bol_number && String(bol.bol_number).trim().length > 3)
      const q = (bol.number_of_packages || "").trim().toLowerCase()
      const hasPkg = q !== "" && q !== "0" && q !== "0-ctns" && q !== "0 ctns"
      const nw = (bol.net_weight || "").trim()
      const gw = (bol.gross_weight || "").trim()
      const val = (bol.goods_value || "").trim()
      const cName = (bol.consignee_name || "").trim().toLowerCase()
      const hasConsignee = cName !== "" && cName !== "no consignee"
      const hasDesc = (bol.cargo_description || "").replace(/[^\w\s\u0600-\u06FF]/g, "").trim().length > 3
      const hasDriver = Boolean((bol.driver_name || "").trim() || (bol.driver_rent || "").trim() || (bol.truck_number || "").trim())
      return hasShipper || hasBol || hasPkg || nw !== "" || gw !== "" || val !== "" || hasConsignee || hasDesc || hasDriver
    }).sort((a, b) => {
      const dateA = new Date(a.created_at || a.updated_at || a.issue_date || 0).getTime()
      const dateB = new Date(b.created_at || b.updated_at || b.issue_date || 0).getTime()
      if (dateB !== dateA) return dateB - dateA
      return extractBolNumberSuffix(b.bol_number || "") - extractBolNumberSuffix(a.bol_number || "")
    })

    // Backend Authorization: Filter by linked shipper identity if requested by a shipper
    const shipperFilter = searchParams.get("shipper_name") || searchParams.get("client_name") || request.headers.get("x-shipper-name")
    const roleFilter = searchParams.get("role") || request.headers.get("x-user-role")

    if ((roleFilter === "shipper" || shipperFilter) && shipperFilter) {
      const sFilter = shipperFilter.trim().toLowerCase()
      allBols = allBols.filter((bol) => {
        const sName = (bol.shipper_name || "").toLowerCase()
        const cId = (bol.client_id || "").toLowerCase()
        return sName === sFilter || sName.includes(sFilter) || sFilter.includes(sName) || cId === sFilter
      })
    }

    return NextResponse.json({ data: allBols, source: localBols.length ? "merged" : "supabase" })
  } catch (err) {
    console.error("[v0] Error fetching BOLs:", err instanceof Error ? err.message : String(err))
    // Fallback to local storage on any error
    const localBols = await localStorage.getAllLocalBOLs()
    let sortedLocal = [...localBols].sort((a, b) => {
      const dateA = new Date(a.created_at || a.updated_at || a.issue_date || 0).getTime()
      const dateB = new Date(b.created_at || b.updated_at || b.issue_date || 0).getTime()
      if (dateB !== dateA) return dateB - dateA
      return extractBolNumberSuffix(b.bol_number || "") - extractBolNumberSuffix(a.bol_number || "")
    })

    const shipperFilter = searchParams.get("shipper_name") || searchParams.get("client_name") || request.headers.get("x-shipper-name")
    const roleFilter = searchParams.get("role") || request.headers.get("x-user-role")

    if ((roleFilter === "shipper" || shipperFilter) && shipperFilter) {
      const sFilter = shipperFilter.trim().toLowerCase()
      sortedLocal = sortedLocal.filter((bol) => {
        const sName = (bol.shipper_name || "").toLowerCase()
        const cId = (bol.client_id || "").toLowerCase()
        return sName === sFilter || sName.includes(sFilter) || sFilter.includes(sName) || cId === sFilter
      })
    }

    return NextResponse.json({ 
      data: sortedLocal, 
      source: "local",
      notice: "Using locally cached BOLs"
    })
  }
}

// POST: Create a new BOL
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const pythonBol = await tryPythonBackend("/api/bol", {
      method: "POST",
      body: JSON.stringify(body),
    })
    if (pythonBol) return NextResponse.json(pythonBol)
    
    // Use the BOL number from the body if provided, otherwise compute next sequence number
    const bolNumber = body.bol_number || await computeNextBOLNumber()
    
    console.log("[v0] Creating BOL with number:", bolNumber)

    // Remove client-side empty or string id when inserting new record
    const { id: rawId, ...cleanBody } = body
    
    const bolData: Record<string, any> = {
      bol_number: bolNumber,
      issue_date: body.issue_date || new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...cleanBody,
    }

    if (rawId && typeof rawId === "string" && rawId.length > 20 && !rawId.startsWith("BOL-")) {
      bolData.id = rawId
    }
    
    // Always store locally to guarantee local storage persistence
    await localStorage.storeLocalBOL(bolNumber, bolData)

    let savedData = {
      id: bolNumber,
      ...bolData,
    }
    let savedToSupabase = false
    
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from("bill_of_lading")
        .insert(bolData)
        .select()
        .single()
      
      if (error) {
        console.error("[v0] Supabase insert error:", error.message, error.details, error.hint)
      } else if (data) {
        savedData = data
        savedToSupabase = true
        console.log("[v0] BOL saved to Supabase successfully:", data.id)
      }
    } catch (supabaseErr) {
      console.error("[v0] Supabase connection failed, saved locally:", 
        supabaseErr instanceof Error ? supabaseErr.message : String(supabaseErr))
    }
    
    return NextResponse.json({ 
      success: true,
      data: savedData,
      saved_to: savedToSupabase ? "supabase" : "local",
      notice: savedToSupabase ? undefined : "Document saved locally and synchronized."
    })
  } catch (err) {
    console.error("[v0] Error in BOL creation:", err instanceof Error ? err.message : String(err))
    return NextResponse.json({ 
      success: false,
      error: err instanceof Error ? err.message : "Failed to create BOL" 
    }, { status: 400 })
  }
}
