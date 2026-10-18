/**
 * Central Global Smart Search Service
 * Sky Ariana Multi-Modal Logistics & Financial Suite
 */

import type {
  SearchResultItem,
  GlobalSearchResponse,
  SearchOptions,
  GroupedSearchResults,
  DuplicateCheckResult,
} from "./search-types"
import {
  normalizeSearchQuery,
  normalizePersianPashto,
  normalizePhone,
  matchPhones,
  normalizeIdentifier,
  isContainerNumber,
  isBolNumber,
  isInvoiceNumber,
  isDocumentNumber,
  isPhoneNumber,
  normalizeCompanyName,
  stringSimilarity,
} from "./search-normalizer"
import { evaluateFieldMatch, sortSearchResults } from "./search-ranking"
import { buildSearchSecurityContext, filterResultsByPermission } from "./search-permissions"
import {
  resolveContainerConnectedRecords,
  resolveBolConnectedRecords,
  resolveCompanyConnectedRecords,
  type SearchDatasets,
} from "./connected-record-builder"

// Storage Services
import { getAllLocalBOLs } from "@/lib/services/local-storage-service"
import { getAllShipments } from "@/lib/services/shipment-service"
import { getAllInvoices } from "@/lib/services/invoice-storage-service"
import { getAccountLedgerDatabase } from "@/lib/services/account-ledger-storage-service"
import { getAllFinancePayments as getAllPayments, getAllSuppliers } from "@/lib/services/finance-storage-service"
import { getAllShipmentDocuments } from "@/lib/services/shipment-document-storage"
import type { User, ExtendedUser } from "@/lib/rbac/rbac-types"

/**
 * Loads all system datasets safely in parallel for global search
 */
async function loadSearchDatasets(): Promise<SearchDatasets> {
  const [bols, shipments, invoices, ledgerDb, payments, documents, suppliers] = await Promise.all([
    getAllLocalBOLs().catch(() => []),
    getAllShipments().catch(() => []),
    getAllInvoices().catch(() => []),
    getAccountLedgerDatabase().catch(() => ({ accounts: [], ledgerEntries: {}, ledgerProfiles: {}, receipts: {} })),
    getAllPayments().catch(() => []),
    getAllShipmentDocuments().catch(() => []),
    getAllSuppliers().catch(() => []),
  ])

  return {
    bols: Array.isArray(bols) ? bols : [],
    shipments: Array.isArray(shipments) ? shipments : [],
    invoices: Array.isArray(invoices) ? invoices : [],
    ledgerDb: ledgerDb && typeof ledgerDb === "object" ? ledgerDb : { accounts: [], ledgerEntries: {} },
    payments: Array.isArray(payments) ? payments : [],
    documents: Array.isArray(documents) ? documents : [],
    suppliers: Array.isArray(suppliers) ? suppliers : [],
  }
}

/**
 * Executes a full Global Smart Search across all 18 record types with connected graphs
 */
export async function globalSearch(
  rawQuery: string,
  user?: ExtendedUser | User | null,
  options?: SearchOptions
): Promise<GlobalSearchResponse> {
  const data = await loadSearchDatasets()
  return executeGlobalSearch(rawQuery, data, user, options)
}

/**
 * Synchronously executes a search over loaded datasets with connected graphs
 */
