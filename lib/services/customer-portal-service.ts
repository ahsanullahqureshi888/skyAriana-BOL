import { getAllShipments } from "./shipment-service"
import { getAccountLedgerDatabase } from "./account-ledger-storage-service"
import { readJsonFile } from "./blob-db"
import { getDataPath } from "@/lib/server-paths"
import type { ShipmentMaster, StatusMilestone } from "@/lib/types/shipment"
import type {
  CustomerPortalUser,
  CustomerPortalSession,
  CustomerShipmentSummary,
  CustomerShipmentDetail,
  CustomerVisibleMilestone,
  CustomerDocumentItem,
  CustomerLedgerSummary,
  CustomerTransactionItem,
  CustomerPortalRequest,
  CustomerPortalNotification,
} from "@/lib/types/customer-portal"
import {
  findPortalUserByUsername,
  findPortalUserById,
  verifyPassword,
  createSessionToken,
  getPortalAccounts,
  updatePortalAccount,
  getPortalSettings,
  getPortalRequests,
  createPortalRequestRecord,
  getPortalNotifications,
  markNotificationAsRead,
  findPortalUsersByCustomerId,
} from "./customer-portal-storage"

/**
 * Checks if a shipment belongs to the given customer ID or customer company name.
 * A shipment matches if the customer is the Shipper, Consignee, Notify Party, or explicit client.
 */
export function isShipmentOwnedByCustomer(
  shipment: ShipmentMaster,
  customerId: string,
  customerName: string
): { isOwner: boolean; customerRole: "shipper" | "consignee" | "notify" | "client" } {
  if (!shipment) return { isOwner: false, customerRole: "client" }

  const cid = (customerId || "").trim().toLowerCase()
  const cname = (customerName || "").trim().toLowerCase()

  // 1. Check Shipper
  const sId = (shipment.shipper?.id || "").trim().toLowerCase()
  const sName = (shipment.shipper?.name || "").trim().toLowerCase()
  if ((cid && sId === cid) || (cname && sName && (sName === cname || sName.includes(cname) || cname.includes(sName)))) {
    return { isOwner: true, customerRole: "shipper" }
  }

  // 2. Check Consignee
  const conId = (shipment.consignee?.id || "").trim().toLowerCase()
  const conName = (shipment.consignee?.name || "").trim().toLowerCase()
  if ((cid && conId === cid) || (cname && conName && (conName === cname || conName.includes(cname) || cname.includes(conName)))) {
    return { isOwner: true, customerRole: "consignee" }
  }

  // 3. Check Notify Party
  const notId = (shipment.notifyParty?.id || "").trim().toLowerCase()
  const notName = (shipment.notifyParty?.name || "").trim().toLowerCase()
  if ((cid && notId === cid) || (cname && notName && (notName === cname || notName.includes(cname) || cname.includes(notName)))) {
    return { isOwner: true, customerRole: "notify" }
  }

  return { isOwner: false, customerRole: "client" }
}

/**
 * Filter milestones to customer-visible ones only.
 * Strips internal notes, driver payment discussions, or internal flags.
 */
export function filterCustomerVisibleMilestones(
  milestones: StatusMilestone[] = []
): CustomerVisibleMilestone[] {
  return (milestones || [])
    .filter((m) => {
      // If customerVisible is explicitly false, hide it
      if ((m as any).customerVisible === false) return false
      // Exclude milestones with obvious internal keywords unless approved
      const desc = (m.description || "").toLowerCase()
      const title = (m.title || "").toLowerCase()
      if (
        desc.includes("driver rent") ||
        desc.includes("payment pending") ||
        desc.includes("internal hold") ||
        desc.includes("staff note")
      ) {
        return false
      }
      return true
    })
    .map((m) => ({
      id: m.id,
      location: m.location,
      status: m.status,
      title: m.title,
      description: m.description,
      timestamp: m.timestamp,
      actualDate: m.actualDate,
      completed: m.completed,
    }))
}

// ==========================================
// AUTHENTICATION & SESSIONS
// ==========================================

