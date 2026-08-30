import { NextResponse } from "next/server"
import {
  getBolAccountLedgerDatabase,
  saveBolAccountLedgerDatabase,
} from "@/lib/services/bol-account-ledger-storage-service"

export async function GET() {
  try {
    const data = await getBolAccountLedgerDatabase()
    return NextResponse.json({ success: true, data, source: "local-file" })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load BOL account ledger data" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = await saveBolAccountLedgerDatabase({
      customCompanies: Array.isArray(body.customCompanies) ? body.customCompanies : [],
      ledgerRecords: body.ledgerRecords && typeof body.ledgerRecords === "object" ? body.ledgerRecords : {},
      deletedLedgerEntries: Array.isArray(body.deletedLedgerEntries) ? body.deletedLedgerEntries : undefined,
    })

    return NextResponse.json({ success: true, data, source: "local-file" })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to save BOL account ledger data" },
      { status: 400 }
    )
  }
}
