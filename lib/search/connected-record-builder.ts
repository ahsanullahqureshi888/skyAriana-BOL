/**
 * Connected Record Relationship Graph & Cross-Module Resolver
 * Sky Ariana Multi-Modal Logistics & Financial Suite
 */

import type { ConnectedRecordsSummary, ConnectedEntityRef, SearchResultType } from "./search-types"
import { normalizeIdentifier, normalizeCompanyName } from "./search-normalizer"

export interface SearchDatasets {
  bols: any[]
  shipments: any[]
  invoices: any[]
  ledgerDb: { accounts: any[]; ledgerEntries: Record<string, any[]> }
  payments: any[]
  documents: any[]
  suppliers: any[]
}

/**
 * Resolves connected records for a Container across all modules
 */
export function resolveContainerConnectedRecords(
  containerNumber: string,
  data: SearchDatasets
): ConnectedRecordsSummary {
  const cNorm = normalizeIdentifier(containerNumber)
  const connectedEntities: ConnectedEntityRef[] = []

  // 1. Find matching Shipment
  const matchedShipment = data.shipments.find((s) => {
    if (s.containers && Array.isArray(s.containers)) {
      return s.containers.some((c: any) => normalizeIdentifier(c.containerNumber) === cNorm)
    }
    return normalizeIdentifier(s.containerNumber) === cNorm
  })

  // 2. Find matching BOL
  const matchedBol = data.bols.find((b) => {
    const cNums = String(b.container_numbers || b.containerNumbers || "")
    return normalizeIdentifier(cNums).includes(cNorm) ||
      (matchedShipment && normalizeIdentifier(b.bol_number || b.id) === normalizeIdentifier(matchedShipment.referenceNumber || matchedShipment.id))
  }) || (matchedShipment ? { bol_number: matchedShipment.referenceNumber || matchedShipment.id } : null)

  const bolNum = matchedBol?.bol_number || matchedShipment?.referenceNumber || ""
  const bolNorm = normalizeIdentifier(bolNum)

  if (bolNum) {
    connectedEntities.push({
      id: bolNum,
      type: "bol",
      title: `BOL ${bolNum}`,
      subtitle: `${matchedBol?.shipper_name || matchedShipment?.shipper?.name || "Shipper"} → ${matchedBol?.consignee_name || matchedShipment?.consignee?.name || "Consignee"}`,
      status: matchedShipment?.status || "Active",
      badgeText: "Connected BOL",
      badgeColor: "bg-blue-100 text-blue-800",
      route: `/bol?id=${encodeURIComponent(bolNum)}`,
    })
  }

  if (matchedShipment) {
    connectedEntities.push({
      id: matchedShipment.id,
      type: "shipment",
      title: `Shipment ${matchedShipment.id}`,
      subtitle: `${matchedShipment.route?.origin || "Origin"} → ${matchedShipment.route?.finalDestination || "Destination"}`,
      status: matchedShipment.status,
      badgeText: "Shipment Master",
      badgeColor: "bg-emerald-100 text-emerald-800",
      route: `/shipments?id=${encodeURIComponent(matchedShipment.id)}`,
    })
  }

  // 3. Find matching Invoices
  const matchedInvoices = data.invoices.filter((inv) => {
    const iBol = normalizeIdentifier(inv.bol_number || inv.bolNumber || inv.bl_no || "")
    const iCont = normalizeIdentifier(inv.container_no || inv.containerNumber || inv.container || "")
    return (bolNorm && iBol === bolNorm) || (cNorm && iCont.includes(cNorm))
  })

  for (const inv of matchedInvoices) {
    const invNumber = inv.invoice_number || inv.invoiceNumber || inv.id || ""
    const total = Number(inv.total_amount ?? inv.totalAmount ?? 0)
    connectedEntities.push({
      id: invNumber,
      type: "invoice",
      title: `Invoice ${invNumber}`,
      subtitle: `Total: ${inv.currency || "$"}${total} | Status: ${inv.status || "UNPAID"}`,
      status: inv.status,
      badgeText: "Invoice",
      badgeColor: "bg-teal-100 text-teal-800",
      route: `/invoice?id=${encodeURIComponent(invNumber)}`,
    })
  }

  // 4. Find matching Documents
  const matchedDocuments = data.documents.filter((d) => {
    const dBol = normalizeIdentifier(d.bolNumber || "")
    return bolNorm && dBol === bolNorm
  })

  for (const doc of matchedDocuments) {
    connectedEntities.push({
      id: doc.id,
      type: "document",
      title: `${doc.documentType.toUpperCase()}: ${doc.documentNumber}`,
      subtitle: `BOL: ${doc.bolNumber} (${doc.status || "FINAL"})`,
      status: doc.status,
      badgeText: "Trade Doc",
      badgeColor: "bg-indigo-100 text-indigo-800",
    })
  }

  // 5. Find matching Ledger Entries
  let matchedLedgerEntriesCount = 0
  let ledgerBal = 0
  let ledgerAccountName = ""
  if (data.ledgerDb && data.ledgerDb.ledgerEntries) {
    for (const [accName, rows] of Object.entries(data.ledgerDb.ledgerEntries)) {
      if (Array.isArray(rows)) {
        const matchingRows = rows.filter((r) => {
          const rBol = normalizeIdentifier(r.barnamehNo || r.bolNo || "")
          const rCont = normalizeIdentifier(r.containerNo || "")
          return (bolNorm && rBol === bolNorm) || (cNorm && rCont.includes(cNorm))
        })
        if (matchingRows.length > 0) {
          matchedLedgerEntriesCount += matchingRows.length
          ledgerAccountName = accName
          const lastRow = rows[rows.length - 1]
          ledgerBal = Number(lastRow?.balance) || 0
          connectedEntities.push({
            id: accName,
            type: "ledger",
            title: `Ledger: ${accName}`,
            subtitle: `${matchingRows.length} linked entry(s) | Net Balance: $${ledgerBal.toLocaleString()}`,
            badgeText: "Ledger",
            badgeColor: "bg-purple-100 text-purple-800",
            route: `/accounting?account=${encodeURIComponent(accName)}`,
          })
        }
      }
    }
  }

  // 6. Find Payments
  const matchedPayments = data.payments.filter((p) => {
    const pBol = normalizeIdentifier(p.bolNumber || "")
    const pInv = normalizeIdentifier(p.invoiceNumber || "")
    return (bolNorm && pBol === bolNorm) || matchedInvoices.some((inv) => normalizeIdentifier(inv.invoice_number) === pInv)
  })

  for (const pay of matchedPayments) {
    connectedEntities.push({
      id: pay.id || pay.paymentNumber,
      type: "payment",
      title: `Payment ${pay.paymentNumber || pay.reference || "Receipt"}`,
      subtitle: `Amount: $${pay.amount || 0} (${pay.paymentDate || "N/A"})`,
      badgeText: "Payment",
      badgeColor: "bg-emerald-100 text-emerald-800",
    })
  }

  const invoiceTotal = matchedInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0)
  const invoicePaid = matchedInvoices.reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0)

  return {
    bolNumber: bolNum,
    bolCount: bolNum ? 1 : 0,
    shipmentCount: matchedShipment ? 1 : 0,
    containerNumbers: [containerNumber],
    containerCount: 1,
    shipperName: matchedBol?.shipper_name || matchedShipment?.shipper?.name,
    consigneeName: matchedBol?.consignee_name || matchedShipment?.consignee?.name,
    currentLocation: matchedShipment?.currentLocation || "In Transit",
    trackingStatus: matchedShipment?.status || "Active",
    eta: matchedShipment?.eta,
    etd: matchedShipment?.etd,
    vesselName: matchedShipment?.vessel?.vesselName,
    voyageNumber: matchedShipment?.vessel?.voyageNumber,
    truckNumber: matchedShipment?.truck?.afghanPlate || matchedBol?.truck_number,
    driverName: matchedShipment?.truck?.driverName || matchedBol?.driver_name,
    driverPhone: matchedShipment?.truck?.driverPhone,
    invoiceCount: matchedInvoices.length,
    invoiceTotal,
    invoicePaid,
    invoiceOutstanding: invoiceTotal - invoicePaid,
    ledgerAccount: ledgerAccountName,
    ledgerBalance: ledgerBal,
    ledgerCount: matchedLedgerEntriesCount,
    paymentCount: matchedPayments.length,
    documentCount: matchedDocuments.length,
    documentsReady: matchedDocuments.length >= 3,
    trackingMilestonesCount: matchedShipment?.milestones?.length || 0,
    connectedEntities,
  }
}

