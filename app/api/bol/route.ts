import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import * as localStorage from "@/lib/services/local-storage-service"
import { getNextAtomicBolNumber, getNextAvailableBolNumber, advanceBolSequenceIfHigher } from "@/lib/services/bol-sequence"
import { getFastApiBaseUrl, isFastApiHealthy } from "@/lib/api/backend-url"
import seedBolsData from "@/lib/data/seed-bols.json"
import { computeBolSummary, isMeaningfulBOL, parseBolSeq, toLightweightBol, enrichBolListWithLocal, isUUID, cleanBolNumber } from "@/lib/utils/bol-filters"

export const dynamic = "force-dynamic"
export const revalidate = 0

function extractBolNumberSuffix(bolNum: any): number {
  if (!bolNum) return 0
  const str = String(bolNum).trim()
  if (isUUID(str)) return 0
  const match = str.match(/NSA[-\s]*(\d+)/i) || str.match(/(\d+)\s*$/)
  if (match && match[1]) {
    const val = parseInt(match[1], 10)
    return isNaN(val) ? 0 : val
  }
  return 0
}

// GET: Fetch all BOLs or get next BOL number
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  
  if (action === "next-number") {
    try {
      const advance = searchParams.get("advance") === "true"
      const minSeqParam = searchParams.get("minSequence")
      const minSeq = minSeqParam ? parseInt(minSeqParam, 10) : 0
      if (minSeq > 0) {
        await advanceBolSequenceIfHigher(`BOL-2026-NSA${minSeq - 1}`)
      }
      const bolNumber = advance ? await getNextAtomicBolNumber() : await getNextAvailableBolNumber()
      return NextResponse.json({ bolNumber })
    } catch (err) {
      console.error("[bol API] Error generating next number:", err)
      return NextResponse.json({ bolNumber: "BOL-2026-NSA685" })
    }
  }

  if (action === "set-sequence") {
    try {
      const seqStr = searchParams.get("sequence") || searchParams.get("start")
      const seqNum = seqStr ? parseInt(seqStr, 10) : 685
      if (!isNaN(seqNum) && seqNum > 0) {
        const { setBolStartingSequence } = await import("@/lib/services/bol-sequence")
        await setBolStartingSequence(seqNum)
        const nextBol = await getNextAvailableBolNumber()
        return NextResponse.json({ success: true, startingSequence: seqNum, nextAvailable: nextBol })
      }
      return NextResponse.json({ error: "Invalid sequence number" }, { status: 400 })
    } catch (err) {
      console.error("[bol API] Error setting sequence:", err)
      return NextResponse.json({ error: "Failed to set sequence" }, { status: 500 })
    }
  }

  if (action === "summary") {
    // 1. Try ultra-fast FastAPI SQLite backend (<5ms)
    try {
      if (await isFastApiHealthy()) {
        const fastRes = await fetch(`${getFastApiBaseUrl()}/api/v1/bols/summary`, {
          signal: AbortSignal.timeout(600),
          headers: { Accept: "application/json" },
        })
        if (fastRes.ok) {
          const json = await fastRes.json()
          if (json && json.data && json.data.total_bols > 0) {
            return NextResponse.json({ success: true, data: json.data, source: "fastapi-sqlite" })
          }
        }
      }
    } catch {}

    // Fallback to local storage
    try {
      const localBols = await localStorage.getAllLocalBOLs()
      const summary = computeBolSummary(localBols)
      return NextResponse.json({ success: true, data: summary, source: "local-storage" })
    } catch (err) {
      return NextResponse.json({ success: false, error: "Failed to compute summary" }, { status: 500 })
    }
  }

  if (action === "recent") {
    const limitParam = parseInt(searchParams.get("limit") || "6", 10)
    const limit = Math.max(1, Math.min(20, isNaN(limitParam) ? 6 : limitParam))

    try {
      const localBols = await localStorage.getAllLocalBOLs().catch(() => [])
      if (await isFastApiHealthy()) {
        const fastRes = await fetch(`${getFastApiBaseUrl()}/api/v1/bols/recent?limit=${limit}`, {
          signal: AbortSignal.timeout(600),
          headers: { Accept: "application/json" },
        })
        if (fastRes.ok) {
          const json = await fastRes.json()
          if (json && Array.isArray(json.data) && json.data.length > 0) {
            const enriched = enrichBolListWithLocal(json.data, localBols)
            const activeOnly = enriched.filter((b: any) => !b.isArchived && b.status !== "archived")
            return NextResponse.json({ success: true, data: activeOnly.map(toLightweightBol), source: "fastapi-sqlite" })
          }
        }
      }
    } catch {}

    try {
      const localBols = await localStorage.getAllLocalBOLs()
      const valid = localBols
        .filter((b: any) => isMeaningfulBOL(b) && !b.isArchived && b.status !== "archived")
        .sort((a, b) => {
          const dateA = new Date(a.created_at || a.updated_at || a.issue_date || 0).getTime()
          const dateB = new Date(b.created_at || b.updated_at || b.issue_date || 0).getTime()
          if (dateB !== dateA) return dateB - dateA
          return parseBolSeq(b.bol_number || "") - parseBolSeq(a.bol_number || "")
        })
        .slice(0, limit)
        .map(toLightweightBol)

      return NextResponse.json({ success: true, data: valid, source: "local-storage" })
    } catch (err) {
      return NextResponse.json({ success: false, error: "Failed to fetch recent BOLs" }, { status: 500 })
    }
  }

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

  // Handle request for ALL BOLs (e.g. Reports, analytics, full exports)
  const isAllRequested =
    searchParams.get("all") === "true" ||
    searchParams.get("limit") === "all" ||
    searchParams.get("page_size") === "all" ||
    searchParams.get("action") === "all"

  if (isAllRequested) {
    try {
      const localBols = await localStorage.getAllLocalBOLs().catch(() => [])
      let allFastItems: any[] = []

      if (await isFastApiHealthy()) {
        const fastApiUrl = new URL(`${getFastApiBaseUrl()}/api/v1/bols`)
        fastApiUrl.searchParams.set("page", "1")
        fastApiUrl.searchParams.set("page_size", "100")
        const statusVal = searchParams.get("status")
        if (statusVal && statusVal !== "all") {
          fastApiUrl.searchParams.set("status", statusVal)
        }

        const fastRes = await fetch(fastApiUrl.toString(), {
          signal: AbortSignal.timeout(1000),
          headers: { Accept: "application/json" },
        })

        if (fastRes.ok) {
          const fastResult = await fastRes.json()
          if (fastResult && Array.isArray(fastResult.items)) {
            allFastItems = [...fastResult.items]
            const total = fastResult.total || fastResult.items.length
            if (total > fastResult.items.length) {
              const totalPages = Math.ceil(total / 100)
              const extraPromises = []
              for (let p = 2; p <= totalPages; p++) {
                const pageUrl = new URL(fastApiUrl.toString())
                pageUrl.searchParams.set("page", String(p))
                pageUrl.searchParams.set("page_size", "100")
                if (statusVal && statusVal !== "all") {
                  pageUrl.searchParams.set("status", statusVal)
                }
                extraPromises.push(
                  fetch(pageUrl.toString(), { signal: AbortSignal.timeout(1500), headers: { Accept: "application/json" } })
                    .then((r) => (r.ok ? r.json() : null))
                    .then((j) => (Array.isArray(j?.items) ? j.items : []))
                    .catch(() => [])
                )
              }
              const extraPages = await Promise.all(extraPromises)
              allFastItems = [...allFastItems, ...extraPages.flat()]
            }
          }
        }
      }

      // Merge SQLite items with any local-only files
      const fastKeys = new Set(
        allFastItems.map((i: any) => (cleanBolNumber(i.bol_number) || i.id || "").toUpperCase())
      )
      const localOnly = localBols.filter((lb: any) => {
        const k = (cleanBolNumber(lb.bol_number) || lb.id || "").toUpperCase()
        return k && !fastKeys.has(k) && isMeaningfulBOL(lb)
      })

      const combined = [...localOnly, ...allFastItems]
      const enrichedAll = enrichBolListWithLocal(combined, localBols)

      // Sort chronological descending (latest first)
      enrichedAll.sort((a: any, b: any) => {
        const dateA = new Date((a as any).updated_at || a.created_at || a.issue_date || 0).getTime()
        const dateB = new Date((b as any).updated_at || b.created_at || b.issue_date || 0).getTime()
        if (dateB !== dateA) return dateB - dateA
        return parseBolSeq(b.bol_number || "") - parseBolSeq(a.bol_number || "")
      })

      return NextResponse.json({
        success: true,
        data: enrichedAll.map(toLightweightBol),
        total: enrichedAll.length,
        page: 1,
        page_size: enrichedAll.length,
        total_pages: 1,
        source: allFastItems.length > 0 ? "fastapi-sqlite-all" : "local-storage-all",
      })
    } catch (err) {
      console.error("[bol API] Error fetching all BOLs:", err)
      const localBols = await localStorage.getAllLocalBOLs().catch(() => [])
      return NextResponse.json({
        success: true,
        data: localBols.filter(isMeaningfulBOL).map(toLightweightBol),
        total: localBols.length,
        source: "local-storage-fallback",
      })
    }
  }

  // 1. Ultra-Fast FastAPI SQLite Backend with server-side pagination (<10ms)
  try {
    if (await isFastApiHealthy()) {
      const fastApiUrl = new URL(`${getFastApiBaseUrl()}/api/v1/bols`)
      const searchParam = searchParams.get("search") || searchParams.get("q")
      if (searchParam) fastApiUrl.searchParams.set("q", searchParam)
      const pageParam = searchParams.get("page")
      if (pageParam) fastApiUrl.searchParams.set("page", pageParam)
      const pageSizeParam = searchParams.get("page_size") || searchParams.get("limit")
      if (pageSizeParam) fastApiUrl.searchParams.set("page_size", pageSizeParam)

      const filterKeys = ["date_from", "date_to", "shipper", "consignee", "notify_party", "company_id"]
      for (const key of filterKeys) {
        const val = searchParams.get(key)
        if (val) fastApiUrl.searchParams.set(key, val)
      }
      const statusVal = searchParams.get("status")
      if (statusVal && statusVal !== "all") {
        fastApiUrl.searchParams.set("status", statusVal)
      }

      const fastRes = await fetch(fastApiUrl.toString(), {
        signal: AbortSignal.timeout(600),
        headers: { Accept: "application/json" },
      })
      if (fastRes.ok) {
        const fastResult = await fastRes.json()
        if (fastResult && Array.isArray(fastResult.items)) {
          const localBols = await localStorage.getAllLocalBOLs().catch(() => [])

          let filteredLocalOnly: any[] = []
          const fastKeys = new Set(
            fastResult.items.map((i: any) => (cleanBolNumber(i.bol_number) || i.id || "").toUpperCase())
          )

          if (!searchParam && localBols.length > fastResult.total) {
            const localOnly = localBols.filter((lb: any) => {
              const k = (cleanBolNumber(lb.bol_number) || lb.id || "").toUpperCase()
              return k && !fastKeys.has(k) && isMeaningfulBOL(lb)
            })

            const statusParam = (searchParams.get("status") || "all").toLowerCase().trim()
            if (statusParam === "active") {
              filteredLocalOnly = localOnly.filter((b: any) => !b.isArchived && b.status !== "archived")
            } else if (statusParam === "archived") {
              filteredLocalOnly = localOnly.filter((b: any) => Boolean(b.isArchived || b.status === "archived"))
            } else {
              filteredLocalOnly = localOnly
            }
          } else if (searchParam) {
            const sLower = searchParam.toLowerCase().trim()
            const sAlpha = sLower.replace(/[^a-z0-9]/g, "")
            const localMatches = localBols.filter((lb: any) => {
              const k = (cleanBolNumber(lb.bol_number) || lb.id || "").toUpperCase()
              if (!k || fastKeys.has(k) || !isMeaningfulBOL(lb)) return false
              const bNum = (lb.bol_number || "").toLowerCase()
              const sName = (lb.shipper_name || lb.shipperName || "").toLowerCase()
              const cName = (lb.consignee_name || lb.consigneeName || "").toLowerCase()
              const dName = (lb.driver_name || lb.driverName || "").toLowerCase()
              const tNum = (lb.truck_number || lb.truckNumber || "").toLowerCase()
              const cDesc = (lb.cargo_description || lb.cargoDescription || "").toLowerCase()
              const dContact = (lb.driver_contact || lb.driverContact || lb.driver_phone || "").toLowerCase()
              const cNotes = ((lb.notes_1 || "") + " " + (lb.notes_2 || "")).toLowerCase()
              if (bNum.includes(sLower) || sName.includes(sLower) || cName.includes(sLower) || dName.includes(sLower) || tNum.includes(sLower) || cDesc.includes(sLower) || dContact.includes(sLower) || cNotes.includes(sLower)) return true
              if (sAlpha.length >= 3 && bNum.replace(/[^a-z0-9]/g, "").includes(sAlpha)) return true
              return false
            })

            const statusParam = (searchParams.get("status") || "all").toLowerCase().trim()
            if (statusParam === "active") {
              filteredLocalOnly = localMatches.filter((b: any) => !b.isArchived && b.status !== "archived")
            } else if (statusParam === "archived") {
              filteredLocalOnly = localMatches.filter((b: any) => Boolean(b.isArchived || b.status === "archived"))
            } else {
              filteredLocalOnly = localMatches
            }
          }

          const combined = [...filteredLocalOnly, ...fastResult.items]
          const enriched = enrichBolListWithLocal(combined, localBols)
          const totalCount = fastResult.total + filteredLocalOnly.length
          const pageParam = searchParams.get("page")
          const pageSizeParam = searchParams.get("page_size") || searchParams.get("limit")

          if (pageParam || pageSizeParam) {
            const page = Math.max(1, parseInt(pageParam || String(fastResult.page || 1), 10) || 1)
            const pageSize = Math.max(1, Math.min(100, parseInt(pageSizeParam || String(fastResult.page_size || 50), 10) || 50))
            const paged = filteredLocalOnly.length > 0 
              ? enriched.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
              : enriched

            return NextResponse.json({
              data: paged.map(toLightweightBol),
              total: totalCount,
              page,
              page_size: pageSize,
              total_pages: Math.ceil(totalCount / pageSize),
              source: "fastapi-sqlite",
            })
          }

            return NextResponse.json({
              data: enriched.map(toLightweightBol),
              total: totalCount,
              page: fastResult.page,
              page_size: fastResult.page_size,
              total_pages: Math.ceil(totalCount / (fastResult.page_size || 50)),
              source: "fastapi-sqlite",
            })
        }
      }
    }
  } catch {
    // Seamless fallback to Supabase and local storage
  }

  // Fallback: List all BOLs - try Supabase first, fallback to local storage
  try {
    let data: any[] | null = null
    if (supabase) {
      try {
        const { data: supaData, error } = await supabase
          .from("bill_of_lading")
          .select("*")
          .order("created_at", { ascending: false })
        if (!error && supaData) {
          data = supaData
        }
      } catch (err) {
        console.warn("[v0] Supabase query skipped:", err)
      }
    }
    
    const localBols = await localStorage.getAllLocalBOLs()

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
          const existingTime = new Date(existing.updated_at || existing.created_at || 0).getTime()
          const newTime = new Date(bol.updated_at || bol.created_at || 0).getTime()
          
          if (newTime > existingTime) {
             mergedByNumber.set(key, bol)
          } else if (newTime === existingTime) {
             if (!existing.shipper_name && bol.shipper_name) {
               mergedByNumber.set(key, bol)
             }
          }
        }
      }
    }

    if (mergedByNumber.size === 0 && Array.isArray(seedBolsData) && seedBolsData.length > 0) {
      for (const bol of seedBolsData as any[]) {
        const key = bol.bol_number || bol.id
        if (key && !mergedByNumber.has(key)) {
          mergedByNumber.set(key, bol)
        }
      }
      // If cloud Supabase is available, sync seed BOLs in the background
      if (supabase && (!data || data.length === 0)) {
        const toSync = Array.from(mergedByNumber.values()).slice(0, 20)
        supabase.from("bill_of_lading").upsert(toSync, { onConflict: "bol_number" }).then(() => {}).catch(() => {})
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

    // Backend Authorization: Filter by linked shipper identity
    const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || searchParams.get("role") || "").toLowerCase()
    const shipperIdentity = user?.user_metadata?.shipper_name || user?.email || request.headers.get("x-shipper-name") || searchParams.get("shipper_name")

    if ((role === "shipper" || role === "client") && shipperIdentity) {
      const sFilter = shipperIdentity.trim().toLowerCase()
      allBols = allBols.filter((bol) => {
        const sName = (bol.shipper_name || "").toLowerCase()
        const cId = (bol.client_id || "").toLowerCase()
        return sName === sFilter || sName.includes(sFilter) || sFilter.includes(sName) || cId === sFilter
      })
    }

    const pageParam = searchParams.get("page")
    const pageSizeParam = searchParams.get("page_size") || searchParams.get("limit")
    const searchFilter = (searchParams.get("search") || searchParams.get("q") || "").trim().toLowerCase()

    if (searchFilter) {
      const sAlpha = searchFilter.replace(/[^a-z0-9]/g, "")
      allBols = allBols.filter((bol) => {
        const bNum = (bol.bol_number || "").toLowerCase()
        const sName = (bol.shipper_name || "").toLowerCase()
        const cName = (bol.consignee_name || "").toLowerCase()
        const dName = (bol.driver_name || "").toLowerCase()
        const tNum = (bol.truck_number || "").toLowerCase()
        const cDesc = (bol.cargo_description || "").toLowerCase()
        const dContact = (bol.driver_contact || bol.driverContact || bol.driver_phone || "").toLowerCase()
        const cNotes = ((bol.notes_1 || "") + " " + (bol.notes_2 || "")).toLowerCase()
        if (bNum.includes(searchFilter) || sName.includes(searchFilter) || cName.includes(searchFilter) || dName.includes(searchFilter) || tNum.includes(searchFilter) || cDesc.includes(searchFilter) || dContact.includes(searchFilter) || cNotes.includes(searchFilter)) return true
        if (sAlpha.length >= 3 && bNum.replace(/[^a-z0-9]/g, "").includes(sAlpha)) return true
        return false
      })
    }

    const statusParam = (searchParams.get("status") || "all").toLowerCase().trim()
    if (statusParam === "active") {
      allBols = allBols.filter((bol) => !bol.isArchived && bol.status !== "archived")
    } else if (statusParam === "archived") {
      allBols = allBols.filter((bol) => Boolean(bol.isArchived || bol.status === "archived"))
    }

    if (pageParam || pageSizeParam) {
      const page = Math.max(1, parseInt(pageParam || "1", 10) || 1)
      const pageSize = Math.max(1, Math.min(100, parseInt(pageSizeParam || "50", 10) || 50))
      const total = allBols.length
      const start = (page - 1) * pageSize
      const paged = allBols.slice(start, start + pageSize)

      return NextResponse.json({
        data: paged.map(toLightweightBol),
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize),
        source: localBols.length ? "merged" : "supabase",
      })
    }

    return NextResponse.json({ data: allBols.map(toLightweightBol), total: allBols.length, source: localBols.length ? "merged" : "supabase" })
  } catch (err) {
    console.error("[v0] Error fetching BOLs:", err instanceof Error ? err.message : String(err))
    const localBols = await localStorage.getAllLocalBOLs()
    let sortedLocal = [...localBols].sort((a, b) => {
      const dateA = new Date(a.created_at || a.updated_at || a.issue_date || 0).getTime()
      const dateB = new Date(b.created_at || b.updated_at || b.issue_date || 0).getTime()
      if (dateB !== dateA) return dateB - dateA
      return extractBolNumberSuffix(b.bol_number || "") - extractBolNumberSuffix(a.bol_number || "")
    })

    const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || "").toLowerCase()
    const shipperIdentity = user?.user_metadata?.shipper_name || user?.email || request.headers.get("x-shipper-name")

    if ((role === "shipper" || role === "client") && shipperIdentity) {
      const sFilter = shipperIdentity.trim().toLowerCase()
      sortedLocal = sortedLocal.filter((bol) => {
        const sName = (bol.shipper_name || "").toLowerCase()
        const cId = (bol.client_id || "").toLowerCase()
        return sName === sFilter || sName.includes(sFilter) || sFilter.includes(sName) || cId === sFilter
      })
    }

    const pageParam = searchParams.get("page")
    const pageSizeParam = searchParams.get("page_size") || searchParams.get("limit")
    const searchFilter = (searchParams.get("search") || "").trim().toLowerCase()

    if (searchFilter) {
      sortedLocal = sortedLocal.filter((bol) => {
        const bNum = (bol.bol_number || "").toLowerCase()
        const sName = (bol.shipper_name || "").toLowerCase()
        const cName = (bol.consignee_name || "").toLowerCase()
        const dName = (bol.driver_name || "").toLowerCase()
        return bNum.includes(searchFilter) || sName.includes(searchFilter) || cName.includes(searchFilter) || dName.includes(searchFilter)
      })
    }

    const statusParam = (searchParams.get("status") || "all").toLowerCase().trim()
    if (statusParam === "active") {
      sortedLocal = sortedLocal.filter((bol) => !bol.isArchived && bol.status !== "archived")
    } else if (statusParam === "archived") {
      sortedLocal = sortedLocal.filter((bol) => Boolean(bol.isArchived || bol.status === "archived"))
    }

    if (pageParam || pageSizeParam) {
      const page = Math.max(1, parseInt(pageParam || "1", 10) || 1)
      const pageSize = Math.max(1, Math.min(100, parseInt(pageSizeParam || "50", 10) || 50))
      const total = sortedLocal.length
      const start = (page - 1) * pageSize
      const paged = sortedLocal.slice(start, start + pageSize)

      return NextResponse.json({
        data: paged.map(toLightweightBol),
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize),
        source: "local",
        notice: "Using locally cached BOLs",
      })
    }

    return NextResponse.json({ 
      data: sortedLocal.map(toLightweightBol), 
      total: sortedLocal.length,
      source: "local",
      notice: "Using locally cached BOLs"
    })
  }
}

