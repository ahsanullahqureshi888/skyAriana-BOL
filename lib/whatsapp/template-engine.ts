import type { NormalizedWhatsAppShipment, WhatsAppTemplate } from "./message-types"
import { ltrIsolate } from "./translations"

export const BUILTIN_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: "builtin-vessel-departed",
    name: "Vessel Departed",
    category: "vessel",
    language: "en",
    messageType: "vessel_update",
    statusCode: "vessel_departed",
    templateText:
      "*{{companyName}}*\n*SHIPMENT UPDATE*\n\nBOL: *{{bolNumber}}*\nContainer: *{{containerNumber}}*\n\n*Current Status:*\nThe vessel {{vessel}} (Voyage: {{voyage}}) has departed from {{currentLocation}} and is proceeding toward {{destination}}.\n\n*Destination:* {{destination}}\n*ETA:* {{eta}}\n*Last Updated:* {{lastUpdated}}\n\nThank you,\n{{companyName}}",
    isBuiltIn: true,
    isFavorite: true,
    updatedAt: "2026-09-20",
  },
  {
    id: "builtin-at-border",
    name: "Truck at Border",
    category: "border",
    language: "en",
    messageType: "border_update",
    statusCode: "at_border",
    templateText:
      "*{{companyName}}*\n*BORDER UPDATE*\n\nBOL: *{{bolNumber}}*\nTruck: *{{truckNumber}}*\nCargo: {{commodity}}\n\n*Current Status:*\nThe truck has reached {{currentLocation}} and is awaiting border customs processing.\n\n*Destination:* {{destination}}\n*Last Updated:* {{lastUpdated}}\n\nThank you,\n{{companyName}}",
    isBuiltIn: true,
    isFavorite: true,
    updatedAt: "2026-09-20",
  },
  {
    id: "builtin-border-crossed",
    name: "Truck Border Crossed",
    category: "border",
    language: "en",
    messageType: "border_update",
    statusCode: "border_crossed",
    templateText:
      "*{{companyName}}*\n*BORDER TRANSIT UPDATE*\n\nBOL: *{{bolNumber}}*\nTruck: *{{truckNumber}}*\n\n*Current Status:*\nThe truck has crossed {{currentLocation}} border and is proceeding toward {{nextLocation}}.\n\n*Destination:* {{destination}}\n*Last Updated:* {{lastUpdated}}\n\nThank you,\n{{companyName}}",
    isBuiltIn: true,
    isFavorite: true,
    updatedAt: "2026-09-20",
  },
  {
    id: "builtin-reached-port",
    name: "Reached Port (Bandar Abbas)",
    category: "port",
    language: "en",
    messageType: "port_update",
    statusCode: "at_port",
    templateText:
      "*{{companyName}}*\n*PORT ARRIVAL UPDATE*\n\nBOL: *{{bolNumber}}*\nCargo: {{commodity}} ({{packages}})\n\n*Current Status:*\nThe shipment has reached {{currentLocation}} port yard and is staged for container loading.\n\n*Destination:* {{destination}}\n*Last Updated:* {{lastUpdated}}\n\nThank you,\n{{companyName}}",
    isBuiltIn: true,
    isFavorite: true,
    updatedAt: "2026-09-20",
  },
  {
    id: "builtin-container-loading",
    name: "Container Loading",
    category: "port",
    language: "en",
    messageType: "container_update",
    statusCode: "container_loading",
    templateText:
      "*{{companyName}}*\n*CONTAINER STUFFING UPDATE*\n\nBOL: *{{bolNumber}}*\nContainer: *{{containerNumber}}* ({{containerType}})\nSeal: *{{sealNumber}}*\n\n*Current Status:*\nContainer stuffing and customs sealing have been completed at {{currentLocation}}.\n\n*Destination:* {{destination}}\n*ETA:* {{eta}}\n*Last Updated:* {{lastUpdated}}\n\nThank you,\n{{companyName}}",
    isBuiltIn: true,
    updatedAt: "2026-09-20",
  },
  {
    id: "builtin-transshipment",
    name: "Transshipment Hub (Jebel Ali)",
    category: "vessel",
    language: "en",
    messageType: "vessel_update",
    statusCode: "transshipment",
    templateText:
      "*{{companyName}}*\n*TRANSSHIPMENT UPDATE*\n\nBOL: *{{bolNumber}}*\nContainer: *{{containerNumber}}*\n\n*Current Status:*\nThe feeder vessel has arrived at {{currentLocation}} for transshipment to the main line vessel proceeding to {{destination}}.\n\n*Destination:* {{destination}}\n*ETA:* {{eta}}\n*Last Updated:* {{lastUpdated}}\n\nThank you,\n{{companyName}}",
    isBuiltIn: true,
    updatedAt: "2026-09-20",
  },
  {
    id: "builtin-eta-update",
    name: "ETA Update",
    category: "vessel",
    language: "en",
    messageType: "eta_update",
    statusCode: "eta_update",
    templateText:
      "*{{companyName}}*\n*SCHEDULE & ETA UPDATE*\n\nBOL: *{{bolNumber}}*\nContainer: *{{containerNumber}}*\nDestination: *{{destination}}*\n\n*Updated ETA:* *{{eta}}*\n*Current Location:* {{currentLocation}}\n*Current Status:* {{status}}\n\n*Last Updated:* {{lastUpdated}}\n\nThank you,\n{{companyName}}",
    isBuiltIn: true,
    isFavorite: true,
    updatedAt: "2026-09-20",
  },
  {
    id: "builtin-delivered",
    name: "Delivery Confirmation",
    category: "delivery",
    language: "en",
    messageType: "delivery_update",
    statusCode: "delivered",
    templateText:
      "*{{companyName}}*\n*DELIVERY CONFIRMATION*\n\nBOL: *{{bolNumber}}*\nConsignee: *{{consignee}}*\nContainer: *{{containerNumber}}*\n\n*Status:*\nThe shipment has been successfully cleared and delivered to the destination warehouse at {{destination}}.\n\nThank you for choosing Sky Ariana Limited.",
    isBuiltIn: true,
    isFavorite: true,
    updatedAt: "2026-09-20",
  },
]

