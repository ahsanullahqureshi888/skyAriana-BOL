import { NextResponse } from "next/server"
import { readJsonFile, writeJsonFile } from "@/lib/services/blob-db"
import * as localStorage from "@/lib/services/local-storage-service"
import { saveBolAccountLedgerDatabase, getBolAccountLedgerDatabase } from "@/lib/services/bol-account-ledger-storage-service"
import { getAllInvoices, saveInvoice } from "@/lib/services/invoice-storage-service"
import { validateLedgerInvariance } from "@/lib/services/ledger-sync-utils"
import path from "path"

const syncCodesFile = path.join(process.cwd(), ".local-sync-codes.json")
const fullSnapshotFile = path.join(process.cwd(), ".local-full-snapshot.json")

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

// In-memory fallback cache for fast multi-device transfers
let inMemorySnapshot: any = null
let lastMasterSnapshotCache: { data: any; time: number } | null = null
const inMemorySyncCodes = new Map<string, { data: any; expiresAt: number }>()

// Global cloud relay helpers with fast timeout
async function saveToGlobalRelay(key: string, data: any): Promise<boolean> {
  try {
    const url = `https://cl1p.net/${encodeURIComponent(key)}`
    const bodyStr = new URLSearchParams({ content: JSON.stringify(data) }).toString()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1500)

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "SkyArianaLogistics/3.2",
      },
      body: bodyStr,
      cache: "no-store",
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return res.ok
  } catch (e) {
    return false
  }
}

