import fs from "fs"
import path from "path"
import { getDataPath } from "@/lib/server-paths"

export interface CurrencyExchange {
  enabled: boolean
  baseCurrency: string
  targetCurrency: string
  exchangeRate: string
  exchangeDate: string
  convertedTotal: string
  notes: string
}

export interface InvoiceItem {
  id: string
  date?: string
  description: string
  containerNo?: string
  quantity: string
  unit?: string
  unitPrice: string
  currency?: string
}

export interface InvoiceRecord {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  payment_terms?: string
  currency?: string
  invoice_type?: string
  seller_name: string
  seller_logo?: string
  seller_tagline?: string
  seller_address: string
  seller_contact: string
  seller_website?: string
  seller_license?: string
  seller_registration?: string
  seller_tax_number?: string
  buyer_name: string
  buyer_address: string
  buyer_contact: string
  buyer_contact_person?: string
  buyer_phone?: string
  buyer_email?: string
  buyer_tax_number?: string
  shipper?: string
  shipment_type?: string
  container_no?: string
  seal_no?: string
  truck_no?: string
  driver_name?: string
  driver_phone?: string
  booking_no?: string
  bl_no?: string
  invoice_ref_no?: string
  route?: string
  origin?: string
  destination?: string
  final_destination?: string
  vessel_voyage?: string
  cargo_description?: string
  commodity?: string
  weight?: string
  shipment_quantity?: string
  package_count?: string
  container_size?: string
  items: InvoiceItem[]
  freight_charges?: string
  demurrage_charges?: string
  detention_charges?: string
  documentation_charges?: string
  port_charges?: string
  truck_charges?: string
  other_charges?: string
  tax: string
  discount: string
  bank_name?: string
  account_name?: string
  account_number?: string
  iban?: string
  swift_code?: string
  branch?: string
  qr_reference?: string
  attachments?: string
  notes: string
  terms: string
  payment_status?: string
  prepared_by?: string
  approved_by?: string
  signature_position?: string
  currencyExchange?: CurrencyExchange
  created_at: string
  updated_at: string
}

export interface AccountRecord {
  id: string
  name: string
  address: string
  contact: string
  type: "import" | "export" | "both"
  created_at: string
}

const invoicesFile = getDataPath(".local-invoices.json")
const accountsFile = getDataPath(".local-accounts.json")
const invoiceCounterFile = getDataPath(".invoice-counter")

import { mutateJsonFile, readJsonFile } from "./blob-db"

export async function nextInvoiceNumber() {
  let counter = 1
  await mutateJsonFile<number>(invoiceCounterFile, 1, (current) => {
    counter = Number.isSafeInteger(current) && current > 0 ? current : 1
    return counter + 1
  })
  return `INV-${new Date().getFullYear()}-${String(counter).padStart(4, "0")}`
}

export async function getAllInvoices() {
  const invoices = await readJsonFile<InvoiceRecord[]>(invoicesFile, [])
  return invoices.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
}

export async function getInvoice(id: string) {
  const invoices = await getAllInvoices()
  return invoices.find((invoice) => invoice.id === id || invoice.invoice_number === id) || null
}

