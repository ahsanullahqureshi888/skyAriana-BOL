/**
 * Sky Ariana AI Operations Assistant - Query Planner & Execution Layer
 * Controlled Allowlist Query Engine querying verified local JSON databases.
 * No arbitrary SQL, no raw database dumps.
 */

import { readJsonFile } from '@/lib/services/blob-db'
import { getDataPath } from '@/lib/server-paths'
import { AIQueryFilter, AIUserSessionContext } from '@/lib/types/ai-assistant'
import { filterCustomerPortalScope, sanitizeRecordForAI } from './permission-filter'

export interface QueryExecutionResult {
  entityType: string
  records: any[]
  totalMatches: number
  isStaleData?: boolean
  sourceTag: string
  metrics?: Record<string, any>
}

// ----------------------------------------------------------------------------
// 1. SHIPMENT & BOL QUERIES
// ----------------------------------------------------------------------------

export async function lookupShipmentOrBol(
  identifier: string,
  user: AIUserSessionContext
): Promise<QueryExecutionResult> {
  const cleanId = identifier.trim().toUpperCase()

  const [shipments, bols] = await Promise.all([
    readJsonFile<any[]>(getDataPath('.local-shipments.json'), []),
    readJsonFile<any[]>(getDataPath('.local-bols.json'), []),
  ])

  // Scope to customer portal if applicable
  const scopedShipments = filterCustomerPortalScope(user, shipments, 'shipments')

  const foundShipment = scopedShipments.find(
    (s) =>
      (s.bolNumber && s.bolNumber.toUpperCase() === cleanId) ||
      (s.referenceNumber && s.referenceNumber.toUpperCase() === cleanId) ||
      (s.id && s.id.toUpperCase() === cleanId)
  )

  const foundBol = bols.find(
    (b) =>
      (b.bolNumber && b.bolNumber.toUpperCase() === cleanId) ||
      (b.id && b.id.toUpperCase() === cleanId)
  )

  const results: any[] = []
  if (foundShipment) {
    results.push(sanitizeRecordForAI(user, foundShipment))
  } else if (foundBol) {
    results.push(sanitizeRecordForAI(user, foundBol))
  }

  // Check staleness of tracking
  let isStale = false
  if (foundShipment) {
    const lastUpdate = foundShipment.updatedAt || foundShipment.createdAt
    if (lastUpdate) {
      const diffHours = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60)
      if (diffHours >= 48) isStale = true
    }
  }

  return {
    entityType: 'shipment',
    records: results,
    totalMatches: results.length,
    isStaleData: isStale,
    sourceTag: foundShipment ? 'Control Tower' : 'Saved BOLs',
  }
}

export async function searchShipments(
  filters: AIQueryFilter,
  user: AIUserSessionContext
): Promise<QueryExecutionResult> {
  const shipments = await readJsonFile<any[]>(getDataPath('.local-shipments.json'), [])
  let list = filterCustomerPortalScope(user, shipments, 'shipments')

  if (filters.status) {
    list = list.filter((s) => s.status?.toLowerCase() === filters.status?.toLowerCase())
  }

  if (filters.destination) {
    const qDest = filters.destination.toLowerCase()
    list = list.filter(
      (s) =>
        (s.destination && s.destination.toLowerCase().includes(qDest)) ||
        (s.portOfDischarge && s.portOfDischarge.toLowerCase().includes(qDest))
    )
  }

  if (filters.origin) {
    const qOrig = filters.origin.toLowerCase()
    list = list.filter(
      (s) =>
        (s.origin && s.origin.toLowerCase().includes(qOrig)) ||
        (s.portOfLoading && s.portOfLoading.toLowerCase().includes(qOrig))
    )
  }

  if (filters.stage) {
    if (filters.stage === 'border') {
      list = list.filter((s) => s.status === 'at_border' || s.status === 'customs_pending')
    } else if (filters.stage === 'port') {
      list = list.filter((s) => s.status === 'at_port' || s.status === 'container_loading')
    } else if (filters.stage === 'sea') {
      list = list.filter((s) => s.status === 'on_vessel' || s.status === 'vessel_departed')
    }
  }

  if (filters.companyName) {
    const qComp = filters.companyName.toLowerCase()
    list = list.filter(
      (s) =>
        (s.shipper?.name && s.shipper.name.toLowerCase().includes(qComp)) ||
        (s.consignee?.name && s.consignee.name.toLowerCase().includes(qComp)) ||
        (s.accountName && s.accountName.toLowerCase().includes(qComp))
    )
  }

  const sanitized = list.map((s) => sanitizeRecordForAI(user, s))

  return {
    entityType: 'shipment',
    records: sanitized.slice(0, 20),
    totalMatches: sanitized.length,
    sourceTag: 'Shipment Tracking',
  }
}