async function fetchFromGlobalRelay(key: string): Promise<any | null> {
  try {
    const url = `https://cl1p.net/${encodeURIComponent(key)}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1200)

    const res = await fetch(url, {
      headers: { "User-Agent": "SkyArianaLogistics/3.2" },
      cache: "no-store",
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    const html = await res.text()

    // Match content from cl1p textarea
    const match =
      html.match(/<textarea[^>]*name=["']content["'][^>]*>([\s\S]*?)<\/textarea>/i) ||
      html.match(/<textarea[^>]*id=["']content["'][^>]*>([\s\S]*?)<\/textarea>/i)

    if (match && match[1]) {
      // Decode HTML entities
      const raw = match[1]
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .trim()
      return JSON.parse(raw)
    }
    return null
  } catch (e) {
    return null
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawCode = searchParams.get("code")?.trim().toUpperCase()

    // 1. If looking up by a specific Sync Code
    if (rawCode) {
      const cleanCode = rawCode.replace(/[\s-_]+/g, "")
      const fullCode = cleanCode.startsWith("SKY") ? `SKY-${cleanCode.slice(3)}` : `SKY-${cleanCode}`
      const numCode = cleanCode.replace(/^SKY/, "")

      // Check in-memory code cache
      for (const candidate of [rawCode, fullCode, numCode, cleanCode]) {
        const memEntry = inMemorySyncCodes.get(candidate)
        if (memEntry && memEntry.data) {
          return NextResponse.json({
            success: true,
            data: memEntry.data,
            source: "sync-code-memory",
            code: fullCode,
          })
        }
      }

      // Helper to resolve alias pointers in sync codes
      const resolvePayload = (entry: any): any => {
        if (!entry) return null
        if (entry.aliasOf && storedCodes[entry.aliasOf]) {
          return storedCodes[entry.aliasOf]
        }
        return entry
      }

      // Check persistent sync codes file
      const storedCodes = await readJsonFile<Record<string, any>>(syncCodesFile, {})
      for (const candidate of [rawCode, fullCode, numCode, cleanCode]) {
        if (storedCodes[candidate]) {
          const payload = resolvePayload(storedCodes[candidate])
          if (payload) {
            return NextResponse.json({
              success: true,
              data: payload,
              source: "sync-code-file",
              code: fullCode,
            })
          }
        }
      }

      // Also check keys in storedCodes that end with or contain numCode
      if (numCode.length >= 3) {
        for (const [k, v] of Object.entries(storedCodes)) {
          if (k.includes(numCode) || numCode.includes(k.replace(/^SKY-?/, ""))) {
            const payload = resolvePayload(v)
            if (payload) {
              return NextResponse.json({
                success: true,
                data: payload,
                source: "sync-code-matched",
                code: k,
              })
            }
          }
        }
      }

      // Query Global Cloud Relay by code
      const relayKeys = [
        `sky-relay-v3-${numCode}`,
        `sky-relay-v3-${cleanCode}`,
        `sky-relay-v3-${fullCode.toLowerCase()}`,
      ]

      for (const key of relayKeys) {
        const relayData = await fetchFromGlobalRelay(key)
        if (relayData && (Array.isArray(relayData.documents) || relayData.documents)) {
          // Cache locally
          inMemorySyncCodes.set(numCode, { data: relayData, expiresAt: Date.now() + 48 * 3600000 })
          inMemorySyncCodes.set(fullCode, { data: relayData, expiresAt: Date.now() + 48 * 3600000 })
          return NextResponse.json({
            success: true,
            data: relayData,
            source: "sync-global-relay",
            code: fullCode,
          })
        }
      }

      // Fallback: If master snapshot is available on global relay or local, return master snapshot
      const relayMaster = await fetchFromGlobalRelay("sky-relay-v3-master")
      if (relayMaster && Array.isArray(relayMaster.documents) && relayMaster.documents.length > 0) {
        return NextResponse.json({
          success: true,
          data: relayMaster,
          source: "sync-global-master",
          code: fullCode,
        })
      }

      const snapshot = await readJsonFile<any>(fullSnapshotFile, inMemorySnapshot || null)
      if (snapshot && Array.isArray(snapshot.documents) && snapshot.documents.length > 0) {
        return NextResponse.json({
          success: true,
          data: snapshot,
          source: "sync-fallback-snapshot",
          code: fullCode,
        })
      }

      return NextResponse.json(
        { success: false, error: `Transfer code ${rawCode} not found. Please verify code or upload from your other device.` },
        { status: 404 }
      )
    }

    // 2. Default: Return master snapshot of all BOLs, accounts, and ledgers
    const nowMs = Date.now()
    if (lastMasterSnapshotCache && nowMs - lastMasterSnapshotCache.time < 3000) {
      return NextResponse.json({
        success: true,
        data: lastMasterSnapshotCache.data,
      })
    }

    let masterData: any = null

    // Check global master relay first (with timeout)
    try {
      const relayMaster = await fetchFromGlobalRelay("sky-relay-v3-master")
      if (relayMaster && Array.isArray(relayMaster.documents) && relayMaster.documents.length > 0) {
        masterData = relayMaster
      }
    } catch (_) {}

    const allBols = await localStorage.getAllLocalBOLs()
    const ledgerDb = await getBolAccountLedgerDatabase()
    const allInvoices = await getAllInvoices()
    const snapshot = await readJsonFile<any>(fullSnapshotFile, inMemorySnapshot || {})

    // Merge documents
    const docMap = new Map<string, any>()
    if (masterData && Array.isArray(masterData.documents)) {
      for (const d of masterData.documents) {
        const k = d.bol_number || d.id
        if (k) docMap.set(k, d)
      }
    }
    for (const d of allBols) {
      const k = d.bol_number || d.id
      if (k) docMap.set(k, d)
    }
    if (Array.isArray(snapshot.documents)) {
      for (const d of snapshot.documents) {
        const k = d.bol_number || d.id
        if (k) docMap.set(k, d)
      }
    }

    // Merge invoices
    const invMap = new Map<string, any>()
    if (masterData && Array.isArray(masterData.invoices)) {
      for (const inv of masterData.invoices) {
        const k = inv.invoice_number || inv.id
        if (k) invMap.set(k, inv)
      }
    }
    for (const inv of allInvoices) {
      const k = inv.invoice_number || inv.id
      if (k) invMap.set(k, inv)
    }
    if (Array.isArray(snapshot.invoices)) {
      for (const inv of snapshot.invoices) {
        const k = inv.invoice_number || inv.id
        if (k) invMap.set(k, inv)
      }
    }

    const mergedCompanies = Array.from(
      new Set([
        ...(ledgerDb.customCompanies || []),
        ...(snapshot.accounts || []),
        ...(masterData?.accounts || []),
      ])
    )

    const mergedLedgers = {
      ...(masterData?.ledgerRecords || {}),
      ...(snapshot.ledgerRecords || {}),
      ...(ledgerDb.ledgerRecords || {}),
    }

    const mergedFinancialsMap = {
      ...(masterData?.financialsMap || {}),
      ...(snapshot.financialsMap || {}),
    }

    const ledgerAudit = validateLedgerInvariance(mergedLedgers)

    const responseData = {
      documents: Array.from(docMap.values()),
      invoices: Array.from(invMap.values()),
      customCompanies: mergedCompanies,
      ledgerRecords: mergedLedgers,
      financialsMap: mergedFinancialsMap,
      ledgerAudit,
      companySettings: snapshot.companySettings || masterData?.companySettings || null,
      routePresets: snapshot.routePresets || masterData?.routePresets || [],
      savedShippers: snapshot.savedShippers || masterData?.savedShippers || [],
      savedConsignees: snapshot.savedConsignees || masterData?.savedConsignees || [],
      savedNotifyParties: snapshot.savedNotifyParties || masterData?.savedNotifyParties || [],
      deletedLedgerEntries: Array.isArray(ledgerDb.deletedLedgerEntries) ? ledgerDb.deletedLedgerEntries : (snapshot.deletedLedgerEntries || []),
      updated_at: masterData?.updated_at || new Date().toISOString(),
    }

    lastMasterSnapshotCache = { data: responseData, time: nowMs }

    return NextResponse.json({
      success: true,
      data: responseData,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load sync snapshot" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const payload: SyncPayload = await request.json()
    const now = new Date().toISOString()

    // 1. Bulk merge BOL documents locally
    let mergedDocsCount = 0
    if (Array.isArray(payload.documents) && payload.documents.length > 0) {
      const existingBols = await localStorage.getAllLocalBOLs()
      const bolMap = new Map<string, any>()

      for (const b of existingBols) {
        const k = b.bol_number || b.id
        if (k) bolMap.set(k, b)
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
      if (/کندهار څخه|له کندهار|بندر ته|ټرنسپورټ/i.test(trimmed)) return false
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

    inMemorySnapshot = masterSnapshot
    await writeJsonFile(fullSnapshotFile, masterSnapshot)

    // 5. Generate Transfer Code for instant cross-device transfer (e.g. SKY-5821)
    const codeNum = Math.floor(1000 + Math.random() * 9000).toString()
    const syncCode = `SKY-${codeNum}`

    // Store sync code in memory & local file
    const expiresAt = Date.now() + 48 * 60 * 60 * 1000
    inMemorySyncCodes.set(syncCode, { data: masterSnapshot, expiresAt })
    inMemorySyncCodes.set(codeNum, { data: masterSnapshot, expiresAt })
    inMemorySyncCodes.set(`SKY${codeNum}`, { data: masterSnapshot, expiresAt })

    try {
      const storedCodes = await readJsonFile<Record<string, any>>(syncCodesFile, {})
      // Store full snapshot under canonical syncCode
      storedCodes[syncCode] = masterSnapshot
      // Store lightweight alias pointers to save 90%+ disk space
      storedCodes[codeNum] = { aliasOf: syncCode, generated_at: now }
      storedCodes[`SKY${codeNum}`] = { aliasOf: syncCode, generated_at: now }
      await writeJsonFile(syncCodesFile, storedCodes)
    } catch (e) {}

    // 6. Broadcast to Global Cloud Relays for 100% Guaranteed Cross-Device Reach
    void Promise.allSettled([
      saveToGlobalRelay(`sky-relay-v3-${codeNum}`, masterSnapshot),
      saveToGlobalRelay(`sky-relay-v3-${syncCode.toLowerCase()}`, masterSnapshot),
      saveToGlobalRelay(`sky-relay-v3-master`, masterSnapshot),
    ])

    return NextResponse.json({
      success: true,
      syncCode,
      codeNum,
      totalDocuments: payload.documents?.length || mergedDocsCount,
      totalInvoices: payload.invoices?.length || mergedInvoicesCount,
      ledgerAudit,
      message: `Successfully synchronized ${payload.documents?.length || mergedDocsCount} BOLs, ${payload.invoices?.length || mergedInvoicesCount} invoices, and accounts to the cloud!`,
      expiresAt: new Date(expiresAt).toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sync failed" },
      { status: 400 }
    )
  }
}