/**
 * Resolves connected records for a Bill of Lading (BOL) across all modules
 */
export function resolveBolConnectedRecords(
  bolNumber: string,
  data: SearchDatasets
): ConnectedRecordsSummary {
  const bolNorm = normalizeIdentifier(bolNumber)
  const connectedEntities: ConnectedEntityRef[] = []

  // 1. Find matching BOL and Shipment
  const matchedBol = data.bols.find((b) => normalizeIdentifier(b.bol_number || b.id) === bolNorm)
  const matchedShipment = data.shipments.find((s) => normalizeIdentifier(s.referenceNumber || s.id) === bolNorm)

  // 2. Extract containers
  const containerSet = new Set<string>()
  if (matchedShipment?.containers && Array.isArray(matchedShipment.containers)) {
    for (const c of matchedShipment.containers) {
      if (c.containerNumber) containerSet.add(c.containerNumber)
    }
  }
  if (matchedBol?.container_numbers) {
    const parts = String(matchedBol.container_numbers).split(/[\s,;\/]+/)
    for (const p of parts) {
      if (p.trim().length >= 8) containerSet.add(p.trim().toUpperCase())
    }
  }

  const containerNumbers = Array.from(containerSet)
  for (const cNum of containerNumbers) {
    connectedEntities.push({
      id: cNum,
      type: "container",
      title: `Container ${cNum}`,
      subtitle: `Status: ${matchedShipment?.status || "Active"} | Location: ${matchedShipment?.currentLocation || "In Transit"}`,
      status: matchedShipment?.status,
      badgeText: "Container",
      badgeColor: "bg-emerald-100 text-emerald-800",
      route: `/booking-containers?container=${encodeURIComponent(cNum)}`,
    })
  }

  // 3. Find Invoices
  const matchedInvoices = data.invoices.filter((inv) => {
    const iBol = normalizeIdentifier(inv.bol_number || inv.bolNumber || inv.bl_no || "")
    return iBol === bolNorm
  })

  for (const inv of matchedInvoices) {
    const invNumber = inv.invoice_number || inv.invoiceNumber || inv.id || ""
    const total = Number(inv.total_amount ?? inv.totalAmount ?? 0)
    const paid = Number(inv.paid_amount ?? inv.paidAmount ?? 0)
    const outstanding = Number(inv.outstanding_amount ?? inv.outstandingAmount ?? (total - paid))
    connectedEntities.push({
      id: invNumber,
      type: "invoice",
      title: `Invoice ${invNumber}`,
      subtitle: `Total: ${inv.currency || "$"}${total} | Outstanding: $${outstanding}`,
      status: inv.status,
      badgeText: "Invoice",
      badgeColor: "bg-teal-100 text-teal-800",
      route: `/invoice?id=${encodeURIComponent(invNumber)}`,
    })
  }

  // 4. Find Documents
  const matchedDocuments = data.documents.filter((d) => normalizeIdentifier(d.bolNumber || "") === bolNorm)
  for (const doc of matchedDocuments) {
    connectedEntities.push({
      id: doc.id,
      type: "document",
      title: `${doc.documentType.toUpperCase()}: ${doc.documentNumber}`,
      subtitle: `Status: ${doc.status || "FINAL"}`,
      status: doc.status,
      badgeText: "Trade Doc",
      badgeColor: "bg-indigo-100 text-indigo-800",
    })
  }

  // 5. Find Ledger entries
  let matchedLedgerEntriesCount = 0
  let ledgerBal = 0
  let ledgerAccountName = ""
  if (data.ledgerDb && data.ledgerDb.ledgerEntries) {
    for (const [accName, rows] of Object.entries(data.ledgerDb.ledgerEntries)) {
      if (Array.isArray(rows)) {
        const matchingRows = rows.filter((r) => normalizeIdentifier(r.barnamehNo || r.bolNo || "") === bolNorm)
        if (matchingRows.length > 0) {
          matchedLedgerEntriesCount += matchingRows.length
          ledgerAccountName = accName
          const lastRow = rows[rows.length - 1]
          ledgerBal = Number(lastRow?.balance) || 0
          connectedEntities.push({
            id: accName,
            type: "ledger",
            title: `Ledger: ${accName}`,
            subtitle: `${matchingRows.length} entry(s) | Net Balance: $${ledgerBal.toLocaleString()}`,
            badgeText: "Ledger",
            badgeColor: "bg-purple-100 text-purple-800",
            route: `/accounting?account=${encodeURIComponent(accName)}`,
          })
        }
      }
    }
  }

  // 6. Find Payments
  const matchedPayments = data.payments.filter((p) => {
    const pBol = normalizeIdentifier(p.bolNumber || "")
    const pInv = normalizeIdentifier(p.invoiceNumber || "")
    return pBol === bolNorm || matchedInvoices.some((inv) => normalizeIdentifier(inv.invoice_number) === pInv)
  })

  for (const pay of matchedPayments) {
    connectedEntities.push({
      id: pay.id || pay.paymentNumber,
      type: "payment",
      title: `Payment ${pay.paymentNumber || pay.reference || "Receipt"}`,
      subtitle: `Amount: $${pay.amount || 0} (${pay.paymentDate || "N/A"})`,
      badgeText: "Payment",
      badgeColor: "bg-emerald-100 text-emerald-800",
    })
  }

  const invoiceTotal = matchedInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0)
  const invoicePaid = matchedInvoices.reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0)

  return {
    bolNumber,
    bolCount: 1,
    shipmentCount: matchedShipment ? 1 : 0,
    containerNumbers,
    containerCount: containerNumbers.length,
    shipperName: matchedBol?.shipper_name || matchedShipment?.shipper?.name,
    consigneeName: matchedBol?.consignee_name || matchedShipment?.consignee?.name,
    currentLocation: matchedShipment?.currentLocation || "In Transit",
    trackingStatus: matchedShipment?.status || "Active",
    eta: matchedShipment?.eta,
    etd: matchedShipment?.etd,
    vesselName: matchedShipment?.vessel?.vesselName,
    voyageNumber: matchedShipment?.vessel?.voyageNumber,
    truckNumber: matchedShipment?.truck?.afghanPlate || matchedBol?.truck_number,
    driverName: matchedShipment?.truck?.driverName || matchedBol?.driver_name,
    driverPhone: matchedShipment?.truck?.driverPhone,
    invoiceCount: matchedInvoices.length,
    invoiceTotal,
    invoicePaid,
    invoiceOutstanding: invoiceTotal - invoicePaid,
    ledgerAccount: ledgerAccountName,
    ledgerBalance: ledgerBal,
    ledgerCount: matchedLedgerEntriesCount,
    paymentCount: matchedPayments.length,
    documentCount: matchedDocuments.length,
    documentsReady: matchedDocuments.length >= 3,
    trackingMilestonesCount: matchedShipment?.milestones?.length || 0,
    connectedEntities,
  }
}