// ----------------------------------------------------------------------------
// 2. CONTAINER QUERIES
// ----------------------------------------------------------------------------

export async function lookupContainer(
  containerNumber: string,
  user: AIUserSessionContext
): Promise<QueryExecutionResult> {
  const cleanCtr = containerNumber.trim().toUpperCase()

  const [shipments, bookings] = await Promise.all([
    readJsonFile<any[]>(getDataPath('.local-shipments.json'), []),
    readJsonFile<any[]>(getDataPath('.local-bookings.json'), []),
  ])

  const scopedShipments = filterCustomerPortalScope(user, shipments, 'containers')

  // Find linked shipment
  const matchingShipment = scopedShipments.find(
    (s) =>
      (s.container?.containerNumber && s.container.containerNumber.toUpperCase() === cleanCtr) ||
      (s.containerNumber && s.containerNumber.toUpperCase() === cleanCtr)
  )

  // Find linked booking
  const matchingBooking = bookings.find((b) =>
    b.containers?.some((c: any) => c.containerNumber?.toUpperCase() === cleanCtr)
  )

  const records: any[] = []
  let isStale = false

  if (matchingShipment) {
    const sanitized = sanitizeRecordForAI(user, matchingShipment)
    records.push({
      ...sanitized,
      matchedContainer: cleanCtr,
    })

    const lastUpdate = matchingShipment.updatedAt || matchingShipment.createdAt
    if (lastUpdate) {
      const diffHours = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60)
      if (diffHours >= 48) isStale = true
    }
  } else if (matchingBooking) {
    records.push({
      bookingNumber: matchingBooking.bookingNumber,
      carrier: matchingBooking.carrier,
      destination: matchingBooking.destinationPort,
      matchedContainer: cleanCtr,
      status: matchingBooking.status,
    })
  }

  return {
    entityType: 'container',
    records,
    totalMatches: records.length,
    isStaleData: isStale,
    sourceTag: 'Container Tracking',
  }
}

export async function searchContainers(
  filters: AIQueryFilter,
  user: AIUserSessionContext
): Promise<QueryExecutionResult> {
  const shipments = await readJsonFile<any[]>(getDataPath('.local-shipments.json'), [])
  let list = filterCustomerPortalScope(user, shipments, 'containers')

  // Filter shipments that have assigned container numbers
  list = list.filter((s) => s.container?.containerNumber || s.containerNumber)

  if (filters.stage === 'port') {
    list = list.filter((s) => s.status === 'at_port' || s.status === 'container_loading')
  } else if (filters.stage === 'border') {
    list = list.filter((s) => s.status === 'at_border' || s.status === 'customs_pending')
  } else if (filters.stage === 'sea') {
    list = list.filter((s) => s.status === 'on_vessel' || s.status === 'vessel_departed')
  }

  if (filters.companyName) {
    const qComp = filters.companyName.toLowerCase()
    list = list.filter(
      (s) =>
        (s.shipper?.name && s.shipper.name.toLowerCase().includes(qComp)) ||
        (s.accountName && s.accountName.toLowerCase().includes(qComp))
    )
  }

  const containerRecords = list.map((s) => ({
    containerNumber: s.container?.containerNumber || s.containerNumber,
    bolNumber: s.bolNumber || s.referenceNumber,
    customerName: s.shipper?.name || s.accountName,
    currentLocation: s.currentLocation || 'In Transit',
    destination: s.destination,
    status: s.status,
    eta: s.vessel?.eta || s.eta,
    updatedAt: s.updatedAt || s.createdAt,
  }))

  return {
    entityType: 'container',
    records: containerRecords.slice(0, 20),
    totalMatches: containerRecords.length,
    sourceTag: 'Container Control',
  }
}

