import type { BillOfLadingFormData } from "@/lib/types/bill-of-lading"

export interface SyncedCargoItem {
  id: string
  packageText: string
  netPerCarton: string
  grossPerCarton: string
  netWeight: string
  grossWeight: string
  rate: string
  goodsValue: string
}

export interface CargoTotals {
  totalPackages: number
  packageUnit: string
  totalNetWeight: number
  totalGrossWeight: number
  weightUnit: string
  totalGoodsValue: number
  currency: string
}

export type CargoDensityTier = "normal" | "compact" | "dense" | "ultra"

const UNIT_ONLY_REGEX = /^(?:kgs?|cartons?|ctns?|cnts?|bags?|pkgs?|boxes|pcs|lbs?|tonnes?|tons?|cbm|mtrs?)$/i

export function cleanText(value?: string | null): string {
  if (!value) return ""
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function hasValue(value?: string | null): boolean {
  return cleanText(value).length > 0
}

export function splitMultiCargoItems(val?: string | null): string[] {
  const text = cleanText(val)
  if (!text) return []

  // Step 1: Split into initial chunks by newlines, pipes, semicolons
  const raw = text
    .split(/[\r\n|;]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  // Step 2: Split each chunk further by dash followed by digit, or space-dash-space, slash, or comma preceded by letter/unit
  const parts: string[] = []
  for (let chunk of raw) {
    // Normalize typos like "17.30 - KGS" -> "17.30 KGS" or "18.00-KGS" -> "18.00 KGS"
    chunk = chunk.replace(/(\d+(?:\.\d+)?)\s*[-–—]\s*([A-Za-z]+)/g, (m, g1, g2) => {
      if (UNIT_ONLY_REGEX.test(g2)) return `${g1} ${g2}`
      return m
    })

    // DO NOT split on commas inside numbers like 4,880 or 17,080.00!
    // Split on comma ONLY if preceded by a letter or closing bracket, or dash followed by number or currency symbol, or slash,
    // or when consecutive cargo items appear (e.g. "2170 CTNS DRY FIGS 84 CTNS DRY FIGS")
    const sub = chunk
      .split(
        /(?<=[A-Za-z)\]])\s*,\s*(?=[$€£\d])|\s*[-–—]\s*(?=[$€£\d])|\s+\/\s+|(?<=[A-Za-z)\]"'])\s+(?=\d+\s*(?:CTNS?|CARTONS?|CNTS?|BAGS?|PKGS?|BOXES|PCS|UNITS|ROLLS|DRUMS)\b)/i
      )
      .map((s) => s.trim())
      .filter(Boolean)

    for (const p of sub) {
      if (/\s+[-–—]\s+/.test(p)) {
        const hyphenParts = p.split(/\s+[-–—]\s+/).map((s) => s.trim()).filter(Boolean)
        if (!hyphenParts.some((s) => UNIT_ONLY_REGEX.test(s))) {
          parts.push(...hyphenParts)
          continue
        }
      }
      parts.push(p)
    }
  }

  // Step 3: Clean up and normalize unit spacing in every part
  let cleaned = parts
    .map((p) =>
      p
        .replace(/(\d+(?:\.\d+)?)\s*[-–—]\s*([A-Za-z]+)/g, (m, g1, g2) => {
          if (UNIT_ONLY_REGEX.test(g2)) return `${g1} ${g2}`
          return m
        })
        .trim()
    )
    .filter(Boolean)

  // Step 4: If the last part is a solitary currency word (USD, AFN, etc.) and preceding parts are numbers, merge it
  const currencyRegex = /^(USD|AFN|EUR|AED|INR|PKR|\$)$/i
  if (cleaned.length > 1 && currencyRegex.test(cleaned[cleaned.length - 1])) {
    const cur = cleaned.pop()!.toUpperCase()
    cleaned = cleaned.map((p) => (/^[0-9.,]+$/.test(p) ? `${p} ${cur}` : p))
  }

  return cleaned
}

