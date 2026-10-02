/**
 * Sky Ariana Logistics — Report Center Grouping & Analytics Engine
 */

import {
  SavedDocument,
  ShipperSummary,
  ConsigneeSummary,
  CommoditySummary,
  DestinationSummary,
  RouteSummary,
  TruckSummary,
  ContainerRecord,
  ContainerSummaryStats,
  MonthlySummary,
  FinancialBreakdown,
} from "./types"
import {
  parseWeight,
  parsePackages,
  parseMoney,
  normalizeDate,
  formatDisplayDate,
  extractCleanCommodity,
  extractBolRoute,
  extractTruckNo,
} from "./parsers"
import { parseSyncedCargoItems } from "@/lib/utils/cargo-grid"
import type { BillOfLadingFormData } from "@/lib/types/bill-of-lading"

/**
 * Groups BOL records by Shipper.
 */
export function groupShippers(docs: SavedDocument[]): ShipperSummary[] {
  const map = new Map<
    string,
    {
      shipperName: string
      bolCount: number
      packages: number
      netWeightKg: number
      grossWeightKg: number
      goodsValueByCurrency: Record<string, number>
      containers: Set<string>
      destinations: Map<string, number>
      consignees: Map<string, number>
      commodities: Map<string, number>
      lastDateMs: number
      lastDateStr: string
    }
  >()

  for (const doc of docs) {
    const name = (doc.shipper_name || "").trim() || "Unspecified Shipper"
    const key = name.toLowerCase()

    if (!map.has(key)) {
      map.set(key, {
        shipperName: name,
        bolCount: 0,
        packages: 0,
        netWeightKg: 0,
        grossWeightKg: 0,
        goodsValueByCurrency: {},
        containers: new Set(),
        destinations: new Map(),
        consignees: new Map(),
        commodities: new Map(),
        lastDateMs: 0,
        lastDateStr: "-",
      })
    }

    const entry = map.get(key)!
    entry.bolCount++
    entry.packages += parsePackages(doc.number_of_packages)
    const net = parseWeight(doc.net_weight)
    entry.netWeightKg += net
    const gross = parseWeight(doc.gross_weight)
    entry.grossWeightKg += gross > 0 ? gross : net

    const { amount, currency } = parseMoney(doc.goods_value)
    if (amount > 0) {
      entry.goodsValueByCurrency[currency] = (entry.goodsValueByCurrency[currency] || 0) + amount
    }

    if (doc.container_numbers) {
      const cList = doc.container_numbers.split(/[\n,;/]+/).map((c) => c.trim()).filter(Boolean)
      cList.forEach((c) => entry.containers.add(c.toUpperCase()))
    }

    const routeInfo = extractBolRoute(doc)
    const dest = (doc.port_of_discharge || doc.place_of_delivery || doc.destination_country || (routeInfo.destination !== "—" ? routeInfo.destination : "")).trim()
    if (dest) {
      entry.destinations.set(dest, (entry.destinations.get(dest) || 0) + 1)
    }

    if (doc.consignee_name) {
      const c = doc.consignee_name.trim()
      if (c) entry.consignees.set(c, (entry.consignees.get(c) || 0) + 1)
    }

    const comm = extractCleanCommodity(doc.cargo_description || doc.goods_description || doc.commodity)
    if (comm && comm !== "General Cargo") {
      entry.commodities.set(comm, (entry.commodities.get(comm) || 0) + 1)
    }

    const d = normalizeDate(doc.issue_date || doc.created_at)
    if (d && d.getTime() > entry.lastDateMs) {
      entry.lastDateMs = d.getTime()
      entry.lastDateStr = formatDisplayDate(d)
    }
  }

  return Array.from(map.values())
    .map((e) => {
      let topDest = "-"
      let maxCount = 0
      for (const [dest, count] of e.destinations.entries()) {
        if (count > maxCount) {
          maxCount = count
          topDest = dest
        }
      }

      let topConsignee = "-"
      let maxConsigneeCount = 0
      for (const [consignee, count] of e.consignees.entries()) {
        if (count > maxConsigneeCount) {
          maxConsigneeCount = count
          topConsignee = consignee
        }
      }

      const sortedCommodities = Array.from(e.commodities.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name)
      const topCommodity = sortedCommodities[0] || "-"

      return {
        shipperName: e.shipperName,
        bolCount: e.bolCount,
        packages: e.packages,
        netWeightKg: Math.round(e.netWeightKg * 100) / 100,
        grossWeightKg: Math.round(e.grossWeightKg * 100) / 100,
        goodsValueByCurrency: e.goodsValueByCurrency,
        containerCount: e.containers.size,
        topDestination: topDest,
        lastShipmentDate: e.lastDateStr,
        commodities: sortedCommodities,
        topCommodity,
        topConsignee,
      }
    })
    .sort((a, b) => b.bolCount - a.bolCount || b.netWeightKg - a.netWeightKg)
}

/**
 * Groups BOL records by Consignee.
 */
