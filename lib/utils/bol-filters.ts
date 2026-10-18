/**
 * Shared Bill of Lading validation, filtering, sorting, and lightweight projection utilities.
 */

export function isUUID(str?: any): boolean {
  if (!str || typeof str !== "string") return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim())
}

export function cleanBolNumber(bolNum?: any, fallback = ""): string {
  if (!bolNum || typeof bolNum !== "string") return fallback
  const trimmed = bolNum.trim()
  if (isUUID(trimmed)) return fallback
  return trimmed || fallback
}

export function getCleanBolNumber(docOrNum?: any, fallback = ""): string {
  if (!docOrNum) return fallback
  if (typeof docOrNum === "string") return cleanBolNumber(docOrNum, fallback)
  const candidate = docOrNum.bol_number || docOrNum.billOfLadingNumber || docOrNum.bolNo || ""
  return cleanBolNumber(candidate, fallback)
}

export function parseBolSeq(bolNum: any): number {
  if (!bolNum) return 0
  const str = String(bolNum).trim()
  if (isUUID(str)) return 0
  const match = str.match(/NSA[-\s]*(\d+)/i) || str.match(/(\d+)\s*$/)
  if (match && match[1]) {
    const val = parseInt(match[1], 10)
    return isNaN(val) ? 0 : val
  }
  return 0
}

/**
 * Filter out empty drafts or test stubs with no shipper, cargo, weight, or driver info.
 */
export function isMeaningfulBOL(d: any): boolean {
  if (!d) return false
  const s = (d.shipper_name || "").trim().toLowerCase()
  const hasShipper = s !== "" && s !== "no shipper" && s !== "no-shipper" && s !== "none"
  const cleanNum = cleanBolNumber(d.bol_number)
  const hasBol = Boolean(cleanNum && cleanNum.length > 3)

  const q = (d.number_of_packages || "").trim().toLowerCase()
  const hasPkg = q !== "" && q !== "0" && q !== "0-ctns" && q !== "0 ctns"

  const nw = (d.net_weight || "").trim()
  const gw = (d.gross_weight || "").trim()
  const val = (d.goods_value || "").trim()
  const cName = (d.consignee_name || "").trim().toLowerCase()
  const hasConsignee = cName !== "" && cName !== "no consignee"
  const hasDesc = (d.cargo_description || "").replace(/[^\w\s\u0600-\u06FF]/g, "").trim().length > 3
  const hasDriver = Boolean(
    (d.driver_name || "").trim() ||
    (d.driver_rent || "").trim() ||
    (d.driverFreight || "").trim() ||
    (d.truck_number || "").trim()
  )

  return hasShipper || hasBol || hasPkg || nw !== "" || gw !== "" || val !== "" || hasConsignee || hasDesc || hasDriver
}

/**
 * Project a full BOL record down to lightweight summary fields.
 * Strips heavy audit logs, full addresses, internal notes, and large binary blobs.
 */
