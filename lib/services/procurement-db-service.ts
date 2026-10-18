import { readJsonFile, writeJsonFile } from "./blob-db"
import { applyServiceOrderToShipment } from "./procurement-shipment-integration"
import {
  ProcurementRequest,
  SupplierRFQ,
  SupplierQuote,
  ServiceOrder,
  SupplierContract,
  InvoiceMatch,
  ProcurementRequestStatus,
  RFQStatus,
  SupplierQuoteStatus,
  ServiceOrderStatus,
  ContractStatus,
  InvoiceMatchStatus,
  OrderServiceType
} from "../types/procurement"

const DB_FILES = {
  REQUESTS: "procurement_requests.json",
  RFQS: "procurement_rfqs.json",
  QUOTES: "procurement_quotes.json",
  ORDERS: "procurement_orders.json",
  CONTRACTS: "procurement_contracts.json",
  INVOICE_MATCHES: "procurement_invoice_matches.json"
}

// -----------------------------------------------------
// PROCUREMENT REQUESTS
// -----------------------------------------------------
export async function getProcurementRequests(): Promise<ProcurementRequest[]> {
  return readJsonFile<ProcurementRequest[]>(DB_FILES.REQUESTS, [])
}

export async function saveProcurementRequest(request: ProcurementRequest): Promise<void> {
  const requests = await getProcurementRequests()
  const index = requests.findIndex(r => r.id === request.id)
  if (index >= 0) {
    requests[index] = { ...request, updatedAt: new Date().toISOString() }
  } else {
    requests.push({ ...request, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  }
  await writeJsonFile(DB_FILES.REQUESTS, requests)
}

// -----------------------------------------------------
// RFQs
// -----------------------------------------------------
export async function getRFQs(): Promise<SupplierRFQ[]> {
  return readJsonFile<SupplierRFQ[]>(DB_FILES.RFQS, [])
}

export async function saveRFQ(rfq: SupplierRFQ): Promise<void> {
  const rfqs = await getRFQs()
  const index = rfqs.findIndex(r => r.id === rfq.id)
  if (index >= 0) {
    rfqs[index] = rfq
  } else {
    rfqs.push(rfq)
  }
  await writeJsonFile(DB_FILES.RFQS, rfqs)
}

// -----------------------------------------------------
// QUOTES
// -----------------------------------------------------
export async function getSupplierQuotes(): Promise<SupplierQuote[]> {
  return readJsonFile<SupplierQuote[]>(DB_FILES.QUOTES, [])
}

export async function saveSupplierQuote(quote: SupplierQuote): Promise<void> {
  const quotes = await getSupplierQuotes()
  const index = quotes.findIndex(q => q.id === quote.id)
  if (index >= 0) {
    quotes[index] = quote
  } else {
    quotes.push(quote)
  }
  await writeJsonFile(DB_FILES.QUOTES, quotes)
}

// -----------------------------------------------------
// ORDERS
// -----------------------------------------------------
export async function getServiceOrders(): Promise<ServiceOrder[]> {
  return readJsonFile<ServiceOrder[]>(DB_FILES.ORDERS, [])
}

export async function saveServiceOrder(order: ServiceOrder): Promise<void> {
  const orders = await getServiceOrders()
  const index = orders.findIndex(o => o.id === order.id)
  
  let orderToSave = order
  if (index >= 0) {
    orderToSave = { ...order, updatedAt: new Date().toISOString() }
    orders[index] = orderToSave
  } else {
    orderToSave = { ...order, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    orders.push(orderToSave)
  }
  await writeJsonFile(DB_FILES.ORDERS, orders)
  
  // Asynchronously propagate to shipment costs
  applyServiceOrderToShipment(orderToSave).catch(err => {
    console.error("Failed to apply service order expected cost to shipment:", err)
  })
}

// -----------------------------------------------------
// CONTRACTS
// -----------------------------------------------------
export async function getContracts(): Promise<SupplierContract[]> {
  return readJsonFile<SupplierContract[]>(DB_FILES.CONTRACTS, [])
}

export async function saveContract(contract: SupplierContract): Promise<void> {
  const contracts = await getContracts()
  const index = contracts.findIndex(c => c.id === contract.id)
  if (index >= 0) {
    contracts[index] = { ...contract, updatedAt: new Date().toISOString() }
  } else {
    contracts.push({ ...contract, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  }
  await writeJsonFile(DB_FILES.CONTRACTS, contracts)
}

// -----------------------------------------------------
// INVOICE MATCHES
// -----------------------------------------------------
import { generateDraftPayableFromMatch } from "./procurement-finance-integration"

export async function getInvoiceMatches(): Promise<InvoiceMatch[]> {
  return readJsonFile<InvoiceMatch[]>(DB_FILES.INVOICE_MATCHES, [])
}

export async function saveInvoiceMatch(match: InvoiceMatch, order?: ServiceOrder, supplierName?: string): Promise<void> {
  const matches = await getInvoiceMatches()
  const index = matches.findIndex(m => m.id === match.id)
  
  let matchToSave = match
  if (index >= 0) {
    matchToSave = { ...match, updatedAt: new Date().toISOString() }
    matches[index] = matchToSave
  } else {
    matchToSave = { ...match, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    matches.push(matchToSave)
  }
  await writeJsonFile(DB_FILES.INVOICE_MATCHES, matches)
  
  // If matched or variance approved, push to Finance as Draft Payable
  if (order && supplierName && (matchToSave.matchStatus === "MATCHED" || matchToSave.matchStatus === "VARIANCE")) {
    generateDraftPayableFromMatch(matchToSave, order, supplierName).catch(err => {
      console.error("Failed to generate draft payable:", err)
    })
  }
}