export async function authenticatePortalCredentials(
  usernameOrEmail: string,
  passwordPlain: string
): Promise<{ success: boolean; session?: CustomerPortalSession; token?: string; error?: string }> {
  const user = await findPortalUserByUsername(usernameOrEmail)
  if (!user) {
    return { success: false, error: "Invalid username or password" }
  }

  if (user.status === "disabled" || user.status === "suspended") {
    return {
      success: false,
      error: `Your customer portal account is ${user.status}. Please contact Sky Ariana Support.`,
    }
  }

  const isValid = verifyPassword(passwordPlain, user.passwordHash, user.salt)
  if (!isValid) {
    return { success: false, error: "Invalid username or password" }
  }

  // Record login activity
  await updatePortalAccount(user.id, () => ({
    lastLogin: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  }))

  const settings = await getPortalSettings()
  const durationMs = (settings.sessionDurationHours || 24) * 60 * 60 * 1000

  const session: CustomerPortalSession = {
    sessionId: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    userId: user.id,
    customerId: user.customerId,
    customerName: user.customerName,
    username: user.username,
    role: user.role,
    permissions: user.permissions,
    preferredLanguage: user.preferredLanguage || "en",
    expiresAt: Date.now() + durationMs,
  }

  const token = createSessionToken(session)
  return { success: true, session, token }
}

// ==========================================
// CUSTOMER SHIPMENTS & DETAILS (STRICT ISOLATION)
// ==========================================

export async function getCustomerShipments(
  session: CustomerPortalSession,
  params: {
    query?: string
    status?: string
    origin?: string
    destination?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  } = {}
): Promise<{ shipments: CustomerShipmentSummary[]; total: number; page: number; totalPages: number }> {
  const all = await getAllShipments()

  // 1. STRICT CUSTOMER ISOLATION:
  // Only records where this customer is shipper, consignee, or notify party
  const customerShipments: CustomerShipmentSummary[] = []

  for (const s of all) {
    const { isOwner, customerRole } = isShipmentOwnedByCustomer(s, session.customerId, session.customerName)
    if (!isOwner) continue

    // Check if shipment is visible in portal
    if ((s as any).customerVisible === false) continue

    const bolNumber = (s as any).bolNumber || s.referenceNumber || s.documents?.find((d) => d.documentType === "bol")?.documentNumber || s.id
    const transport = (s as any).transport || (s as any).route
    const containers: any[] = (s as any).containers || (s.container ? [s.container] : [])

    customerShipments.push({
      id: s.id,
      referenceNumber: s.referenceNumber,
      bolNumber,
      issueDate: s.createdAt ? s.createdAt.substring(0, 10) : "",
      commodity: s.cargo?.commodity || s.cargo?.descriptionOfGoods || "General Cargo",
      cartons: s.cargo?.cartons || 0,
      packageType: s.cargo?.packageType || "CTNS",
      netWeightKg: s.cargo?.netWeightKg || 0,
      grossWeightKg: s.cargo?.grossWeightKg || 0,
      origin: transport?.origin || transport?.loadingPlace || "Afghanistan",
      destination: transport?.finalDestination || transport?.portOfDischarge || "",
      currentLocation: s.currentLocation || "In Transit",
      currentStatus: s.status,
      containerNumber: containers[0]?.containerNumber || undefined,
      containerType: containers[0]?.containerType || undefined,
      vesselName: s.vessel?.vesselName || undefined,
      voyageNumber: s.vessel?.voyageNumber || undefined,
      eta: s.vessel?.eta || undefined,
      etd: s.vessel?.etd || undefined,
      customerRole,
    })
  }

  // 2. In-memory customer-safe filtering
  let filtered = customerShipments

  if (params.query) {
    const q = params.query.toLowerCase().trim()
    filtered = filtered.filter(
      (s) =>
        s.bolNumber.toLowerCase().includes(q) ||
        s.referenceNumber.toLowerCase().includes(q) ||
        (s.containerNumber && s.containerNumber.toLowerCase().includes(q)) ||
        (s.commodity && s.commodity.toLowerCase().includes(q)) ||
        (s.destination && s.destination.toLowerCase().includes(q)) ||
        (s.vesselName && s.vesselName.toLowerCase().includes(q))
    )
  }

  if (params.status && params.status !== "all") {
    filtered = filtered.filter((s) => s.currentStatus.toLowerCase() === params.status?.toLowerCase())
  }

  if (params.origin) {
    filtered = filtered.filter((s) => s.origin.toLowerCase().includes(params.origin!.toLowerCase()))
  }

  if (params.destination) {
    filtered = filtered.filter((s) => s.destination.toLowerCase().includes(params.destination!.toLowerCase()))
  }

  if (params.startDate) {
    filtered = filtered.filter((s) => s.issueDate >= params.startDate!)
  }

  if (params.endDate) {
    filtered = filtered.filter((s) => s.issueDate <= params.endDate!)
  }

  // 3. Sort newest first
  filtered.sort((a, b) => (b.issueDate || "").localeCompare(a.issueDate || ""))

  // 4. Pagination
  const page = Math.max(1, params.page || 1)
  const limit = Math.max(1, Math.min(100, params.limit || 20))
  const total = filtered.length
  const totalPages = Math.ceil(total / limit) || 1
  const start = (page - 1) * limit
  const paged = filtered.slice(start, start + limit)

  return { shipments: paged, total, page, totalPages }
}