export function toLightweightBol(b: any): any {
  if (!b) return b
  const bolNum = cleanBolNumber(b.bol_number) || cleanBolNumber(b.id) || ""
  return {
    ...b,
    id: b.id || bolNum,
    bol_number: bolNum,
    billOfLadingNumber: bolNum,
    bolNo: bolNum,
    issue_date: b.issue_date || b.issueDate || b.created_at || "",
    issueDate: b.issue_date || b.issueDate || b.created_at || "",
    shipper_name: b.shipper_name || b.shipperName || "",
    shipperName: b.shipper_name || b.shipperName || "",
    shipper_address: b.shipper_address || b.shipperAddress || "",
    shipperAddress: b.shipper_address || b.shipperAddress || "",
    shipper_contact: b.shipper_contact || b.shipperContact || "",
    shipperContact: b.shipper_contact || b.shipperContact || "",
    shipper_email: b.shipper_email || b.shipperEmail || "",
    shipperEmail: b.shipper_email || b.shipperEmail || "",
    consignee_name: b.consignee_name || b.consigneeName || "",
    consigneeName: b.consignee_name || b.consigneeName || "",
    consignee_address: b.consignee_address || b.consigneeAddress || "",
    consigneeAddress: b.consignee_address || b.consigneeAddress || "",
    consignee_contact: b.consignee_contact || b.consigneeContact || "",
    consigneeContact: b.consignee_contact || b.consigneeContact || "",
    consignee_email: b.consignee_email || b.consigneeEmail || "",
    consigneeEmail: b.consignee_email || b.consigneeEmail || "",
    notify_party: b.notify_party || b.notifyParty || b.notify_party_name || "",
    notify_party_name: b.notify_party_name || b.notify_party || b.notifyParty || "",
    notifyParty: b.notifyParty || b.notify_party || b.notify_party_name || "",
    notify_party_address: b.notify_party_address || b.notifyPartyAddress || b.notifyAddress || "",
    notifyPartyAddress: b.notify_party_address || b.notifyPartyAddress || b.notifyAddress || "",
    truck_number: b.truck_number || b.truckNumber || "",
    truckNumber: b.truck_number || b.truckNumber || "",
    driver_name: b.driver_name || b.driverName || "",
    driverName: b.driver_name || b.driverName || "",
    driver_father_name: b.driver_father_name || b.father_name || b.driverFatherName || "",
    driverFatherName: b.driver_father_name || b.father_name || b.driverFatherName || "",
    driver_contact: b.driver_contact || b.driver_phone || b.driverContact || "",
    driverContact: b.driver_contact || b.driver_phone || b.driverContact || "",
    driver_rent: b.driver_rent || b.driverFreight || b.driverRent || "",
    driverRent: b.driver_rent || b.driverFreight || b.driverRent || "",
    driverFreight: b.driver_rent || b.driverFreight || b.driverRent || "",
    number_of_packages: b.number_of_packages || b.numberOfPackages || (b.carton_count ? String(b.carton_count) : ""),
    numberOfPackages: b.number_of_packages || b.numberOfPackages || (b.carton_count ? String(b.carton_count) : ""),
    net_weight: b.net_weight || b.netWeight || (b.net_weight_kg ? String(b.net_weight_kg) : ""),
    netWeight: b.net_weight || b.netWeight || (b.net_weight_kg ? String(b.net_weight_kg) : ""),
    gross_weight: b.gross_weight || b.grossWeight || (b.gross_weight_kg ? String(b.gross_weight_kg) : ""),
    grossWeight: b.gross_weight || b.grossWeight || (b.gross_weight_kg ? String(b.gross_weight_kg) : ""),
    goods_value: b.goods_value || b.goodsValue || "",
    goodsValue: b.goods_value || b.goodsValue || "",
    rate_per_kgs: b.rate_per_kgs || b.ratePerKgs || "",
    ratePerKgs: b.rate_per_kgs || b.ratePerKgs || "",
    kgs_per_carton: b.kgs_per_carton || b.kgsPerCarton || "",
    kgsPerCarton: b.kgs_per_carton || b.kgsPerCarton || "",
    gross_weight_per_carton: b.gross_weight_per_carton || b.grossWeightPerCarton || "",
    grossWeightPerCarton: b.gross_weight_per_carton || b.grossWeightPerCarton || "",
    cargo_route_note: b.cargo_route_note || b.cargoRouteNote || "",
    cargoRouteNote: b.cargo_route_note || b.cargoRouteNote || "",
    invoice_no: b.invoice_no || b.invoice_number || b.invoiceNo || b.invoiceNumber || "",
    invoice_number: b.invoice_number || b.invoice_no || b.invoiceNo || b.invoiceNumber || "",
    cargo_description: b.cargo_description || b.goods_description || b.description_of_goods || b.cargoDescription || "",
    cargoDescription: b.cargo_description || b.goods_description || b.description_of_goods || b.cargoDescription || "",
    origin_country: b.origin_country || b.origin || "",
    destination_country: b.destination_country || b.destination || "",
    borderCrossing: b.borderCrossing || b.border_station || "",
    route_name: b.route_name || b.route_summary || "",
    routes: b.routes || [],
    container_type: b.container_type || b.containerType || "",
    container_size: b.container_size || b.containerSize || "",
    container_numbers: b.container_numbers || b.containerNumbers || "",
    seal_numbers: b.seal_numbers || b.sealNumbers || "",
    vessel_name: b.vessel_name || b.vesselName || "",
    voyage_number: b.voyage_number || b.voyageNumber || "",
    port_of_loading: b.port_of_loading || b.portOfLoading || "",
    port_of_discharge: b.port_of_discharge || b.portOfDischarge || "",
    place_of_delivery: b.place_of_delivery || b.placeOfDelivery || "",
    afghanistan_documents: b.afghanistan_documents || [],
    afghanistan_document_details: b.afghanistan_document_details || {},
    freight_payable_at: b.freight_payable_at || b.freightPayableAt || "",
    freight_terms: b.freight_terms || b.freightTerms || "",
    remarks: b.remarks || "",
    notes_1: b.notes_1 !== undefined && b.notes_1 !== null ? b.notes_1 : (b.notes1 ?? ""),
    notes_1_label: b.notes_1_label || b.notes1Label || "",
    notes_1_theme: b.notes_1_theme || b.notes1Theme || "red",
    notes_2: b.notes_2 !== undefined && b.notes_2 !== null ? b.notes_2 : (b.notes2 ?? ""),
    notes_2_label: b.notes_2_label || b.notes2Label || "",
    notes_2_theme: b.notes_2_theme || b.notes2Theme || "red",
    status: b.status || (b.isArchived ? "archived" : "active"),
    isArchived: Boolean(b.isArchived || b.status === "archived"),
    archived_at: b.archived_at || b.archivedAt || null,
    archived_by: b.archived_by || b.archivedBy || null,
    pdf_status: b.pdf_status || (b.pdf_url ? "ready" : "none"),
    pdf_url: b.pdf_url || null,
    pdf_uploaded_at: b.pdf_uploaded_at || null,
    created_at: b.created_at || b.createdAt || "",
    updated_at: b.updated_at || b.updatedAt || b.created_at || "",
  }
}