export function getTemplateForStatus(statusCode: string): WhatsAppTemplate {
  const norm = statusCode.toLowerCase().replace(/[\s-]+/g, "_")
  const found = BUILTIN_TEMPLATES.find((t) => t.statusCode === norm)
  return found || BUILTIN_TEMPLATES[0]
}

export interface RenderTemplateOptions {
  companyName?: string
  includeEtaIfMissing?: boolean
  missingEtaText?: string
}

/**
 * Safely renders a template string with variable replacement.
 * Strictly avoids eval().
 */
export function renderTemplate(
  templateText: string,
  shipment: NormalizedWhatsAppShipment,
  options: RenderTemplateOptions = {}
): string {
  const compName = options.companyName || "SKY ARIANA LIMITED"

  // Variable map
  const values: Record<string, string> = {
    bolNumber: shipment.bolNumber || "N/A",
    shipper: shipment.shipper?.name || "N/A",
    consignee: shipment.consignee?.name || "N/A",
    notifyParty: shipment.notifyParty?.name || "N/A",
    containerNumber: shipment.containerNumber || "N/A",
    containerType: shipment.containerType || "",
    sealNumber: shipment.sealNumber || "N/A",
    truckNumber: shipment.truckNumber || "N/A",
    driverName: shipment.driver?.name || "N/A",
    commodity: shipment.commodity || "General Cargo",
    packages: shipment.packagesFormatted || (shipment.packagesCount ? `${shipment.packagesCount} CTNS` : ""),
    netWeight: shipment.netWeightKg ? `${shipment.netWeightKg.toLocaleString()} KG` : "",
    grossWeight: shipment.grossWeightKg ? `${shipment.grossWeightKg.toLocaleString()} KG` : "",
    currentLocation: shipment.currentLocation || "In Transit",
    origin: shipment.origin || "Kandahar",
    destination: shipment.destination || "Nhava Sheva",
    status: shipment.statusDisplay || "In Transit",
    vessel: shipment.vesselName || "Main Carrier",
    voyage: shipment.voyageNumber || "",
    etd: shipment.etd || "",
    lastUpdated: shipment.lastUpdated ? new Date(shipment.lastUpdated).toLocaleDateString("en-GB") : "",
    companyName: compName,
  }

  // Next Location safety: Requirement 30 (Never invent next location)
  if (shipment.nextLocation) {
    values.nextLocation = shipment.nextLocation
  } else {
    values.nextLocation = shipment.destination || "the next transit terminal"
  }

  // ETA safety: Requirement 31 (Only show ETA when valid ETA exists)
  if (shipment.eta) {
    values.eta = shipment.eta
  } else if (options.includeEtaIfMissing) {
    values.eta = options.missingEtaText || "Not available"
  } else {
    values.eta = ""
  }

  let result = templateText.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (_, key) => {
    const val = values[key]
    return val !== undefined ? val : ""
  })

  // Clean empty lines if ETA or next location was blank
  result = result
    .split(/\r?\n/)
    .filter((line) => {
      // If line is like "*ETA:* " or "ETA:" with nothing after
      if (/^\*?(?:ETA|ETD|Seal|Voyage)\s*[:#-]?\*?\s*$/i.test(line.trim())) {
        return false
      }
      return true
    })
    .join("\n")

  return result.trim()
}
