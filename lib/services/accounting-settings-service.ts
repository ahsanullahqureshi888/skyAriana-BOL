import { getDataPath } from "../server-paths"
import { readJsonFile, mutateJsonFile } from "./blob-db"
import { AccountingSettings } from "../types/bol-accounting"

const SETTINGS_FILE = getDataPath(".local-accounting-settings.json")

export const DEFAULT_ACCOUNTING_SETTINGS: AccountingSettings = {
  autoCreateInvoice: true,
  autoPostLedger: false, // Default is OFF: requires user confirmation before financial posting
  requireApprovalBeforePosting: false,
  defaultCurrency: "USD",
  invoicePrefix: "INV",
  receiptPrefix: "RCPT",
  creditNotePrefix: "CRN",
  debitNotePrefix: "DBN",
  defaultPaymentTerms: "30 Days",
  enableCreditLimits: true,
  enablePeriodLock: false,
  allowOverpayments: true,
  defaultTaxRate: 0,
  decimalPrecision: 2,
}

export async function getAccountingSettings(): Promise<AccountingSettings> {
  return readJsonFile<AccountingSettings>(SETTINGS_FILE, DEFAULT_ACCOUNTING_SETTINGS)
}

export async function updateAccountingSettings(
  partial: Partial<AccountingSettings>
): Promise<AccountingSettings> {
  return mutateJsonFile<AccountingSettings>(
    SETTINGS_FILE,
    DEFAULT_ACCOUNTING_SETTINGS,
    (current) => {
      return {
        ...current,
        ...partial,
      }
    }
  )
}