/**
 * Builds an indexed map of authoritative local BOLs for ultra-fast enrichment.
 */
export function buildLocalBolMap(localBols: any[]): Map<string, any> {
  const map = new Map<string, any>()
  if (!Array.isArray(localBols)) return map

  for (const b of localBols) {
    if (!b) continue
    const rawNum = b.bol_number ? String(b.bol_number).trim() : ""
    const num = !isUUID(rawNum) ? rawNum.toUpperCase() : ""
    const id = b.id ? String(b.id).trim().toUpperCase() : ""
    if (num) {
      map.set(num, b)
      const pureDigits = num.match(/\d+$/)
      if (pureDigits) {
        map.set(`num:${pureDigits[0]}`, b)
      }
      map.set(num.replace(/[^A-Z0-9]/g, ""), b)
    }
    if (id) {
      map.set(id, b)
    }
  }
  return map
}

/**
 * Enriches a single BOL item with authoritative local fields (issue_date, truck_number, driver_rent, routes, etc.)
 */
function parseUtcTimestamp(str?: any): number {
  if (!str || typeof str !== "string") return 0
  const trimmed = str.trim()
  if (!trimmed) return 0
  const normalized = trimmed.endsWith("Z") || trimmed.includes("+") || (trimmed.includes("-") && trimmed.lastIndexOf("-") > 10)
    ? trimmed
    : `${trimmed}Z`
  const t = new Date(normalized).getTime()
  return isNaN(t) ? 0 : t
}