export function groupConsignees(docs: SavedDocument[]): ConsigneeSummary[] {
  const map = new Map<
    string,
    {
      consigneeName: string
      bolCount: number
      shippers: Map<string, number>
      commodities: Map<string, number>
      packages: number
      netWeightKg: number
      grossWeightKg: number
      goodsValueByCurrency: Record<string, number>
      containers: Set<string>
      destinations: Map<string, number>
      lastDateMs: number
      lastDateStr: string
    }
  >()

  for (const doc of docs) {
    const name = (doc.consignee_name || "").trim() || "Unspecified Consignee"
    const key = name.toLowerCase()

    if (!map.has(key)) {
      map.set(key, {
        consigneeName: name,
        bolCount: 0,
        shippers: new Map(),
        commodities: new Map(),
        packages: 0,
        netWeightKg: 0,
        grossWeightKg: 0,
        goodsValueByCurrency: {},
        containers: new Set(),
        destinations: new Map(),
        lastDateMs: 0,
        lastDateStr: "-",
      })
    }

    const entry = map.get(key)!
    entry.bolCount++
    if (doc.shipper_name && doc.shipper_name.trim()) {
      const s = doc.shipper_name.trim()
      entry.shippers.set(s, (entry.shippers.get(s) || 0) + 1)
    }

    const comm = extractCleanCommodity(doc.cargo_description || doc.goods_description || doc.commodity)
    if (comm && comm !== "General Cargo") {
      entry.commodities.set(comm, (entry.commodities.get(comm) || 0) + 1)
    }

    entry.packages += parsePackages(doc.number_of_packages)
    const net = parseWeight(doc.net_weight)
    entry.netWeightKg += net
    const gross = parseWeight(doc.gross_weight)
    entry.grossWeightKg += gross > 0 ? gross : net

    const { amount, currency } = parseMoney(doc.goods_value)
    if (amount > 0) {
      entry.goodsValueByCurrency[currency] = (entry.goodsValueByCurrency[currency] || 0) + amount
    }

    if (doc.container_numbers) {
      const cList = doc.container_numbers.split(/[\n,;/]+/).map((c) => c.trim()).filter(Boolean)
      cList.forEach((c) => entry.containers.add(c.toUpperCase()))
    }

    const routeInfo = extractBolRoute(doc)
    const dest = (doc.port_of_discharge || doc.place_of_delivery || doc.destination_country || (routeInfo.destination !== "—" ? routeInfo.destination : "")).trim()
    if (dest) {
      entry.destinations.set(dest, (entry.destinations.get(dest) || 0) + 1)
    }

    const d = normalizeDate(doc.issue_date || doc.created_at)
    if (d && d.getTime() > entry.lastDateMs) {
      entry.lastDateMs = d.getTime()
      entry.lastDateStr = formatDisplayDate(d)
    }
  }

  return Array.from(map.values())
    .map((e) => {
      let topDest = "-"
      let maxCount = 0
      for (const [dest, count] of e.destinations.entries()) {
        if (count > maxCount) {
          maxCount = count
          topDest = dest
        }
      }

      let topShipper = "-"
      let maxShipperCount = 0
      for (const [shipper, count] of e.shippers.entries()) {
        if (count > maxShipperCount) {
          maxShipperCount = count
          topShipper = shipper
        }
      }

      const sortedCommodities = Array.from(e.commodities.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name)
      const topCommodity = sortedCommodities[0] || "-"

      return {
        consigneeName: e.consigneeName,
        bolCount: e.bolCount,
        shipperCount: e.shippers.size,
        packages: e.packages,
        netWeightKg: Math.round(e.netWeightKg * 100) / 100,
        grossWeightKg: Math.round(e.grossWeightKg * 100) / 100,
        goodsValueByCurrency: e.goodsValueByCurrency,
        containerCount: e.containers.size,
        topDestination: topDest,
        lastShipmentDate: e.lastDateStr,
        topShipper,
        topCommodity,
        commodities: sortedCommodities,
      }
    })
    .sort((a, b) => b.bolCount - a.bolCount || b.netWeightKg - a.netWeightKg)
}

/**
 * Groups BOL records by Commodity.
 * Multi-cargo aware: when a BOL contains multiple cargo items, weights and values
 * are attributed accurately line-by-line using parseSyncedCargoItems instead of
 * duplicating entire BOL weights across all items.
 */
