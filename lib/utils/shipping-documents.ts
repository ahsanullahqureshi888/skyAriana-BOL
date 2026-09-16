"use client"

import { jsPDF } from "jspdf"
import type { BillOfLadingFormData } from "@/lib/types/bill-of-lading"
import {
  STICKER_FSSAI_VEG_DATA_URL,
  STICKER_AFGHANISTAN_LOGO_DATA_URL,
} from "@/lib/sticker-badges-data"
import { isPashtoOrArabic, prepareBidiPdfText } from "@/lib/utils/pashto-bidi"
import {
  registerPDFFonts,
  hasRegisteredPDFFonts,
  setSmartPDFFont,
} from "@/lib/utils/pdf-fonts"

export type ShippingDocumentKind = "bol" | "packing-list" | "stickers" | "bol-packing" | "all"
export type StickerLayout = "single" | "sheet"

export interface ShippingContainerDetail {
  containerNumber: string
  sealNumber: string
  containerType?: string
  packages?: string
  grossWeight?: string
  netWeight?: string
}

export interface CommodityItem {
  itemNo: number
  commodity: string
  packageCount: number
  packageCountText: string
  packageType: string
  netWeight: string
  grossWeight: string
  measurement?: string
  hsCode?: string
  packingDateMonthYear?: string
  expiryDateMonthYear?: string
}

export interface ShippingDocumentData {
  bolNumber: string
  bookingNumber: string
  invoiceNumber: string
  invoiceDate: string
  date: string
  packingDateMonthYear: string
  expiryDateMonthYear: string

  // Driver & Vehicle Transport
  driverName?: string
  driverFatherName?: string
  driverContact?: string
  truckNumber?: string
  driverRent?: string
  driverRentCurrency?: string

  // Exporter / Shipper
  shipper: string
  shipperAddress: string
  shipperPhone: string
  shipperLicence: string

  // Importer / Consignee
  consignee: string
  consigneeAddress: string
  consigneePhone: string
  consigneeFssai: string
  consigneeEmail: string
  consigneeGst?: string
  consigneePan?: string

  // Batch & Cargo
  lotNo?: string

  // Notify Party
  notifyParty: string
  notifyPartyAddress: string

  // Containers & Transport
  containerNumber: string
  sealNumber: string
  containers: ShippingContainerDetail[]
  vesselName: string
  voyageNumber: string
  portOfLoading: string
  portOfDischarge: string
  finalDestination: string

  // Cargo & Packaging
  commodity: string
  hsCode: string
  packageCount: number
  packageCountText: string
  packageType: string
  grossWeight: string
  netWeight: string
  measurement: string
  containerType: string
  marksAndNumbers: string

  // Multi-Commodity Items
  commodities: CommodityItem[]

  // Company Profile Info
  companyName: string
  companySubtitle: string
  companyPhone: string
  companyEmail: string
  companyAddress: string
  companyLicence: string
}

export interface GenerateShippingDocumentsOptions {
  kind: ShippingDocumentKind
  data: ShippingDocumentData
  bolElement?: HTMLElement | null
  logoUrl?: string
  companyName?: string
  companySubtitle?: string
  companyPhone?: string
  companyEmail?: string
  companyAddress?: string
  companyLicence?: string
  stickerQuantity?: number
  stickerLayout?: StickerLayout
}

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const BRAND_PURPLE = [88, 49, 132] as const // #583184
const TEXT_BLACK = [15, 23, 42] as const
const TEXT_MUTED = [100, 116, 139] as const
const BORDER_COLOR = [203, 213, 225] as const
const BG_LIGHT = [248, 250, 252] as const

export const clean = (value?: string | null): string => {
  if (!value) return ""
  const trimmed = String(value).replace(/\s+/g, " ").trim()
  if (/^(undefined|null|none|n\/a|nan|\[object Object\]|—|-)$/i.test(trimmed)) return ""
  return trimmed
}

export function taggedValue(source: string, labels: string[]): string {
  if (!source) return ""
  for (const label of labels) {
    const expression = new RegExp(`${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[:#-]?\\s*([^|│\\n]+)`, "gi")
    const values = Array.from(source.matchAll(expression), (match) => clean(match[1])).filter(Boolean)
    if (values.length) return values.at(-1) || ""
  }
  return ""
}

export function cleanCommodity(value: string): string {
  return clean(value)
    .replace(/^\d[\d,.\s-]*(?:ctns?|cartons?|bags?|packages?|units?)\s*[-:]?\s*/i, "")
    .replace(/^[\s:|-]+|[\s:|-]+$/g, "")
}