export function enrichBolWithLocal(item: any, localMap: Map<string, any>): any {
  if (!item) return item
  const num = item.bol_number ? String(item.bol_number).trim().toUpperCase() : ""
  const id = item.id ? String(item.id).trim().toUpperCase() : ""
  const pureDigits = num.match(/\d+$/)
  const numKey = pureDigits ? `num:${pureDigits[0]}` : ""
  const normalizedKey = num.replace(/[^A-Z0-9]/g, "")

  const local = localMap.get(num) || localMap.get(id) || (numKey ? localMap.get(numKey) : null) || (normalizedKey ? localMap.get(normalizedKey) : null)
  if (!local) return item

  // Authoritative date fallback: if item date is missing or empty
  const issueDate = (item.issue_date && String(item.issue_date).trim() !== "" && String(item.issue_date) !== "null")
    ? item.issue_date
    : (local.issue_date || local.issueDate || local.created_at || item.created_at || "")

  // Authoritative truck number
  const truckNumber = (item.truck_number && String(item.truck_number).trim() !== "" && String(item.truck_number) !== "null")
    ? item.truck_number
    : (local.truck_number || local.truckNumber || "")

  // Authoritative driver rent
  const itemRent = item.driver_rent ? String(item.driver_rent).trim() : ""
  const isItemRentZero = !itemRent || itemRent === "0" || itemRent === "0.00" || itemRent === "0.0000" || itemRent === "null"
  const driverRent = (!isItemRentZero)
    ? item.driver_rent
    : (local.driver_rent || local.driverFreight || local.driverRent || "")

  // Authoritative weights (if item net/gross weight is truncated to "23.0000" or similar)
  let netWeight = item.net_weight || (item.net_weight_kg ? String(item.net_weight_kg) : "")
  if (local.net_weight || local.netWeight) {
    const localNet = String(local.net_weight || local.netWeight)
    // If local has comma or unit or full number, prefer it only if plausible (<= 60,000 kg)
    if (parseWeight(localNet) <= 60000 && (localNet.includes(",") || localNet.includes("KG") || localNet.length > String(netWeight).length)) {
      netWeight = localNet
    }
  }

  let grossWeight = item.gross_weight || (item.gross_weight_kg ? String(item.gross_weight_kg) : "")
  if (local.gross_weight || local.grossWeight) {
    const localGross = String(local.gross_weight || local.grossWeight)
    if (parseWeight(localGross) <= 60000 && (localGross.includes(",") || localGross.includes("KG") || localGross.length > String(grossWeight).length)) {
      grossWeight = localGross
    }
  }

  // Packages
  const packages = (local.number_of_packages || local.numberOfPackages) 
    ? (local.number_of_packages || local.numberOfPackages)
    : (item.number_of_packages || (item.carton_count ? String(item.carton_count) : ""))

  // Routes
  const routes = (item.routes && Array.isArray(item.routes) && item.routes.length > 0)
    ? item.routes
    : (local.routes || [])

  // Cargo Description
  const cargoDesc = (item.cargo_description && String(item.cargo_description).trim() !== "" && String(item.cargo_description) !== "null")
    ? item.cargo_description
    : (local.cargo_description || local.goods_description || local.description_of_goods || local.cargoDescription || "")

  const localTime = parseUtcTimestamp(local.updated_at || local.created_at)
  const itemTime = parseUtcTimestamp(item.updated_at || item.created_at)
  const useLocalAsAuthoritative = localTime >= itemTime || !item.consignee_name

  const localConsignee = (local.consignee_name || local.consigneeName || "").trim()
  const itemConsignee = (item.consignee_name || item.consigneeName || "").trim()
  const consigneeName = (useLocalAsAuthoritative && localConsignee) ? localConsignee : (itemConsignee || localConsignee)

  const localShipper = (local.shipper_name || local.shipperName || "").trim()
  const itemShipper = (item.shipper_name || item.shipperName || "").trim()
  const shipperName = (useLocalAsAuthoritative && localShipper) ? localShipper : (itemShipper || localShipper)

  return {
    ...item,
    issue_date: issueDate,
    truck_number: truckNumber,
    driver_name: (useLocalAsAuthoritative && (local.driver_name || local.driverName)) || item.driver_name || local.driver_name || local.driverName || "",
    driver_father_name: item.driver_father_name || item.father_name || local.driver_father_name || local.father_name || "",
    driver_contact: item.driver_contact || item.driver_phone || local.driver_contact || local.driverContact || "",
    driver_phone: item.driver_phone || item.driver_contact || local.driver_phone || local.driver_contact || "",
    driver_rent: driverRent,
    net_weight: netWeight,
    gross_weight: grossWeight,
    number_of_packages: packages,
    goods_value: (useLocalAsAuthoritative && (local.goods_value || local.goodsValue)) || item.goods_value || local.goods_value || local.goodsValue || "",
    cargo_description: cargoDesc,
    routes: routes,
    shipper_name: shipperName,
    consignee_name: consigneeName,
    shipper_address: local.shipper_address || local.shipperAddress || item.shipper_address || "",
    shipperAddress: local.shipper_address || local.shipperAddress || item.shipper_address || "",
    shipper_contact: local.shipper_contact || local.shipperContact || item.shipper_contact || "",
    shipperContact: local.shipper_contact || local.shipperContact || item.shipper_contact || "",
    shipper_email: local.shipper_email || local.shipperEmail || item.shipper_email || "",
    shipperEmail: local.shipper_email || local.shipperEmail || item.shipper_email || "",
    consignee_address: local.consignee_address || local.consigneeAddress || item.consignee_address || "",
    consigneeAddress: local.consignee_address || local.consigneeAddress || item.consignee_address || "",
    consignee_contact: local.consignee_contact || local.consigneeContact || item.consignee_contact || "",
    consigneeContact: local.consignee_contact || local.consigneeContact || item.consignee_contact || "",
    consignee_email: local.consignee_email || local.consigneeEmail || item.consignee_email || "",
    consigneeEmail: local.consignee_email || local.consigneeEmail || item.consignee_email || "",
    cargo_route_note: local.cargo_route_note || local.cargoRouteNote || item.cargo_route_note || item.cargoRouteNote || "",
    cargoRouteNote: local.cargo_route_note || local.cargoRouteNote || item.cargo_route_note || item.cargoRouteNote || "",
    kgs_per_carton: local.kgs_per_carton || local.kgsPerCarton || item.kgs_per_carton || item.kgsPerCarton || "",
    kgsPerCarton: local.kgs_per_carton || local.kgsPerCarton || item.kgs_per_carton || item.kgsPerCarton || "",
    gross_weight_per_carton: local.gross_weight_per_carton || local.grossWeightPerCarton || item.gross_weight_per_carton || item.grossWeightPerCarton || "",
    grossWeightPerCarton: local.gross_weight_per_carton || local.grossWeightPerCarton || item.gross_weight_per_carton || item.grossWeightPerCarton || "",
    rate_per_kgs: local.rate_per_kgs || local.ratePerKgs || item.rate_per_kgs || item.ratePerKgs || "",
    ratePerKgs: local.rate_per_kgs || local.ratePerKgs || item.rate_per_kgs || item.ratePerKgs || "",
    notify_party: (useLocalAsAuthoritative && (local.notify_party || local.notifyParty || local.notify_party_name)) || item.notify_party || item.notifyParty || item.notify_party_name || local.notify_party || local.notifyParty || local.notify_party_name || "",
    notify_party_name: (useLocalAsAuthoritative && (local.notify_party_name || local.notify_party || local.notifyParty)) || item.notify_party_name || item.notify_party || item.notifyParty || local.notify_party_name || local.notify_party || local.notifyParty || "",
    notifyParty: (useLocalAsAuthoritative && (local.notifyParty || local.notify_party || local.notify_party_name)) || item.notifyParty || item.notify_party || item.notify_party_name || local.notifyParty || local.notify_party || local.notify_party_name || "",
    notify_party_address: local.notify_party_address || local.notifyPartyAddress || local.notifyAddress || item.notify_party_address || item.notifyPartyAddress || item.notifyAddress || "",
    notes_1: local.notes_1 !== undefined && local.notes_1 !== null && local.notes_1 !== "" ? local.notes_1 : (item.notes_1 || ""),
    notes_1_label: local.notes_1_label || item.notes_1_label || "",
    notes_1_theme: local.notes_1_theme || item.notes_1_theme || "red",
    notes_2: local.notes_2 !== undefined && local.notes_2 !== null && local.notes_2 !== "" ? local.notes_2 : (item.notes_2 || ""),
    notes_2_label: local.notes_2_label || item.notes_2_label || "",
    notes_2_theme: local.notes_2_theme || item.notes_2_theme || "red",
    container_type: local.container_type || item.container_type || "",
    container_size: local.container_size || item.container_size || "",
    container_numbers: local.container_numbers || item.container_numbers || "",
    seal_numbers: local.seal_numbers || item.seal_numbers || "",
  }
}