export function groupCommodities(docs: SavedDocument[]): CommoditySummary[] {
  const map = new Map<
    string,
    {
      commodityName: string
      bolSet: Set<string>
      cargoRowCount: number
      packages: number
      packageUnits: Map<string, number>
      netWeightKg: number
      grossWeightKg: number
      goodsValueByCurrency: Record<string, number>
      destinations: Set<string>
      shippers: Map<string, number>
      consignees: Map<string, number>
      rates: string[]
    }
  >()

  for (const doc of docs) {
    const docId = doc.id || doc.bol_number || Math.random().toString()
    const routeInfo = extractBolRoute(doc)
    const dest = (
      doc.port_of_discharge ||
      doc.place_of_delivery ||
      doc.destination_country ||
      (routeInfo.destination !== "—" ? routeInfo.destination : "")
    ).trim()
    const shipper = (doc.shipper_name || "").trim()
    const consignee = (doc.consignee_name || "").trim()

    const synced = parseSyncedCargoItems(doc as unknown as Partial<BillOfLadingFormData>)
    const rawDesc = doc.cargo_description || doc.goods_description || doc.description_of_goods || ""

    // Extract commodity names from cargo lines if multi-cargo
    const lines = rawDesc
      .split(/[\r\n]+/)
      .map((l) => l.trim())
      .filter((l) => {
        const u = l.toUpperCase()
        if (u.includes("CONTAINER & CARGO") || u.includes("CARGO PARTICULARS")) return false
        if (u.startsWith("TRANSIT DATE:") || u.startsWith("BORDER:") || u.startsWith("HS CODE:")) return false
        if (u.startsWith("INVOICE NO:") || u.startsWith("INV NO:") || u.startsWith("TRUCK NO:")) return false
        return true
      })
      .filter(Boolean)

    const itemCommodities: string[] = []
    for (const l of lines) {
      if (l.includes(" - ") && /\d+\s*(?:CTNS|BAGS|PKGS|CARTONS|BOXES|PCS)/i.test(l)) {
        const sub = l.split(/\s*-\s*/)
        for (const s of sub) {
          const c = extractCleanCommodity(s)
          if (c && c !== "General Cargo") itemCommodities.push(c)
        }
      } else {
        const c = extractCleanCommodity(l)
        if (c && c !== "General Cargo") itemCommodities.push(c)
      }
    }

    if (synced.items.length > 1) {
      // Attribute weights and values to each cargo line item
      synced.items.forEach((item, idx) => {
        const commodityName = itemCommodities[idx] || itemCommodities[0] || extractCleanCommodity(rawDesc)
        const key = commodityName.toLowerCase()

        if (!map.has(key)) {
          map.set(key, {
            commodityName,
            bolSet: new Set(),
            cargoRowCount: 0,
            packages: 0,
            packageUnits: new Map(),
            netWeightKg: 0,
            grossWeightKg: 0,
            goodsValueByCurrency: {},
            destinations: new Set(),
            shippers: new Map(),
            consignees: new Map(),
            rates: [],
          })
        }

        const entry = map.get(key)!
        entry.bolSet.add(docId)
        entry.cargoRowCount++
        entry.packages += parsePackages(item.packageText)

        const unitMatch = (item.packageText || "").match(/(?:CTNS|BAGS|PKGS|CARTONS|BOXES|PCS|PALLETS|DRUMS|ROLLS|BALES)/i)
        const unit = unitMatch ? unitMatch[0].toUpperCase() : "CTNS"
        entry.packageUnits.set(unit, (entry.packageUnits.get(unit) || 0) + 1)

        const net = parseWeight(item.netWeight)
        entry.netWeightKg += net
        const gross = parseWeight(item.grossWeight)
        entry.grossWeightKg += gross > 0 ? gross : net

        const { amount, currency } = parseMoney(item.goodsValue)
        if (amount > 0) {
          entry.goodsValueByCurrency[currency] = (entry.goodsValueByCurrency[currency] || 0) + amount
        }

        if (dest) entry.destinations.add(dest)
        if (shipper) entry.shippers.set(shipper, (entry.shippers.get(shipper) || 0) + 1)
        if (consignee) entry.consignees.set(consignee, (entry.consignees.get(consignee) || 0) + 1)
        if (item.rate && item.rate.trim()) entry.rates.push(item.rate.trim())
      })
    } else {
      // Single cargo item or fallback
      const commodityName = extractCleanCommodity(rawDesc)
      const key = commodityName.toLowerCase()

      if (!map.has(key)) {
        map.set(key, {
          commodityName,
          bolSet: new Set(),
          cargoRowCount: 0,
          packages: 0,
          packageUnits: new Map(),
          netWeightKg: 0,
          grossWeightKg: 0,
          goodsValueByCurrency: {},
          destinations: new Set(),
          shippers: new Map(),
          consignees: new Map(),
          rates: [],
        })
      }

      const entry = map.get(key)!
      entry.bolSet.add(docId)
      entry.cargoRowCount++
      entry.packages += parsePackages(doc.number_of_packages)

      const unitMatch = (doc.number_of_packages || "").match(/(?:CTNS|BAGS|PKGS|CARTONS|BOXES|PCS|PALLETS|DRUMS|ROLLS|BALES)/i)
      const unit = unitMatch ? unitMatch[0].toUpperCase() : "CTNS"
      entry.packageUnits.set(unit, (entry.packageUnits.get(unit) || 0) + 1)

      const net = parseWeight(doc.net_weight)
      entry.netWeightKg += net
      const gross = parseWeight(doc.gross_weight)
      entry.grossWeightKg += gross > 0 ? gross : net

      const { amount, currency } = parseMoney(doc.goods_value)
      if (amount > 0) {
        entry.goodsValueByCurrency[currency] = (entry.goodsValueByCurrency[currency] || 0) + amount
      }

      if (dest) entry.destinations.add(dest)
      if (shipper) entry.shippers.set(shipper, (entry.shippers.get(shipper) || 0) + 1)
      if (consignee) entry.consignees.set(consignee, (entry.consignees.get(consignee) || 0) + 1)
      const r = doc.rate_per_kg || doc.rate_per_kgs
      if (r && r.trim()) entry.rates.push(r.trim())
    }
  }

  return Array.from(map.values())
    .map((e) => {
      const usdVal = e.goodsValueByCurrency["USD"] || 0
      const bolCount = e.bolSet.size
      const averageValueUsd = bolCount > 0 ? Math.round((usdVal / bolCount) * 100) / 100 : 0

      let topShipper = "-"
      let maxShipperCount = 0
      for (const [sh, cnt] of e.shippers.entries()) {
        if (cnt > maxShipperCount) {
          maxShipperCount = cnt
          topShipper = sh
        }
      }

      let topConsignee = "-"
      let maxConsigneeCount = 0
      for (const [cons, cnt] of e.consignees.entries()) {
        if (cnt > maxConsigneeCount) {
          maxConsigneeCount = cnt
          topConsignee = cons
        }
      }

      let dominantUnit = "CTNS"
      let maxUnitCount = 0
      for (const [u, cnt] of e.packageUnits.entries()) {
        if (cnt > maxUnitCount) {
          maxUnitCount = cnt
          dominantUnit = u
        }
      }

      const destArr = Array.from(e.destinations)
      const topDestination = destArr[0] || "-"

      return {
        commodityName: e.commodityName,
        bolCount,
        cargoRowCount: e.cargoRowCount,
        packages: e.packages,
        packageUnit: dominantUnit,
        netWeightKg: Math.round(e.netWeightKg * 100) / 100,
        grossWeightKg: Math.round(e.grossWeightKg * 100) / 100,
        goodsValueByCurrency: e.goodsValueByCurrency,
        averageValueUsd,
        averageRate: e.rates[0] || undefined,
        topShipper,
        topConsignee,
        topDestination,
        destinations: destArr,
      }
    })
    .sort((a, b) => b.bolCount - a.bolCount || b.netWeightKg - a.netWeightKg)
}

