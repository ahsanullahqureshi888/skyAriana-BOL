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

export function validateLedgerInvariance(
  ledgerRecords: Record<string, any[]> = {}
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

    for (const entry of entries) {
      const d = Number(entry.debit) || 0
      const c = Number(entry.credit) || 0
      accDebit += d
      accCredit += c
    }

    totalDebit += accDebit
    totalCredit += accCredit

    // Check last row reported balance if present
    if (entries.length > 0) {
      const lastEntry = entries[entries.length - 1]
      if (lastEntry.balance !== undefined && lastEntry.balance !== null && lastEntry.balance !== "") {
        const reported = Number(lastEntry.balance)
        const expected = accDebit - accCredit
        if (!isNaN(reported) && Math.abs(reported - expected) > 0.05) {
          discrepancies.push({
            account,
            totalDebit: accDebit,
            totalCredit: accCredit,
            expectedBalance: expected,
            reportedBalance: reported,
            message: `Account "${account}" balance mismatch: reported ${reported}, expected ${expected} (Debit ${accDebit} - Credit ${accCredit})`,
          })
        }
      }
    }
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