function positiveInteger(value: string): number {
  const parsed = Number.parseInt(String(value).replace(/[^0-9]/g, ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export function extractLicenceNo(address: string, fallback?: string): string {
  if (!address && !fallback) return ""
  const match = address.match(/(?:Licen[sc]e|Lic|Registration|Reg)\s*(?:No\.?|Number)?\s*[:#-]?\s*([A-Za-z0-9\/-]+)/i)
  if (match && match[1]) return clean(match[1])
  return clean(fallback)
}

export function extractFssai(address: string, fallback?: string): string {
  if (!address && !fallback) return ""
  const match = address.match(/(?:FSSAI|FASSI|FSAI)\s*(?:NO\.?|Number|#)?\s*[:#-]?\s*([0-9]{10,14})/i)
  if (match && match[1]) return clean(match[1])
  return clean(fallback)
}

export function extractPhone(text: string, fallback?: string): string {
  if (!text && !fallback) return clean(fallback)
  const match = text.match(/(?:Cell(?:\s*No\.?)?|Phone|Tel|Mobile|Mob|Contact(?:\s*No\.?)?)\s*[:#-]?\s*([+0-9\s-]{7,25})/i)
  if (match && match[1]) return clean(match[1])
  return clean(fallback)
}

export function extractEmail(text: string, fallback?: string): string {
  if (!text && !fallback) return clean(fallback)
  const match = text.match(/(?:E-?MAIL|Email)\s*[:#-]?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
  if (match && match[1]) return clean(match[1])
  return clean(fallback)
}

export function extractGst(text: string, fallback?: string): string {
  if (!text && !fallback) return clean(fallback)
  const match = text.match(/(?:GSTIN|GST)\s*[:#-]?\s*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i) || text.match(/GST\s*(?:NO\.?|Number)?\s*[:#-]?\s*([A-Za-z0-9]+)/i)
  if (match && match[1]) return clean(match[1])
  return clean(fallback)
}

export function extractPan(text: string, fallback?: string): string {
  if (!text && !fallback) return clean(fallback)
  const match = text.match(/(?:PAN|PAN\s*NO\.?)\s*[:#-]?\s*([A-Z]{5}[0-9]{4}[A-Z]{1})/i) || text.match(/PAN\s*(?:NO\.?|Number)?\s*[:#-]?\s*([A-Za-z0-9]+)/i)
  if (match && match[1]) return clean(match[1])
  return clean(fallback)
}

export function extractLotNo(text?: string | null, fallback?: string): string {
  if (!text) return clean(fallback)
  const match = text.match(/(?:LOT\s*(?:NO\.?|NUMBER)?|BATCH\s*(?:NO\.?|NUMBER)?)\s*[:#-]?\s*([A-Za-z0-9,\s/-]+)/i)
  if (match && match[1]) return clean(match[1])
  return clean(fallback)
}

export function cleanAddressBlock(address: string): string {
  if (!address) return ""
  const lines = address
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const filtered = lines.filter((line) => {
    if (/^(?:FSSAI|FASSI|FSAI|GST|GSTIN|IEC|PAN|PHONE|CELL|MOB|TEL|CONTACT|EMAIL|E-MAIL|LICENCE|LICENSE)\b/i.test(line)) {
      return false
    }
    return true
  })

  return filtered.join("\n").trim()
}

const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

export function formatMonthYear(dateStr?: string | null): string {
  if (!dateStr) return ""
  const trimmed = dateStr.trim()
  if (!trimmed) return ""

  // Check if already in MONTH/YEAR format like "OCT/2025" or "OCT 2025"
  const myMatch = trimmed.match(/^([a-zA-Z]{3})[\s/-]+(\d{4})$/i)
  if (myMatch) {
    return `${myMatch[1].toUpperCase()}/${myMatch[2]}`
  }

  // Parse YYYY-MM-DD or DD/MM/YYYY
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (isoMatch) {
    const year = Number.parseInt(isoMatch[1], 10)
    const month = Number.parseInt(isoMatch[2], 10) - 1
    if (month >= 0 && month < 12) {
      return `${MONTH_NAMES[month]}/${year}`
    }
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (dmyMatch) {
    const month = Number.parseInt(dmyMatch[2], 10) - 1
    const year = Number.parseInt(dmyMatch[3], 10)
    if (month >= 0 && month < 12) {
      return `${MONTH_NAMES[month]}/${year}`
    }
  }

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    return `${MONTH_NAMES[parsed.getMonth()]}/${parsed.getFullYear()}`
  }

  return ""
}

export function calculateExpiryMonthYear(packingDateStr?: string | null, cargoText?: string): string {
  // Check for explicit expiry in cargo text
  if (cargoText) {
    const explicit = taggedValue(cargoText, ["Date of Expiry", "Expiry Date", "Expiry", "Exp Date", "Exp", "Best Before"])
    if (explicit) {
      const formatted = formatMonthYear(explicit)
      if (formatted) return formatted
      return clean(explicit)
    }
  }

  if (!packingDateStr) return ""
  const trimmed = packingDateStr.trim()
  const parsed = new Date(trimmed)

  if (!Number.isNaN(parsed.getTime())) {
    parsed.setFullYear(parsed.getFullYear() + 2) // Standard 24 months shelf life for dried fruits & nuts
    return `${MONTH_NAMES[parsed.getMonth()]}/${parsed.getFullYear()}`
  }

  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (isoMatch) {
    const year = Number.parseInt(isoMatch[1], 10) + 2
    const month = Number.parseInt(isoMatch[2], 10) - 1
    if (month >= 0 && month < 12) {
      return `${MONTH_NAMES[month]}/${year}`
    }
  }

  return ""
}

export function parseContainers(containerText: string, sealText: string): ShippingContainerDetail[] {
  const containerList = containerText
    .split(/[,;\n/]+/)
    .map((s) => clean(s))
    .filter(Boolean)

  const sealList = sealText
    .split(/[,;\n/]+/)
    .map((s) => clean(s))
    .filter(Boolean)

  if (containerList.length === 0) {
    return [
      {
        containerNumber: clean(containerText),
        sealNumber: clean(sealText),
      },
    ]
  }

  return containerList.map((cntr, idx) => ({
    containerNumber: cntr,
    sealNumber: sealList[idx] || (sealList.length === 1 ? sealList[0] : ""),
  }))
}

/**
 * Intelligent Multi-Commodity Parser:
 * Parses multiple cargo lines from BOL cargo description, package breakdown, and weights.
 * Example inputs:
 * "BLACK RAISINS | 630 CTNS | 16 KG\nDRY APRICOT | 300 CTNS | 10 KG"
 * "1. BLACK RAISINS - 630 CTNS - NET 10,080 KG\n2. DRY APRICOT - 300 CTNS - NET 3,000 KG"
 */
export function parseCommodityItems(
  cargoText: string,
  totalPackagesStr: string,
  netWeightStr: string,
  grossWeightStr: string,
  kgsPerCartonStr: string,
  grossPerCartonStr: string,
  packageTypeStr: string,
  hsCodeStr: string,
  measurementStr: string,
  packingDateMY: string,
  expiryDateMY: string,
): CommodityItem[] {
  const lines = (cargoText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false
      // Filter out pure container/shipping header decorative banners
      if (/^(?:📦|🧾|📄|📅|CONTAINER & CARGO|DOCUMENT & SHIPPING)/i.test(l)) return false
      return true
    })

  const detectedItems: CommodityItem[] = []

  for (const line of lines) {
    // Check if line contains a pipe or hyphen breakdown with quantity/commodity
    // e.g. "BLACK RAISINS | 630 CTNS | 16 KG" or "DRY APRICOT | 300 CTNS | 10 KG"
    // or "🥬 Cargo: BLACK RAISINS | 630 CTNS"
    const cleanedLine = line.replace(/^[0-9]+[.)]\s*/, "").replace(/^🥬\s*Cargo:\s*/i, "").trim()
    if (!cleanedLine) continue

    const parts = cleanedLine.split(/[|│]+/).map((p) => p.trim()).filter(Boolean)
    if (parts.length >= 2) {
      let commodity = ""
      let countText = ""
      let countNum = 0
      let pkgType = packageTypeStr || "Cartons"
      let net = ""
      let gross = ""
      let hs = hsCodeStr

      for (const part of parts) {
        // Check for package count like "630 CTNS" or "300 BAGS" or "1000 PACKAGES"
        const pkgMatch = part.match(/^(\d[\d,\s]*)\s*(CTNS?|CARTONS?|BAGS?|PKGS?|PACKAGES?|UNITS?|BOXES?)\b/i)
        if (pkgMatch) {
          countText = pkgMatch[1].replace(/\s+/g, "").trim()
          countNum = positiveInteger(countText)
          if (/bag/i.test(pkgMatch[2])) pkgType = "Bags"
          else if (/unit/i.test(pkgMatch[2])) pkgType = "Units"
          else if (/package|pkg/i.test(pkgMatch[2])) pkgType = "Packages"
          else pkgType = "Cartons"
          continue
        }

        // Check for weight like "16 KG" or "NET 10,080 KGS" or "GROSS 10,800 KGS"
        const netMatch = part.match(/(?:NET(?:\s*WT)?:?\s*)?(\d[\d,\s.]*\s*(?:KG|KGS|MT|TONS?|LBS?))/i)
        const grossMatch = part.match(/(?:GROSS(?:\s*WT)?:?\s*)(\d[\d,\s.]*\s*(?:KG|KGS|MT|TONS?|LBS?))/i)

        if (grossMatch) {
          gross = clean(grossMatch[1])
          continue
        } else if (netMatch && /\b(?:KG|KGS|MT|TONS?)\b/i.test(part)) {
          net = clean(netMatch[1])
          continue
        }

        // Check for HS CODE
        const hsMatch = part.match(/HS\s*(?:CODE)?:?\s*([0-9.]+)/i)
        if (hsMatch) {
          hs = clean(hsMatch[1])
          continue
        }

        // Otherwise assume this part is the commodity name
        if (!commodity && part.length > 2 && !/^(?:NET|GROSS|TOTAL|CONTAINER|INVOICE|DATE)/i.test(part)) {
          commodity = cleanCommodity(part)
        }
      }

      if (commodity && (countNum > 0 || net || parts.length >= 2)) {
        // Calculate total weight if net was given per carton (e.g. 16 KG with 630 CTNS)
        if (countNum > 0 && net && !gross) {
          const numWeight = parseFloat(net.replace(/[^0-9.]/g, ""))
          if (numWeight > 0 && numWeight <= 100) {
            // Likely per-carton weight!
            const totalItemNet = Math.round(countNum * numWeight)
            net = `${totalItemNet.toLocaleString("en-US")} KGS`
            gross = `${Math.round(totalItemNet * 1.07).toLocaleString("en-US")} KGS`
          }
        }

        detectedItems.push({
          itemNo: detectedItems.length + 1,
          commodity,
          packageCount: countNum || 1,
          packageCountText: countText || (countNum ? String(countNum) : ""),
          packageType: pkgType,
          netWeight: net || netWeightStr,
          grossWeight: gross || grossWeightStr,
          measurement: measurementStr,
          hsCode: hs,
          packingDateMonthYear: packingDateMY,
          expiryDateMonthYear: expiryDateMY,
        })
      }
    }
  }

  // If multiple distinct commodity items were successfully parsed, return them
  if (detectedItems.length > 1) {
    return detectedItems
  }

  // Fallback: Check if number_of_packages has multi-item syntax like "630 CTNS + 300 CTNS" or "630, 300"
  const pkgNums = (totalPackagesStr || "").match(/\b\d+\b/g)
  const netNums = (netWeightStr || "").split(/[-–—/+,]+/).map((s) => clean(s)).filter(Boolean)
  const grossNums = (grossWeightStr || "").split(/[-–—/+,]+/).map((s) => clean(s)).filter(Boolean)

  if (pkgNums && pkgNums.length > 1 && detectedItems.length === 1) {
    // Single commodity detected from description, but multiple package counts
    // Keep the detected item
    return detectedItems
  }

  // Default single master commodity item
  const masterCount = positiveInteger(totalPackagesStr)
  return [
    {
      itemNo: 1,
      commodity: cleanCommodity(taggedValue(cargoText, ["Commodity", "Cargo", "Description of Goods"])) || cleanCommodity(cargoText) || "CONSOLIDATED CARGO",
      packageCount: masterCount,
      packageCountText: clean(totalPackagesStr) ? String(masterCount) : "",
      packageType: clean(packageTypeStr) || (/bags?/i.test(totalPackagesStr) ? "Bags" : "Cartons"),
      netWeight: clean(netWeightStr),
      grossWeight: clean(grossWeightStr),
      measurement: clean(measurementStr),
      hsCode: clean(hsCodeStr) || taggedValue(cargoText, ["HS Code", "HS CODE", "HSCode"]),
      packingDateMonthYear: packingDateMY,
      expiryDateMonthYear: expiryDateMY,
    },
  ]
}

export function deriveShippingDocumentData(
  formData: BillOfLadingFormData,
  bolNumber: string,
  issueDate: string,
): ShippingDocumentData {
  const cargo = formData.cargo_description || ""
  const extended = formData as BillOfLadingFormData & {
    booking_number?: string
    invoice_number?: string
    invoice_date?: string
    hs_code?: string
    package_type?: string
    marks_and_numbers?: string
    company_name?: string
    company_subtitle?: string
    company_phone?: string
    company_email?: string
    company_address?: string
    company_licence?: string
  }

  const routes = [...(formData.routes || [])].sort((a, b) => a.stopOrder - b.stopOrder)
  const finalRoute = routes.at(-1)
  const packages = clean(formData.number_of_packages)
  const containerNumbers = clean(formData.container_numbers)
  const sealNumbers = clean(formData.seal_numbers)
  const containers = parseContainers(containerNumbers, sealNumbers)

  const dateValue = clean(issueDate || formData.issue_date) || new Date().toISOString().slice(0, 10)
  const invoiceNum = clean(extended.invoice_number) || taggedValue(cargo, ["Invoice Number", "Invoice No", "Invoice", "Inv No"])
  const invoiceDateValue = clean(extended.invoice_date) || taggedValue(cargo, ["Invoice Date", "Inv Date"]) || dateValue

  const shipperAddr = clean(formData.shipper_address)
  const consigneeAddr = clean(formData.consignee_address)

  const shipperPhone = clean(formData.shipper_contact) || extractPhone(shipperAddr)
  const shipperLicence = clean(formData.shipper_licence) || extractLicenceNo(shipperAddr, extended.company_licence || "2401-2198")

  const consigneePhone = clean(formData.consignee_contact) || extractPhone(consigneeAddr)
  const consigneeFssai = clean(formData.consignee_fssai) || extractFssai(consigneeAddr)
  const consigneeEmail = clean(formData.consignee_email) || extractEmail(consigneeAddr)
  const consigneeGst = extractGst(consigneeAddr) || taggedValue(cargo, ["GST", "GSTIN"])
  const consigneePan = extractPan(consigneeAddr) || taggedValue(cargo, ["PAN", "PAN NO", "Pan No"])
  const lotNo =
    clean(formData.lot_no) ||
    clean(formData.lot_number) ||
    extractLotNo(cargo) ||
    extractLotNo(formData.remarks) ||
    extractLotNo(formData.marks_and_numbers) ||
    taggedValue(cargo, ["Lot No", "Lot", "LOT", "Batch No", "Batch"]) ||
    ""

  const driverName = clean(formData.driver_name)
  const driverFatherName = clean(formData.driver_father_name)
  const driverContact = clean(formData.driver_contact)
  const truckNumber = clean(formData.truck_number)
  const driverRent = clean(formData.driver_rent)
  const driverRentCurrency = formData.driver_rent_currency || "AFN"

  const packingDateMY = formatMonthYear(formData.packing_date || dateValue)
  const expiryDateMY = formatMonthYear(formData.expiry_date) || calculateExpiryMonthYear(dateValue, cargo)

  const masterHsCode = clean(extended.hs_code) || taggedValue(cargo, ["HS Code", "HS CODE", "HSCode"])
  const masterPkgType = clean(extended.package_type) || (/bags?/i.test(packages) ? "Bags" : /units?/i.test(packages) ? "Units" : /packages?/i.test(packages) ? "Packages" : "Cartons")

  // Multi-Commodity resolution
  const commodities = parseCommodityItems(
    cargo,
    packages,
    clean(formData.net_weight),
    clean(formData.gross_weight),
    clean(formData.kgs_per_carton),
    clean(formData.gross_weight_per_carton),
    masterPkgType,
    masterHsCode,
    clean(formData.measurement),
    packingDateMY,
    expiryDateMY,
  )

  const masterCommodity = commodities.length > 1
    ? commodities.map((c) => c.commodity).join(" & ")
    : (commodities[0]?.commodity || cleanCommodity(taggedValue(cargo, ["Commodity", "Cargo", "Description of Goods"])) || cleanCommodity(packages) || clean(cargo))

  return {
    bolNumber: clean(bolNumber || formData.bol_number),
    bookingNumber: clean(extended.booking_number) || taggedValue(cargo, ["Booking Number", "Booking No", "Booking"]),
    invoiceNumber: invoiceNum,
    invoiceDate: invoiceDateValue,
    date: dateValue,
    packingDateMonthYear: packingDateMY,
    expiryDateMonthYear: expiryDateMY,

    // Driver & Vehicle Transport
    driverName,
    driverFatherName,
    driverContact,
    truckNumber,
    driverRent,
    driverRentCurrency,

    // Exporter / Shipper
    shipper: clean(formData.shipper_name),
    shipperAddress: cleanAddressBlock(shipperAddr) || shipperAddr,
    shipperPhone,
    shipperLicence,

    // Importer / Consignee
    consignee: clean(formData.consignee_name),
    consigneeAddress: cleanAddressBlock(consigneeAddr) || consigneeAddr,
    consigneePhone,
    consigneeFssai,
    consigneeEmail,
    consigneeGst,
    consigneePan,

    // Batch & Cargo
    lotNo,

    // Notify Party
    notifyParty: clean(formData.notify_party) || (clean(formData.consignee_name) ? "SAME AS CONSIGNEE" : ""),
    notifyPartyAddress: clean(formData.notify_party_address),

    // Containers & Transport
    containerNumber: containerNumbers,
    sealNumber: sealNumbers,
    containers,
    vesselName: clean(formData.vessel_name),
    voyageNumber: clean(formData.voyage_number),
    portOfLoading: clean(formData.port_of_loading || routes[0]?.location),
    portOfDischarge: clean(formData.port_of_discharge),
    finalDestination: clean(formData.place_of_delivery || finalRoute?.location),

    // Cargo & Packaging
    commodity: masterCommodity,
    hsCode: masterHsCode,
    packageCount: positiveInteger(packages),
    packageCountText: packages ? String(positiveInteger(packages)) : "",
    packageType: masterPkgType,
    grossWeight: clean(formData.gross_weight),
    netWeight: clean(formData.net_weight),
    measurement: clean(formData.measurement),
    containerType: clean([formData.container_size, formData.container_type || formData.equipment_type].filter(Boolean).join(" ")),
    marksAndNumbers: clean(extended.marks_and_numbers || formData.remarks) || "N/M",

    // Multi-Commodities
    commodities,

    // Company
    companyName: clean(extended.company_name) || "SKY ARIANA LTD",
    companySubtitle: clean(extended.company_subtitle) || "International Transportation • Transit • Forwarding",
    companyPhone: clean(extended.company_phone) || "+93 700 939 365",
    companyEmail: clean(extended.company_email) || "info@skyariana.com",
    companyAddress: clean(extended.company_address) || "Kandahar, Afghanistan",
    companyLicence: clean(extended.company_licence) || "2401-2198",
  }
}

/**
 * Normalized field mapping helper:
 * Explicit mapping from master BOL form to shipping documents data model.
 */
export function mapBolToShippingDocuments(
  formData: BillOfLadingFormData,
  bolNumber: string,
  issueDate: string,
): ShippingDocumentData {
  return deriveShippingDocumentData(formData, bolNumber, issueDate)
}

export function buildShippingDocumentFileName(kind: ShippingDocumentKind, data: ShippingDocumentData): string {
  // 1. INVOICE
  let rawInv = clean(data.invoiceNumber)
  if (!rawInv) {
    const fallbackInv = clean(data.bolNumber)
    rawInv = fallbackInv ? (fallbackInv.toUpperCase().startsWith("BOL") ? fallbackInv : `INV-${fallbackInv}`) : "INV-001"
  } else if (!/^INV|^IN/i.test(rawInv)) {
    rawInv = `INV-${rawInv}`
  }
  const cleanInvoice = rawInv
    .toUpperCase()
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.,\s]+|[-.,\s]+$/g, "")

  // 2. CONSIGNEE (Take first line of company name before newline)
  const rawConsignee = clean(String(data.consignee || "").split(/[\r\n]+/)[0])
  const cleanConsignee = (rawConsignee || "CONSIGNEE")
    .toUpperCase()
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[-.,\s]+|[-.,\s]+$/g, "")

  // 3. QUANTITY (e.g. 1400-CTNS or 520-CTNS)
  let rawQty = clean(data.packageCountText)
  if (!rawQty && data.packageCount && data.packageCount > 0) {
    rawQty = String(data.packageCount)
  }
  let cleanQuantity = ""
  if (rawQty) {
    if (/^\d+$/.test(rawQty.replace(/\s+/g, ""))) {
      const rawType = (data.packageType || "Cartons").trim().toUpperCase()
      const typeAbbr = /^CARTONS?|^CTNS?/i.test(rawType)
        ? "CTNS"
        : /^BAGS?/i.test(rawType)
        ? "BAGS"
        : /^BOXES?|^BOX/i.test(rawType)
        ? "BOXES"
        : /^PACKAGES?|^PKGS?/i.test(rawType)
        ? "PKGS"
        : /^UNITS?/i.test(rawType)
        ? "UNITS"
        : rawType.replace(/\s+/g, "-")
      cleanQuantity = `${rawQty.replace(/\s+/g, "")}-${typeAbbr}`
    } else {
      cleanQuantity = rawQty.replace(/[/\\:*?"<>|]/g, "").replace(/\s+/g, "-").toUpperCase()
    }
  } else {
    const cargo = clean(data.commodity)
    const qtyMatch = cargo.match(/(\d+[\s\-]*(?:CTNS|CNTS|BAGS|PACKAGES|BOXES|PCS|KGS|MT|CARTONS|DRUMS))/i)
    cleanQuantity = qtyMatch ? qtyMatch[1].replace(/\s+/g, "-").toUpperCase() : "QTY"
  }
  cleanQuantity = cleanQuantity.replace(/[/\\:*?"<>|]/g, "").replace(/-+/g, "-").replace(/^[-.,\s]+|[-.,\s]+$/g, "")

  // 4. PRODUCT NAME
  let rawProduct = cleanCommodity(String(data.commodity || "").split(/[\r\n]+/)[0])
  if (!rawProduct && data.commodities && data.commodities.length > 0) {
    rawProduct = data.commodities.map((c) => c.commodity).filter(Boolean).join(" & ")
  }
  const cleanProduct = (rawProduct || "CARGO")
    .toUpperCase()
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[-.,\s]+|[-.,\s]+$/g, "")

  // 5. SHIPPER NAME (Take first line of shipper name before newline)
  const rawShipper = clean(String(data.shipper || "").split(/[\r\n]+/)[0])
  const cleanShipper = (rawShipper || "SHIPPER")
    .toUpperCase()
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[-.,\s]+|[-.,\s]+$/g, "")

  // Combine elements strictly in requested order: INVOICE-CONSIGNEE-QUANTITY-PRODUCT NAME-SHIPPER NAME-
  const basePrefix = `${cleanInvoice}-${cleanConsignee}-${cleanQuantity}-${cleanProduct}-${cleanShipper}`
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")

  const docSuffixMap: Record<ShippingDocumentKind, string> = {
    bol: "BOL",
    "packing-list": "PACKING-LIST",
    stickers: "STICKER",
    all: "COMPLETE",
    "bol-packing": "BOL-PACKING-LIST",
  }

  const suffix = docSuffixMap[kind] || "DOC"
  return `${basePrefix}-${suffix}.pdf`
}

function addPageIfNeeded(pdf: jsPDF, pageHasContent: boolean): boolean {
  if (pageHasContent) pdf.addPage("a4", "portrait")
  return true
}

function valueLines(pdf: jsPDF, value: string, width: number): string[] {
  if (!value) return []
  return pdf.splitTextToSize(value, width) as string[]
}

function drawDocumentHeader(
  pdf: jsPDF,
  title: string,
  data: ShippingDocumentData,
  logoDataUrl: string | null,
  companyName: string,
  companySubtitle: string,
): number {
  pdf.setFillColor(...BRAND_PURPLE)
  pdf.rect(0, 0, PAGE_WIDTH, 6, "F")

  if (logoDataUrl) {
    try {
      pdf.addImage(logoDataUrl, "PNG", 12, 11, 22, 20, undefined, "FAST")
    } catch {
      // Fallback
    }
  }

  const fontStatus = hasRegisteredPDFFonts(pdf)
  const textLeft = logoDataUrl ? 38 : 12
  pdf.setTextColor(...TEXT_BLACK)
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(16)
  pdf.text(companyName || "SKY ARIANA LTD", textLeft, 18)

  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
  pdf.setTextColor(...TEXT_MUTED)
  pdf.setFontSize(8)
  pdf.text(companySubtitle || "International Transportation • Transit • Forwarding", textLeft, 24)

  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setTextColor(...BRAND_PURPLE)
  pdf.setFontSize(18)
  pdf.text(title, 198, 18, { align: "right" })

  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(8)
  pdf.setTextColor(...TEXT_MUTED)
  const metaLine = [
    data.bolNumber ? `B/L: ${data.bolNumber}` : "",
    data.invoiceNumber ? `INV: ${data.invoiceNumber}` : "",
    data.date ? `DATE: ${data.date}` : "",
  ].filter(Boolean).join("  •  ")
  if (metaLine) {
    pdf.text(metaLine, 198, 25, { align: "right" })
  }

  pdf.setDrawColor(...BORDER_COLOR)
  pdf.setLineWidth(0.4)
  pdf.line(12, 34, 198, 34)
  return 40
}

function renderUnicodeTextToCanvas(
  text: string,
  fontSizePt: number,
  isBold: boolean,
  color: readonly [number, number, number],
  maxWidthMm: number,
): { dataUrl: string; widthMm: number; heightMm: number } | null {
  if (typeof document === "undefined") return null
  try {
    const dpr = 3
    const fontSizePx = Math.round(fontSizePt * 1.333 * dpr)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    const fontStr = `${isBold ? "bold " : ""}${fontSizePx}px Vazirmatn, "Noto Naskh Arabic", "Segoe UI", Arial, sans-serif`
    ctx.font = fontStr
    const measured = ctx.measureText(text)
    const textWidthPx = Math.ceil(measured.width) + 8 * dpr
    const textHeightPx = Math.ceil(fontSizePx * 1.5)

    canvas.width = Math.max(1, textWidthPx)
    canvas.height = Math.max(1, textHeightPx)

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.font = fontStr
    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
    ctx.textBaseline = "middle"
    ctx.direction = "rtl"
    ctx.fillText(text, canvas.width - 4 * dpr, canvas.height / 2)

    const widthMm = Math.min(maxWidthMm, (canvas.width / (96 * dpr)) * 25.4)
    const heightMm = (canvas.height / (96 * dpr)) * 25.4
    return {
      dataUrl: canvas.toDataURL("image/png"),
      widthMm,
      heightMm,
    }
  } catch {
    return null
  }
}

function splitTextSafely(text: string, maxCharsPerLine: number = 30): string[] {
  if (!text) return []
  const words = text.trim().split(/\s+/)
  const lines: string[] = []
  let cur = ""
  for (const w of words) {
    if (!cur) cur = w
    else if ((cur + " " + w).length <= maxCharsPerLine) cur += " " + w
    else {
      lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 4)
}

function drawInfoBox(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  minHeight = 16,
): number {
  const hasRtl = isPashtoOrArabic(value || "")
  const fontStatus = hasRegisteredPDFFonts(pdf)

  const lines = hasRtl
    ? splitTextSafely(value || "", Math.max(14, Math.floor((width - 6) / 2.2)))
    : valueLines(pdf, value || "", width - 6).slice(0, 4)

  const height = Math.max(minHeight, 8 + Math.max(1, lines.length) * 3.8)

  pdf.setFillColor(...BG_LIGHT)
  pdf.setDrawColor(...BORDER_COLOR)
  pdf.setLineWidth(0.3)
  pdf.roundedRect(x, y, width, height, 1.2, 1.2, "FD")

  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setTextColor(...BRAND_PURPLE)
  pdf.setFontSize(6.5)
  pdf.text(label.toUpperCase(), x + 3, y + 4.5)

  if (lines.length > 0) {
    pdf.setTextColor(...TEXT_BLACK)
    pdf.setFontSize(7.5)
    lines.forEach((line, lineIdx) => {
      const lineY = y + 9 + lineIdx * 3.8
      const isLineRtl = isPashtoOrArabic(line)

      if (isLineRtl && fontStatus.hasArabic) {
        // High-precision TrueType vector text
        pdf.setFont("NotoNaskhArabic", "normal")
        const prepared = prepareBidiPdfText(line)
        pdf.text(prepared, x + 3, lineY)
      } else if (isLineRtl) {
        // High-DPI canvas fallback if TrueType not registered yet
        const rendered = renderUnicodeTextToCanvas(line, 7.5, false, TEXT_BLACK, width - 6)
        if (rendered) {
          pdf.addImage(rendered.dataUrl, "PNG", x + 3, lineY - rendered.heightMm * 0.7, rendered.widthMm, rendered.heightMm, undefined, "FAST")
          return
        }
        pdf.setFont("helvetica", "normal")
        pdf.text(line, x + 3, lineY)
      } else {
        pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
        pdf.text(line, x + 3, lineY)
      }
    })
  }

  return height
}

export function drawPackingList(
  pdf: jsPDF,
  data: ShippingDocumentData,
  logoDataUrl: string | null,
  companyName: string,
  companySubtitle: string,
): void {
  let y = drawDocumentHeader(pdf, "PACKING LIST", data, logoDataUrl, companyName, companySubtitle)
  const gap = 3
  const colW = 91

  // 1. Shipper & Consignee Boxes
  const shipperDetails = [
    data.shipper,
    data.shipperAddress,
    data.shipperPhone ? `Phone: ${data.shipperPhone}` : "",
    data.shipperLicence ? `Licence No: ${data.shipperLicence}` : "",
  ].filter(Boolean).join("\n")

  const consigneeDetails = [
    data.consignee,
    data.consigneeAddress,
    data.consigneePhone ? `Cell: ${data.consigneePhone}` : "",
    data.consigneeFssai ? `FSSAI No: ${data.consigneeFssai}` : "",
    data.consigneeEmail ? `Email: ${data.consigneeEmail}` : "",
  ].filter(Boolean).join("\n")

  const leftH = drawInfoBox(pdf, 12, y, colW, "Exporter / Shipper", shipperDetails, 22)
  const rightH = drawInfoBox(pdf, 107, y, colW, "Importer / Consignee", consigneeDetails, 22)
  y += Math.max(leftH, rightH) + gap

  // 2. Notify Party Box
  const notifyDetails = [
    data.notifyParty,
    data.notifyPartyAddress,
  ].filter(Boolean).join("\n")
  const notifyH = drawInfoBox(pdf, 12, y, 186, "Notify Party", notifyDetails, 14)
  y += notifyH + gap

  // 3. Document Details Grid (3 columns x 4 rows)
  const details: Array<[string, string | undefined]> = [
    ["B/L Number", data.bolNumber],
    ["Invoice Number", data.invoiceNumber],
    ["Truck Number", data.truckNumber],
    ["Driver Name", [data.driverName, data.driverFatherName ? `s/o ${data.driverFatherName}` : ""].filter(Boolean).join(" ")],
    ["Driver Contact", data.driverContact],
    ["Driver Rent", [data.driverRent, data.driverRentCurrency].filter(Boolean).join(" ")],
    ["Container Number", data.containerNumber],
    ["Seal Number", data.sealNumber],
    ["Port of Loading", data.portOfLoading],
    ["Port of Discharge", data.portOfDischarge],
    ["Final Destination", data.finalDestination],
    ["Packing Date", data.packingDateMonthYear || data.date],
  ]

  const gridCols = 3
  const boxW = 59.5
  const boxH = 12.5
  details.forEach(([label, value], idx) => {
    const col = idx % gridCols
    const row = Math.floor(idx / gridCols)
    drawInfoBox(pdf, 12 + col * (boxW + 3.8), y + row * (boxH + 2), boxW, label, value || "", boxH)
  })
  y += Math.ceil(details.length / gridCols) * (boxH + 2) + 2

  // 4. Cargo / Packages Table (Supports Multi-Commodity Rows!)
  const fontStatus = hasRegisteredPDFFonts(pdf)
  const tableTop = y
  const columns = [12, 48, 74, 112, 154, 176, 198]
  pdf.setFillColor(...BRAND_PURPLE)
  pdf.rect(12, tableTop, 186, 7.5, "F")
  pdf.setTextColor(255, 255, 255)
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(6.5)

  const headings = [
    "CONTAINER / SEAL",
    "MARKS & NUMBERS",
    "PACKAGES & KIND",
    "COMMODITY / HS CODE",
    "GROSS WT.",
    "NET WT.",
  ]
  headings.forEach((heading, idx) => {
    pdf.text(heading, columns[idx] + 2, tableTop + 5)
  })
  y += 7.5

  const items = data.commodities && data.commodities.length > 0
    ? data.commodities
    : [
        {
          itemNo: 1,
          commodity: data.commodity,
          packageCount: data.packageCount,
          packageCountText: data.packageCountText,
          packageType: data.packageType,
          netWeight: data.netWeight,
          grossWeight: data.grossWeight,
          hsCode: data.hsCode,
        },
      ]

  const cntrSealLines = data.containers
    .map((c) => `${c.containerNumber}${c.sealNumber ? ` / ${c.sealNumber}` : ""}`)
    .filter(Boolean)
    .join("\n") || data.containerNumber

  const totalTableHeight = 44
  const rowHeight = Math.max(11, totalTableHeight / Math.max(1, items.length))

  pdf.setDrawColor(...BORDER_COLOR)
  pdf.setLineWidth(0.3)

  items.forEach((item, idx) => {
    const rowY = y + idx * rowHeight
    pdf.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252)
    pdf.rect(12, rowY, 186, rowHeight, "FD")
    columns.slice(1, -1).forEach((x) => pdf.line(x, rowY, x, rowY + rowHeight))

    pdf.setTextColor(...TEXT_BLACK)
    pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
    pdf.setFontSize(7)

    // First row shows container/seal & marks
    if (idx === 0) {
      pdf.text(valueLines(pdf, cntrSealLines, 34).slice(0, 3), 14, rowY + 4.5)
      const markLines = isPashtoOrArabic(data.marksAndNumbers)
        ? splitTextSafely(data.marksAndNumbers, 20).slice(0, 3)
        : valueLines(pdf, data.marksAndNumbers, 24).slice(0, 3)
      markLines.forEach((mLine, mIdx) => {
        const mLineY = rowY + 4.5 + mIdx * 3.5
        if (isPashtoOrArabic(mLine) && fontStatus.hasArabic) {
          pdf.setFont("NotoNaskhArabic", "normal")
          pdf.text(prepareBidiPdfText(mLine), 50, mLineY)
        } else {
          pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
          pdf.text(mLine, 50, mLineY)
        }
      })
    }

    // Packages & Kind
    pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
    const packText = [item.packageCountText, item.packageType].filter(Boolean).join(" ")
    pdf.text(valueLines(pdf, packText, 36).slice(0, 2), 76, rowY + 4.5)

    // Commodity & HS Code
    const descText = [
      item.commodity,
      item.hsCode ? `HS: ${item.hsCode}` : "",
    ].filter(Boolean).join(" • ")

    if (isPashtoOrArabic(descText)) {
      const commLines = splitTextSafely(descText, 24).slice(0, 2)
      commLines.forEach((cLine, cIdx) => {
        const cLineY = rowY + 4.5 + cIdx * 3.6
        if (fontStatus.hasArabic) {
          pdf.setFont("NotoNaskhArabic", "normal")
          pdf.setFontSize(7)
          pdf.text(prepareBidiPdfText(cLine), 114, cLineY)
        } else {
          const rendered = renderUnicodeTextToCanvas(cLine, 7, false, TEXT_BLACK, 38)
          if (rendered) {
            pdf.addImage(rendered.dataUrl, "PNG", 114, cLineY - rendered.heightMm * 0.7, rendered.widthMm, rendered.heightMm, undefined, "FAST")
          }
        }
      })
    } else {
      pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
      pdf.setTextColor(...TEXT_BLACK)
      pdf.setFontSize(7)
      pdf.text(valueLines(pdf, descText, 38).slice(0, 2), 114, rowY + 4.5, { maxWidth: 38 })
    }

    // Weights - strictly constrained to 19mm max width so columns never overlap
    pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
    pdf.setTextColor(...TEXT_BLACK)
    pdf.setFontSize(7)

    let grossDisplay = clean(item.grossWeight)
    if (grossDisplay.includes(" - ")) {
      const parts = grossDisplay.split(" - ")
      grossDisplay = clean(parts[0])
    }
    const grossLines = valueLines(pdf, grossDisplay, 19).slice(0, 2)
    pdf.text(grossLines, 156, rowY + 4.5, { maxWidth: 19 })

    const netLines = valueLines(pdf, clean(item.netWeight), 19).slice(0, 2)
    pdf.text(netLines, 178, rowY + 4.5, { maxWidth: 19 })
  })

  y += Math.max(totalTableHeight, items.length * rowHeight) + 3

  // 5. Totals & Measurement Summary
  const summaryBoxes = [
    ["TOTAL PACKAGES", [data.packageCountText, data.packageType].filter(Boolean).join(" ")],
    ["TOTAL GROSS WEIGHT", data.grossWeight],
    ["TOTAL NET WEIGHT", data.netWeight],
    ["MEASUREMENT / CBM", data.measurement],
  ]
  const sumW = 44
  summaryBoxes.forEach(([lbl, val], idx) => {
    drawInfoBox(pdf, 12 + idx * (sumW + 3.3), y, sumW, lbl, val || "", 13)
  })
  y += 18

  // 6. Sign-off & Certification Footer
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "italic")
  pdf.setFontSize(7)
  pdf.setTextColor(...TEXT_MUTED)
  pdf.text("We certify that this packing list is true and correct and covers the full consignment detailed above.", 12, y + 6)

  pdf.setDrawColor(...TEXT_BLACK)
  pdf.setLineWidth(0.4)
  pdf.line(138, y + 5, 198, y + 5)
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(7)
  pdf.setTextColor(...TEXT_BLACK)
  pdf.text("AUTHORIZED SIGNATURE / STAMP", 168, y + 10, { align: "center" })

  // Bottom rule
  pdf.setDrawColor(...BRAND_PURPLE)
  pdf.setLineWidth(0.8)
  pdf.line(12, 285, 198, 285)

  pdf.setTextColor(...TEXT_MUTED)
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
  pdf.setFontSize(7.5)
  pdf.text(`${companyName || "SKY ARIANA LTD"} • International Transportation • Transit • Forwarding`, 105, 290, { align: "center" })
}

export function drawStickerPage(
  pdf: jsPDF,
  data: ShippingDocumentData,
  logoDataUrl: string | null,
  companyName: string,
  commodityItem?: CommodityItem,
  itemIndex?: number,
  totalItems?: number,
  cartonNumber?: number,
  totalCartons?: number,
): void {
  const fontStatus = hasRegisteredPDFFonts(pdf)
  // Centered A4 single card: 136mm x 126mm with ample print margins
  const cardW = 136
  const cardH = 126
  const cardX = (PAGE_WIDTH - cardW) / 2 // Centered at 37 mm
  const cardY = 28 // 28 mm from top

  const activeCommodity = commodityItem?.commodity || data.commodity || "BLACK RAISINS"
  const activeNetWeight = commodityItem?.netWeight || data.netWeight || "10 Kg"
  const activePackingDate = commodityItem?.packingDateMonthYear || data.packingDateMonthYear || "JUL / 2026"
  const activeExpiryDate = commodityItem?.expiryDateMonthYear || data.expiryDateMonthYear || "JUL / 2028"
  const lotNo = data.lotNo?.trim() || ""
  const displayTotalCartons = totalCartons || data.packageCount || 1
  const displayCartonNum = cartonNumber || 1

  // 1. Precision Corner Crop Marks for Warehouse Cutting
  const cropLen = 5
  const cropOff = 2.5
  pdf.setDrawColor(148, 163, 184)
  pdf.setLineWidth(0.3)
  // Top-left
  pdf.line(cardX - cropOff - cropLen, cardY, cardX - cropOff, cardY)
  pdf.line(cardX, cardY - cropOff - cropLen, cardX, cardY - cropOff)
  // Top-right
  pdf.line(cardX + cardW + cropOff, cardY, cardX + cardW + cropOff + cropLen, cardY)
  pdf.line(cardX + cardW, cardY - cropOff - cropLen, cardX + cardW, cardY - cropOff)
  // Bottom-left
  pdf.line(cardX - cropOff - cropLen, cardY + cardH, cardX - cropOff, cardY + cardH)
  pdf.line(cardX, cardY + cardH + cropOff, cardX, cardY + cardH + cropOff + cropLen)
  // Bottom-right
  pdf.line(cardX + cardW + cropOff, cardY + cardH, cardX + cardW + cropOff + cropLen, cardY + cardH)
  pdf.line(cardX + cardW, cardY + cardH + cropOff, cardX + cardW, cardY + cardH + cropOff + cropLen)

  // 2. Solid black card border & pure white background
  pdf.setFillColor(255, 255, 255)
  pdf.setDrawColor(15, 23, 42)
  pdf.setLineWidth(0.4)
  pdf.rect(cardX, cardY, cardW, cardH, "FD")

  // 3. Top Header Bar: PRODUCE OF AFGHANISTAN + Pashto Title + Carton Badge
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(10.5)
  pdf.setTextColor(15, 23, 42)
  pdf.text("PRODUCE OF AFGHANISTAN", cardX + 4.5, cardY + 5.5)

  if (fontStatus.hasArabic) {
    pdf.setFont("NotoNaskhArabic", "bold")
    pdf.setFontSize(8.5)
    pdf.setTextColor(71, 85, 105)
    pdf.text(prepareBidiPdfText("د افغانستان صادراتي محصولات"), cardX + 68, cardY + 5.5)
  }

  // Carton No Badge (top right inside card)
  pdf.setFillColor(241, 245, 249)
  pdf.setDrawColor(15, 23, 42)
  pdf.setLineWidth(0.25)
  pdf.roundedRect(cardX + cardW - 32, cardY + 2, 28, 8, 1, 1, "FD")
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(5.2)
  pdf.setTextColor(100, 116, 139)
  pdf.text("CARTON NO", cardX + cardW - 18, cardY + 4.8, { align: "center" })
  pdf.setFontSize(7.5)
  pdf.setTextColor(15, 23, 42)
  pdf.text(`${displayCartonNum} OF ${displayTotalCartons}`, cardX + cardW - 18, cardY + 8.5, { align: "center" })

  // Subtitle
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(5.2)
  pdf.setTextColor(88, 49, 132) // Brand purple
  pdf.text("OFFICIAL EXPORT CARGO IDENTIFICATION STICKER", cardX + 4.5, cardY + 9.5)

  // Divider line under header
  pdf.setDrawColor(15, 23, 42)
  pdf.setLineWidth(0.35)
  pdf.line(cardX, cardY + 11.5, cardX + cardW, cardY + 11.5)

  const textX = cardX + 4.5
  const contentWidth = cardW - 32 // Leave space for right badges
  let cursorY = cardY + 15.5

  // 4. Tracking Reference Line
  const refParts = [
    data.bolNumber ? `B/L: ${data.bolNumber}` : "",
    data.invoiceNumber ? `INV: ${data.invoiceNumber}` : "",
    data.containerNumber ? `CNTR: ${data.containerNumber}` : "",
    data.finalDestination ? `DEST: ${data.finalDestination}` : "",
  ].filter(Boolean).join("   •   ")
  if (refParts) {
    pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
    pdf.setFontSize(6.2)
    pdf.setTextColor(71, 85, 105)
    pdf.text(refParts, textX, cursorY)
    cursorY += 4
  }

  // 5. EXPORTER SECTION
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(8)
  pdf.setTextColor(0, 0, 0)
  pdf.text("Name and Complete Address of Exporter", textX, cursorY)
  cursorY += 4

  // Exporter Company Name in Bold Navy Blue (#1e40af)
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(11)
  pdf.setTextColor(30, 64, 175)
  const displayShipper = data.shipper || companyName || data.companyName || "NASIB OBID AKBARI LTD"
  pdf.text(displayShipper, textX, cursorY)
  cursorY += 4

  // Exporter Address
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
  pdf.setFontSize(7.5)
  pdf.setTextColor(0, 0, 0)
  const expAddr = data.shipperAddress || ""
  const expLines = valueLines(pdf, expAddr, contentWidth)
  if (expLines.length > 0) {
    pdf.text(expLines, textX, cursorY)
    cursorY += expLines.length * 3.2
  }

  // Licence No
  if (data.shipperLicence) {
    pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
    pdf.text("Licence No: ", textX, cursorY)
    pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
    pdf.text(data.shipperLicence, textX + 16, cursorY)
    cursorY += 3.6
  }

  cursorY += 1.5

  // 6. IMPORTER SECTION
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(8)
  pdf.setTextColor(0, 0, 0)
  pdf.text("Name and Complete Address of Importer", textX, cursorY)
  cursorY += 4

  // Importer Company Name in Bold Navy Blue (#1e40af)
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(10.5)
  pdf.setTextColor(30, 64, 175)
  pdf.text(data.consignee || "JDM ENTERPRISES", textX, cursorY)
  cursorY += 4

  // Importer Address
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
  pdf.setFontSize(7.5)
  pdf.setTextColor(0, 0, 0)
  const impAddr = data.consigneeAddress || ""
  const impLines = valueLines(pdf, impAddr, contentWidth)
  if (impLines.length > 0) {
    pdf.text(impLines, textX, cursorY)
    cursorY += impLines.length * 3.2
  }

  // Identifiers: GST, FSSAI, Phone, Email, PAN
  const idRows: Array<[string, string | undefined]> = [
    ["GST", data.consigneeGst],
    ["Fssai No", data.consigneeFssai],
    ["Phone No", data.consigneePhone],
    ["Email id", data.consigneeEmail],
    ["Pan No", data.consigneePan],
  ]

  for (const [label, val] of idRows) {
    if (val) {
      pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
      pdf.text(`${label}: `, textX, cursorY)
      const labelW = pdf.getTextWidth(`${label}: `)
      pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
      pdf.text(val, textX + labelW, cursorY)
      cursorY += 3.4
    }
  }

  cursorY += 1.5

  // 7. COMMODITY & EXPORT SPECIFICATIONS
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
  pdf.setFontSize(7.5)
  pdf.setTextColor(0, 0, 0)

  // Name of Commodity
  pdf.text("Name of Commodity: ", textX, cursorY)
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.text(activeCommodity ? activeCommodity.toUpperCase() : "BLACK RAISINS", textX + 29, cursorY)
  cursorY += 3.6

  // Net Wt & Gross Wt
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
  pdf.text("Net Wt: ", textX, cursorY)
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.text(activeNetWeight || "10 Kg", textX + 11, cursorY)

  const activeGrossWeight = commodityItem?.grossWeight || data.grossWeight
  if (activeGrossWeight) {
    pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
    pdf.text("Gross Wt: ", textX + 48, cursorY)
    pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
    pdf.text(activeGrossWeight, textX + 63, cursorY)
  }
  cursorY += 3.6

  // Date of Packing & Expiry
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
  pdf.text("Date of Packing: ", textX, cursorY)
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.text(activePackingDate || "JUL / 2026", textX + 22, cursorY)
  cursorY += 3.6

  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
  pdf.text("Date of Expiry: ", textX, cursorY)
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.text(activeExpiryDate || "JUL / 2028", textX + 21, cursorY)
  cursorY += 3.6

  // Lot No in Bold Deep Green (#007a3d)
  if (lotNo) {
    pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
    pdf.setFontSize(10.5)
    pdf.setTextColor(0, 122, 61)
    pdf.text("Lot No: ", textX, cursorY)
    pdf.text(lotNo, textX + 14, cursorY)
  }

  // 8. BOTTOM-RIGHT AUTHENTIC BADGES (Veg+FSSAI combo & Afghanistan Logo)
  const badgeX = cardX + cardW - 25
  const badgeY1 = cardY + cardH - 33
  try {
    pdf.addImage(STICKER_FSSAI_VEG_DATA_URL, "PNG", badgeX, badgeY1, 20, 16, undefined, "FAST")
  } catch {
    // Fallback if badge fails
  }

  const badgeY2 = badgeY1 + 17
  try {
    pdf.addImage(STICKER_AFGHANISTAN_LOGO_DATA_URL, "PNG", badgeX + 1.5, badgeY2, 17, 15, undefined, "FAST")
  } catch {
    // Fallback if badge fails
  }
}

function commodityForCarton(data: ShippingDocumentData, cartonIndex: number): CommodityItem | undefined {
  const items = data.commodities || []
  if (items.length === 0) return undefined

  let remaining = cartonIndex
  for (const item of items) {
    const itemQuantity = Math.max(1, item.packageCount || positiveInteger(item.packageCountText))
    if (remaining < itemQuantity) return item
    remaining -= itemQuantity
  }
  return items[cartonIndex % items.length]
}

function drawCompactSticker(
  pdf: jsPDF,
  data: ShippingDocumentData,
  logoDataUrl: string | null,
  companyName: string,
  x: number,
  y: number,
  width: number,
  height: number,
  cartonNumber: number,
  totalCartons: number,
  item?: CommodityItem,
): void {
  const padding = 4
  const valueX = x + 28
  const footerHeight = 10
  const commodity = item?.commodity || data.commodity
  const netWeight = item?.netWeight || data.netWeight
  const packingDate = item?.packingDateMonthYear || data.packingDateMonthYear
  const expiryDate = item?.expiryDateMonthYear || data.expiryDateMonthYear

  pdf.setFillColor(255, 255, 255)
  pdf.setDrawColor(...BRAND_PURPLE)
  pdf.setLineWidth(0.55)
  pdf.roundedRect(x, y, width, height, 1.5, 1.5, "FD")
  pdf.setFillColor(...BRAND_PURPLE)
  pdf.rect(x, y, width, 12, "F")

  if (logoDataUrl) {
    try {
      pdf.addImage(logoDataUrl, "PNG", x + 3, y + 1.5, 9, 9, undefined, "FAST")
    } catch {
      // The text header remains a complete fallback when a saved logo cannot be decoded.
    }
  }

  const fontStatus = hasRegisteredPDFFonts(pdf)
  pdf.setTextColor(255, 255, 255)
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(8.5)
  pdf.text(companyName || "SKY ARIANA LTD", x + (logoDataUrl ? 14 : padding), y + 5.3)
  pdf.setFontSize(5.2)
  pdf.text(`CARTON ${cartonNumber} OF ${totalCartons}`, x + width - padding, y + 5.3, { align: "right" })
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
  pdf.setFontSize(4.5)
  pdf.text("EXPORT CARTON STICKER • PRODUCE OF AFGHANISTAN", x + (logoDataUrl ? 14 : padding), y + 9)

  let cursorY = y + 17
  const rows: Array<[string, string]> = [
    ["EXPORTER", data.shipper],
    ["IMPORTER", data.consignee],
    ["COMMODITY", commodity],
    ["INVOICE", data.invoiceNumber],
    ["B/L NO.", data.bolNumber],
    ["NET WT.", netWeight],
    ["PACKED", packingDate],
    ["EXPIRY", expiryDate],
    ["DESTINATION", data.finalDestination],
    ["CONTAINER", data.containerNumber],
  ]

  for (const [label, rawValue] of rows) {
    const value = clean(rawValue) || "—"
    pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
    pdf.setFontSize(4.8)
    pdf.setTextColor(...TEXT_MUTED)
    pdf.text(`${label}:`, x + padding, cursorY)
    pdf.setFontSize(6.2)
    pdf.setTextColor(...TEXT_BLACK)
    const isValRtl = isPashtoOrArabic(value)
    if (isValRtl && fontStatus.hasArabic) {
      pdf.setFont("NotoNaskhArabic", "bold")
      pdf.text(prepareBidiPdfText(value), valueX, cursorY)
    } else {
      pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
      const clipped = valueLines(pdf, value, width - (valueX - x) - padding)[0] || "—"
      pdf.text(clipped, valueX, cursorY)
    }
    cursorY += 5.7
  }

  pdf.setFillColor(...BRAND_PURPLE)
  pdf.rect(x + 0.6, y + height - footerHeight, width - 1.2, footerHeight - 0.6, "F")
  pdf.setTextColor(255, 255, 255)
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(6.7)
  pdf.text("EXPORT STANDARD PACKAGING", x + width / 2, y + height - 4.2, { align: "center" })
}

function drawStickerSheetPage(
  pdf: jsPDF,
  data: ShippingDocumentData,
  logoDataUrl: string | null,
  companyName: string,
  firstCartonIndex: number,
  totalCartons: number,
): void {
  for (let slot = 0; slot < 6; slot += 1) {
    const cartonIndex = firstCartonIndex + slot
    if (cartonIndex >= totalCartons) break
    const column = slot % 2
    const row = Math.floor(slot / 2)
    drawCompactSticker(
      pdf,
      data,
      logoDataUrl,
      companyName,
      10 + column * 99,
      10 + row * 94,
      92,
      87,
      cartonIndex + 1,
      totalCartons,
      commodityForCarton(data, cartonIndex),
    )
  }
}

async function imageUrlToDataUrl(url?: string): Promise<string | null> {
  if (!url) return null
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function drawBolPage(pdf: jsPDF, element: HTMLElement): Promise<void> {
  if (typeof document !== "undefined" && document.fonts) {
    await document.fonts.ready
  }
  const { toCanvas } = await import("html-to-image")
  const canvas = await toCanvas(element, {
    pixelRatio: 3,
    quality: 1.0,
    cacheBust: false,
    backgroundColor: "#ffffff",
    style: { transform: "none", margin: "0", boxShadow: "none", opacity: "1", visibility: "visible" },
    filter: (node: HTMLElement) => {
      if (node.getAttribute?.("data-print-ignore") === "true") return false
      return true
    },
  })

  const imageData = canvas.toDataURL("image/png", 1.0)
  pdf.addImage(imageData, "PNG", 0, 0, PAGE_WIDTH, PAGE_HEIGHT, undefined, "SLOW")
}

export async function generateShippingDocumentsPDF(options: GenerateShippingDocumentsOptions): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
    precision: 16,
  })

  await registerPDFFonts(pdf)

  const companyName = clean(options.companyName || options.data.companyName) || "SKY ARIANA LTD"
  const companySubtitle = clean(options.companySubtitle || options.data.companySubtitle) || "International Transportation • Transit • Forwarding"
  const logoDataUrl = await imageUrlToDataUrl(options.logoUrl)

  const isComplete = options.kind === "all"
  const includesBol = options.kind === "bol" || options.kind === "bol-packing" || isComplete
  const includesPacking = options.kind === "packing-list" || options.kind === "bol-packing" || isComplete
  const includesStickers = options.kind === "stickers" || isComplete

  let pageHasContent = false

  const docTitle = buildShippingDocumentFileName(options.kind, options.data).replace(/\.pdf$/i, "")
  pdf.setProperties({
    title: docTitle,
    subject: `Official Shipping Documents - ${options.data.bolNumber || options.data.invoiceNumber || "Consignment"}`,
    author: companyName,
    creator: "Sky Ariana BOL Management System",
  })

  // ----------------------------------------------------
  // PAGE 1: BILL OF LADING
  // ----------------------------------------------------
  if (includesBol) {
    const bolElement =
      options.bolElement ||
      (typeof document !== "undefined"
        ? (document.querySelector('[data-bol-a4="true"]') as HTMLElement | null) ||
          (document.querySelector('[data-pdf-export="true"]') as HTMLElement | null)
        : null)

    if (!bolElement) {
      throw new Error("The Bill of Lading preview is not ready. Please wait for the preview to finish loading and try again.")
    }

    await drawBolPage(pdf, bolElement)
    pageHasContent = true
  }

  // ----------------------------------------------------
  // PAGE 2: PACKING LIST (Includes all cargo rows)
  // ----------------------------------------------------
  if (includesPacking) {
    pageHasContent = addPageIfNeeded(pdf, pageHasContent)
    const packingElement =
      typeof document !== "undefined"
        ? (document.querySelector('[data-shipping-preview="packing-list"]') as HTMLElement | null) ||
          (document.querySelector('[data-shipping-preview-export="packing-list"] [data-shipping-preview="packing-list"]') as HTMLElement | null) ||
          (document.querySelector('[data-shipping-preview-export="packing-list"]') as HTMLElement | null)
        : null

    if (packingElement) {
      await drawBolPage(pdf, packingElement)
    } else {
      drawPackingList(pdf, options.data, logoDataUrl, companyName, companySubtitle)
    }
  }

  // ----------------------------------------------------
  // CARGO STICKERS: preserve the master preview for one label, and paginate batches.
  // ----------------------------------------------------
  if (includesStickers) {
    const quantity = options.stickerQuantity ?? 1
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      throw new Error("Sticker quantity must be a positive whole number.")
    }
    const layout = options.stickerLayout ?? "single"
    const perPage = layout === "sheet" ? 6 : 1
    const stickerElement =
      quantity === 1 && layout === "single" && typeof document !== "undefined"
        ? (document.querySelector('[data-shipping-preview="stickers"]') as HTMLElement | null) ||
          (document.querySelector('[data-shipping-preview-export="stickers"] [data-shipping-preview="stickers"]') as HTMLElement | null) ||
          (document.querySelector('[data-shipping-preview-export="stickers"]') as HTMLElement | null)
        : null

    for (let firstCarton = 0; firstCarton < quantity; firstCarton += perPage) {
      pageHasContent = addPageIfNeeded(pdf, pageHasContent)
      if (stickerElement) {
        await drawBolPage(pdf, stickerElement)
      } else if (layout === "sheet") {
        drawStickerSheetPage(pdf, options.data, logoDataUrl, companyName, firstCarton, quantity)
      } else {
        drawStickerPage(
          pdf,
          options.data,
          logoDataUrl,
          companyName,
          quantity > 1 ? commodityForCarton(options.data, firstCarton) : undefined,
          undefined,
          undefined,
          firstCarton + 1,
          quantity,
        )
      }
    }
  }

  const blob = pdf.output("blob") as Blob
  const header = await blob.slice(0, 5).text()
  if (header !== "%PDF-") throw new Error("Generated shipping document is not a valid PDF.")
  return blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" })
}