/**
 * Groups BOL records by transit route.
 */
export function groupRoutes(docs: SavedDocument[]): RouteSummary[] {
  const map = new Map<
    string,
    {
      routePath: string
      origin: string
      destination: string
      via?: string
      borderCrossing?: string
      bolCount: number
      packages: number
      netWeightKg: number
      grossWeightKg: number
      goodsValueByCurrency: Record<string, number>
      reeferCount: number
      dryCount: number
    }
  >()

  for (const doc of docs) {
    const routeInfo = extractBolRoute(doc)
    const routePath =
      routeInfo.display !== "—"
        ? routeInfo.display
        : routeInfo.origin && routeInfo.destination
        ? `${routeInfo.origin} ➜ ${routeInfo.destination}`
        : "Unspecified Route"
    const key = routePath.toLowerCase()

    if (!map.has(key)) {
      map.set(key, {
        routePath,
        origin: routeInfo.origin || "—",
        destination: routeInfo.destination || "—",
        via: routeInfo.via,
        borderCrossing: routeInfo.borderCrossing,
        bolCount: 0,
        packages: 0,
        netWeightKg: 0,
        grossWeightKg: 0,
        goodsValueByCurrency: {},
        reeferCount: 0,
        dryCount: 0,
      })
    }

    const entry = map.get(key)!
    entry.bolCount++
    entry.packages += parsePackages(doc.number_of_packages)
    const net = parseWeight(doc.net_weight)
    entry.netWeightKg += net
    const gross = parseWeight(doc.gross_weight)
    entry.grossWeightKg += gross > 0 ? gross : net

    const { amount, currency } = parseMoney(doc.goods_value)
    if (amount > 0) {
      entry.goodsValueByCurrency[currency] = (entry.goodsValueByCurrency[currency] || 0) + amount
    }

    const rawContainers = (doc.container_numbers || "").toUpperCase()
    const rawDesc = ((doc.cargo_description || "") + " " + (doc.goods_description || "")).toUpperCase()
    const isReefer =
      routeInfo.hasReefer ||
      rawContainers.includes("RF") ||
      rawContainers.includes("REEF") ||
      rawDesc.includes("REEFER")
    if (isReefer) {
      entry.reeferCount++
    } else {
      entry.dryCount++
    }
  }

  return Array.from(map.values())
    .map((e) => ({
      ...e,
      netWeightKg: Math.round(e.netWeightKg * 100) / 100,
      grossWeightKg: Math.round(e.grossWeightKg * 100) / 100,
    }))
    .sort((a, b) => b.bolCount - a.bolCount || b.netWeightKg - a.netWeightKg)
}

/**
 * Groups BOL records by Truck License Plate.
 */