// ----------------------------------------------------------------------------
// 3. STALE TRACKING & BORDER QUEUES
// ----------------------------------------------------------------------------

export async function getStaleShipments(
  user: AIUserSessionContext,
  thresholdHours = 48
): Promise<QueryExecutionResult> {
  const shipments = await readJsonFile<any[]>(getDataPath('.local-shipments.json'), [])
  const list = filterCustomerPortalScope(user, shipments, 'shipments')

  const nowMs = Date.now()
  const stale = list.filter((s) => {
    if (s.status === 'delivered' || s.status === 'cancelled' || s.status === 'draft') return false
    const lastUpdate = s.updatedAt || s.createdAt || s.date
    if (!lastUpdate) return true
    const hours = (nowMs - new Date(lastUpdate).getTime()) / (1000 * 60 * 60)
    return hours >= thresholdHours
  })

  return {
    entityType: 'stale_tracking',
    records: stale.map((s) => sanitizeRecordForAI(user, s)).slice(0, 20),
    totalMatches: stale.length,
    isStaleData: true,
    sourceTag: 'Tracking Reminders',
  }
}

export async function getBorderDelayedTrucks(
  user: AIUserSessionContext
): Promise<QueryExecutionResult> {
  const shipments = await readJsonFile<any[]>(getDataPath('.local-shipments.json'), [])
  const list = filterCustomerPortalScope(user, shipments, 'shipments')

  const atBorder = list.filter((s) => s.status === 'at_border' || s.status === 'customs_pending')

  return {
    entityType: 'border_trucks',
    records: atBorder.map((s) => sanitizeRecordForAI(user, s)).slice(0, 20),
    totalMatches: atBorder.length,
    sourceTag: 'Border Clearance',
  }
}

// ----------------------------------------------------------------------------
// 4. DOCUMENT COMPLIANCE QUERIES
// ----------------------------------------------------------------------------

export async function getMissingDocuments(
  user: AIUserSessionContext
): Promise<QueryExecutionResult> {
  const [documentsDb, bols] = await Promise.all([
    readJsonFile<any>(getDataPath('document-compliance.json'), { documents: [] }),
    readJsonFile<any[]>(getDataPath('.local-bols.json'), []),
  ])

  const docs = documentsDb.documents || []
  const scopedDocs = filterCustomerPortalScope(user, docs, 'documents')

  // Find incomplete documents across active shipments
  const incomplete = scopedDocs.filter((d: any) => d.status === 'DRAFT' || d.status === 'PENDING')

  return {
    entityType: 'missing_documents',
    records: incomplete.slice(0, 20),
    totalMatches: incomplete.length,
    sourceTag: 'Document Compliance',
  }
}

// ----------------------------------------------------------------------------
// 5. FINANCE, INVOICES & LEDGER BALANCES (Demarcated Multi-Currency)
// ----------------------------------------------------------------------------

