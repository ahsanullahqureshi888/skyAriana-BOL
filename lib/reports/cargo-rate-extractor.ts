import { parseSyncedCargoItems } from "@/lib/utils/cargo-grid"
import { parsePackages, parseWeight, parseMoney, extractCleanCommodity } from "@/lib/reports/parsers"

export interface ExtractedCargoItem {
  id: string
  commodity: string
  packageText: string
  fullTitle: string
  netWeight: string
  grossWeight: string
  rate: string
  goodsValue: string
}

export interface ExtractedBolCargoAndRates {
  items: ExtractedCargoItem[]
  isMultiCargo: boolean
  allRates: string[]
  isMultiRate: boolean
  isUniformRate: boolean
  displayRate: string
  singleCommodityTitle: string
  cargoSummaryLine: string
}

/**
 * Extracts clean commodity name from an individual package/line text or fallback description.
 */
function extractCommodityFromText(text: string, fallbackDesc: string): string {
  if (!text) return extractCleanCommodity(fallbackDesc)
  // Check if text has both count and commodity e.g. "1190 CTNS DRY APRICOTS"
  const clean = text
    .replace(/^\d+[\.\)]\s*/, "")
    .replace(/^[\d,.]+\s*(?:CTNS|CARTONS|BAGS|PKGS|PACKAGES|BOXES|PCS|UNITS)\s*(?:OF)?\s*/i, "")
    .replace(/\b\d+(?:\.\d+)?\s*[-–—]\s*KGS?\b/gi, "")
    .replace(/\bRATE\s*[\d.]+\s*USD\b/gi, "")
    .replace(/@\s*[\d.]+\s*[$€£USD]*/gi, "")
    .trim()

  if (clean && !/^\d+$/.test(clean) && clean.length > 2) {
    const res = extractCleanCommodity(clean)
    if (res && res !== "General Cargo") return res
  }

  return extractCleanCommodity(fallbackDesc)
}

/**
 * Extracts line descriptions from cargo_description text by stripping headers.
 */
function extractDescriptionLines(rawDesc?: string | null): string[] {
  if (!rawDesc) return []
  return rawDesc
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter((l) => {
      const u = l.toUpperCase()
      if (u.includes("CONTAINER & CARGO") || u.includes("CARGO PARTICULARS") || u.includes("DOCUMENT & SHIPPING") || u.includes("SHIPPING DETAILS")) return false
      if (u.startsWith("TRANSIT DATE:") || u.startsWith("BORDER:") || u.startsWith("HS CODE:")) return false
      if (u.startsWith("INVOICE NO:") || u.startsWith("INV NO:") || u.startsWith("TRUCK NO:")) return false
      if (u.includes("TRANSIT DATE:") || u.includes("AFGHAN TC NO:") || u.includes("HS CODE:")) return false
      return true
    })
    .map((l) =>
      l
        .replace(/^[•*·\-🥬📦│\s]+/, "")
        .replace(/^(?:Description|Cargo):\s*/i, "")
        .replace(/^[-|,:;\s]+|[-|,:;\s]+$/g, "")
        .trim()
    )
    .filter((l) => l.length > 0 && l !== "|" && !/^[|│\s]*(?:📅|📄|🧾)/.test(l))
}

