import { getAllShipments } from "@/lib/services/shipment-service"
import * as localStorageService from "@/lib/services/local-storage-service"
import { getLedgerSystemDb } from "@/lib/services/ledger-db-service"
import { getAllShipmentDocuments } from "@/lib/services/shipment-document-storage"
import { BookingService, FreeDayEngine } from "@/lib/services/booking-service"
import { evaluateAttentionRules, getSnoozeState, applySnoozeFilter } from "./attention-engine"
import type {
  ControlTowerModel,
  LiveShipmentRow,
  PipelineStage,
  OperationalKpiSummary,
  FinancialKpiSummary,
  CurrencyBalanceItem,
  BorderStationSummary,
  PortOperationSummary,
  ContainerRiskSummary,
  DocumentComplianceRow,
  OperationsTimelineEvent,
  AttentionItem,
  ActiveRouteSummary,
  UpcomingCutOffItem,
  UpcomingArrivalItem,
  VesselActivityItem,
  OperationalReadiness,
  CustomerBalanceItem,
} from "./types"
import type { ShipmentMaster } from "@/lib/types/shipment"

function mapStatusToStage(status: string): PipelineStage {
  const s = (status || "").toLowerCase()
  if (s === "cargo_loaded" || s === "booking_confirmed" || s === "draft") return "preparing"
  if (s === "in_transit" || s === "transit_arrived") return "road_transit"
  if (s === "at_border" || s === "border_clearance") return "border_clearance"
  if (s === "at_port" || s === "container_loading" || s === "customs_cleared_port") return "port_operations"
  if (s === "on_vessel" || s === "vessel_departed" || s === "transshipment") return "on_vessel"
  if (s === "arrived_destination" || s === "discharged") return "arrived_destination"
  if (s === "delivered") return "delivered"
  if (s === "delayed") return "delayed"
  return "road_transit"
}

function getStatusBadgeLabel(status: string): string {
  switch (status) {
    case "cargo_loaded":
      return "Cargo Loaded"
    case "in_transit":
      return "Road Transit"
    case "at_border":
      return "At Border"
    case "at_port":
      return "At Port"
    case "container_loading":
      return "Container Loading"
    case "on_vessel":
      return "On Vessel"
    case "vessel_departed":
      return "Vessel Underway"
    case "transshipment":
      return "Transshipment"
    case "arrived_destination":
      return "Arrived Destination"
    case "delivered":
      return "Delivered"
    case "delayed":
      return "Delayed"
    default:
      return status ? status.replace(/_/g, " ").toUpperCase() : "Active"
  }
}