export function executeGlobalSearch(
  rawQuery: string,
  data: SearchDatasets,
  user?: ExtendedUser | User | null,
  options?: SearchOptions
): GlobalSearchResponse {
  const startTime = Date.now()
  const q = normalizeSearchQuery(normalizePersianPashto(rawQuery))

  const securityContext = buildSearchSecurityContext(user)
  if (options?.strictClientIsolation && options.authorizedClientId) {
    securityContext.isClient = true
    securityContext.authorizedClientId = options.authorizedClientId
    securityContext.authorizedCompanyName = options.authorizedCompanyName
  }

  // Handle empty query: return top quick actions / navigation commands
  if (!q || q.length < 2) {
    const defaultCommands = getQuickActionCommands(q, securityContext)
    return {
      query: rawQuery,
      results: defaultCommands,
      topMatch: defaultCommands[0],
      grouped: buildGroupedResults(defaultCommands),
      categoryCounts: { commands: defaultCommands.length },
      executionTimeMs: Date.now() - startTime,
    }
  }

  const rawResults: SearchResultItem[] = []
  const seenIds = new Set<string>()

  const addResult = (item: SearchResultItem) => {
    const key = `${item.type}:${item.id}`
    if (!seenIds.has(key)) {
      seenIds.add(key)
      rawResults.push(item)
    }
  }

  // -----------------------------------------------------------------
  // 1. Search CONTAINERS
  // -----------------------------------------------------------------
  const containerMatches = new Map<string, { containerNumber: string; type?: string; status?: string; location?: string }>()
  for (const s of data.shipments) {
    if (s.containers && Array.isArray(s.containers)) {
      for (const c of s.containers) {
        if (c.containerNumber) {
          containerMatches.set(c.containerNumber.toUpperCase(), {
            containerNumber: c.containerNumber.toUpperCase(),
            type: c.containerType,
            status: s.status,
            location: s.currentLocation,
          })
        }
      }
    }
  }
  for (const b of data.bols) {
    if (b.container_numbers) {
      const parts = String(b.container_numbers).split(/[\s,;\/]+/)
      for (const p of parts) {
        if (p.trim().length >= 8) {
          const cNum = p.trim().toUpperCase()
          if (!containerMatches.has(cNum)) {
            containerMatches.set(cNum, { containerNumber: cNum })
          }
        }
      }
    }
  }

  for (const [cNum, cData] of containerMatches.entries()) {
    const rank = evaluateFieldMatch(q, cNum, "Container", true)
    if (rank) {
      const connected = resolveContainerConnectedRecords(cNum, data)
      addResult({
        id: cNum,
        type: "container",
        title: `Container ${cNum}`,
        subtitle: `${connected.shipperName || "Shipper"} → ${connected.consigneeName || "Consignee"} | Loc: ${connected.currentLocation || "In Transit"}`,
        badgeText: cData.type || "40'RF",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
        matchedField: rank.matchedField,
        matchType: rank.matchType,
        score: rank.score + 50, // Containers given priority boost
        targetView: "booking-containers",
        targetId: cNum,
        metadata: { ...cData, connected },
        connectedSummary: connected,
        quickActions: [
          { id: "open_container", label: "Open Container", icon: "Box", actionType: "navigate", payload: { view: "booking-containers", id: cNum }, primary: true },
          { id: "open_bol", label: "Open BOL", icon: "FileText", actionType: "navigate", payload: { view: "bol", id: connected.bolNumber } },
          { id: "view_tracking", label: "View Tracking", icon: "Activity", actionType: "navigate", payload: { view: "shipments", id: connected.bolNumber } },
          { id: "copy_container", label: "Copy Container #", icon: "Copy", actionType: "copy", payload: cNum },
        ],
      })
    }
  }

  // -----------------------------------------------------------------
  // 2. Search BOLS
  // -----------------------------------------------------------------
  for (const b of data.bols) {
    const bolNum = (b.bol_number || b.id || "").trim()
    const shipper = b.shipper_name || ""
    const consignee = b.consignee_name || ""
    const commodity = b.cargo_description || ""
    const truck = b.truck_number || ""
    const driver = b.driver_name || ""

    const rankBol = evaluateFieldMatch(q, bolNum, "BOL Number", true)
    const rankShipper = evaluateFieldMatch(q, shipper, "Shipper")
    const rankConsignee = evaluateFieldMatch(q, consignee, "Consignee")
    const rankCommodity = evaluateFieldMatch(q, commodity, "Commodity")
    const rankTruck = evaluateFieldMatch(q, truck, "Truck Number", true)
    const rankDriver = evaluateFieldMatch(q, driver, "Driver Name")
    let rankPhone: any = null
    if (b.driver_phone && isPhoneNumber(q) && matchPhones(q, b.driver_phone)) {
      rankPhone = { matchType: "exact_id", score: 950, matchedField: `Driver Phone: ${b.driver_phone}` }
    }

    if (rankTruck && truck) {
      addResult({
        id: `truck-${truck}`,
        type: "truck",
        title: `Truck ${truck}`,
        subtitle: `Driver: ${driver || "N/A"} | Active BOL: ${bolNum}`,
        badgeText: b.status || "Active",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
        matchedField: rankTruck.matchedField,
        matchType: rankTruck.matchType,
        score: rankTruck.score + 20,
        targetView: "bol",
        targetId: bolNum,
        metadata: { truckPlate: truck, driverName: driver, driverPhone: b.driver_phone, bol: b },
        quickActions: [
          { id: "open_bol", label: "Open BOL", icon: "FileText", actionType: "navigate", payload: { view: "bol", id: bolNum }, primary: true },
          { id: "copy_truck", label: "Copy Truck #", icon: "Copy", actionType: "copy", payload: truck },
        ],
      })
    }

    if ((rankDriver || rankPhone) && (driver || b.driver_phone)) {
      const bestDriverRank = rankPhone || rankDriver
      addResult({
        id: `driver-${driver || b.driver_phone}`,
        type: "driver",
        title: `Driver: ${driver || "Transit Driver"} (${b.driver_phone || "No phone"})`,
        subtitle: `Truck: ${truck || "N/A"} | Active BOL: ${bolNum}`,
        badgeText: "Driver",
        badgeColor: "bg-orange-100 text-orange-800 border-orange-300",
        matchedField: bestDriverRank.matchedField,
        matchType: bestDriverRank.matchType,
        score: bestDriverRank.score + 15,
        targetView: "bol",
        targetId: bolNum,
        metadata: { driverName: driver, driverPhone: b.driver_phone, truckPlate: truck, bol: b },
        quickActions: [
          { id: "open_bol", label: "Open BOL", icon: "FileText", actionType: "navigate", payload: { view: "bol", id: bolNum }, primary: true },
          { id: "copy_phone", label: "Copy Phone", icon: "Copy", actionType: "copy", payload: b.driver_phone || "" },
        ],
      })
    }

    const bestRank = [rankBol, rankShipper, rankConsignee, rankCommodity, rankTruck, rankDriver, rankPhone]
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.score - a.score)[0]

    if (bestRank) {
      const connected = resolveBolConnectedRecords(bolNum, data)
      addResult({
        id: bolNum,
        type: "bol",
        title: `BOL ${bolNum}`,
        subtitle: `${shipper || "Unknown"} → ${consignee || "Unknown"} | Pkgs: ${b.number_of_packages || "N/A"}`,
        badgeText: b.status || "DRAFT",
        badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
        matchedField: bestRank.matchedField,
        matchType: bestRank.matchType,
        score: bestRank.score + (rankBol ? 40 : 0),
        targetView: "bol",
        targetId: bolNum,
        metadata: { ...b, connected },
        connectedSummary: connected,
        quickActions: [
          { id: "open_bol", label: "Open BOL", icon: "FileText", actionType: "navigate", payload: { view: "bol", id: bolNum }, primary: true },
          { id: "view_tracking", label: "Tracking", icon: "Activity", actionType: "navigate", payload: { view: "shipments", id: bolNum } },
          { id: "view_docs", label: "Documents", icon: "Files", actionType: "navigate", payload: { view: "document-compliance", id: bolNum } },
          { id: "copy_bol", label: "Copy BOL #", icon: "Copy", actionType: "copy", payload: bolNum },
        ],
      })
    }
  }

  // -----------------------------------------------------------------
  // 3. Search SHIPMENTS, TRUCKS, DRIVERS, VESSELS, VOYAGES & ROUTES
  // -----------------------------------------------------------------
  for (const s of data.shipments) {
    const sId = s.id || s.referenceNumber
    const driverName = s.truck?.driverName || ""
    const driverPhone = s.truck?.driverPhone || ""
    const truckPlate = s.truck?.afghanPlate || s.truck?.iranianPlate || ""
    const vesselName = s.vessel?.vesselName || ""
    const voyageNum = s.vessel?.voyageNumber || ""
    const origin = s.route?.origin || ""
    const destination = s.route?.finalDestination || ""
    const currentLocation = s.currentLocation || ""
    const commodity = s.cargo?.commodity || ""

    // Driver & Truck Matches
    const rankDriver = evaluateFieldMatch(q, driverName, "Driver Name")
    const rankTruck = evaluateFieldMatch(q, truckPlate, "Truck Plate", true)
    let rankPhone: any = null
    if (driverPhone && isPhoneNumber(q)) {
      if (matchPhones(q, driverPhone)) {
        rankPhone = { matchType: "exact_id", score: 950, matchedField: `Driver Phone: ${driverPhone}` }
      }
    }

    if (rankTruck) {
      addResult({
        id: `truck-${truckPlate}`,
        type: "truck",
        title: `Truck ${truckPlate}`,
        subtitle: `Driver: ${driverName || "N/A"} | Active BOL: ${s.referenceNumber || s.id} | At: ${currentLocation}`,
        badgeText: s.status,
        badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
        matchedField: rankTruck.matchedField,
        matchType: rankTruck.matchType,
        score: rankTruck.score + 20,
        targetView: "shipments",
        targetId: s.id,
        metadata: { truckPlate, driverName, driverPhone, shipment: s },
        quickActions: [
          { id: "open_shipment", label: "View Shipment", icon: "Truck", actionType: "navigate", payload: { view: "shipments", id: s.id }, primary: true },
          { id: "copy_truck", label: "Copy Truck #", icon: "Copy", actionType: "copy", payload: truckPlate },
        ],
      })
    }

    if (rankDriver || rankPhone) {
      const bestDriverRank = rankPhone || rankDriver
      addResult({
        id: `driver-${driverName || driverPhone}`,
        type: "driver",
        title: `Driver: ${driverName || "Driver"}`,
        subtitle: `Phone: ${driverPhone || "N/A"} | Truck: ${truckPlate || "N/A"} | BOL: ${s.referenceNumber || s.id}`,
        badgeText: "Driver",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
        matchedField: bestDriverRank.matchedField,
        matchType: bestDriverRank.matchType,
        score: bestDriverRank.score + 15,
        targetView: "shipments",
        targetId: s.id,
        metadata: { driverName, driverPhone, truckPlate, shipment: s },
        quickActions: [
          { id: "open_shipment", label: "View Shipment", icon: "User", actionType: "navigate", payload: { view: "shipments", id: s.id }, primary: true },
          { id: "copy_phone", label: "Copy Phone", icon: "Copy", actionType: "copy", payload: driverPhone },
        ],
      })
    }

    // Vessel & Voyage Matches
    const rankVessel = evaluateFieldMatch(q, vesselName, "Vessel Name")
    const rankVoyage = evaluateFieldMatch(q, voyageNum, "Voyage", true)
    const bestVesselRank = rankVessel || rankVoyage
    if (bestVesselRank) {
      addResult({
        id: `vessel-${vesselName}-${voyageNum}`,
        type: "vessel",
        title: `Vessel: ${vesselName || "Ocean Vessel"} (Voyage ${voyageNum || "N/A"})`,
        subtitle: `Port: ${s.route?.portOfLoading || "POL"} → ${s.route?.portOfDischarge || "POD"} | Line: ${s.vessel?.shippingLine || "Carrier"}`,
        badgeText: "Ocean Vessel",
        badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-300",
        matchedField: bestVesselRank.matchedField,
        matchType: bestVesselRank.matchType,
        score: bestVesselRank.score + 10,
        targetView: "shipments",
        targetId: s.id,
        metadata: { vessel: s.vessel, shipment: s },
        quickActions: [
          { id: "open_shipment", label: "View Voyage Leg", icon: "Ship", actionType: "navigate", payload: { view: "shipments", id: s.id }, primary: true },
        ],
      })
    }

    // Route & Ports Matches
    const rankOrigin = evaluateFieldMatch(q, origin, "Origin")
    const rankDest = evaluateFieldMatch(q, destination, "Destination")
    const rankLoc = evaluateFieldMatch(q, currentLocation, "Current Location")
    const bestRouteRank = [rankOrigin, rankDest, rankLoc].filter(Boolean).sort((a: any, b: any) => b.score - a.score)[0]

    if (bestRouteRank) {
      addResult({
        id: `route-${sId}`,
        type: "route",
        title: `Route: ${origin} → ${destination}`,
        subtitle: `BOL: ${s.referenceNumber || s.id} | Current Location: ${currentLocation}`,
        badgeText: s.status,
        badgeColor: "bg-teal-100 text-teal-800 border-teal-300",
        matchedField: bestRouteRank.matchedField,
        matchType: bestRouteRank.matchType,
        score: bestRouteRank.score,
        targetView: "shipments",
        targetId: s.id,
        metadata: { route: s.route, shipment: s },
        quickActions: [
          { id: "open_tracking", label: "Open Tracking", icon: "Compass", actionType: "navigate", payload: { view: "shipments", id: s.id }, primary: true },
        ],
      })
    }
  }

  // -----------------------------------------------------------------
  // 4. Search COMPANIES & ACCOUNTS
  // -----------------------------------------------------------------
  const companyNames = new Set<string>()
  for (const b of data.bols) {
    if (b.shipper_name) companyNames.add(b.shipper_name)
    if (b.consignee_name) companyNames.add(b.consignee_name)
  }
  if (data.ledgerDb?.accounts) {
    for (const a of data.ledgerDb.accounts) {
      if (typeof a === "string") companyNames.add(a)
      else if (a?.name) companyNames.add(a.name)
    }
  }

  for (const compName of companyNames) {
    const rank = evaluateFieldMatch(q, compName, "Company Name")
    if (rank) {
      const connected = resolveCompanyConnectedRecords(compName, data)
      addResult({
        id: `comp-${compName}`,
        type: "company",
        title: compName,
        subtitle: `${connected.bolCount || 0} BOLs | ${connected.invoiceCount || 0} Invoices | Net Ledger: $${(connected.ledgerBalance || 0).toLocaleString()}`,
        badgeText: "Company / Client",
        badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
        matchedField: rank.matchedField,
        matchType: rank.matchType,
        score: rank.score + 25,
        targetView: "accounting",
        targetId: compName,
        metadata: { name: compName, connected },
        connectedSummary: connected,
        quickActions: [
          { id: "view_ledger", label: "View Ledger", icon: "BookOpen", actionType: "navigate", payload: { view: "accounting", account: compName }, primary: true },
          { id: "record_payment", label: "Record Payment", icon: "Receipt", actionType: "modal", payload: { type: "payment", customer: compName } },
          { id: "copy_company", label: "Copy Name", icon: "Copy", actionType: "copy", payload: compName },
        ],
      })
    }
  }

  // -----------------------------------------------------------------
  // 5. Search INVOICES
  // -----------------------------------------------------------------
  for (const inv of data.invoices) {
    const invNum = inv.invoice_number || inv.invoiceNumber || inv.id || ""
    const client = inv.buyer_name || inv.client_name || inv.recipientName || ""
    const bol = inv.bol_number || inv.bolNumber || inv.bl_no || ""

    const rankInv = evaluateFieldMatch(q, invNum, "Invoice Number", true)
    const rankClient = evaluateFieldMatch(q, client, "Client")
    const rankBol = evaluateFieldMatch(q, bol, "BOL")
    const bestRank = [rankInv, rankClient, rankBol].filter(Boolean).sort((a: any, b: any) => b.score - a.score)[0]

    if (bestRank) {
      const total = Number(inv.total_amount ?? inv.totalAmount ?? 0)
      const paid = Number(inv.paid_amount ?? inv.paidAmount ?? 0)
      const outstanding = Number(inv.outstanding_amount ?? inv.outstandingAmount ?? (total - paid))

      addResult({
        id: invNum || inv.id,
        type: "invoice",
        title: `Invoice ${invNum}`,
        subtitle: `Client: ${client || "Unknown"} | Total: ${inv.currency || "$"}${total.toLocaleString()} | Due: ${inv.due_date || "Immediate"}`,
        badgeText: inv.status || (outstanding <= 0 ? "PAID" : "UNPAID"),
        badgeColor: outstanding <= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800",
        matchedField: bestRank.matchedField,
        matchType: bestRank.matchType,
        score: bestRank.score + (rankInv ? 30 : 0),
        targetView: "invoice",
        targetId: invNum,
        metadata: inv,
        quickActions: [
          { id: "open_invoice", label: "Open Invoice", icon: "Receipt", actionType: "navigate", payload: { view: "invoice", id: invNum }, primary: true },
          { id: "record_payment", label: "Record Payment", icon: "DollarSign", actionType: "modal", payload: { type: "payment", invoice: invNum, customer: client } },
          { id: "copy_invoice", label: "Copy Invoice #", icon: "Copy", actionType: "copy", payload: invNum },
        ],
      })
    }
  }

  // -----------------------------------------------------------------
  // 6. Search PAYMENTS & RECEIPTS
  // -----------------------------------------------------------------
  for (const pay of data.payments) {
    const pRef = pay.paymentNumber || pay.reference || ""
    const bRef = pay.bankReference || ""
    const rNum = pay.receiptNumber || ""
    const customer = pay.customerName || ""

    const rankRef = evaluateFieldMatch(q, pRef, "Payment Ref", true)
    const rankBank = evaluateFieldMatch(q, bRef, "Bank Ref", true)
    const rankReceipt = evaluateFieldMatch(q, rNum, "Receipt #", true)
    const rankCust = evaluateFieldMatch(q, customer, "Customer")

    const bestRank = [rankRef, rankBank, rankReceipt, rankCust].filter(Boolean).sort((a: any, b: any) => b.score - a.score)[0]
    if (bestRank) {
      addResult({
        id: pay.id || pRef,
        type: "payment",
        title: `Payment ${pRef || rNum || "Receipt"}`,
        subtitle: `Customer: ${customer} | Amount: $${(Number(pay.amount) || 0).toLocaleString()} (${pay.paymentDate || "N/A"})`,
        badgeText: pay.status || "CONFIRMED",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
        matchedField: bestRank.matchedField,
        matchType: bestRank.matchType,
        score: bestRank.score + 10,
        targetView: "accounting",
        targetId: pay.id,
        metadata: pay,
        quickActions: [
          { id: "view_payment", label: "View Receipt", icon: "Receipt", actionType: "modal", payload: { type: "receipt", id: pay.id }, primary: true },
        ],
      })
    }
  }

  // -----------------------------------------------------------------
  // 7. Search DOCUMENTS
  // -----------------------------------------------------------------
  for (const doc of data.documents) {
    const dNum = doc.documentNumber || ""
    const dBol = doc.bolNumber || ""
    const dType = doc.documentType || ""

    const rankNum = evaluateFieldMatch(q, dNum, "Document Number", true)
    const rankBol = evaluateFieldMatch(q, dBol, "BOL Reference")
    const bestRank = [rankNum, rankBol].filter(Boolean).sort((a: any, b: any) => b.score - a.score)[0]

    if (bestRank) {
      addResult({
        id: doc.id,
        type: "document",
        title: `${dType.replace(/_/g, " ").toUpperCase()}: ${dNum}`,
        subtitle: `BOL: ${dBol} | Status: ${doc.status || "FINAL"}`,
        badgeText: doc.status || "READY",
        badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
        matchedField: bestRank.matchedField,
        matchType: bestRank.matchType,
        score: bestRank.score,
        targetView: "document-compliance",
        targetId: doc.id,
        metadata: doc,
        quickActions: [
          { id: "open_doc", label: "Open Document", icon: "FileText", actionType: "navigate", payload: { view: "document-compliance", id: doc.id }, primary: true },
          { id: "copy_doc", label: "Copy Doc #", icon: "Copy", actionType: "copy", payload: dNum },
        ],
      })
    }
  }

  // -----------------------------------------------------------------
  // 8. Natural Language Filter Commands
  // -----------------------------------------------------------------
  const commandResults = getNaturalCommandResults(q)
  for (const cmd of commandResults) {
    addResult(cmd)
  }

  // -----------------------------------------------------------------
  // 9. Permission Filtering & Tenant Isolation
  // -----------------------------------------------------------------
  const filteredResults = filterResultsByPermission(rawResults, securityContext)

  // -----------------------------------------------------------------
  // 10. Ranking & Grouping
  // -----------------------------------------------------------------
  const sorted = sortSearchResults(filteredResults)
  const grouped = buildGroupedResults(sorted)

  const categoryCounts: Record<string, number> = {
    all: sorted.length,
    bols: grouped.bols.length,
    containers: grouped.containers.length,
    companies: grouped.companies.length,
    invoices: grouped.invoices.length,
    ledgers: grouped.ledgers.length,
    payments: grouped.payments.length,
    documents: grouped.documents.length,
    tracking: grouped.tracking.length,
    trucks: grouped.trucks.length,
    drivers: grouped.drivers.length,
    vessels: grouped.vessels.length,
    suppliers: grouped.suppliers.length,
    commands: grouped.commands.length,
  }

  return {
    query: rawQuery,
    results: sorted,
    topMatch: sorted[0],
    grouped,
    categoryCounts,
    executionTimeMs: Date.now() - startTime,
  }
}

