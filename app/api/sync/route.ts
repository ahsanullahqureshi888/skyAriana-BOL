import { NextResponse } from "next/server"
import { readJsonFile, writeJsonFile } from "@/lib/services/blob-db"
import * as localStorage from "@/lib/services/local-storage-service"
import { saveBolAccountLedgerDatabase, getBolAccountLedgerDatabase } from "@/lib/services/bol-account-ledger-storage-service"
import { getAllInvoices, saveInvoice } from "@/lib/services/invoice-storage-service"
import { validateLedgerInvariance } from "@/lib/services/ledger-sync-utils"
import { getDataPath } from "@/lib/server-paths"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

const syncCodesFile = getDataPath(".local-sync-codes.json")
const fullSnapshotFile = getDataPath(".local-full-snapshot.json")

interface SyncPayload {
  documents?: any[]
  accounts?: string[]
  ledgerRecords?: Record<string, any[]>
  invoices?: any[]
  financialsMap?: Record<string, any>
  companySettings?: any
  routePresets?: any[]
  savedShippers?: any[]
  savedConsignees?: any[]
  savedNotifyParties?: any[]
  deletedLedgerEntries?: any[]
  syncCode?: string
}

const inMemorySyncCodes = new Map<string, { data: any; expiresAt: number }>()

