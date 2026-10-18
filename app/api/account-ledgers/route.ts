import { NextResponse } from "next/server"
import { getAccountLedgerDatabase, saveAccountLedgerDatabase } from "@/lib/services/account-ledger-storage-service"
import { createClient } from "@/lib/supabase/server"
import { assertLedgerMapNotViolatingClosedPeriods } from "@/lib/accounting/period-closing/period-service"
import { getFastApiBaseUrl, isFastApiHealthy } from "@/lib/api/backend-url"

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
  const isServerDriven = searchParams.get("server_driven") === "true" || searchParams.has("page") || searchParams.has("account_id") || searchParams.has("date_from") || searchParams.has("date_to")
  const action = searchParams.get("action")

  // Fast Account Search
  if (action === "search-accounts") {
    try {
      if (await isFastApiHealthy()) {
        const q = searchParams.get("q") || ""
        const fastUrl = new URL(`${getFastApiBaseUrl()}/api/v1/ledger/accounts/search`)
        if (q) fastUrl.searchParams.set("q", q)
        const fastRes = await fetch(fastUrl.toString(), {
          signal: AbortSignal.timeout(600),
          headers: { Accept: "application/json" },
        })
        if (fastRes.ok) {
          const resData = await fastRes.json()
          return NextResponse.json({ success: true, data: resData.data, source: "fastapi-sqlite" })
        }
      }
    } catch {
      // Fallback
    }
  }

  // Server-driven ledger query
  if (isServerDriven) {
    try {
      if (await isFastApiHealthy()) {
        const fastUrl = new URL(`${getFastApiBaseUrl()}/api/v1/ledger`)
        searchParams.forEach((val, key) => fastUrl.searchParams.set(key, val))
        const fastRes = await fetch(fastUrl.toString(), {
          signal: AbortSignal.timeout(600),
          headers: { Accept: "application/json" },
        })
        if (fastRes.ok) {
          const resData = await fastRes.json()
          return NextResponse.json({ success: true, data: resData.data, source: "fastapi-sqlite" })
        }
      }
    } catch {
      // Fallback
    }
  }

  // Fast Account Summary (Accounts list + tombstones only, without megabytes of transaction rows)
  if (action === "accounts" || action === "summary") {
    try {
      const dbData = await getAccountLedgerDatabase()
      return NextResponse.json({
        success: true,
        data: {
          accounts: dbData.accounts || [],
          deletedLedgerEntries: dbData.deletedLedgerEntries || [],
          totalAccounts: (dbData.accounts || []).length,
        },
        source: "local-file-summary",
      })
    } catch {
      return NextResponse.json({ success: false, data: { accounts: [], deletedLedgerEntries: [] } }, { status: 500 })
    }
  }

  // Single-account query (operate on selected account only — Section 73)
  const singleAccountQuery = searchParams.get("account") || searchParams.get("company_name")
  if (singleAccountQuery) {
    try {
      const dbData = await getAccountLedgerDatabase()
      const targetKey = singleAccountQuery.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
      const filteredEntries: Record<string, any[]> = {}
      if (dbData.ledgerEntries && typeof dbData.ledgerEntries === "object") {
        for (const [k, rows] of Object.entries(dbData.ledgerEntries)) {
          if (k.toLowerCase().replace(/[^a-z0-9]/g, "") === targetKey) {
            filteredEntries[k] = rows
          }
        }
      }
      return NextResponse.json({
        success: true,
        data: {
          accounts: dbData.accounts || [],
          ledgerEntries: filteredEntries,
          deletedLedgerEntries: dbData.deletedLedgerEntries || [],
        },
        source: "single-account-ledger",
      })
    } catch {
      // Fall through to full
    }
  }

  try {
    const data = await getAccountLedgerDatabase()
    
    const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || "").toLowerCase()
    const shipperIdentity = user?.user_metadata?.shipper_name || user?.email || request.headers.get("x-shipper-name")

    if ((role === "shipper" || role === "client") && shipperIdentity && data) {
      const sFilter = shipperIdentity.trim().toLowerCase()
      const filteredAccounts = (data.accounts || []).filter((accName: string) => {
        const aName = accName.toLowerCase()
        return aName === sFilter || aName.includes(sFilter) || sFilter.includes(aName)
      })

      const filteredLedgerEntries: Record<string, any[]> = {}
      if (data.ledgerEntries && typeof data.ledgerEntries === "object") {
        Object.keys(data.ledgerEntries).forEach((k) => {
          const kLower = k.toLowerCase()
          if (kLower === sFilter || kLower.includes(sFilter) || sFilter.includes(kLower)) {
            filteredLedgerEntries[k] = data.ledgerEntries[k]
          }
        })
      }

      return NextResponse.json({
        success: true,
        data: {
          ...data,
          accounts: filteredAccounts,
          ledgerEntries: filteredLedgerEntries,
        },
        source: "local-file-filtered"
      })
    }

    return NextResponse.json({ success: true, data, source: "local-file" })
  } catch (error) {
    console.error("[account-ledgers API] GET error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load account ledger data" },
      { status: 500 }
    )
  }
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
    return NextResponse.json({ error: "Forbidden: Unauthorized to modify account ledgers" }, { status: 403 })
  }

  try {
    const body = await request.json()

    // Validate that incoming ledgerEntries and deletedLedgerEntries do not violate closed periods
    if (body.ledgerEntries && typeof body.ledgerEntries === "object") {
      const existingDb = await getAccountLedgerDatabase()
      try {
        await assertLedgerMapNotViolatingClosedPeriods(
          body.ledgerEntries,
          existingDb.ledgerEntries || {},
          body.deletedLedgerEntries,
          { role, actor: user?.email || role || "user" }
        )
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: err.message,
          period_locked: true,
        }, { status: 403 })
      }
    }

    const data = await saveAccountLedgerDatabase({
      accounts: Array.isArray(body.accounts) ? body.accounts : [],
      ledgerEntries: body.ledgerEntries && typeof body.ledgerEntries === "object" ? body.ledgerEntries : {},
      ledgerProfiles: body.ledgerProfiles && typeof body.ledgerProfiles === "object" ? body.ledgerProfiles : {},
      receipts: body.receipts && typeof body.receipts === "object" ? body.receipts : {},
      deletedLedgerEntries: Array.isArray(body.deletedLedgerEntries) ? body.deletedLedgerEntries : undefined,
    })

    if (body.ledgerEntries && typeof body.ledgerEntries === "object") {
      try {
        const { ledgerDbService } = await import("@/lib/services/ledger-db-service")
        await ledgerDbService.syncFromLegacyAccountLedgers(body.ledgerEntries)
      } catch (e) {
        console.warn("[account-ledgers API] sync to ledgerDbService error:", e)
      }
    }

    return NextResponse.json({ success: true, data, source: "local-file" })
  } catch (error) {
    console.error("[account-ledgers API] POST error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to save account ledger data" },
      { status: 400 }
    )
  }
}
