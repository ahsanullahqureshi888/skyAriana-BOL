import type {
  NormalizedWhatsAppShipment,
  WhatsAppDateFormat,
  WhatsAppLanguage,
} from "./message-types"
import { formatDate } from "./message-builder"
import { LABELS, ltrIsolate } from "./translations"

export type BulkGrouping = "none" | "location" | "status" | "customer"
export type BulkFormat = "compact" | "detailed"

export interface BulkStatusFilterOptions {
  status?: string
  shipper?: string
  consignee?: string
  destination?: string
  location?: string
  activeOnly?: boolean
  selectedIds?: string[]
}

export interface BulkGeneratorOptions {
  grouping?: BulkGrouping
  format?: BulkFormat
  language?: WhatsAppLanguage
  dateFormat?: WhatsAppDateFormat
  isInternal?: boolean
  maxCharsPerMessage?: number
}

export interface SplitMessageResult {
  fullMessage: string
  isSplitNeeded: boolean
  totalParts: number
  parts: {
    partNumber: number
    totalParts: number
    title: string
    text: string
    shipmentRange: string
  }[]
}

const DEFAULT_MAX_CHARS = 3500

/**
 * Filter shipment list according to user criteria
 */
export function filterShipmentsForBulk(
  shipments: NormalizedWhatsAppShipment[],
  filters: BulkStatusFilterOptions
): NormalizedWhatsAppShipment[] {
  return shipments.filter((s) => {
    if (filters.selectedIds && filters.selectedIds.length > 0) {
      if (!filters.selectedIds.includes(s.id) && !filters.selectedIds.includes(s.bolNumber)) {
        return false
      }
    }

    if (filters.activeOnly) {
      const st = s.statusCode.toLowerCase()
      if (st === "delivered" || st === "cancelled") return false
    }

    if (filters.status && filters.status !== "all") {
      if (s.statusCode.toLowerCase() !== filters.status.toLowerCase()) return false
    }

    if (filters.shipper && filters.shipper !== "all") {
      if (!s.shipper.name.toLowerCase().includes(filters.shipper.toLowerCase())) return false
    }

    if (filters.consignee && filters.consignee !== "all") {
      if (!s.consignee.name.toLowerCase().includes(filters.consignee.toLowerCase())) return false
    }

    if (filters.destination && filters.destination !== "all") {
      if (!s.destination.toLowerCase().includes(filters.destination.toLowerCase())) return false
    }

    if (filters.location && filters.location !== "all") {
      if (!s.currentLocation.toLowerCase().includes(filters.location.toLowerCase())) return false
    }

    return true
  })
}

/**
 * Format a single shipment item inside a bulk list
 */
function formatShipmentBulkItem(
  shipment: NormalizedWhatsAppShipment,
  index: number,
  format: BulkFormat,
  dateFormat: WhatsAppDateFormat
): string {
  const lines: string[] = []
  const num = `${index + 1}.`

  if (format === "compact") {
    lines.push(`${num} *${ltrIsolate(shipment.bolNumber)}*`)
    if (shipment.containerNumber) {
      lines.push(`Container: ${ltrIsolate(shipment.containerNumber)}`)
    } else if (shipment.truckNumber) {
      lines.push(`Truck: ${ltrIsolate(shipment.truckNumber)}`)
    }
    lines.push(`${shipment.currentLocation} ➔ ${shipment.statusDisplay}`)
    if (shipment.eta) {
      lines.push(`ETA: ${ltrIsolate(formatDate(shipment.eta, dateFormat))}`)
    }
  } else {
    // Detailed format
    lines.push(`${num} *${ltrIsolate(shipment.bolNumber)}*`)
    lines.push(`Shipper: ${shipment.shipper.name}`)
    lines.push(`Consignee: ${shipment.consignee.name}`)
    if (shipment.containerNumber) {
      lines.push(`Container: ${ltrIsolate(shipment.containerNumber)} (${shipment.containerType || "40HC"})`)
    } else if (shipment.truckNumber) {
      lines.push(`Truck: ${ltrIsolate(shipment.truckNumber)}`)
    }
    lines.push(`Location: ${shipment.currentLocation}`)
    lines.push(`Status: ${shipment.statusDisplay}`)
    lines.push(`Destination: ${shipment.destination}`)
    if (shipment.vesselName) lines.push(`Vessel: ${shipment.vesselName}`)
    if (shipment.eta) lines.push(`ETA: ${ltrIsolate(formatDate(shipment.eta, dateFormat))}`)
  }

  return lines.join("\n")
}