export function groupTrucks(docs: SavedDocument[]): TruckSummary[] {
  const map = new Map<
    string,
    {
      truckNumber: string
      plateRegion: string
      bolCount: number
      lastDriver: string
      lastDriverPhone: string
      lastDateMs: number
      lastShipmentDate: string
      totalDriverRent: Record<string, number>
      routesUsed: Set<string>
      routesMap: Map<string, number>
      shippers: Map<string, number>
    }
  >()

  for (const doc of docs) {
    const rawTruck = extractTruckNo(doc) || doc.truck_number || "Unspecified Truck"
    const truckNumber = rawTruck.trim()
    const key = truckNumber.toLowerCase()

    if (!map.has(key)) {
      // Deduce plate region if possible
      let region = "AFG"
      const upper = truckNumber.toUpperCase()
      if (upper.includes("KBL") || upper.includes("KABUL")) region = "KBL (Kabul)"
      else if (upper.includes("HRT") || upper.includes("HERAT")) region = "HRT (Herat)"
      else if (upper.includes("KDR") || upper.includes("KANDAHAR")) region = "KDR (Kandahar)"
      else if (upper.includes("BLH") || upper.includes("BALKH") || upper.includes("MAZAR")) region = "BLH (Balkh)"
      else if (upper.includes("NGR") || upper.includes("JALALABAD")) region = "NGR (Nangarhar)"
      else if (upper.includes("IR") || upper.includes("IRAN")) region = "IR (Iran)"
      else if (upper.includes("PK") || upper.includes("PAK")) region = "PK (Pakistan)"
      else if (upper.includes("UZB") || upper.includes("UZ")) region = "UZ (Uzbekistan)"
      else if (upper.includes("TKM") || upper.includes("TM")) region = "TM (Turkmenistan)"
      else region = "Commercial"

      map.set(key, {
        truckNumber,
        plateRegion: region,
        bolCount: 0,
        lastDriver: "—",
        lastDriverPhone: "—",
        lastDateMs: 0,
        lastShipmentDate: "—",
        totalDriverRent: {},
        routesUsed: new Set(),
        routesMap: new Map(),
        shippers: new Map(),
      })
    }

    const entry = map.get(key)!
    entry.bolCount++

    if (doc.driver_name && doc.driver_name.trim()) {
      entry.lastDriver = doc.driver_name.trim()
    }
    if (doc.driver_contact && doc.driver_contact.trim()) {
      entry.lastDriverPhone = doc.driver_contact.trim()
    }

    const d = normalizeDate(doc.issue_date || doc.created_at)
    if (d && d.getTime() > entry.lastDateMs) {
      entry.lastDateMs = d.getTime()
      entry.lastShipmentDate = formatDisplayDate(d)
      if (doc.driver_name && doc.driver_name.trim()) {
        entry.lastDriver = doc.driver_name.trim()
      }
      if (doc.driver_contact && doc.driver_contact.trim()) {
        entry.lastDriverPhone = doc.driver_contact.trim()
      }
    }

    const rentRaw = doc.driver_rent || doc.driverFreight || ""
    if (rentRaw.trim()) {
      const { amount, currency } = parseMoney(rentRaw)
      if (amount > 0) {
        entry.totalDriverRent[currency] = (entry.totalDriverRent[currency] || 0) + amount
      }
    }

    const routeInfo = extractBolRoute(doc)
    const routeText =
      routeInfo.shortDisplay !== "—"
        ? routeInfo.shortDisplay
        : routeInfo.display !== "—"
        ? routeInfo.display
        : ""
    if (routeText) {
      entry.routesUsed.add(routeText)
      entry.routesMap.set(routeText, (entry.routesMap.get(routeText) || 0) + 1)
    }

    if (doc.shipper_name && doc.shipper_name.trim()) {
      const s = doc.shipper_name.trim()
      entry.shippers.set(s, (entry.shippers.get(s) || 0) + 1)
    }
  }

  return Array.from(map.values())
    .map((e) => {
      let topShipper = "—"
      let maxCount = 0
      for (const [shipper, count] of e.shippers.entries()) {
        if (count > maxCount) {
          maxCount = count
          topShipper = shipper
        }
      }

      let topRoute = "—"
      let maxRouteCount = 0
      for (const [route, count] of e.routesMap.entries()) {
        if (count > maxRouteCount) {
          maxRouteCount = count
          topRoute = route
        }
      }

      return {
        truckNumber: e.truckNumber,
        plateRegion: e.plateRegion,
        bolCount: e.bolCount,
        lastDriver: e.lastDriver,
        lastDriverPhone: e.lastDriverPhone,
        lastShipmentDate: e.lastShipmentDate,
        totalDriverRent: e.totalDriverRent,
        routesUsed: Array.from(e.routesUsed),
        topRoute: topRoute !== "—" ? topRoute : (e.routesUsed.values().next().value || "—"),
        topShipper,
      }
    })
    .sort((a, b) => b.bolCount - a.bolCount)
}

/**
 * Groups BOL records by Port of Loading, Port of Discharge, and Final Destination.
 */