/**
 * Enriches a list of items using the local BOL array.
 */
export function enrichBolListWithLocal(items: any[], localBols: any[]): any[] {
  if (!Array.isArray(items) || items.length === 0) return items
  const localMap = buildLocalBolMap(localBols)
  return items.map((item) => enrichBolWithLocal(item, localMap))
}

import { parsePackages, parseWeight, parseMoney, parsePackageUnit, formatPackageBreakdown } from "@/lib/reports/parsers"

/**
 * Compute aggregate KPIs across valid BOLs.
 */
export function computeBolSummary(bols: any[]) {
  const valid = (bols || []).filter(isMeaningfulBOL)
  let totalPkgs = 0
  let totalWeightKg = 0
  let totalGoodsValueUsd = 0
  const packageUnitsBreakdown: Record<string, number> = {}

  for (const doc of valid) {
    const pkgs = parsePackages(doc.number_of_packages || doc.carton_count)
    totalPkgs += pkgs
    if (pkgs > 0) {
      const unit = parsePackageUnit(doc.number_of_packages || doc.carton_count)
      packageUnitsBreakdown[unit] = (packageUnitsBreakdown[unit] || 0) + pkgs
    }

    const gross = parseWeight(doc.gross_weight || doc.gross_weight_kg)
    const net = parseWeight(doc.net_weight || doc.net_weight_kg)
    totalWeightKg += gross > 0 ? gross : net

    const val = parseMoney(doc.goods_value || doc.freight_fee).amount
    totalGoodsValueUsd += val
  }

  const roundedPkgs = Math.round(totalPkgs)
  const packagesDisplay = formatPackageBreakdown(packageUnitsBreakdown, roundedPkgs)

  return {
    total_bols: valid.length,
    total_packages: roundedPkgs,
    package_units_breakdown: packageUnitsBreakdown,
    packages_display: packagesDisplay,
    total_weight: Math.round(totalWeightKg),
    total_goods_value: Math.round(totalGoodsValueUsd * 100) / 100,
  }
}