export async function getCustomerShipmentById(
  session: CustomerPortalSession,
  shipmentId: string
): Promise<CustomerShipmentDetail | null> {
  const all = await getAllShipments()
  const found = all.find(
    (s) =>
      s.id === shipmentId ||
      s.referenceNumber === shipmentId ||
      (s as any).bolNumber === shipmentId
  )
  if (!found) return null

  // STRICT IDOR CHECK:
  const { isOwner, customerRole } = isShipmentOwnedByCustomer(found, session.customerId, session.customerName)
  if (!isOwner) {
    // Return null to prevent confirming existence of another customer's shipment
    return null
  }

  const bolNumber =
    (found as any).bolNumber ||
    found.referenceNumber ||
    found.documents?.find((d) => d.documentType === "bol")?.documentNumber ||
    found.id
  const transport = (found as any).transport || (found as any).route
  const rawContainers: any[] = (found as any).containers || (found.container ? [found.container] : [])

  // Map containers
  const containers = rawContainers.map((c: any) => ({
    containerNumber: c.containerNumber,
    containerType: c.containerType,
    sealNumber: session.permissions.viewContainerInfo ? c.sealNumber : undefined,
  }))

  // Customer-safe milestones
  const milestones = filterCustomerVisibleMilestones(found.milestones)

  // Map documents (only customer visible)
  const documents: CustomerDocumentItem[] = []
  const docList = found.documents || (found as any).documentSnapshots || []
  if (session.permissions.viewDocuments && Array.isArray(docList)) {
    docList.forEach((doc: any) => {
      if (doc.customerVisible === false) return
      documents.push({
        id: doc.id,
        shipmentId: found.id,
        bolNumber,
        documentType: doc.documentType,
        title: `${String(doc.documentType || "DOCUMENT").toUpperCase()} - ${doc.documentNumber || bolNumber}`,
        fileName: `${doc.documentType || "doc"}-${doc.documentNumber || bolNumber}.pdf`,
        createdDate: doc.generatedAt ? doc.generatedAt.substring(0, 10) : "",
        downloadUrl: `/api/portal/documents/${doc.id}/download?shipmentId=${found.id}`,
        customerVisible: true,
      })
    })
  }

  // Safe projection: no internal supplier costs, no internal profit/loss, no driver rent
  return {
    id: found.id,
    referenceNumber: found.referenceNumber,
    bolNumber,
    issueDate: found.createdAt ? found.createdAt.substring(0, 10) : "",
    commodity: found.cargo?.commodity || found.cargo?.descriptionOfGoods || "General Cargo",
    cartons: found.cargo?.cartons || 0,
    packageType: found.cargo?.packageType || "CTNS",
    netWeightKg: found.cargo?.netWeightKg || 0,
    grossWeightKg: found.cargo?.grossWeightKg || 0,
    origin: transport?.origin || transport?.loadingPlace || "Afghanistan",
    destination: transport?.finalDestination || transport?.portOfDischarge || "",
    currentLocation: found.currentLocation || "In Transit",
    currentStatus: found.status,
    customerRole,
    loadingPlace: transport?.loadingPlace,
    borderCrossing: transport?.borderCrossing,
    portOfLoading: transport?.portOfLoading,
    portOfDischarge: transport?.portOfDischarge,
    containers,
    truck: found.truck?.afghanPlate ? { afghanPlate: found.truck.afghanPlate } : undefined,
    vessel:
      session.permissions.viewVesselInfo && found.vessel?.vesselName
        ? {
            vesselName: found.vessel.vesselName,
            voyageNumber: found.vessel.voyageNumber,
            etd: found.vessel.etd,
            eta: found.vessel.eta,
          }
        : undefined,
    milestones,
    documents,
  }
}

// ==========================================
// CUSTOMER DOCUMENTS CENTER
// ==========================================

