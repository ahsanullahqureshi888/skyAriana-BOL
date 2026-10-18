import crypto from "crypto"
import type { BillOfLadingFormData } from "@/lib/types/bill-of-lading"
import type {
  ShipmentItem,
  CommercialInvoiceData,
  PackingListData,
  StickerLabelData,
  TransitPaperData,
  PhytosanitaryCertificateDraftData,
  ShipmentDocumentRecord,
  ShipmentDocumentType,
  ShipmentDocumentStatus,
  ShipmentDocumentPackage,
  DocumentVersionRecord,
  DocumentIntegrityIssue,
  BulkDocumentCreationReport,
  InvoiceRateBasis,
} from "@/lib/types/shipment-document-package"
import {
  getAllShipmentDocuments,
  getShipmentDocumentsByBol,
  getShipmentDocumentById,
  saveShipmentDocument,
  saveShipmentDocumentsBatch,
  nextCommercialInvoiceNumber,
  nextPackingListNumber,
  nextTransitPaperNumber,
  nextPhytoDraftNumber,
} from "./shipment-document-storage"
import { roundMoney, addMoney } from "@/lib/utils/money"

// ==========================================
// 1. HELPERS & HASHING
// ==========================================

export function cleanStr(val?: string | null): string {
  if (!val) return ""
  const trimmed = String(val).replace(/\s+/g, " ").trim()
  if (/^(undefined|null|none|n\/a|nan|\[object Object\]|—|-)$/i.test(trimmed)) return ""
  return trimmed
}

export function parseNumber(val?: string | number | null): number {
  if (val === undefined || val === null) return 0
  if (typeof val === "number") return isNaN(val) ? 0 : val
  const cleaned = String(val).replace(/,/g, "").replace(/[^\d.-]/g, "").trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

export function computeBolSourceHash(formData: Partial<BillOfLadingFormData>): string {
  const parts = [
    cleanStr(formData.shipper_name),
    cleanStr(formData.consignee_name),
    cleanStr(formData.container_numbers),
    cleanStr(formData.seal_numbers),
    cleanStr(formData.truck_number),
    cleanStr(formData.driver_name),
    cleanStr(formData.driver_contact),
    cleanStr(formData.number_of_packages),
    cleanStr(formData.net_weight),
    cleanStr(formData.gross_weight),
    cleanStr(formData.cargo_description),
    cleanStr(formData.port_of_loading),
    cleanStr(formData.port_of_discharge),
    cleanStr(formData.place_of_delivery),
  ]
  return crypto.createHash("sha256").update(parts.join("|||")).digest("hex")
}

// ==========================================
// 2. COMMODITY ITEM RESOLUTION & GOODS VALUE
// ==========================================

export function deriveShipmentItemsFromBol(
  formData: Partial<BillOfLadingFormData>,
  bolId = "BOL-MASTER"
): ShipmentItem[] {
  const cargoDesc = cleanStr(formData.cargo_description)
  const totalPkgs = parseNumber(formData.number_of_packages) || 1
  const totalNet = parseNumber(formData.net_weight)
  const totalGross = parseNumber(formData.gross_weight)
  const rateVal = parseNumber(formData.rate_per_kgs) || 0
  const pkgType = /bags?/i.test(formData.number_of_packages || "")
    ? "Bags"
    : /units?/i.test(formData.number_of_packages || "")
    ? "Units"
    : /cartons?/i.test(formData.number_of_packages || "")
    ? "Cartons"
    : "Packages"

  // Check if multiple commodity lines exist separated by commas, semicolons, or pipes
  // e.g. "Black Raisins 399 cartons | Anardana 240 bags | Zeera 40 bags"
  const lines = cargoDesc
    .split(/[\n|;]+/)
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 2 &&
        !/^(?:CONTAINER|DOCUMENT|SHIPPING|Transit Date|Invoice NO|HS CODE|Afghan TC)/i.test(l)
    )

  if (lines.length > 1) {
    const items: ShipmentItem[] = []
    let accPkgs = 0
    let accNet = 0
    let accGross = 0

    lines.forEach((line, idx) => {
      const pkgMatch = line.match(/(\d[\d,]*)\s*(cartons?|ctns?|bags?|units?|boxes?|pkgs?)/i)
      const count = pkgMatch ? parseNumber(pkgMatch[1]) : Math.round(totalPkgs / lines.length)
      const linePkgType = pkgMatch ? (/ctn/i.test(pkgMatch[2]) ? "Cartons" : pkgMatch[2]) : pkgType
      const name = line.replace(/(\d[\d,]*)\s*(cartons?|ctns?|bags?|units?|boxes?|pkgs?)/i, "").trim() || `Item ${idx + 1}`

      const fraction = totalPkgs > 0 ? count / totalPkgs : 1 / lines.length
      const itemNet = totalNet > 0 ? roundMoney(totalNet * fraction, 2) : 0
      const itemGross = totalGross > 0 ? roundMoney(totalGross * fraction, 2) : 0
      const unitWeight = count > 0 ? roundMoney(itemNet / count, 2) : 0

      // Calculate item value: rate basis default PER_KG
      const invoiceValue = rateVal > 0 && itemNet > 0 ? roundMoney(itemNet * rateVal, 2) : 0

      accPkgs += count
      accNet += itemNet
      accGross += itemGross

      items.push({
        id: `item-${bolId}-${idx + 1}`,
        bolId,
        commodityName: name,
        hsCode: "0806.20.00",
        packageType: linePkgType,
        packageCount: count,
        unitWeight,
        unitWeightUnit: "KG",
        netWeight: itemNet,
        grossWeight: itemGross,
        quantity: itemNet > 0 ? itemNet : count,
        quantityUnit: itemNet > 0 ? "KG" : linePkgType,
        invoiceRate: rateVal,
        invoiceRateBasis: "PER_KG",
        invoiceValue,
        currency: "USD",
        originCountry: "Afghanistan",
      })
    })

    return items
  }

  // Single commodity fallback
  const commodityName =
    cargoDesc.replace(/[📦🧾🥬📄📅│|]+/g, " ").replace(/\s+/g, " ").trim() ||
    "Fresh Afghan Raisins (Kishmish)"

  const unitWeight =
    parseNumber(formData.kgs_per_carton) ||
    (totalPkgs > 0 && totalNet > 0 ? roundMoney(totalNet / totalPkgs, 2) : 16)

  const calcValue =
    parseNumber(formData.goods_value) ||
    (rateVal > 0 && totalNet > 0 ? roundMoney(totalNet * rateVal, 2) : 0)

  return [
    {
      id: `item-${bolId}-1`,
      bolId,
      commodityName,
      hsCode: "0806.20.00",
      packageType: pkgType,
      packageCount: totalPkgs,
      unitWeight,
      unitWeightUnit: "KG",
      netWeight: totalNet || totalPkgs * unitWeight,
      grossWeight: totalGross || totalNet + 500,
      quantity: totalNet || totalPkgs,
      quantityUnit: totalNet ? "KG" : pkgType,
      invoiceRate: rateVal || 3.4,
      invoiceRateBasis: "PER_KG",
      invoiceValue: calcValue,
      currency: "USD",
      originCountry: "Afghanistan",
    },
  ]
}