export function extractBolCargoAndRates(doc: any): ExtractedBolCargoAndRates {
  const syncedCargo = parseSyncedCargoItems(doc)
  const rawDesc = doc.cargo_description || doc.goods_description || doc.description_of_goods || ""
  const descLines = extractDescriptionLines(rawDesc)
  const fallbackSingleCommodity = doc.commodity || descLines[0] || rawDesc || "General Cargo"

  const items: ExtractedCargoItem[] = []

  if (syncedCargo.items && syncedCargo.items.length > 0) {
    syncedCargo.items.forEach((it, idx) => {
      // Determine clean commodity for this item
      const itemDescLine = descLines[idx] || descLines[0] || fallbackSingleCommodity
      const itemCommodity = extractCommodityFromText(it.packageText, itemDescLine)
      
      // Separate package count from commodity name if both are present in packageText
      let pkgOnly = it.packageText
      const pkgMatch = it.packageText.match(/^([\d,.]+\s*(?:CTNS|CARTONS|BAGS|PKGS|PACKAGES|BOXES|PCS|UNITS)?)/i)
      if (pkgMatch && pkgMatch[1]) {
        pkgOnly = pkgMatch[1].trim()
      }

      // Build readable full title: e.g. "Dry Apricots" or "1190 CTNS Dry Apricots"
      const fullTitle = it.packageText ? it.packageText : itemCommodity

      items.push({
        id: it.id || `cargo-${idx}`,
        commodity: itemCommodity,
        packageText: it.packageText || "",
        fullTitle,
        netWeight: it.netWeight || "",
        grossWeight: it.grossWeight || "",
        rate: it.rate || "",
        goodsValue: it.goodsValue || "",
      })
    })

    // Smart merge: if item 0 is e.g. "1320 CTNS" and item 1 is "BLACK RAISNIS" (no digits, no weights), merge into single item
    if (
      items.length === 2 &&
      items[0] &&
      items[1] &&
      !items[1].netWeight &&
      !items[1].grossWeight &&
      !items[1].rate &&
      !/\d/.test(items[1].packageText) &&
      /^\d+[\s,]*(?:CTNS|CARTONS|BAGS|PKGS|PACKAGES|BOXES|PCS|UNITS)/i.test(items[0].packageText)
    ) {
      const comm = extractCleanCommodity(items[1].packageText)
      items[0].commodity = comm
      items[0].fullTitle = `${items[0].packageText} ${comm}`
      items.splice(1, 1)
    }
  }

  // Fallback if no synced items
  if (items.length === 0) {
    const singleComm = extractCleanCommodity(fallbackSingleCommodity)
    items.push({
      id: "cargo-0",
      commodity: singleComm,
      packageText: doc.number_of_packages || "",
      fullTitle: doc.number_of_packages ? `${doc.number_of_packages} ${singleComm}` : singleComm,
      netWeight: doc.net_weight || "",
      grossWeight: doc.gross_weight || "",
      rate: doc.rate_per_kgs || (doc as any).rate_per_kg || (doc as any).rate || "",
      goodsValue: doc.goods_value || "",
    })
  }

  const isMultiCargo = items.length > 1

  // Extract all distinct or itemized rates
  const rateList: string[] = []
  for (const it of items) {
    if (it.rate && it.rate.trim()) {
      rateList.push(it.rate.trim())
    }
  }

  // Also check doc.rate_per_kgs if items didn't have separate rates
  if (rateList.length === 0 && (doc.rate_per_kgs || (doc as any).rate_per_kg)) {
    const rawRateStr = String(doc.rate_per_kgs || (doc as any).rate_per_kg || "")
    const splitRates = rawRateStr.split(/[\r\n;/]+/).map((r) => r.trim()).filter(Boolean)
    rateList.push(...splitRates)
  }

  const distinctRates = Array.from(new Set(rateList))
  const isMultiRate = rateList.length > 1 && distinctRates.length > 1
  const isUniformRate = rateList.length > 1 && distinctRates.length === 1
  const displayRate = isUniformRate
    ? `${distinctRates[0]} (All Items)`
    : isMultiRate
    ? rateList.join(", ")
    : rateList[0] || doc.rate_per_kgs || (doc as any).rate_per_kg || "—"

  const singleCommodityTitle = items[0]?.commodity || extractCleanCommodity(fallbackSingleCommodity)

  const cargoSummaryLine = isMultiCargo
    ? items.map((it) => it.fullTitle || it.commodity).join(" + ")
    : items[0]?.fullTitle || singleCommodityTitle

  return {
    items,
    isMultiCargo,
    allRates: rateList,
    isMultiRate,
    isUniformRate,
    displayRate,
    singleCommodityTitle,
    cargoSummaryLine,
  }
}
