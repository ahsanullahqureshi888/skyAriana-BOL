/**
 * Sky Ariana Logistics — Report Center Calculation & KPI Engine
 */

import {
  SavedDocument,
  OverviewKpis,
  PeriodComparisonResult,
  ComparisonMode,
  CurrencyTotal,
  ReportFilterCriteria,
} from "./types"
import {
  parseWeight,
  parsePackages,
  parseMoney,
  normalizeDate,
  safePercentageChange,
  extractBolRoute,
  extractTruckNo,
} from "./parsers"
import { auditDataQuality } from "./data-quality"

/**
 * Calculates comprehensive overview KPIs based strictly on currently filtered records.
 * Never hard-codes any value. Never sums mixed currencies together.
 */
export function calculateOverviewKpis(docs: SavedDocument[]): OverviewKpis {
  let totalPkgs = 0
  let totalNetWeightKg = 0
  let totalGrossWeightKg = 0
  let bolsWithPdf = 0
  let exportShipments = 0
  let importShipments = 0
  let reeferContainers = 0
  let dryContainers = 0
  const packageUnitsBreakdown: Record<string, number> = {}

  const currencyMap = new Map<string, number>()
  const uniqueContainers = new Set<string>()
  const uniqueShippers = new Set<string>()
  const uniqueConsignees = new Set<string>()
  const uniqueDestinations = new Set<string>()
  const uniqueBolNumbers = new Set<string>()

  for (const doc of docs) {
    if (doc.bol_number) uniqueBolNumbers.add(doc.bol_number.trim().toUpperCase())
    const shipper = (doc.shipper_name || "").trim() || "Unspecified Shipper"
    uniqueShippers.add(shipper.toLowerCase())

    const consignee = (doc.consignee_name || "").trim() || "Unspecified Consignee"
    uniqueConsignees.add(consignee.toLowerCase())

    const routeInfo = extractBolRoute(doc)
    const dest = doc.port_of_discharge || doc.place_of_delivery || doc.destination_country || (routeInfo.destination !== "—" ? routeInfo.destination : "")
    if (dest && dest.trim()) {
      uniqueDestinations.add(dest.trim().toLowerCase())
    }

    if (doc.pdf_url) {
      bolsWithPdf++
    }

    // Export vs Import determination
    const originText = (
      (doc.port_of_loading || "") +
      " " +
      (doc.origin_country || "") +
      " " +
      (doc.cargo_description || "")
    ).toLowerCase()

    const isAfghanOrigin =
      originText.includes("kandahar") ||
      originText.includes("kabul") ||
      originText.includes("herat") ||
      originText.includes("mazar") ||
      originText.includes("afghan") ||
      originText.includes("islam qala") ||
      originText.includes("torghundi") ||
      originText.includes("hairatan") ||
      originText.includes("spin boldak")

    if (isAfghanOrigin) {
      exportShipments++
    } else {
      importShipments++
    }

    // Packages & Weight
    const pkgs = parsePackages(doc.number_of_packages)
    totalPkgs += pkgs
    if (pkgs > 0) {
      const unitMatch = (doc.number_of_packages || "").match(/\b(CTNS?|CARTONS?|CNTS?|BAGS?|PKGS?|PACKAGES?|BOXES|PCS|UNITS|ROLLS|DRUMS)\b/i)
      let unit = "CTNS"
      if (unitMatch) {
        const u = unitMatch[1].toUpperCase()
        if (u.startsWith("CTN") || u.startsWith("CARTON") || u.startsWith("CNT")) unit = "CTNS"
        else if (u.startsWith("BAG")) unit = "BAGS"
        else if (u.startsWith("BOX")) unit = "BOXES"
        else if (u.startsWith("PKG") || u.startsWith("PACKAGE")) unit = "PKGS"
        else unit = u
      }
      packageUnitsBreakdown[unit] = (packageUnitsBreakdown[unit] || 0) + pkgs
    }

    const net = parseWeight(doc.net_weight)
    totalNetWeightKg += net
    const gross = parseWeight(doc.gross_weight)
    totalGrossWeightKg += gross > 0 ? gross : net

    // Money by Currency
    const { amount, currency } = parseMoney(doc.goods_value)
    if (amount > 0) {
      currencyMap.set(currency, (currencyMap.get(currency) || 0) + amount)
    }

    // Container parsing
    const rawContainers = doc.container_numbers || ""
    if (rawContainers.trim()) {
      const tokens = rawContainers
        .split(/[\n,;/]+/)
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean)

      for (const c of tokens) {
        if (c.length >= 4) {
          uniqueContainers.add(c)
          const isReefer =
            c.includes("RF") ||
            c.includes("REEF") ||
            (doc.cargo_description || "").toUpperCase().includes("REEFER") ||
            (doc.goods_description || "").toUpperCase().includes("REEFER")
          if (isReefer) {
            reeferContainers++
          } else {
            dryContainers++
          }
        }
      }
    }
  }

  // Ensure USD is always present in list even if 0 for consistent UI
  if (!currencyMap.has("USD")) {
    currencyMap.set("USD", 0)
  }

  const currencyTotals: CurrencyTotal[] = Array.from(currencyMap.entries())
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => (a.currency === "USD" ? -1 : b.currency === "USD" ? 1 : b.amount - a.amount))

  const qualityAudit = auditDataQuality(docs)

  return {
    totalBols: docs.length,
    totalShipments: uniqueBolNumbers.size > 0 ? uniqueBolNumbers.size : docs.length,
    totalPackages: totalPkgs,
    packageUnitsBreakdown,
    totalNetWeightKg: Math.round(totalNetWeightKg * 100) / 100,
    totalGrossWeightKg: Math.round(totalGrossWeightKg * 100) / 100,
    currencyTotals,
    totalContainers: uniqueContainers.size,
    totalShippers: uniqueShippers.size,
    totalConsignees: uniqueConsignees.size,
    totalDestinations: uniqueDestinations.size,
    bolsWithPdf,
    bolsWithoutPdf: docs.length - bolsWithPdf,
    exportShipments,
    importShipments,
    reeferContainers,
    dryContainers,
    missingDataCount: qualityAudit.attentionRecords,
    dataQualityScore: qualityAudit.qualityScorePercent,
  }
}