export function calculateGoodsValue(
  quantity: number,
  rate: number,
  basis: InvoiceRateBasis,
  packages: number,
  netWeight: number
): number {
  switch (basis) {
    case "PER_KG":
      return roundMoney(netWeight * rate, 2)
    case "PER_CARTON":
    case "PER_BAG":
      return roundMoney(packages * rate, 2)
    case "PER_UNIT":
      return roundMoney(quantity * rate, 2)
    case "LUMP_SUM":
      return roundMoney(rate, 2)
    default:
      return roundMoney(netWeight * rate, 2)
  }
}

// ==========================================
// 3. MAPPERS (BOL -> DOCUMENTS)
// ==========================================

export function mapBolToCommercialInvoice(
  bol: Partial<BillOfLadingFormData>,
  invoiceNumber: string
): CommercialInvoiceData {
  const items = deriveShipmentItemsFromBol(bol, bol.bol_number || "BOL")
  const totalPackages = items.reduce((s, i) => s + i.packageCount, 0)
  const totalNet = items.reduce((s, i) => s + i.netWeight, 0)
  const totalGross = items.reduce((s, i) => s + i.grossWeight, 0)
  const totalGoodsValue = items.reduce((s, i) => addMoney(s, i.invoiceValue, "USD"), 0)

  return {
    invoiceNumber,
    invoiceDate: cleanStr(bol.issue_date) || new Date().toISOString().split("T")[0],
    exporterName: cleanStr(bol.shipper_name) || "SKY ARIANA LOGISTICS / GENERAL EXPORTER",
    exporterAddress: cleanStr(bol.shipper_address) || "Kabul / Kandahar, Afghanistan",
    exporterPhone: cleanStr(bol.shipper_contact),
    exporterLicence: cleanStr((bol as any).shipper_licence || (bol as any).company_licence || "2401-2198"),
    buyerName: cleanStr(bol.consignee_name) || "TO ORDER",
    buyerAddress: cleanStr(bol.consignee_address) || "",
    buyerPhone: cleanStr(bol.consignee_contact),
    buyerFssai: cleanStr((bol as any).consignee_fssai),
    notifyParty: cleanStr(bol.notify_party),
    notifyPartyAddress: cleanStr(bol.notify_party_address),
    bolNumber: cleanStr(bol.bol_number) || "DRAFT-BOL",
    containerNumbers: cleanStr(bol.container_numbers) || "TCLU-PENDING",
    sealNumbers: cleanStr(bol.seal_numbers) || "SEAL-PENDING",
    items,
    totalPackages,
    packageType: items[0]?.packageType || "Cartons",
    totalNetWeight: totalNet,
    totalGrossWeight: totalGross,
    totalGoodsValue,
    currency: "USD",
    incoterms: "CFR",
    originCountry: "Afghanistan",
    destinationCountry: cleanStr(bol.place_of_delivery).includes("India") ? "India" : "United Arab Emirates",
    portOfLoading: cleanStr(bol.port_of_loading) || "Bandar Abbas Port, IR",
    portOfDischarge: cleanStr(bol.port_of_discharge) || "Nhava Sheva Port, IN",
    finalDestination: cleanStr(bol.place_of_delivery) || "Mumbai, India",
    paymentTerms: "Against B/L Documents Presentation",
    remarks: cleanStr(bol.remarks),
  }
}