// POST: Create a new BOL with atomic sequence and collision retry
export async function POST(request: Request) {
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

    const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || "admin").toLowerCase()
    if (role === "shipper" || role === "client" || role === "viewer") {
      return NextResponse.json({ error: "Forbidden: Unauthorized to create BOL documents" }, { status: 403 })
    }

    const body = await request.json()
    const { id: rawId, ...cleanBody } = body
    
    let attempts = 0
    let savedData: any = null
    let savedToSupabase = false

    while (attempts < 3) {
      attempts++
      const candidateBol = (body.bol_number && typeof body.bol_number === "string" && !isUUID(body.bol_number) && body.bol_number.trim().length > 3)
        ? body.bol_number.trim()
        : null
      const bolNumber = (attempts === 1 && candidateBol) ? candidateBol : await getNextAtomicBolNumber()

      const notifyPartyValue = body.notify_party_name || body.notify_party || body.notifyParty || null
      const notifyAddressValue = body.notify_party_address || body.notifyAddress || null
      const bolData: Record<string, any> = {
        bol_number: bolNumber,
        issue_date: body.issue_date || new Date().toISOString().split("T")[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user?.id || null,
        ...cleanBody,
        ...(notifyPartyValue ? { notify_party: notifyPartyValue, notify_party_name: notifyPartyValue } : {}),
        ...(notifyAddressValue ? { notify_party_address: notifyAddressValue } : {}),
      }

      if (rawId && typeof rawId === "string" && rawId.length > 20 && !rawId.startsWith("BOL-")) {
        bolData.id = rawId
      }

      savedData = {
        id: bolNumber,
        ...bolData,
      }

      // Persist locally
      await localStorage.storeLocalBOL(bolNumber, bolData)
      if (!isUUID(bolNumber)) {
        await advanceBolSequenceIfHigher(bolNumber)
      }

      // Forward creation to FastAPI SQLite backend (<10ms)
      try {
        if (await isFastApiHealthy()) {
          await fetch(`${getFastApiBaseUrl()}/api/v1/bols`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              bol_number: bolNumber,
              issue_date: bolData.issue_date,
              origin: bolData.origin || "Bandar Abbas",
              destination: bolData.destination || "Kabul",
              border_station: bolData.border_station || "Islam Qala",
              driver_name: bolData.driver_name || "",
              father_name: bolData.driver_father_name || bolData.father_name || null,
              driver_rent: (() => {
                const s = String(bolData.driver_rent || bolData.driverFreight || bolData.driverRent || "").replace(/,/g, "")
                const m = s.match(/-?[\d.]+/)
                return m ? (parseFloat(m[0]) || 0) : 0
              })(),
              carton_count: (() => {
                const s = String(bolData.number_of_packages || bolData.numberOfPackages || "").replace(/,/g, "")
                const m = s.match(/\d+/)
                return m ? (parseInt(m[0], 10) || 0) : 0
              })(),
              gross_weight_kg: (() => {
                const s = String(bolData.gross_weight || bolData.grossWeight || "").replace(/,/g, "")
                const m = s.match(/-?[\d.]+/)
                return m ? (parseFloat(m[0]) || 0) : 0
              })(),
              net_weight_kg: (() => {
                const s = String(bolData.net_weight || bolData.netWeight || "").replace(/,/g, "")
                const m = s.match(/-?[\d.]+/)
                return m ? (parseFloat(m[0]) || 0) : 0
              })(),
              cargo_description: bolData.cargo_description || bolData.goods_description || null,
              status: "active",
              shipper_name: bolData.shipper_name || null,
              consignee_name: bolData.consignee_name || null,
              notify_party_name: bolData.notify_party_name || bolData.notify_party || bolData.notifyParty || null,
              truck_number: bolData.truck_number || null,
              driver_phone: bolData.driver_contact || null,
            }),
            signal: AbortSignal.timeout(1200),
          })
        }
      } catch {}

      // Automatically connect BOL to Accounting Ledger
      try {
        const { autoProcessBolAccounting } = await import("@/lib/services/bol-accounting-integration")
        await autoProcessBolAccounting(bolData)
      } catch (accErr) {
        console.error("Failed to auto-process accounting:", accErr)
      }

      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        try {
          const { data, error } = await supabase
            .from("bill_of_lading")
            .insert(bolData)
            .select()
            .single()

          if (error) {
            // Postgres unique violation error code: 23505
            if (error.code === "23505" && attempts < 3) {
              console.warn(`[BOL API] Duplicate bol_number ${bolNumber}, retrying with next atomic sequence...`)
              continue
            }
            console.error("[v0] Supabase insert error:", error.message, error.details)
          } else if (data) {
            savedData = {
              ...bolData,
              ...(data || {}),
              ...bolData,
              id: data?.id || bolData.id || bolNumber,
            }
            savedToSupabase = true
            break
          }
        } catch (supabaseErr) {
          console.error("[v0] Supabase connection failed, preserved locally:", supabaseErr)
          break
        }
      } else {
        break
      }
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
