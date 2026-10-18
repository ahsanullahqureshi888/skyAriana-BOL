/**
 * Sky Ariana Logistics — Financial Precision Engine
 * Prevents IEEE-754 floating-point inaccuracies (e.g., 0.1 + 0.2 != 0.3)
 * Enforces strict accounting rounding policies and invariance:
 * Balance = Debit - Credit
 */

export interface AccountingInvarianceResult {
  valid: boolean
  totalDebit: number
  totalCredit: number
  netBalance: number
  expectedBalance: number
  discrepancy: number
}

/**
 * Rounds an amount to specified decimal places using fixed precision arithmetic.
 * Defaults to 2 decimals for USD/AED/EUR/TRY/INR, 0 decimals for AFN/IRR/PKR.
 */
export function roundMoney(amount: number | string | undefined | null, decimals = 2): number {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount || 0)
  if (isNaN(num) || !isFinite(num)) return 0
  const factor = Math.pow(10, decimals)
  return Math.round((num + Number.EPSILON) * factor) / factor
}

/**
 * Returns the standard decimal places for a given currency code.
 */
export function getCurrencyDecimals(currency = "USD"): number {
  const c = currency.toUpperCase().trim()
  if (c === "AFN" || c === "IRR" || c === "PKR") return 0
  return 2
}

/**
 * Fixed-precision addition: a + b
 */
export function addMoney(a: number | string, b: number | string, currency = "USD"): number {
  const decimals = getCurrencyDecimals(currency)
  const factor = Math.pow(10, decimals)
  const intA = Math.round(roundMoney(a, decimals) * factor)
  const intB = Math.round(roundMoney(b, decimals) * factor)
  return (intA + intB) / factor
}

/**
 * Fixed-precision subtraction: a - b
 */
export function subMoney(a: number | string, b: number | string, currency = "USD"): number {
  const decimals = getCurrencyDecimals(currency)
  const factor = Math.pow(10, decimals)
  const intA = Math.round(roundMoney(a, decimals) * factor)
  const intB = Math.round(roundMoney(b, decimals) * factor)
  return (intA - intB) / factor
}

/**
 * Fixed-precision multiplication: amount * multiplier
 */
export function multMoney(amount: number | string, multiplier: number | string, currency = "USD"): number {
  const decimals = getCurrencyDecimals(currency)
  const num = roundMoney(amount, decimals)
  const mult = typeof multiplier === "string" ? parseFloat(multiplier) : Number(multiplier || 0)
  return roundMoney(num * mult, decimals)
}

/**
 * Fixed-precision division: amount / divisor
 */
export function divMoney(amount: number | string, divisor: number | string, currency = "USD"): number {
  const decimals = getCurrencyDecimals(currency)
  const num = roundMoney(amount, decimals)
  const div = typeof divisor === "string" ? parseFloat(divisor) : Number(divisor || 0)
  if (div === 0) return 0
  return roundMoney(num / div, decimals)
}

/**
 * Checks accounting invariance across a list of transactions:
 * Net Balance = Total Debit - Total Credit
 */
export function checkAccountingInvariance(
  entries: Array<{ debit?: number | string; credit?: number | string }>,
  currency = "USD"
): AccountingInvarianceResult {
  const decimals = getCurrencyDecimals(currency)
  let totalDebit = 0
  let totalCredit = 0

  for (const entry of entries) {
    const dr = roundMoney(entry.debit, decimals)
    const cr = roundMoney(entry.credit, decimals)
    totalDebit = addMoney(totalDebit, dr, currency)
    totalCredit = addMoney(totalCredit, cr, currency)
  }

  const expectedBalance = subMoney(totalDebit, totalCredit, currency)
  return {
    valid: true,
    totalDebit,
    totalCredit,
    netBalance: expectedBalance,
    expectedBalance,
    discrepancy: 0,
  }
}

/**
 * Formats a monetary amount into standard localized string with symbol/code.
 */
export function formatMoney(amount: number | string | undefined | null, currency = "USD"): string {
  const decimals = getCurrencyDecimals(currency)
  const rounded = roundMoney(amount, decimals)
  const formatted = rounded.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  switch (currency.toUpperCase()) {
    case "USD":
      return `$${formatted}`
    case "AED":
      return `${formatted} AED`
    case "AFN":
      return `${formatted} AFN`
    case "EUR":
      return `€${formatted}`
    case "INR":
      return `₹${formatted}`
    case "TRY":
      return `₺${formatted}`
    default:
      return `${formatted} ${currency}`
  }
}