export function mapBolToPackingList(
  bol: Partial<BillOfLadingFormData>,
  packingListNumber: string,
  invoiceNumber: string
): PackingListData {
  const items = deriveShipmentItemsFromBol(bol, bol.bol_number || "BOL")
  const totalPackages = items.reduce((s, i) => s + i.packageCount, 0)
  const totalNet = items.reduce((s, i) => s + i.netWeight, 0)
  const totalGross = items.reduce((s, i) => s + i.grossWeight, 0)

  return {
    packingListNumber,
    packingListDate: cleanStr(bol.issue_date) || new Date().toISOString().split("T")[0],
    invoiceNumber,
    bolNumber: cleanStr(bol.bol_number) || "DRAFT-BOL",
    exporterName: cleanStr(bol.shipper_name) || "SKY ARIANA LOGISTICS / GENERAL EXPORTER",
    exporterAddress: cleanStr(bol.shipper_address) || "Kabul / Kandahar, Afghanistan",
    consigneeName: cleanStr(bol.consignee_name) || "TO ORDER",
    consigneeAddress: cleanStr(bol.consignee_address) || "",
    notifyParty: cleanStr(bol.notify_party),
    notifyPartyAddress: cleanStr(bol.notify_party_address),
    containerNumbers: cleanStr(bol.container_numbers) || "TCLU-PENDING",
    sealNumbers: cleanStr(bol.seal_numbers) || "SEAL-PENDING",
    items,
    totalPackages,
    packageType: items[0]?.packageType || "Cartons",
    totalNetWeight: totalNet,
    totalGrossWeight: totalGross,
    measurement: cleanStr(bol.measurement) || "42.5 CBM",
    dimensions: "Standard Corrugated Export Cartons",
    originCountry: "Afghanistan",
    destinationCountry: cleanStr(bol.place_of_delivery).includes("India") ? "India" : "United Arab Emirates",
    portOfLoading: cleanStr(bol.port_of_loading) || "Bandar Abbas Port, IR",
    portOfDischarge: cleanStr(bol.port_of_discharge) || "Nhava Sheva Port, IN",
    finalDestination: cleanStr(bol.place_of_delivery) || "Mumbai, India",
    driverName: cleanStr(bol.driver_name),
    driverFatherName: cleanStr(bol.driver_father_name),
    driverContact: cleanStr(bol.driver_contact),
    truckNumber: cleanStr(bol.truck_number),
    remarks: cleanStr(bol.remarks),
  }
}

export function mapBolToSticker(
  bol: Partial<BillOfLadingFormData>,
  invoiceNumber: string
): StickerLabelData {
  const items = deriveShipmentItemsFromBol(bol, bol.bol_number || "BOL")
  const totalPackages = items.reduce((s, i) => s + i.packageCount, 0)
  const firstItem = items[0]

  return {
    bolNumber: cleanStr(bol.bol_number) || "DRAFT-BOL",
    invoiceNumber,
    shipperName: cleanStr(bol.shipper_name) || "SKY ARIANA LOGISTICS",
    consigneeName: cleanStr(bol.consignee_name) || "TO ORDER",
    productName: firstItem?.commodityName || "Afghan Dry Fruit (Raisins)",
    marksAndNumbers: cleanStr((bol as any).marks_and_numbers) || "EXPORT CARGO / 1427 CARTONS",
    totalPackages: totalPackages || 1427,
    packageType: firstItem?.packageType || "Cartons",
    originCountry: "Produce of Afghanistan",
    netWeightPerPackage: `${firstItem?.unitWeight || 16} KG`,
    grossWeightPerPackage: `${roundMoney((firstItem?.unitWeight || 16) + 0.8, 1)} KG`,
    lotNumber: cleanStr((bol as any).lot_no || (bol as any).lot_number) || "LOT-AFG-2026-01",
    expiryDate: cleanStr((bol as any).expiry_date) || "12/2027",
    packingDate: cleanStr((bol as any).packing_date) || "09/2026",
    fssaiNumber: cleanStr((bol as any).consignee_fssai) || "10021021000123",
    startNumber: 1,
    endNumber: totalPackages || 1427,
    layout: "single",
  }
}

