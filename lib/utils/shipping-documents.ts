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
  registerPDFFontsSync,
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

/**
 * Detects decorative section headers or pure metadata labels that must never be treated as commodities.
 */
export function isBannerOrMetadataLine(line?: string | null): boolean {
  if (!line) return true
  const stripped = line.replace(/\p{Extended_Pictographic}/gu, "").trim()
  if (!stripped) return true

  // Decorative section header banners
  if (/^(?:CONTAINER\s*&\s*CARGO|DOCUMENT\s*&\s*SHIPPING|SHIPPING\s*&\s*TRANSPORT|BILL\s*OF\s*LADING|CARGO\s*DETAILS|SHIPPING\s*DETAILS)/i.test(stripped)) {
    return true
  }

  // Pure metadata tags without cargo description
  if (/^(?:Transit\s*Date|Invoice\s*NO|Invoice\s*Number|Inv\s*No|Afghan\s*TC\s*No|HS\s*CODE|Lot\s*No|Batch\s*No|Container\s*No|Seal\s*No|Storage\s*Temp|Customs\s*Seal|Invoice\s*&\s*Packing|Freight\s*Payable|Booking\s*No|Booking\s*Number)\s*[:#-]?\s*$/i.test(stripped)) {
    return true
  }

  // Pure metadata line where every part is a metadata tag (e.g. "📅 Transit Date: 2026-08-23 | 📄 Afghan TC No: 1234")
  const parts = stripped.split(/[|│]+/).map((p) => p.trim()).filter(Boolean)
  if (parts.length > 0 && parts.every((p) => /^(?:Transit\s*Date|Invoice\s*NO|Invoice\s*Number|Inv\s*No|Afghan\s*TC\s*No|HS\s*CODE|Lot\s*No|Batch\s*No|Container\s*No|Seal\s*No|Storage\s*Temp|Customs\s*Seal|Freight|Booking)/i.test(p))) {
    return true
  }

  return false
}

/**
 * Checks if a string is solely a weight, rate, or price annotation rather than an actual commodity name.
 */
export function isRateOrWeightOnly(str?: string | null): boolean {
  if (!str) return true
  const s = str.trim()
  if (/^(?:@|rate|price)\s*[:#-]?\s*[\d,.]+/i.test(s)) return true
  if (/^[@$€£\d.,\s-]+$/.test(s)) return true
  if (/^\d+[\d,.\s-]*(?:kgs?|kg|kilo|lbs?|mt|tons?)\s*(?:-?\s*@\s*[\d,.]+\s*[$€£]?)?$/i.test(s)) return true
  if (/^[@$€£\s]*\d+[\d,.\s]*[$€£\s]*$/i.test(s)) return true
  return false
}

export function cleanCommodity(value: string): string {
  if (!value) return ""
  let text = clean(value)
  if (isBannerOrMetadataLine(text) || isRateOrWeightOnly(text)) return ""

  // Strip emojis, leading bullets, decorative dashes
  text = text.replace(/^[\p{Extended_Pictographic}\s•*>-]+/gu, "").trim()

  // Strip leading "Cargo:", "Commodity:", "Description of Goods:", "Goods:"
  text = text.replace(/^(?:cargo|commodity|description\s+of\s+goods|goods)\s*[:#-]?\s*/i, "").trim()

  // If text contains pipe-separated segments, filter out metadata parts (like invoice no, transit date)
  if (text.includes("|") || text.includes("│")) {
    const parts = text.split(/[|│]+/).map((p) => p.trim()).filter(Boolean)
    const validParts = parts.filter((p) => {
      const strippedP = p.replace(/\p{Extended_Pictographic}/gu, "").trim()
      if (isBannerOrMetadataLine(strippedP) || isRateOrWeightOnly(strippedP)) return false
      if (/^(?:invoice|inv|transit|hs\s*code|afghan\s*tc|container|seal|lot|batch|booking|date)\b/i.test(strippedP)) return false
      return true
    })
    text = validParts.join(" - ")
  }

  // Strip leading package numbers like "330 - BAGS - " or "630 CTNS - " or "514- 49.5-KGS "
  text = text.replace(/^\d[\d,.\s-]*(?:ctns?|cartons?|bags?|packages?|pkgs?|units?|boxes?)\s*[-:]?\s*/i, "")

  // Strip trailing rate / price annotations like "@ 4.45 $", "RATE 1.35 $", "@ 4.45", "RATE: 4.45"
  text = text.replace(/\s*[-–—|/@]\s*(?:@|rate|price)?\s*[\d,.]+\s*(?:\$|usd|afn)?\s*$/i, "")
  text = text.replace(/\s*@\s*[\d,.]+\s*(?:\$|usd|afn)?/i, "")

  // Strip trailing carton weight annotations like "- 16KGS" or "- 16 - KG"
  text = text.replace(/\s*[-–—|/]\s*\d+[\d,.\s-]*(?:kgs?|kg|kilo|lbs?|mt|tons?)\s*$/i, "")

  // Deduplicate repeated identical phrases like "BLACK-RAISNIS - BLACK-RAISNIS"
  const segments = text.split(/\s*[-–—/|,]\s*/).map((s) => s.trim()).filter(Boolean)
  if (segments.length > 1 && new Set(segments.map((s) => s.toLowerCase())).size === 1) {
    text = segments[0]
  }

  text = text.replace(/^[\s:|-]+|[\s:|-]+$/g, "").trim()
  return isBannerOrMetadataLine(text) || isRateOrWeightOnly(text) ? "" : text
}

export function parseListSegments(str: string): string[] {
  if (!str) return []
  const cleaned = str.trim()
  if (cleaned.includes("\n")) {
    return cleaned.split(/\r?\n/).map((s) => clean(s)).filter(Boolean)
  }
  if (cleaned.includes("|")) {
    return cleaned.split(/[|│]+/).map((s) => clean(s)).filter(Boolean)
  }
  if (/\s+[-–—]\s+/.test(cleaned)) {
    return cleaned.split(/\s+[-–—]\s+/).map((s) => clean(s)).filter(Boolean)
  }
  if (/\s*[/;+]\s*/.test(cleaned) && !/^\d{4}\/\d{2}/.test(cleaned)) {
    return cleaned.split(/\s*[/;+]\s*/).map((s) => clean(s)).filter(Boolean)
  }
  return [cleaned]
}

export function parsePackagesNumbers(str: string): number[] {
  if (!str) return []
  const cleaned = str.replace(/(\d),(\d)/g, "$1$2")
  const segments = cleaned.split(/\s*[\+;/]\s*|\s+[-–—]\s+|\s*,\s*|\r?\n/)
  const numbers: number[] = []
  for (const seg of segments) {
    const nonKgMatches = seg.match(/\b(\d+(?:\.\d+)?)\s*(?!kg|kgs|kilo|ton|cbm)\b/gi)
    if (nonKgMatches && nonKgMatches.length > 0) {
      for (const m of nonKgMatches) {
        const num = parseFloat(m.replace(/[^\d.]/g, ""))
        if (!isNaN(num) && num > 0) numbers.push(Math.round(num))
      }
    } else {
      const match = seg.match(/\b\d+\b/)
      if (match) {
        const num = parseInt(match[0], 10)
        if (!isNaN(num) && num > 0) numbers.push(num)
      }
    }
  }
  return numbers
}

function positiveInteger(value: string): number {
  if (!value) return 1
  const numbers = parsePackagesNumbers(String(value))
  if (numbers.length > 1) {
    return numbers.reduce((sum, n) => sum + n, 0)
  }
  if (numbers.length === 1 && numbers[0] > 0) {
    return numbers[0]
  }
  const parsed = Number.parseInt(String(value).replace(/[^0-9]/g, ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export function sumWeightStrings(weightStr?: string, fallbackUnit = "KG"): string {
  if (!weightStr) return ""
  const segments = parseListSegments(weightStr)
  if (segments.length <= 1) {
    return clean(weightStr)
  }
  let total = 0
  let unit = fallbackUnit
  for (const seg of segments) {
    const cleanedSeg = seg.replace(/,/g, "")
    const numMatch = cleanedSeg.match(/\b\d+(?:\.\d+)?\b/)
    const num = numMatch ? parseFloat(numMatch[0]) : 0
    if (!isNaN(num) && num > 0) {
      total += num
    }
    const unitMatch = seg.match(/\b(KG|KGS|MT|TONS?|LBS?)\b/i)
    if (unitMatch) {
      unit = unitMatch[1].toUpperCase()
    }
  }
  return total > 0 ? `${total.toLocaleString("en-US")} ${unit}` : clean(weightStr)
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
  const rawLines = (cargoText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !isBannerOrMetadataLine(l))

  // 1. Structured lines parser (e.g. "BLACK RAISINS | 630 CTNS | 16 KG" or "1. BLACK RAISINS | 630 CTNS")
  const detectedItems: CommodityItem[] = []

  for (const line of rawLines) {
    const cleanedLine = line
      .replace(/^[0-9]+[.)]\s*/, "")
      .replace(/^[\p{Extended_Pictographic}\s•*>-]*(?:cargo|commodity)?\s*[:#-]?\s*/iu, "")
      .trim()
    if (!cleanedLine || isBannerOrMetadataLine(cleanedLine)) continue

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

        const netMatch = part.match(/(?:NET(?:\s*WT)?:?\s*)?(\d[\d,\s.]*\s*(?:KG|KGS|MT|TONS?|LBS?))/i)
        const grossMatch = part.match(/(?:GROSS(?:\s*WT)?:?\s*)(\d[\d,\s.]*\s*(?:KG|KGS|MT|TONS?|LBS?))/i)

        if (grossMatch) {
          gross = grossMatch[1].trim()
          continue
        } else if (netMatch && /\b(?:KG|KGS|MT|TONS?)\b/i.test(part)) {
          net = netMatch[1].trim()
          continue
        }

        const hsMatch = part.match(/HS\s*(?:CODE)?:?\s*([0-9.]+)/i)
        if (hsMatch) {
          hs = hsMatch[1].trim()
          continue
        }

        if (!commodity && part.length > 1 && !/^(?:NET|GROSS|TOTAL|CONTAINER|INVOICE|DATE|TRANSIT|AFGHAN)/i.test(part)) {
          const c = cleanCommodity(part)
          if (c) commodity = c
        }
      }

      if (commodity && !isRateOrWeightOnly(commodity) && (countNum > 0 || net || gross)) {
        if (countNum > 0 && net && !gross) {
          const numWeight = parseFloat(net.replace(/[^0-9.]/g, ""))
          if (numWeight > 0 && numWeight <= 100) {
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
          netWeight: net,
          grossWeight: gross,
          measurement: measurementStr,
          hsCode: hs,
          packingDateMonthYear: packingDateMY,
          expiryDateMonthYear: expiryDateMY,
        })
      }
    }
  }

  if (detectedItems.length > 1) {
    return detectedItems
  }

  // 2. Discrete multi-item fallback: Physical quantity counts strictly define multi-item count!
  const pkgNumbers = parsePackagesNumbers(totalPackagesStr)
  const netSegments = parseListSegments(netWeightStr)
  const grossSegments = parseListSegments(grossWeightStr)
  const hsSegments = parseListSegments(hsCodeStr)
  const netPerCtSegments = parseListSegments(kgsPerCartonStr)
  const grossPerCtSegments = parseListSegments(grossPerCartonStr)

  // Extract valid commodities from non-banner lines, ignoring pure rate/weight annotations
  const cargoCommodities: string[] = []
  for (const line of rawLines) {
    const cleaned = cleanCommodity(line)
    if (cleaned && !isRateOrWeightOnly(cleaned)) {
      const subSegments = parseListSegments(cleaned)
      if (subSegments.length > 1) {
        for (const sub of subSegments) {
          const c = cleanCommodity(sub)
          if (c && !isRateOrWeightOnly(c)) cargoCommodities.push(c)
        }
      } else {
        cargoCommodities.push(cleaned)
      }
    }
  }

  // Multi-item count determination:
  // Discrete numbers in packages or weights define the true item count of the shipment.
  // CRITICAL: If the user only entered 1 package count and 1 weight, the shipment is strictly ONE SINGLE ITEM.
  // We NEVER duplicate a single physical package count across text lines!
  const physicalCounts = [
    pkgNumbers.length,
    netSegments.length,
    grossSegments.length,
    netPerCtSegments.length > 1 ? netPerCtSegments.length : 0,
    grossPerCtSegments.length > 1 ? grossPerCtSegments.length : 0,
  ].filter((c) => c > 1)

  let multiCount = 0
  if (physicalCounts.length > 0) {
    multiCount = Math.max(...physicalCounts)
  }

  const basePkgType = clean(packageTypeStr) || (/bags?/i.test(totalPackagesStr) ? "Bags" : "Cartons")
  const masterCommodity = cargoCommodities[0] || cleanCommodity(cargoText) || "CONSOLIDATED CARGO"

  if (multiCount > 1) {
    const multiItems: CommodityItem[] = []
    for (let i = 0; i < multiCount; i++) {
      const countNum = pkgNumbers[i] !== undefined ? pkgNumbers[i] : (pkgNumbers[0] || 0)
      const countText = countNum > 0 ? String(countNum) : ""

      let netVal = netSegments[i] || ""
      if (!netVal && countNum > 0 && netPerCtSegments[i]) {
        const perCt = parseFloat(netPerCtSegments[i].replace(/[^\d.]/g, ""))
        if (!isNaN(perCt) && perCt > 0) {
          netVal = `${Math.round(countNum * perCt).toLocaleString("en-US")} KG`
        }
      }
      if (netVal && !/\b(?:KG|KGS|MT|TONS?|LBS?)\b/i.test(netVal) && /^\d[\d,\s.]*$/.test(netVal)) {
        netVal = `${netVal.trim()} KG`
      }

      let grossVal = grossSegments[i] || ""
      if (!grossVal && countNum > 0 && grossPerCtSegments[i]) {
        const perCt = parseFloat(grossPerCtSegments[i].replace(/[^\d.]/g, ""))
        if (!isNaN(perCt) && perCt > 0) {
          grossVal = `${Math.round(countNum * perCt).toLocaleString("en-US")} KG`
        }
      }
      if (grossVal && !/\b(?:KG|KGS|MT|TONS?|LBS?)\b/i.test(grossVal) && /^\d[\d,\s.]*$/.test(grossVal)) {
        grossVal = `${grossVal.trim()} KG`
      }

      const itemCommodity = cargoCommodities[i] || cargoCommodities[0] || masterCommodity
      const itemHs = hsSegments[i] || hsSegments[0] || clean(hsCodeStr) || ""

      multiItems.push({
        itemNo: i + 1,
        commodity: cleanCommodity(itemCommodity) || masterCommodity,
        packageCount: countNum || 1,
        packageCountText: countText || (countNum ? String(countNum) : "1"),
        packageType: basePkgType,
        netWeight: netVal || (netSegments.length === 1 ? netSegments[0] : "—"),
        grossWeight: grossVal || (grossSegments.length === 1 ? grossSegments[0] : "—"),
        measurement: measurementStr,
        hsCode: itemHs,
        packingDateMonthYear: packingDateMY,
        expiryDateMonthYear: expiryDateMY,
      })
    }

    return multiItems
  }

  // 3. Default single master commodity item
  const masterCount = positiveInteger(totalPackagesStr)
  return [
    {
      itemNo: 1,
      commodity: cleanCommodity(taggedValue(cargoText, ["Commodity", "Cargo", "Description of Goods"])) || masterCommodity,
      packageCount: masterCount,
      packageCountText: clean(totalPackagesStr) ? String(masterCount) : "",
      packageType: basePkgType,
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
    ? Array.from(new Set(commodities.map((c) => c.commodity))).join(" & ")
    : (commodities[0]?.commodity || cleanCommodity(taggedValue(cargo, ["Commodity", "Cargo", "Description of Goods"])) || cleanCommodity(packages) || clean(cargo))

  const totalPkgCount = commodities.length > 1
    ? commodities.reduce((sum, it) => sum + (it.packageCount || 0), 0)
    : positiveInteger(packages)

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
    packageCount: totalPkgCount,
    packageCountText: packages ? String(totalPkgCount) : "",
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
  registerPDFFontsSync(pdf)
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

      if (isLineRtl) {
        // High-precision TrueType vector text for all Arabic and Pashto text
        pdf.setFont("NotoNaskhArabic", "normal")
        const prepared = prepareBidiPdfText(line)
        pdf.text(prepared, x + 3, lineY)
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
  registerPDFFontsSync(pdf)
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
  pdf.setFontSize(7.5)

  const headings = [
    "CONTAINER / SEAL",
    "MARKS & NUMBERS",
    "PACKAGES & KIND",
    "COMMODITY / HS CODE",
    "GROSS WT.",
    "NET WT.",
  ]
  headings.forEach((heading, idx) => {
    pdf.text(heading, columns[idx] + 2, tableTop + 5.2)
  })
  y += 7.5

  const items = data.commodities && data.commodities.length > 1
    ? data.commodities
    : (() => {
        const parsed = parseCommodityItems(
          data.commodity,
          data.packageCountText || (data.packageCount ? String(data.packageCount) : ""),
          data.netWeight,
          data.grossWeight,
          "",
          "",
          data.packageType,
          data.hsCode,
          data.measurement,
          data.packingDateMonthYear,
          data.expiryDateMonthYear,
        )
        if (parsed.length > 1) return parsed
        return data.commodities && data.commodities.length > 0
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
      })()

  const cntrSealLines =
    data.containers
      .map((c) => `${c.containerNumber}${c.sealNumber ? ` / ${c.sealNumber}` : ""}`)
      .filter(Boolean)
      .join("\n") ||
    data.containerNumber ||
    (data.truckNumber ? `TRUCK: ${data.truckNumber}` : "") ||
    "—"

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
    pdf.setFontSize(8)

    // First row shows container/seal & marks
    if (idx === 0) {
      pdf.text(valueLines(pdf, cntrSealLines, 34).slice(0, 3), 14, rowY + 5)
      const markLines = isPashtoOrArabic(data.marksAndNumbers)
        ? splitTextSafely(data.marksAndNumbers, 20).slice(0, 3)
        : valueLines(pdf, data.marksAndNumbers, 24).slice(0, 3)
      markLines.forEach((mLine, mIdx) => {
        const mLineY = rowY + 5 + mIdx * 3.8
        if (isPashtoOrArabic(mLine)) {
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
    const packText = [
      item.packageCountText || (item.packageCount ? String(item.packageCount) : ""),
      item.packageType,
    ].filter(Boolean).join(" ") || data.packageCountText || item.packageType || "—"
    pdf.text(valueLines(pdf, packText, 36).slice(0, 2), 76, rowY + 5)

    // Commodity & HS Code
    const descText = [
      item.commodity,
      item.hsCode ? `HS: ${item.hsCode}` : "",
    ].filter(Boolean).join(" • ")

    if (isPashtoOrArabic(descText)) {
      const commLines = splitTextSafely(descText, 24).slice(0, 2)
      commLines.forEach((cLine, cIdx) => {
        const cLineY = rowY + 5 + cIdx * 3.8
        pdf.setFont("NotoNaskhArabic", "normal")
        pdf.setFontSize(8)
        pdf.text(prepareBidiPdfText(cLine), 114, cLineY)
      })
    } else {
      pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
      pdf.setTextColor(...TEXT_BLACK)
      pdf.setFontSize(8)
      pdf.text(valueLines(pdf, descText, 38).slice(0, 2), 114, rowY + 5, { maxWidth: 38 })
    }

    // Weights - strictly constrained to 19mm max width so columns never overlap
    pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
    pdf.setTextColor(...TEXT_BLACK)
    pdf.setFontSize(8)

    let grossDisplay = clean(item.grossWeight)
    if (grossDisplay.includes(" - ")) {
      const parts = grossDisplay.split(" - ")
      grossDisplay = clean(parts[0])
    }
    const grossLines = valueLines(pdf, grossDisplay, 19).slice(0, 2)
    pdf.text(grossLines, 156, rowY + 5, { maxWidth: 19 })

    const netLines = valueLines(pdf, clean(item.netWeight), 19).slice(0, 2)
    pdf.text(netLines, 178, rowY + 5, { maxWidth: 19 })
  })

  y += Math.max(totalTableHeight, items.length * rowHeight) + 3

  // 5. Totals & Measurement Summary
  const grandGross = sumWeightStrings(data.grossWeight)
  const grandNet = sumWeightStrings(data.netWeight)
  const grandPkg = items.length > 1
    ? `${items.reduce((sum, it) => sum + (it.packageCount || 0), 0)} ${items[0]?.packageType || data.packageType || "Bags"}`
    : [data.packageCountText || (data.packageCount ? String(data.packageCount) : ""), data.packageType].filter(Boolean).join(" ")
  const summaryBoxes = [
    ["TOTAL PACKAGES", grandPkg || "—"],
    ["TOTAL GROSS WEIGHT", grandGross || data.grossWeight || "—"],
    ["TOTAL NET WEIGHT", grandNet || data.netWeight || "—"],
    ["MEASUREMENT / CBM", data.measurement || "—"],
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
  registerPDFFontsSync(pdf)
  const fontStatus = hasRegisteredPDFFonts(pdf)
  // Centered A4 single card: 142mm x 142mm with ample print margins
  const cardW = 142
  const cardH = 142
  const cardX = (PAGE_WIDTH - cardW) / 2 // Centered at 34 mm
  const cardY = 26 // 26 mm from top

  const activeCommodity = commodityItem?.commodity || data.commodity || "BLACK RAISINS"
  const activeNetWeight = commodityItem?.netWeight || data.netWeight || "10 Kg"
  const activeGrossWeight = commodityItem?.grossWeight || data.grossWeight || ""
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

  // 3. Top Header Bar: Company Logo + PRODUCE OF AFGHANISTAN + Pashto Title + Subtitle + Carton Badge
  let headerTextX = cardX + 4
  if (logoDataUrl) {
    try {
      pdf.addImage(logoDataUrl, "PNG", cardX + 3.5, cardY + 2.5, 9.5, 9.5, undefined, "FAST")
      headerTextX = cardX + 15
    } catch {
      // The text header remains an authentic fallback when a saved logo cannot be decoded.
    }
  }

  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(11)
  pdf.setTextColor(15, 23, 42)
  pdf.text("PRODUCE OF AFGHANISTAN", headerTextX, cardY + 5.5)

  if (fontStatus.hasArabic) {
    pdf.setFont("NotoNaskhArabic", "bold")
    pdf.setFontSize(9)
    pdf.setTextColor(71, 85, 105)
    pdf.text(prepareBidiPdfText("د افغانستان صادراتي محصولات"), headerTextX + 60, cardY + 5.5)
  }

  // Carrier / Company Info
  const displayComp = (companyName || data.companyName || "SKY ARIANA LIMITED").toUpperCase()
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(6.2)
  pdf.setTextColor(100, 116, 139)
  pdf.text(`${displayComp} • INTERNATIONAL TRANSPORTATION`, headerTextX, cardY + 8.5)

  // Subtitle
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(5.8)
  pdf.setTextColor(...BRAND_PURPLE)
  pdf.text("OFFICIAL EXPORT CARGO IDENTIFICATION STICKER", headerTextX, cardY + 11.2)

  // Divider line under header
  pdf.setDrawColor(15, 23, 42)
  pdf.setLineWidth(0.35)
  pdf.line(cardX, cardY + 13.5, cardX + cardW, cardY + 13.5)

  // 4. Logistics Cross-Reference Bar (4 Structured Cells with dividers)
  const logY = cardY + 15
  const logH = 7.8
  const logW = cardW - 7
  const colW = logW / 4

  pdf.setFillColor(248, 250, 252)
  pdf.setDrawColor(203, 213, 225)
  pdf.setLineWidth(0.25)
  pdf.roundedRect(cardX + 3.5, logY, logW, logH, 0.8, 0.8, "FD")

  // Dividing lines
  pdf.line(cardX + 3.5 + colW, logY, cardX + 3.5 + colW, logY + logH)
  pdf.line(cardX + 3.5 + colW * 2, logY, cardX + 3.5 + colW * 2, logY + logH)
  pdf.line(cardX + 3.5 + colW * 3, logY, cardX + 3.5 + colW * 3, logY + logH)

  // Cell 1: B/L Number
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(5.2)
  pdf.setTextColor(100, 116, 139)
  pdf.text("B/L NUMBER", cardX + 5, logY + 2.8)
  pdf.setFontSize(7.2)
  pdf.setTextColor(15, 23, 42)
  pdf.text(valueLines(pdf, data.bolNumber || "—", colW - 3)[0] || "—", cardX + 5, logY + 6.2)

  // Cell 2: Invoice No
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(5.2)
  pdf.setTextColor(100, 116, 139)
  pdf.text("INVOICE NO", cardX + 5 + colW, logY + 2.8)
  pdf.setFontSize(7.2)
  pdf.setTextColor(15, 23, 42)
  pdf.text(valueLines(pdf, data.invoiceNumber || "—", colW - 3)[0] || "—", cardX + 5 + colW, logY + 6.2)

  // Cell 3: Destination
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(5.2)
  pdf.setTextColor(100, 116, 139)
  pdf.text("DESTINATION", cardX + 5 + colW * 2, logY + 2.8)
  pdf.setFontSize(7.2)
  pdf.setTextColor(15, 23, 42)
  const destVal = data.finalDestination || data.portOfDischarge || "—"
  pdf.text(valueLines(pdf, destVal, colW - 3)[0] || "—", cardX + 5 + colW * 2, logY + 6.2)

  // Cell 4: Vehicle / Container (with intelligent truck fallback)
  const hasContainer = Boolean(data.containerNumber && data.containerNumber !== "—" && data.containerNumber !== "N/M")
  const vehicleLabel = hasContainer ? "CNTR / SEAL" : (data.truckNumber ? "TRUCK / VEHICLE" : "VEHICLE")
  const vehicleVal = hasContainer
    ? [data.containerNumber, data.sealNumber].filter(Boolean).join(" / ")
    : (data.truckNumber || "—")

  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(5.2)
  pdf.setTextColor(100, 116, 139)
  pdf.text(vehicleLabel, cardX + 5 + colW * 3, logY + 2.8)
  pdf.setFontSize(7.2)
  pdf.setTextColor(15, 23, 42)
  if (isPashtoOrArabic(vehicleVal) && fontStatus.hasArabic) {
    pdf.setFont("NotoNaskhArabic", "bold")
    pdf.text(prepareBidiPdfText(vehicleVal), cardX + 5 + colW * 3, logY + 6.2)
  } else {
    pdf.text(valueLines(pdf, vehicleVal, colW - 3)[0] || "—", cardX + 5 + colW * 3, logY + 6.2)
  }

  const textX = cardX + 3.5
  const contentWidth = cardW - 7
  let cursorY = cardY + 26

  // 5. EXPORTER SECTION
  // Exporter Badge
  pdf.setFillColor(238, 242, 255)
  pdf.setDrawColor(199, 210, 254)
  pdf.setLineWidth(0.2)
  pdf.roundedRect(textX, cursorY, 34, 4.2, 0.6, 0.6, "FD")
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(5.6)
  pdf.setTextColor(30, 64, 175)
  pdf.text("EXPORTER / صادرکننده", textX + 1.2, cursorY + 3)

  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
  pdf.setFontSize(5.2)
  pdf.setTextColor(100, 116, 139)
  pdf.text("Name & Complete Address", textX + 37, cursorY + 3)
  cursorY += 7.2

  // Exporter Company Name in Bold Navy Blue (#1e40af)
  const displayShipper = data.shipper || companyName || data.companyName || "NASIB OBID AKBARI LTD"
  if (isPashtoOrArabic(displayShipper) && fontStatus.hasArabic) {
    pdf.setFont("NotoNaskhArabic", "bold")
    pdf.setFontSize(10.5)
    pdf.setTextColor(30, 64, 175)
    pdf.text(prepareBidiPdfText(displayShipper), textX, cursorY)
  } else {
    pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
    pdf.setFontSize(11)
    pdf.setTextColor(30, 64, 175)
    pdf.text(displayShipper, textX, cursorY)
  }
  cursorY += 4

  // Exporter Address (max 2 lines)
  const expAddr = data.shipperAddress || ""
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
  pdf.setFontSize(7.4)
  pdf.setTextColor(51, 65, 85)
  if (isPashtoOrArabic(expAddr) && fontStatus.hasArabic) {
    const expLines = splitTextSafely(expAddr, 50).slice(0, 2)
    expLines.forEach((line) => {
      pdf.text(prepareBidiPdfText(line), textX, cursorY)
      cursorY += 3.2
    })
  } else {
    const expLines = valueLines(pdf, expAddr, contentWidth).slice(0, 2)
    if (expLines.length > 0) {
      pdf.text(expLines, textX, cursorY)
      cursorY += expLines.length * 3.2
    }
  }

  // Licence & Phone row
  const expMetaParts = [
    data.shipperLicence ? `Licence: ${data.shipperLicence}` : "",
    data.shipperPhone ? `Tel: ${data.shipperPhone}` : "",
  ].filter(Boolean).join("   •   ")
  if (expMetaParts) {
    pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
    pdf.setFontSize(6.5)
    pdf.setTextColor(71, 85, 105)
    pdf.text(expMetaParts, textX, cursorY)
    cursorY += 3.6
  }

  // Divider line under Exporter
  pdf.setDrawColor(226, 232, 240)
  pdf.setLineWidth(0.2)
  pdf.line(textX, cursorY, textX + contentWidth, cursorY)
  cursorY += 2

  // 6. IMPORTER SECTION
  // Importer Badge
  pdf.setFillColor(238, 242, 255)
  pdf.setDrawColor(199, 210, 254)
  pdf.setLineWidth(0.2)
  pdf.roundedRect(textX, cursorY, 34, 4.2, 0.6, 0.6, "FD")
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(5.6)
  pdf.setTextColor(30, 64, 175)
  pdf.text("IMPORTER / واردکننده", textX + 1.2, cursorY + 3)

  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
  pdf.setFontSize(5.2)
  pdf.setTextColor(100, 116, 139)
  pdf.text("Consignee Information", textX + 37, cursorY + 3)
  cursorY += 7.2

  // Importer Company Name in Bold Navy Blue (#1e40af)
  const displayConsignee = data.consignee || "JDM ENTERPRISES"
  if (isPashtoOrArabic(displayConsignee) && fontStatus.hasArabic) {
    pdf.setFont("NotoNaskhArabic", "bold")
    pdf.setFontSize(10.5)
    pdf.setTextColor(30, 64, 175)
    pdf.text(prepareBidiPdfText(displayConsignee), textX, cursorY)
  } else {
    pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
    pdf.setFontSize(11)
    pdf.setTextColor(30, 64, 175)
    pdf.text(displayConsignee, textX, cursorY)
  }
  cursorY += 4

  // Importer Address (max 2 lines)
  const impAddr = data.consigneeAddress || ""
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
  pdf.setFontSize(7.4)
  pdf.setTextColor(51, 65, 85)
  if (isPashtoOrArabic(impAddr) && fontStatus.hasArabic) {
    const impLines = splitTextSafely(impAddr, 50).slice(0, 2)
    impLines.forEach((line) => {
      pdf.text(prepareBidiPdfText(line), textX, cursorY)
      cursorY += 3.2
    })
  } else {
    const impLines = valueLines(pdf, impAddr, contentWidth).slice(0, 2)
    if (impLines.length > 0) {
      pdf.text(impLines, textX, cursorY)
      cursorY += impLines.length * 3.2
    }
  }

  // Identifiers: GST, FSSAI, Phone, Email, PAN
  const impIdParts1 = [
    data.consigneeGst ? `GST: ${data.consigneeGst}` : "",
    data.consigneeFssai ? `FSSAI: ${data.consigneeFssai}` : "",
    data.consigneePan ? `PAN: ${data.consigneePan}` : "",
  ].filter(Boolean).join("   •   ")
  if (impIdParts1) {
    pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
    pdf.setFontSize(6.2)
    pdf.setTextColor(71, 85, 105)
    pdf.text(impIdParts1, textX, cursorY)
    cursorY += 3.2
  }

  const impIdParts2 = [
    data.consigneePhone ? `Phone: ${data.consigneePhone}` : "",
    data.consigneeEmail ? `Email: ${data.consigneeEmail}` : "",
  ].filter(Boolean).join("   •   ")
  if (impIdParts2) {
    pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
    pdf.setFontSize(6.2)
    pdf.setTextColor(71, 85, 105)
    pdf.text(impIdParts2, textX, cursorY)
    cursorY += 3.2
  }

  // Divider line under Importer
  pdf.setDrawColor(226, 232, 240)
  pdf.setLineWidth(0.2)
  pdf.line(textX, cursorY, textX + contentWidth, cursorY)
  cursorY += 2

  // 7. COMMODITY & EXPORT SPECIFICATIONS
  // Commodity Bar
  pdf.setFillColor(248, 250, 252)
  pdf.setDrawColor(226, 232, 240)
  pdf.setLineWidth(0.2)
  pdf.roundedRect(textX, cursorY, contentWidth, 6, 0.6, 0.6, "FD")

  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(5.6)
  pdf.setTextColor(100, 116, 139)
  pdf.text("COMMODITY:", textX + 2, cursorY + 4.2)

  pdf.setFontSize(8.5)
  pdf.setTextColor(15, 23, 42)
  if (isPashtoOrArabic(activeCommodity) && fontStatus.hasArabic) {
    pdf.setFont("NotoNaskhArabic", "bold")
    pdf.text(prepareBidiPdfText(activeCommodity), textX + 20, cursorY + 4.2)
  } else {
    pdf.text((activeCommodity || "BLACK RAISINS").toUpperCase(), textX + 20, cursorY + 4.2)
  }

  // Lot No in Bold Deep Green (#007a3d) on right of commodity bar
  if (lotNo) {
    pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
    pdf.setFontSize(7.5)
    pdf.setTextColor(0, 122, 61)
    pdf.text(`LOT NO: ${lotNo}`, textX + contentWidth - 2, cursorY + 4.2, { align: "right" })
  }
  cursorY += 7.5

  // 4-Box Physical Specifications
  const specW = contentWidth / 4
  const specH = 7.2
  const specs = [
    { label: "NET WEIGHT", val: activeNetWeight || "—" },
    { label: "GROSS WEIGHT", val: activeGrossWeight || "—" },
    { label: "PACKED", val: activePackingDate || "—" },
    { label: "EXPIRY", val: activeExpiryDate || "—" },
  ]

  specs.forEach((item, idx) => {
    const boxX = textX + idx * specW
    pdf.setFillColor(248, 250, 252)
    pdf.setDrawColor(226, 232, 240)
    pdf.setLineWidth(0.2)
    pdf.roundedRect(boxX + 0.5, cursorY, specW - 1, specH, 0.6, 0.6, "FD")

    pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
    pdf.setFontSize(5)
    pdf.setTextColor(100, 116, 139)
    pdf.text(item.label, boxX + specW / 2, cursorY + 2.7, { align: "center" })

    pdf.setFontSize(7.5)
    pdf.setTextColor(15, 23, 42)
    pdf.text(item.val, boxX + specW / 2, cursorY + 5.8, { align: "center" })
  })
  cursorY += 9

  // 8. OFFICIAL CUSTOMS VERIFICATION & AUTHENTIC BADGES
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(5.8)
  pdf.setTextColor(71, 85, 105)
  pdf.text("CUSTOMS INSPECTED • ګمرکي تفتیش", textX, cursorY + 3)

  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "normal")
  pdf.setFontSize(5)
  pdf.setTextColor(100, 116, 139)
  pdf.text("AFGHANISTAN CHAMBER OF COMMERCE & INDUSTRY (ACCI)", textX, cursorY + 6.8)

  // Badges on bottom right
  const badgeY = cardY + cardH - 18
  try {
    pdf.addImage(STICKER_FSSAI_VEG_DATA_URL, "PNG", cardX + cardW - 30, badgeY, 15, 10.5, undefined, "FAST")
  } catch {
    // Fallback if badge fails
  }

  try {
    pdf.addImage(STICKER_AFGHANISTAN_LOGO_DATA_URL, "PNG", cardX + cardW - 13.5, badgeY + 0.5, 10, 9.5, undefined, "FAST")
  } catch {
    // Fallback if badge fails
  }

  // 9. SOLID BRAND PURPLE FOOTER STRIP
  const footH = 6.5
  pdf.setFillColor(...BRAND_PURPLE)
  pdf.rect(cardX, cardY + cardH - footH, cardW, footH, "F")
  pdf.setTextColor(255, 255, 255)
  pdf.setFont(fontStatus.hasSans ? "NotoSans" : "helvetica", "bold")
  pdf.setFontSize(5.8)
  pdf.text("EXPORT STANDARD PACKAGING • OFFICIAL CUSTOMS COMPLIANT", cardX + cardW / 2, cardY + cardH - 2.2, { align: "center" })
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
  const vehicle = data.containerNumber && data.containerNumber !== "—"
    ? data.containerNumber
    : (data.truckNumber || "—")

  const rows: Array<[string, string | undefined]> = [
    ["EXPORTER", data.shipper],
    ["IMPORTER", data.consignee],
    ["COMMODITY", commodity],
    ["INVOICE", data.invoiceNumber],
    ["B/L NO.", data.bolNumber],
    ["NET WT.", netWeight],
    ["PACKED", packingDate],
    ["EXPIRY", expiryDate],
    ["DESTINATION", data.finalDestination],
    ["VEHICLE", vehicle],
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
    const quantity = isComplete ? 1 : (options.stickerQuantity ?? 1)
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      throw new Error("Sticker quantity must be a positive whole number.")
    }
    const layout = isComplete ? "single" : (options.stickerLayout ?? "single")
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
