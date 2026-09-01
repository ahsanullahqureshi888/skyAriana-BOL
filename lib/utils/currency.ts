/**
 * Sky Ariana Multi-Currency & Financial Utility Engine
 * Supports real-time conversions, exchange rates, formatting, and UTF-8 safe exporting.
 */

export type SupportedCurrency = "USD" | "AFN" | "IRR" | "AED" | "PKR" | "EUR"

export interface CurrencyConfig {
  code: SupportedCurrency
  name: string
  symbol: string
  namePersian: string
  defaultRateToUSD: number // 1 USD = X Currency units
  precision: number
}

export const CURRENCY_CONFIGS: Record<SupportedCurrency, CurrencyConfig> = {
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    namePersian: "دالر امریکایی",
    defaultRateToUSD: 1.0,
    precision: 2,
  },
  AFN: {
    code: "AFN",
    name: "Afghan Afghani",
    symbol: "؋",
    namePersian: "افغانی",
    defaultRateToUSD: 66.5,
    precision: 0,
  },
  IRR: {
    code: "IRR",
    name: "Iranian Toman",
    symbol: "تومان",
    namePersian: "تومان ایران",
    defaultRateToUSD: 95000,
    precision: 0,
  },
  AED: {
    code: "AED",
    name: "UAE Dirham",
    symbol: "AED",
    namePersian: "درهم امارات",
    defaultRateToUSD: 3.6725,
    precision: 2,
  },
  PKR: {
    code: "PKR",
    name: "Pakistani Rupee",
    symbol: "Rs",
    namePersian: "کلدار پاکستان",
    defaultRateToUSD: 278.5,
    precision: 0,
  },
  EUR: {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    namePersian: "یورو",
    defaultRateToUSD: 0.92,
    precision: 2,
  },
}

export const SAVED_RATES_KEY = "sky-currency-rates-v1"

export function getCustomRates(): Record<SupportedCurrency, number> {
  if (typeof window === "undefined") {
    return {
      USD: 1.0,
      AFN: 66.5,
      IRR: 95000,
      AED: 3.6725,
      PKR: 278.5,
      EUR: 0.92,
    }
  }
  try {
    const raw = window.localStorage.getItem(SAVED_RATES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        USD: 1.0,
        AFN: parsed.AFN || CURRENCY_CONFIGS.AFN.defaultRateToUSD,
        IRR: parsed.IRR || CURRENCY_CONFIGS.IRR.defaultRateToUSD,
        AED: parsed.AED || CURRENCY_CONFIGS.AED.defaultRateToUSD,
        PKR: parsed.PKR || CURRENCY_CONFIGS.PKR.defaultRateToUSD,
        EUR: parsed.EUR || CURRENCY_CONFIGS.EUR.defaultRateToUSD,
      }
    }
  } catch (e) {}
  return {
    USD: 1.0,
    AFN: CURRENCY_CONFIGS.AFN.defaultRateToUSD,
    IRR: CURRENCY_CONFIGS.IRR.defaultRateToUSD,
    AED: CURRENCY_CONFIGS.AED.defaultRateToUSD,
    PKR: CURRENCY_CONFIGS.PKR.defaultRateToUSD,
    EUR: CURRENCY_CONFIGS.EUR.defaultRateToUSD,
  }
}

export function saveCustomRates(rates: Partial<Record<SupportedCurrency, number>>) {
  if (typeof window === "undefined") return
  try {
    const cur = getCustomRates()
    const updated = { ...cur, ...rates, USD: 1.0 }
    window.localStorage.setItem(SAVED_RATES_KEY, JSON.stringify(updated))
  } catch (e) {}
}

export function roundMoney(amount: number, precision: number = 2): number {
  if (isNaN(amount) || !isFinite(amount)) return 0
  const factor = Math.pow(10, precision)
  return Math.round((Number(amount) || 0) * factor) / factor
}

export function convertFromUSD(amountUSD: number, targetCurrency: SupportedCurrency, customRates?: Record<SupportedCurrency, number>): number {
  if (targetCurrency === "USD" || !amountUSD) return roundMoney(amountUSD, 2)
  const rates = customRates || getCustomRates()
  const rate = rates[targetCurrency] || CURRENCY_CONFIGS[targetCurrency]?.defaultRateToUSD || 1.0
  const precision = CURRENCY_CONFIGS[targetCurrency]?.precision ?? 2
  return roundMoney(amountUSD * rate, precision)
}

export function convertToUSD(amount: number, fromCurrency: SupportedCurrency, customRates?: Record<SupportedCurrency, number>): number {
  if (fromCurrency === "USD" || !amount) return roundMoney(amount, 2)
  const rates = customRates || getCustomRates()
  const rate = rates[fromCurrency] || CURRENCY_CONFIGS[fromCurrency]?.defaultRateToUSD || 1.0
  if (rate <= 0) return 0
  return roundMoney(amount / rate, 2)
}

export function convertCurrency(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
  customRates?: Record<SupportedCurrency, number>
): number {
  if (fromCurrency === toCurrency) return roundMoney(amount, CURRENCY_CONFIGS[toCurrency]?.precision ?? 2)
  const usdAmount = convertToUSD(amount, fromCurrency, customRates)
  return convertFromUSD(usdAmount, toCurrency, customRates)
}

export function calculateNetBalance(debit: number | string, credit: number | string): number {
  const d = Number(debit) || 0
  const c = Number(credit) || 0
  return roundMoney(d - c, 2)
}

export function recalculateRunningBalances<T extends { debit?: number | string; credit?: number | string; balance?: number; sNo?: number }>(
  entries: T[]
): (T & { balance: number; sNo: number })[] {
  let running = 0
  return entries.map((entry, index) => {
    const debit = Number(entry.debit) || 0
    const credit = Number(entry.credit) || 0
    running = roundMoney(running + debit - credit, 2)
    return {
      ...entry,
      sNo: index + 1,
      debit,
      credit,
      balance: running,
    }
  })
}

export function formatCurrencyAmount(amount: number, currency: SupportedCurrency = "USD"): string {
  const config = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.USD
  const safeAmount = roundMoney(amount, config.precision)
  const formattedNum = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: config.precision,
    maximumFractionDigits: config.precision,
  }).format(safeAmount)

  if (currency === "USD") return `$${formattedNum}`
  if (currency === "EUR") return `€${formattedNum}`
  return `${formattedNum} ${config.symbol}`
}


/**
 * Export tabular data to CSV with UTF-8 BOM so Persian/Pashto/Arabic text renders properly in Excel
 */
export function exportToUtf8CSV(headers: string[], rows: (string | number)[][], fileName: string) {
  const sanitize = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const csvRows: string[] = []
  csvRows.push(headers.map(sanitize).join(","))

  for (const row of rows) {
    csvRows.push(row.map(sanitize).join(","))
  }

  const csvContent = "\uFEFF" + csvRows.join("\r\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
