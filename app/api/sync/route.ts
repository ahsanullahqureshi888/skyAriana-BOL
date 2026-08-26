import { NextResponse } from "next/server"
import { readJsonFile, writeJsonFile } from "@/lib/services/blob-db"
import * as localStorage from "@/lib/services/local-storage-service"
import { saveBolAccountLedgerDatabase, getBolAccountLedgerDatabase } from "@/lib/services/bol-account-ledger-storage-service"
import path from "path"

const syncCodesFile = path.join(process.cwd(), ".local-sync-codes.json")
const fullSnapshotFile = path.join(process.cwd(), ".local-full-snapshot.json")

interface SyncPayload {
  documents?: any[]
  accounts?: string[]
  ledgerRecords?: Record<string, any[]>
  companySettings?: any
  routePresets?: any[]
  savedShippers?: any[]
  savedConsignees?: any[]
  savedNotifyParties?: any[]
  syncCode?: string
}

// In-memory fallback cache for fast multi-device transfers
let inMemorySnapshot: any = null
const inMemorySyncCodes = new Map<string, { data: any; expiresAt: number }>()

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

      // Check persistent sync codes file
      const storedCodes = await readJsonFile<Record<string, any>>(syncCodesFile, {})
      for (const candidate of [rawCode, fullCode, numCode, cleanCode]) {
        if (storedCodes[candidate]) {
          return NextResponse.json({
            success: true,
            data: storedCodes[candidate],
            source: "sync-code-file",
            code: fullCode,
          })
        }
      }

      // Also check keys in storedCodes that end with or contain numCode
      if (numCode.length >= 3) {
        for (const [k, v] of Object.entries(storedCodes)) {
          if (k.includes(numCode) || numCode.includes(k.replace(/^SKY-?/, ""))) {
            return NextResponse.json({
              success: true,
              data: v,
              source: "sync-code-matched",
              code: k,
            })
          }
        }
      }

      // Fallback: If snapshot is available, return master snapshot
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
        { success: false, error: "Sync Code not found or expired. Please generate a new code." },
        { status: 404 }
      )
    }

    // 2. Default: Return master snapshot of all BOLs, accounts, and ledgers
    const allBols = await localStorage.getAllLocalBOLs()
    const ledgerDb = await getBolAccountLedgerDatabase()
    const snapshot = await readJsonFile<any>(fullSnapshotFile, inMemorySnapshot || {})

    // Merge documents
    const docMap = new Map<string, any>()
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

    return NextResponse.json({
      success: true,
      data: {
        documents: Array.from(docMap.values()),
        customCompanies: ledgerDb.customCompanies || snapshot.accounts || [],
        ledgerRecords: ledgerDb.ledgerRecords || snapshot.ledgerRecords || {},
        companySettings: snapshot.companySettings || null,
        routePresets: snapshot.routePresets || [],
        savedShippers: snapshot.savedShippers || [],
        savedConsignees: snapshot.savedConsignees || [],
        savedNotifyParties: snapshot.savedNotifyParties || [],
        updated_at: new Date().toISOString(),
      },
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

    // 1. Bulk merge BOL documents
    let mergedDocsCount = 0
    if (Array.isArray(payload.documents) && payload.documents.length > 0) {
      const existingBols = await localStorage.getAllLocalBOLs()
      const bolMap = new Map<string, any>()

      // Add existing
      for (const b of existingBols) {
        const k = b.bol_number || b.id
        if (k) bolMap.set(k, b)
      }

      // Merge incoming
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
      for (const b of allMergedBols) {
        const num = b.bol_number || b.id
        if (num) {
          await localStorage.storeLocalBOL(num, b)
        }
      }
      mergedDocsCount = allMergedBols.length
    }

    // 2. Merge accounts and ledger entries
    if (payload.ledgerRecords || payload.accounts) {
      const currentLedgerDb = await getBolAccountLedgerDatabase()
      const mergedCompanies = Array.from(
        new Set([
          ...(currentLedgerDb.customCompanies || []),
          ...(payload.accounts || []),
        ])
      )

      const mergedRecords = {
        ...(currentLedgerDb.ledgerRecords || {}),
        ...(payload.ledgerRecords || {}),
      }

      await saveBolAccountLedgerDatabase({
        customCompanies: mergedCompanies,
        ledgerRecords: mergedRecords,
      })
    }

    // 3. Save full master snapshot
    const masterSnapshot = {
      documents: payload.documents || [],
      accounts: payload.accounts || [],
      ledgerRecords: payload.ledgerRecords || {},
      companySettings: payload.companySettings || null,
      routePresets: payload.routePresets || [],
      savedShippers: payload.savedShippers || [],
      savedConsignees: payload.savedConsignees || [],
      savedNotifyParties: payload.savedNotifyParties || [],
      updated_at: now,
    }

    inMemorySnapshot = masterSnapshot
    await writeJsonFile(fullSnapshotFile, masterSnapshot)

    // 4. Generate Transfer Code for instant cross-device transfer (e.g. SKY-5821)
    const codeNum = Math.floor(1000 + Math.random() * 9000).toString()
    const syncCode = `SKY-${codeNum}`

    // Store sync code valid for 48 hours under multiple aliases
    const expiresAt = Date.now() + 48 * 60 * 60 * 1000
    inMemorySyncCodes.set(syncCode, { data: masterSnapshot, expiresAt })
    inMemorySyncCodes.set(codeNum, { data: masterSnapshot, expiresAt })
    inMemorySyncCodes.set(`SKY${codeNum}`, { data: masterSnapshot, expiresAt })

    try {
      const storedCodes = await readJsonFile<Record<string, any>>(syncCodesFile, {})
      storedCodes[syncCode] = masterSnapshot
      storedCodes[codeNum] = masterSnapshot
      storedCodes[`SKY${codeNum}`] = masterSnapshot
      await writeJsonFile(syncCodesFile, storedCodes)
    } catch (e) {}

    return NextResponse.json({
      success: true,
      syncCode,
      codeNum,
      totalDocuments: mergedDocsCount,
      message: `Successfully synchronized ${mergedDocsCount} BOLs and accounts to the cloud!`,
      expiresAt: new Date(expiresAt).toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sync failed" },
      { status: 400 }
    )
  }
}