/**
 * Generates Daily Internal Operations Group format (Requirement 40)
 */
export function buildDailyInternalOperationsGroup(
  shipments: NormalizedWhatsAppShipment[],
  dateFormat: WhatsAppDateFormat = "20 Sep 2026"
): string {
  const total = shipments.length
  const atBorderShipments = shipments.filter((s) => s.statusCode.includes("border"))
  const inTransitShipments = shipments.filter((s) => s.statusCode.includes("transit"))
  const atPortShipments = shipments.filter((s) => s.statusCode.includes("port") || s.statusCode.includes("container"))
  const vesselShipments = shipments.filter((s) => s.statusCode.includes("vessel"))
  const otherShipments = shipments.filter(
    (s) =>
      !s.statusCode.includes("border") &&
      !s.statusCode.includes("transit") &&
      !s.statusCode.includes("port") &&
      !s.statusCode.includes("container") &&
      !s.statusCode.includes("vessel")
  )

  const lines: string[] = []
  lines.push(`*SKY ARIANA OPERATIONS*`)
  lines.push(`*${formatDate(new Date().toISOString(), dateFormat)}*\n`)

  lines.push(`Active Shipments: ${total}`)
  lines.push(`At Border: ${atBorderShipments.length}`)
  lines.push(`In Transit: ${inTransitShipments.length}`)
  lines.push(`At Port: ${atPortShipments.length}`)
  lines.push(`Vessel Departed: ${vesselShipments.length}`)

  let counter = 1
  if (atBorderShipments.length > 0) {
    lines.push(`\n*AT BORDER*`)
    atBorderShipments.forEach((s) => {
      const unit = s.containerNumber || (s.truckNumber ? `Truck ${s.truckNumber}` : "")
      const unitStr = unit ? ` | ${unit}` : ""
      lines.push(`${counter}. ${s.bolNumber}${unitStr} | ${s.currentLocation} | ${s.statusDisplay}`)
      counter++
    })
  }

  if (inTransitShipments.length > 0) {
    lines.push(`\n*IN TRANSIT*`)
    inTransitShipments.forEach((s) => {
      const unit = s.containerNumber || (s.truckNumber ? `Truck ${s.truckNumber}` : "")
      const unitStr = unit ? ` | ${unit}` : ""
      lines.push(`${counter}. ${s.bolNumber}${unitStr} | ${s.currentLocation} → ${s.destination} | ${s.statusDisplay}`)
      counter++
    })
  }

  if (atPortShipments.length > 0) {
    lines.push(`\n*AT PORT*`)
    atPortShipments.forEach((s) => {
      const unit = s.containerNumber || (s.truckNumber ? `Truck ${s.truckNumber}` : "")
      const unitStr = unit ? ` | ${unit}` : ""
      lines.push(`${counter}. ${s.bolNumber}${unitStr} | ${s.currentLocation} | ${s.statusDisplay}`)
      counter++
    })
  }

  if (vesselShipments.length > 0) {
    lines.push(`\n*VESSEL DEPARTED*`)
    vesselShipments.forEach((s) => {
      const unit = s.containerNumber ? ` | ${s.containerNumber}` : ""
      const v = s.vesselName ? ` | Vessel: ${s.vesselName}` : ""
      lines.push(`${counter}. ${s.bolNumber}${unit}${v} | ${s.statusDisplay}`)
      counter++
    })
  }

  if (otherShipments.length > 0) {
    lines.push(`\n*OTHER SHIPMENTS*`)
    otherShipments.forEach((s) => {
      lines.push(`${counter}. ${s.bolNumber} | ${s.currentLocation} | ${s.statusDisplay}`)
      counter++
    })
  }

  return lines.join("\n")
}