export function parseCargoTotal(parts: string[]): { sum: number; allHaveNumbers: boolean; unit: string } {
  let sum = 0
  let numericPartsCount = 0
  let unit = ""

  for (const p of parts) {
    // Check if multiple package quantities exist in this single part
    const multiMatches = Array.from(
      p.matchAll(/\b([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(?:cartons?|ctns?|cnts?|bags?|pkgs?|boxes|pcs|units|drums|rolls)\b/gi)
    )
    if (multiMatches.length > 1) {
      for (const m of multiMatches) {
        const cleanNum = parseFloat(m[1].replace(/,/g, ""))
        if (!isNaN(cleanNum) && cleanNum > 0) {
          sum += cleanNum
        }
      }
      numericPartsCount++
    } else {
      const numMatch =
        p.match(/^\s*[$€£]?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/) ||
        p.match(/\b([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(?:kgs?|cartons?|ctns?|cnts?|bags?|pkgs?|boxes|pcs|usd|afn|eur)\b/i)

      if (numMatch) {
        const cleanNum = parseFloat(numMatch[1].replace(/,/g, ""))
        if (!isNaN(cleanNum) && cleanNum > 0) {
          sum += cleanNum
          numericPartsCount++
        }
      }
    }

    if (!unit) {
      if (p.includes("$")) {
        unit = "USD"
      } else if (p.includes("€")) {
        unit = "EUR"
      } else if (p.includes("£")) {
        unit = "GBP"
      } else {
        const unitMatch = p.match(/\b(KGS?|KG|TONS?|LBS?|USD|AFN|EUR|CTNS?|CARTONS?|CNTS?|BAGS?|PKGS?|BOXES|PCS)\b/i)
        if (unitMatch) {
          unit = unitMatch[1].toUpperCase()
        }
      }
    }
  }

  const allHaveNumbers = parts.length > 0 && numericPartsCount === parts.length
  return { sum: sum > 0 ? sum : 0, allHaveNumbers, unit }
}

export function parseSyncedCargoItems(formData: Partial<BillOfLadingFormData>): {
  items: SyncedCargoItem[]
  totals: CargoTotals
  maxItems: number
} {
  const pkgParts = splitMultiCargoItems(formData.number_of_packages)
  const netCtnParts = splitMultiCargoItems(formData.kgs_per_carton)
  const grossCtnParts = splitMultiCargoItems(formData.gross_weight_per_carton)
  const netWtParts = splitMultiCargoItems(formData.net_weight)
  const grossWtParts = splitMultiCargoItems(formData.gross_weight)
  const rateParts = splitMultiCargoItems(formData.rate_per_kgs)
  const valParts = splitMultiCargoItems(formData.goods_value)

  const hasAnyCargo =
    hasValue(formData.number_of_packages) ||
    hasValue(formData.kgs_per_carton) ||
    hasValue(formData.gross_weight_per_carton) ||
    hasValue(formData.net_weight) ||
    hasValue(formData.gross_weight) ||
    hasValue(formData.rate_per_kgs) ||
    hasValue(formData.goods_value)

  const maxItems = Math.max(
    pkgParts.length,
    netCtnParts.length,
    grossCtnParts.length,
    netWtParts.length,
    grossWtParts.length,
    rateParts.length,
    valParts.length,
    hasAnyCargo ? 1 : 0
  )

  const items: SyncedCargoItem[] = []
  for (let i = 0; i < maxItems; i++) {
    items.push({
      id: `cargo-row-${i}`,
      packageText: pkgParts[i] || (i === 0 ? cleanText(formData.number_of_packages) : ""),
      netPerCarton: netCtnParts[i] || (i === 0 ? cleanText(formData.kgs_per_carton) : ""),
      grossPerCarton: grossCtnParts[i] || (i === 0 ? cleanText(formData.gross_weight_per_carton) : ""),
      netWeight: netWtParts[i] || (i === 0 ? cleanText(formData.net_weight) : ""),
      grossWeight: grossWtParts[i] || (i === 0 ? cleanText(formData.gross_weight) : ""),
      rate: rateParts[i] || (i === 0 ? cleanText(formData.rate_per_kgs) : ""),
      goodsValue: valParts[i] || (i === 0 ? cleanText(formData.goods_value) : ""),
    })
  }

  // Calculate totals across ALL items in shipment
  const pkgTotal = parseCargoTotal(pkgParts)
  const netWtTotal = parseCargoTotal(netWtParts)
  const grossWtTotal = parseCargoTotal(grossWtParts)
  const valTotal = parseCargoTotal(valParts)

  // Single-item fallback totals if multi-split sum was 0
  const singlePkg = parseCargoTotal([cleanText(formData.number_of_packages)])
  const singleNet = parseCargoTotal([cleanText(formData.net_weight)])
  const singleGross = parseCargoTotal([cleanText(formData.gross_weight)])
  const singleVal = parseCargoTotal([cleanText(formData.goods_value)])

  const totals: CargoTotals = {
    totalPackages: pkgTotal.sum > 0 ? pkgTotal.sum : singlePkg.sum,
    packageUnit: pkgTotal.unit || singlePkg.unit || "CTNS",
    totalNetWeight: netWtTotal.sum > 0 ? netWtTotal.sum : singleNet.sum,
    totalGrossWeight: grossWtTotal.sum > 0 ? grossWtTotal.sum : singleGross.sum,
    weightUnit: netWtTotal.unit || grossWtTotal.unit || singleNet.unit || singleGross.unit || "KG",
    totalGoodsValue: valTotal.sum > 0 ? valTotal.sum : singleVal.sum,
    currency: valTotal.unit || singleVal.unit || "USD",
  }

  return { items, totals, maxItems }
}

export function getCargoDensity(count: number): "normal" | "compact" | "dense" | "multipage" {
  if (count <= 3) return "normal"
  if (count <= 5) return "compact"
  if (count <= 7) return "dense"
  return "multipage"
}

export function shouldSplitToPage2({
  cargoCount,
  routeCount = 0,
  descLineCount = 0,
  hasShippingData = false,
  hasRouteNote = false,
}: {
  cargoCount: number
  routeCount?: number
  descLineCount?: number
  hasShippingData?: boolean
  hasRouteNote?: boolean
}): boolean {
  if (cargoCount >= 8) return true

  let budgetScore = cargoCount * 1.5
  if (routeCount >= 5) budgetScore += 3
  else if (routeCount >= 3) budgetScore += 1.5

  if (descLineCount >= 6) budgetScore += 4
  else if (descLineCount >= 3) budgetScore += 2

  if (hasShippingData) budgetScore += 2
  if (hasRouteNote) budgetScore += 2

  return budgetScore > 13
}

export function splitCargoForPages(
  items: SyncedCargoItem[],
  isMultiPage: boolean
): { page1Items: SyncedCargoItem[]; page2Items: SyncedCargoItem[] } {
  if (!isMultiPage || items.length <= 1) {
    return { page1Items: items, page2Items: [] }
  }

  const page1Count = Math.min(
    items.length >= 14 ? 8 : items.length >= 10 ? 6 : 5,
    items.length - 2
  )

  return {
    page1Items: items.slice(0, page1Count),
    page2Items: items.slice(page1Count),
  }
}
