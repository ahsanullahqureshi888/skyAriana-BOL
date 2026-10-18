/**
 * Sky Ariana Emergency Data Export Service
 * Phase 16: Enterprise Resilience, Health Auditing & Safe Restore Engine
 */

import { getDataPath } from "@/lib/server-paths"
import { readJsonFile } from "@/lib/services/blob-db"
import { CURRENT_DATABASE_SCHEMA_VERSION, CURRENT_APPLICATION_VERSION } from "./backup-manifest"
import { getLocalDeviceId } from "./manifest"

export interface EmergencyDataExport {
  exportMetadata: {
    application: string
    appVersion: string
    schemaVersion: number
    exportedAt: string
    deviceId: string
    title: string
    description: string
  }
  bols: any[]
  shipments: any[]
  containers: any[]
  companies: any[]
  accounts: any[]
  invoices: any[]
  accountLedgers: any
  payments: any[]
  supplierBills: any[]
  supplierCosts: any[]
  supplierPayments: any[]
  exchangeRates: any[]
  recordCounts: Record<string, number>
}

/**
 * Builds a standalone, self-contained JSON export of all core business data.
 */
export async function generateEmergencyDataExport(): Promise<EmergencyDataExport> {
  const [
    bols,
    shipments,
    containers,
    companies,
    accounts,
    invoices,
    accountLedgers,
    payments,
    supplierBills,
    supplierCosts,
    supplierPayments,
    exchangeRates,
  ] = await Promise.all([
    readJsonFile<any[]>(getDataPath(".local-bols.json"), []),
    readJsonFile<any[]>(getDataPath(".local-shipments.json"), []),
    readJsonFile<any[]>(getDataPath(".local-container-bookings.json"), []),
    readJsonFile<any[]>(getDataPath(".local-companies.json"), []),
    readJsonFile<any[]>(getDataPath(".local-accounts.json"), []),
    readJsonFile<any[]>(getDataPath(".local-invoices.json"), []),
    readJsonFile<any>(getDataPath(".local-account-ledgers.json"), {}),
    readJsonFile<any[]>(getDataPath(".local-payments.json"), []),
    readJsonFile<any[]>(getDataPath(".local-supplier-bills.json"), []),
    readJsonFile<any[]>(getDataPath(".local-supplier-costs.json"), []),
    readJsonFile<any[]>(getDataPath(".local-supplier-payments.json"), []),
    readJsonFile<any[]>(getDataPath(".local-exchange-rates.json"), []),
  ])

  let ledgerEntryCount = 0
  if (typeof accountLedgers === "object" && accountLedgers !== null) {
    for (const v of Object.values(accountLedgers)) {
      if (Array.isArray(v)) ledgerEntryCount += v.length
      else if ((v as any)?.entries) ledgerEntryCount += (v as any).entries.length
    }
  }

  const recordCounts = {
    bols: bols.length,
    shipments: shipments.length,
    containers: containers.length,
    companies: companies.length,
    accounts: accounts.length,
    invoices: invoices.length,
    ledgerEntries: ledgerEntryCount,
    payments: payments.length,
    supplierBills: supplierBills.length,
    supplierCosts: supplierCosts.length,
    supplierPayments: supplierPayments.length,
    exchangeRates: exchangeRates.length,
  }

  return {
    exportMetadata: {
      application: "Sky Ariana BOL & Logistics",
      appVersion: CURRENT_APPLICATION_VERSION,
      schemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      deviceId: getLocalDeviceId(),
      title: "Sky Ariana Standalone Emergency Data Snapshot",
      description:
        "Emergency human-readable JSON backup containing all core enterprise records. Can be imported directly or viewed in any JSON reader.",
    },
    bols,
    shipments,
    containers,
    companies,
    accounts,
    invoices,
    accountLedgers,
    payments,
    supplierBills,
    supplierCosts,
    supplierPayments,
    exchangeRates,
    recordCounts,
  }
}