export async function aggregateControlTowerData(options?: {
  userRole?: string
  clientId?: string
  applyClientSnooze?: boolean
}): Promise<ControlTowerModel> {
  const role = (options?.userRole || "admin").toLowerCase()
  const isFinanceAuthorized = role === "admin" || role === "management" || role === "accounting"

  // 1. Fetch Shipments & BOLs
  const rawShipments = await getAllShipments()
  const rawBols = await localStorageService.getAllLocalBOLs()

  // 2. Fetch Document Records
  let allDocs: any[] = []
  try {
    allDocs = await getAllShipmentDocuments()
  } catch {
    allDocs = []
  }

  // 3. Fetch Accounting DB (if permitted)
  let ledgerDb: any = null
  if (isFinanceAuthorized) {
    try {
      ledgerDb = await getLedgerSystemDb()
    } catch {
      ledgerDb = null
    }
  }

  // 4. Fetch Containers & Free Days
  let containers: any[] = []
  try {
    containers = BookingService.getContainers()
  } catch {
    containers = []
  }

  // Group documents by BOL
  const docsByBol: Record<string, { [docType: string]: boolean }> = {}
  for (const doc of allDocs) {
    const bNum = (doc.bol_number || "").trim()
    if (!bNum) continue
    if (!docsByBol[bNum]) docsByBol[bNum] = {}
    docsByBol[bNum][doc.document_type] = true
  }

  // Build Container Risks
  const now = new Date()
  const containerRisks: ContainerRiskSummary[] = containers.map((c) => {
    const lastFree = FreeDayEngine.calculateLastFreeDay(c)
    let daysRemaining = 999
    let isOverdue = false
    let detentionCost = 0

    if (lastFree) {
      const diffTime = lastFree.getTime() - now.getTime()
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      if (daysRemaining < 0) {
        isOverdue = true
        detentionCost = FreeDayEngine.calculateDetentionExposure(c, now)
      }
    }

    return {
      containerNumber: c.containerNumber,
      bookingNumber: c.bookingNumber || "",
      shippingLine: c.shippingLine || "",
      shipmentId: c.shipmentId || "",
      bolNumber: c.bolNumber || "",
      dischargeDate: c.dischargeDate,
      lastFreeDay: lastFree ? lastFree.toISOString() : undefined,
      daysRemaining,
      isOverdue,
      estimatedDetentionUSD: detentionCost,
      status: c.status || "active",
    }
  })

  // Normalize Shipments into LiveShipmentRow
  const stageCounts: Record<PipelineStage, number> = {
    all: rawShipments.length,
    preparing: 0,
    road_transit: 0,
    border_clearance: 0,
    port_operations: 0,
    on_vessel: 0,
    arrived_destination: 0,
    delivered: 0,
    delayed: 0,
  }

  const borderStationMap: Record<string, { plates: string[]; drivers: string[]; count: number }> = {
    "Dogharoon / Islam Qala": { plates: [], drivers: [], count: 0 },
    "Hairatan": { plates: [], drivers: [], count: 0 },
    "Spin Boldak / Chaman": { plates: [], drivers: [], count: 0 },
    "Torghundi": { plates: [], drivers: [], count: 0 },
  }

  const portOpsMap: Record<string, { gateIn: number; loading: number; departing: number; total: number }> = {
    "Bandar Abbas": { gateIn: 0, loading: 0, departing: 0, total: 0 },
    "Karachi": { gateIn: 0, loading: 0, departing: 0, total: 0 },
    "Mersin": { gateIn: 0, loading: 0, departing: 0, total: 0 },
    "Chabahar": { gateIn: 0, loading: 0, departing: 0, total: 0 },
  }

  const missingDocShipments: { bolNumber: string; customer: string; missingList: string[] }[] = []
  const documentComplianceList: DocumentComplianceRow[] = []
  const timelineEvents: OperationsTimelineEvent[] = []

  const liveShipments: LiveShipmentRow[] = rawShipments.map((s) => {
    const stage = mapStatusToStage(s.status)
    stageCounts[stage] = (stageCounts[stage] || 0) + 1

    const bolNum = (s.referenceNumber || s.id || "").trim()
    const docMap = docsByBol[bolNum] || {}
    const hasBol = Boolean(docMap["bol"] || true) // BOL itself exists
    const hasCommercialInvoice = Boolean(docMap["commercial_invoice"])
    const hasPackingList = Boolean(docMap["packing_list"])
    const hasTransitPaper = Boolean(docMap["transit_paper"])
    const hasPhytoDraft = Boolean(docMap["phytosanitary_draft"])

    const docItems = [hasBol, hasCommercialInvoice, hasPackingList, hasTransitPaper, hasPhytoDraft]
    const completedDocsCount = docItems.filter(Boolean).length
    const completenessPercent = Math.round((completedDocsCount / 5) * 100)

    const missingList: string[] = []
    if (!hasCommercialInvoice) missingList.push("Commercial Invoice")
    if (!hasPackingList) missingList.push("Packing List")
    if (!hasTransitPaper) missingList.push("Transit Paper")
    if (!hasPhytoDraft) missingList.push("Phyto Certificate")

    const hasMissingDocs = missingList.length > 0 && stage !== "delivered"
    if (hasMissingDocs && stage !== "preparing") {
      missingDocShipments.push({
        bolNumber: bolNum,
        customer: s.shipper?.name || "Shipper",
        missingList,
      })
    }

    documentComplianceList.push({
      bolNumber: bolNum,
      shipmentId: s.id,
      customerName: s.shipper?.name || s.consignee?.name || "Client",
      hasBol,
      hasCommercialInvoice,
      hasPackingList,
      hasTransitPaper,
      hasPhytoDraft,
      completenessPercent,
      status: completenessPercent === 100 ? "complete" : completenessPercent >= 60 ? "action_required" : "draft",
    })

    // Track Border Station Stats
    const loc = (s.currentLocation || "").toLowerCase()
    const borderCross = (s.transport?.borderCrossing || "").toLowerCase()
    let assignedBorder: string | null = null

    if (loc.includes("dogharoon") || loc.includes("islam qala") || borderCross.includes("dogharoon") || borderCross.includes("islam")) {
      assignedBorder = "Dogharoon / Islam Qala"
    } else if (loc.includes("hairatan") || borderCross.includes("hairatan")) {
      assignedBorder = "Hairatan"
    } else if (loc.includes("spin boldak") || loc.includes("chaman") || borderCross.includes("spin")) {
      assignedBorder = "Spin Boldak / Chaman"
    } else if (loc.includes("torghundi") || borderCross.includes("torghundi")) {
      assignedBorder = "Torghundi"
    }

    if (assignedBorder && stage === "border_clearance") {
      borderStationMap[assignedBorder].count++
      if (s.truck?.afghanPlate) borderStationMap[assignedBorder].plates.push(s.truck.afghanPlate)
      if (s.truck?.driverName) borderStationMap[assignedBorder].drivers.push(s.truck.driverName)
    }

    // Track Port Stats
    const portName = s.transport?.portOfLoading || "Bandar Abbas"
    let matchedPort = "Bandar Abbas"
    if (portName.toLowerCase().includes("karachi")) matchedPort = "Karachi"
    else if (portName.toLowerCase().includes("mersin")) matchedPort = "Mersin"
    else if (portName.toLowerCase().includes("chabahar")) matchedPort = "Chabahar"

    if (portOpsMap[matchedPort]) {
      portOpsMap[matchedPort].total++
      if (stage === "port_operations") {
        if (s.status === "container_loading") portOpsMap[matchedPort].loading++
        else portOpsMap[matchedPort].gateIn++
      } else if (stage === "on_vessel") {
        portOpsMap[matchedPort].departing++
      }
    }

    // Extract Milestones into Timeline
    const milestones = s.milestones || []
    for (const m of milestones) {
      if (m.actualDate) {
        timelineEvents.push({
          id: `evt-${s.id}-${m.id}`,
          timestamp: m.actualDate,
          title: `${m.title || "Milestone"} (${m.location})`,
          description: `Shipment ${bolNum}: ${s.cargo?.commodity || "Cargo"} (${s.shipper?.name || "Shipper"})`,
          eventType: stage === "border_clearance" ? "border_arrival" : stage === "on_vessel" ? "vessel_sail" : "milestone",
          reference: bolNum,
          location: m.location,
        })
      }
    }

    // Days in current stage
    let daysInStage = 1
    const lastUpdate = s.updatedAt || s.createdAt
    if (lastUpdate) {
      const diffMs = now.getTime() - new Date(lastUpdate).getTime()
      daysInStage = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    }

    return {
      id: s.id,
      referenceNumber: s.referenceNumber,
      bolNumber: bolNum,
      stage,
      status: s.status,
      statusLabel: getStatusBadgeLabel(s.status),
      origin: s.transport?.origin || "Kandahar",
      destination: s.transport?.finalDestination || s.transport?.portOfDischarge || "Destination",
      currentLocation: s.currentLocation || "En Route",
      lastCheckpointTime: s.updatedAt,
      shipperName: s.shipper?.name || "",
      consigneeName: s.consignee?.name || "",
      containerNumber: s.container?.containerNumber || "",
      sealNumber: s.container?.sealNumber || "",
      truckPlate: s.truck?.afghanPlate || "",
      driverName: s.truck?.driverName || "",
      driverPhone: s.truck?.driverPhone || "",
      vesselName: s.vessel?.vesselName || "",
      voyageNumber: s.vessel?.voyageNumber || "",
      bookingNumber: s.vessel?.bookingNumber || "",
      shippingLine: s.vessel?.shippingLine || "",
      packagesCount: s.cargo?.cartons || 0,
      grossWeightKg: s.cargo?.grossWeightKg || 0,
      commodity: s.cargo?.commodity || "Dry Fruit / Cargo",
      etaDischarge: s.milestones?.find((m) => m.status === "arrived_destination")?.estimatedDate,
      portCutOff: (s as any).customs?.exitCustomsDate || s.vessel?.etd,
      daysInCurrentStage: daysInStage,
      hasMissingDocs,
      missingDocsList: missingList,
      attentionItems: [],
      freightAmountUSD: isFinanceAuthorized ? (s.finance?.freightAmount || 0) : 0,
      customerOutstandingUSD: isFinanceAuthorized ? (s.finance?.customerOutstanding || 0) : 0,
    }
  })

  // Overdue Invoices from Ledger System (if authorized)
  const overdueInvoicesList: { invoiceNo: string; customerName: string; overdueDays: number; amount: number; currency: string }[] = []
  const currencyTotals: Record<string, { receivables: number; payables: number; net: number }> = {
    USD: { receivables: 0, payables: 0, net: 0 },
    AED: { receivables: 0, payables: 0, net: 0 },
    AFN: { receivables: 0, payables: 0, net: 0 },
  }

  let totalInvoicedCount = 0
  let overdueInvoicesCount = 0
  let pendingReceiptsCount = 0

  if (isFinanceAuthorized && ledgerDb) {
    const accounts = ledgerDb.accounts || []
    for (const acc of accounts) {
      const cur = (acc.currency || "USD").toUpperCase()
      if (!currencyTotals[cur]) {
        currencyTotals[cur] = { receivables: 0, payables: 0, net: 0 }
      }
      const deb = Number(acc.total_debit || 0)
      const cred = Number(acc.total_credit || 0)
      const bal = deb - cred // Strict accounting invariance

      if (bal > 0) {
        currencyTotals[cur].receivables += bal
      } else if (bal < 0) {
        currencyTotals[cur].payables += Math.abs(bal)
      }
      currencyTotals[cur].net = currencyTotals[cur].receivables - currencyTotals[cur].payables
    }

    const bolAccountings = ledgerDb.bol_accounting || []
    totalInvoicedCount = bolAccountings.filter((b: any) => Boolean(b.invoice_number)).length
    pendingReceiptsCount = (ledgerDb.payment_receipts || []).filter((r: any) => r.status === "draft" || r.status === "pending").length

    for (const ba of bolAccountings) {
      if (ba.payment_status === "overdue" || (ba.balance_due > 0 && ba.due_date && new Date(ba.due_date).getTime() < now.getTime())) {
        overdueInvoicesCount++
        const diffDays = Math.max(1, Math.floor((now.getTime() - new Date(ba.due_date || now).getTime()) / (1000 * 60 * 60 * 24)))
        overdueInvoicesList.push({
          invoiceNo: ba.invoice_number || `INV-${ba.bol_number}`,
          customerName: ba.customer_name || "Customer",
          overdueDays: diffDays,
          amount: ba.balance_due || ba.total_amount || 0,
          currency: ba.currency || "USD",
        })
      }
    }
  }

  // Evaluate Attention Rules
  let attentionItems = evaluateAttentionRules({
    shipments: liveShipments,
    containerRisks,
    overdueInvoices: isFinanceAuthorized ? overdueInvoicesList : [],
    missingDocShipments,
  })

  // Apply Snooze Filter
  const snoozeMap = getSnoozeState()
  attentionItems = applySnoozeFilter(attentionItems, snoozeMap)

  // Attach specific attention items to shipment rows
  for (const s of liveShipments) {
    s.attentionItems = attentionItems.filter((a) => a.shipmentId === s.id || a.bolNumber === s.bolNumber)
  }

  // Calculate Operational KPI Summary
  const kpis: OperationalKpiSummary = {
    totalShipments: liveShipments.length,
    activeMoving: liveShipments.filter((s) => s.stage !== "delivered" && s.stage !== "preparing").length,
    atBorder: stageCounts.border_clearance,
    inRoadTransit: stageCounts.road_transit,
    atPort: stageCounts.port_operations,
    onVessel: stageCounts.on_vessel,
    arrivedDestination: stageCounts.arrived_destination,
    deliveredTotal: stageCounts.delivered,
    needsAttentionCount: attentionItems.length,
    criticalAttentionCount: attentionItems.filter((a) => a.severity === "critical").length,
    warningAttentionCount: attentionItems.filter((a) => a.severity === "warning").length,
    infoAttentionCount: attentionItems.filter((a) => a.severity === "info").length,
    vgmPendingCount: liveShipments.filter((s) => s.stage === "port_operations" && !s.vgmCutOff).length,
    cutOffsTodayCount: liveShipments.filter((s) => {
      if (!s.portCutOff) return false
      const diffH = (new Date(s.portCutOff).getTime() - now.getTime()) / (1000 * 60 * 60)
      return diffH > 0 && diffH <= 24
    }).length,
    cutOffsNext48hCount: liveShipments.filter((s) => {
      if (!s.portCutOff) return false
      const diffH = (new Date(s.portCutOff).getTime() - now.getTime()) / (1000 * 60 * 60)
      return diffH > 0 && diffH <= 48
    }).length,
    incompleteDocsCount: missingDocShipments.length,
    detentionRiskCount: containerRisks.filter((c) => c.isOverdue || c.daysRemaining <= 2).length,
  }

  // Calculate Financial KPI Summary (Permitted vs Fenced)
  const currencyBreakdown: CurrencyBalanceItem[] = Object.entries(currencyTotals).map(([currency, totals]) => ({
    currency,
    receivables: totals.receivables,
    payables: totals.payables,
    netBalance: totals.net,
  }))

  const financials: FinancialKpiSummary = {
    isPermitted: isFinanceAuthorized,
    currencyBreakdown: isFinanceAuthorized ? currencyBreakdown : [],
    uninvoicedShipmentsCount: isFinanceAuthorized
      ? liveShipments.filter((s) => s.stage !== "preparing" && s.customerOutstandingUSD > 0).length
      : 0,
    overdueInvoicesCount: isFinanceAuthorized ? overdueInvoicesCount : 0,
    totalInvoicedCount: isFinanceAuthorized ? totalInvoicedCount : 0,
    pendingReceiptsCount: isFinanceAuthorized ? pendingReceiptsCount : 0,
  }

  // Border Stations Summary
  const borderStations: BorderStationSummary[] = Object.entries(borderStationMap).map(([stationName, data]) => ({
    stationName,
    stationPersian: stationName.includes("Dogharoon") ? "مرز دوغارون / اسلام قلعه" : stationName.includes("Hairatan") ? "حیرتان" : "اسپین بولدک",
    activeCount: data.count,
    truckPlates: Array.from(new Set(data.plates)),
    driverNames: Array.from(new Set(data.drivers)),
    avgWaitDays: data.count > 0 ? 2 : 0,
  }))

  // Port Operations Summary
  const portOperations: PortOperationSummary[] = Object.entries(portOpsMap).map(([portName, data]) => ({
    portName,
    activeCount: data.total,
    gateInCount: data.gateIn,
    loadingCount: data.loading,
    vesselDepartingCount: data.departing,
    upcomingCutoffsCount: liveShipments.filter((s) => (s.destination.includes(portName) || s.currentLocation.includes(portName)) && Boolean(s.portCutOff)).length,
  }))

  // Active Routes Summary
  const routeMap: Record<string, { count: number; containers: number; stage: string }> = {}
  for (const s of liveShipments) {
    const rName = `${s.origin} → ${s.destination}`
    if (!routeMap[rName]) {
      routeMap[rName] = { count: 0, containers: 0, stage: s.statusLabel }
    }
    routeMap[rName].count++
    if (s.containerNumber && s.containerNumber !== "TEMU0000000") {
      routeMap[rName].containers++
    }
  }
  const activeRoutes: ActiveRouteSummary[] = Object.entries(routeMap).map(([routeName, d]) => ({
    routeName,
    activeCount: d.count,
    containersCount: d.containers,
    currentStage: d.stage,
  }))

  // Upcoming Cut-Offs
  const upcomingCutOffs: UpcomingCutOffItem[] = []
  for (const s of liveShipments) {
    if (s.portCutOff) {
      const diffMs = new Date(s.portCutOff).getTime() - now.getTime()
      const hoursRemaining = Math.round(diffMs / (1000 * 60 * 60))
      let severity: "critical" | "warning" | "normal" | "passed" = "normal"
      if (hoursRemaining < 0) severity = "passed"
      else if (hoursRemaining <= 6) severity = "critical"
      else if (hoursRemaining <= 24) severity = "warning"

      upcomingCutOffs.push({
        id: `cutoff-${s.id}`,
        bookingNumber: s.bookingNumber || s.referenceNumber,
        containerNumber: s.containerNumber || "Unassigned",
        cutOffType: "Port",
        port: s.destination || "Port",
        deadline: s.portCutOff,
        hoursRemaining,
        severity,
      })
    }
  }
  upcomingCutOffs.sort((a, b) => a.hoursRemaining - b.hoursRemaining)

  // Upcoming Arrivals
  const upcomingArrivals: UpcomingArrivalItem[] = liveShipments
    .filter((s) => Boolean(s.etaDischarge) && s.stage !== "delivered")
    .map((s) => ({
      bolNumber: s.bolNumber,
      containerNumber: s.containerNumber || "Pending",
      vesselName: s.vesselName || "Direct Carrier",
      destination: s.destination,
      eta: s.etaDischarge!,
      customer: s.consigneeName || s.shipperName || "Client",
    }))
    .sort((a, b) => new Date(a.eta).getTime() - new Date(b.eta).getTime())
    .slice(0, 15)

  // Vessel Activity
  const vesselMap: Record<string, { voyage: string; route: string; containers: number; eta?: string; etd?: string; status: string }> = {}
  for (const s of liveShipments) {
    if (s.vesselName && s.stage === "on_vessel") {
      const vKey = `${s.vesselName}-${s.voyageNumber || "01"}`
      if (!vesselMap[vKey]) {
        vesselMap[vKey] = {
          voyage: s.voyageNumber || "N/A",
          route: `${s.origin} → ${s.destination}`,
          containers: 0,
          eta: s.etaDischarge,
          etd: s.portCutOff,
          status: s.statusLabel,
        }
      }
      vesselMap[vKey].containers++
    }
  }
  const vesselActivity: VesselActivityItem[] = Object.entries(vesselMap).map(([vKey, d]) => ({
    vesselName: vKey.split("-")[0],
    voyage: d.voyage,
    route: d.route,
    containersCount: d.containers,
    eta: d.eta,
    etd: d.etd,
    status: d.status,
  }))

  // Operational Readiness
  const readyForBorder = liveShipments.filter((s) => s.stage === "road_transit" && !s.hasMissingDocs).length
  const notReadyForBorder = liveShipments.filter((s) => s.stage === "road_transit" && s.hasMissingDocs).length
  const readyForVessel = liveShipments.filter((s) => s.stage === "port_operations" && !s.hasMissingDocs && Boolean(s.containerNumber)).length
  const notReadyForVessel = liveShipments.filter((s) => s.stage === "port_operations" && (s.hasMissingDocs || !s.containerNumber)).length

  const readiness: OperationalReadiness = {
    readyForBorder,
    notReadyForBorder,
    readyForVessel,
    notReadyForVessel,
  }

  // Top Customer Balances (Permission-Gated)
  const topCustomerBalances: CustomerBalanceItem[] = []
  if (isFinanceAuthorized && ledgerDb) {
    const accounts = ledgerDb.accounts || []
    for (const a of accounts) {
      const bal = Number(a.current_balance || (Number(a.total_debit || 0) - Number(a.total_credit || 0)))
      if (bal > 0) {
        const bolCount = liveShipments.filter((s) => (s.shipperName || "").toLowerCase() === (a.account_name || "").toLowerCase()).length
        topCustomerBalances.push({
          customerName: a.account_name,
          currency: a.currency || "USD",
          balance: bal,
          activeBolCount: bolCount,
        })
      }
    }
    topCustomerBalances.sort((a, b) => b.balance - a.balance)
  }

  // Sort Timeline chronologically descending
  timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return {
    generatedAt: new Date().toISOString(),
    kpis,
    financials,
    attentionItems,
    shipments: liveShipments,
    stageCounts,
    borderStations,
    portOperations,
    containerRisks,
    documentCompliance: documentComplianceList,
    timelineEvents: timelineEvents.slice(0, 50),
    activeRoutes,
    upcomingCutOffs,
    upcomingArrivals,
    vesselActivity,
    readiness,
    topCustomerBalances: topCustomerBalances.slice(0, 10),
  }
}