export function mapBolToTransitPaper(
  bol: Partial<BillOfLadingFormData>,
  paperNumber: string,
  invoiceNumber: string
): TransitPaperData {
  const items = deriveShipmentItemsFromBol(bol, bol.bol_number || "BOL")
  const totalPackages = items.reduce((s, i) => s + i.packageCount, 0)
  const totalNet = items.reduce((s, i) => s + i.netWeight, 0)
  const totalGross = items.reduce((s, i) => s + i.grossWeight, 0)

  const routes = (bol.routes || []).map((r) => r.location)
  const transitBorders = ["Islam Qala (AF/IR)", "Dogharoun (IR)", "Bandar Abbas Customs"]

  return {
    paperNumber,
    issueDate: cleanStr(bol.issue_date) || new Date().toISOString().split("T")[0],
    bolNumber: cleanStr(bol.bol_number) || "DRAFT-BOL",
    invoiceNumber,
    shipperName: cleanStr(bol.shipper_name) || "SKY ARIANA LOGISTICS",
    consigneeName: cleanStr(bol.consignee_name) || "TO ORDER",
    truckNumber: cleanStr(bol.truck_number) || "کابل ۴۸۲۹۴",
    driverName: cleanStr(bol.driver_name) || "نظرمحمد یارمل",
    driverFatherName: cleanStr(bol.driver_father_name) || "عبدالحمید",
    driverContact: cleanStr(bol.driver_contact) || "(+93) 0 700 203 307",
    driverRent: cleanStr(bol.driver_rent) || "180,000",
    driverRentCurrency: bol.driver_rent_currency || "AFN",
    commodityDescription: items.map((i) => `${i.packageCount} ${i.packageType} ${i.commodityName}`).join(", "),
    totalPackages,
    packageType: items[0]?.packageType || "Cartons",
    grossWeight: totalGross,
    netWeight: totalNet,
    originLocation: cleanStr(bol.routes?.[0]?.location) || "Kandahar, Afghanistan",
    transitBorderPoints: transitBorders,
    routeDescription: routes.length ? routes.join(" ➔ ") : "Kandahar ➔ Islam Qala ➔ Dogharoun ➔ Bandar Abbas",
    destinationLocation: cleanStr(bol.routes?.at(-1)?.location) || "Bandar Abbas Port, Iran",
    containerNumber: cleanStr(bol.container_numbers) || "TCLU-PENDING",
    sealNumber: cleanStr(bol.seal_numbers) || "SEAL-PENDING",
    customsSealRequired: true,
    customsSealNote: "📍 سیل گمرک اسلام قلعه / دوغارون الزامی است",
    remarks: cleanStr(bol.cargo_route_note) || cleanStr(bol.remarks),
  }
}

export function mapBolToPhytoDraft(
  bol: Partial<BillOfLadingFormData>,
  draftNumber: string,
  invoiceNumber: string
): PhytosanitaryCertificateDraftData {
  const items = deriveShipmentItemsFromBol(bol, bol.bol_number || "BOL")
  const totalPackages = items.reduce((s, i) => s + i.packageCount, 0)
  const totalNet = items.reduce((s, i) => s + i.netWeight, 0)
  const totalGross = items.reduce((s, i) => s + i.grossWeight, 0)

  return {
    draftNumber,
    creationDate: cleanStr(bol.issue_date) || new Date().toISOString().split("T")[0],
    bolNumber: cleanStr(bol.bol_number) || "DRAFT-BOL",
    invoiceNumber,
    exporterName: cleanStr(bol.shipper_name) || "SKY ARIANA LOGISTICS / EXPORTER",
    exporterAddress: cleanStr(bol.shipper_address) || "Kandahar / Kabul, Afghanistan",
    consigneeName: cleanStr(bol.consignee_name) || "TO ORDER",
    consigneeAddress: cleanStr(bol.consignee_address) || "",
    botanicalName: "Vitis vinifera (Dried Raisins)",
    commercialDescription: items.map((i) => i.commodityName).join(", ") || "Fresh Export Quality Raisins",
    hsCode: items[0]?.hsCode || "0806.20.00",
    totalPackages,
    packageType: items[0]?.packageType || "Cartons",
    netWeight: totalNet,
    grossWeight: totalGross,
    originCountry: "Islamic Emirate of Afghanistan",
    destinationCountry: cleanStr(bol.place_of_delivery).includes("India") ? "India" : "United Arab Emirates",
    pointOfEntry: cleanStr(bol.port_of_discharge) || "Nhava Sheva Port, India",
    meansOfConveyance: "Truck & Maritime Vessel Transit",
    containerNumber: cleanStr(bol.container_numbers) || "TCLU-PENDING",
    sealNumber: cleanStr(bol.seal_numbers) || "SEAL-PENDING",
    isOfficialCertificateConfirmed: false,
    statusNotes: "PENDING OFFICIAL QUARANTINE INSPECTION & CERTIFICATE ISSUANCE",
  }
}

