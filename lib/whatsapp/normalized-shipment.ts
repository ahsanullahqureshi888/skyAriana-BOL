import type { BillOfLadingFormData } from "@/lib/types/bill-of-lading"
import type { ShipmentMaster } from "@/lib/types/shipment"
import type { NormalizedWhatsAppShipment, WhatsAppRouteLeg } from "./message-types"

function cleanText(val: unknown): string {
  if (typeof val !== "string" && typeof val !== "number") return ""
  const str = String(val).trim()
  return /^(?:undefined|null|n\/?a|nan|none|\[object object\])$/i.test(str) ? "" : str
}

function cleanNumber(val: unknown): number | undefined {
  if (typeof val === "number" && !isNaN(val)) return val
  if (typeof val === "string") {
    const cleaned = val.replace(/,/g, "").trim()
    const parsed = parseFloat(cleaned)
    if (!isNaN(parsed) && isFinite(parsed)) return parsed
  }
  return undefined
}

function cleanCargoSummary(text: string): string {
  if (!text) return ""
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(/[|│]/))
    .map((seg) =>
      seg
        .replace(/^[\p{Extended_Pictographic}\s•*>-]+/gu, "")
        .replace(/^\d+[.)]\s*/, "")
        .replace(/^(?:cargo|commodity|description of goods|goods)\s*[:#-]?\s*/i, "")
        .trim()
    )
    .filter(
      (seg) =>
        seg &&
        !/^(?:container\s*&\s*cargo|document\s*&\s*shipping|transit date|hs(?:\s*code)?|afghan\s*tc|invoice|inv no|lot no|batch no|booking|seal no|container no)\b/i.test(
          seg
        ) &&
        !/^[:#-]?\s*$/.test(seg)
    )
    .join("; ")
    .replace(/\bRAISNIS\b/gi, "RAISINS")
    .replace(/\bBLACK-RAISNIS\b/gi, "BLACK RAISINS")
    .replace(/\bGREEN-RAISNIS\b/gi, "GREEN RAISINS")
    .replace(/\bGOLDEN-RAISNIS\b/gi, "GOLDEN RAISINS")
    .trim()
}

function parsePackages(pkgText: unknown, typeText?: unknown): { count?: number; type?: string; formatted?: string } {
  const raw = cleanText(pkgText)
  if (!raw) return {}

  const match = raw.match(/^(\d[\d,]*)\s*[-–—]?\s*(CTNS?|CARTONS?|BAGS?|PKGS?|PACKAGES?|UNITS?|BOXES?|ROLLS?)\b/i)
  if (match) {
    const count = parseInt(match[1].replace(/,/g, ""), 10)
    const type = match[2].toUpperCase()
    return {
      count: isNaN(count) ? undefined : count,
      type,
      formatted: `${(!isNaN(count) ? count.toLocaleString("en-US") : match[1])} ${type}`,
    }
  }

  const numOnly = raw.match(/^(\d[\d,]*)$/)
  if (numOnly) {
    const count = parseInt(numOnly[1].replace(/,/g, ""), 10)
    const type = cleanText(typeText) || "Cartons"
    return {
      count: isNaN(count) ? undefined : count,
      type,
      formatted: `${(!isNaN(count) ? count.toLocaleString("en-US") : numOnly[1])} ${type}`,
    }
  }

  return { formatted: raw }
}

function normalizeStatusDisplay(status: string): string {
  const s = cleanText(status)
  if (!s) return "In Transit"
  return s
    .replace(/[_-]+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

export function normalizeToWhatsAppShipment(source: any): NormalizedWhatsAppShipment {
  if (!source) {
    return {
      id: "unknown",
      bolNumber: "N/A",
      shipper: { name: "Unknown Shipper" },
      consignee: { name: "Unknown Consignee" },
      commodity: "General Cargo",
      currentLocation: "Transit Point",
      origin: "Kandahar, Afghanistan",
      destination: "Nhava Sheva, India",
      statusCode: "in_transit",
      statusDisplay: "In Transit",
      lastUpdated: new Date().toISOString(),
    }
  }

  // Check if source is ShipmentMaster
  const isShipmentMaster = Boolean(source.cargo && source.transport && source.shipper)
  const isBolFormData = Boolean(source.bol_number || source.container_numbers || source.shipper_name)

  const isUUID = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
  const candidateBol = cleanText(source.bolNumber || source.bol_number || source.referenceNumber || (!isUUID(String(source.id || "")) ? source.id : ""))
  const bolNum = (!isUUID(candidateBol) ? candidateBol : "") || "N/A"
  const invNum = cleanText(source.invoiceNumber || source.invoice_number || source.invoiceNo)

  // Parties
  const shipperName = cleanText(
    isShipmentMaster ? source.shipper?.name : source.shipper_name || source.shipper
  ) || "Unknown Shipper"
  const shipperPhone = cleanText(
    isShipmentMaster ? source.shipper?.phone : source.shipper_contact || source.shipper_phone
  )
  const shipperAddr = cleanText(
    isShipmentMaster ? source.shipper?.address : source.shipper_address
  )

  const consigneeName = cleanText(
    isShipmentMaster ? source.consignee?.name : source.consignee_name || source.consignee
  ) || "Unknown Consignee"
  const consigneePhone = cleanText(
    isShipmentMaster ? source.consignee?.phone : source.consignee_contact || source.consignee_phone
  )
  const consigneeAddr = cleanText(
    isShipmentMaster ? source.consignee?.address : source.consignee_address
  )

  const notifyName = cleanText(
    isShipmentMaster ? source.notifyParty?.name : source.notify_party
  )
  const notifyPhone = cleanText(
    isShipmentMaster ? source.notifyParty?.phone : source.notify_party_contact || source.notify_contact
  )
  const notifyAddr = cleanText(
    isShipmentMaster ? source.notifyParty?.address : source.notify_party_address
  )

  // Driver & Truck
  const driverName = cleanText(
    isShipmentMaster ? source.truck?.driverName : source.driver_name
  )
  const driverFather = cleanText(
    isShipmentMaster ? source.truck?.driverFatherName : source.driver_father_name
  )
  const driverPhone = cleanText(
    isShipmentMaster ? source.truck?.driverPhone : source.driver_contact || source.driver_phone
  )
  const driverRent = cleanNumber(
    isShipmentMaster ? source.truck?.driverRent : source.driver_rent
  )
  const driverRentCurr = cleanText(
    isShipmentMaster ? source.truck?.driverRentCurrency : source.driver_rent_currency
  ) || "USD"

  const truckNumber = cleanText(
    isShipmentMaster ? source.truck?.afghanPlate || source.truck?.iranianPlate : source.truck_number
  )

  // Container
  const containerNumber = cleanText(
    isShipmentMaster ? source.container?.containerNumber : source.container_numbers || source.containerNo
  )
  const containerType = cleanText(
    isShipmentMaster
      ? source.container?.containerType
      : `${cleanText(source.container_size)} ${cleanText(source.container_type)}`.trim()
  )
  const sealNumber = cleanText(
    isShipmentMaster ? source.container?.sealNumber : source.seal_numbers || source.sealNumber
  )

  // Cargo
  const rawCargo = cleanText(
    isShipmentMaster ? source.cargo?.commodity || source.cargo?.descriptionOfGoods : source.cargo_description || source.commodity
  )
  const rawPackages = isShipmentMaster
    ? source.cargo?.cartons
    : source.number_of_packages || source.quantity
  const pkgType = isShipmentMaster ? source.cargo?.packageType : source.package_type
  const pkgInfo = parsePackages(rawPackages, pkgType)
  const commodity = cleanCargoSummary(rawCargo) || (pkgInfo.type ? `${pkgInfo.type} Cargo` : "General Cargo")

  const grossWeightKg = cleanNumber(
    isShipmentMaster ? source.cargo?.grossWeightKg : source.gross_weight
  )
  const netWeightKg = cleanNumber(
    isShipmentMaster ? source.cargo?.netWeightKg : source.net_weight
  )

  // Route & Locations
  const origin = cleanText(
    isShipmentMaster ? source.transport?.origin : source.origin_country || source.port_of_loading
  ) || "Kandahar, Afghanistan"

  const destination = cleanText(
    isShipmentMaster ? source.transport?.finalDestination : source.place_of_delivery || source.destination_country || source.port_of_discharge
  ) || "Nhava Sheva, India"

  const portOfLoading = cleanText(
    isShipmentMaster ? source.transport?.portOfLoading : source.port_of_loading
  )
  const portOfDischarge = cleanText(
    isShipmentMaster ? source.transport?.portOfDischarge : source.port_of_discharge
  )

  const currentLocation = cleanText(
    source.currentLocation || (source.routes && source.routes[0]?.location) || portOfLoading || origin
  ) || "In Transit"

  const nextLocation = cleanText(
    source.nextDestination || (source.routes && source.routes[1]?.location)
  )

  // Status
  const statusCode = (source.status || "in_transit").toString().toLowerCase()
  const statusDisplay = normalizeStatusDisplay(statusCode)

  // Vessel
  const vesselName = cleanText(
    isShipmentMaster ? source.vessel?.vesselName : source.vessel_name
  )
  const voyageNumber = cleanText(
    isShipmentMaster ? source.vessel?.voyageNumber : source.voyage_number
  )
  const feederVessel = cleanText(
    isShipmentMaster ? source.vessel?.feederVessel : source.feeder_vessel
  )

  // ETD / ETA
  let etd = cleanText(isShipmentMaster ? source.vessel?.etd : source.etd)
  let eta = cleanText(source.eta || (isShipmentMaster ? source.vessel?.eta : source.eta))

  if (!eta && Array.isArray(source.routes) && source.routes.length > 0) {
    const lastStop = [...source.routes].reverse().find((r: any) => cleanText(r.arrivalDate))
    if (lastStop) eta = cleanText(lastStop.arrivalDate)
  }
  if (!etd && Array.isArray(source.routes) && source.routes.length > 0) {
    const firstStop = source.routes.find((r: any) => cleanText(r.departureDate))
    if (firstStop) etd = cleanText(firstStop.departureDate)
  }

  const lastUpdated = cleanText(source.updatedAt || source.updated_at || source.issue_date || source.created_at) || new Date().toISOString()

  // Multi-leg support
  const legs: WhatsAppRouteLeg[] = []
  if (isShipmentMaster && source.transport) {
    if (source.transport.portOfLoading && source.transport.transshipmentPort) {
      legs.push({
        from: source.transport.portOfLoading,
        to: source.transport.transshipmentPort,
        vesselOrCarrier: feederVessel || vesselName || "Feeder Vessel",
        status: "Completed",
      })
    }
    if (source.transport.transshipmentPort && source.transport.portOfDischarge) {
      legs.push({
        from: source.transport.transshipmentPort,
        to: source.transport.portOfDischarge,
        vesselOrCarrier: vesselName || "Main Line Vessel",
        status: statusDisplay,
        eta: eta || undefined,
      })
    }
  }

  // Document checklist
  const docsList = [
    { name: "Commercial Invoice", present: Boolean(source.invoiceNumber || (source.documents || []).some((d: any) => d.documentType === "commercial_invoice")), statusText: "Ready" },
    { name: "Packing List", present: (source.documents || []).some((d: any) => d.documentType === "packing_list") || Boolean(pkgInfo.count), statusText: "Ready" },
    { name: "Phytosanitary Certificate", present: (source.documents || []).some((d: any) => d.documentType === "phytosanitary"), statusText: "Ready" },
    { name: "Transit Paper", present: (source.documents || []).some((d: any) => d.documentType === "transit_paper"), statusText: "Pending" },
  ]

  // Sensitive fields (never output to customer safe mode)
  const internalNotes = cleanText(source.operationalNotes || source.notes)
  const customerBalance = cleanNumber(source.finance?.customerOutstanding)
  const freightAmount = cleanNumber(source.finance?.freightAmount || source.goods_value)
  const profit = cleanNumber(source.finance?.profitOrLoss)

  return {
    id: cleanText(source.id) || bolNum,
    bolNumber: bolNum,
    invoiceNumber: invNum || undefined,
    shipper: {
      name: shipperName,
      phone: shipperPhone || undefined,
      address: shipperAddr || undefined,
    },
    consignee: {
      name: consigneeName,
      phone: consigneePhone || undefined,
      address: consigneeAddr || undefined,
    },
    notifyParty: notifyName
      ? {
          name: notifyName,
          phone: notifyPhone || undefined,
          address: notifyAddr || undefined,
        }
      : undefined,
    driver: driverName
      ? {
          name: driverName,
          fatherName: driverFather || undefined,
          phone: driverPhone || undefined,
          rent: driverRent,
          rentCurrency: driverRentCurr,
        }
      : undefined,
    truckNumber: truckNumber || undefined,
    containerNumber: containerNumber || undefined,
    containerType: containerType || undefined,
    sealNumber: sealNumber || undefined,
    commodity,
    packagesCount: pkgInfo.count,
    packagesType: pkgInfo.type,
    packagesFormatted: pkgInfo.formatted,
    grossWeightKg,
    netWeightKg,
    currentLocation,
    nextLocation: nextLocation || undefined,
    origin,
    destination,
    portOfLoading: portOfLoading || undefined,
    portOfDischarge: portOfDischarge || undefined,
    statusCode,
    statusDisplay,
    vesselName: vesselName || undefined,
    voyageNumber: voyageNumber || undefined,
    feederVessel: feederVessel || undefined,
    etd: etd || undefined,
    eta: eta || undefined,
    lastUpdated,
    legs: legs.length > 0 ? legs : undefined,
    documents: docsList,
    internalNotes: internalNotes || undefined,
    driverRent,
    driverRentCurrency: driverRentCurr,
    customerBalance,
    freightAmount,
    profit,
  }
}
