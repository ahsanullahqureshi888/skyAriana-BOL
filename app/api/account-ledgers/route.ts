import { NextResponse } from "next/server"
import { getAccountLedgerDatabase, saveAccountLedgerDatabase } from "@/lib/services/account-ledger-storage-service"
import { tryPythonBackend } from "@/lib/services/python-backend-proxy"

export async function GET(request: Request) {
  try {
    const pythonData = await tryPythonBackend("/api/account-ledgers")
    if (pythonData) return NextResponse.json(pythonData)

    const data = await getAccountLedgerDatabase()
    
    const { searchParams } = new URL(request.url)
    const shipperFilter = searchParams.get("shipper_name") || searchParams.get("client_name") || request.headers.get("x-shipper-name")
    const roleFilter = searchParams.get("role") || request.headers.get("x-user-role")

    if ((roleFilter === "shipper" || shipperFilter) && shipperFilter && data) {
      const sFilter = shipperFilter.trim().toLowerCase()
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
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load account ledger data" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const pythonData = await tryPythonBackend("/api/account-ledgers", {
      method: "POST",
      body: JSON.stringify(body),
    })
    if (pythonData) return NextResponse.json(pythonData)

    const data = await saveAccountLedgerDatabase({
      accounts: Array.isArray(body.accounts) ? body.accounts : [],
      ledgerEntries: body.ledgerEntries && typeof body.ledgerEntries === "object" ? body.ledgerEntries : {},
      ledgerProfiles: body.ledgerProfiles && typeof body.ledgerProfiles === "object" ? body.ledgerProfiles : {},
      receipts: body.receipts && typeof body.receipts === "object" ? body.receipts : {},
      deletedLedgerEntries: Array.isArray(body.deletedLedgerEntries) ? body.deletedLedgerEntries : undefined,
    })

    return NextResponse.json({ success: true, data, source: "local-file" })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to save account ledger data" },
      { status: 400 }
    )
  }
}
