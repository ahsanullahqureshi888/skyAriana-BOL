import type {
  NormalizedWhatsAppShipment,
  WhatsAppDateFormat,
  WhatsAppLanguage,
  WhatsAppMessageType,
  WhatsAppSettings,
} from "./message-types"
import { LABELS, getStatusNarrative, ltrIsolate } from "./translations"
import { sanitizeShipmentForCustomer } from "./message-safety"

export interface MessageBuilderOptions {
  messageType?: WhatsAppMessageType
  language?: WhatsAppLanguage
  isCustomerSafe?: boolean
  customTemplateText?: string
  settings?: Partial<WhatsAppSettings>
}

export function formatDate(dateString: string | undefined | null, format: WhatsAppDateFormat = "20 Sep 2026"): string {
  if (!dateString) return ""
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    // If it's already a formatted string like "20/09/2026" or "20 Sep 2026"
    return String(dateString).trim()
  }

  const day = String(date.getDate()).padStart(2, "0")
  const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const monthNamesLong = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  const monthNum = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()

  switch (format) {
    case "20/09/2026":
      return `${day}/${monthNum}/${year}`
    case "September 20, 2026":
      return `${monthNamesLong[date.getMonth()]} ${date.getDate()}, ${year}`
    case "20 Sep 2026":
    default:
      return `${date.getDate()} ${monthNamesShort[date.getMonth()]} ${year}`
  }
}

/**
 * Builds an ultra-short single/two line update suitable for WhatsApp operations groups
 * Example: BOL-NSA583 | MSCU1234567 | Jebel Ali → Nhava Sheva | Vessel departed | ETA 20/09/2026
 */
function buildOperationsShort(shipment: NormalizedWhatsAppShipment, dateFormat: WhatsAppDateFormat): string {
  const parts: string[] = []
  if (shipment.bolNumber && shipment.bolNumber !== "N/A") parts.push(shipment.bolNumber)
  if (shipment.containerNumber) parts.push(shipment.containerNumber)
  else if (shipment.truckNumber) parts.push(`Truck ${shipment.truckNumber}`)

  const loc = shipment.currentLocation || shipment.origin
  const dest = shipment.destination
  if (loc && dest) parts.push(`${loc} → ${dest}`)
  else if (loc) parts.push(loc)

  parts.push(shipment.statusDisplay || "In Transit")

  if (shipment.eta) {
    parts.push(`ETA ${formatDate(shipment.eta, dateFormat)}`)
  }

  return parts.join(" | ")
}

/**
 * Builds short 3-4 line mode (Requirement 9)
 */
function buildShortUpdate(
  shipment: NormalizedWhatsAppShipment,
  lang: "en" | "fa" | "ps" | "ur" | "hi",
  dateFormat: WhatsAppDateFormat
): string {
  const lbl = LABELS[lang]
  const lines: string[] = []

  lines.push(`*${lbl.bol}:* ${ltrIsolate(shipment.bolNumber)}`)
  if (shipment.containerNumber) {
    lines.push(`*${lbl.container}:* ${ltrIsolate(shipment.containerNumber)}`)
  } else if (shipment.truckNumber) {
    lines.push(`*${lbl.truck}:* ${ltrIsolate(shipment.truckNumber)}`)
  }

  const narrative = getStatusNarrative(
    shipment.statusCode,
    lang,
    shipment.currentLocation,
    shipment.destination,
    shipment.nextLocation,
    shipment.vesselName
  )
  lines.push(`\n${narrative}`)

  lines.push(`*${lbl.destination}:* ${lang === "en" ? shipment.destination : ltrIsolate(shipment.destination)}`)

  if (shipment.eta) {
    lines.push(`*${lbl.eta}:* ${ltrIsolate(formatDate(shipment.eta, dateFormat))}`)
  }

  return lines.join("\n")
}

/**
 * Builds multi-leg shipment update (Requirement 44)
 */
