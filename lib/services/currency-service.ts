/**
 * Sky Ariana BOL & Logistics - Currency & Exchange Rate Service
 * Handles multi-currency normalization (AFN <-> USD), detection heuristics,
 * exchange rate management, and dual-currency formatting.
 */

export const DEFAULT_AFN_USD_RATE = 70.0 // 1 USD = 70.0 Afghan Afghani (AFN)
export const EXCHANGE_RATE_STORAGE_KEY = "skybol:afn-usd-exchange-rate"

export interface ParsedCostResult {
  rawAmount: number
  rawString: string
  currency: "USD" | "AFN"
  normalizedUSD: number
  formattedNative: string
  formattedCombined: string
  exchangeRateUsed: number
  isAutoDetected: boolean
}

/**
 * Retrieves the currently configured AFN to USD exchange rate from localStorage or default.
 */
export function getActiveExchangeRate(): number {
  if (typeof window === "undefined") return DEFAULT_AFN_USD_RATE
  try {
    const stored = window.localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY)
    if (stored) {
      const parsed = parseFloat(stored)
      if (!isNaN(parsed) && parsed >= 10 && parsed <= 300) {
        return parsed
      }
    }
  } catch (e) {}
  return DEFAULT_AFN_USD_RATE
}

/**
 * Persists a new AFN to USD exchange rate.
 */
export function setActiveExchangeRate(rate: number): void {
  if (typeof window === "undefined") return
  try {
    if (rate >= 10 && rate <= 300) {
      window.localStorage.setItem(EXCHANGE_RATE_STORAGE_KEY, rate.toString())
      window.dispatchEvent(new CustomEvent("skybol:exchange-rate-updated", { detail: { rate } }))
    }
  } catch (e) {}
}

/**
 * Intelligent parser that extracts amount, detects currency (AFN vs USD),
 * and converts to normalized USD.
 *
 * Rules:
 * 1. Text containing AFN, افغانی, افغانۍ, هرات, ؋, AF is detected as AFN.
 * 2. Text containing $, USD, دالر, DOLLAR is detected as USD.
 * 3. Heuristic: For Afghan driver trucking/rent on container routes, numeric values > 5,000
 *    (e.g., 38500, 45000, 46730, 60000) are in AFN (since single-container driver rent in USD is ~$400–$1,200).
 */
export function parseFreightCost(
  rawInput: string | number | null | undefined,
  fallbackCurrency: "USD" | "AFN" = "AFN",
  exchangeRate: number = getActiveExchangeRate()
): ParsedCostResult {
  const rate = exchangeRate > 0 ? exchangeRate : DEFAULT_AFN_USD_RATE

  if (rawInput === null || rawInput === undefined || rawInput === "") {
    return {
      rawAmount: 0,
      rawString: "",
      currency: fallbackCurrency,
      normalizedUSD: 0,
      formattedNative: "$0",
      formattedCombined: "$0 USD",
      exchangeRateUsed: rate,
      isAutoDetected: false,
    }
  }

  const str = String(rawInput).trim()
  
  // Extract first valid numeric group (including commas/decimals)
  const cleanNumberMatch = str.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/)
  const rawAmount = cleanNumberMatch ? parseFloat(cleanNumberMatch[1]) : 0

  if (rawAmount === 0) {
    return {
      rawAmount: 0,
      rawString: str,
      currency: fallbackCurrency,
      normalizedUSD: 0,
      formattedNative: "$0",
      formattedCombined: "$0 USD",
      exchangeRateUsed: rate,
      isAutoDetected: false,
    }
  }

  // Currency detection
  let detectedCurrency: "USD" | "AFN" = fallbackCurrency
  let isAutoDetected = false

  const lower = str.toLowerCase()
  const isExplicitAFN = /afn|افغانی|افغانۍ|هرات|؋|\baf\b/i.test(lower)
  const isExplicitUSD = /\$|usd|دالر|dollar/i.test(lower)

  if (isExplicitAFN && !isExplicitUSD) {
    detectedCurrency = "AFN"
    isAutoDetected = true
  } else if (isExplicitUSD && !isExplicitAFN) {
    detectedCurrency = "USD"
    isAutoDetected = true
  } else {
    // Numeric Heuristic for Afghan Logistics:
    // If raw amount > 5,000 (e.g. 46,730 or 45,000), it's definitely AFN
    if (rawAmount >= 5000) {
      detectedCurrency = "AFN"
      isAutoDetected = true
    } else if (rawAmount < 3500 && fallbackCurrency === "USD") {
      detectedCurrency = "USD"
    } else if (rawAmount < 3500 && fallbackCurrency === "AFN" && rawAmount < 2000) {
      // Numbers like 650 or 850 in driver rent without AFN are USD defaults
      detectedCurrency = "USD"
    }
  }

  const normalizedUSD =
    detectedCurrency === "AFN"
      ? Math.round((rawAmount / rate) * 100) / 100
      : rawAmount

  const formattedNative =
    detectedCurrency === "AFN"
      ? `${rawAmount.toLocaleString("en-US")} AFN`
      : `$${rawAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`

  const formattedCombined =
    detectedCurrency === "AFN"
      ? `${rawAmount.toLocaleString("en-US")} AFN ($${Math.round(normalizedUSD).toLocaleString("en-US")} USD)`
      : `$${rawAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })} USD`

  return {
    rawAmount,
    rawString: str,
    currency: detectedCurrency,
    normalizedUSD,
    formattedNative,
    formattedCombined,
    exchangeRateUsed: rate,
    isAutoDetected,
  }
}

/**
 * Migration cleanup: Scans browser stored documents and ledger records to ensure
 * all driver_rent / driverFreight entries are correctly tagged with currency
 * and pre-calculated USD equivalents.
 */
export function runDataMigrationCleanup(exchangeRate: number = getActiveExchangeRate()): {
  migratedBols: number
  migratedLedgers: number
} {
  if (typeof window === "undefined") return { migratedBols: 0, migratedLedgers: 0 }

  let migratedBols = 0
  let migratedLedgers = 0

  try {
    const keys = ["sky-bol-browser-documents", "skybol:saved-documents", "skybol:backup-documents"]
    for (const key of keys) {
      const raw = window.localStorage.getItem(key)
      if (raw) {
        const docs = JSON.parse(raw)
        if (Array.isArray(docs)) {
          let updated = false
          const cleaned = docs.map((doc: any) => {
            if (doc.driver_rent) {
              const parsed = parseFreightCost(doc.driver_rent, "AFN", exchangeRate)
              if (!doc.driver_rent_currency || !doc.driver_rent_usd) {
                updated = true
                migratedBols++
                return {
                  ...doc,
                  driver_rent_currency: parsed.currency,
                  driver_rent_usd: parsed.normalizedUSD,
                  afn_to_usd_rate: exchangeRate,
                }
              }
            }
            return doc
          })
          if (updated) {
            window.localStorage.setItem(key, JSON.stringify(cleaned))
          }
        }
      }
    }
  } catch (e) {
    console.error("Migration error for BOL docs:", e)
  }

  return { migratedBols, migratedLedgers }
}
