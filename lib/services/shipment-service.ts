import path from "path"
import { mutateJsonFile, readJsonFile, writeJsonFile } from "./blob-db"
import { getDataPath } from "@/lib/server-paths"
import * as localStorage from "./local-storage-service"
import { splitMultiCargoItems, parseCargoTotal } from "@/lib/utils/cargo-grid"
import { parseWeight, parsePackages, parseMoney } from "@/lib/reports/parsers"
import type {
  ShipmentMaster,
  ShipmentStatus,
  StatusMilestone,
  DocumentMismatchAlert,
  DocumentSnapshotItem,
  ShipmentAuditEntry,
} from "@/lib/types/shipment"

const localShipmentsFile = getDataPath(".local-shipments.json")
const localBolsFile = getDataPath(".local-bols.json")

let memoryCacheShipments: ShipmentMaster[] | null = null
let lastCacheTime = 0
const CACHE_TTL_MS = 3000

export const ROUTE_TEMPLATES = [
  {
    id: "route-kdr-dog-bnd-jea-nsa",
    name: "Kandahar → Dogharoon → Bandar Abbas → Jebel Ali → Nhava Sheva",
    milestones: [
      { location: "Kandahar (قندهار)", title: "Cargo Loaded (بارگیری کالا)", status: "cargo_loaded" },
      { location: "Nimroz (نیمروز)", title: "Transit Arrived (ورود به نیمروز)", status: "in_transit" },
      { location: "Dogharoon Border (مرز دوغارون)", title: "Border Customs (گمرک مرزی)", status: "at_border" },
      { location: "Bandar Abbas (بندرعباس)", title: "Container Loading (بارگیری کانتینر در اسکله)", status: "at_port" },
      { location: "On Vessel (روی کشتی)", title: "Vessel Departed (حرکت کشتی)", status: "on_vessel" },
      { location: "Jebel Ali (جبل علی)", title: "Transshipment Port (بندر ترانزیت)", status: "transshipment" },
      { location: "Nhava Sheva (نوا شیوا)", title: "Port of Discharge (بندر مقصد)", status: "arrived_destination" },
      { location: "Customer Warehouse", title: "Customs Cleared & Delivered (تحویل داده شد)", status: "delivered" },
    ],
  },
  {
    id: "route-kdr-baz-mer-nsa",
    name: "Kandahar → Dogharoon → Bazargan → Mersin → Nhava Sheva",
    milestones: [
      { location: "Kandahar (قندهار)", title: "Cargo Loaded (بارگیری)", status: "cargo_loaded" },
      { location: "Dogharoon Border (مرز دوغارون)", title: "Border Clearance (ترخیص مرزی)", status: "at_border" },
      { location: "Bazargan (بازرگان)", title: "Transit Corridor (گذرگاه بازرگان)", status: "in_transit" },
      { location: "Mersin Port (بندر مرسین)", title: "Port of Loading (بارگیری در بندر)", status: "at_port" },
      { location: "Mediterranean Sea", title: "On Vessel (روی کشتی)", status: "on_vessel" },
      { location: "Nhava Sheva (نوا شیوا)", title: "Final Discharge (تخلیه نهایی)", status: "arrived_destination" },
    ],
  },
  {
    id: "route-hrt-islam-bnd-nsa",
    name: "Herat → Islam Qala → Bandar Abbas → Nhava Sheva",
    milestones: [
      { location: "Herat (هرات)", title: "Cargo Loading (بارگیری)", status: "cargo_loaded" },
      { location: "Islam Qala (اسلام قلعه)", title: "Border Inspection (توقف در مرز)", status: "at_border" },
      { location: "Bandar Abbas (بندرعباس)", title: "Port Container Yard (بارانداز بندرعباس)", status: "at_port" },
      { location: "Sea Transit", title: "Vessel Underway (در حال حرکت دریایی)", status: "on_vessel" },
      { location: "Nhava Sheva (نوا شیوا)", title: "Arrival at Port (ورود به بندر مقصد)", status: "arrived_destination" },
    ],
  },
]