/**
 * Generates Management Summary (Requirement 41)
 */
export function buildManagementSummary(
  shipments: NormalizedWhatsAppShipment[],
  dateFormat: WhatsAppDateFormat = "20 Sep 2026"
): string {
  const active = shipments.filter((s) => s.statusCode !== "delivered" && s.statusCode !== "cancelled")
  const atBorder = shipments.filter((s) => s.statusCode.includes("border")).length
  const inTransit = shipments.filter((s) => s.statusCode.includes("transit")).length
  const atPort = shipments.filter((s) => s.statusCode.includes("port")).length
  const vesselDeparted = shipments.filter((s) => s.statusCode.includes("vessel")).length
  const arrivingSoon = shipments.filter((s) => {
    if (!s.eta) return false
    const diffDays = (new Date(s.eta).getTime() - Date.now()) / (1000 * 3600 * 24)
    return diffDays >= 0 && diffDays <= 4
  }).length

  const needsAttention = shipments.filter((s) => s.statusCode === "delayed" || (!s.eta && s.statusCode !== "delivered")).length

  const lines: string[] = []
  lines.push(`*SKY ARIANA OPERATIONS*`)
  lines.push(`*${formatDate(new Date().toISOString(), dateFormat)}*\n`)
  lines.push(`*Active Shipments:* ${active.length}`)
  lines.push(`*At Border:* ${atBorder}`)
  lines.push(`*In Transit:* ${inTransit}`)
  lines.push(`*At Port:* ${atPort}`)
  lines.push(`*Vessel Departed:* ${vesselDeparted}`)
  lines.push(`*Arriving Soon:* ${arrivingSoon}`)
  if (needsAttention > 0) lines.push(`\n*Needs Attention:* ${needsAttention}`)

  lines.push(`\nGenerated from Sky Ariana Live Operational Records`)
  return lines.join("\n")
}

/**
 * Main Daily Status Message Generator with Grouping and Splitting
 */