export function groupDestinations(docs: SavedDocument[]): DestinationSummary[] {
  const map = new Map<
    string,
    {
      locationName: string
      country: string
      type: "POL" | "POD" | "Final Destination"
      bolCount: number
      packages: number
      netWeightKg: number
      grossWeightKg: number
      goodsValueByCurrency: Record<string, number>
      shippers: Map<string, number>
      commodities: Map<string, number>
      lastDateMs: number
      lastDateStr: string
    }
  >()

  function addLocation(name: string, type: "POL" | "POD" | "Final Destination", doc: SavedDocument) {
    if (!name || !name.trim()) return
    const cleanName = name.trim()
    const key = `${type}::${cleanName.toLowerCase()}`

    // Determine country
    let country = doc.destination_country || doc.origin_country || ""
    if (!country) {
      const lower = cleanName.toLowerCase()
      if (lower.includes("nhava") || lower.includes("mumbai") || lower.includes("india") || lower.includes("mundra")) country = "India"
      else if (lower.includes("islam qala") || lower.includes("kabul") || lower.includes("herat") || lower.includes("hairatan") || lower.includes("torghundi") || lower.includes("boldak")) country = "Afghanistan"
      else if (lower.includes("bandar") || lower.includes("abbas") || lower.includes("chabahar") || lower.includes("iran") || lower.includes("dogharun")) country = "Iran"
      else if (lower.includes("jebel") || lower.includes("dubai") || lower.includes("uae") || lower.includes("sharjah")) country = "UAE"
      else if (lower.includes("karachi") || lower.includes("pakistan") || lower.includes("lahore")) country = "Pakistan"
      else if (lower.includes("turkmenistan") || lower.includes("serkhetabat")) country = "Turkmenistan"
      else if (lower.includes("uzbekistan") || lower.includes("termez")) country = "Uzbekistan"
      else country = "—"
    }

    if (!map.has(key)) {
      map.set(key, {
        locationName: cleanName,
        country,
        type,
        bolCount: 0,
        packages: 0,
        netWeightKg: 0,
        grossWeightKg: 0,
        goodsValueByCurrency: {},
        shippers: new Map(),
        commodities: new Map(),
        lastDateMs: 0,
        lastDateStr: "—",
      })
    }

    const entry = map.get(key)!
    entry.bolCount++
    entry.packages += parsePackages(doc.number_of_packages)
    const net = parseWeight(doc.net_weight)
    entry.netWeightKg += net
    const gross = parseWeight(doc.gross_weight)
    entry.grossWeightKg += gross > 0 ? gross : net

    const { amount, currency } = parseMoney(doc.goods_value)
    if (amount > 0) {
      entry.goodsValueByCurrency[currency] = (entry.goodsValueByCurrency[currency] || 0) + amount
    }

    if (doc.shipper_name && doc.shipper_name.trim()) {
      const s = doc.shipper_name.trim()
      entry.shippers.set(s, (entry.shippers.get(s) || 0) + 1)
    }

    const comm = extractCleanCommodity(doc.cargo_description || doc.goods_description || doc.commodity)
    if (comm && comm !== "General Cargo") {
      entry.commodities.set(comm, (entry.commodities.get(comm) || 0) + 1)
    }

    const d = normalizeDate(doc.issue_date || doc.created_at)
    if (d && d.getTime() > entry.lastDateMs) {
      entry.lastDateMs = d.getTime()
      entry.lastDateStr = formatDisplayDate(d)
    }
  }

  for (const doc of docs) {
    let hasPol = false
    let hasPod = false
    if (doc.port_of_loading) {
      addLocation(doc.port_of_loading, "POL", doc)
      hasPol = true
    }
    if (doc.port_of_discharge) {
      addLocation(doc.port_of_discharge, "POD", doc)
      hasPod = true
    }
    if (doc.place_of_delivery && doc.place_of_delivery !== doc.port_of_discharge) {
      addLocation(doc.place_of_delivery, "Final Destination", doc)
    }

    if (!hasPol || !hasPod) {
      const routeInfo = extractBolRoute(doc)
      if (!hasPol && routeInfo.origin && routeInfo.origin !== "—") {
        addLocation(routeInfo.origin, "POL", doc)
      }
      if (routeInfo.via && routeInfo.via !== "—") {
        addLocation(routeInfo.via, "POL", doc)
      }
      if (!hasPod && routeInfo.destination && routeInfo.destination !== "—") {
        addLocation(routeInfo.destination, "POD", doc)
      }
    }
  }

  return Array.from(map.values())
    .map((e) => {
      const topShippers = Array.from(e.shippers.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name)

      const sortedCommodities = Array.from(e.commodities.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name)
      const topCommodity = sortedCommodities[0] || "—"

      return {
        locationName: e.locationName,
        country: e.country,
        type: e.type,
        bolCount: e.bolCount,
        packages: e.packages,
        netWeightKg: Math.round(e.netWeightKg * 100) / 100,
        grossWeightKg: Math.round(e.grossWeightKg * 100) / 100,
        goodsValueByCurrency: e.goodsValueByCurrency,
        topShippers,
        topShipper: topShippers[0] || "—",
        topCommodity,
        lastShipmentDate: e.lastDateStr,
      }
    })
    .sort((a, b) => b.bolCount - a.bolCount || b.netWeightKg - a.netWeightKg)
}

