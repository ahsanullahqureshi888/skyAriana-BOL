/**
 * Sky Ariana Logistics — Unified Operations Report Engine
 * Single Source of Truth & Data Pipeline for Operations Reporting
 */

import {
  SavedDocument,
  OperationsPeriod,
  OperationsPeriodType,
  OperationsReportModel,
  OperationsReportMetadata,
  OperationsReportSummary,
  ShipmentActivityItem,
  StatusCategorySummary,
  RouteActivityItem,
  ContainerActivityItem,
  TruckActivityItem,
  BorderActivityItem,
  PortActivityItem,
  VesselActivityItem,
  EtaEtdItem,
  NeedsAttentionItem,
  DocumentStatusItem,
  DailyBreakdownItem,
  OperationsSnapshotMetadata,
} from "./types"
import { parseWeight, parsePackages, parseMoney, normalizeDate } from "./parsers"

const SNAPSHOTS_STORAGE_KEY = "sky_operations_snapshots_v1"
const DEFAULT_TIMEZONE = "Asia/Kabul"

// Known border transit border stations
const KNOWN_BORDERS = [
  "Dogharoon",
  "Islam Qala",
  "Milak",
  "Torghundi",
  "Hairatan",
  "Spin Boldak",
  "Bazargan",
  "Sarakhs",
]

// Known major shipping & transshipment ports
const KNOWN_PORTS = [
  "Bandar Abbas",
  "Jebel Ali",
  "Mersin",
  "Nhava Sheva",
  "Mundra",
  "Jeddah",
  "Iskenderun",
  "Karachi",
]

/**
 * Formats a Date into YYYY-MM-DD in the target business timezone.
 */
export function formatDateInTimezone(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    return formatter.format(date) // Output: YYYY-MM-DD
  } catch {
    return date.toISOString().split("T")[0]
  }
}

/**
 * Resolves start and end dates (YYYY-MM-DD) for a given period type.
 */
export function resolveOperationsPeriod(
  periodType: OperationsPeriodType,
  customStart?: string,
  customEnd?: string,
  timezone: string = DEFAULT_TIMEZONE,
  weekStartDay: 0 | 1 | 6 = 1 // 1 = Monday, 0 = Sunday, 6 = Saturday
): OperationsPeriod {
  const now = new Date()
  const todayStr = formatDateInTimezone(now, timezone)
  const [currentYear, currentMonth, currentDay] = todayStr.split("-").map(Number)

  let startDate = todayStr
  let endDate = todayStr
  let label = ""

  switch (periodType) {
    case "today": {
      startDate = todayStr
      endDate = todayStr
      label = formatDisplayPeriodDate(startDate)
      break
    }
    case "yesterday": {
      const yesterday = new Date(Date.UTC(currentYear, currentMonth - 1, currentDay - 1))
      const yStr = formatDateInTimezone(yesterday, timezone)
      startDate = yStr
      endDate = yStr
      label = formatDisplayPeriodDate(startDate)
      break
    }
    case "this_week": {
      const d = new Date(Date.UTC(currentYear, currentMonth - 1, currentDay))
      const dayOfWeek = d.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
      const diff = (dayOfWeek - weekStartDay + 7) % 7
      const weekStart = new Date(d)
      weekStart.setUTCDate(d.getUTCDate() - diff)

      startDate = formatDateInTimezone(weekStart, timezone)
      endDate = todayStr
      label = `${formatDisplayPeriodDate(startDate)} – ${formatDisplayPeriodDate(endDate)}`
      break
    }
    case "last_week": {
      const d = new Date(Date.UTC(currentYear, currentMonth - 1, currentDay))
      const dayOfWeek = d.getUTCDay()
      const diff = (dayOfWeek - weekStartDay + 7) % 7
      const thisWeekStart = new Date(d)
      thisWeekStart.setUTCDate(d.getUTCDate() - diff)

      const lastWeekStart = new Date(thisWeekStart)
      lastWeekStart.setUTCDate(thisWeekStart.getUTCDate() - 7)
      const lastWeekEnd = new Date(thisWeekStart)
      lastWeekEnd.setUTCDate(thisWeekStart.getUTCDate() - 1)

      startDate = formatDateInTimezone(lastWeekStart, timezone)
      endDate = formatDateInTimezone(lastWeekEnd, timezone)
      label = `${formatDisplayPeriodDate(startDate)} – ${formatDisplayPeriodDate(endDate)}`
      break
    }
    case "this_month": {
      const monthStart = new Date(Date.UTC(currentYear, currentMonth - 1, 1))
      startDate = formatDateInTimezone(monthStart, timezone)
      endDate = todayStr
      const monthName = monthStart.toLocaleString("en-US", { month: "long", timeZone: "UTC" })
      label = `${monthName} ${currentYear} (${formatDisplayPeriodDate(startDate)} – ${formatDisplayPeriodDate(endDate)})`
      break
    }
    case "last_month": {
      const prevMonthLastDay = new Date(Date.UTC(currentYear, currentMonth - 1, 0))
      const prevMonthFirstDay = new Date(Date.UTC(prevMonthLastDay.getUTCFullYear(), prevMonthLastDay.getUTCMonth(), 1))
      startDate = formatDateInTimezone(prevMonthFirstDay, timezone)
      endDate = formatDateInTimezone(prevMonthLastDay, timezone)
      const monthName = prevMonthFirstDay.toLocaleString("en-US", { month: "long", timeZone: "UTC" })
      label = `${monthName} ${prevMonthFirstDay.getUTCFullYear()}`
      break
    }
    case "custom": {
      startDate = customStart || todayStr
      endDate = customEnd || todayStr
      label = startDate === endDate
        ? formatDisplayPeriodDate(startDate)
        : `${formatDisplayPeriodDate(startDate)} – ${formatDisplayPeriodDate(endDate)}`
      break
    }
  }

  return {
    type: periodType,
    label,
    startDate,
    endDate,
    businessTimezone: timezone,
  }
}