// ==========================================
// 4. MISSING FIELDS & STATUS RESOLUTION
// ==========================================

export function computeMissingFields(
  type: ShipmentDocumentType,
  data: any
): { missing: string[]; score: number; status: ShipmentDocumentStatus } {
  const missing: string[] = []
  let totalRequired = 5
  let filledCount = 0

  switch (type) {
    case "commercial_invoice": {
      totalRequired = 6
      if (!data.exporterName || data.exporterName.includes("PENDING")) missing.push("Exporter Name")
      else filledCount++

      if (!data.buyerName || data.buyerName === "TO ORDER") missing.push("Buyer / Consignee")
      else filledCount++

      if (!data.totalGoodsValue || data.totalGoodsValue <= 0) missing.push("Goods Value / Rate")
      else filledCount++

      if (!data.totalPackages || data.totalPackages <= 0) missing.push("Packages Count")
      else filledCount++

      if (!data.totalNetWeight || data.totalNetWeight <= 0) missing.push("Net Weight")
      else filledCount++

      if (!data.containerNumbers || data.containerNumbers.includes("PENDING")) missing.push("Container Number")
      else filledCount++
      break
    }

    case "packing_list": {
      totalRequired = 5
      if (!data.exporterName) missing.push("Exporter Name")
      else filledCount++

      if (!data.consigneeName || data.consigneeName === "TO ORDER") missing.push("Consignee")
      else filledCount++

      if (!data.totalPackages || data.totalPackages <= 0) missing.push("Packages Count")
      else filledCount++

      if (!data.totalNetWeight || data.totalNetWeight <= 0) missing.push("Net Weight")
      else filledCount++

      if (!data.containerNumbers || data.containerNumbers.includes("PENDING")) missing.push("Container Number")
      else filledCount++
      break
    }

    case "transit_paper": {
      totalRequired = 5
      if (!data.truckNumber) missing.push("Truck License Plate")
      else filledCount++

      if (!data.driverName) missing.push("Driver Name")
      else filledCount++

      if (!data.driverContact) missing.push("Driver Phone Number")
      else filledCount++

      if (!data.totalPackages || data.totalPackages <= 0) missing.push("Cargo Packages")
      else filledCount++

      if (!data.routeDescription) missing.push("Route Description")
      else filledCount++
      break
    }

    case "phytosanitary": {
      totalRequired = 4
      if (!data.botanicalName) missing.push("Botanical Plant Name")
      else filledCount++

      if (!data.commercialDescription) missing.push("Commercial Description")
      else filledCount++

      if (!data.isOfficialCertificateConfirmed && !data.officialCertificateNumber) {
        missing.push("Official Govt Certificate Number (Pending Authority)")
      } else {
        filledCount++
      }

      if (!data.inspectingAuthority) missing.push("Official Quarantine Authority")
      else filledCount++
      break
    }

    case "stickers": {
      totalRequired = 4
      if (!data.productName) missing.push("Product Label Name")
      else filledCount++

      if (!data.totalPackages || data.totalPackages <= 0) missing.push("Packages Count")
      else filledCount++

      if (!data.netWeightPerPackage) missing.push("Unit Net Weight")
      else filledCount++

      if (!data.originCountry) missing.push("Country of Origin")
      else filledCount++
      break
    }

    default:
      totalRequired = 1
      filledCount = 1
  }

  const score = Math.round((filledCount / totalRequired) * 100)
  let status: ShipmentDocumentStatus = "draft"
  if (missing.length === 0) {
    status = "ready"
  } else if (filledCount > 0) {
    status = "incomplete"
  } else {
    status = "draft"
  }

  return { missing, score, status }
}

// ==========================================
// 5. DOCUMENT PACKAGE MANAGEMENT
// ==========================================

