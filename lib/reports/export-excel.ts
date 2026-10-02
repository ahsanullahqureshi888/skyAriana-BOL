/**
 * Sky Ariana Logistics — Professional Multi-Sheet Excel (.xlsx) Export Engine
 */

import { SavedDocument } from "./types"
import { calculateOverviewKpis } from "./calculations"
import {
  groupShippers,
  groupConsignees,
  groupCommodities,
  groupDestinations,
  groupContainers,
  groupRoutes,
  groupTrucks,
} from "./grouping"
import { formatDisplayDate, extractBolRoute, extractTruckNo, extractInvoiceNo } from "./parsers"
import { parseSyncedCargoItems } from "@/lib/utils/cargo-grid"
import type { BillOfLadingFormData } from "@/lib/types/bill-of-lading"

/**
 * Calculates optimal column widths based on maximum string lengths in rows.
 */
function autoFitColumns(rows: (string | number | undefined | null)[][]): { wch: number }[] {
  const colWidths: number[] = []

  for (const row of rows) {
    row.forEach((val, colIdx) => {
      const len = val !== null && val !== undefined ? String(val).length : 0
      colWidths[colIdx] = Math.max(colWidths[colIdx] || 10, len + 3)
    })
  }

  // Cap at reasonable maximums
  return colWidths.map((w) => ({ wch: Math.min(Math.max(w, 12), 45) }))
}

/**
 * Generates and downloads a complete Excel Workbook for the filtered BOL data.
 * Prioritizes the active tab when activeTab is passed.
 * Uses dynamic import and cooperative event loop yielding so large exports never lock the UI.
 */