/**
 * Organizes a flat list of results into structured category groups
 */
function buildGroupedResults(results: SearchResultItem[]): GroupedSearchResults {
  return {
    all: results,
    topMatch: results[0],
    bols: results.filter((r) => r.type === "bol"),
    containers: results.filter((r) => r.type === "container"),
    companies: results.filter((r) => r.type === "company"),
    invoices: results.filter((r) => r.type === "invoice"),
    ledgers: results.filter((r) => r.type === "ledger"),
    payments: results.filter((r) => r.type === "payment"),
    documents: results.filter((r) => r.type === "document"),
    tracking: results.filter((r) => r.type === "tracking" || r.type === "route"),
    trucks: results.filter((r) => r.type === "truck"),
    drivers: results.filter((r) => r.type === "driver"),
    vessels: results.filter((r) => r.type === "vessel" || r.type === "voyage"),
    suppliers: results.filter((r) => r.type === "supplier"),
    commands: results.filter((r) => r.type === "command"),
    totalMatches: results.length,
  }
}

/**
 * Returns natural language filter commands based on query keywords
 */
function getNaturalCommandResults(query: string): SearchResultItem[] {
  const results: SearchResultItem[] = []
  const q = query.toLowerCase()

  if (q.includes("border") || q.includes("dogharoon") || q.includes("islam qala")) {
    results.push({
      id: "cmd-filter-border",
      type: "command",
      title: "Filter Shipments at Border (Dogharoon / Islam Qala)",
      subtitle: "Open Control Tower filtered by 'at_border' transit status",
      badgeText: "Smart Action",
      badgeColor: "bg-blue-100 text-blue-800",
      matchedField: "Command: At Border",
      matchType: "natural_command",
      score: 400,
      targetView: "shipments",
      targetId: "filter:at_border",
      metadata: { filter: "at_border" },
      quickActions: [
        { id: "exec_cmd", label: "Open Filtered View", icon: "Filter", actionType: "navigate", payload: { view: "shipments", filter: "at_border" }, primary: true },
      ],
    })
  }

  if (q.includes("delay") || q.includes("late")) {
    results.push({
      id: "cmd-filter-delayed",
      type: "command",
      title: "View Delayed Shipments",
      subtitle: "Show all active shipments with alert flags or ETA overdue",
      badgeText: "Smart Action",
      badgeColor: "bg-rose-100 text-rose-800",
      matchedField: "Command: Delayed",
      matchType: "natural_command",
      score: 400,
      targetView: "shipments",
      targetId: "filter:delayed",
      metadata: { filter: "delayed" },
      quickActions: [
        { id: "exec_cmd", label: "Open Delayed Shipments", icon: "AlertTriangle", actionType: "navigate", payload: { view: "shipments", filter: "delayed" }, primary: true },
      ],
    })
  }

  if (q.includes("unpaid") || q.includes("outstanding") || q.includes("due invoice")) {
    results.push({
      id: "cmd-filter-unpaid",
      type: "command",
      title: "View Unpaid & Overdue Invoices",
      subtitle: "Open Accounting Finance filtered by pending customer balances",
      badgeText: "Smart Action",
      badgeColor: "bg-amber-100 text-amber-800",
      matchedField: "Command: Unpaid Invoices",
      matchType: "natural_command",
      score: 400,
      targetView: "accounting",
      targetId: "filter:unpaid",
      metadata: { filter: "unpaid" },
      quickActions: [
        { id: "exec_cmd", label: "Open Unpaid Invoices", icon: "Receipt", actionType: "navigate", payload: { view: "accounting", tab: "invoices", filter: "unpaid" }, primary: true },
      ],
    })
  }

  return results
}

