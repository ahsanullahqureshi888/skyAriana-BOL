import { InvoiceMatch, ServiceOrder } from "../types/procurement"
import { SupplierBillRecord, SupplierBillItem } from "../types/finance"
import { saveSupplierBill, nextSupplierBillNumber } from "./finance-storage-service"

export async function generateDraftPayableFromMatch(match: InvoiceMatch, order: ServiceOrder, supplierName: string): Promise<void> {
  if (match.matchStatus !== "MATCHED" && match.matchStatus !== "VARIANCE") {
    console.warn("Only Matched or Variance approved matches can generate a payable.")
    return
  }

  const billNumber = await nextSupplierBillNumber()
  
  const bolNumbers = order.bolId ? [order.bolId] : []
  
  const item: SupplierBillItem = {
    id: `item-${Date.now()}`,
    description: `Service Order ${order.id}: ${order.service} - ${order.description}`,
    costCategory: mapServiceToChargeType(order.service),
    quantity: order.quantity,
    rate: order.unitCost,
    amount: match.invoiceAmount,
    currency: match.currency,
    bolNumber: order.bolId
  }

  const bill: SupplierBillRecord = {
    id: `sbill-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    billNumber,
    supplierId: match.supplierId,
    supplierName,
    billDate: new Date().toISOString().split('T')[0],
    dueDate: match.dueDate || new Date().toISOString().split('T')[0],
    currency: match.currency,
    baseCurrency: "USD",
    exchangeRate: 1, // Will be updated by Finance
    bolNumbers,
    shipmentId: order.shipmentId,
    supplierInvoiceNumber: match.invoiceId,
    items: [item],
    subtotal: match.invoiceAmount,
    tax: 0,
    discount: 0,
    totalAmount: match.invoiceAmount,
    baseCurrencyTotal: match.invoiceAmount, // Assuming USD for now, finance edits it later
    paidAmount: 0,
    outstandingPayable: match.invoiceAmount,
    status: "draft",
    postedToLedger: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: `Auto-generated from Procurement Match ${match.id}. Variance: ${match.variance}`
  }

  await saveSupplierBill(bill)
}

function mapServiceToChargeType(service: string): any {
  switch (service) {
    case "ROAD_FREIGHT": return "truck"
    case "SEA_FREIGHT": return "shipping_line"
    case "AIR_FREIGHT": return "freight"
    case "CUSTOMS": return "customs"
    case "BORDER_HANDLING": return "handling"
    case "PORT_SERVICE": return "port"
    case "DOCUMENTATION": return "documentation"
    case "CONTAINER_DEPOT": return "container"
    default: return "other"
  }
}