export async function saveInvoice(data: Partial<InvoiceRecord>) {
  const now = new Date().toISOString()
  const invoiceNumber = data.invoice_number || (await nextInvoiceNumber())
  const invoice: InvoiceRecord = {
    id: data.id || invoiceNumber,
    invoice_number: invoiceNumber,
    invoice_date: data.invoice_date || new Date().toISOString().split("T")[0],
    due_date: data.due_date || "",
    payment_terms: data.payment_terms || "Due on Receipt",
    currency: data.currency || "USD",
    invoice_type: data.invoice_type || "Freight Invoice",
    seller_name: data.seller_name || "",
    seller_logo: data.seller_logo || "",
    seller_tagline: data.seller_tagline || "",
    seller_address: data.seller_address || "",
    seller_contact: data.seller_contact || "",
    seller_website: data.seller_website || "",
    seller_license: data.seller_license || "",
    seller_registration: data.seller_registration || "",
    seller_tax_number: data.seller_tax_number || "",
    buyer_name: data.buyer_name || "",
    buyer_address: data.buyer_address || "",
    buyer_contact: data.buyer_contact || "",
    buyer_contact_person: data.buyer_contact_person || "",
    buyer_phone: data.buyer_phone || "",
    buyer_email: data.buyer_email || "",
    buyer_tax_number: data.buyer_tax_number || "",
    shipper: data.shipper || "",
    shipment_type: data.shipment_type || "",
    container_no: data.container_no || "",
    seal_no: data.seal_no || "",
    truck_no: data.truck_no || "",
    driver_name: data.driver_name || "",
    driver_phone: data.driver_phone || "",
    booking_no: data.booking_no || "",
    bl_no: data.bl_no || "",
    invoice_ref_no: data.invoice_ref_no || "",
    route: data.route || "",
    origin: data.origin || "",
    destination: data.destination || "",
    final_destination: data.final_destination || "",
    vessel_voyage: data.vessel_voyage || "",
    cargo_description: data.cargo_description || "",
    commodity: data.commodity || "",
    weight: data.weight || "",
    shipment_quantity: data.shipment_quantity || "",
    package_count: data.package_count || "",
    container_size: data.container_size || "",
    items: data.items?.length
      ? data.items.map((item) => ({
          id: item.id || crypto.randomUUID(),
          date: item.date || "",
          description: item.description || "",
          containerNo: item.containerNo || "",
          quantity: item.quantity || "1",
          unit: item.unit || "Unit",
          unitPrice: item.unitPrice || "0",
          currency: item.currency || "",
        }))
      : [{ id: crypto.randomUUID(), description: "", containerNo: "", quantity: "1", unit: "Unit", unitPrice: "0" }],
    freight_charges: data.freight_charges || "0",
    demurrage_charges: data.demurrage_charges || "0",
    detention_charges: data.detention_charges || "0",
    documentation_charges: data.documentation_charges || "0",
    port_charges: data.port_charges || "0",
    truck_charges: data.truck_charges || "0",
    other_charges: data.other_charges || "0",
    tax: data.tax || "0",
    discount: data.discount || "0",
    bank_name: data.bank_name || "",
    account_name: data.account_name || "",
    account_number: data.account_number || "",
    iban: data.iban || "",
    swift_code: data.swift_code || "",
    branch: data.branch || "",
    qr_reference: data.qr_reference || "",
    attachments: data.attachments || "",
    notes: data.notes || "",
    terms: data.terms || "",
    payment_status: data.payment_status || "Unpaid",
    prepared_by: data.prepared_by || "",
    approved_by: data.approved_by || "",
    signature_position: data.signature_position || "",
    currencyExchange: data.currencyExchange || {
      enabled: false,
      baseCurrency: "USD",
      targetCurrency: "AFN",
      exchangeRate: "",
      exchangeDate: "",
      convertedTotal: "",
      notes: ""
    },
    created_at: data.created_at || now,
    updated_at: now,
  }

  await mutateJsonFile<InvoiceRecord[]>(invoicesFile, [], (current) => {
    const invoices = Array.isArray(current) ? current : []
    return [invoice, ...invoices.filter((item) => item.id !== invoice.id && item.invoice_number !== invoice.invoice_number)]
  })
  return invoice
}

export async function deleteInvoice(id: string) {
  await mutateJsonFile<InvoiceRecord[]>(invoicesFile, [], (current) =>
    (Array.isArray(current) ? current : []).filter((invoice) => invoice.id !== id && invoice.invoice_number !== id)
  )
}

export async function getAllAccounts() {
  return readJsonFile<AccountRecord[]>(accountsFile, [])
}

export async function saveAccounts(accounts: Omit<AccountRecord, "id" | "created_at">[]) {
  return mutateJsonFile<AccountRecord[]>(accountsFile, [], (current) => {
    const existing = Array.isArray(current) ? current : []
    const byName = new Map(existing.map((account) => [account.name.trim().toLowerCase(), account]))
    for (const account of accounts) {
      const key = account.name.trim().toLowerCase()
      if (!key) continue
      byName.set(key, {
        id: byName.get(key)?.id || crypto.randomUUID(),
        created_at: byName.get(key)?.created_at || new Date().toISOString(),
        ...account,
      })
    }
    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name))
  })
}