/**
 * Canonical BOL record normalizer.
 * Standardizes aliases (snake_case vs camelCase vs legacy IDs)
 * while preserving all original document fields and metadata.
 */
export function normalizeBolRecord(doc: any, fallbackId = ""): any {
  if (!doc || typeof doc !== "object") return doc

  const rawBol =
    doc.bol_number ||
    doc.billOfLadingNumber ||
    doc.bolNo ||
    doc.id ||
    fallbackId ||
    ""
  const cleanNum = cleanBolNumber(rawBol) || rawBol

  // Preserve all fields, standardizing both snake_case and camelCase accessors
  return {
    ...doc,
    id: doc.id || cleanNum,
    bol_number: cleanNum,
    billOfLadingNumber: cleanNum,
    bolNo: cleanNum,
    issue_date: doc.issue_date || doc.issueDate || "",
    issueDate: doc.issue_date || doc.issueDate || "",
    truck_number: doc.truck_number ?? doc.truckNumber ?? "",
    truckNumber: doc.truck_number ?? doc.truckNumber ?? "",
    driver_name: doc.driver_name ?? doc.driverName ?? "",
    driverName: doc.driver_name ?? doc.driverName ?? "",
    driver_father_name: doc.driver_father_name ?? doc.driverFatherName ?? "",
    driverFatherName: doc.driver_father_name ?? doc.driverFatherName ?? "",
    driver_contact: doc.driver_contact ?? doc.driverContact ?? doc.driver_phone ?? "",
    driverContact: doc.driver_contact ?? doc.driverContact ?? doc.driver_phone ?? "",
    driver_rent: doc.driver_rent ?? doc.driverRent ?? doc.driverFreight ?? "",
    driverRent: doc.driver_rent ?? doc.driverRent ?? doc.driverFreight ?? "",
    driverFreight: doc.driver_rent ?? doc.driverRent ?? doc.driverFreight ?? "",
    routes: (Array.isArray(doc.routes) && doc.routes.length > 0) ? doc.routes : doc.routes,
    container_type: doc.container_type ?? doc.containerType ?? "",
    containerType: doc.container_type ?? doc.containerType ?? "",
    container_size: doc.container_size ?? doc.containerSize ?? "",
    containerSize: doc.container_size ?? doc.containerSize ?? "",
    container_numbers: doc.container_numbers ?? doc.containerNumbers ?? "",
    containerNumbers: doc.container_numbers ?? doc.containerNumbers ?? "",
    seal_numbers: doc.seal_numbers ?? doc.sealNumbers ?? "",
    sealNumbers: doc.seal_numbers ?? doc.sealNumbers ?? "",
    shipper_name: doc.shipper_name ?? doc.shipperName ?? "",
    shipperName: doc.shipper_name ?? doc.shipperName ?? "",
    shipper_address: doc.shipper_address ?? doc.shipperAddress ?? "",
    shipperAddress: doc.shipper_address ?? doc.shipperAddress ?? "",
    shipper_contact: doc.shipper_contact ?? doc.shipperContact ?? "",
    shipperContact: doc.shipper_contact ?? doc.shipperContact ?? "",
    shipper_email: doc.shipper_email ?? doc.shipperEmail ?? "",
    shipperEmail: doc.shipper_email ?? doc.shipperEmail ?? "",
    consignee_name: doc.consignee_name ?? doc.consigneeName ?? "",
    consigneeName: doc.consignee_name ?? doc.consigneeName ?? "",
    consignee_address: doc.consignee_address ?? doc.consigneeAddress ?? "",
    consigneeAddress: doc.consignee_address ?? doc.consigneeAddress ?? "",
    consignee_contact: doc.consignee_contact ?? doc.consigneeContact ?? "",
    consigneeContact: doc.consignee_contact ?? doc.consigneeContact ?? "",
    consignee_email: doc.consignee_email ?? doc.consigneeEmail ?? "",
    consigneeEmail: doc.consignee_email ?? doc.consigneeEmail ?? "",
    notify_party: doc.notify_party ?? doc.notifyParty ?? doc.notify_party_name ?? "",
    notifyParty: doc.notify_party ?? doc.notifyParty ?? doc.notify_party_name ?? "",
    notify_party_name: doc.notify_party_name ?? doc.notify_party ?? doc.notifyParty ?? "",
    notify_party_address: doc.notify_party_address ?? doc.notifyPartyAddress ?? doc.notifyAddress ?? "",
    notifyPartyAddress: doc.notify_party_address ?? doc.notifyPartyAddress ?? doc.notifyAddress ?? "",
    vessel_name: doc.vessel_name ?? doc.vesselName ?? "",
    vesselName: doc.vessel_name ?? doc.vesselName ?? "",
    voyage_number: doc.voyage_number ?? doc.voyageNumber ?? "",
    voyageNumber: doc.voyage_number ?? doc.voyageNumber ?? "",
    port_of_loading: doc.port_of_loading ?? doc.portOfLoading ?? "",
    portOfLoading: doc.port_of_loading ?? doc.portOfLoading ?? "",
    port_of_discharge: doc.port_of_discharge ?? doc.portOfDischarge ?? "",
    portOfDischarge: doc.port_of_discharge ?? doc.portOfDischarge ?? "",
    place_of_delivery: doc.place_of_delivery ?? doc.placeOfDelivery ?? "",
    placeOfDelivery: doc.place_of_delivery ?? doc.placeOfDelivery ?? "",
    cargo_description: doc.cargo_description ?? doc.cargoDescription ?? doc.description_of_goods ?? doc.goods_description ?? "",
    cargoDescription: doc.cargo_description ?? doc.cargoDescription ?? doc.description_of_goods ?? doc.goods_description ?? "",
    cargo_route_note: doc.cargo_route_note ?? doc.cargoRouteNote ?? "",
    cargoRouteNote: doc.cargo_route_note ?? doc.cargoRouteNote ?? "",
    net_weight: doc.net_weight ?? doc.netWeight ?? "",
    netWeight: doc.net_weight ?? doc.netWeight ?? "",
    gross_weight: doc.gross_weight ?? doc.grossWeight ?? "",
    grossWeight: doc.gross_weight ?? doc.grossWeight ?? "",
    measurement: doc.measurement ?? "",
    number_of_packages: doc.number_of_packages ?? doc.numberOfPackages ?? doc.packages_count ?? "",
    numberOfPackages: doc.number_of_packages ?? doc.numberOfPackages ?? doc.packages_count ?? "",
    kgs_per_carton: doc.kgs_per_carton ?? doc.kgsPerCarton ?? "",
    kgsPerCarton: doc.kgs_per_carton ?? doc.kgsPerCarton ?? "",
    gross_weight_per_carton: doc.gross_weight_per_carton ?? doc.grossWeightPerCarton ?? "",
    grossWeightPerCarton: doc.gross_weight_per_carton ?? doc.grossWeightPerCarton ?? "",
    rate_per_kgs: doc.rate_per_kgs ?? doc.ratePerKgs ?? "",
    ratePerKgs: doc.rate_per_kgs ?? doc.ratePerKgs ?? "",
    goods_value: doc.goods_value ?? doc.goodsValue ?? "",
    goodsValue: doc.goods_value ?? doc.goodsValue ?? "",
    freight_payable_at: doc.freight_payable_at ?? doc.freightPayableAt ?? "",
    freightPayableAt: doc.freight_payable_at ?? doc.freightPayableAt ?? "",
    freight_terms: doc.freight_terms ?? doc.freightTerms ?? "",
    freightTerms: doc.freight_terms ?? doc.freightTerms ?? "",
    remarks: doc.remarks ?? "",
    notes_1: doc.notes_1 !== undefined && doc.notes_1 !== null ? doc.notes_1 : (doc.notes1 !== undefined && doc.notes1 !== null ? doc.notes1 : ""),
    notes_1_label: doc.notes_1_label ?? doc.notes1Label ?? "",
    notes_1_theme: doc.notes_1_theme ?? doc.notes1Theme ?? "red",
    notes_2: doc.notes_2 !== undefined && doc.notes_2 !== null ? doc.notes_2 : (doc.notes2 !== undefined && doc.notes2 !== null ? doc.notes2 : ""),
    notes_2_label: doc.notes_2_label ?? doc.notes2Label ?? "",
    notes_2_theme: doc.notes_2_theme ?? doc.notes2Theme ?? "red",
    afghanistan_documents: doc.afghanistan_documents || [],
    afghanistan_document_details: doc.afghanistan_document_details || {},
  }
}