/**
 * Extracts individual containers and categorizes their types.
 */
export function groupContainers(docs: SavedDocument[]): {
  containers: ContainerRecord[]
  stats: ContainerSummaryStats
} {
  const containerList: ContainerRecord[] = []
  const stats: ContainerSummaryStats = {
    total: 0,
    dry: 0,
    reefer: 0,
    twentyFt: 0,
    fortyFt: 0,
    fortyHc: 0,
    fortyRf: 0,
    other: 0,
  }

  for (const doc of docs) {
    const raw = doc.container_numbers || ""
    if (!raw.trim()) continue

    const tokens = raw
      .split(/[\n,;/]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length >= 4)

    const commodity = extractCleanCommodity(doc.cargo_description || doc.goods_description)
    const weight = parseWeight(doc.net_weight)
    const dateStr = formatDisplayDate(doc.issue_date || doc.created_at)

    for (const cNum of tokens) {
      // Determine container type
      let type: ContainerRecord["containerType"] = "Other"
      const upperDesc = (
        (doc.cargo_description || "") +
        " " +
        (doc.goods_description || "") +
        " " +
        cNum
      ).toUpperCase()

      if (cNum.includes("40RF") || upperDesc.includes("40RF") || (upperDesc.includes("40") && upperDesc.includes("REEFER"))) {
        type = "40 RF"
        stats.fortyRf++
        stats.reefer++
      } else if (cNum.includes("40HC") || upperDesc.includes("40HC") || upperDesc.includes("HIGH CUBE")) {
        type = "40 HC"
        stats.fortyHc++
        stats.dry++
      } else if (cNum.includes("40") || upperDesc.includes("40 FT") || upperDesc.includes("40FT")) {
        type = "40 FT"
        stats.fortyFt++
        stats.dry++
      } else if (cNum.includes("20") || upperDesc.includes("20 FT") || upperDesc.includes("20FT")) {
        type = "20 FT"
        stats.twentyFt++
        stats.dry++
      } else if (upperDesc.includes("REEFER") || upperDesc.includes("REEF")) {
        type = "Reefer"
        stats.reefer++
      } else {
        type = "Dry"
        stats.dry++
      }

      stats.total++
      const cleanContainerNumber = cNum.replace(/\s*\(.*?\)/g, "").trim()

      containerList.push({
        containerNumber: cleanContainerNumber || cNum,
        containerType: type,
        bolNumber: doc.bol_number || "-",
        shipper: doc.shipper_name || "-",
        consignee: doc.consignee_name || "-",
        commodity,
        weightKg: Math.round((weight / (tokens.length || 1)) * 100) / 100,
        origin: doc.port_of_loading || doc.origin_country || "-",
        destination: doc.port_of_discharge || doc.place_of_delivery || "-",
        date: dateStr,
      })
    }
  }

  return { containers: containerList, stats }
}

/**
 * Groups BOL records by Month chronologically.
 */