function buildMultiLegUpdate(
  shipment: NormalizedWhatsAppShipment,
  lang: "en" | "fa" | "ps" | "ur" | "hi",
  dateFormat: WhatsAppDateFormat
): string {
  const lbl = LABELS[lang]
  const lines: string[] = []

  lines.push(`*${lbl.companyName}*`)
  lines.push(`*${lbl.title} — ${ltrIsolate(shipment.bolNumber)}*\n`)

  if (shipment.legs && shipment.legs.length >= 2) {
    const leg1 = shipment.legs[0]
    lines.push(`*${lbl.firstLeg}*`)
    lines.push(`${leg1.from} ➔ ${leg1.to}`)
    if (leg1.vesselOrCarrier) lines.push(`Carrier: ${leg1.vesselOrCarrier}`)
    lines.push(`Status: ${leg1.status}\n`)

    const leg2 = shipment.legs[1]
    lines.push(`*${lbl.secondLeg}*`)
    lines.push(`${leg2.from} ➔ ${leg2.to}`)
    if (leg2.vesselOrCarrier) lines.push(`Carrier: ${leg2.vesselOrCarrier}`)
    lines.push(`Status: ${leg2.status}`)
    if (leg2.eta) lines.push(`*${lbl.eta}:* ${ltrIsolate(formatDate(leg2.eta, dateFormat))}\n`)
  } else {
    // Construct default two-leg overview
    lines.push(`*${lbl.firstLeg} (Road / Port Corridor)*`)
    lines.push(`${shipment.origin} ➔ ${shipment.currentLocation}`)
    if (shipment.truckNumber) lines.push(`Truck: ${ltrIsolate(shipment.truckNumber)}`)
    lines.push(`Status: Completed / In Hand\n`)

    lines.push(`*${lbl.secondLeg} (Sea Transit)*`)
    lines.push(`${shipment.currentLocation} ➔ ${shipment.destination}`)
    if (shipment.vesselName) lines.push(`Vessel: ${shipment.vesselName}`)
    lines.push(`Status: ${shipment.statusDisplay}`)
    if (shipment.eta) lines.push(`*${lbl.eta}:* ${ltrIsolate(formatDate(shipment.eta, dateFormat))}\n`)
  }

  lines.push(lbl.thankYou)
  return lines.join("\n")
}

/**
 * Builds Document Update (Requirement 42)
 */
function buildDocumentUpdate(shipment: NormalizedWhatsAppShipment): string {
  const lines: string[] = []
  lines.push(`*SKY ARIANA LIMITED*`)
  lines.push(`*SHIPPING DOCUMENTATION STATUS*\n`)
  lines.push(`BOL: *${shipment.bolNumber}*`)
  if (shipment.invoiceNumber) lines.push(`Invoice: *${shipment.invoiceNumber}*`)
  lines.push(`Shipper: ${shipment.shipper.name}`)
  lines.push(`Consignee: ${shipment.consignee.name}\n`)

  lines.push(`*Documents:*`)
  const docs = shipment.documents || []
  if (docs.length > 0) {
    for (const d of docs) {
      if (d.present) {
        lines.push(`✓ ${d.name}`)
      } else {
        lines.push(`⚠ ${d.name} Pending`)
      }
    }
  } else {
    lines.push(`✓ Commercial Invoice`)
    lines.push(`✓ Packing List`)
    lines.push(`✓ Bill of Lading`)
    lines.push(`✓ Phytosanitary Certificate`)
    lines.push(`✓ Afghan Transit Paper`)
  }

  lines.push(`\nLast Updated: ${formatDate(shipment.lastUpdated)}`)
  lines.push(`Thank you,\nSKY ARIANA LIMITED`)
  return lines.join("\n")
}

/**
 * Builds Single Language Message
 */
