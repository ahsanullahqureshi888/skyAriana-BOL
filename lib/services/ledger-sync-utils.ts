export const FINANCIALS_MAP_KEY = "skybol:financials-map"
export const ACCOUNT_LEDGERS_KEY = "skybol:account-ledgers"

export interface EntryFinancials {
  debit?: number
  credit?: number
  driverFreight?: string
  surrenderedBL?: boolean
  pdfPathname?: string
  date?: string
  invoiceNo?: string
  shipperDescription?: string
  description?: string
  consignee?: string
  containerNo?: string
  containerType?: string
  containerDetails?: string
  quantity?: string
}

export function isCleanCompanyName(name: string): boolean {
  if (!name || typeof name !== "string") return false
  const trimmed = name.trim()
  if (trimmed.length < 3 || trimmed.length > 80) return false
  if (/^(?:1X|2X|1\s*X|2\s*X)?\s*\d+\s*(?:FT|J|HC|GP|CTN)/i.test(trimmed)) return false
  if (/کندهار څخه|له کندهار|بندر ته|ټرنسپورټ/i.test(trimmed)) return false
  if (/(?:Raisins|Dry Figs|Apricots|Seeds|CTNS|KGS|BAGS)\s*[,|-]/i.test(trimmed)) return false
  return true
}

export function getFinancialsMap(): Record<string, EntryFinancials> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(FINANCIALS_MAP_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function saveFinancialsForEntry(
  bolNo: string | undefined | null,
  id: string | undefined | null,
  entryData: {
    debit?: number | string
    credit?: number | string
    driverFreight?: string
    surrenderedBL?: boolean
    pdfPathname?: string
    date?: string
    invoiceNo?: string
    shipperDescription?: string
    description?: string
    consignee?: string
    containerNo?: string
    containerType?: string
    containerDetails?: string
    quantity?: string
  }
) {
  if (typeof window === "undefined") return
  try {
    const map = getFinancialsMap()
    const fin: EntryFinancials = {}

    if (entryData.debit !== undefined && entryData.debit !== "") {
      fin.debit = Number(entryData.debit) || 0
    }
    if (entryData.credit !== undefined && entryData.credit !== "") {
      fin.credit = Number(entryData.credit) || 0
    }
    if (entryData.driverFreight !== undefined) {
      fin.driverFreight = entryData.driverFreight
    }
    if (entryData.surrenderedBL !== undefined) {
      fin.surrenderedBL = Boolean(entryData.surrenderedBL)
    }
    if (entryData.pdfPathname !== undefined) {
      fin.pdfPathname = entryData.pdfPathname
    }
    if (entryData.date !== undefined) {
      fin.date = entryData.date
    }
    if (entryData.invoiceNo !== undefined) {
      fin.invoiceNo = entryData.invoiceNo
    }
    if (entryData.shipperDescription !== undefined && entryData.shipperDescription.trim() !== "") {
      fin.shipperDescription = entryData.shipperDescription.trim()
      fin.description = entryData.shipperDescription.trim()
    }
    if (entryData.description !== undefined && entryData.description.trim() !== "") {
      fin.shipperDescription = entryData.description.trim()
      fin.description = entryData.description.trim()
    }
    if (entryData.consignee !== undefined) {
      fin.consignee = entryData.consignee
    }
    if (entryData.containerNo !== undefined) {
      fin.containerNo = entryData.containerNo
    }
    if (entryData.containerType !== undefined) {
      fin.containerType = entryData.containerType
    }
    if (entryData.containerDetails !== undefined) {
      fin.containerDetails = entryData.containerDetails
    }
    if (entryData.quantity !== undefined) {
      fin.quantity = entryData.quantity
    }

    const keys: string[] = []
    if (bolNo && bolNo.trim()) {
      keys.push(bolNo.trim().toLowerCase())
      keys.push(bolNo.trim())
    }
    if (id && id.trim()) {
      keys.push(id.trim().toLowerCase())
      keys.push(id.trim())
    }

    keys.forEach((k) => {
      map[k] = {
        ...(map[k] || {}),
        ...fin,
      }
    })

    window.localStorage.setItem(FINANCIALS_MAP_KEY, JSON.stringify(map))
  } catch (e) {
    console.warn("Failed to save financials map:", e)
  }
}

export function smartMergeRow(existing: any = {}, incoming: any = {}): any {
  const existingDebit = Number(existing?.debit) || 0
  const incomingDebit = incoming?.debit !== undefined && incoming?.debit !== "" ? Number(incoming?.debit) || 0 : undefined
  const mergedDebit = incomingDebit !== undefined && incomingDebit > 0 ? incomingDebit : (existingDebit > 0 ? existingDebit : (incomingDebit ?? 0))

  const existingCredit = Number(existing?.credit) || 0
  const incomingCredit = incoming?.credit !== undefined && incoming?.credit !== "" ? Number(incoming?.credit) || 0 : undefined
  const mergedCredit = incomingCredit !== undefined && incomingCredit > 0 ? incomingCredit : (existingCredit > 0 ? existingCredit : (incomingCredit ?? 0))

  const descVal = incoming?.shipperDescription || incoming?.description || existing?.shipperDescription || existing?.description || ""

  return {
    ...existing,
    ...incoming,
    id: incoming?.id || existing?.id || crypto.randomUUID(),
    debit: mergedDebit,
    credit: mergedCredit,
    shipperDescription: descVal,
    description: descVal,
    containerNo: incoming?.containerNo || existing?.containerNo || "",
    containerType: incoming?.containerType || existing?.containerType || "",
    containerDetails: incoming?.containerDetails || existing?.containerDetails || "",
    consignee: incoming?.consignee || existing?.consignee || "",
    quantity: incoming?.quantity || existing?.quantity || "",
    driverFreight: incoming?.driverFreight || incoming?.driverRent || existing?.driverFreight || existing?.driverRent || "",
    driverRent: incoming?.driverFreight || incoming?.driverRent || existing?.driverFreight || existing?.driverRent || "",
    pdfFile: incoming?.pdfFile || incoming?.pdfPathname || existing?.pdfFile || existing?.pdfPathname || undefined,
    pdfPathname: incoming?.pdfFile || incoming?.pdfPathname || existing?.pdfFile || existing?.pdfPathname || undefined,
    surrenderedBL: incoming?.surrenderedBL !== undefined ? Boolean(incoming.surrenderedBL) : Boolean(existing?.surrenderedBL),
  }
}

export function smartMergeLedgerRecords(
  baseRecords: Record<string, any[]> = {},
  incomingRecords: Record<string, any[]> = {}
): Record<string, any[]> {
  const result: Record<string, any[]> = {}
  const allKeys = Array.from(new Set([...Object.keys(baseRecords || {}), ...Object.keys(incomingRecords || {})]))

  for (const key of allKeys) {
    const baseRows = Array.isArray(baseRecords[key]) ? baseRecords[key] : []
    const incomingRows = Array.isArray(incomingRecords[key]) ? incomingRecords[key] : []

    const rowMap = new Map<string, any>()
    const getRowKey = (r: any) => {
      const bol = (r.barnamehNo || r.bolNo || "").trim().toLowerCase()
      if (bol) return `bol:${bol}`
      if (r.id) return `id:${r.id}`
      return `desc:${(r.description || r.shipperDescription || "").trim().toLowerCase()}_${r.date || ""}`
    }

    // 1. Add base rows
    for (const r of baseRows) {
      const k = getRowKey(r)
      if (k) rowMap.set(k, { ...r })
    }

    // 2. Smart merge incoming rows
    for (const r of incomingRows) {
      const k = getRowKey(r)
      if (k) {
        const existing = rowMap.get(k)
        rowMap.set(k, smartMergeRow(existing, r))
      }
    }

    result[key] = Array.from(rowMap.values())
  }

  return result
}

export interface LedgerAuditResult {
  isValid: boolean
  totalAccounts: number
  totalEntries: number
  totalDebit: number
  totalCredit: number
  netBalance: number
  discrepancies: Array<{
    account: string
    totalDebit: number
    totalCredit: number
    expectedBalance: number
    reportedBalance?: number
    message: string
  }>
}

interface AuditableLedgerEntry {
  date?: unknown
  debit?: unknown
  credit?: unknown
  balance?: unknown
}

function auditAmount(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0
  if (typeof value !== "string" && typeof value !== "number") return NaN
  return Number(value)
}

function ledgerDateKey(value: unknown): string {
  const date = String(value || "").replace(/[\u200e\u200f]/g, "")
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
  const yearFirst = date.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:T.*)?$/)
  const dayFirst = date.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  const parts = yearFirst ? yearFirst.slice(1) : dayFirst ? [dayFirst[3], dayFirst[2], dayFirst[1]] : null
  return parts ? parts.map(part => part.padStart(2, "0")).join("-") : date
}