export async function getCustomerDocuments(
  session: CustomerPortalSession,
  shipmentId?: string
): Promise<CustomerDocumentItem[]> {
  if (!session.permissions.viewDocuments) return []

  const all = await getAllShipments()
  const documents: CustomerDocumentItem[] = []

  for (const s of all) {
    const { isOwner } = isShipmentOwnedByCustomer(s, session.customerId, session.customerName)
    if (!isOwner) continue

    if (shipmentId && s.id !== shipmentId && s.referenceNumber !== shipmentId) continue

    const bolNumber =
      (s as any).bolNumber ||
      s.referenceNumber ||
      s.documents?.find((d) => d.documentType === "bol")?.documentNumber ||
      s.id
    const docList = s.documents || (s as any).documentSnapshots || []

    if (Array.isArray(docList)) {
      docList.forEach((doc: any) => {
        if (doc.customerVisible === false) return
        documents.push({
          id: doc.id,
          shipmentId: s.id,
          bolNumber,
          documentType: doc.documentType,
          title: `${String(doc.documentType || "DOCUMENT").toUpperCase().replace("_", " ")} — ${
            doc.documentNumber || bolNumber
          }`,
          fileName: `${doc.documentType || "doc"}-${doc.documentNumber || bolNumber}.pdf`,
          createdDate: doc.generatedAt ? doc.generatedAt.substring(0, 10) : "",
          downloadUrl: `/api/portal/documents/${doc.id}/download?shipmentId=${s.id}`,
          customerVisible: true,
        })
      })
    }

    // Default Bill of Lading PDF entry
    if (session.permissions.viewBol) {
      documents.push({
        id: `bol-doc-${s.id}`,
        shipmentId: s.id,
        bolNumber,
        documentType: "bol",
        title: `Bill of Lading — ${bolNumber}`,
        fileName: `${bolNumber}.pdf`,
        createdDate: s.createdAt ? s.createdAt.substring(0, 10) : "",
        downloadUrl: `/api/portal/documents/bol-${s.id}/download?shipmentId=${s.id}`,
        customerVisible: true,
      })
    }
  }

  return documents
}

// ==========================================
// CUSTOMER ACCOUNT LEDGER (READ-ONLY)
// ==========================================

export async function getCustomerLedger(
  session: CustomerPortalSession,
  dateFilter?: "month" | "year" | "all"
): Promise<CustomerLedgerSummary> {
  if (!session.permissions.viewAccountLedger) {
    throw new Error("Access denied: You do not have permission to view account ledgers")
  }

  const ledgerDb = await getAccountLedgerDatabase()
  const entriesMap = ledgerDb?.ledgerEntries || {}

  // Find entries for this customer name or customerId
  const cname = session.customerName.toLowerCase()
  const matchedAccountKeys = Object.keys(entriesMap).filter((k) => {
    const kl = k.toLowerCase()
    return kl === cname || kl.includes(cname) || cname.includes(kl)
  })

  let allEntries: any[] = []
  for (const k of matchedAccountKeys) {
    const list = entriesMap[k]
    if (Array.isArray(list)) {
      allEntries.push(...list)
    }
  }

  // Filter by date if requested
  if (dateFilter === "month") {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    allEntries = allEntries.filter((e) => (e.date || "").startsWith(currentMonth))
  } else if (dateFilter === "year") {
    const currentYear = String(new Date().getFullYear())
    allEntries = allEntries.filter((e) => (e.date || "").startsWith(currentYear))
  }

  // Group by currency to avoid adding USD + AFN
  const currencyGroups: Record<string, { debit: number; credit: number }> = {}

  const customerTransactions: CustomerTransactionItem[] = []

  allEntries.forEach((entry) => {
    const cur = (entry.driverFreightCurrency || entry.currency || "USD").toUpperCase()
    if (!currencyGroups[cur]) {
      currencyGroups[cur] = { debit: 0, credit: 0 }
    }
    const debit = Number(entry.debit) || 0
    const credit = Number(entry.credit) || 0
    currencyGroups[cur].debit += debit
    currencyGroups[cur].credit += credit

    customerTransactions.push({
      id: entry.id || `tx-${Math.random().toString(36).substring(2, 9)}`,
      date: entry.date || entry.dateOfShip || "",
      reference: entry.invoiceNo || entry.billOfLanding || entry.barnamehNo || "-",
      description: entry.shipperDescription || entry.consignee || "Freight & Shipment Handling",
      debit,
      credit,
      balance: Number(entry.balance) || (debit - credit),
      currency: cur,
      bolNumber: entry.billOfLanding,
      containerNumber: entry.containerNo,
    })
  })

  // Mathematical Accounting Invariance: Outstanding = Total Debit - Total Credit
  const balancesByCurrency = Object.keys(currencyGroups).map((cur) => {
    const totalDebit = currencyGroups[cur].debit
    const totalCredit = currencyGroups[cur].credit
    const outstandingBalance = totalDebit - totalCredit
    return {
      currency: cur,
      totalDebit,
      totalCredit,
      outstandingBalance,
    }
  })

  return {
    customerName: session.customerName,
    balancesByCurrency: balancesByCurrency.length > 0
      ? balancesByCurrency
      : [{ currency: "USD", totalDebit: 0, totalCredit: 0, outstandingBalance: 0 }],
    transactions: customerTransactions.sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    lastTransactionDate: customerTransactions[0]?.date,
  }
}