function buildSingleLanguageMessage(
  shipment: NormalizedWhatsAppShipment,
  lang: "en" | "fa" | "ps" | "ur" | "hi",
  type: WhatsAppMessageType,
  dateFormat: WhatsAppDateFormat,
  settings: Partial<WhatsAppSettings> = {}
): string {
  const lbl = LABELS[lang]

  if (type === "ops_short") {
    return buildOperationsShort(shipment, dateFormat)
  }

  if (type === "short_update") {
    return buildShortUpdate(shipment, lang, dateFormat)
  }

  if (type === "document_update") {
    return buildDocumentUpdate(shipment)
  }

  if (type === "departure_update" || type === "arrival_update" || type === "vessel_update") {
    return buildMultiLegUpdate(shipment, lang, dateFormat)
  }

  const lines: string[] = []

  // Header & Title
  if (settings.includeCompanyName !== false) {
    lines.push(`*${lbl.companyName}*\n`)
  }

  lines.push(`*${lbl.title}*\n`)

  // Identifier block
  if (settings.includeBol !== false && shipment.bolNumber && shipment.bolNumber !== "N/A") {
    lines.push(`*${lbl.bol}:* ${ltrIsolate(shipment.bolNumber)}`)
  }
  if (settings.includeShipper !== false && shipment.shipper?.name) {
    lines.push(`*${lbl.shipper}:* ${shipment.shipper.name}`)
  }
  if (settings.includeContainer !== false && shipment.containerNumber) {
    const cType = shipment.containerType ? ` (${shipment.containerType})` : ""
    lines.push(`*${lbl.container}:* ${ltrIsolate(shipment.containerNumber)}${cType}`)
  } else if (shipment.truckNumber) {
    lines.push(`*${lbl.truck}:* ${ltrIsolate(shipment.truckNumber)}`)
  }
  if (shipment.commodity) {
    const pkg = shipment.packagesFormatted ? `${shipment.packagesFormatted} / ` : ""
    lines.push(`*${lbl.cargo}:* ${pkg}${shipment.commodity}`)
  } else if (shipment.packagesFormatted) {
    lines.push(`*${lbl.packages}:* ${shipment.packagesFormatted}`)
  }

  // Current Status Narrative
  const narrative = getStatusNarrative(
    shipment.statusCode,
    lang,
    shipment.currentLocation,
    shipment.destination,
    shipment.nextLocation,
    shipment.vesselName
  )
  lines.push(`\n*${lbl.currentStatus}:*\n${narrative}\n`)

  // Destination & ETAs
  if (settings.includeDestination !== false && shipment.destination) {
    lines.push(`*${lbl.destination}:*\n${lang === "en" ? shipment.destination : ltrIsolate(shipment.destination)}\n`)
  }

  if (shipment.eta) {
    lines.push(`*${lbl.eta}:*\n${ltrIsolate(formatDate(shipment.eta, dateFormat))}\n`)
  } else if (settings.includeEta) {
    lines.push(`*${lbl.eta}:*\n${lbl.na}\n`)
  }

  if (settings.includeLastUpdated !== false && shipment.lastUpdated) {
    lines.push(`*${lbl.lastUpdated}:*\n${ltrIsolate(formatDate(shipment.lastUpdated, dateFormat))}\n`)
  }

  // Signature
  if (settings.includeSignature !== false) {
    lines.push(lbl.thankYou)
  }

  return lines.join("\n").trim()
}

/**
 * Builds Bilingual Message (Requirement 14)
 */
function buildBilingualMessage(
  shipment: NormalizedWhatsAppShipment,
  langA: "en" | "fa" | "ps" | "ur" | "hi",
  langB: "en" | "fa" | "ps" | "ur" | "hi",
  type: WhatsAppMessageType,
  dateFormat: WhatsAppDateFormat,
  settings: Partial<WhatsAppSettings>
): string {
  const headingA = langA === "en" ? "ENGLISH" : langA === "fa" ? "فارسی / دری" : "پښتو"
  const headingB = langB === "fa" ? "فارسی / دری" : langB === "ps" ? "پښتو" : langB === "hi" ? "हिन्दी" : "ENGLISH"

  const textA = buildSingleLanguageMessage(shipment, langA, type, dateFormat, settings)
  const textB = buildSingleLanguageMessage(shipment, langB, type, dateFormat, settings)

  return `*${headingA}*\n----------------------------------------\n${textA}\n\n\n*${headingB}*\n----------------------------------------\n${textB}`
}

/**
 * Main WhatsApp message generator
 */
export function buildWhatsAppMessage(
  rawShipment: NormalizedWhatsAppShipment,
  options: MessageBuilderOptions = {}
): string {
  const isCustomerSafe = options.isCustomerSafe !== false
  const shipment = isCustomerSafe ? sanitizeShipmentForCustomer(rawShipment) : rawShipment

  const messageType = options.messageType || "customer_update"
  const language = options.language || "en"
  const dateFormat = (options.settings?.defaultDateFormat as WhatsAppDateFormat) || "20 Sep 2026"
  const settings = options.settings || {}

  let message = ""

  switch (language) {
    case "en_fa":
      message = buildBilingualMessage(shipment, "en", "fa", messageType, dateFormat, settings)
      break
    case "en_ps":
      message = buildBilingualMessage(shipment, "en", "ps", messageType, dateFormat, settings)
      break
    case "en_hi":
      message = buildBilingualMessage(shipment, "en", "hi", messageType, dateFormat, settings)
      break
    case "fa_ps":
      message = buildBilingualMessage(shipment, "fa", "ps", messageType, dateFormat, settings)
      break
    case "fa":
    case "ps":
    case "ur":
    case "hi":
    case "en":
    default:
      message = buildSingleLanguageMessage(shipment, language as any, messageType, dateFormat, settings)
      break
  }

  // Prepend internal operations badge if internal mode
  if (!isCustomerSafe) {
    message = `🔒 [INTERNAL OPERATIONS - SKY ARIANA]\n\n${message}`
    if (shipment.internalNotes) {
      message += `\n\n*Operational Note:* ${shipment.internalNotes}`
    }
    if (shipment.driverRent) {
      message += `\n*Driver Rent:* ${shipment.driverRent.toLocaleString()} ${shipment.driverRentCurrency || "USD"}`
    }
  }

  return message
}