export function validateLedgerInvariance(
  ledgerRecords: Record<string, AuditableLedgerEntry[]> = {}
): LedgerAuditResult {
  let totalAccounts = 0
  let totalEntries = 0
  let totalDebit = 0
  let totalCredit = 0
  const discrepancies: LedgerAuditResult["discrepancies"] = []

  const accountKeys = Object.keys(ledgerRecords || {})
  totalAccounts = accountKeys.length

  for (const account of accountKeys) {
    const entries = Array.isArray(ledgerRecords[account]) ? ledgerRecords[account] : []
    totalEntries += entries.length

    let accDebit = 0
    let accCredit = 0

    // Sort a copy so importing or auditing does not mutate the caller's records.
    // Accept ISO and legacy day-first dates; keep same-day row order stable.
    const chronological = entries.map((entry, index) => ({ entry, index })).sort((a, b) =>
      ledgerDateKey(a.entry?.date).localeCompare(ledgerDateKey(b.entry?.date))
    )
    for (const { entry, index } of chronological) {
      const d = auditAmount(entry?.debit)
      const c = auditAmount(entry?.credit)
      if (!entry || !Number.isFinite(d) || !Number.isFinite(c)) {
        discrepancies.push({
          account,
          totalDebit: accDebit,
          totalCredit: accCredit,
          expectedBalance: accDebit - accCredit,
          message: `Account "${account}" row ${index + 1} contains an invalid debit or credit.`,
        })
        continue
      }
      accDebit += d
      accCredit += c
      if (entry.balance !== undefined && entry.balance !== null && entry.balance !== "") {
        const reported = auditAmount(entry.balance)
        const expected = accDebit - accCredit
        if (!Number.isFinite(reported) || Math.abs(reported - expected) > 0.01) {
          discrepancies.push({
            account,
            totalDebit: accDebit,
            totalCredit: accCredit,
            expectedBalance: expected,
            reportedBalance: Number.isFinite(reported) ? reported : undefined,
            message: `Account "${account}" row ${index + 1} balance mismatch: reported ${String(entry.balance)}, expected ${expected} (Debit ${accDebit} - Credit ${accCredit})`,
          })
        }
      }
    }
    totalDebit += accDebit
    totalCredit += accCredit
  }

  const netBalance = totalDebit - totalCredit

  return {
    isValid: discrepancies.length === 0,
    totalAccounts,
    totalEntries,
    totalDebit,
    totalCredit,
    netBalance,
    discrepancies,
  }
}