/**
 * Calculates Period Comparisons (Off, Previous Period, Previous Month, Previous Year, Custom).
 */
export function calculatePeriodComparison(
  currentDocs: SavedDocument[],
  allDocs: SavedDocument[],
  mode: ComparisonMode,
  customRange?: { from: string; to: string }
): PeriodComparisonResult | null {
  if (mode === "off" || currentDocs.length === 0) return null

  // Find date range of currentDocs
  const validDates: number[] = []
  for (const doc of currentDocs) {
    const d = normalizeDate(doc.issue_date || doc.created_at)
    if (d) validDates.push(d.getTime())
  }

  if (validDates.length === 0) return null

  const minDate = new Date(Math.min(...validDates))
  const maxDate = new Date(Math.max(...validDates))
  const durationMs = maxDate.getTime() - minDate.getTime() + 24 * 60 * 60 * 1000

  let prevStart = new Date()
  let prevEnd = new Date()
  let comparisonLabel = ""

  if (mode === "previous_period") {
    prevEnd = new Date(minDate.getTime() - 1)
    prevStart = new Date(prevEnd.getTime() - durationMs)
    comparisonLabel = `vs Previous Period (${prevStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} - ${prevEnd.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })})`
  } else if (mode === "previous_month") {
    // Entire previous calendar month
    prevStart = new Date(minDate.getFullYear(), minDate.getMonth() - 1, 1, 0, 0, 0, 0)
    prevEnd = new Date(minDate.getFullYear(), minDate.getMonth(), 0, 23, 59, 59, 999)
    const monthName = prevStart.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    comparisonLabel = `vs Previous Month (${monthName})`
  } else if (mode === "previous_year") {
    prevStart = new Date(minDate.getFullYear() - 1, 0, 1, 0, 0, 0, 0)
    prevEnd = new Date(minDate.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
    comparisonLabel = `vs Previous Year (${prevStart.getFullYear()})`
  } else if (mode === "custom" && customRange?.from && customRange?.to) {
    const cFrom = normalizeDate(customRange.from)
    const cTo = normalizeDate(customRange.to)
    if (cFrom && cTo) {
      prevStart = cFrom
      prevEnd = cTo
      comparisonLabel = `vs Custom (${customRange.from} - ${customRange.to})`
    }
  }

  // Filter allDocs for previous period
  const prevDocs = allDocs.filter((doc) => {
    const d = normalizeDate(doc.issue_date || doc.created_at)
    if (!d) return false
    return d.getTime() >= prevStart.getTime() && d.getTime() <= prevEnd.getTime()
  })

  // Current stats
  const currentKpis = calculateOverviewKpis(currentDocs)
  const prevKpis = calculateOverviewKpis(prevDocs)

  // Goods value USD
  const currentUsd = currentKpis.currencyTotals.find((c) => c.currency === "USD")?.amount || 0
  const prevUsd = prevKpis.currencyTotals.find((c) => c.currency === "USD")?.amount || 0

  return {
    mode,
    comparisonLabel,
    bols: {
      current: currentKpis.totalBols,
      previous: prevKpis.totalBols,
      ...safePercentageChange(currentKpis.totalBols, prevKpis.totalBols),
    },
    weightKg: {
      current: currentKpis.totalNetWeightKg,
      previous: prevKpis.totalNetWeightKg,
      ...safePercentageChange(currentKpis.totalNetWeightKg, prevKpis.totalNetWeightKg),
    },
    goodsValueUsd: {
      current: currentUsd,
      previous: prevUsd,
      ...safePercentageChange(currentUsd, prevUsd),
    },
    containers: {
      current: currentKpis.totalContainers,
      previous: prevKpis.totalContainers,
      ...safePercentageChange(currentKpis.totalContainers, prevKpis.totalContainers),
    },
  }
}

/**
 * Filter engine for the Report Center.
 */
export function applyReportFilters(
  docs: SavedDocument[],
  criteria: ReportFilterCriteria
): SavedDocument[] {
  return docs.filter((doc) => {
    const routeInfo = extractBolRoute(doc)

    // 1. Text Search Query across all key fields
    if (criteria.searchQuery && criteria.searchQuery.trim()) {
      const q = criteria.searchQuery.trim().toLowerCase()
      const searchBlob = [
        doc.bol_number,
        doc.shipper_name,
        doc.consignee_name,
        doc.notify_party_name,
        doc.notify_party,
        (doc as any).notifyParty,
        doc.cargo_description,
        doc.goods_description,
        doc.description_of_goods,
        doc.cargo_route_note,
        routeInfo.display !== "—" ? routeInfo.display : "",
        routeInfo.borderCrossing || "",
        doc.container_numbers,
        doc.truck_number,
        doc.invoice_no,
        doc.invoice_number,
        doc.port_of_loading,
        doc.port_of_discharge,
        doc.place_of_delivery,
      ]
        .filter(Boolean)
        .join(" ")
        .replace(/RAISNIS/gi, "RAISINS")
        .toLowerCase()

      if (!searchBlob.includes(q)) return false
    }

    // 2. Date filters
    if (criteria.dateFrom || criteria.dateTo) {
      const docDate = normalizeDate(doc.issue_date || doc.created_at)
      if (!docDate) return false

      if (criteria.dateFrom) {
        const from = normalizeDate(criteria.dateFrom)
        if (from && docDate.getTime() < from.getTime()) return false
      }
      if (criteria.dateTo) {
        const to = normalizeDate(criteria.dateTo)
        if (to) {
          // End of day
          to.setHours(23, 59, 59, 999)
          if (docDate.getTime() > to.getTime()) return false
        }
      }
    }

    // 3. Parties
    if (criteria.shipper && criteria.shipper.trim()) {
      const q = criteria.shipper.trim().toLowerCase()
      if (!doc.shipper_name || !doc.shipper_name.toLowerCase().includes(q)) return false
    }
    if (criteria.consignee && criteria.consignee.trim()) {
      const q = criteria.consignee.trim().toLowerCase()
      if (!doc.consignee_name || !doc.consignee_name.toLowerCase().includes(q)) return false
    }
    if (criteria.notify && criteria.notify.trim()) {
      const q = criteria.notify.trim().toLowerCase()
      const np = (doc.notify_party_name || doc.notify_party || (doc as any).notifyParty || "").toLowerCase()
      if (!np || !np.includes(q)) return false
    }

    // 4. Commodity
    if (criteria.commodity && criteria.commodity.trim()) {
      const q = criteria.commodity.trim().toLowerCase()
      const desc = (
        (doc.cargo_description || "") +
        " " +
        (doc.goods_description || "") +
        " " +
        (doc.description_of_goods || "")
      ).toLowerCase()
      if (!desc.includes(q)) return false
    }

    // 5. Ports & Destinations
    if (criteria.pol && criteria.pol.trim()) {
      const q = criteria.pol.trim().toLowerCase()
      if (!doc.port_of_loading || !doc.port_of_loading.toLowerCase().includes(q)) return false
    }
    if (criteria.pod && criteria.pod.trim()) {
      const q = criteria.pod.trim().toLowerCase()
      if (!doc.port_of_discharge || !doc.port_of_discharge.toLowerCase().includes(q)) return false
    }
    if (criteria.destination && criteria.destination.trim()) {
      const q = criteria.destination.trim().toLowerCase()
      const dest = [
        doc.port_of_discharge,
        doc.place_of_delivery,
        doc.destination_country,
        routeInfo.destination !== "—" ? routeInfo.destination : "",
        routeInfo.display !== "—" ? routeInfo.display : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!dest.includes(q)) return false
    }

    // 6. Containers & Trucks
    if (criteria.containerNumber && criteria.containerNumber.trim()) {
      const q = criteria.containerNumber.trim().toLowerCase()
      if (!doc.container_numbers || !doc.container_numbers.toLowerCase().includes(q)) return false
    }
    if (criteria.truckNumber && criteria.truckNumber.trim()) {
      const q = criteria.truckNumber.trim().toLowerCase()
      const truckText = [doc.truck_number, extractTruckNo(doc)].filter(Boolean).join(" ").toLowerCase()
      if (!truckText.includes(q)) return false
    }

    // 7. Routes
    if (criteria.route && criteria.route.trim()) {
      const q = criteria.route.trim().toLowerCase()
      const routeText = [
        routeInfo.display !== "—" ? routeInfo.display : "",
        routeInfo.shortDisplay !== "—" ? routeInfo.shortDisplay : "",
        routeInfo.origin,
        routeInfo.destination,
        routeInfo.via || "",
        routeInfo.borderCrossing || "",
        doc.cargo_route_note || "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!routeText.includes(q)) return false
    }

    // 8. Invoices & BOL
    if (criteria.bolNumber && criteria.bolNumber.trim()) {
      const q = criteria.bolNumber.trim().toLowerCase()
      if (!doc.bol_number || !doc.bol_number.toLowerCase().includes(q)) return false
    }
    if (criteria.invoiceNumber && criteria.invoiceNumber.trim()) {
      const q = criteria.invoiceNumber.trim().toLowerCase()
      const inv = ((doc.invoice_no || "") + " " + (doc.invoice_number || "")).toLowerCase()
      if (!inv.includes(q)) return false
    }

    // 9. Container Type
    if (criteria.containerType && criteria.containerType !== "all") {
      const cType = criteria.containerType.toUpperCase()
      const rawContainers = (doc.container_numbers || "").toUpperCase()
      const rawDesc = ((doc.cargo_description || "") + " " + (doc.goods_description || "")).toUpperCase()
      const rawRoute = (doc.cargo_route_note || "").toUpperCase()
      const isReefer =
        routeInfo.hasReefer ||
        rawContainers.includes("RF") ||
        rawContainers.includes("REEF") ||
        rawDesc.includes("REEFER") ||
        rawRoute.includes("REEFER")
      if (cType === "REEFER" && !isReefer) return false
      if (cType === "DRY" && isReefer) return false
      if (cType === "20 FT" && !(rawContainers.includes("20") || rawDesc.includes("20 FT") || rawDesc.includes("20FT"))) return false
      if (cType === "40 FT" && !(rawContainers.includes("40") || rawDesc.includes("40 FT") || rawDesc.includes("40FT"))) return false
      if (cType === "40 HC" && !(rawContainers.includes("40HC") || rawDesc.includes("HIGH CUBE"))) return false
      if (cType === "40 RF" && !(rawContainers.includes("40RF") || (rawDesc.includes("40") && isReefer))) return false
    }

    // 10. Shipment Type (Export vs Import)
    if (criteria.shipmentType && criteria.shipmentType !== "all") {
      const originText = (
        (doc.port_of_loading || "") +
        " " +
        (doc.origin_country || "") +
        " " +
        (doc.cargo_description || "")
      ).toLowerCase()

      const isAfghanOrigin =
        originText.includes("kandahar") ||
        originText.includes("kabul") ||
        originText.includes("herat") ||
        originText.includes("mazar") ||
        originText.includes("afghan") ||
        originText.includes("islam qala") ||
        originText.includes("torghundi") ||
        originText.includes("hairatan") ||
        originText.includes("spin boldak")

      if (criteria.shipmentType === "export" && !isAfghanOrigin) return false
      if (criteria.shipmentType === "import" && isAfghanOrigin) return false
    }

    // 11. Currency
    if (criteria.currency && criteria.currency !== "all") {
      const parsed = parseMoney(doc.goods_value)
      if (parsed.currency.toUpperCase() !== criteria.currency.toUpperCase()) return false
    }

    // 12. PDF status
    if (criteria.hasPdf === "yes" && !doc.pdf_url) return false
    if (criteria.hasPdf === "no" && doc.pdf_url) return false

    // 13. Missing Data drill-down
    if (criteria.missingData && criteria.missingData !== "all") {
      if (criteria.missingData === "container") {
        if (doc.container_numbers && doc.container_numbers.trim()) return false
      } else if (criteria.missingData === "invoice") {
        if ((doc.invoice_no && doc.invoice_no.trim()) || (doc.invoice_number && doc.invoice_number.trim())) return false
      } else if (criteria.missingData === "truck") {
        if ((doc.truck_number && doc.truck_number.trim()) || extractTruckNo(doc)) return false
      } else if (criteria.missingData === "driver") {
        if (doc.driver_name && doc.driver_name.trim()) return false
      } else if (criteria.missingData === "route") {
        if (routeInfo.display !== "—") return false
      } else if (criteria.missingData === "rate") {
        if ((doc.rate_per_kg && doc.rate_per_kg.trim()) || (doc.rate_per_kgs && doc.rate_per_kgs.trim())) return false
      } else if (criteria.missingData === "pdf") {
        if (doc.pdf_url) return false
      }
    }

    return true
  })
}