export function generateDailyStatusMessage(
  shipments: NormalizedWhatsAppShipment[],
  options: BulkGeneratorOptions = {}
): SplitMessageResult {
  const grouping = options.grouping || "none"
  const format = options.format || "compact"
  const dateFormat = options.dateFormat || "20 Sep 2026"
  const maxChars = options.maxCharsPerMessage || DEFAULT_MAX_CHARS

  const todayStr = formatDate(new Date().toISOString(), dateFormat)
  const headerLines: string[] = [
    `*SKY ARIANA LIMITED*`,
    `*DAILY SHIPMENT STATUS*`,
    `*${todayStr}*\n`,
  ]

  const itemsFormatted: { text: string; label: string }[] = []

  if (grouping === "location") {
    const byLoc = new Map<string, NormalizedWhatsAppShipment[]>()
    for (const s of shipments) {
      const loc = (s.currentLocation || "Other Locations").toUpperCase()
      if (!byLoc.has(loc)) byLoc.set(loc, [])
      byLoc.get(loc)!.push(s)
    }

    let globalIdx = 0
    for (const [loc, group] of byLoc.entries()) {
      const locLines: string[] = [`*${loc} — ${group.length} Shipments*`]
      group.forEach((s) => {
        locLines.push(formatShipmentBulkItem(s, globalIdx, format, dateFormat))
        globalIdx++
      })
      itemsFormatted.push({
        text: locLines.join("\n\n"),
        label: loc,
      })
    }
  } else if (grouping === "status") {
    const byStatus = new Map<string, NormalizedWhatsAppShipment[]>()
    for (const s of shipments) {
      const st = s.statusDisplay.toUpperCase()
      if (!byStatus.has(st)) byStatus.set(st, [])
      byStatus.get(st)!.push(s)
    }

    let globalIdx = 0
    for (const [st, group] of byStatus.entries()) {
      const stLines: string[] = [`*${st} — ${group.length} Shipments*`]
      group.forEach((s) => {
        stLines.push(formatShipmentBulkItem(s, globalIdx, format, dateFormat))
        globalIdx++
      })
      itemsFormatted.push({
        text: stLines.join("\n\n"),
        label: st,
      })
    }
  } else if (grouping === "customer") {
    const byCust = new Map<string, NormalizedWhatsAppShipment[]>()
    for (const s of shipments) {
      const cust = s.shipper.name || "Unknown Customer"
      if (!byCust.has(cust)) byCust.set(cust, [])
      byCust.get(cust)!.push(s)
    }

    let globalIdx = 0
    for (const [cust, group] of byCust.entries()) {
      const custLines: string[] = [`*Customer: ${cust} (${group.length} Shipments)*`]
      group.forEach((s) => {
        custLines.push(formatShipmentBulkItem(s, globalIdx, format, dateFormat))
        globalIdx++
      })
      itemsFormatted.push({
        text: custLines.join("\n\n"),
        label: cust,
      })
    }
  } else {
    // Ungrouped
    shipments.forEach((s, idx) => {
      itemsFormatted.push({
        text: formatShipmentBulkItem(s, idx, format, dateFormat),
        label: s.bolNumber,
      })
    })
  }

  const footer = `\n\n*Total Active Shipments:* ${shipments.length}\n*Thank you, SKY ARIANA LIMITED*`

  // Build full message
  const fullBody = itemsFormatted.map((item) => item.text).join("\n\n")
  const fullMessage = `${headerLines.join("\n")}${fullBody}${footer}`

  // Check if splitting is needed (Requirement 64)
  if (fullMessage.length <= maxChars) {
    return {
      fullMessage,
      isSplitNeeded: false,
      totalParts: 1,
      parts: [
        {
          partNumber: 1,
          totalParts: 1,
          title: "Complete Daily Status",
          text: fullMessage,
          shipmentRange: `1–${shipments.length}`,
        },
      ],
    }
  }

  // Intelligent splitting: never split a single shipment halfway
  const chunks: string[][] = []
  let currentChunk: string[] = []
  let currentLen = headerLines.join("\n").length + footer.length + 100

  for (const item of itemsFormatted) {
    const itemLen = item.text.length + 2
    if (currentChunk.length > 0 && currentLen + itemLen > maxChars) {
      chunks.push(currentChunk)
      currentChunk = [item.text]
      currentLen = headerLines.join("\n").length + itemLen
    } else {
      currentChunk.push(item.text)
      currentLen += itemLen
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk)
  }

  const totalParts = chunks.length
  let runningIndex = 1

  const parts = chunks.map((chunk, pIdx) => {
    const partNum = pIdx + 1
    const fromIdx = runningIndex
    const toIdx = Math.min(runningIndex + chunk.length - 1, shipments.length)
    runningIndex = toIdx + 1

    const partHeader = `*SKY ARIANA LIMITED*\n*DAILY SHIPMENT STATUS — Part ${partNum} of ${totalParts}*\n*Date:* ${todayStr}\n*Shipments:* ${fromIdx}–${toIdx}\n\n`
    const partBody = chunk.join("\n\n")
    const partFooter = `\n\n*(Part ${partNum} of ${totalParts} • Total: ${shipments.length} Active)*`

    return {
      partNumber: partNum,
      totalParts,
      title: `Message ${partNum} of ${totalParts}`,
      text: `${partHeader}${partBody}${partFooter}`,
      shipmentRange: `${fromIdx}–${toIdx}`,
    }
  })

  return {
    fullMessage,
    isSplitNeeded: true,
    totalParts,
    parts,
  }
}