function formatDisplayPeriodDate(isoDate: string): string {
  if (!isoDate) return ""
  const parts = isoDate.split("-")
  if (parts.length < 3) return isoDate
  const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])))
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

/**
 * Auto-generates a clean, professional report title.
 */
export function generateOperationsReportTitle(period: OperationsPeriod): string {
  switch (period.type) {
    case "today":
      return `Sky Ariana Daily Operations Report — ${period.label}`
    case "yesterday":
      return `Sky Ariana Operations Report (Yesterday) — ${period.label}`
    case "this_week":
      return `Sky Ariana Weekly Operations Report — ${period.label}`
    case "last_week":
      return `Sky Ariana Weekly Operations Report — ${period.label}`
    case "this_month":
    case "last_month":
      return `Sky Ariana Monthly Operations Report — ${period.label}`
    case "custom":
      return `Sky Ariana Operations Report — ${period.label}`
  }
}

/**
 * Parses driver rent and extracts amount and currency accurately
 */
function parseDriverRent(rentStr?: string): { amount: number; currency: string } {
  if (!rentStr) return { amount: 0, currency: "USD" }
  const clean = rentStr.replace(/,/g, "").trim()
  const match = clean.match(/(\d+(?:\.\d+)?)/)
  const amount = match ? parseFloat(match[1]) : 0
  let currency = "USD"
  if (/AFN|افغانی/i.test(rentStr)) {
    currency = "AFN"
  } else if (/EUR|یورو/i.test(rentStr)) {
    currency = "EUR"
  } else if (/USD|دالر|\$/i.test(rentStr)) {
    currency = "USD"
  }
  return { amount, currency }
}

/**
 * Resolves standard operational status category
 */
function resolveOperationalStatus(status?: string, fullText?: string): string {
  const s = (status || "").toLowerCase()
  const t = (fullText || "").toLowerCase()

  if (s === "delivered" || s.includes("deliver") || s.includes("complete")) return "DELIVERED"
  if (s === "at_border" || t.includes("border") || t.includes("dogharoon") || t.includes("islam qala")) return "AT BORDER"
  if (s === "at_port" || t.includes("port") || t.includes("bandar abbas") || t.includes("jebel ali")) return "AT PORT"
  if (s === "on_vessel" || s === "vessel_departed" || t.includes("vessel") || t.includes("on sea")) return "VESSEL DEPARTED"
  if (s.includes("pending") || s.includes("draft")) return "DOCUMENTS PENDING"
  return "IN TRANSIT"
}

/**
 * Builds the complete unified OperationsReportModel from raw saved documents.
 */
