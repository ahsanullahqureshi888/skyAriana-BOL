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
    id: b.id || bolNum,
    bol_number: bolNum,
    issue_date: b.issue_date || b.issueDate || b.created_at || "",
    shipper_name: b.shipper_name || b.shipperName || "",
    consignee_name: b.consignee_name || b.consigneeName || "",
    truck_number: b.truck_number || b.truckNumber || "",
    driver_name: b.driver_name || b.driverName || "",
    driver_father_name: b.driver_father_name || b.father_name || b.driverFatherName || "",
    driver_contact: b.driver_contact || b.driver_phone || b.driverContact || "",
    driver_rent: b.driver_rent || b.driverFreight || b.driverRent || "",
    number_of_packages: b.number_of_packages || b.numberOfPackages || (b.carton_count ? String(b.carton_count) : ""),
    net_weight: b.net_weight || b.netWeight || (b.net_weight_kg ? String(b.net_weight_kg) : ""),
    gross_weight: b.gross_weight || b.grossWeight || (b.gross_weight_kg ? String(b.gross_weight_kg) : ""),
    goods_value: b.goods_value || b.goodsValue || "",
    rate_per_kgs: b.rate_per_kgs || b.ratePerKgs || "",
    invoice_no: b.invoice_no || b.invoice_number || b.invoiceNo || b.invoiceNumber || "",
    invoice_number: b.invoice_number || b.invoice_no || b.invoiceNo || b.invoiceNumber || "",
    cargo_description: b.cargo_description || b.goods_description || b.description_of_goods || b.cargoDescription || "",
    origin_country: b.origin_country || b.origin || "",
    destination_country: b.destination_country || b.destination || "",
    borderCrossing: b.borderCrossing || b.border_station || "",
    route_name: b.route_name || b.route_summary || "",
    routes: b.routes || [],
    status: b.status || "active",
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

  return {
    ...item,
    issue_date: issueDate,
    truck_number: truckNumber,
    driver_name: item.driver_name || local.driver_name || local.driverName || "",
    driver_father_name: item.driver_father_name || item.father_name || local.driver_father_name || local.father_name || "",
    driver_contact: item.driver_contact || item.driver_phone || local.driver_contact || local.driverContact || "",
    driver_phone: item.driver_phone || item.driver_contact || local.driver_phone || local.driver_contact || "",
    driver_rent: driverRent,
    net_weight: netWeight,
    gross_weight: grossWeight,
    number_of_packages: packages,
    goods_value: item.goods_value || local.goods_value || local.goodsValue || "",
    cargo_description: cargoDesc,
    routes: routes,
    shipper_name: item.shipper_name || local.shipper_name || local.shipperName || "",
    consignee_name: item.consignee_name || local.consignee_name || local.consigneeName || "",
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