export function groupMonthly(
  docs: SavedDocument[],
  yearFilter?: number | "all"
): MonthlySummary[] {
  const map = new Map<
    string,
    {
      monthKey: string
      monthLabel: string
      dateMs: number
      bolCount: number
      packages: number
      netWeightKg: number
      goodsValueByCurrency: Record<string, number>
      containers: Set<string>
      shippers: Set<string>
      consignees: Set<string>
    }
  >()

  for (const doc of docs) {
    const d = normalizeDate(doc.issue_date || doc.created_at)
    if (!d) continue

    const year = d.getFullYear()
    if (yearFilter && yearFilter !== "all" && year !== yearFilter) {
      continue
    }

    const monthKey = `${year}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const monthLabel = d.toLocaleDateString("en-US", { month: "short", year: "numeric" })

    if (!map.has(monthKey)) {
      map.set(monthKey, {
        monthKey,
        monthLabel,
        dateMs: new Date(year, d.getMonth(), 1).getTime(),
        bolCount: 0,
        packages: 0,
        netWeightKg: 0,
        goodsValueByCurrency: {},
        containers: new Set(),
        shippers: new Set(),
        consignees: new Set(),
      })
    }

    const entry = map.get(monthKey)!
    entry.bolCount++
    entry.packages += parsePackages(doc.number_of_packages)
    entry.netWeightKg += parseWeight(doc.net_weight)

    const { amount, currency } = parseMoney(doc.goods_value)
    if (amount > 0) {
      entry.goodsValueByCurrency[currency] = (entry.goodsValueByCurrency[currency] || 0) + amount
    }

    if (doc.container_numbers) {
      doc.container_numbers
        .split(/[\n,;/]+/)
        .map((c) => c.trim())
        .filter(Boolean)
        .forEach((c) => entry.containers.add(c.toUpperCase()))
    }

    if (doc.shipper_name) entry.shippers.add(doc.shipper_name.trim())
    if (doc.consignee_name) entry.consignees.add(doc.consignee_name.trim())
  }

  return Array.from(map.values())
    .sort((a, b) => a.dateMs - b.dateMs)
    .map((e) => ({
      monthKey: e.monthKey,
      monthLabel: e.monthLabel,
      bolCount: e.bolCount,
      packages: e.packages,
      netWeightKg: Math.round(e.netWeightKg * 100) / 100,
      goodsValueByCurrency: e.goodsValueByCurrency,
      containerCount: e.containers.size,
      shipperCount: e.shippers.size,
      consigneeCount: e.consignees.size,
    }))
}

/**
 * Computes deep financial analytics strictly segregated by currency.
 */
export function calculateFinancialMetrics(docs: SavedDocument[]): FinancialBreakdown {
  const currencyTotals: Record<string, number> = {}
  const currencyCounts: Record<string, number> = {}

  let highest: { amount: number; currency: string; bolNumber: string; shipper: string } | null = null
  let lowest: { amount: number; currency: string; bolNumber: string; shipper: string } | null = null

  const shipperMap = new Map<string, { currencyTotals: Record<string, number>; bolCount: number }>()
  const commodityMap = new Map<string, { currencyTotals: Record<string, number>; bolCount: number }>()
  const destinationMap = new Map<string, { currencyTotals: Record<string, number>; bolCount: number }>()
  const monthMap = new Map<string, { monthLabel: string; dateMs: number; currencyTotals: Record<string, number> }>()

  for (const doc of docs) {
    const { amount, currency } = parseMoney(doc.goods_value)
    if (amount <= 0) continue

    currencyTotals[currency] = (currencyTotals[currency] || 0) + amount
    currencyCounts[currency] = (currencyCounts[currency] || 0) + 1

    const bolNumber = doc.bol_number || "-"
    const shipper = doc.shipper_name || "-"

    if (!highest || amount > highest.amount) {
      highest = { amount, currency, bolNumber, shipper }
    }
    if (!lowest || amount < lowest.amount) {
      lowest = { amount, currency, bolNumber, shipper }
    }

    // Shipper
    const sName = doc.shipper_name?.trim() || "Unspecified"
    if (!shipperMap.has(sName)) shipperMap.set(sName, { currencyTotals: {}, bolCount: 0 })
    const sEntry = shipperMap.get(sName)!
    sEntry.bolCount++
    sEntry.currencyTotals[currency] = (sEntry.currencyTotals[currency] || 0) + amount

    // Commodity
    const comm = extractCleanCommodity(doc.cargo_description || doc.goods_description)
    if (!commodityMap.has(comm)) commodityMap.set(comm, { currencyTotals: {}, bolCount: 0 })
    const cEntry = commodityMap.get(comm)!
    cEntry.bolCount++
    cEntry.currencyTotals[currency] = (cEntry.currencyTotals[currency] || 0) + amount

    // Destination
    const dest = doc.port_of_discharge?.trim() || doc.place_of_delivery?.trim() || "Unspecified"
    if (!destinationMap.has(dest)) destinationMap.set(dest, { currencyTotals: {}, bolCount: 0 })
    const dEntry = destinationMap.get(dest)!
    dEntry.bolCount++
    dEntry.currencyTotals[currency] = (dEntry.currencyTotals[currency] || 0) + amount

    // Month
    const d = normalizeDate(doc.issue_date || doc.created_at)
    if (d) {
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const mLabel = d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
      if (!monthMap.has(mKey)) {
        monthMap.set(mKey, {
          monthLabel: mLabel,
          dateMs: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
          currencyTotals: {},
        })
      }
      const mEntry = monthMap.get(mKey)!
      mEntry.currencyTotals[currency] = (mEntry.currencyTotals[currency] || 0) + amount
    }
  }

  const averageValuePerBol: Record<string, number> = {}
  for (const curr of Object.keys(currencyTotals)) {
    const cnt = currencyCounts[curr] || 1
    averageValuePerBol[curr] = Math.round((currencyTotals[curr] / cnt) * 100) / 100
  }

  const byShipper = Array.from(shipperMap.entries())
    .map(([name, val]) => ({ name, ...val }))
    .sort((a, b) => (b.currencyTotals["USD"] || 0) - (a.currencyTotals["USD"] || 0))
    .slice(0, 10)

  const byCommodity = Array.from(commodityMap.entries())
    .map(([name, val]) => ({ name, ...val }))
    .sort((a, b) => (b.currencyTotals["USD"] || 0) - (a.currencyTotals["USD"] || 0))
    .slice(0, 10)

  const byDestination = Array.from(destinationMap.entries())
    .map(([name, val]) => ({ name, ...val }))
    .sort((a, b) => (b.currencyTotals["USD"] || 0) - (a.currencyTotals["USD"] || 0))
    .slice(0, 10)

  const byMonth = Array.from(monthMap.values())
    .sort((a, b) => a.dateMs - b.dateMs)
    .map(({ monthLabel, currencyTotals }) => ({ monthLabel, currencyTotals }))

  return {
    currencyTotals,
    averageValuePerBol,
    highestValue: highest,
    lowestValue: lowest,
    byShipper,
    byCommodity,
    byDestination,
    byMonth,
  }
}