export async function getOrCreateShipmentDocumentPackage(
  bol: Partial<BillOfLadingFormData>
): Promise<ShipmentDocumentPackage> {
  const bolNumber = cleanStr(bol.bol_number) || "DRAFT-BOL"
  const shipmentId = `SA-SHP-${bolNumber.replace(/[^A-Za-z0-9]/g, "-")}`
  const existingDocs = await getShipmentDocumentsByBol(bolNumber)

  const currentSourceHash = computeBolSourceHash(bol)
  const now = new Date().toISOString()

  // Types to ensure exist
  const types: ShipmentDocumentType[] = [
    "commercial_invoice",
    "packing_list",
    "stickers",
    "transit_paper",
    "phytosanitary",
  ]

  const docsMap: Partial<Record<ShipmentDocumentType, ShipmentDocumentRecord>> = {}
  const toSaveBatch: ShipmentDocumentRecord[] = []

  // Pre-generate numbers if needed
  const invoiceDoc = existingDocs.find((d) => d.documentType === "commercial_invoice")
  const invoiceNumber = invoiceDoc ? invoiceDoc.documentNumber : await nextCommercialInvoiceNumber()

  for (const type of types) {
    let doc = existingDocs.find((d) => d.documentType === type)

    if (!doc) {
      // 1. Create initial draft document
      let docNumber = invoiceNumber
      let payload: any

      if (type === "commercial_invoice") {
        docNumber = invoiceNumber
        payload = mapBolToCommercialInvoice(bol, docNumber)
      } else if (type === "packing_list") {
        docNumber = await nextPackingListNumber()
        payload = mapBolToPackingList(bol, docNumber, invoiceNumber)
      } else if (type === "stickers") {
        docNumber = `STK-${invoiceNumber}`
        payload = mapBolToSticker(bol, invoiceNumber)
      } else if (type === "transit_paper") {
        docNumber = await nextTransitPaperNumber()
        payload = mapBolToTransitPaper(bol, docNumber, invoiceNumber)
      } else if (type === "phytosanitary") {
        docNumber = await nextPhytoDraftNumber()
        payload = mapBolToPhytoDraft(bol, docNumber, invoiceNumber)
      }

      const { missing, score, status } = computeMissingFields(type, payload)

      doc = {
        id: `doc-${bolNumber}-${type}`,
        bolId: bolNumber,
        bolNumber,
        shipmentId,
        documentType: type,
        documentNumber: docNumber,
        status,
        currentVersion: 1,
        required: type !== "phytosanitary",
        clientVisible: type === "commercial_invoice" || type === "packing_list",
        clientDownloadable: true,
        missingFields: missing,
        completenessScore: score,
        sourceDataChanged: false,
        latestSourceHash: currentSourceHash,
        documentData: payload,
        versions: [
          {
            id: `ver-${bolNumber}-${type}-1`,
            documentId: `doc-${bolNumber}-${type}`,
            versionNumber: 1,
            status,
            documentData: payload,
            sourceSnapshot: {
              bolData: { ...bol },
              snapshotHash: currentSourceHash,
              takenAt: now,
            },
            changeReason: "Initial document package creation from BOL master",
            createdBy: "System",
            createdAt: now,
          },
        ],
        attachments: [],
        printCount: 0,
        createdAt: now,
        updatedAt: now,
      }

      toSaveBatch.push(doc)
    } else {
      if (!doc) continue
      // 2. Existing Document Handling: Auto-sync Drafts or Flag Finalized
      const isFinalized = doc.status === "approved" || doc.status === "issued"

      if (isFinalized) {
        // FINALIZED DOCUMENT PROTECTION RULE:
        // Do NOT silently alter finalized documents! Check if source changed.
        const targetVersion = doc.currentVersion
        const activeVersion = doc.versions.find((v) => v.versionNumber === targetVersion)
        const snapshotHash = activeVersion?.sourceSnapshot?.snapshotHash || ""

        if (snapshotHash && snapshotHash !== currentSourceHash) {
          doc.sourceDataChanged = true
          doc.latestSourceHash = currentSourceHash
          toSaveBatch.push(doc)
        }
      } else {
        // DRAFT AUTO-UPDATE RULE:
        // Draft documents update automatically from the updated master BOL
        let updatedPayload = doc.documentData

        if (type === "commercial_invoice") {
          updatedPayload = {
            ...updatedPayload,
            ...mapBolToCommercialInvoice(bol, doc.documentNumber),
          }
        } else if (type === "packing_list") {
          updatedPayload = {
            ...updatedPayload,
            ...mapBolToPackingList(bol, doc.documentNumber, invoiceNumber),
          }
        } else if (type === "stickers") {
          updatedPayload = {
            ...updatedPayload,
            ...mapBolToSticker(bol, invoiceNumber),
          }
        } else if (type === "transit_paper") {
          updatedPayload = {
            ...updatedPayload,
            ...mapBolToTransitPaper(bol, doc.documentNumber, invoiceNumber),
          }
        } else if (type === "phytosanitary") {
          updatedPayload = {
            ...updatedPayload,
            ...mapBolToPhytoDraft(bol, doc.documentNumber, invoiceNumber),
          }
        }

        const { missing, score, status } = computeMissingFields(type, updatedPayload)

        doc.documentData = updatedPayload
        doc.missingFields = missing
        doc.completenessScore = score
        doc.status = status
        doc.sourceDataChanged = false
        doc.latestSourceHash = currentSourceHash
        doc.updatedAt = now

        // Update active draft version
        if (doc.versions.length > 0) {
          doc.versions[0] = {
            ...doc.versions[0],
            documentData: updatedPayload,
            status,
            sourceSnapshot: {
              bolData: { ...bol },
              snapshotHash: currentSourceHash,
              takenAt: now,
            },
          }
        }

        toSaveBatch.push(doc)
      }
    }

    docsMap[type] = doc
  }

  if (toSaveBatch.length > 0) {
    await saveShipmentDocumentsBatch(toSaveBatch)
  }

  // Summary calculation
  const allDocs = Object.values(docsMap) as ShipmentDocumentRecord[]
  const readyCount = allDocs.filter((d) => d.status === "ready" || d.status === "approved" || d.status === "issued").length
  const missingSummary = allDocs
    .filter((d) => d.missingFields.length > 0)
    .map((d) => ({
      documentType: d.documentType,
      missingFields: d.missingFields,
    }))

  return {
    bolNumber,
    shipmentId,
    customerName: cleanStr(bol.consignee_name) || cleanStr(bol.shipper_name) || "Customer",
    destination: cleanStr(bol.place_of_delivery) || "Destination",
    containerNumbers: cleanStr(bol.container_numbers) || "",
    truckNumber: cleanStr(bol.truck_number) || "",
    documentsReadyCount: readyCount,
    documentsTotalCount: allDocs.length,
    isPackageComplete: readyCount >= allDocs.filter((d) => d.required).length,
    missingSummary,
    documents: docsMap as Record<ShipmentDocumentType, ShipmentDocumentRecord>,
    updatedAt: now,
  }
}