export async function GET(request: Request) {
    // Auto-injected Cloud Auth Check
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = require('@/lib/supabase/server');
      const supabaseAuth = await createClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

  try {
    // Enforce authentication for sync operations if in cloud mode
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ success: false, error: "Unauthorized access to sync operations" }, { status: 401 })
      }
    }

    const role = (request.headers.get("x-user-role") || "").toLowerCase().trim()
    if (role === "shipper" || role === "client") {
      return NextResponse.json({ success: false, error: "Forbidden: Sync operations are restricted to operations and administration." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const rawCode = searchParams.get("code")?.trim()

    // If no code is provided, return master snapshot for authorized local/desktop hydration
    if (!rawCode) {
      const masterSnapshot = await readJsonFile<any>(fullSnapshotFile, null)
      if (masterSnapshot) {
        return NextResponse.json({
          success: true,
          data: masterSnapshot,
          source: "master-snapshot-file",
        })
      }
      return NextResponse.json(
        { success: false, error: "No master snapshot found." },
        { status: 404 }
      )
    }

    // Check in-memory code cache
    const memEntry = inMemorySyncCodes.get(rawCode)
    const now = Date.now()
    if (memEntry && memEntry.data && memEntry.expiresAt > now) {
      return NextResponse.json({
        success: true,
        data: memEntry.data,
        source: "sync-code-memory"
      })
    }

    // Check persistent sync codes file
    const storedCodes = await readJsonFile<Record<string, { data: any, expiresAt: number }>>(syncCodesFile, {})
    const storedEntry = storedCodes[rawCode]
    if (storedEntry && storedEntry.data && storedEntry.expiresAt > now) {
      return NextResponse.json({
        success: true,
        data: storedEntry.data,
        source: "sync-code-file"
      })
    }

    // Unknown or expired transfer code
    return NextResponse.json(
      { success: false, error: `Transfer token not found or expired.` },
      { status: 404 }
    )
  } catch (error) {
    console.error("[sync API] GET error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load sync snapshot" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
    // Auto-injected Cloud Auth Check
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = require('@/lib/supabase/server');
      const supabaseAuth = await createClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

  try {
    // Enforce authentication for sync operations if in cloud mode
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ success: false, error: "Unauthorized access to sync operations" }, { status: 401 })
      }
    }

    const role = (request.headers.get("x-user-role") || "").toLowerCase().trim()
    if (role === "shipper" || role === "client" || role === "viewer") {
      return NextResponse.json({ success: false, error: "Forbidden: Clients cannot modify sync snapshots." }, { status: 403 })
    }

    const payload: SyncPayload = await request.json()
    const now = new Date().toISOString()
    const nowMs = Date.now()

    // 1. Bulk merge BOL documents locally
    let mergedDocsCount = 0
    if (Array.isArray(payload.documents) && payload.documents.length > 0) {
      const existingBols = await localStorage.getAllLocalBOLs()
      const bolMap = new Map<string, any>()

      for (const d of existingBols) {
        const k = d.bol_number || d.id
        if (k) bolMap.set(k, d)
      }

      for (const b of payload.documents) {
        const k = b.bol_number || b.id
        if (k) {
          bolMap.set(k, {
            ...b,
            updated_at: now,
          })
        }
      }

      const allMergedBols = Array.from(bolMap.values())
      if (allMergedBols.length > 0) {
        await localStorage.storeLocalBOLsBatch(allMergedBols)
      }
      mergedDocsCount = allMergedBols.length
    }

    // 2. Merge invoices locally
    let mergedInvoicesCount = 0
    if (Array.isArray(payload.invoices) && payload.invoices.length > 0) {
      for (const inv of payload.invoices) {
        if (inv && (inv.invoice_number || inv.id)) {
          await saveInvoice(inv)
          mergedInvoicesCount++
        }
      }
    }

    // Helper to validate and clean company names
    const isCleanCompanyName = (name: string): boolean => {
      if (!name || typeof name !== "string") return false
      const trimmed = name.trim()
      if (trimmed.length < 3 || trimmed.length > 80) return false
      if (/^(?:1X|2X|1\s*X|2\s*X)?\s*\d+\s*(?:FT|J|HC|GP|CTN)/i.test(trimmed)) return false
      if (/کندهار تخه|له کندهار|بندر تهҼرانسоورب/i.test(trimmed)) return false
      if (/(?:Raisins|Dry Figs|Apricots|Seeds|CTNS|KGS|BAGS)\s*[,|-]/i.test(trimmed)) return false
      return true
    }

    // 3. Merge accounts and ledger entries locally
    if (payload.ledgerRecords || payload.accounts) {
      const currentLedgerDb = await getBolAccountLedgerDatabase()
      const incomingCompanies = (payload.accounts || []).filter(isCleanCompanyName)
      const mergedCompanies = Array.from(
        new Set([
          ...(currentLedgerDb.customCompanies || []).filter(isCleanCompanyName),
          ...incomingCompanies,
        ])
      )

      const mergedRecords = {
        ...(currentLedgerDb.ledgerRecords || {}),
        ...(payload.ledgerRecords || {}),
      }

      await saveBolAccountLedgerDatabase({
        customCompanies: mergedCompanies,
        ledgerRecords: mergedRecords,
        deletedLedgerEntries: Array.isArray(payload.deletedLedgerEntries) ? payload.deletedLedgerEntries : undefined,
      })
    }

    // Audit ledger records
    const currentLedgerDbAfter = await getBolAccountLedgerDatabase()
    const ledgerAudit = validateLedgerInvariance(currentLedgerDbAfter.ledgerRecords || payload.ledgerRecords || {})

    // 4. Save full master snapshot
    const masterSnapshot = {
    documents: payload.documents || [],
      invoices: payload.invoices || [],
      accounts: (payload.accounts || []).filter(isCleanCompanyName),
      ledgerRecords: payload.ledgerRecords || {},
      financialsMap: payload.financialsMap || {},
      deletedLedgerEntries: payload.deletedLedgerEntries || [],
      companySettings: payload.companySettings || null,
      routePresets: payload.routePresets || [],
      savedShippers: payload.savedShippers || [],
      savedConsignees: payload.savedConsignees || [],
      savedNotifyParties: payload.savedNotifyParties || [],
      ledgerAudit,
      updated_at: now,
    }

    await writeJsonFile(fullSnapshotFile, masterSnapshot)

    // 5. Generate Cryptographically Secure Transfer Code
    const syncToken = crypto.randomUUID()
    
    // Store sync token in memory & local file
    const expiresAt = nowMs + 24 * 60 * 60 * 1000 // 24 hours expiry
    inMemorySyncCodes.set(syncToken, { data: masterSnapshot, expiresAt })

    try {
      const storedCodes = await readJsonFile<Record<string, { data: any, expiresAt: number }>>(syncCodesFile, {})
      
      // Automatic cleanup of expired tokens
      for (const [key, entry] of Object.entries(storedCodes)) {
        if (!entry.expiresAt || entry.expiresAt < nowMs) {
          delete storedCodes[key]
        }
      }

      storedCodes[syncToken] = { data: masterSnapshot, expiresAt }
      await writeJsonFile(syncCodesFile, storedCodes)
    } catch (e) {
      console.error("[sync] Failed to store sync token locally", e)
    }

    return NextResponse.json({
      success: true,
      syncCode: syncToken,
      totalDocuments: payload.documents?.length || mergedDocsCount,
      totalInvoices: payload.invoices?.length || mergedInvoicesCount,
      ledgerAudit,
      message: `Successfully synchronized ${payload.documents?.length || mergedDocsCount} BOLs, ${payload.invoices?.length || mergedInvoicesCount} invoices, and accounts safely!`,
      expiresAt: new Date(expiresAt).toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sync failed" },
      { status: 400 }
    )
  }
}
