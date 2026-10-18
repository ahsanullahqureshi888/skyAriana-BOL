import { NextResponse } from "next/server"
import { readJsonFile } from "@/lib/services/blob-db"
import { getDataPath } from "@/lib/server-paths"

export async function GET() {
  try {
    const bols = await readJsonFile<any[]>(getDataPath(".local-bols.json"), [])
    const invoices = await readJsonFile<any[]>(getDataPath(".local-invoices.json"), [])
    const ledgers = await readJsonFile<any>(getDataPath(".local-bol-account-ledgers.json"), { ledgerRecords: {}, customCompanies: [] })
    const gdriveCreds = await readJsonFile<any>(getDataPath(".local-gdrive-credentials.json"), null)

    const totalLedgerRecords = Object.values(ledgers.ledgerRecords || {}).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0)

    const isFirstRun = bols.length === 0 && invoices.length === 0 && totalLedgerRecords === 0
    const hasGoogleDriveAuth = !!gdriveCreds?.accessToken || !!gdriveCreds?.refreshToken

    return NextResponse.json({
      isFirstRun,
      hasGoogleDriveAuth,
      stats: {
        bols: bols.length,
        invoices: invoices.length,
        ledgers: totalLedgerRecords
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