// ==========================================
// CUSTOMER REPORTS & SUMMARIES
// ==========================================

export async function getCustomerReports(
  session: CustomerPortalSession,
  reportType: "monthly" | "containers" | "tracking" = "monthly"
) {
  if (!session.permissions.viewReports) {
    throw new Error("Access denied: You do not have permission to view reports")
  }

  const { shipments } = await getCustomerShipments(session, { limit: 1000 })

  if (reportType === "containers") {
    const containerList: any[] = []
    shipments.forEach((s) => {
      if (s.containerNumber) {
        containerList.push({
          containerNumber: s.containerNumber,
          containerType: s.containerType || "40RF",
          bolNumber: s.bolNumber,
          commodity: s.commodity,
          currentLocation: s.currentLocation,
          status: s.currentStatus,
          destination: s.destination,
          eta: s.eta,
        })
      }
    })
    return { type: "containers", totalContainers: containerList.length, containers: containerList }
  }

  // Monthly summary
  const summary = {
    totalShipments: shipments.length,
    inTransit: shipments.filter((s) => s.currentStatus !== "delivered" && s.currentStatus !== "cancelled").length,
    delivered: shipments.filter((s) => s.currentStatus === "delivered").length,
    totalCartons: shipments.reduce((acc, s) => acc + (s.cartons || 0), 0),
    totalGrossWeightKg: shipments.reduce((acc, s) => acc + (s.grossWeightKg || 0), 0),
    shipments,
  }

  return { type: "monthly", month: new Date().toISOString().substring(0, 7), summary }
}

// ==========================================
// ADMIN CUSTOMER PORTAL MANAGEMENT
// ==========================================

export async function getAdminCustomerPortalOverview() {
  const canonicalAccountsFile = getDataPath(".local-accounts.json")
  const canonicalAccounts = await readJsonFile<any[]>(canonicalAccountsFile, [])
  const portalAccounts = await getPortalAccounts()
  const shipments = await getAllShipments()

  return canonicalAccounts.map((acc) => {
    const users = portalAccounts.filter((p) => p.customerId === acc.id)
    const activeShipments = shipments.filter(
      (s) => isShipmentOwnedByCustomer(s, acc.id, acc.name).isOwner && s.status !== "delivered"
    ).length

    const primaryUser = users[0] || null

    return {
      customerId: acc.id,
      customerName: acc.name,
      contact: acc.contact || "",
      address: acc.address || "",
      hasPortalAccess: users.length > 0,
      status: primaryUser ? primaryUser.status : "disabled",
      usersCount: users.length,
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        status: u.status,
        lastLogin: u.lastLogin,
      })),
      activeShipments,
      linkedBolCount: shipments.filter((s) => isShipmentOwnedByCustomer(s, acc.id, acc.name).isOwner).length,
    }
  })
}

export async function createAdminPreviewSession(
  customerId: string,
  adminUserName = "Administrator"
): Promise<{ session: CustomerPortalSession; token: string }> {
  const canonicalAccountsFile = getDataPath(".local-accounts.json")
  const canonicalAccounts = await readJsonFile<any[]>(canonicalAccountsFile, [])
  const found = canonicalAccounts.find((a) => a.id === customerId)
  if (!found) {
    throw new Error(`Customer ${customerId} not found`)
  }

  const session: CustomerPortalSession = {
    sessionId: `preview-${Date.now()}`,
    userId: `admin-preview-${customerId}`,
    customerId: found.id,
    customerName: found.name,
    username: `${adminUserName} (Preview)`,
    role: "customer_admin",
    permissions: {
      viewShipments: true,
      viewBol: true,
      downloadBolPdf: true,
      viewTracking: true,
      viewContainerInfo: true,
      viewVesselInfo: true,
      viewDocuments: true,
      downloadDocuments: true,
      viewCommercialInvoice: true,
      viewPackingList: true,
      viewAccountLedger: true,
      viewOutstandingBalance: true,
      viewTransactionDetails: true,
      viewReports: true,
      generateTrackingPdf: true,
      copyShipmentUpdate: true,
    },
    preferredLanguage: "en",
    isAdminPreview: true,
    expiresAt: Date.now() + 2 * 60 * 60 * 1000, // 2 hours
  }

  const token = createSessionToken(session)
  return { session, token }
}