export async function getCustomerBalances(
  customerName: string,
  user: AIUserSessionContext
): Promise<QueryExecutionResult> {
  const [invoices, accounts] = await Promise.all([
    readJsonFile<any[]>(getDataPath('.local-invoices.json'), []),
    readJsonFile<any[]>(getDataPath('.local-accounts.json'), []),
  ])

  const scopedInvoices = filterCustomerPortalScope(user, invoices, 'invoices')
  const qComp = customerName.trim().toLowerCase()

  // Match customer invoices
  const matchedInvoices = scopedInvoices.filter((inv) => {
    const bName = (inv.buyer_name || inv.clientName || '').toLowerCase()
    return bName.includes(qComp) || qComp.includes(bName)
  })

  // Segregate outstanding by currency
  const currencyTotalsMap = new Map<string, number>()
  for (const inv of matchedInvoices) {
    if (inv.status !== 'paid' && !inv.isPaid) {
      const outstanding =
        Number(inv.total_amount || inv.amount || 0) - Number(inv.paid_amount || 0)
      if (outstanding > 0) {
        const curr = inv.currency || 'USD'
        currencyTotalsMap.set(curr, (currencyTotalsMap.get(curr) || 0) + outstanding)
      }
    }
  }

  const totals = Array.from(currencyTotalsMap.entries()).map(([currency, amount]) => ({
    currency,
    amount,
  }))

  return {
    entityType: 'customer_balance',
    records: matchedInvoices.slice(0, 10),
    totalMatches: matchedInvoices.length,
    metrics: { currencyTotals: totals, customerName },
    sourceTag: 'Accounting Ledgers',
  }
}

export async function getTodayPaymentsRecorded(
  user: AIUserSessionContext,
  targetDate = new Date().toISOString().split('T')[0]
): Promise<QueryExecutionResult> {
  const invoices = await readJsonFile<any[]>(getDataPath('.local-invoices.json'), [])
  const scoped = filterCustomerPortalScope(user, invoices, 'invoices')

  const paymentsToday: any[] = []
  const currencyTotalsMap = new Map<string, number>()

  for (const inv of scoped) {
    if (Array.isArray(inv.payments)) {
      for (const p of inv.payments) {
        const pDate = (p.date || '').split('T')[0]
        if (pDate === targetDate) {
          const amt = Number(p.amount || 0)
          const curr = p.currency || inv.currency || 'USD'
          currencyTotalsMap.set(curr, (currencyTotalsMap.get(curr) || 0) + amt)
          paymentsToday.push({
            customerName: inv.buyer_name || inv.clientName,
            amount: amt,
            currency: curr,
            reference: p.reference || p.id,
            invoiceNumber: inv.invoice_number,
          })
        }
      }
    }
  }

  const totals = Array.from(currencyTotalsMap.entries()).map(([currency, amount]) => ({
    currency,
    amount,
  }))

  return {
    entityType: 'today_payments',
    records: paymentsToday,
    totalMatches: paymentsToday.length,
    metrics: { currencyTotals: totals, date: targetDate },
    sourceTag: 'Finance Receipts',
  }
}

// ----------------------------------------------------------------------------
// 6. OPERATIONAL TASKS & AUDIT TRAIL
// ----------------------------------------------------------------------------

export async function getDailyOperationsTasks(
  user: AIUserSessionContext
): Promise<QueryExecutionResult> {
  const tasks = await readJsonFile<any[]>(getDataPath('.local-daily-tasks.json'), [])
  const active = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')

  return {
    entityType: 'tasks',
    records: active.slice(0, 15),
    totalMatches: active.length,
    sourceTag: 'Daily Operations',
  }
}

export async function getEntityAuditHistory(
  entityRef: string,
  user: AIUserSessionContext
): Promise<QueryExecutionResult> {
  const auditLogs = await readJsonFile<any[]>(getDataPath('.local-audit-logs.json'), [])
  const cleanRef = entityRef.trim().toLowerCase()

  const matched = auditLogs.filter(
    (log) =>
      (log.entityId && log.entityId.toLowerCase().includes(cleanRef)) ||
      (log.description && log.description.toLowerCase().includes(cleanRef))
  )

  return {
    entityType: 'audit_log',
    records: matched.slice(0, 10),
    totalMatches: matched.length,
    sourceTag: 'Audit Trail Center',
  }
}