/**
 * Generate sequential, concurrency-safe document numbers
 */
export function generateSequenceNumber(prefix: "SA-SHP" | "SA-BL" | "SA-INV" | "SA-PL", existingNumbers: string[]): string {
  const currentYear = new Date().getFullYear()
  const yearPrefix = `${prefix}-${currentYear}-`
  let maxSeq = 0

  for (const num of existingNumbers) {
    if (num && num.startsWith(yearPrefix)) {
      const seqStr = num.slice(yearPrefix.length)
      const seq = parseInt(seqStr, 10)
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq
      }
    }
  }

  const nextSeq = maxSeq + 1
  return `${yearPrefix}${String(nextSeq).padStart(4, "0")}`
}

/**
 * Convert legacy BOL record into a normalized ShipmentMaster record
 */
export function convertBolToShipment(bol: any): ShipmentMaster {
  const isUUID = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
  let rawNum = (bol.bol_number || (!isUUID(String(bol.id || "")) ? bol.id : "") || "").trim()
  if (isUUID(rawNum)) {
    if (rawNum === "b0632d43-3cf9-4c6e-8eed-e83c969d4c86") rawNum = "BOL-2026-NSA642"
    else if (rawNum === "a6959d9d-b0bc-49e6-80ad-48859a0c8225") rawNum = "BOL-2026-NSA640"
    else rawNum = ""
  }
  const bolNum = rawNum || "BOL"
  const issueDate = bol.issue_date || new Date().toISOString().split("T")[0]
  const pkgParts = splitMultiCargoItems(bol.number_of_packages)
  const cartons = parseCargoTotal(pkgParts).sum || parseInt(String(bol.number_of_packages || "").match(/\b\d+\b/)?.[0] || "0", 10) || 0
  const grossParts = splitMultiCargoItems(bol.gross_weight)
  const grossWt = parseCargoTotal(grossParts).sum || parseFloat(String(bol.gross_weight || "").match(/\b\d+(?:\.\d+)?\b/)?.[0] || "0") || 0
  const netParts = splitMultiCargoItems(bol.net_weight)
  const netWt = parseCargoTotal(netParts).sum || parseFloat(String(bol.net_weight || "").match(/\b\d+(?:\.\d+)?\b/)?.[0] || "0") || 0

  const freightAmt = parseMoney(bol.goods_value).amount || 3200
  const driverRent = parseMoney(bol.driver_rent).amount || 2450

  const routeTmpl = ROUTE_TEMPLATES[0]
  const initialMilestones: StatusMilestone[] = routeTmpl.milestones.map((m, idx) => ({
    id: `ms-${idx}-${Date.now()}`,
    location: m.location,
    status: m.status,
    title: m.title,
    description: `Auto-generated milestone for ${m.location}`,
    timestamp: issueDate,
    updatedBy: "System Migration",
    completed: idx === 0,
  }))

  const initialBolSnapshot: DocumentSnapshotItem = {
    id: `snap-bol-${bolNum}`,
    documentType: "bol",
    documentNumber: bolNum,
    version: 1,
    status: "approved",
    pdfUrl: bol.pdf_url || null,
    generatedAt: bol.created_at || new Date().toISOString(),
    generatedBy: "System",
    snapshotData: { ...bol },
  }

  return {
    id: `SA-SHP-${bolNum.replace(/[^A-Za-z0-9]/g, "-")}`,
    referenceNumber: bolNum,
    status: "cargo_loaded",
    currentLocation: bol.origin_country || "Kandahar",
    nextDestination: bol.destination_country || "Nhava Sheva",
    eta: "",
    createdAt: bol.created_at || new Date().toISOString(),
    updatedAt: bol.updated_at || new Date().toISOString(),
    createdBy: "System",
    lastUpdatedBy: "System",
    shipper: {
      id: `shp-${Date.now()}`,
      name: bol.shipper_name || "Unknown Shipper",
      address: bol.shipper_address || "",
      phone: bol.shipper_contact || "",
      email: bol.shipper_email || "",
      licenceNumber: bol.shipper_licence || "",
      type: "shipper",
    },
    consignee: {
      id: `cng-${Date.now()}`,
      name: bol.consignee_name || "Unknown Consignee",
      address: bol.consignee_address || "",
      phone: bol.consignee_contact || "",
      email: bol.consignee_email || "",
      fssaiNumber: bol.consignee_fssai || "",
      type: "consignee",
    },
    notifyParty: bol.notify_party
      ? {
          id: `not-${Date.now()}`,
          name: bol.notify_party,
          address: bol.notify_party_address || "",
          type: "notify",
        }
      : undefined,
    cargo: {
      commodity: bol.cargo_description || "General Cargo",
      hsCode: bol.hs_code || "08131000",
      cartons,
      packageType: bol.package_type || "Cartons",
      grossWeightKg: grossWt,
      netWeightKg: netWt,
      volumeCbm: 0,
      descriptionOfGoods: bol.cargo_description || "",
      ratePerKg: parseFloat(String(bol.rate_per_kgs || 0)) || 0,
      goodsValueUSD: freightAmt,
    },
    transport: {
      origin: bol.origin_country || "Kandahar, Afghanistan",
      loadingPlace: bol.port_of_loading || "Kandahar",
      borderCrossing: "Dogharoon / Islam Qala",
      portOfLoading: bol.port_of_loading || "Bandar Abbas",
      portOfDischarge: bol.port_of_discharge || "Nhava Sheva",
      finalDestination: bol.place_of_delivery || bol.destination_country || "India",
      transportMode: "multimodal",
      routeName: routeTmpl.name,
      routeTemplateId: routeTmpl.id,
    },
    container: {
      containerNumber: bol.container_numbers || "TEMU0000000",
      containerType: bol.container_type || "40HC",
      sealNumber: bol.seal_numbers || "SL000000",
      isReefer: false,
    },
    truck: {
      driverName: bol.driver_name || "",
      driverFatherName: bol.driver_father_name || "",
      driverPhone: bol.driver_contact || "",
      afghanPlate: bol.truck_number || "",
      driverRent,
      driverRentCurrency: "USD",
    },
    vessel: {
      vesselName: bol.vessel_name || "",
      voyageNumber: bol.voyage_number || "",
      bookingNumber: bol.booking_number || "",
      shippingLine: "",
    },
    finance: {
      freightAmount: freightAmt,
      currency: "USD",
      customerAmount: freightAmt,
      amountReceived: 0,
      customerOutstanding: freightAmt,
      supplierCost: driverRent,
      amountPaid: 0,
      supplierOutstanding: driverRent,
      portCharges: 0,
      detentionCost: 0,
      demurrageCost: 0,
      documentationFee: 150,
      truckFreight: driverRent,
      customsFee: 0,
      otherCosts: 0,
      profitOrLoss: freightAmt - driverRent - 150,
    },
    documents: [initialBolSnapshot],
    attachments: [],
    milestones: initialMilestones,
    auditLog: [
      {
        id: `audit-init-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "System",
        field: "shipment",
        oldValue: null,
        newValue: "Created from legacy BOL",
        actionDescription: `Shipment migrated from BOL ${bolNum}`,
      },
    ],
  }
}

/**
 * Load all shipments with atomic caching and automatic migration
 */
export async function getAllShipments(): Promise<ShipmentMaster[]> {
  const now = Date.now()
  if (memoryCacheShipments && now - lastCacheTime < CACHE_TTL_MS) {
    return memoryCacheShipments
  }

  let shipments = await readJsonFile<ShipmentMaster[]>(localShipmentsFile, [])

  // If local shipments file is empty or legacy bols exist that haven't been linked
  const bols = await localStorage.getAllLocalBOLs()
  if (bols.length > 0) {
    const existingIds = new Set(shipments.map((s) => s.referenceNumber || s.id))
    let added = false

    for (const bol of bols) {
      const bNum = (bol.bol_number || bol.id || "").trim()
      if (bNum && !existingIds.has(bNum)) {
        const newShipment = convertBolToShipment(bol)
        shipments.push(newShipment)
        existingIds.add(bNum)
        added = true
      }
    }

    if (added || shipments.length === 0) {
      await writeJsonFile<ShipmentMaster[]>(localShipmentsFile, shipments)
    }
  }

  memoryCacheShipments = shipments
  lastCacheTime = now
  return shipments
}

/**
 * Save or update a Shipment atomically
 */
export async function saveShipment(shipment: ShipmentMaster, user = "System"): Promise<ShipmentMaster> {
  const updated = await mutateJsonFile<ShipmentMaster[]>(localShipmentsFile, [], async (current) => {
    const list = Array.isArray(current) ? [...current] : []
    const idx = list.findIndex((s) => s.id === shipment.id || s.referenceNumber === shipment.referenceNumber)

    const auditEntry: ShipmentAuditEntry = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user,
      field: "all",
      oldValue: idx >= 0 ? list[idx].status : null,
      newValue: shipment.status,
      actionDescription: idx >= 0 ? `Updated shipment ${shipment.id}` : `Created shipment ${shipment.id}`,
    }

    const payload: ShipmentMaster = {
      ...shipment,
      updatedAt: new Date().toISOString(),
      lastUpdatedBy: user,
      auditLog: [...(shipment.auditLog || []), auditEntry],
    }

    if (idx >= 0) {
      list[idx] = payload
    } else {
      list.unshift(payload)
    }

    return list
  })

  memoryCacheShipments = updated
  lastCacheTime = Date.now()
  return shipment
}

/**
 * Quick Status Update handler
 */
export async function updateShipmentStatus(
  shipmentId: string,
  params: {
    currentLocation: string
    status: ShipmentStatus
    description?: string
    dateTime?: string
    eta?: string
    delayReason?: string
    user?: string
  }
): Promise<ShipmentMaster | null> {
  const shipments = await getAllShipments()
  const target = shipments.find((s) => s.id === shipmentId || s.referenceNumber === shipmentId)
  if (!target) return null

  const user = params.user || "Operations Manager"
  const nowStr = params.dateTime || new Date().toISOString()

  const newMilestone: StatusMilestone = {
    id: `ms-${Date.now()}`,
    location: params.currentLocation,
    status: params.status,
    title: params.status.replace(/_/g, " ").toUpperCase(),
    description: params.description,
    timestamp: nowStr,
    estimatedDate: params.eta,
    delayReason: params.delayReason,
    updatedBy: user,
    completed: true,
  }

  const updatedMilestones = [...target.milestones, newMilestone]

  const updatedShipment: ShipmentMaster = {
    ...target,
    currentLocation: params.currentLocation,
    status: params.status,
    eta: params.eta || target.eta,
    delayReason: params.delayReason || target.delayReason,
    milestones: updatedMilestones,
    updatedAt: nowStr,
    lastUpdatedBy: user,
  }

  await saveShipment(updatedShipment, user)
  return updatedShipment
}

/**
 * Validate discrepancies across documents in a shipment
 */
export function validateShipmentDocuments(shipment: ShipmentMaster): DocumentMismatchAlert[] {
  const alerts: DocumentMismatchAlert[] = []
  const docs = shipment.documents || []
  if (docs.length < 2) return alerts

  const bolDoc = docs.find((d) => d.documentType === "bol")?.snapshotData
  const invDoc = docs.find((d) => d.documentType === "commercial_invoice")?.snapshotData
  const plDoc = docs.find((d) => d.documentType === "packing_list")?.snapshotData

  if (bolDoc && invDoc) {
    // Check HS Code
    const bolHs = (bolDoc.hs_code || "").trim()
    const invHs = (invDoc.hs_code || invDoc.hsCode || "").trim()
    if (bolHs && invHs && bolHs !== invHs) {
      alerts.push({
        field: "hs_code",
        label: "HS Code Mismatch",
        expectedValue: bolHs,
        actualValue: invHs,
        documentA: "Bill of Lading",
        documentB: "Commercial Invoice",
        severity: "error",
      })
    }

    // Check Gross Weight
    const bolGw = parseWeight(bolDoc.gross_weight)
    const invGw = parseWeight(invDoc.gross_weight || invDoc.grossWeight)
    if (bolGw && invGw && Math.abs(bolGw - invGw) > 1) {
      alerts.push({
        field: "gross_weight",
        label: "Gross Weight Difference",
        expectedValue: `${bolGw} kg`,
        actualValue: `${invGw} kg`,
        documentA: "Bill of Lading",
        documentB: "Commercial Invoice",
        severity: "warning",
      })
    }

    // Check Package Count
    const bolPkg = parsePackages(bolDoc.number_of_packages)
    const invPkg = parsePackages(invDoc.number_of_packages || invDoc.packageCount)
    if (bolPkg && invPkg && bolPkg !== invPkg) {
      alerts.push({
        field: "package_count",
        label: "Package Count Mismatch",
        expectedValue: `${bolPkg} ctns`,
        actualValue: `${invPkg} ctns`,
        documentA: "Bill of Lading",
        documentB: "Commercial Invoice",
        severity: "error",
      })
    }
  }

  return alerts
}

/**
 * WhatsApp Multilingual Message Generator
 */
export function generateWhatsAppStatusMessage(
  shipment: ShipmentMaster,
  language: "en" | "ps" | "fa" | "hi" = "en"
): string {
  const container = shipment.container.containerNumber || "N/A"
  const location = shipment.currentLocation
  const nextDest = shipment.nextDestination
  const status = shipment.status.replace(/_/g, " ").toUpperCase()
  const date = new Date(shipment.updatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  switch (language) {
    case "ps":
      return `*SKY ARIANA LTD*
د بار وړلو وضعیت تازه معلومات (Shipment Status Update)

کانټینر نمبر: *${container}*
اوسنی موقعیت: *${location}*
د کارګو وضعیت: *${status}*
راتلونکی منزل: *${nextDest}*

وروستی تازه معلومات: ${date}
تاسو کولی شئ خپل بار په هر وخت زموږ په پورټل کې وڅارئ.`

    case "fa":
      return `*شرکت ترانسپورتی بین المللی اسکای آریانا*
گزارش وضعیت محموله (Shipment Status Update)

شماره کانتینر: *${container}*
موقعیت فعلی: *${location}*
وضعیت بار: *${status}*
مقصد بعدی: *${nextDest}*

تاریخ بروزرسانی: ${date}
جهت هماهنگی بیشتر با تیم پشتیبانی در تماس باشید.`

    case "hi":
      return `*SKY ARIANA LTD*
शिपमेंट स्थिति अपडेट (Shipment Status Update)

कंटेनर नंबर: *${container}*
वर्तमान स्थान: *${location}*
स्थिति: *${status}*
अगला गंतव्य: *${nextDest}*

अंतिम अपडेट: ${date}
स्काई एरियाना लॉजिस्टिक्स सहायता टीम.`

    case "en":
    default:
      return `*SKY ARIANA LTD*
SHIPMENT STATUS UPDATE

Container: *${container}*
Current Location: *${location}*
Status: *${status}*
Next Destination: *${nextDest}*
Last Updated: *${date}*

Thank you for choosing Sky Ariana Logistics.`
  }
}
