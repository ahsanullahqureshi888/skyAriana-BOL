"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { toast } from "sonner"
import {
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  FileCheck2,
  FileText,
  ImageUp,
  Landmark,
  MapPin,
  Package,
  Paperclip,
  PenLine,
  Plane,
  Plus,
  Printer,
  RefreshCw,
  Route,
  Save,
  Search,
  Settings,
  Ship,
  TrainFront,
  Trash2,
  Truck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type InvoiceItem = {
  id: string
  date?: string
  description: string
  containerNo: string
  commodity?: string
  quantity: string
  unit: string
  unitPrice: string
  currency?: string
}

type CurrencyOption = {
  code: string
  label: string
  symbol: string
  direction: "ltr" | "rtl"
  custom?: boolean
  rateFromIRR?: number
}

type CurrencyExchange = {
  enabled: boolean
  baseCurrency: string
  targetCurrency: string
  exchangeRate: string
  exchangeDate: string
  convertedTotal: string
  notes: string
}

type InvoiceForm = {
  id?: string
  invoice_number: string
  invoice_date: string
  due_date: string
  payment_terms: string
  currency: string
  invoice_type: string
  seller_name: string
  seller_logo?: string
  seller_tagline: string
  seller_address: string
  seller_contact: string
  seller_website: string
  seller_license: string
  seller_registration: string
  seller_tax_number: string
  buyer_name: string
  buyer_address: string
  buyer_contact_person: string
  buyer_phone: string
  buyer_email: string
  buyer_tax_number: string
  shipper: string
  shipment_type: string
  container_no: string
  seal_no: string
  truck_no: string
  driver_name: string
  driver_phone: string
  booking_no: string
  bl_no: string
  invoice_ref_no: string
  route: string
  origin: string
  destination: string
  final_destination: string
  vessel_voyage: string
  cargo_description: string
  commodity: string
  weight: string
  shipment_quantity: string
  package_count: string
  container_size: string
  items: InvoiceItem[]
  freight_charges: string
  demurrage_charges: string
  detention_charges: string
  documentation_charges: string
  port_charges: string
  truck_charges: string
  other_charges: string
  tax: string
  discount: string
  bank_name: string
  account_name: string
  account_number: string
  iban: string
  swift_code: string
  branch: string
  qr_reference: string
  attachments: string
  notes: string
  terms: string
  payment_status: string
  prepared_by: string
  approved_by: string
  signature_position: string
  currencyExchange: CurrencyExchange
}

const today = () => new Date().toISOString().split("T")[0]

const currencies: CurrencyOption[] = [
  { code: "USD", label: "USD - US Dollar", symbol: "$", direction: "ltr" },
  { code: "AFN", label: "AFN - Afghan Afghani / افغانۍ", symbol: "AFN", direction: "ltr" },
  { code: "IRR", label: "IRR - Iranian Rial / ریال ایران", symbol: "IRR", direction: "rtl" },
  { code: "TOMAN", label: "Toman / تومان", symbol: "تومان", direction: "rtl", custom: true, rateFromIRR: 10 },
  { code: "AED", label: "AED - UAE Dirham / درهم", symbol: "AED", direction: "rtl" },
  { code: "PKR", label: "PKR - Pakistani Rupee / روپیہ", symbol: "Rs", direction: "rtl" },
  { code: "INR", label: "INR - Indian Rupee / ₹", symbol: "₹", direction: "ltr" },
]

const currencyCodes = currencies.map((currency) => currency.code)

const getCurrencyLabel = (code: string) => currencies.find((currency) => currency.code === code)?.label || code

const invoiceTypes = [
  "Transport Invoice",
  "Freight Invoice",
  "Demurrage Invoice",
  "Detention Invoice",
  "Container Invoice",
  "Customs Invoice",
  "Port Charges Invoice",
  "Other Logistics Invoice"
]

const shipmentTypes = ["Truck", "Container", "LCL", "FCL", "Rail", "Air Freight"]

const emptyItem = (): InvoiceItem => ({
  id: crypto.randomUUID(),
  date: "",
  description: "Truck Transportation",
  containerNo: "",
  commodity: "",
  quantity: "1",
  unit: "Trip",
  unitPrice: "0",
  currency: "",
})

const emptyInvoice = (): InvoiceForm => ({
  invoice_number: "",
  invoice_date: today(),
  due_date: "",
  payment_terms: "Due on Receipt",
  currency: "USD",
  invoice_type: "Freight Invoice",
  seller_name: "SKY ARIANA LIMITED",
  seller_logo: "/images/account-ledger-logo.png",
  seller_tagline: "International Logistics & Freight Forwarding",
  seller_address: "2nd Floor, 16 No. Office, Shahidano, Chowk, Etimad Rahmi Market, Kandahar, Afghanistan",
  seller_contact: "info@skyariana.com, transport@skyariana.com | +93 700 939 365, +93 711 435 529",
  seller_website: "www.skyariana.com",
  seller_license: "2401-2198",
  seller_registration: "",
  seller_tax_number: "",
  buyer_name: "",
  buyer_address: "",
  buyer_contact_person: "",
  buyer_phone: "",
  buyer_email: "",
  buyer_tax_number: "",
  shipper: "",
  shipment_type: "Container",
  container_no: "",
  seal_no: "",
  truck_no: "",
  driver_name: "",
  driver_phone: "",
  booking_no: "",
  bl_no: "",
  invoice_ref_no: "",
  route: "",
  origin: "Kandahar, Afghanistan",
  destination: "",
  final_destination: "",
  vessel_voyage: "",
  cargo_description: "",
  commodity: "",
  weight: "",
  shipment_quantity: "",
  package_count: "",
  container_size: "",
  items: [emptyItem()],
  freight_charges: "",
  demurrage_charges: "",
  detention_charges: "",
  documentation_charges: "",
  port_charges: "",
  truck_charges: "",
  other_charges: "",
  tax: "",
  discount: "",
  bank_name: "",
  account_name: "SKY ARIANA LIMITED",
  account_number: "",
  iban: "",
  swift_code: "",
  branch: "",
  qr_reference: "",
  attachments: "BL Copy, POD, Delivery Receipt, Container Photos, Transport Documents",
  notes: "Transportation and freight forwarding services completed as per customer instructions.",
  terms:
    "Payment due within agreed terms. Demurrage and detention charges are subject to shipping line tariffs. Any dispute shall be settled according to Afghan commercial law. All charges are in USD unless otherwise specified.",
  payment_status: "Unpaid",
  prepared_by: "Ahsanullah QURESHI",
  approved_by: "HAJI SHABIR AHMAD ALOKOZAY",
  signature_position: "Accounts Department",
  currencyExchange: {
    enabled: false,
    baseCurrency: "USD",
    targetCurrency: "AFN",
    exchangeRate: "",
    exchangeDate: "",
    convertedTotal: "",
    notes: "",
  },
})

const numberValue = (value: string | number | undefined) => {
  const parsed = Number(String(value || "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/)?.[0] || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const isEmpty = (value?: string | null) => !value || String(value).trim().length === 0
const isBlank = (value?: string | null) => value === null || value === undefined || String(value).trim().length === 0
const hasValue = (value?: string | null) => !isBlank(value)
const toNumber = (value?: string | number | null) => {
  if (value === null || value === undefined || String(value).trim() === "") return null
  const cleaned = String(value).replace(/,/g, "")
  const number = Number(cleaned)
  return Number.isFinite(number) ? number : null
}
const calculateConvertedTotal = (total: string | number, exchangeRate: string) => {
  const totalNumber = toNumber(total)
  const rateNumber = toNumber(exchangeRate)
  if (totalNumber === null || rateNumber === null) return null
  return totalNumber * rateNumber
}
const formatMoney = (amount: string | number | null | undefined, currencyCode: string) => {
  if (amount === null || amount === undefined || String(amount).trim() === "") {
    return ""
  }
  const number = Number(String(amount).replace(/,/g, ""))
  if (!Number.isFinite(number)) return ""

  switch (currencyCode) {
    case "USD":
      return `$${number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case "AFN":
      return `AFN ${number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case "IRR":
      return `IRR ${number.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    case "TOMAN":
      return `${number.toLocaleString("en-US", { maximumFractionDigits: 0 })} تومان`
    case "AED":
      return `AED ${number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case "PKR":
      return `Rs ${number.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    case "INR":
      return `₹${number.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    default:
      return `${number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode}`
  }
}
const hasRealValue = (value?: string | null) => !isBlank(value)
const hasPrintableCharge = (value?: string | null) => {
  if (isBlank(value)) return false
  const amount = numberValue(value || undefined)
  return amount !== 0 || /[^\d.,\s-]/.test(String(value).trim())
}
const hasAnyValue = (...values: Array<string | undefined | null>) => values.some((value) => !isEmpty(value))

const detectRTL = (value?: string | null) =>
  typeof value === "string" && /[\u0591-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(value)

const formatCurrency = (value: string | number | undefined, currency = "USD") => {
  const amount = numberValue(value)
  return Number.isFinite(amount) ? formatMoney(amount, currency) : "-"
}

const formattedConvertedTotal = (invoice: InvoiceForm, totals: ReturnType<typeof calculateInvoice>) => {
  const convertedTotal = calculateConvertedTotal(totals.total, invoice.currencyExchange.exchangeRate)
  if (convertedTotal === null) return ""
  return formatMoney(convertedTotal, invoice.currencyExchange.targetCurrency || invoice.currency)
}

const money = (value: number, currency = "USD") => {
  if (!Number.isFinite(value)) return ""
  switch (currency) {
    case "USD":
      return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case "AFN":
      return `AFN ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case "IRR":
      return `IRR ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    case "TOMAN":
      return `${value.toLocaleString("en-US", { maximumFractionDigits: 0 })} تومان`
    case "AED":
      return `AED ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case "PKR":
      return `Rs ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    case "INR":
      return `₹${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    default:
      return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 2 }).format(value)
  }
}

function normalizeInvoice(data: Partial<InvoiceForm>): InvoiceForm {
  const fallback = emptyInvoice()
  return {
    ...fallback,
    ...data,
    items: data.items?.length
      ? data.items.map((item) => ({
          ...emptyItem(),
          ...item,
          date: item.date || "",
          containerNo: item.containerNo || "",
          commodity: item.commodity || "",
          unit: item.unit || "Unit",
          currency: item.currency || "",
        }))
      : fallback.items,
    currencyExchange: {
      ...fallback.currencyExchange,
      ...(data.currencyExchange || {}),
    },
  }
}

function calculateInvoice(invoice: InvoiceForm) {
  const serviceSubtotal = invoice.items.reduce((sum, item) => sum + numberValue(item.quantity) * numberValue(item.unitPrice), 0)
  const freight = numberValue(invoice.freight_charges)
  const demurrage = numberValue(invoice.demurrage_charges)
  const detention = numberValue(invoice.detention_charges)
  const documentation = numberValue(invoice.documentation_charges)
  const port = numberValue(invoice.port_charges)
  const truck = numberValue(invoice.truck_charges)
  const other = numberValue(invoice.other_charges)
  const subtotal = serviceSubtotal + freight + demurrage + detention + documentation + port + truck + other
  const tax = numberValue(invoice.tax)
  const discount = numberValue(invoice.discount)
  return { serviceSubtotal, freight, demurrage, detention, documentation, port, truck, other, subtotal, tax, discount, total: subtotal + tax - discount }
}

async function imageSourceForPdf(src?: string) {
  if (!src) return ""
  if (src.startsWith("data:")) return src
  try {
    const response = await fetch(src)
    const blob = await response.blob()
    return await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ""))
      reader.onerror = () => resolve("")
      reader.readAsDataURL(blob)
    })
  } catch {
    return ""
  }
}

async function fetchBase64Font(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Unable to load font ${url}`)
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(reader.error)
    response.blob().then((blob) => reader.readAsDataURL(blob)).catch(reject)
  })
  return dataUrl.split(",")[1] || ""
}

async function registerInvoicePdfFonts(doc: any) {
  const fontList = typeof doc.getFontList === "function" ? doc.getFontList() : null
  if (fontList?.NotoSans && fontList?.NotoNaskhArabic) return
  const notoSansRegular = await fetchBase64Font("/fonts/NotoSans-Regular.ttf")
  const notoSansBold = await fetchBase64Font("/fonts/NotoSans-Bold.ttf")
  const arabicRegular = await fetchBase64Font("/fonts/NotoNaskhArabic-Regular.ttf")
  const arabicBold = await fetchBase64Font("/fonts/NotoNaskhArabic-Bold.ttf")
  doc.addFileToVFS("NotoSans-Regular.ttf", notoSansRegular)
  doc.addFileToVFS("NotoSans-Bold.ttf", notoSansBold)
  doc.addFileToVFS("NotoNaskhArabic-Regular.ttf", arabicRegular)
  doc.addFileToVFS("NotoNaskhArabic-Bold.ttf", arabicBold)
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal")
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold")
  doc.addFont("NotoNaskhArabic-Regular.ttf", "NotoNaskhArabic", "normal")
  doc.addFont("NotoNaskhArabic-Bold.ttf", "NotoNaskhArabic", "bold")
}

function invoicePdfTextStyle(doc: any, text: string, weight: "normal" | "bold" = "normal") {
  const font = detectRTL(text) ? "NotoNaskhArabic" : "NotoSans"
  doc.setFont(font, weight)
}

function invoicePdfText(doc: any, text: string, x: number, y: number, options: { maxWidth?: number; align?: "left" | "right" | "center"; weight?: "normal" | "bold"; size?: number } = {}) {
  const value = String(text || "").trim()
  if (!value) return
  const preparedText = value.replace(/\r\n/g, "\n")
  invoicePdfTextStyle(doc, preparedText, options.weight ?? "normal")
  doc.setFontSize(options.size ?? 8)
  const rtl = detectRTL(preparedText)
  const lines = options.maxWidth ? doc.splitTextToSize(preparedText, options.maxWidth) : [preparedText]
  const lineHeight = (options.size ?? 8) * 0.38
  lines.forEach((line: string, index: number) => {
    doc.text(line, x, y + index * lineHeight, {
      align: options.align ?? (rtl ? "right" : "left"),
      baseline: "top",
    })
  })
}

function drawPdfBlock(doc: any, title: string, lines: string[], x: number, y: number, width: number, height: number) {
  doc.setDrawColor(219, 234, 254)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(x, y, width, height, 4, 4, "FD")
  invoicePdfText(doc, title.toUpperCase(), x + 4, y + 7, { weight: "bold", size: 8 })
  invoicePdfText(doc, lines.filter(Boolean).join("\n"), x + 4, y + 13, { size: 7.2, maxWidth: width - 8 })
}

async function invoicePdfBlob(invoiceInput: InvoiceForm) {
  const invoice = normalizeInvoice(invoiceInput)
  // Uses the same browser PDF engine family already used by the BOL tools.
  // @ts-ignore - jsPDF ships this browser bundle without a separate declaration file.
  const { jsPDF } = await import("jspdf/dist/jspdf.es.min.js")
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  await registerInvoicePdfFonts(doc)
  const totals = calculateInvoice(invoice)
  const logoSource = await imageSourceForPdf(invoice.seller_logo)

  const addHeader = (pageTitle = "LOGISTICS INVOICE") => {
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, 210, 297, "F")
    
    // Draw outer margin frame
    doc.setDrawColor(217, 226, 241) // #D9E2F1
    doc.setLineWidth(0.3)
    doc.rect(10, 12, 190, 273, "S")

    if (logoSource) {
      try {
        doc.addImage(logoSource, "PNG", 14, 15, 32, 20, undefined, "FAST")
      } catch {
        // Logo fallback
      }
    }
    doc.setTextColor(15, 23, 42) // #0F172A
    invoicePdfText(doc, invoice.seller_name || "SKY ARIANA LIMITED", 50, 20, { weight: "bold", size: 14, maxWidth: 94 })
    doc.setTextColor(30, 78, 216) // #1E4ED8
    invoicePdfText(doc, invoice.seller_tagline || "International Logistics & Freight Forwarding", 50, 25, { weight: "bold", size: 8, maxWidth: 94 })
    doc.setTextColor(100, 116, 139)
    invoicePdfText(doc, [invoice.seller_address, invoice.seller_contact].filter(Boolean).join(" | "), 50, 29, { size: 7.5, maxWidth: 94 })

    // Invoice Title & Number
    doc.setTextColor(30, 78, 216) // #1E4ED8
    invoicePdfText(doc, pageTitle.toUpperCase(), 196, 21, { weight: "bold", size: 20, align: "right", maxWidth: 90 })
    doc.setTextColor(71, 85, 105)
    invoicePdfText(doc, `Invoice No: ${invoice.invoice_number}`, 196, 27, { align: "right", size: 9, weight: "bold", maxWidth: 90 })
    if (invoice.invoice_ref_no) {
      invoicePdfText(doc, `Ref: ${invoice.invoice_ref_no}`, 196, 31, { align: "right", size: 7.5, maxWidth: 90 })
    }

    // Divider
    doc.setDrawColor(217, 226, 241)
    doc.setLineWidth(0.5)
    doc.line(14, 37, 196, 37)
  }

  addHeader(invoice.invoice_type || "LOGISTICS INVOICE")

  const billToLines = [
    invoice.buyer_contact_person && `👤 ${invoice.buyer_contact_person}`,
    invoice.buyer_name && `🏢 ${invoice.buyer_name}`,
    invoice.buyer_address && `📍 ${invoice.buyer_address}`,
    invoice.buyer_phone && `📞 ${invoice.buyer_phone}`,
    invoice.buyer_email && `✉️ ${invoice.buyer_email}`,
    invoice.buyer_tax_number && `📑 Tax No: ${invoice.buyer_tax_number}`,
  ].filter(Boolean) as string[]

  // Draw Bill To Box
  doc.setDrawColor(217, 226, 241) // #D9E2F1
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(14, 42, 88, 38, 3, 3, "FD")
  doc.setTextColor(30, 78, 216) // #1E4ED8
  invoicePdfText(doc, "BILL TO / مشتری", 18, 48, { weight: "bold", size: 8 })
  doc.setTextColor(71, 85, 105)
  billToLines.forEach((line, index) => {
    invoicePdfText(doc, line, 18, 54 + index * 4.2, { size: 7.2, maxWidth: 80 })
  })

  // Draw Shipment Details Box
  doc.roundedRect(108, 42, 88, 38, 3, 3, "FD")
  doc.setTextColor(30, 78, 216) // #1E4ED8
  invoicePdfText(doc, "SHIPMENT DETAILS / معلومات محموله", 112, 48, { weight: "bold", size: 8 })
  doc.setTextColor(71, 85, 105)
  
  const gridItems = [
    ["Shipment Type", invoice.shipment_type],
    ["BL Number", invoice.bl_no],
    ["Origin", invoice.origin],
    ["Container No", invoice.container_no],
    ["Destination", invoice.destination],
    ["Seal Number", invoice.seal_no],
    ["Commodity", invoice.commodity],
    ["Gross Weight", invoice.weight],
  ]

  gridItems.forEach(([label, val], idx) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    const xPos = col === 0 ? 112 : 154
    const yPos = 53 + row * 4.2
    invoicePdfText(doc, `${label}:`, xPos, yPos, { size: 6.5, weight: "bold" })
    invoicePdfText(doc, val || "-", xPos + 16, yPos, { size: 6.5, maxWidth: 24 })
  })
  invoicePdfText(doc, `Route: ${invoice.route || "-"}`, 112, 71, { size: 6.5, maxWidth: 80 })

  const drawItemTableHeader = (startY: number) => {
    doc.setFillColor(30, 78, 216) // #1E4ED8
    doc.roundedRect(14, startY, 182, 9, 3, 3, "F")
    doc.setTextColor(255, 255, 255)
    invoicePdfText(doc, "S.No", 21, startY + 6, { weight: "bold", size: 7.5, align: "center" })
    invoicePdfText(doc, "Description / تفصیـلات", 30, startY + 6, { weight: "bold", size: 7.5 })
    invoicePdfText(doc, "Commodity / نوع کالا", 102, startY + 6, { weight: "bold", size: 7.5 })
    invoicePdfText(doc, "Qty / تعداد", 143, startY + 6, { weight: "bold", size: 7.5, align: "center" })
    invoicePdfText(doc, "Unit Price / قیمت", 170, startY + 6, { weight: "bold", size: 7.5, align: "right" })
    invoicePdfText(doc, "Amount / مجموع", 194, startY + 6, { weight: "bold", size: 7.5, align: "right" })
    return startY + 11
  }

  let y = 84
  y = drawItemTableHeader(y)
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(7.5)
  const printablePdfItems = invoice.items.filter(
    (item) => !isEmpty(item.description) || !isEmpty(item.date) || !isEmpty(item.containerNo) || !isEmpty(item.quantity) || !isEmpty(item.unitPrice)
  )

  const totalPdfRows = Math.max(8, printablePdfItems.length)
  for (let index = 0; index < totalPdfRows; index++) {
    const item = index < printablePdfItems.length ? printablePdfItems[index] : null
    const rowHeight = 12

    if (y + rowHeight > 245) {
      doc.addPage()
      addHeader(invoice.invoice_type || "LOGISTICS INVOICE")
      y = 48
      y = drawItemTableHeader(y)
      doc.setTextColor(15, 23, 42)
      doc.setFontSize(7.5)
    }

    if (index % 2 === 0) {
      doc.setFillColor(255, 255, 255)
      doc.rect(14, y - 5, 182, rowHeight, "F")
    } else {
      doc.setFillColor(248, 250, 252)
      doc.rect(14, y - 5, 182, rowHeight, "F")
    }

    // Grid borders
    doc.setDrawColor(217, 226, 241)
    doc.setLineWidth(0.2)
    doc.rect(14, y - 5, 182, rowHeight, "S")
    doc.line(28, y - 5, 28, y - 5 + rowHeight)
    doc.line(100, y - 5, 100, y - 5 + rowHeight)
    doc.line(134, y - 5, 134, y - 5 + rowHeight)
    doc.line(152, y - 5, 152, y - 5 + rowHeight)
    doc.line(172, y - 5, 172, y - 5 + rowHeight)

    if (item) {
      const amount = numberValue(item.quantity) * numberValue(item.unitPrice)
      invoicePdfText(doc, String(index + 1), 21, y, { size: 7.5, align: "center" })

      let descString = item.description || "-"
      if (item.date || item.containerNo) {
        const datePart = item.date ? `Date: ${item.date}` : ""
        const cntPart = item.containerNo ? `Container: ${item.containerNo}` : ""
        const extra = [datePart, cntPart].filter(Boolean).join(" | ")
        descString += `\n(${extra})`
      }
      const isDescRtl = detectRTL(descString)
      invoicePdfText(doc, descString, isDescRtl ? 98 : 30, y - 1, { size: 7, maxWidth: 68, align: isDescRtl ? "right" : "left" })

      const isCommRtl = detectRTL(item.commodity || invoice.commodity)
      invoicePdfText(doc, item.commodity || invoice.commodity || "-", isCommRtl ? 132 : 102, y, { size: 7, maxWidth: 30, align: isCommRtl ? "right" : "left" })

      const qtyText = `${item.quantity || "-"} ${item.unit || ""}`
      invoicePdfText(doc, qtyText, 143, y, { size: 7.5, align: "center" })
      invoicePdfText(doc, money(numberValue(item.unitPrice), invoice.currency), 170, y, { size: 7.5, align: "right" })
      invoicePdfText(doc, money(amount, invoice.currency), 194, y, { size: 7.5, align: "right", weight: "bold" })
    } else {
      invoicePdfText(doc, String(index + 1), 21, y, { size: 7.5, align: "center" })
    }
    y += rowHeight
  }

  y = Math.max(y + 8, 196)
  const paymentDetailLines = [
    invoice.bank_name && `Bank Name: ${invoice.bank_name}`,
    invoice.account_name && `Account Name: ${invoice.account_name}`,
    invoice.account_number && `Account No: ${invoice.account_number}`,
    invoice.iban && `IBAN: ${invoice.iban}`,
    invoice.swift_code && `SWIFT Code: ${invoice.swift_code}`,
    invoice.branch && `Branch: ${invoice.branch}`,
  ].filter(Boolean) as string[]

  if (paymentDetailLines.length) {
    doc.setDrawColor(217, 226, 241) // #D9E2F1
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(14, y, 92, 42, 3, 3, "FD")
    doc.setTextColor(30, 78, 216) // #1E4ED8
    invoicePdfText(doc, "PAYMENT DETAILS / معلومات پرداخت", 18, y + 6, { weight: "bold", size: 8 })
    doc.setTextColor(71, 85, 105)
    paymentDetailLines.forEach((line, index) => {
      invoicePdfText(doc, line, 18, y + 13 + index * 4.5, { size: 7.2, maxWidth: 84 })
    })
  }

  const exchangeTotal = calculateConvertedTotal(totals.total, invoice.currencyExchange.exchangeRate)
  const exchangeRows: Array<[string, string]> = []
  if (invoice.currencyExchange.enabled) {
    exchangeRows.push(["Base Currency", invoice.currencyExchange.baseCurrency])
    exchangeRows.push(["Target Currency", invoice.currencyExchange.targetCurrency])
    if (hasValue(invoice.currencyExchange.exchangeRate)) {
      exchangeRows.push(["Exchange Rate", `${invoice.currencyExchange.exchangeRate} ${invoice.currencyExchange.targetCurrency || invoice.currency}`])
    }
    if (exchangeTotal !== null) {
      exchangeRows.push(["Converted Total", money(exchangeTotal, invoice.currencyExchange.targetCurrency || invoice.currency)])
    }
  }

  doc.setDrawColor(217, 226, 241)
  doc.setFillColor(255, 255, 255)
  
  const freight = numberValue(invoice.freight_charges)
  const demurrage = numberValue(invoice.demurrage_charges)
  const detention = numberValue(invoice.detention_charges)
  const documentation = numberValue(invoice.documentation_charges)
  const port = numberValue(invoice.port_charges)
  const truck = numberValue(invoice.truck_charges)
  const other = numberValue(invoice.other_charges)
  const subtotalBeforeTaxAndDiscount = totals.serviceSubtotal + freight + demurrage + detention + documentation + port + truck + other

  const summaryRows = [
    ["Subtotal", money(subtotalBeforeTaxAndDiscount, invoice.currency)],
    totals.tax !== 0 && ["Tax", `+${money(totals.tax, invoice.currency)}`],
    totals.discount !== 0 && ["Discount", `-${money(totals.discount, invoice.currency)}`],
  ].filter(Boolean) as Array<[string, string]>

  doc.roundedRect(112, y, 84, 42, 3, 3, "FD")
  doc.setTextColor(30, 78, 216) // #1E4ED8
  invoicePdfText(doc, "CHARGES SUMMARY / خلاصه مصارف", 116, y + 6, { weight: "bold", size: 8 })
  doc.setTextColor(71, 85, 105)
  
  summaryRows.forEach(([label, value], index) => {
    invoicePdfText(doc, label, 116, y + 13 + index * 4, { size: 7 })
    invoicePdfText(doc, value, 192, y + 13 + index * 4, { size: 7, align: "right", weight: "bold" })
  })

  // Exchange details if any
  exchangeRows.forEach(([label, value], index) => {
    const yPos = y + 13 + summaryRows.length * 4 + index * 4
    invoicePdfText(doc, label, 116, yPos, { size: 6.5 })
    invoicePdfText(doc, value, 192, yPos, { size: 6.5, align: "right" })
  })

  // Full-width Grand Total Bar
  doc.setFillColor(30, 78, 216) // #1E4ED8
  doc.roundedRect(115, y + 29, 78, 10, 2, 2, "F")
  doc.setTextColor(255, 255, 255)
  invoicePdfText(doc, "GRAND TOTAL / مجموع کل", 119, y + 32.5, { size: 7, weight: "bold" })
  invoicePdfText(doc, money(totals.total, invoice.currency), 189, y + 31.5, { size: 10, weight: "bold", align: "right" })

  const signatureY = 248
  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.4)
  doc.line(18, signatureY + 8, 54, signatureY + 8)
  invoicePdfText(doc, "Prepared By", 36, signatureY + 12, { size: 7, align: "center", weight: "bold" })
  invoicePdfText(doc, invoice.prepared_by || "Accounts Dept", 36, signatureY + 15, { size: 6, align: "center" })

  doc.line(87, signatureY + 8, 123, signatureY + 8)
  invoicePdfText(doc, "Customer Signature", 105, signatureY + 12, { size: 7, align: "center", weight: "bold" })
  invoicePdfText(doc, "Stamp & Signature", 105, signatureY + 15, { size: 6, align: "center" })

  doc.line(156, signatureY + 8, 192, signatureY + 8)
  invoicePdfText(doc, "Approved By", 174, signatureY + 12, { size: 7, align: "center", weight: "bold" })
  invoicePdfText(doc, invoice.approved_by || "Authorized Stamp", 174, signatureY + 15, { size: 6, align: "center" })

  let footerY = 268
  doc.setTextColor(100, 116, 139)
  if (invoice.attachments) {
    invoicePdfText(doc, `Attachments: ${invoice.attachments}`, 14, footerY, { size: 6.5, maxWidth: 182 })
    footerY += 4.5
  }
  if (invoice.terms) {
    invoicePdfText(doc, `Terms & Conditions: ${invoice.terms}`, 14, footerY, { size: 6.5, maxWidth: 182 })
  }

  return doc.output("blob")
}

export function InvoiceEditor() {
  const [invoice, setInvoice] = useState<InvoiceForm>(() => emptyInvoice())
  const [savedInvoices, setSavedInvoices] = useState<InvoiceForm[]>([])
  const [query, setQuery] = useState("")
  const [activeTab, setActiveTab] = useState("form")
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "idle">("idle")
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string>("")
  const isInvoiceInitialMount = useRef(true)

  // Real-Time Debounced Invoice Auto-Saving Engine
  useEffect(() => {
    if (typeof window === "undefined") return
    if (isInvoiceInitialMount.current) {
      isInvoiceInitialMount.current = false
      return
    }

    setAutoSaveStatus("saving")
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem("skybol:active-invoice-draft", JSON.stringify(invoice))
        if (invoice.invoice_number && invoice.invoice_number.trim()) {
          const stored = window.localStorage.getItem("skybol:saved-invoices")
          const list = stored ? JSON.parse(stored) : []
          const updated = [invoice, ...list.filter((inv: any) => inv.invoice_number !== invoice.invoice_number)]
          window.localStorage.setItem("skybol:saved-invoices", JSON.stringify(updated))
        }
        setAutoSaveStatus("saved")
        setLastAutoSaveTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }))
      } catch (e) {
        setAutoSaveStatus("idle")
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [invoice])
  const totals = calculateInvoice(invoice)
  const attachmentCount = invoice.attachments.split(",").map((item) => item.trim()).filter(Boolean).length

  const loadInvoices = async () => {
    const response = await fetch("/api/invoices")
    const result = await response.json()
    setSavedInvoices(Array.isArray(result.data) ? result.data.map(normalizeInvoice) : [])
  }

  const newInvoice = async () => {
    const response = await fetch("/api/invoices?action=next-number")
    const result = await response.json()
    setInvoice({ ...emptyInvoice(), invoice_number: result.invoiceNumber || "" })
    setActiveTab("form")
  }

  useEffect(() => {
    void newInvoice()
    void loadInvoices()
  }, [])

  const update = (field: keyof InvoiceForm, value: string) => setInvoice((prev) => ({ ...prev, [field]: value }))
  const updateCurrencyExchange = (field: keyof CurrencyExchange, value: string | boolean) =>
    setInvoice((prev) => ({
      ...prev,
      currencyExchange: {
        ...prev.currencyExchange,
        [field]: value,
      },
    }))

  const uploadInvoiceLogo = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = () => update("seller_logo", String(reader.result || ""))
    reader.readAsDataURL(file)
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: string) =>
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }))

  const saveInvoice = async () => {
    const response = await fetch(invoice.id ? `/api/invoices/${invoice.id}` : "/api/invoices", {
      method: invoice.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoice),
    })
    const result = await response.json()
    if (!response.ok || !result.success) {
      toast.error("Invoice save failed", { description: result.error || "Please try again." })
      return
    }
    setInvoice(normalizeInvoice(result.data))
    await loadInvoices()
    toast.success("Invoice saved")
  }

  const downloadPdf = async () => {
    const blob = await invoicePdfBlob(invoice)
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${invoice.invoice_number || "invoice"}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  const printInvoice = async () => {
    const blob = await invoicePdfBlob(invoice)
    const url = URL.createObjectURL(blob)
    const win = window.open(url, "_blank")
    win?.addEventListener("load", () => win.print())
  }

  const openSaved = (saved: InvoiceForm) => {
    setInvoice(normalizeInvoice(saved))
    setActiveTab("form")
  }

  const deleteSaved = async (id?: string) => {
    if (!id) return
    await fetch(`/api/invoices/${id}`, { method: "DELETE" })
    await loadInvoices()
    toast.success("Invoice deleted")
  }

  const filteredInvoices = savedInvoices.filter((saved) =>
    [saved.invoice_number, saved.buyer_name, saved.seller_name, saved.invoice_type, saved.bl_no].join(" ").toLowerCase().includes(query.toLowerCase())
  )

  return (
    <Card className="overflow-hidden rounded-[30px] border-white/70 bg-white/68 shadow-2xl shadow-blue-100/70 backdrop-blur-2xl">
      <CardHeader className="border-b border-white/70 bg-white/74 p-4 backdrop-blur-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="flex min-w-0 items-center gap-3 text-xl font-black text-slate-950">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white/85 text-blue-600 shadow-lg shadow-blue-100">
              <FileText className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-black uppercase tracking-[0.22em] text-[#D4AF37]">Premium Logistics Invoice</span>
              <span className="block truncate text-2xl">Invoice Editor</span>
            </span>
            <span className="hidden rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-4 py-2 text-sm font-black text-blue-700 md:inline-flex">
              {invoice.invoice_number || "New Invoice"}
            </span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {autoSaveStatus === "saving" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-50 text-amber-950 border border-amber-300 text-[11px] font-black shadow-2xs animate-pulse">
                <RefreshCw className="h-3.5 w-3.5 text-amber-600 animate-spin" />
                <span>Auto-Saving invoice...</span>
              </span>
            )}
            {autoSaveStatus === "saved" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-300 text-[11px] font-black shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Auto-Saved {lastAutoSaveTime}</span>
              </span>
            )}
            <ToolbarButton onClick={newInvoice} icon={<Plus className="h-4 w-4" />} label="New Invoice" />
            <ToolbarButton onClick={printInvoice} icon={<Printer className="h-4 w-4" />} label="Print" />
            <Button onClick={saveInvoice} className="rounded-2xl bg-linear-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-lg shadow-blue-200">
              <Save className="h-4 w-4" /> Save
            </Button>
            <ToolbarButton onClick={downloadPdf} icon={<Download className="h-4 w-4" />} label="Download" />
            <Button onClick={downloadPdf} className="rounded-2xl bg-linear-to-r from-[#D4AF37] to-[#F4D03F] text-slate-950 shadow-lg shadow-amber-100">
              <Download className="h-4 w-4" /> Save PDF
            </Button>
            <ToolbarButton onClick={newInvoice} icon={<RefreshCw className="h-4 w-4" />} label="Reset View" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(212,175,55,.18),transparent_28%),linear-gradient(135deg,#fff,rgba(248,250,252,.9),rgba(255,255,255,.75))] p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 grid h-auto grid-cols-2 gap-2 rounded-3xl border border-white/70 bg-white/62 p-2 shadow-inner backdrop-blur-xl md:grid-cols-5">
            <TabsTrigger value="form">Edit Form</TabsTrigger>
            <TabsTrigger value="preview">A4 Preview</TabsTrigger>
            <TabsTrigger value="saved">Saved PDF Documents</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="settings">Invoice Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="space-y-4">
            <HeroPanel invoice={invoice} uploadInvoiceLogo={uploadInvoiceLogo} />

            <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
              <GlassBlock title="Invoice Control" icon={<FileCheck2 className="h-4 w-4" />}>
                <div className="grid gap-3 md:grid-cols-2">
                  <PremiumField label="Invoice Number"><Input value={invoice.invoice_number} onChange={(e) => update("invoice_number", e.target.value)} placeholder="INV-2026-0064" /></PremiumField>
                  <PremiumField label="Invoice Type"><PremiumSelect value={invoice.invoice_type} onChange={(value) => update("invoice_type", value)} options={invoiceTypes} /></PremiumField>
                  <PremiumField label="Issue Date"><Input value={invoice.invoice_date} onChange={(e) => update("invoice_date", e.target.value)} type="date" /></PremiumField>
                  <PremiumField label="Due Date"><Input value={invoice.due_date} onChange={(e) => update("due_date", e.target.value)} type="date" /></PremiumField>
                  <PremiumField label="Payment Terms"><Input value={invoice.payment_terms} onChange={(e) => update("payment_terms", e.target.value)} placeholder="Due on Receipt" /></PremiumField>
                  <PremiumField label="Currency">
                    <PremiumSelect value={invoice.currency} onChange={(value) => update("currency", value)} options={currencyCodes} />
                  </PremiumField>
                </div>
              </GlassBlock>

              <GlassBlock title="Currency Exchange" icon={<CreditCard className="h-4 w-4" />}>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="col-span-2 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
                    <input
                      id="exchange-enabled"
                      type="checkbox"
                      checked={invoice.currencyExchange.enabled}
                      onChange={(event) => updateCurrencyExchange("enabled", event.target.checked)}
                      className="h-4 w-4 rounded border-blue-200 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="exchange-enabled" className="text-sm font-black text-slate-700">
                      Enable currency exchange conversion for invoice totals
                    </label>
                  </div>
                  <PremiumField label="Base Currency"><PremiumSelect value={invoice.currencyExchange.baseCurrency} onChange={(value) => updateCurrencyExchange("baseCurrency", value)} options={currencyCodes} /></PremiumField>
                  <PremiumField label="Target Currency"><PremiumSelect value={invoice.currencyExchange.targetCurrency} onChange={(value) => updateCurrencyExchange("targetCurrency", value)} options={currencyCodes} /></PremiumField>
                  <PremiumField label="Exchange Rate"><Input value={invoice.currencyExchange.exchangeRate} onChange={(e) => updateCurrencyExchange("exchangeRate", e.target.value)} placeholder="Example: 87.5" /></PremiumField>
                  <PremiumField label="Exchange Date"><Input type="date" value={invoice.currencyExchange.exchangeDate} onChange={(e) => updateCurrencyExchange("exchangeDate", e.target.value)} /></PremiumField>
                  <PremiumField label="Converted Total" className="md:col-span-2">
                    <Input
                      readOnly
                      value={formattedConvertedTotal(invoice, totals)}
                      placeholder="Calculated converted total"
                    />
                  </PremiumField>
                  <PremiumField label="Exchange Notes" className="md:col-span-2">
                    <Textarea value={invoice.currencyExchange.notes} onChange={(e) => updateCurrencyExchange("notes", e.target.value)} placeholder="Optional note for exchange rate or payment instructions" />
                  </PremiumField>
                </div>
              </GlassBlock>

              <GlassBlock title="Charges Snapshot" icon={<CreditCard className="h-4 w-4" />}>
                <div className="grid gap-3 md:grid-cols-3">
                  <TotalMetric label="Subtotal" value={money(totals.subtotal, invoice.currency)} />
                  <TotalMetric label="Tax" value={money(totals.tax, invoice.currency)} />
                  <TotalMetric label="Grand Total" value={money(totals.total, invoice.currency)} featured />
                </div>
                <div className="mt-3 rounded-3xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9a6a00]">Logistics Invoice Use</p>
                  <p className="mt-2 text-sm font-bold text-slate-700">
                    Supports container transport, truck transport, demurrage, detention, customs clearance, warehousing, port charges, THC, documentation, and cross-border freight.
                  </p>
                </div>
              </GlassBlock>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <GlassBlock title="Company Information" icon={<BadgeCheck className="h-4 w-4" />}>
                <div className="grid gap-3 md:grid-cols-2">
                  <PremiumField label="Company Name"><Input value={invoice.seller_name} onChange={(e) => update("seller_name", e.target.value)} /></PremiumField>
                  <PremiumField label="Tagline"><Input value={invoice.seller_tagline} onChange={(e) => update("seller_tagline", e.target.value)} /></PremiumField>
                  <PremiumField label="Address" className="md:col-span-2"><Textarea value={invoice.seller_address} onChange={(e) => update("seller_address", e.target.value)} /></PremiumField>
                  <PremiumField label="Phones / Emails" className="md:col-span-2"><Input value={invoice.seller_contact} onChange={(e) => update("seller_contact", e.target.value)} /></PremiumField>
                  <PremiumField label="Website"><Input value={invoice.seller_website} onChange={(e) => update("seller_website", e.target.value)} /></PremiumField>
                  <PremiumField label="License No"><Input value={invoice.seller_license} onChange={(e) => update("seller_license", e.target.value)} /></PremiumField>
                  <PremiumField label="Business Registration"><Input value={invoice.seller_registration} onChange={(e) => update("seller_registration", e.target.value)} /></PremiumField>
                  <PremiumField label="Tax Number"><Input value={invoice.seller_tax_number} onChange={(e) => update("seller_tax_number", e.target.value)} /></PremiumField>
                </div>
              </GlassBlock>

              <GlassBlock title="Bill To" icon={<Landmark className="h-4 w-4" />}>
                <div className="grid gap-3 md:grid-cols-2">
                  <PremiumField label="Company Name" className="md:col-span-2"><Input value={invoice.buyer_name} onChange={(e) => update("buyer_name", e.target.value)} placeholder="Customer company" /></PremiumField>
                  <PremiumField label="Address" className="md:col-span-2"><Textarea value={invoice.buyer_address} onChange={(e) => update("buyer_address", e.target.value)} /></PremiumField>
                  <PremiumField label="Contact Person"><Input value={invoice.buyer_contact_person} onChange={(e) => update("buyer_contact_person", e.target.value)} /></PremiumField>
                  <PremiumField label="Phone"><Input value={invoice.buyer_phone} onChange={(e) => update("buyer_phone", e.target.value)} /></PremiumField>
                  <PremiumField label="Email"><Input value={invoice.buyer_email} onChange={(e) => update("buyer_email", e.target.value)} /></PremiumField>
                  <PremiumField label="Tax Number"><Input value={invoice.buyer_tax_number} onChange={(e) => update("buyer_tax_number", e.target.value)} /></PremiumField>
                </div>
              </GlassBlock>
            </div>

            <GlassBlock title="Shipment Information" icon={<Route className="h-4 w-4" />}>
              <div className="mb-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                {shipmentTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => update("shipment_type", type)}
                    className={`flex h-14 items-center justify-center gap-2 rounded-2xl border text-sm font-black transition hover:-translate-y-0.5 ${
                      invoice.shipment_type === type ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-200" : "border-blue-100 bg-white/78 text-slate-700 hover:bg-blue-50"
                    }`}
                  >
                    {shipmentIcon(type)}
                    {type}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <PremiumField label="Container No"><Input value={invoice.container_no} onChange={(e) => update("container_no", e.target.value)} placeholder="OOLU1150358" /></PremiumField>
                <PremiumField label="Seal No"><Input value={invoice.seal_no} onChange={(e) => update("seal_no", e.target.value)} placeholder="ALS005927" /></PremiumField>
                <PremiumField label="Truck No"><Input value={invoice.truck_no} onChange={(e) => update("truck_no", e.target.value)} /></PremiumField>
                <PremiumField label="Container Size"><Input value={invoice.container_size} onChange={(e) => update("container_size", e.target.value)} placeholder="40HC" /></PremiumField>
                <PremiumField label="Driver Name"><Input value={invoice.driver_name} onChange={(e) => update("driver_name", e.target.value)} /></PremiumField>
                <PremiumField label="Driver Phone"><Input value={invoice.driver_phone} onChange={(e) => update("driver_phone", e.target.value)} /></PremiumField>
                <PremiumField label="Booking No"><Input value={invoice.booking_no} onChange={(e) => update("booking_no", e.target.value)} /></PremiumField>
                <PremiumField label="B/L No"><Input value={invoice.bl_no} onChange={(e) => update("bl_no", e.target.value)} /></PremiumField>
                <PremiumField label="Invoice Ref No"><Input value={invoice.invoice_ref_no} onChange={(e) => update("invoice_ref_no", e.target.value)} /></PremiumField>
                <PremiumField label="Origin"><Input value={invoice.origin} onChange={(e) => update("origin", e.target.value)} /></PremiumField>
                <PremiumField label="Destination"><Input value={invoice.destination} onChange={(e) => update("destination", e.target.value)} /></PremiumField>
                <PremiumField label="Final Destination"><Input value={invoice.final_destination} onChange={(e) => update("final_destination", e.target.value)} /></PremiumField>
                <PremiumField label="Route" className="md:col-span-2"><Input value={invoice.route} onChange={(e) => update("route", e.target.value)} placeholder="Kandahar -> Mersin -> Nhava Sheva" /></PremiumField>
                <PremiumField label="Cargo Description" className="md:col-span-2"><Input value={invoice.cargo_description} onChange={(e) => update("cargo_description", e.target.value)} /></PremiumField>
                <PremiumField label="Commodity"><Input value={invoice.commodity} onChange={(e) => update("commodity", e.target.value)} /></PremiumField>
                <PremiumField label="Weight"><Input value={invoice.weight} onChange={(e) => update("weight", e.target.value)} /></PremiumField>
                <PremiumField label="Quantity"><Input value={invoice.shipment_quantity} onChange={(e) => update("shipment_quantity", e.target.value)} /></PremiumField>
                <PremiumField label="Package Count"><Input value={invoice.package_count} onChange={(e) => update("package_count", e.target.value)} /></PremiumField>
              </div>
            </GlassBlock>

            <GlassBlock title="Service Details" icon={<Package className="h-4 w-4" />}>
              <div className="overflow-x-auto rounded-3xl border border-white/70 bg-white/70 shadow-inner">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="sticky top-0 bg-[#0B1F4D] text-white">
                    <tr>
                      <th className="w-14 p-3 text-left">S.No</th>
                      <th className="p-3 text-left">Description (Date / Container / Details)</th>
                      <th className="w-48 p-3 text-left">Commodity</th>
                      <th className="w-24 p-3 text-left">Qty</th>
                      <th className="w-24 p-3 text-left">Unit</th>
                      <th className="w-32 p-3 text-left">Unit Price</th>
                      <th className="w-32 p-3 text-left">Amount</th>
                      <th className="w-14 p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => (
                      <tr key={item.id} className="border-t border-blue-100 odd:bg-white/80 even:bg-blue-50/40 hover:bg-blue-50/80">
                        <td className="p-3 font-black text-blue-700">{index + 1}</td>
                        <td className="p-2">
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="date"
                                value={item.date || ""}
                                onChange={(e) => updateItem(item.id, "date", e.target.value)}
                                className="h-9 text-sm"
                                placeholder="Date / نېټه"
                              />
                              <Input
                                value={item.containerNo}
                                onChange={(e) => updateItem(item.id, "containerNo", e.target.value)}
                                placeholder="Container No"
                                className="h-9 text-sm"
                              />
                            </div>
                            <Textarea
                              value={item.description}
                              onChange={(e) => updateItem(item.id, "description", e.target.value)}
                              className="min-h-12 resize-y"
                              placeholder="Description / شرح خدمات"
                            />
                          </div>
                        </td>
                        <td className="p-2">
                          <Input
                            value={item.commodity || ""}
                            onChange={(e) => updateItem(item.id, "commodity", e.target.value)}
                            placeholder={invoice.commodity || "Commodity"}
                            className="h-9 text-sm"
                          />
                        </td>
                        <td className="p-2"><Input value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", e.target.value)} /></td>
                        <td className="p-2"><Input value={item.unit} onChange={(e) => updateItem(item.id, "unit", e.target.value)} placeholder="Trip" /></td>
                        <td className="p-2"><Input value={item.unitPrice} onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)} /></td>
                        <td className="p-3 font-black text-blue-700">{money(numberValue(item.quantity) * numberValue(item.unitPrice), invoice.currency)}</td>
                        <td className="p-2">
                          <Button variant="ghost" onClick={() => setInvoice((prev) => ({ ...prev, items: prev.items.filter((row) => row.id !== item.id) }))} className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="outline" onClick={() => setInvoice((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }))} className="rounded-2xl border-blue-100 bg-white/80 text-blue-700 shadow-sm">
                <Plus className="h-4 w-4" /> Add Service Row
              </Button>
            </GlassBlock>

            <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
              <GlassBlock title="Payment Details" icon={<Landmark className="h-4 w-4" />}>
                <div className="grid gap-3 md:grid-cols-2">
                  <PremiumField label="Bank Name"><Input value={invoice.bank_name} onChange={(e) => update("bank_name", e.target.value)} /></PremiumField>
                  <PremiumField label="Account Name"><Input value={invoice.account_name} onChange={(e) => update("account_name", e.target.value)} /></PremiumField>
                  <PremiumField label="Account Number"><Input value={invoice.account_number} onChange={(e) => update("account_number", e.target.value)} /></PremiumField>
                  <PremiumField label="IBAN"><Input value={invoice.iban} onChange={(e) => update("iban", e.target.value)} /></PremiumField>
                  <PremiumField label="SWIFT Code"><Input value={invoice.swift_code} onChange={(e) => update("swift_code", e.target.value)} /></PremiumField>
                  <PremiumField label="Branch"><Input value={invoice.branch} onChange={(e) => update("branch", e.target.value)} /></PremiumField>
                  <PremiumField label="QR / Payment Reference" className="md:col-span-2"><Input value={invoice.qr_reference} onChange={(e) => update("qr_reference", e.target.value)} placeholder="QR code or payment reference text" /></PremiumField>
                </div>
              </GlassBlock>

              <ChargesPanel invoice={invoice} update={update} totals={totals} />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <GlassBlock title="Attachments" icon={<Paperclip className="h-4 w-4" />}>
                <Textarea value={invoice.attachments} onChange={(e) => update("attachments", e.target.value)} placeholder="BL Copy, POD, Container Photos..." />
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm font-black text-blue-700">Attachments: {attachmentCount} Files</div>
              </GlassBlock>
              <GlassBlock title="Terms & Conditions" icon={<FileCheck2 className="h-4 w-4" />}>
                <Textarea value={invoice.terms} onChange={(e) => update("terms", e.target.value)} className="min-h-36" />
                <Textarea value={invoice.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Notes" />
              </GlassBlock>
              <GlassBlock title="Signature Section" icon={<PenLine className="h-4 w-4" />}>
                <PremiumField label="Prepared By"><Input value={invoice.prepared_by} onChange={(e) => update("prepared_by", e.target.value)} /></PremiumField>
                <PremiumField label="Approved By"><Input value={invoice.approved_by} onChange={(e) => update("approved_by", e.target.value)} /></PremiumField>
                <PremiumField label="Signature Position"><Input value={invoice.signature_position} onChange={(e) => update("signature_position", e.target.value)} /></PremiumField>
              </GlassBlock>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <InvoicePreview 
              invoice={invoice} 
              onPrint={printInvoice}
              onDownloadPdf={downloadPdf}
              onEdit={() => setActiveTab("form")}
            />
          </TabsContent>

          <TabsContent value="saved">
            <GlassBlock title="Saved Invoice Documents" icon={<FileText className="h-4 w-4" />}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoices by number, buyer, type, or B/L" className="h-12 rounded-2xl pl-10" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredInvoices.map((saved) => (
                  <div key={saved.id || saved.invoice_number} className="rounded-3xl border border-white/70 bg-white/74 p-5 shadow-xl shadow-blue-100/50 backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-2xl">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">{saved.invoice_type || "Invoice"}</p>
                    <h3 className="mt-1 text-xl font-black text-blue-700">{saved.invoice_number}</h3>
                    <p className="mt-2 font-bold text-slate-900">{saved.buyer_name || "No buyer"}</p>
                    <p className="text-sm font-semibold text-slate-500">{saved.invoice_date} | {saved.currency || "USD"}</p>
                    <p className="mt-2 line-clamp-2 text-xs font-bold text-slate-500">{saved.route || saved.cargo_description || "No shipment route"}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => openSaved(saved)} className="rounded-xl bg-blue-600 text-white"><Eye className="h-4 w-4" />Open</Button>
                      <Button size="sm" variant="outline" onClick={() => openSaved(saved)} className="rounded-xl">Edit</Button>
                      <Button size="sm" variant="outline" onClick={downloadPdf} className="rounded-xl"><Download className="h-4 w-4" />PDF</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteSaved(saved.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
                {!filteredInvoices.length ? (
                  <div className="rounded-3xl border border-dashed border-blue-200 bg-white/60 p-8 text-center text-sm font-bold text-slate-500 md:col-span-2 xl:col-span-3">
                    No saved invoices found.
                  </div>
                ) : null}
              </div>
            </GlassBlock>
          </TabsContent>

          <TabsContent value="account">
            <GlassBlock title="Invoice Account" icon={<CreditCard className="h-4 w-4" />}>
              <p className="text-sm font-semibold text-slate-600">Invoice accounts use the shared imported account records available to BOL and Invoice modules.</p>
              <div className="rounded-3xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 p-5 text-lg font-black text-blue-700">
                Current Bill To: {invoice.buyer_name || "No customer selected"}
              </div>
            </GlassBlock>
          </TabsContent>

          <TabsContent value="settings">
            <GlassBlock title="Invoice & Print Settings" icon={<Settings className="h-4 w-4" />}>
              <p className="text-sm font-semibold text-slate-600">Professional A4 logistics invoice PDF, white-blue-gold theme, print and download enabled.</p>
              <div className="grid gap-3 md:grid-cols-3">
                <TotalMetric label="Format" value="A4" />
                <TotalMetric label="Theme" value="Blue + Gold" />
                <TotalMetric label="Currency" value={invoice.currency || "USD"} />
              </div>
              <Button onClick={downloadPdf} className="rounded-2xl bg-linear-to-r from-[#D4AF37] to-[#F4D03F] text-slate-950 shadow-lg shadow-amber-100">
                <Settings className="h-4 w-4" /> Generate PDF
              </Button>
            </GlassBlock>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function ToolbarButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <Button onClick={onClick} variant="outline" className="rounded-2xl border-white/70 bg-white/75 text-blue-700 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-blue-50">
      {icon}
      {label}
    </Button>
  )
}