/**
 * Returns default quick action commands when query is empty
 */
function getQuickActionCommands(query: string, security: any): SearchResultItem[] {
  return [
    {
      id: "action-new-bol",
      type: "command",
      title: "Create New Bill of Lading (BOL)",
      subtitle: "Start a fresh multi-modal shipment manifest with instant auto-save",
      badgeText: "Fast Action",
      badgeColor: "bg-blue-100 text-blue-800",
      matchedField: "Action",
      matchType: "natural_command",
      score: 100,
      targetView: "bol",
      targetId: "new",
      metadata: {},
      quickActions: [{ id: "act_new_bol", label: "Launch Form", icon: "Plus", actionType: "navigate", payload: { view: "bol", action: "new" }, primary: true }],
    },
    {
      id: "action-bulk-entry",
      type: "command",
      title: "Bulk BOL & Shipment Import",
      subtitle: "Paste or import dozens of container manifests from Excel / CSV",
      badgeText: "Fast Action",
      badgeColor: "bg-indigo-100 text-indigo-800",
      matchedField: "Action",
      matchType: "natural_command",
      score: 95,
      targetView: "bulk-entry",
      targetId: "bulk",
      metadata: {},
      quickActions: [{ id: "act_bulk", label: "Open Bulk Entry", icon: "Layers", actionType: "navigate", payload: { view: "bulk-entry" }, primary: true }],
    },
    {
      id: "action-record-payment",
      type: "command",
      title: "Record Customer Payment",
      subtitle: "Post a credit transaction to customer ledger with official receipt generation",
      badgeText: "Finance",
      badgeColor: "bg-emerald-100 text-emerald-800",
      matchedField: "Action",
      matchType: "natural_command",
      score: 90,
      targetView: "accounting",
      targetId: "payment",
      metadata: {},
      quickActions: [{ id: "act_pay", label: "Record Payment", icon: "DollarSign", actionType: "modal", payload: { type: "payment" }, primary: true }],
    },
    {
      id: "action-control-tower",
      type: "command",
      title: "Open Control Tower & Live Tracking",
      subtitle: "Real-time vessel, border crossing, and container transit dashboard",
      badgeText: "Operations",
      badgeColor: "bg-amber-100 text-amber-800",
      matchedField: "Action",
      matchType: "natural_command",
      score: 85,
      targetView: "shipments",
      targetId: "control-tower",
      metadata: {},
      quickActions: [{ id: "act_tower", label: "Open Control Tower", icon: "Activity", actionType: "navigate", payload: { view: "shipments" }, primary: true }],
    },
    {
      id: "action-daily-ops",
      type: "command",
      title: "Daily Operations Center",
      subtitle: "Today's priority tasks, follow-ups, and automated end-of-day report",
      badgeText: "Daily Tasks",
      badgeColor: "bg-rose-100 text-rose-800",
      matchedField: "Action",
      matchType: "natural_command",
      score: 80,
      targetView: "daily-operations",
      targetId: "daily-ops",
      metadata: {},
      quickActions: [{ id: "act_daily", label: "Open Daily Ops", icon: "CalendarCheck", actionType: "navigate", payload: { view: "daily-operations" }, primary: true }],
    },
  ]
}