// ==========================================
// 6. FINALIZE & REVISIONS
// ==========================================

export async function finalizeDocument(
  documentId: string,
  user = "Authorized User"
): Promise<ShipmentDocumentRecord> {
  const doc = await getShipmentDocumentById(documentId)
  if (!doc) throw new Error(`Document ${documentId} not found`)

  const now = new Date().toISOString()
  doc.status = "issued"
  doc.sourceDataChanged = false
  doc.updatedAt = now

  const activeVer = doc.versions.find((v) => v.versionNumber === doc.currentVersion)
  if (activeVer) {
    activeVer.status = "issued"
    activeVer.finalizedAt = now
  }

  return saveShipmentDocument(doc)
}

export async function createDocumentRevision(
  documentId: string,
  reason: string,
  user = "Authorized User",
  latestBolData?: Partial<BillOfLadingFormData>
): Promise<ShipmentDocumentRecord> {
  const doc = await getShipmentDocumentById(documentId)
  if (!doc) throw new Error(`Document ${documentId} not found`)

  const now = new Date().toISOString()
  const nextVer = doc.currentVersion + 1

  let updatedData = doc.documentData
  if (latestBolData) {
    if (doc.documentType === "commercial_invoice") {
      updatedData = mapBolToCommercialInvoice(latestBolData, doc.documentNumber)
    } else if (doc.documentType === "packing_list") {
      updatedData = mapBolToPackingList(latestBolData, doc.documentNumber, (updatedData as any).invoiceNumber || doc.documentNumber)
    } else if (doc.documentType === "transit_paper") {
      updatedData = mapBolToTransitPaper(latestBolData, doc.documentNumber, (updatedData as any).invoiceNumber || doc.documentNumber)
    }
  }

  const { missing, score, status } = computeMissingFields(doc.documentType, updatedData)

  const newVersion: DocumentVersionRecord = {
    id: `ver-${doc.bolNumber}-${doc.documentType}-${nextVer}`,
    documentId: doc.id,
    versionNumber: nextVer,
    status: "draft",
    documentData: updatedData,
    sourceSnapshot: {
      bolData: latestBolData || {},
      snapshotHash: latestBolData ? computeBolSourceHash(latestBolData) : doc.latestSourceHash,
      takenAt: now,
    },
    changeReason: reason || `Revision ${nextVer} created`,
    createdBy: user,
    createdAt: now,
  }

  doc.currentVersion = nextVer
  doc.status = status
  doc.documentData = updatedData
  doc.missingFields = missing
  doc.completenessScore = score
  doc.sourceDataChanged = false
  doc.versions.unshift(newVersion)
  doc.updatedAt = now

  return saveShipmentDocument(doc)
}

// ==========================================
// 7. BULK HISTORICAL DOCUMENT CREATION
// ==========================================

export async function bulkCreateShipmentDocuments(
  bols: Array<Partial<BillOfLadingFormData>>
): Promise<BulkDocumentCreationReport> {
  const report: BulkDocumentCreationReport = {
    bolsProcessed: 0,
    commercialInvoicesCreated: 0,
    packingListsCreated: 0,
    stickersCreated: 0,
    transitPapersCreated: 0,
    phytoDraftsCreated: 0,
    alreadyExistingCount: 0,
    incompleteCount: 0,
    errorsCount: 0,
    details: [],
  }

  for (const bol of bols) {
    if (!bol.bol_number) continue
    report.bolsProcessed++

    try {
      const existing = await getShipmentDocumentsByBol(bol.bol_number)
      if (existing.length >= 5) {
        report.alreadyExistingCount++
        report.details.push({
          bolNumber: bol.bol_number,
          status: "already_exists",
          createdTypes: [],
          message: "All 5 standard document records already present",
        })
        continue
      }

      const pkg = await getOrCreateShipmentDocumentPackage(bol)
      report.commercialInvoicesCreated++
      report.packingListsCreated++
      report.stickersCreated++
      report.transitPapersCreated++
      report.phytoDraftsCreated++

      if (!pkg.isPackageComplete) {
        report.incompleteCount++
      }

      report.details.push({
        bolNumber: bol.bol_number,
        status: pkg.isPackageComplete ? "created" : "incomplete",
        createdTypes: [
          "commercial_invoice",
          "packing_list",
          "stickers",
          "transit_paper",
          "phytosanitary",
        ],
      })
    } catch (err: any) {
      report.errorsCount++
      report.details.push({
        bolNumber: bol.bol_number,
        status: "error",
        createdTypes: [],
        message: err.message,
      })
    }
  }

  return report
}