function GlassBlock({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-[28px] border border-white/70 bg-white/66 p-4 shadow-xl shadow-blue-100/50 backdrop-blur-[22px]">
      <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-blue-700">
        {icon ? <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">{icon}</span> : null}
        {title}
      </h3>
      {children}
    </section>
  )
}

function PremiumField({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function PremiumSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 rounded-md border border-blue-100 bg-white/90 px-3 text-sm font-bold text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
    >
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  )
}

function TotalMetric({ label, value, featured = false }: { label: string; value: string; featured?: boolean }) {
  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${featured ? "border-[#D4AF37]/50 bg-[#D4AF37]/15 text-slate-950" : "border-blue-100 bg-white/75 text-slate-800"}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-2 font-black ${featured ? "text-2xl text-blue-700" : "text-xl"}`}>{value}</p>
    </div>
  )
}

function shipmentIcon(type: string) {
  const iconClass = "h-4 w-4"
  if (type === "Truck") return <Truck className={iconClass} />
  if (type === "Container" || type === "LCL" || type === "FCL") return <Ship className={iconClass} />
  if (type === "Rail") return <TrainFront className={iconClass} />
  if (type === "Air Freight") return <Plane className={iconClass} />
  return <Package className={iconClass} />
}

function HeroPanel({ invoice, uploadInvoiceLogo }: { invoice: InvoiceForm; uploadInvoiceLogo: (file: File | undefined) => void }) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/70 shadow-2xl shadow-blue-100/60 backdrop-blur-2xl">
      <div className="grid gap-5 p-5 lg:grid-cols-[260px_1fr_320px] lg:items-center">
        <div className="flex flex-col items-center justify-center rounded-[28px] border border-[#D4AF37]/35 bg-white/82 p-4 shadow-inner">
          <img src={invoice.seller_logo || "/images/account-ledger-logo.png"} alt="Invoice company logo" className="h-28 w-56 object-contain" />
          <label className="mt-3 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 text-xs font-black text-blue-700 transition hover:bg-blue-100">
            <ImageUp className="h-4 w-4" />
            Change Logo
            <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadInvoiceLogo(event.target.files?.[0])} />
          </label>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D4AF37]">{invoice.invoice_type}</p>
          <h2 className="mt-2 text-4xl font-black leading-tight text-slate-950 md:text-5xl">Global Freight Invoice</h2>
          <p className="mt-3 max-w-2xl text-base font-bold text-slate-600">
            {invoice.seller_tagline || "International Logistics & Freight Forwarding"} for transport, customs, demurrage, detention, port, documentation, and cross-border shipment charges.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Container", "Truck", "Customs", "Demurrage", "Detention", "THC"].map((item) => (
              <span key={item} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{item}</span>
            ))}
          </div>
        </div>
        <div className="rounded-[28px] border border-blue-100 bg-blue-50/70 p-5 shadow-inner">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Invoice Number</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{invoice.invoice_number || "New Invoice"}</p>
          <div className="mt-4 grid gap-2 text-sm font-bold text-slate-600">
            <p>Issue Date: {invoice.invoice_date || "-"}</p>
            <p>Due Date: {invoice.due_date || "-"}</p>
            <p>Terms: {invoice.payment_terms || "-"}</p>
            <p>Currency: {invoice.currency || "USD"}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function ChargesPanel({ invoice, update, totals }: { invoice: InvoiceForm; update: (field: keyof InvoiceForm, value: string) => void; totals: ReturnType<typeof calculateInvoice> }) {
  const charges: Array<[keyof InvoiceForm, string]> = [
    ["freight_charges", "Freight Charges"],
    ["demurrage_charges", "Demurrage Charges"],
    ["detention_charges", "Detention Charges"],
    ["documentation_charges", "Documentation Charges"],
    ["port_charges", "Port Charges"],
    ["tax", "Tax"],
    ["discount", "Discount"],
  ]

  return (
    <GlassBlock title="Charges Summary" icon={<CreditCard className="h-4 w-4" />}>
      <div className="grid gap-3">
        {charges.map(([field, label]) => (
          <div key={field} className="grid grid-cols-[1fr_130px] items-center gap-3 rounded-2xl border border-blue-100 bg-white/70 p-2">
            <span className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">{label}</span>
            <Input value={String(invoice[field] || "")} onChange={(event) => update(field, event.target.value)} className="h-9 text-right font-black" />
          </div>
        ))}
      </div>
      <div className="rounded-3xl border border-[#D4AF37]/50 bg-[#D4AF37]/15 p-5 text-right">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6a00]">Grand Total</p>
        <p className="mt-2 text-3xl font-black text-blue-700">{money(totals.total, invoice.currency)}</p>
      </div>
    </GlassBlock>
  )
}

function InvoicePreview({ invoice: invoiceInput, onDownloadPdf, onPrint, onEdit }: { invoice: InvoiceForm; onDownloadPdf?: () => void; onPrint?: () => void; onEdit?: () => void }) {
  const [zoom, setZoom] = useState<number>(1)
  const invoice = normalizeInvoice(invoiceInput)
  const totals = calculateInvoice(invoice)
  const attachmentCount = invoice.attachments.split(",").map((item) => item.trim()).filter(Boolean).length
  const printableItems = invoice.items.filter(
    (item) => !isEmpty(item.description) || !isEmpty(item.date) || !isEmpty(item.containerNo) || !isEmpty(item.quantity) || !isEmpty(item.unitPrice)
  )
  const showBillTo = ![invoice.buyer_name, invoice.buyer_address, invoice.buyer_contact_person, invoice.buyer_phone, invoice.buyer_email, invoice.buyer_tax_number].every(isEmpty)
  const showShipmentInfo = ![
    invoice.shipper, invoice.shipment_type, invoice.container_no, invoice.seal_no, invoice.truck_no,
    invoice.driver_name, invoice.driver_phone, invoice.booking_no, invoice.bl_no, invoice.route,
    invoice.origin, invoice.destination, invoice.final_destination, invoice.vessel_voyage,
    invoice.cargo_description, invoice.commodity, invoice.weight, invoice.shipment_quantity
  ].every(isEmpty)
  const showPaymentDetails = hasAnyValue(invoice.bank_name, invoice.account_name, invoice.account_number, invoice.iban, invoice.swift_code, invoice.branch)
  const showAttachments = hasAnyValue(invoice.attachments)
  const showTerms = hasAnyValue(invoice.terms)
  const showSignatures = hasAnyValue(invoice.prepared_by, invoice.approved_by, invoice.signature_position)
  const convertedTotal = calculateConvertedTotal(totals.total, invoice.currencyExchange?.exchangeRate || "")
  const showCurrencyExchange =
    invoice.currencyExchange?.enabled &&
    (hasValue(invoice.currencyExchange.exchangeRate) || convertedTotal !== null || hasValue(invoice.currencyExchange.notes))

  return (
    <div className="flex flex-col items-center w-full">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Noto+Naskh+Arabic:wght@400;700&display=swap');
        
        .a4-page-container {
          font-family: 'Inter', -apple-system, sans-serif;
          color: #0F172A;
          background-color: #ffffff;
        }
        
        .rtl-text {
          direction: rtl;
          text-align: right;
          font-family: 'Noto Naskh Arabic', serif;
          line-height: 1.6;
        }
        
        .ltr-text {
          direction: ltr;
          text-align: left;
        }

        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            transform: none !important;
          }
          .invoice-print-root {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 12mm 10mm 12mm 10mm;
          }
        }
      `}</style>
      
      <div className="no-print mb-6 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/60 bg-white/50 p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="rounded-xl">-</Button>
          <span className="w-12 text-center text-xs font-bold text-slate-700">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(2, z + 0.25))} className="rounded-xl">+</Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(1)} className="ml-2 rounded-xl text-xs">Fit Page</Button>
        </div>
        <div className="flex gap-2">
          {onEdit && <Button variant="ghost" size="sm" onClick={onEdit} className="rounded-xl text-xs text-slate-600">Back to Edit</Button>}
          {onDownloadPdf && <Button variant="outline" size="sm" onClick={onDownloadPdf} className="rounded-xl border-blue-200 text-blue-700"><Download className="mr-2 h-4 w-4" /> PDF</Button>}
          {onPrint && <Button size="sm" onClick={onPrint} className="rounded-xl bg-blue-600 text-white"><Printer className="mr-2 h-4 w-4" /> Print</Button>}
        </div>
      </div>

      <div className="print-wrapper w-full overflow-auto pb-20 flex justify-center bg-slate-100/50 p-6 no-print:py-12">
        <div 
          className="invoice-print-root a4-page-container w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] overflow-hidden flex flex-col justify-between bg-white border border-[#D9E2F1] shadow-[0_0_30px_rgba(30,41,59,0.1)] transition-transform duration-200 origin-top p-[12mm_10mm_12mm_10mm] print:p-0 print:border-none print:shadow-none"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-[#D9E2F1] pb-4 h-[80px] shrink-0">
            {/* Left: Logo & Company details centered vertically */}
            <div className="flex items-center gap-4 h-full">
              {invoice.seller_logo ? (
                <img src={invoice.seller_logo} alt="Logo" className="h-[80px] max-w-[150px] object-contain shrink-0" />
              ) : null}
              <div className="flex flex-col justify-center border-l border-[#D9E2F1] pl-4 h-[70px]">
                <h2 className="text-[24px] font-bold text-[#0F172A] tracking-wide leading-tight">{invoice.seller_name}</h2>
                {invoice.seller_tagline && <p className="text-[9px] font-bold uppercase tracking-widest text-[#1E4ED8] mt-0.5">{invoice.seller_tagline}</p>}
                <p className="text-[10px] text-slate-500 leading-tight mt-1">{invoice.seller_address} | {invoice.seller_contact}</p>
              </div>
            </div>
            {/* Right: Invoice title & number */}
            <div className="text-right flex flex-col justify-center h-full">
              <h1 className="text-[36px] font-bold uppercase text-[#1E4ED8] tracking-wider leading-none">{invoice.invoice_type || "Invoice"}</h1>
              <p className="text-[14px] font-semibold text-slate-600 mt-1.5">Invoice No: <span className="font-bold text-[#0F172A]">{invoice.invoice_number}</span></p>
              {invoice.invoice_ref_no && <p className="text-[11px] text-slate-500">Ref No: {invoice.invoice_ref_no}</p>}
            </div>
          </div>

          {/* Parties & Shipment Panels */}
          <div className="grid grid-cols-2 gap-4 mt-4 shrink-0">
            {/* Bill To Card */}
            <div className="rounded-md border border-[#D9E2F1] bg-white p-4 text-[11px] leading-relaxed flex flex-col justify-between">
              <div>
                <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-[#1E4ED8] flex items-center gap-1.5 border-b border-[#D9E2F1] pb-1.5">
                  <span className="w-1.5 h-3.5 bg-[#1E4ED8] rounded-sm"></span>
                  Bill To / مشتری
                </p>
                <div className="space-y-2 text-slate-700">
                  {invoice.buyer_contact_person && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">👤</span>
                      <span className="font-bold text-[#0F172A]">{invoice.buyer_contact_person}</span>
                    </div>
                  )}
                  {invoice.buyer_name && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">🏢</span>
                      <span className="font-semibold text-slate-800">{invoice.buyer_name}</span>
                    </div>
                  )}
                  {invoice.buyer_address && (
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 mt-0.5">📍</span>
                      <span className="text-slate-600 leading-tight"><PreviewText text={invoice.buyer_address} /></span>
                    </div>
                  )}
                  {invoice.buyer_phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">📞</span>
                      <span className="text-slate-600">{invoice.buyer_phone}</span>
                    </div>
                  )}
                  {invoice.buyer_email && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">✉️</span>
                      <span className="text-slate-600">{invoice.buyer_email}</span>
                    </div>
                  )}
                  {invoice.buyer_tax_number && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">📑</span>
                      <span className="text-slate-600 font-medium">Tax No: {invoice.buyer_tax_number}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Shipment details card */}
            <div className="rounded-md border border-[#D9E2F1] bg-white p-4 text-[11px] leading-relaxed">
              <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-[#1E4ED8] flex items-center gap-1.5 border-b border-[#D9E2F1] pb-1.5">
                <span className="w-1.5 h-3.5 bg-[#1E4ED8] rounded-sm"></span>
                Shipment Details / معلومات محموله
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-700">
                <div className="flex justify-between border-b border-[#D9E2F1]/50 pb-0.5">
                  <span className="text-slate-400">Shipment Type:</span>
                  <span className="font-bold text-[#0F172A]">{invoice.shipment_type || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-[#D9E2F1]/50 pb-0.5">
                  <span className="text-slate-400">BL Number:</span>
                  <span className="font-bold text-[#0F172A]">{invoice.bl_no || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-[#D9E2F1]/50 pb-0.5">
                  <span className="text-slate-400">Origin:</span>
                  <span className="font-bold text-[#0F172A]">{invoice.origin || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-[#D9E2F1]/50 pb-0.5">
                  <span className="text-slate-400">Container No:</span>
                  <span className="font-bold text-[#0F172A]">{invoice.container_no || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-[#D9E2F1]/50 pb-0.5">
                  <span className="text-slate-400">Destination:</span>
                  <span className="font-bold text-[#0F172A]">{invoice.destination || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-[#D9E2F1]/50 pb-0.5">
                  <span className="text-slate-400">Seal Number:</span>
                  <span className="font-bold text-[#0F172A]">{invoice.seal_no || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-[#D9E2F1]/50 pb-0.5">
                  <span className="text-slate-400">Commodity:</span>
                  <span className="font-bold text-[#0F172A]">{invoice.commodity || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-[#D9E2F1]/50 pb-0.5">
                  <span className="text-slate-400">Gross Weight:</span>
                  <span className="font-bold text-[#0F172A]">{invoice.weight || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-[#D9E2F1]/50 pb-0.5 col-span-2">
                  <span className="text-slate-400">Route:</span>
                  <span className="font-bold text-[#0F172A] truncate max-w-[200px]">{invoice.route || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charges Table */}
          <div className="mt-4 border border-[#D9E2F1] rounded-md overflow-hidden bg-white shrink-0" style={{ minHeight: "420px" }}>
            <table className="w-full text-[11px] leading-snug table-fixed border-collapse" dir="ltr">
              <colgroup>
                <col style={{ width: "6%" }} />     {/* S.No */}
                <col style={{ width: "42%" }} />    {/* Description */}
                <col style={{ width: "20%" }} />    {/* Commodity */}
                <col style={{ width: "10%" }} />    {/* Qty */}
                <col style={{ width: "11%" }} />    {/* Unit Price */}
                <col style={{ width: "11%" }} />    {/* Amount */}
              </colgroup>
              <thead className="bg-[#1E4ED8] text-white print:bg-[#1E4ED8] print:text-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <tr>
                  <th className="p-2.5 text-center font-bold border-b border-[#D9E2F1] text-white">S.No</th>
                  <th className="p-2.5 text-left font-bold border-b border-[#D9E2F1] text-white">Description / تفصیـلات</th>
                  <th className="p-2.5 text-left font-bold border-b border-[#D9E2F1] text-white">Commodity / نوع کالا</th>
                  <th className="p-2.5 text-center font-bold border-b border-[#D9E2F1] text-white">Qty / تعداد</th>
                  <th className="p-2.5 text-right font-bold border-b border-[#D9E2F1] text-white">Unit Price / قیمت</th>
                  <th className="p-2.5 text-right font-bold border-b border-[#D9E2F1] text-white">Amount / مجموع</th>
                </tr>
              </thead>
              <tbody className="text-slate-800">
                {(() => {
                  const maxRows = 8;
                  const totalRows = Math.max(maxRows, printableItems.length);
                  const rows = [];
                  for (let index = 0; index < totalRows; index++) {
                    const item = index < printableItems.length ? printableItems[index] : null;
                    const amount = item ? numberValue(item.quantity) * numberValue(item.unitPrice) : 0;
                    
                    rows.push(
                      <tr 
                        key={item ? item.id : `empty-${index}`} 
                        className={`border-b border-[#D9E2F1] h-[48px] ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50 print:bg-slate-50'}`}
                        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', pageBreakInside: 'avoid' }}
                      >
                        <td className="p-2.5 align-middle text-center font-semibold text-slate-400 border-r border-[#D9E2F1]">{index + 1}</td>
                        <td className="p-2.5 align-middle font-medium border-r border-[#D9E2F1] overflow-hidden" style={{ overflowWrap: "anywhere" }}>
                          {item ? (
                            <div className="flex flex-col gap-0.5">
                              <PreviewText text={item.description} />
                              {(item.date || item.containerNo) && (
                                <span className="text-[9px] text-slate-500 font-normal">
                                  {[item.date && `Date: ${item.date}`, item.containerNo && `Container: ${item.containerNo}`].filter(Boolean).join(" | ")}
                                </span>
                              )}
                            </div>
                          ) : ""}
                        </td>
                        <td className="p-2.5 align-middle border-r border-[#D9E2F1] overflow-hidden">
                          {item ? (
                            <PreviewText text={item.commodity || invoice.commodity || "-"} />
                          ) : ""}
                        </td>
                        <td className="p-2.5 align-middle text-center border-r border-[#D9E2F1] whitespace-nowrap">
                          {item ? `${item.quantity || "-"} ${item.unit || ""}` : ""}
                        </td>
                        <td className="p-2.5 align-middle text-right border-r border-[#D9E2F1] whitespace-nowrap">
                          {item ? money(numberValue(item.unitPrice), invoice.currency) : ""}
                        </td>
                        <td className="p-2.5 align-middle text-right font-bold whitespace-nowrap">
                          {item ? money(amount, invoice.currency) : ""}
                        </td>
                      </tr>
                    );
                  }
                  return rows;
                })()}
              </tbody>
            </table>
          </div>

          {/* Summaries & Payment */}
          <div className="mt-4 grid grid-cols-[1fr_280px] gap-6 shrink-0">
            {/* Left Column: Payment Details */}
            <div className="rounded-md border border-[#D9E2F1] bg-white p-4 text-[11px] leading-relaxed">
              <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-[#1E4ED8] border-b border-[#D9E2F1] pb-1.5">Payment Details / معلومات پرداخت</p>
              <div className="space-y-2 text-slate-700">
                {invoice.bank_name && (
                  <div className="flex border-b border-slate-100 pb-1">
                    <span className="w-28 font-semibold text-slate-400">Bank Name:</span>
                    <span className="font-bold text-[#0F172A]">{invoice.bank_name}</span>
                  </div>
                )}
                {invoice.account_name && (
                  <div className="flex border-b border-slate-100 pb-1">
                    <span className="w-28 font-semibold text-slate-400">Account Name:</span>
                    <span className="font-bold text-[#0F172A]">{invoice.account_name}</span>
                  </div>
                )}
                {invoice.account_number && (
                  <div className="flex border-b border-slate-100 pb-1">
                    <span className="w-28 font-semibold text-slate-400">Account Number:</span>
                    <span className="font-bold text-[#0F172A]">{invoice.account_number}</span>
                  </div>
                )}
                {invoice.swift_code && (
                  <div className="flex border-b border-slate-100 pb-1">
                    <span className="w-28 font-semibold text-slate-400">SWIFT Code:</span>
                    <span className="font-bold text-[#0F172A]">{invoice.swift_code}</span>
                  </div>
                )}
                {invoice.iban && (
                  <div className="flex border-b border-slate-100 pb-1">
                    <span className="w-28 font-semibold text-slate-400">IBAN:</span>
                    <span className="font-bold text-[#0F172A]">{invoice.iban}</span>
                  </div>
                )}
                {invoice.branch && (
                  <div className="flex">
                    <span className="w-28 font-semibold text-slate-400">Branch:</span>
                    <span className="font-bold text-[#0F172A]">{invoice.branch}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Charges Summary */}
            {(() => {
              const freight = numberValue(invoice.freight_charges);
              const demurrage = numberValue(invoice.demurrage_charges);
              const detention = numberValue(invoice.detention_charges);
              const documentation = numberValue(invoice.documentation_charges);
              const port = numberValue(invoice.port_charges);
              const truck = numberValue(invoice.truck_charges);
              const other = numberValue(invoice.other_charges);
              
              const subtotalBeforeTaxAndDiscount = totals.serviceSubtotal + freight + demurrage + detention + documentation + port + truck + other;

              return (
                <div className="rounded-md border border-[#D9E2F1] bg-white p-4 text-[11px] leading-relaxed flex flex-col justify-between">
                  <div>
                    <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-[#1E4ED8] border-b border-[#D9E2F1] pb-1.5">Charges Summary / خلاصه مصارف</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Subtotal:</span>
                        <span className="font-bold text-slate-800">{money(subtotalBeforeTaxAndDiscount, invoice.currency)}</span>
                      </div>
                      {numberValue(invoice.tax) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-semibold">Tax:</span>
                          <span className="font-bold text-slate-800">+{money(numberValue(invoice.tax), invoice.currency)}</span>
                        </div>
                      )}
                      {numberValue(invoice.discount) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-semibold text-rose-500">Discount:</span>
                          <span className="font-bold text-emerald-600">-{money(numberValue(invoice.discount), invoice.currency)}</span>
                        </div>
                      )}
                      {showCurrencyExchange && convertedTotal !== null && (
                        <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5 mt-1.5">
                          <span className="text-slate-500 font-semibold">In {invoice.currencyExchange.targetCurrency}:</span>
                          <span className="font-bold text-slate-800">{formatMoney(convertedTotal, invoice.currencyExchange.targetCurrency)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Grand Total occupies full width */}
                  <div className="mt-4 border-t border-[#D9E2F1] pt-3">
                    <div 
                      className="rounded bg-[#1E4ED8] px-4 py-2.5 text-white flex flex-col items-center justify-center print:bg-[#1E4ED8] print:text-white" 
                      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100">Grand Total / مجموع کل</span>
                      <span className="text-[28px] font-bold leading-none mt-1">{money(totals.total, invoice.currency)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Footer & Signatures (pinned to bottom) */}
          <div className="mt-auto pt-6 border-t border-[#D9E2F1] flex flex-col gap-4 shrink-0">
            {/* Signature Section */}
            {showSignatures && (
              <div className="grid grid-cols-3 gap-6 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-[140px] border-t-2 border-slate-400 pt-1.5 font-bold text-slate-700 text-[11px]">Prepared By</div>
                  <span className="text-[10px] text-slate-400 mt-0.5">{invoice.prepared_by || "Accounts Dept"}</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-[140px] border-t-2 border-slate-400 pt-1.5 font-bold text-slate-700 text-[11px]">Customer Signature</div>
                  <span className="text-[10px] text-slate-400 mt-0.5">Stamp & Signature</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-[140px] border-t-2 border-slate-400 pt-1.5 font-bold text-slate-700 text-[11px]">Approved By</div>
                  <span className="text-[10px] text-slate-400 mt-0.5">{invoice.approved_by || "Authorized Stamp"}</span>
                </div>
              </div>
            )}

            {/* Terms and Attachments */}
            <div className="grid grid-cols-2 gap-6 text-[10px] text-slate-500 leading-tight">
              {showTerms && (
                <div>
                  <span className="font-bold text-slate-700 block mb-0.5">Terms & Conditions:</span>
                  <p className="text-slate-500">{invoice.terms}</p>
                </div>
              )}
              {showAttachments && (
                <div className="flex flex-col justify-end text-right">
                  <p><span className="font-bold text-slate-700">Attachments:</span> <span className="text-slate-500">{invoice.attachments}</span></p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function PreviewCard({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-md border border-slate-200 bg-white p-3 text-[10px] leading-relaxed ${className}`}>
      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-[#1E4ED8]">{title}</p>
      {children}
    </div>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  if (isEmpty(value)) return null
  return (
    <div className="flex gap-1">
      <span className="font-bold text-slate-800 whitespace-nowrap">{label}:</span>
      <span className="text-slate-600 truncate"><PreviewText text={value} /></span>
    </div>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  if (isBlank(value)) return null
  return (
    <div className="flex items-center justify-between gap-4 text-[11px]">
      <span className="text-slate-600 font-medium">{label}</span>
      <span className="text-slate-900 font-bold">{value}</span>
    </div>
  )
}

function renderChargeRow(label: string, value?: string | null, currency = "USD") {
  if (!hasPrintableCharge(value)) return null
  return (
    <div key={label} className="flex items-center justify-between gap-4 text-[11px]">
      <span className="text-slate-600 font-medium">{label}</span>
      <span className="text-slate-900 font-bold">{formatCurrency(value || undefined, currency)}</span>
    </div>
  )
}

function PreviewText({ text }: { text?: string }) {
  if (isEmpty(text)) return null
  const rtl = detectRTL(text)
  return (
    <span dir={rtl ? "rtl" : "ltr"} className={`inline-block w-full ${rtl ? "rtl-text" : "ltr-text"}`}>
      {text}
    </span>
  )
}

function SignatureBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="pt-8 flex flex-col items-center">
      <div className="w-3/4 border-t border-slate-400 pt-1 text-slate-800 font-bold">{label}</div>
      <p className="text-[9px] text-slate-500 mt-0.5">{value || "-"}</p>
    </div>
  )
}