/**
 * Pre-Save Duplicate Detection Helpers
 */
export async function checkCompanyDuplicate(name: string, customDatasets?: SearchDatasets): Promise<DuplicateCheckResult> {
  if (!name || name.trim().length < 2) return { isDuplicate: false, confidence: "NONE" }
  const data = customDatasets || (await loadSearchDatasets())
  const norm = normalizeCompanyName(name)

  const accounts = data.ledgerDb?.accounts || []
  for (const acc of accounts) {
    const accName = typeof acc === "string" ? acc : acc?.name
    if (!accName) continue
    const accNorm = normalizeCompanyName(accName)
    if (accNorm === norm) {
      return {
        isDuplicate: true,
        confidence: "EXACT",
        matchField: "Company Name",
        matchedEntityName: accName,
        reason: `An existing account '${accName}' matches exactly.`,
        suggestedAction: "LINK",
      }
    }
    const sim = stringSimilarity(name, accName)
    if (sim >= 0.82) {
      return {
        isDuplicate: true,
        confidence: "HIGH",
        matchField: "Company Name",
        matchedEntityName: accName,
        reason: `High similarity (${Math.round(sim * 100)}%) with existing account '${accName}'.`,
        suggestedAction: "LINK",
      }
    }
  }

  return { isDuplicate: false, confidence: "NONE", suggestedAction: "PROCEED" }
}