/**
 * Resolves connected records for a Company / Client across all modules
 */
export function resolveCompanyConnectedRecords(
  companyName: string,
  data: SearchDatasets
): ConnectedRecordsSummary {
  const normName = normalizeCompanyName(companyName)
  const connectedEntities: ConnectedEntityRef[] = []

  // 1. Find BOLs where company is Shipper or Consignee
  const matchedBols = data.bols.filter((b) => {
    const sNorm = normalizeCompanyName(b.shipper_name || "")
    const cNorm = normalizeCompanyName(b.consignee_name || "")
    return sNorm.includes(normName) || cNorm.includes(normName) || normName.includes(sNorm) || normName.includes(cNorm)
  })

  // 2. Find Invoices
  const matchedInvoices = data.invoices.filter((inv) => {
    const clientNorm = normalizeCompanyName(inv.buyer_name || inv.client_name || "")
    return clientNorm.includes(normName) || normName.includes(clientNorm)
  })

  // 3. Find Ledger
  let ledgerBal = 0
  let ledgerRowCount = 0
  if (data.ledgerDb && data.ledgerDb.ledgerEntries) {
    for (const [accName, rows] of Object.entries(data.ledgerDb.ledgerEntries)) {
      const accNorm = normalizeCompanyName(accName)
      if (accNorm.includes(normName) || normName.includes(accNorm)) {
        if (Array.isArray(rows)) {
          ledgerRowCount += rows.length
          const lastRow = rows[rows.length - 1]
          ledgerBal = Number(lastRow?.balance) || 0
        }
      }
    }
  }

  // 4. Find Containers from matched BOLs
  const containerSet = new Set<string>()
  for (const b of matchedBols) {
    if (b.container_numbers) {
      const parts = String(b.container_numbers).split(/[\s,;\/]+/)
      for (const p of parts) {
        if (p.trim().length >= 8) containerSet.add(p.trim().toUpperCase())
      }
    }
  }

  const invoiceTotal = matchedInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0)
  const invoicePaid = matchedInvoices.reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0)

  return {
    bolCount: matchedBols.length,
    containerNumbers: Array.from(containerSet),
    containerCount: containerSet.size,
    invoiceCount: matchedInvoices.length,
    invoiceTotal,
    invoicePaid,
    invoiceOutstanding: invoiceTotal - invoicePaid,
    ledgerAccount: companyName,
    ledgerBalance: ledgerBal,
    ledgerCount: ledgerRowCount,
    connectedEntities,
  }
}
