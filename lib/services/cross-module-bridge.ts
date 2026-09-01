/**
 * Sky Ariana Cross-Module Data Interconnect & Workflow Bridge
 * Enables 1-click end-to-end translation across:
 * Export Quote -> Bill of Lading (BOL) -> Sky CMR Waybill -> ACCI Chamber -> Commercial Invoice -> Sky Bank Voucher
 */

import { BillOfLadingFormData, RouteStop } from "@/lib/types/bill-of-lading"
import { Invoice, InvoiceItem } from "@/lib/types"

export interface ExportQuotePayload {
  corridorName: string
  origin: string
  destination: string
  shipperName?: string
  consigneeName?: string
  commodity: string
  packagesCount?: number
  grossWeightKg?: number
  netWeightKg?: number
  containerNumber?: string
  sealNumber?: string
  truckNumber?: string
  driverName?: string
  driverPhone?: string
  totalFreightUSD: number
  selectedRouteStops?: Array<{
    location: string
    locationPersian?: string
    costUSD?: number
    transportMode?: string
  }>
  reeferSettings?: {
    isReefer?: boolean
    temperatureC?: string
    escortRequired?: boolean
    pluggingFeeUSD?: number
  }
}

/**
 * 1. Convert an Export Logistics Quote into a Bill of Lading Form Data structure
 */
export function convertQuoteToBOL(quote: ExportQuotePayload): Partial<BillOfLadingFormData> {
  const stops: RouteStop[] = (quote.selectedRouteStops || []).map((stop, idx) => ({
    id: `stop-${Date.now()}-${idx}`,
    location: stop.location,
    locationPersian: stop.locationPersian || "",
    stopOrder: idx + 1,
    costUSD: stop.costUSD || 0,
    transportMode: (stop.transportMode as any) || "truck",
    stopLabel: idx === 0 ? "Origin Terminal" : idx === (quote.selectedRouteStops?.length || 1) - 1 ? "Final Port/Border" : "Transit Hub",
  }))

  const packages = quote.packagesCount || 0
  const grossWeight = quote.grossWeightKg || 0
  const ratePerKg = grossWeight > 0 && quote.totalFreightUSD > 0 ? (quote.totalFreightUSD / grossWeight).toFixed(3) : ""

  return {
    bol_number: `BOL-EXP-${Date.now().toString().slice(-6)}`,
    issue_date: new Date().toISOString().split("T")[0],
    shipper_name: quote.shipperName || "SKY ARIANA EXPORT CLIENT",
    consignee_name: quote.consigneeName || "INTERNATIONAL RECEIVER / CONSIGNEE",
    port_of_loading: quote.origin,
    port_of_discharge: quote.destination,
    place_of_delivery: quote.destination,
    cargo_description: quote.commodity + (quote.reeferSettings?.isReefer ? ` (Reefer Temp: ${quote.reeferSettings.temperatureC || "-18°C"})` : ""),
    number_of_packages: packages > 0 ? String(packages) : "",
    gross_weight: grossWeight > 0 ? String(grossWeight) : "",
    net_weight: quote.netWeightKg ? String(quote.netWeightKg) : "",
    container_numbers: quote.containerNumber || "",
    seal_numbers: quote.sealNumber || "",
    truck_number: quote.truckNumber || "",
    driver_name: quote.driverName || "",
    driver_contact: quote.driverPhone || "",
    rate_per_kgs: ratePerKg,
    goods_value: quote.totalFreightUSD > 0 ? String(quote.totalFreightUSD) : "",
    freight_terms: "PREPAID",
    routes: stops,
    notes_1: quote.reeferSettings?.isReefer ? `Reefer Transit Escort: ${quote.reeferSettings.escortRequired ? "Active" : "Standard"} | Plugging: $${quote.reeferSettings.pluggingFeeUSD || 0}` : "Standard Transit Corridor",
    notes_1_label: "Export Transit Notes",
    notes_1_theme: "blue",
  }
}