export async function exportReportToExcel(
  docs: SavedDocument[],
  fileNamePrefix: string = "Sky-Ariana-Operations-Report",
  activeTab?: string
): Promise<void> {
  // Yield to browser event loop before heavy computation
  await new Promise((resolve) => setTimeout(resolve, 0))

  const [XLSX, kpis] = await Promise.all([
    import("xlsx"),
    Promise.resolve().then(() => calculateOverviewKpis(docs)),
  ])

  const shippers = groupShippers(docs)
  const consignees = groupConsignees(docs)
  const commodities = groupCommodities(docs)
  const destinations = groupDestinations(docs)
  const { stats: containerStats } = groupContainers(docs)

  const wb = XLSX.utils.book_new()
  const todayStr = new Date().toISOString().split("T")[0]

  // ==========================================
  // SHEET 1: SUMMARY
  // ==========================================
  const summaryRows: (string | number)[][] = [
    ["SKY ARIANA LIMITED — OPERATIONS & MANAGEMENT REPORT"],
    [`Generated Date: ${new Date().toLocaleDateString("en-GB")} ${new Date().toLocaleTimeString()}`, `Total Records: ${docs.length} BOLs`],
    [],
    ["KEY PERFORMANCE INDICATORS (KPI)", "VALUE", "UNIT"],
    ["Total Bills of Lading (BOL)", kpis.totalBols, "Records"],
    ["Total Shipments", kpis.totalShipments, "Shipments"],
    ["Total Cargo Packages", kpis.totalPackages, "Cartons / CTNS"],
    ["Total Net Weight", kpis.totalNetWeightKg, "Kilograms (KG)"],
    ["Total Gross Weight", kpis.totalGrossWeightKg, "Kilograms (KG)"],
    ["Total Active Containers", kpis.totalContainers, "Units"],
    ["Unique Shippers", kpis.totalShippers, "Companies"],
    ["Unique Consignees", kpis.totalConsignees, "Companies"],
    ["Unique Destinations", kpis.totalDestinations, "Ports / Cities"],
    ["BOLs with Saved PDF", kpis.bolsWithPdf, "Documents"],
    ["BOLs pending PDF", kpis.bolsWithoutPdf, "Documents"],
    ["Export Shipments (from Afghanistan)", kpis.exportShipments, "Shipments"],
    ["Import / Transit Shipments", kpis.importShipments, "Shipments"],
    [],
    ["GOODS VALUE BY DECLARED CURRENCY", "AMOUNT", "CURRENCY"],
    ...kpis.currencyTotals.map((c) => [
      `Total Goods Value (${c.currency})`,
      c.amount,
      c.currency,
    ]),
    [],
    ["CONTAINER FLEET BREAKDOWN", "COUNT", "TYPE"],
    ["Dry Cargo Containers", containerStats.dry, "Units"],
    ["Reefer (Temperature Controlled)", containerStats.reefer, "Units"],
    ["20 FT Standard", containerStats.twentyFt, "Units"],
    ["40 FT Standard", containerStats.fortyFt, "Units"],
    ["40 FT High Cube (HC)", containerStats.fortyHc, "Units"],
    ["40 FT Reefer (RF)", containerStats.fortyRf, "Units"],
    ["Other Equipment", containerStats.other, "Units"],
  ]

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
  wsSummary["!cols"] = autoFitColumns(summaryRows)
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary")

  // ==========================================
  // SHEET 2: DETAILED BOLS
  // ==========================================
  const detailedHeaders = [
    "#",
    "BOL Number",
    "Issue Date",
    "Invoice No",
    "Truck Plate",
    "Driver Name",
    "Driver Phone",
    "Driver Rent",
    "Shipper Name",
    "Consignee Name",
    "Notify Party",
    "Cargo Summary",
    "Route",
    "Packages",
    "Net Weight (KG)",
    "Gross Weight (KG)",
    "Rate / KG",
    "Goods Value",
    "Port of Loading",
    "Port of Discharge",
    "Place of Delivery",
    "Container Numbers",
    "Seal Numbers",
    "Vessel / Voyage",
    "Has PDF",
  ]

  const detailedRows: (string | number)[][] = [
    detailedHeaders,
    ...docs.map((doc, idx) => [
      idx + 1,
      doc.bol_number || "-",
      formatDisplayDate(doc.issue_date || doc.created_at),
      extractInvoiceNo(doc) || doc.invoice_no || (doc as any).invoice_number || "-",
      extractTruckNo(doc) || doc.truck_number || "-",
      doc.driver_name || "-",
      doc.driver_contact || "-",
      doc.driver_rent || (doc as any).driverFreight || (doc as any).driverRent || "-",
      doc.shipper_name || "-",
      doc.consignee_name || "-",
      doc.notify_party_name || "-",
      doc.cargo_description || doc.commodity || doc.description_of_goods || doc.goods_description || "-",
      extractBolRoute(doc).display,
      doc.number_of_packages || "-",
      doc.net_weight || "-",
      doc.gross_weight || "-",
      doc.rate_per_kg || (doc as any).rate || "-",
      doc.goods_value || "-",
      doc.port_of_loading || "-",
      doc.port_of_discharge || "-",
      doc.place_of_delivery || doc.destination_country || "-",
      doc.container_numbers || (doc as any).container_number || "-",
      doc.seal_numbers || "-",
      [doc.ocean_vessel, doc.voyage_no].filter(Boolean).join(" / ") || "-",
      doc.pdf_url ? "YES" : "NO",
    ]),
  ]

  const wsDetailed = XLSX.utils.aoa_to_sheet(detailedRows)
  wsDetailed["!cols"] = autoFitColumns(detailedRows)
  wsDetailed["!freeze"] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, wsDetailed, "Detailed BOLs")

  // ==========================================
  // SHEET 3: CARGO ITEMS BREAKDOWN
  // ==========================================
  const cargoBreakdownRows: (string | number)[][] = [
    [
      "#",
      "BOL Number",
      "Issue Date",
      "Item #",
      "Packages",
      "Net / Ctn",
      "Gross / Ctn",
      "Total Net Weight",
      "Total Gross Weight",
      "Rate",
      "Goods Value",
      "Truck Plate",
      "Driver",
      "Containers",
    ],
  ]

  let cargoItemIndex = 1
  for (const doc of docs) {
    const synced = parseSyncedCargoItems(doc as unknown as Partial<BillOfLadingFormData>)
    if (synced.items.length > 0) {
      synced.items.forEach((item, itemIdx) => {
        cargoBreakdownRows.push([
          cargoItemIndex++,
          doc.bol_number || "-",
          formatDisplayDate(doc.issue_date || doc.created_at),
          itemIdx + 1,
          item.packageText || "-",
          item.netPerCarton || "-",
          item.grossPerCarton || "-",
          item.netWeight || "-",
          item.grossWeight || "-",
          item.rate || "-",
          item.goodsValue || "-",
          extractTruckNo(doc) || doc.truck_number || "-",
          doc.driver_name || "-",
          doc.container_numbers || (doc as any).container_number || "-",
        ])
      })
    } else {
      cargoBreakdownRows.push([
        cargoItemIndex++,
        doc.bol_number || "-",
        formatDisplayDate(doc.issue_date || doc.created_at),
        1,
        doc.number_of_packages || "-",
        "-",
        "-",
        doc.net_weight || "-",
        doc.gross_weight || "-",
        doc.rate_per_kg || (doc as any).rate || "-",
        doc.goods_value || "-",
        extractTruckNo(doc) || doc.truck_number || "-",
        doc.driver_name || "-",
        doc.container_numbers || (doc as any).container_number || "-",
      ])
    }
  }

  const wsCargo = XLSX.utils.aoa_to_sheet(cargoBreakdownRows)
  wsCargo["!cols"] = autoFitColumns(cargoBreakdownRows)
  wsCargo["!freeze"] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, wsCargo, "Cargo Items Breakdown")

  // ==========================================
  // SHEET 3: SHIPPER SUMMARY
  // ==========================================
  const shipperHeaders = [
    "#",
    "Shipper Name",
    "Total BOLs",
    "Total Packages",
    "Net Weight (KG)",
    "Gross Weight (KG)",
    "Goods Value (USD)",
    "Containers",
    "Top Destination",
    "Last Shipment Date",
  ]

  const shipperRows: (string | number)[][] = [
    shipperHeaders,
    ...shippers.map((s, idx) => [
      idx + 1,
      s.shipperName,
      s.bolCount,
      s.packages,
      s.netWeightKg,
      s.grossWeightKg,
      s.goodsValueByCurrency["USD"] || 0,
      s.containerCount,
      s.topDestination,
      s.lastShipmentDate,
    ]),
  ]

  const wsShippers = XLSX.utils.aoa_to_sheet(shipperRows)
  wsShippers["!cols"] = autoFitColumns(shipperRows)
  wsShippers["!freeze"] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, wsShippers, "Shippers")

  // ==========================================
  // SHEET 4: CONSIGNEE SUMMARY
  // ==========================================
  const consigneeHeaders = [
    "#",
    "Consignee Name",
    "Total BOLs",
    "Supplying Shippers",
    "Total Packages",
    "Net Weight (KG)",
    "Gross Weight (KG)",
    "Goods Value (USD)",
    "Containers",
    "Top Destination",
    "Last Shipment Date",
  ]

  const consigneeRows: (string | number)[][] = [
    consigneeHeaders,
    ...consignees.map((c, idx) => [
      idx + 1,
      c.consigneeName,
      c.bolCount,
      c.shipperCount,
      c.packages,
      c.netWeightKg,
      c.grossWeightKg,
      c.goodsValueByCurrency["USD"] || 0,
      c.containerCount,
      c.topDestination,
      c.lastShipmentDate,
    ]),
  ]

  const wsConsignees = XLSX.utils.aoa_to_sheet(consigneeRows)
  wsConsignees["!cols"] = autoFitColumns(consigneeRows)
  wsConsignees["!freeze"] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, wsConsignees, "Consignees")

  // ==========================================
  // SHEET 5: COMMODITY SUMMARY
  // ==========================================
  const commodityHeaders = [
    "#",
    "Commodity Name",
    "Total BOLs",
    "Total Packages",
    "Net Weight (KG)",
    "Goods Value (USD)",
    "Average Value / BOL (USD)",
    "Destinations",
  ]

  const commodityRows: (string | number)[][] = [
    commodityHeaders,
    ...commodities.map((c, idx) => [
      idx + 1,
      c.commodityName,
      c.bolCount,
      c.packages,
      c.netWeightKg,
      c.goodsValueByCurrency["USD"] || 0,
      c.averageValueUsd,
      c.destinations.join(", ") || "-",
    ]),
  ]

  const wsCommodities = XLSX.utils.aoa_to_sheet(commodityRows)
  wsCommodities["!cols"] = autoFitColumns(commodityRows)
  wsCommodities["!freeze"] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, wsCommodities, "Commodities")

  // ==========================================
  // SHEET 6: DESTINATION SUMMARY
  // ==========================================
  const destHeaders = [
    "#",
    "Port / Destination",
    "Route Role",
    "Total BOLs",
    "Net Weight (KG)",
    "Goods Value (USD)",
    "Top Active Shippers",
  ]

  const destRows: (string | number)[][] = [
    destHeaders,
    ...destinations.map((d, idx) => [
      idx + 1,
      d.locationName,
      d.type,
      d.bolCount,
      d.netWeightKg,
      d.goodsValueByCurrency["USD"] || 0,
      d.topShippers.join(", ") || "-",
    ]),
  ]

  const wsDestinations = XLSX.utils.aoa_to_sheet(destRows)
  wsDestinations["!cols"] = autoFitColumns(destRows)
  wsDestinations["!freeze"] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, wsDestinations, "Destinations")

  // Optional specialized sheets when activeTab is requested
  if (activeTab === "routes") {
    const routes = groupRoutes(docs)
    const routeHeaders = [
      "#",
      "Transit Corridor",
      "Origin",
      "Destination",
      "Border Crossing",
      "Total BOLs",
      "Reefer Units",
      "Dry Units",
      "Net Weight (KG)",
      "Goods Value (USD)",
    ]
    const routeRows: (string | number)[][] = [
      routeHeaders,
      ...routes.map((r, idx) => [
        idx + 1,
        r.routePath,
        r.origin,
        r.destination,
        r.borderCrossing || "-",
        r.bolCount,
        r.reeferCount,
        r.dryCount,
        r.netWeightKg,
        r.goodsValueByCurrency["USD"] || 0,
      ]),
    ]
    const wsRoutes = XLSX.utils.aoa_to_sheet(routeRows)
    wsRoutes["!cols"] = autoFitColumns(routeRows)
    wsRoutes["!freeze"] = { xSplit: 0, ySplit: 1 }
    XLSX.utils.book_append_sheet(wb, wsRoutes, "Routes")
  } else if (activeTab === "trucks") {
    const trucks = groupTrucks(docs)
    const truckHeaders = [
      "#",
      "Truck Number",
      "Region / Plate",
      "Shipment Count",
      "Last Driver",
      "Driver Phone",
      "Driver Rent (AFN)",
      "Top Corridor",
      "Last Shipment Date",
    ]
    const truckRows: (string | number)[][] = [
      truckHeaders,
      ...trucks.map((t, idx) => [
        idx + 1,
        t.truckNumber,
        t.plateRegion || "-",
        t.bolCount,
        t.lastDriver,
        t.lastDriverPhone || "-",
        t.totalDriverRent["AFN"] || 0,
        t.topRoute || "-",
        t.lastShipmentDate || "-",
      ]),
    ]
    const wsTrucks = XLSX.utils.aoa_to_sheet(truckRows)
    wsTrucks["!cols"] = autoFitColumns(truckRows)
    wsTrucks["!freeze"] = { xSplit: 0, ySplit: 1 }
    XLSX.utils.book_append_sheet(wb, wsTrucks, "Trucks")
  }

  // Prioritize active tab sheet if specified
  if (activeTab) {
    const tabToSheetMap: Record<string, string> = {
      shippers: "Shippers",
      consignees: "Consignees",
      commodities: "Commodities",
      destinations: "Destinations",
      detailed: "Detailed BOLs",
      routes: "Routes",
      trucks: "Trucks",
      monthly: "Summary",
      financial: "Summary",
    }
    const targetSheetName = tabToSheetMap[activeTab.toLowerCase()]
    if (targetSheetName && wb.SheetNames.includes(targetSheetName)) {
      const idx = wb.SheetNames.indexOf(targetSheetName)
      if (idx > 0) {
        wb.SheetNames.splice(idx, 1)
        wb.SheetNames.unshift(targetSheetName)
      }
    }
  }

  // Export workbook
  const outFileName = `${fileNamePrefix}-${todayStr}.xlsx`
  XLSX.writeFile(wb, outFileName)
}