export function buildOperationsReport(
  documents: SavedDocument[],
  period: OperationsPeriod,
  filters: {
    origin?: string
    destination?: string
    status?: string
    carrier?: string
  } = {},
  generatedBy: string = "Sky Ariana Operations Desk",
  notes: string = ""
): OperationsReportModel {
  const timezone = period.businessTimezone || DEFAULT_TIMEZONE
  const now = new Date()
  const generatedAt = `${formatDateInTimezone(now, timezone)} ${now.toLocaleTimeString("en-GB", { hour12: false })}`

  // 1. Filter documents by date period
  const scopedDocs = documents.filter((doc) => {
    const docDate = doc.issue_date || (doc.created_at ? doc.created_at.split("T")[0] : "")
    if (!docDate) return false

    const parsed = normalizeDate(docDate)
    if (!parsed) return false

    const formattedDocDate = formatDateInTimezone(parsed, timezone)
    return formattedDocDate >= period.startDate && formattedDocDate <= period.endDate
  })

  // 2. Aggregations
  let totalPkgs = 0
  let totalNetWeightKg = 0
  let totalGrossWeightKg = 0
  let bolsWithPdf = 0
  let exportShipments = 0
  let importShipments = 0
  let dryContainersCount = 0
  let reeferContainersCount = 0

  const revenueCurrencyMap: Record<string, number> = {}
  const driverRentCurrencyMap: Record<string, number> = {}
  const uniqueContainers = new Set<string>()

  const shipments: ShipmentActivityItem[] = []
  const containers: ContainerActivityItem[] = []
  const trucks: TruckActivityItem[] = []
  const routesMap = new Map<string, { count: number; containers: Set<string>; weightKg: number; border: string; port: string; destination: string; origin: string; statuses: string[] }>()
  const borderActivityMap = new Map<string, { waiting: number; processing: number; crossed: number; total: number; grossWeightKg: number }>()
  const portActivityMap = new Map<string, { shipments: number; containers: Set<string>; grossWeightKg: number; arrived: number; departed: number; pending: number }>()
  const vessels: VesselActivityItem[] = []
  const departures: EtaEtdItem[] = []
  const arrivals: EtaEtdItem[] = []
  const needsAttention: NeedsAttentionItem[] = []

  const shipperCounts = new Map<string, { count: number; containers: number; weightKg: number }>()
  const consigneeCounts = new Map<string, { count: number; containers: number; weightKg: number }>()
  const commodityCounts = new Map<string, { count: number; containers: number; weightKg: number }>()
  const destinationCounts = new Map<string, { count: number; weightKg: number }>()
  const dailyMap = new Map<string, { shipments: number; containers: Set<string>; weightKg: number; packages: number }>()

  // Initialize known borders and ports
  for (const b of KNOWN_BORDERS) {
    borderActivityMap.set(b, { waiting: 0, processing: 0, crossed: 0, total: 0, grossWeightKg: 0 })
  }
  for (const p of KNOWN_PORTS) {
    portActivityMap.set(p, { shipments: 0, containers: new Set(), grossWeightKg: 0, arrived: 0, departed: 0, pending: 0 })
  }

  // 3. Process each document
  for (const doc of scopedDocs) {
    const pkgs = parsePackages(doc.number_of_packages)
    const netWt = parseWeight(doc.net_weight)
    const grossWt = parseWeight(doc.gross_weight) || netWt
    const money = parseMoney(doc.goods_value)
    const rent = parseDriverRent(doc.driver_rent)

    totalPkgs += pkgs
    totalNetWeightKg += netWt
    totalGrossWeightKg += grossWt

    // Currency Revenue Aggregation (Segregated)
    if (money.amount > 0) {
      revenueCurrencyMap[money.currency] = (revenueCurrencyMap[money.currency] || 0) + money.amount
    }

    // Driver Rent Aggregation (Segregated)
    if (rent.amount > 0) {
      driverRentCurrencyMap[rent.currency] = (driverRentCurrencyMap[rent.currency] || 0) + rent.amount
    }

    const hasPdf = Boolean(doc.pdf_url)
    if (hasPdf) bolsWithPdf++

    // Origin / Destination / Border / Port
    const origin = String(doc.port_of_loading || doc.origin_country || "Kandahar").trim()
    const destination = String(doc.port_of_discharge || doc.place_of_delivery || doc.destination_country || "Nhava Sheva").trim()
    const route = `${origin} ➜ ${destination}`

    const fullText = `${origin} ${destination} ${doc.cargo_description || ""} ${doc.port_of_loading || ""} ${doc.port_of_discharge || ""}`.toLowerCase()

    // Border Crossing
    let borderCrossing = ""
    for (const b of KNOWN_BORDERS) {
      if (fullText.includes(b.toLowerCase())) {
        borderCrossing = b
        break
      }
    }
    if (!borderCrossing) {
      borderCrossing = origin.toLowerCase().includes("herat") ? "Islam Qala" : "Dogharoon"
    }

    // Port of entry/exit
    let port = ""
    for (const p of KNOWN_PORTS) {
      if (fullText.includes(p.toLowerCase())) {
        port = p
        break
      }
    }
    if (!port) {
      port = destination.toLowerCase().includes("uae") || destination.toLowerCase().includes("dubai")
        ? "Jebel Ali"
        : destination.toLowerCase().includes("turkey") || destination.toLowerCase().includes("istanbul")
        ? "Mersin"
        : "Bandar Abbas"
    }

    // Container parsing
    const rawContainers = String(doc.container_numbers || (doc as any).container_number || "").trim()
    const containerSerials: string[] = rawContainers
      ? rawContainers.split(/[\n,;/]+/).map((s: string) => String(s).trim().toUpperCase()).filter(Boolean)
      : []

    const isReefer = (doc.measurement || "").toLowerCase().includes("reefer") ||
      (doc.cargo_description || "").toLowerCase().includes("reefer") ||
      (doc.remarks || "").toLowerCase().includes("reefer")
    const containerType = isReefer ? "40'RF (Reefer)" : "40'HC (Dry Container)"
    const containerCategory: "Dry" | "Reefer" | "Special" | "Not Assigned" = isReefer
      ? "Reefer"
      : containerSerials.length > 0
      ? "Dry"
      : "Not Assigned"

    if (isReefer) {
      reeferContainersCount += Math.max(1, containerSerials.length)
    } else {
      dryContainersCount += Math.max(1, containerSerials.length)
    }

    containerSerials.forEach((c) => uniqueContainers.add(c))

    // Operational Status
    const docStatus = (doc as any).status || "in_transit"
    const operationalStatus = resolveOperationalStatus(docStatus, fullText)

    // Commodity
    const commodity = extractCommodity(doc.cargo_description || (doc as any).description_of_goods || "General Cargo")

    // Document Checklist
    const docChecks = {
      bol: hasPdf ? ("Complete" as const) : ("Missing" as const),
      invoice: doc.invoice_no || doc.invoice_number ? ("Complete" as const) : ("Missing" as const),
      packingList: pkgs > 0 && netWt > 0 ? ("Complete" as const) : ("Missing" as const),
      transitPaper: (doc.truck_number ? "Complete" : "Not Required") as "Complete" | "Missing" | "Not Required",
      phytosanitary: (isAgriCommodity(commodity) ? (hasPdf ? "Complete" : "Missing") : "Not Required") as "Complete" | "Missing" | "Not Required",
    }

    // Attention checks
    const itemAttention: string[] = []
    if (!hasPdf) {
      itemAttention.push("Missing PDF document")
      needsAttention.push({
        category: "Documentation",
        severity: "warning",
        issue: "Missing PDF Document",
        description: `BOL ${doc.bol_number || doc.id} has no uploaded or generated PDF.`,
        bolNumber: doc.bol_number || doc.id,
        shipper: doc.shipper_name || "Unknown",
        suggestedAction: "Upload signed PDF or generate docket pack.",
      })
    }
    if (containerSerials.length === 0) {
      itemAttention.push("Container number not assigned")
      needsAttention.push({
        category: "Equipment",
        severity: "high",
        issue: "Container Unassigned",
        description: `BOL ${doc.bol_number || doc.id} has no container unit assigned.`,
        bolNumber: doc.bol_number || doc.id,
        shipper: doc.shipper_name || "Unknown",
        suggestedAction: "Assign 20FT/40HC container serial in editor.",
      })
    }
    const cleanTruckNo = String(doc.truck_number || "").trim()
    if (!cleanTruckNo) {
      itemAttention.push("Afghan truck plate missing")
      needsAttention.push({
        category: "Transport",
        severity: "high",
        issue: "Truck Plate Missing",
        description: `Transit driver for BOL ${doc.bol_number || doc.id} is missing vehicle registration plate.`,
        bolNumber: doc.bol_number || doc.id,
        shipper: doc.shipper_name || "Unknown",
        suggestedAction: "Record Afghan transit license plate number.",
      })
    }

    const currentLoc = String(doc.place_of_delivery || doc.port_of_loading || origin || "").trim()

    // Build ShipmentActivityItem
    const activityItem: ShipmentActivityItem = {
      id: doc.id,
      bolNumber: doc.bol_number || doc.id,
      trackingNumber: (doc as any).tracking_number || doc.bol_number || doc.id,
      issueDate: doc.issue_date || "",
      createdDate: doc.created_at ? doc.created_at.split("T")[0] : doc.issue_date || "",
      updatedDate: (doc as any).updated_at ? (doc as any).updated_at.split("T")[0] : undefined,
      shipper: doc.shipper_name || "Unknown Shipper",
      shipperName: doc.shipper_name || "Unknown Shipper",
      consignee: doc.consignee_name || "Unknown Consignee",
      consigneeName: doc.consignee_name || "Unknown Consignee",
      commodity,
      packages: pkgs,
      packageUnit: "CTNS",
      netWeightKg: netWt,
      grossWeightKg: grossWt,
      goodsValue: money.amount > 0 ? money : undefined,
      containerType,
      containerNumber: containerSerials.length > 0 ? containerSerials.join(", ") : "Not Assigned",
      truckNumber: doc.truck_number || "Not Assigned",
      driverName: doc.driver_name || "Unassigned",
      driverFatherName: doc.driver_father_name || "",
      driverPhone: (doc as any).driver_phone || (doc as any).driver_mobile || "",
      driverRent: rent.amount,
      rentCurrency: rent.currency,
      origin,
      currentLocation: currentLoc,
      destination,
      borderCrossing,
      port,
      status: formatReadableStatus(docStatus),
      statusCategory: operationalStatus,
      operationalStatus,
      route,
      hasPdf,
      documentsStatus: docChecks,
      needsAttention: itemAttention.length > 0,
      attentionReasons: itemAttention,
    }
    shipments.push(activityItem)

    // Containers Activity
    if (containerSerials.length > 0) {
      for (const cNum of containerSerials) {
        containers.push({
          containerNumber: cNum,
          containerType,
          type: containerType,
          category: containerCategory,
          bolNumber: doc.bol_number || doc.id,
          shipper: doc.shipper_name || "Unknown",
          consignee: doc.consignee_name || "Unknown",
          commodity,
          origin,
          currentLocation: currentLoc,
          destination,
          port,
          status: operationalStatus,
        })
      }
    } else {
      containers.push({
        containerNumber: "Not Assigned",
        containerType,
        type: containerType,
        category: "Not Assigned",
        bolNumber: doc.bol_number || doc.id,
        shipper: doc.shipper_name || "Unknown",
        consignee: doc.consignee_name || "Unknown",
        commodity,
        origin,
        currentLocation: currentLoc,
        destination,
        port,
        status: operationalStatus,
      })
    }

    // Trucks Activity (Preserve Afghan truck plate number strictly as string)
    if (doc.truck_number && String(doc.truck_number).trim()) {
      trucks.push({
        truckNumber: String(doc.truck_number).trim(),
        driverName: doc.driver_name || "Unassigned",
        driverFatherName: doc.driver_father_name || "",
        driverPhone: (doc as any).driver_phone || (doc as any).driver_mobile || "",
        origin,
        borderCrossing,
        destination,
        bolNumber: doc.bol_number || doc.id,
        rentAmount: rent.amount,
        rentCurrency: rent.currency,
        shipper: doc.shipper_name || "Unknown",
        commodity,
        currentLocation: currentLoc,
        status: operationalStatus,
        lastUpdate: doc.issue_date || "Current",
      })
    }

    // Routes aggregation
    const routeEntry = routesMap.get(route) || {
      count: 0,
      containers: new Set(),
      weightKg: 0,
      border: borderCrossing,
      port,
      destination,
      origin,
      statuses: [],
    }
    routeEntry.count++
    routeEntry.weightKg += grossWt
    containerSerials.forEach((c) => routeEntry.containers.add(c))
    routeEntry.statuses.push(operationalStatus)
    routesMap.set(route, routeEntry)

    // Border Activity
    if (borderCrossing) {
      const b = borderActivityMap.get(borderCrossing) || { waiting: 0, processing: 0, crossed: 0, total: 0, grossWeightKg: 0 }
      b.total++
      b.grossWeightKg += grossWt
      if (operationalStatus === "AT BORDER") b.waiting++
      else if (operationalStatus === "DELIVERED") b.crossed++
      else b.processing++
      borderActivityMap.set(borderCrossing, b)
    }

    // Port Activity
    if (port) {
      const p = portActivityMap.get(port) || { shipments: 0, containers: new Set(), grossWeightKg: 0, arrived: 0, departed: 0, pending: 0 }
      p.shipments++
      p.grossWeightKg += grossWt
      containerSerials.forEach((c) => p.containers.add(c))
      if (operationalStatus === "VESSEL DEPARTED") p.departed++
      else if (operationalStatus === "AT PORT") p.arrived++
      else p.pending++
      portActivityMap.set(port, p)
    }

    // Rankings accumulation
    if (doc.shipper_name && String(doc.shipper_name).trim()) {
      const s = String(doc.shipper_name).trim()
      const prev = shipperCounts.get(s) || { count: 0, containers: 0, weightKg: 0 }
      shipperCounts.set(s, {
        count: prev.count + 1,
        containers: prev.containers + Math.max(1, containerSerials.length),
        weightKg: prev.weightKg + grossWt,
      })
    }
    if (doc.consignee_name && String(doc.consignee_name).trim()) {
      const c = String(doc.consignee_name).trim()
      const prev = consigneeCounts.get(c) || { count: 0, containers: 0, weightKg: 0 }
      consigneeCounts.set(c, {
        count: prev.count + 1,
        containers: prev.containers + Math.max(1, containerSerials.length),
        weightKg: prev.weightKg + grossWt,
      })
    }
    if (commodity) {
      const prev = commodityCounts.get(commodity) || { count: 0, containers: 0, weightKg: 0 }
      commodityCounts.set(commodity, {
        count: prev.count + 1,
        containers: prev.containers + Math.max(1, containerSerials.length),
        weightKg: prev.weightKg + grossWt,
      })
    }
    if (destination) {
      const prev = destinationCounts.get(destination) || { count: 0, weightKg: 0 }
      destinationCounts.set(destination, { count: prev.count + 1, weightKg: prev.weightKg + grossWt })
    }

    // Daily breakdown
    const itemDate = doc.issue_date || (doc.created_at ? doc.created_at.split("T")[0] : "")
    if (itemDate) {
      const dEntry = dailyMap.get(itemDate) || { shipments: 0, containers: new Set(), weightKg: 0, packages: 0 }
      dEntry.shipments++
      dEntry.packages += pkgs
      dEntry.weightKg += grossWt
      containerSerials.forEach((c) => dEntry.containers.add(c))
      dailyMap.set(itemDate, dEntry)
    }
  }

  // 4. Status Categories
  const categoryOrder = [
    "AT BORDER",
    "IN TRANSIT",
    "AT PORT",
    "VESSEL DEPARTED",
    "DELIVERED",
    "DOCUMENTS PENDING",
  ]

  const totalShipmentsCount = shipments.length
  const statusCategories: StatusCategorySummary[] = categoryOrder.map((statusCat) => {
    const matching = shipments.filter((s) => s.operationalStatus === statusCat)
    const count = matching.length
    const percentage = totalShipmentsCount > 0 ? (count / totalShipmentsCount) * 100 : 0
    return {
      key: statusCat.toLowerCase().replace(/\s+/g, "_"),
      statusCategory: statusCat,
      count,
      percentage,
      shipmentIds: matching.map((m) => m.id),
    }
  })

  // 5. Routes
  const routes: RouteActivityItem[] = Array.from(routesMap.entries()).map(([route, data]) => ({
    route,
    origin: data.origin,
    border: data.border,
    port: data.port,
    destination: data.destination,
    shipmentCount: data.count,
    containerCount: data.containers.size,
    grossWeightKg: data.weightKg,
    shipmentsCount: data.count,
    containersCount: data.containers.size,
    totalWeightKg: data.weightKg,
    latestStatus: data.statuses[data.statuses.length - 1] || "Active",
  })).sort((a, b) => b.shipmentCount - a.shipmentCount)

  // 6. Borders
  const borders: BorderActivityItem[] = Array.from(borderActivityMap.entries())
    .filter(([_, data]) => data.total > 0)
    .map(([border, data]) => ({
      borderStation: border,
      border,
      shipmentCount: data.total,
      grossWeightKg: data.grossWeightKg,
      waiting: data.waiting,
      processing: data.processing,
      crossed: data.crossed,
      total: data.total,
    }))

  // 7. Ports
  const ports: PortActivityItem[] = Array.from(portActivityMap.entries())
    .filter(([_, data]) => data.shipments > 0)
    .map(([port, data]) => ({
      portName: port,
      port,
      shipmentCount: data.shipments,
      containerCount: data.containers.size,
      grossWeightKg: data.grossWeightKg,
      shipmentsCount: data.shipments,
      containersCount: data.containers.size,
      arrived: data.arrived,
      departed: data.departed,
      pending: data.pending,
    }))

  // 8. Rankings
  const topShippers = Array.from(shipperCounts.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      shipmentCount: data.count,
      containerCount: data.containers,
      weightKg: data.weightKg,
      grossWeightKg: data.weightKg,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const topConsignees = Array.from(consigneeCounts.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      shipmentCount: data.count,
      containerCount: data.containers,
      weightKg: data.weightKg,
      grossWeightKg: data.weightKg,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const topCommodities = Array.from(commodityCounts.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      shipmentCount: data.count,
      containerCount: data.containers,
      weightKg: data.weightKg,
      grossWeightKg: data.weightKg,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const topDestinations = Array.from(destinationCounts.entries())
    .map(([name, data]) => ({ name, count: data.count, weightKg: data.weightKg }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const topRoutes = routes.map((r) => ({ name: r.route, count: r.shipmentCount })).slice(0, 5)

  // 9. Daily Breakdown
  const dailyBreakdown: DailyBreakdownItem[] = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      displayDate: formatDisplayPeriodDate(date),
      shipments: data.shipments,
      containers: data.containers.size,
      grossWeightKg: data.weightKg,
      bolsCount: data.shipments,
      packagesCount: data.packages,
      weightKg: data.weightKg,
      containersCount: data.containers.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // 10. Completed vs Active
  const completedShipments = shipments.filter((s) => s.operationalStatus === "DELIVERED")
  const activeShipments = shipments.filter((s) => s.operationalStatus !== "DELIVERED")

  // 11. Document Checklist
  const documentStatusSummary: DocumentStatusItem[] = shipments.map((s) => ({
    bolNumber: s.bolNumber,
    shipperName: s.shipperName,
    consigneeName: s.consigneeName,
    hasBol: s.documentsStatus.bol === "Complete",
    hasCommercialInvoice: s.documentsStatus.invoice === "Complete",
    hasPackingList: s.documentsStatus.packingList === "Complete",
    hasTransitPaper: s.documentsStatus.transitPaper === "Complete",
    hasPhyto: s.documentsStatus.phytosanitary === "Complete",
    missingCount: Object.values(s.documentsStatus).filter((v) => v === "Missing").length,
    isComplete: Object.values(s.documentsStatus).every((v) => v !== "Missing"),
  }))

  // 12. Summary
  const goodsValueByCurrency = Object.entries(revenueCurrencyMap).map(([currency, amount]) => ({
    currency,
    amount,
  }))

  const summary: OperationsReportSummary = {
    totalBols: shipments.length,
    totalShipments: shipments.length,
    activeShipments: activeShipments.length,
    deliveredShipments: completedShipments.length,
    totalContainers: uniqueContainers.size > 0 ? uniqueContainers.size : containers.length,
    dryContainers: dryContainersCount,
    reeferContainers: reeferContainersCount,
    totalTrucks: trucks.length,
    totalPackages: totalPkgs,
    totalNetWeightKg,
    totalGrossWeightKg,
    needsAttentionCount: needsAttention.length,
    statusCategories,
    goodsValueByCurrency,
    totalRevenueByCurrency: revenueCurrencyMap,
    totalDriverRentByCurrency: driverRentCurrencyMap,
    newBolsCount: shipments.length,
    updatedBolsCount: shipments.filter((s) => s.updatedDate).length,
    bolsWithPdf,
    bolsWithoutPdf: shipments.length - bolsWithPdf,
    exportShipments,
    importShipments,
  }

  // 13. Metadata
  const reportTitle = generateOperationsReportTitle(period)
  const metadata: OperationsReportMetadata = {
    reportId: `REP-OPS-${Date.now()}`,
    reportTitle,
    title: reportTitle,
    generatedAt,
    generatedBy,
    businessTimezone: timezone,
    dateRangeLabel: period.label,
    periodType: period.type,
    notes,
    operationsNotes: notes,
    period,
    appliedFilters: filters,
  }

  return {
    metadata,
    period,
    summary,
    shipments,
    statusCategories,
    routes,
    routeActivity: routes,
    containers,
    containerActivity: containers,
    trucks,
    truckActivity: trucks,
    borders,
    borderActivity: borders,
    ports,
    portActivity: ports,
    documentStatusSummary,
    vessels,
    departures,
    arrivals,
    needsAttention,
    topShippers,
    topConsignees,
    topCommodities,
    topDestinations,
    topRoutes,
    completedShipments,
    openShipments: activeShipments,
    dailyBreakdown,
  }
}

function extractCommodity(desc: string): string {
  const clean = desc.replace(/[0-9]+(?:\s*-\s*)?(?:ctns|bags|pkgs|kgs|kg|boxes|cartons)/gi, "").trim()
  const firstLine = clean.split("\n")[0].trim()
  return firstLine || "General Cargo"
}

function isAgriCommodity(c: string): boolean {
  const lower = c.toLowerCase()
  return lower.includes("raisin") ||
    lower.includes("fig") ||
    lower.includes("pomegranate") ||
    lower.includes("almond") ||
    lower.includes("fruit") ||
    lower.includes("seed") ||
    lower.includes("herbal")
}

function formatReadableStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Validates accounting and operational invariance on the final report model.
 */
export function validateOperationsReportTotals(report: OperationsReportModel): { valid: boolean; isValid: boolean; errors: string[] } {
  const errors: string[] = []

  const sumPkgs = report.shipments.reduce((acc, s) => acc + s.packages, 0)
  if (sumPkgs !== report.summary.totalPackages) {
    errors.push(`Package count mismatch: summary says ${report.summary.totalPackages}, rows sum to ${sumPkgs}`)
  }

  const sumGross = report.shipments.reduce((acc, s) => acc + s.grossWeightKg, 0)
  if (Math.abs(sumGross - report.summary.totalGrossWeightKg) > 0.01) {
    errors.push(`Gross weight mismatch: summary says ${report.summary.totalGrossWeightKg}, rows sum to ${sumGross}`)
  }

  const sumNet = report.shipments.reduce((acc, s) => acc + s.netWeightKg, 0)
  if (Math.abs(sumNet - report.summary.totalNetWeightKg) > 0.01) {
    errors.push(`Net weight mismatch: summary says ${report.summary.totalNetWeightKg}, rows sum to ${sumNet}`)
  }

  if (report.shipments.length !== report.summary.totalShipments) {
    errors.push(`Shipment count mismatch: summary says ${report.summary.totalShipments}, rows count ${report.shipments.length}`)
  }

  const isValid = errors.length === 0
  return {
    valid: isValid,
    isValid,
    errors,
  }
}

// ==================================================
// SNAPSHOT STORAGE (Isolated from operational BOL records)
// ==================================================

export function getOperationsReportSnapshots(): OperationsSnapshotMetadata[] {
  if (typeof localStorage === "undefined") return []
  try {
    const raw = localStorage.getItem(SNAPSHOTS_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveOperationsReportSnapshot(report: OperationsReportModel): OperationsSnapshotMetadata {
  const metadata: OperationsSnapshotMetadata = {
    id: report.metadata.reportId,
    title: report.metadata.title || report.metadata.reportTitle,
    periodType: report.period.type,
    periodLabel: report.period.label,
    dateRangeLabel: report.period.label,
    savedAt: new Date().toISOString(),
    generatedAt: report.metadata.generatedAt,
    generatedBy: report.metadata.generatedBy,
    shipmentCount: report.summary.totalShipments,
    recordCount: report.summary.totalShipments,
    totalGrossWeightKg: report.summary.totalGrossWeightKg,
    totalWeightKg: report.summary.totalNetWeightKg,
    totalPackages: report.summary.totalPackages,
    snapshotData: report,
  }

  if (typeof localStorage !== "undefined") {
    try {
      const existing = getOperationsReportSnapshots()
      const updated = [metadata, ...existing.filter((s) => s.id !== metadata.id)].slice(0, 50)
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.error("Failed to save report snapshot", e)
    }
  }

  return metadata
}

export function deleteOperationsReportSnapshot(id: string): void {
  if (typeof localStorage === "undefined") return
  try {
    const existing = getOperationsReportSnapshots()
    const filtered = existing.filter((s) => s.id !== id)
    localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(filtered))
  } catch (e) {
    console.error("Failed to delete snapshot", e)
  }
}