// ==========================================
// 8. DOCUMENT INTEGRITY & MISMATCH AUDIT
// ==========================================

export async function checkDocumentIntegrity(
  bol: Partial<BillOfLadingFormData>
): Promise<DocumentIntegrityIssue[]> {
  const issues: DocumentIntegrityIssue[] = []
  const bolNumber = cleanStr(bol.bol_number)
  if (!bolNumber) return issues

  const docs = await getShipmentDocumentsByBol(bolNumber)
  const ci = docs.find((d) => d.documentType === "commercial_invoice")?.documentData as CommercialInvoiceData | undefined
  const pl = docs.find((d) => d.documentType === "packing_list")?.documentData as PackingListData | undefined
  const tp = docs.find((d) => d.documentType === "transit_paper")?.documentData as TransitPaperData | undefined

  const bolConsignee = cleanStr(bol.consignee_name)
  const bolContainer = cleanStr(bol.container_numbers)
  const bolTruck = cleanStr(bol.truck_number)
  const bolPkgs = parseNumber(bol.number_of_packages)
  const bolNet = parseNumber(bol.net_weight)

  // 1. Check Commercial Invoice
  if (ci) {
    if (bolConsignee && ci.buyerName && bolConsignee !== "TO ORDER" && ci.buyerName !== "TO ORDER" && bolConsignee !== ci.buyerName) {
      issues.push({
        bolNumber,
        fieldName: "Consignee / Buyer",
        bolValue: bolConsignee,
        documentType: "commercial_invoice",
        documentValue: ci.buyerName,
        severity: "error",
      })
    }
    if (bolContainer && ci.containerNumbers && bolContainer !== ci.containerNumbers) {
      issues.push({
        bolNumber,
        fieldName: "Container Number",
        bolValue: bolContainer,
        documentType: "commercial_invoice",
        documentValue: ci.containerNumbers,
        severity: "error",
      })
    }
    if (bolPkgs > 0 && ci.totalPackages > 0 && bolPkgs !== ci.totalPackages) {
      issues.push({
        bolNumber,
        fieldName: "Total Packages",
        bolValue: bolPkgs,
        documentType: "commercial_invoice",
        documentValue: ci.totalPackages,
        severity: "warning",
      })
    }
    if (bolNet > 0 && ci.totalNetWeight > 0 && Math.abs(bolNet - ci.totalNetWeight) > 5) {
      issues.push({
        bolNumber,
        fieldName: "Net Weight",
        bolValue: bolNet,
        documentType: "commercial_invoice",
        documentValue: ci.totalNetWeight,
        severity: "warning",
      })
    }
  }

  // 2. Check Packing List
  if (pl) {
    if (bolContainer && pl.containerNumbers && bolContainer !== pl.containerNumbers) {
      issues.push({
        bolNumber,
        fieldName: "Container Number",
        bolValue: bolContainer,
        documentType: "packing_list",
        documentValue: pl.containerNumbers,
        severity: "error",
      })
    }
    if (bolPkgs > 0 && pl.totalPackages > 0 && bolPkgs !== pl.totalPackages) {
      issues.push({
        bolNumber,
        fieldName: "Total Packages",
        bolValue: bolPkgs,
        documentType: "packing_list",
        documentValue: pl.totalPackages,
        severity: "warning",
      })
    }
  }

  // 3. Check Transit Paper
  if (tp) {
    if (bolTruck && tp.truckNumber && bolTruck !== tp.truckNumber) {
      issues.push({
        bolNumber,
        fieldName: "Truck License Plate",
        bolValue: bolTruck,
        documentType: "transit_paper",
        documentValue: tp.truckNumber,
        severity: "error",
      })
    }
    if (bol.driver_name && tp.driverName && cleanStr(bol.driver_name) !== cleanStr(tp.driverName)) {
      issues.push({
        bolNumber,
        fieldName: "Driver Name",
        bolValue: cleanStr(bol.driver_name),
        documentType: "transit_paper",
        documentValue: tp.driverName,
        severity: "warning",
      })
    }
  }

  return issues
}