/**
 * 2. Convert a Bill of Lading (BOL) into a Sky CMR International Consignment Note
 */
export function convertBOLToCMR(bol: Partial<BillOfLadingFormData>): Record<string, any> {
  return {
    cmrNumber: bol.bol_number || `CMR-${Date.now().toString().slice(-6)}`,
    sender: {
      name: bol.shipper_name || "",
      address: bol.shipper_address || "",
      country: "Afghanistan",
    },
    consignee: {
      name: bol.consignee_name || "",
      address: bol.consignee_address || "",
      country: bol.port_of_discharge || "",
    },
    takingOverPlace: {
      city: bol.port_of_loading || "Herat / Kabul",
      country: "Afghanistan",
      date: bol.issue_date || new Date().toISOString().split("T")[0],
    },
    deliveryPlace: {
      city: bol.port_of_discharge || bol.place_of_delivery || "",
      country: "",
    },
    carrier: {
      name: "SKY ARIANA LIMITED",
      address: "Logistics Division, Kabul & Herat",
      truckPlate: bol.truck_number || "",
      trailerPlate: "",
      driverName: bol.driver_name || "",
      driverPhone: bol.driver_contact || "",
    },
    goods: {
      description: bol.cargo_description || "",
      packagesCount: bol.number_of_packages || "",
      grossWeightKg: bol.gross_weight || "",
      containerNo: bol.container_numbers || "",
      sealNo: bol.seal_numbers || "",
    },
    customsInstructions: bol.notes_1 || "Direct international customs transit under TIR / CMR convention",
  }
}

/**
 * 3. Convert a Bill of Lading into a Commercial Invoice
 */
export function convertBOLToInvoice(bol: Partial<BillOfLadingFormData>, companyId = "default"): Partial<Invoice> {
  const totalAmount = Number(bol.goods_value) || 0
  const grossWeight = bol.gross_weight || "0"
  const packages = bol.number_of_packages || "1"

  const items: InvoiceItem[] = [
    {
      id: `item-${Date.now()}-1`,
      sNo: 1,
      description: `International Freight: ${bol.cargo_description || "Cargo Transportation"} (${bol.port_of_loading || "Origin"} -> ${bol.port_of_discharge || "Destination"})`,
      containerSize: bol.container_size || "40FT",
      quantity: packages,
      unit: "CTN",
      grossWeight: grossWeight,
      price: totalAmount,
    },
  ]

  return {
    id: `inv-${Date.now()}`,
    invoiceNo: `INV-${bol.bol_number ? bol.bol_number.replace(/[^a-zA-Z0-9]/g, "") : Date.now().toString().slice(-6)}`,
    companyId: companyId,
    companyName: "Sky Ariana Limited",
    shipper: bol.shipper_name || "Valued Shipper",
    consignee: bol.consignee_name || "Valued Consignee",
    date: bol.issue_date || new Date().toISOString().split("T")[0],
    origin: bol.port_of_loading || "",
    destination: bol.port_of_discharge || "",
    blNo: bol.bol_number || "",
    containers: bol.container_numbers || "",
    items: items,
    grandTotal: totalAmount,
    exchangeRate: 1,
    preparedBy: "Accounts Dept",
  }
}

/**
 * 4. Convert an Invoice into a Bank / Cash Voucher
 */
export function convertInvoiceToBankVoucher(invoice: Partial<Invoice>): Record<string, any> {
  return {
    voucherNumber: `VCH-${Date.now().toString().slice(-6)}`,
    type: "RECEIPT",
    date: invoice.date || new Date().toISOString().split("T")[0],
    clientName: invoice.consignee || invoice.shipper || "",
    amount: invoice.grandTotal || 0,
    currency: "USD",
    referenceInvoice: invoice.invoiceNo || "",
    description: `Settlement for Invoice #${invoice.invoiceNo || ""} - ${invoice.consignee || ""}`,
    postedToLedger: false,
  }
}