/**
 * Canonical BOL summary builder.
 * Extracts clean summary values for cards, list items, and reporting aggregates.
 */
export function buildBolSummary(rawDoc: any): {
  id: string
  bol_number: string
  issue_date: string
  shipper_name: string
  consignee_name: string
  truck_number: string
  driver_name: string
  driver_rent: string
  packages: string
  commodity: string
  item_count: number
  net_weight: string
  gross_weight: string
  goods_value: string
  pdf_status: "ready" | "outdated" | "none"
  updated_at: string
} {
  const doc = normalizeBolRecord(rawDoc)
  const bolNum = cleanBolNumber(doc.bol_number) || cleanBolNumber(doc.id) || ""
  const pkgStr = (doc.number_of_packages || "").trim()
  const rawDesc = (doc.cargo_description || "").trim()

  let packages = pkgStr || "—"
  let commodity = "GENERAL CARGO"
  let itemCount = 1

  if (pkgStr.includes("-")) {
    const parts = pkgStr.split(/\s*[-–—]\s*/).map((p: string) => p.trim()).filter(Boolean)
    let totalPkgs = 0
    const commodities: string[] = []
    for (const p of parts) {
      const numMatch = p.match(/^([0-9,]+)/)
      if (numMatch) {
        totalPkgs += parseInt(numMatch[1].replace(/,/g, ""), 10) || 0
      }
      const comm = p.replace(/^\s*\d+[\d,.]*\s*(?:CTNS?|CARTONS?|CNTS?|BAGS?|PKGS?|BOXES|PCS|UNITS)?\s*/i, "").trim()
      if (comm && !commodities.includes(comm)) commodities.push(comm)
    }
    packages = totalPkgs > 0 ? `${totalPkgs.toLocaleString()} CTNS` : pkgStr
    commodity = commodities.join(" / ") || "CARGO"
    itemCount = parts.length
  } else if (pkgStr) {
    const numMatch = pkgStr.match(/^([0-9,]+)/)
    if (numMatch) {
      const num = parseInt(numMatch[1].replace(/,/g, ""), 10)
      if (!isNaN(num) && num > 0) {
        const unitMatch = pkgStr.match(/\b(CTNS?|CARTONS?|CNTS?|BAGS?|PKGS?|BOXES|PCS|UNITS)\b/i)
        const unit = unitMatch ? unitMatch[1].toUpperCase() : "CTNS"
        packages = `${num.toLocaleString()} ${unit}`
      }
    }
    const comm = pkgStr.replace(/^\s*\d+[\d,.]*\s*(?:CTNS?|CARTONS?|CNTS?|BAGS?|PKGS?|BOXES|PCS|UNITS)?\s*/i, "").trim()
    commodity = comm || rawDesc.slice(0, 30) || "GENERAL CARGO"
  } else if (rawDesc) {
    commodity = rawDesc.slice(0, 30)
  }

  const pdfStatus: "ready" | "outdated" | "none" =
    doc.pdf_status === "outdated" || doc.pdf_outdated
      ? "outdated"
      : doc.pdf_url
      ? "ready"
      : "none"

  return {
    id: doc.id || bolNum,
    bol_number: bolNum,
    issue_date: doc.issue_date || "",
    shipper_name: doc.shipper_name || "",
    consignee_name: doc.consignee_name || "",
    truck_number: doc.truck_number || "",
    driver_name: doc.driver_name || "",
    driver_rent: doc.driver_rent || "",
    packages,
    commodity: commodity.toUpperCase(),
    item_count: itemCount,
    net_weight: doc.net_weight || "",
    gross_weight: doc.gross_weight || "",
    goods_value: doc.goods_value || "",
    pdf_status: pdfStatus,
    updated_at: doc.updated_at || doc.created_at || "",
  }
}