export async function checkBolDuplicate(bolNumber: string, containerNumber?: string, customDatasets?: SearchDatasets): Promise<DuplicateCheckResult> {
  if (!bolNumber || bolNumber.trim().length < 3) return { isDuplicate: false, confidence: "NONE" }
  const data = customDatasets || (await loadSearchDatasets())
  const bNorm = normalizeIdentifier(bolNumber)

  const existingBol = data.bols.find((b) => normalizeIdentifier(b.bol_number || b.id) === bNorm)
  if (existingBol) {
    return {
      isDuplicate: true,
      confidence: "EXACT",
      matchField: "BOL Number",
      matchedEntityId: existingBol.bol_number || existingBol.id,
      reason: `BOL '${bolNumber}' already exists in database.`,
      suggestedAction: "RENAME",
    }
  }

  if (containerNumber) {
    const cNorm = normalizeIdentifier(containerNumber)
    const existingContainer = data.bols.find((b) => {
      const cNums = String(b.container_numbers || "")
      return normalizeIdentifier(cNums).includes(cNorm)
    })
    if (existingContainer) {
      return {
        isDuplicate: true,
        confidence: "HIGH",
        matchField: "Container Number",
        matchedEntityId: existingContainer.bol_number,
        reason: `Container '${containerNumber}' is already registered on BOL '${existingContainer.bol_number}'.`,
        suggestedAction: "LINK",
      }
    }
  }

  return { isDuplicate: false, confidence: "NONE", suggestedAction: "PROCEED" }
}

export async function checkPaymentDuplicate(
  reference: string,
  amount: number,
  customerName?: string,
  customDatasets?: SearchDatasets
): Promise<DuplicateCheckResult> {
  if (!reference) return { isDuplicate: false, confidence: "NONE" }
  const data = customDatasets || (await loadSearchDatasets())
  const refNorm = normalizeIdentifier(reference)

  const existingPayment = data.payments.find((p) => {
    const pRef = normalizeIdentifier(p.paymentNumber || p.reference || p.bankReference || "")
    return pRef && pRef === refNorm
  })

  if (existingPayment) {
    return {
      isDuplicate: true,
      confidence: "EXACT",
      matchField: "Payment Reference",
      matchedEntityId: existingPayment.id,
      reason: `A payment with reference '${reference}' for $${existingPayment.amount} already exists.`,
      suggestedAction: "LINK",
    }
  }

  return { isDuplicate: false, confidence: "NONE", suggestedAction: "PROCEED" }
}
