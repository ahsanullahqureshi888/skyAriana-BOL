import { jsPDF } from "jspdf"
import { registerPDFFonts, setSmartPDFFont } from "@/lib/utils/pdf-fonts"
import { isPashtoOrArabic, prepareBidiPdfText } from "@/lib/utils/pashto-bidi"
import type {
  CommercialInvoiceData,
  PackingListData,
  TransitPaperData,
  PhytosanitaryCertificateDraftData,
  StickerLabelData,
  ShipmentDocumentPackage,
} from "@/lib/types/shipment-document-package"

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const BRAND_NAVY = [15, 23, 42] as const
const BRAND_BLUE = [30, 58, 138] as const
const BRAND_GOLD = [217, 119, 6] as const
const TEXT_MUTED = [100, 116, 139] as const
const BORDER_COLOR = [226, 232, 240] as const

export function renderHeader(
  doc: jsPDF,
  title: string,
  docNumber: string,
  docDate: string,
  companyName = "SKY ARIANA LIMITED"
) {
  // Top Header Banner
  doc.setFillColor(30, 58, 138)
  doc.rect(10, 10, 190, 22, "F")

  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text(companyName, 15, 19)

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text("International Transport, Logistics & Customs Transit Services", 15, 26)

  // Title on right
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.text(title.toUpperCase(), 195, 19, { align: "right" })

  doc.setFontSize(9)
  doc.text(`Ref: ${docNumber}  |  Date: ${docDate}`, 195, 26, { align: "right" })
}

// 1. COMMERCIAL INVOICE PDF
export function addCommercialInvoicePage(doc: jsPDF, data: CommercialInvoiceData) {
  renderHeader(doc, "Commercial Invoice", data.invoiceNumber, data.invoiceDate, data.exporterName)

  let y = 38

  // Exporter & Buyer Info Box
  doc.setDrawColor(...BORDER_COLOR)
  doc.setLineWidth(0.3)
  doc.setFillColor(248, 250, 252)
  doc.rect(10, y, 92, 38, "FD")
  doc.rect(108, y, 92, 38, "FD")

  // Exporter
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BRAND_BLUE)
  doc.text("EXPORTER / SHIPPER:", 13, y + 6)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BRAND_NAVY)
  doc.setFontSize(8.5)
  doc.text(data.exporterName.slice(0, 45), 13, y + 12)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(data.exporterAddress.slice(0, 90), 13, y + 18, { maxWidth: 86 })
  if (data.exporterLicence) doc.text(`License No: ${data.exporterLicence}`, 13, y + 33)

  // Buyer
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BRAND_BLUE)
  doc.text("BUYER / CONSIGNEE:", 111, y + 6)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BRAND_NAVY)
  doc.setFontSize(8.5)
  doc.text(data.buyerName.slice(0, 45), 111, y + 12)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(data.buyerAddress.slice(0, 90), 111, y + 18, { maxWidth: 86 })
  if (data.buyerFssai) doc.text(`FSSAI: ${data.buyerFssai}`, 111, y + 33)

  y += 42

  // Shipping & Trade Details Bar
  doc.setFillColor(241, 245, 249)
  doc.rect(10, y, 190, 16, "FD")
  doc.setFontSize(7)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BRAND_NAVY)

  doc.text("B/L NUMBER:", 13, y + 5)
  doc.text("CONTAINER:", 60, y + 5)
  doc.text("SEAL NO:", 110, y + 5)
  doc.text("INCOTERMS:", 155, y + 5)

  doc.setFont("helvetica", "normal")
  doc.setTextColor(...TEXT_MUTED)
  doc.text(data.bolNumber, 13, y + 11)
  doc.text(data.containerNumbers || "N/A", 60, y + 11)
  doc.text(data.sealNumbers || "N/A", 110, y + 11)
  doc.text(`${data.incoterms} - ${data.finalDestination}`, 155, y + 11)

  y += 20

  // Commodity Line Items Table Header
  doc.setFillColor(30, 58, 138)
  doc.rect(10, y, 190, 8, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.text("#", 13, y + 5.5)
  doc.text("Description of Goods", 22, y + 5.5)
  doc.text("HS Code", 85, y + 5.5)
  doc.text("Packages", 110, y + 5.5)
  doc.text("Net Wt (KG)", 135, y + 5.5)
  doc.text("Unit Rate", 160, y + 5.5)
  doc.text("Amount (USD)", 195, y + 5.5, { align: "right" })

  y += 8

  // Rows
  doc.setTextColor(...BRAND_NAVY)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)

  data.items.forEach((item, idx) => {
    const bg = idx % 2 === 0 ? 255 : 248
    doc.setFillColor(bg, bg, bg)
    doc.rect(10, y, 190, 8, "FD")

    doc.text(String(idx + 1), 13, y + 5.5)
    doc.text(item.commodityName.slice(0, 35), 22, y + 5.5)
    doc.text(item.hsCode || "0806.20.00", 85, y + 5.5)
    doc.text(`${item.packageCount} ${item.packageType}`, 110, y + 5.5)
    doc.text(`${item.netWeight.toLocaleString()} KG`, 135, y + 5.5)
    doc.text(`$${item.invoiceRate.toFixed(2)} / ${item.invoiceRateBasis.replace("PER_", "")}`, 160, y + 5.5)
    doc.text(`$${item.invoiceValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 195, y + 5.5, { align: "right" })
    y += 8
  })

  // Totals Row
  doc.setFillColor(241, 245, 249)
  doc.rect(10, y, 190, 10, "FD")
  doc.setFont("helvetica", "bold")
  doc.text("TOTALS:", 22, y + 6.5)
  doc.text(`${data.totalPackages.toLocaleString()} ${data.packageType}`, 110, y + 6.5)
  doc.text(`${data.totalNetWeight.toLocaleString()} KG`, 135, y + 6.5)
  doc.setTextColor(...BRAND_GOLD)
  doc.text(`USD $${data.totalGoodsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 195, y + 6.5, { align: "right" })

  y += 20

  // Declaration & Signature Box
  doc.setDrawColor(...BORDER_COLOR)
  doc.rect(10, y, 190, 30, "D")
  doc.setFontSize(7)
  doc.setFont("helvetica", "italic")
  doc.setTextColor(...TEXT_MUTED)
  doc.text(
    "We declare that this commercial invoice shows the actual price of the goods described and that all particulars are true and correct.",
    13,
    y + 6
  )
  doc.text(
    "Origin: Islamic Emirate of Afghanistan. Transit Border: Islam Qala / Dogharoun. Port of Exit: Bandar Abbas.",
    13,
    y + 11
  )

  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BRAND_NAVY)
  doc.text("For & on behalf of Exporter:", 140, y + 19)
  doc.setFont("helvetica", "normal")
  doc.text("Authorized Signatory & Stamp", 140, y + 26)
}

// 2. PACKING LIST PDF
export function addPackingListPage(doc: jsPDF, data: PackingListData) {
  renderHeader(doc, "Export Packing List", data.packingListNumber, data.packingListDate, data.exporterName)

  let y = 38

  // Exporter & Consignee Box
  doc.setDrawColor(...BORDER_COLOR)
  doc.setFillColor(248, 250, 252)
  doc.rect(10, y, 92, 34, "FD")
  doc.rect(108, y, 92, 34, "FD")

  doc.setFontSize(7.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BRAND_BLUE)
  doc.text("EXPORTER / SHIPPER:", 13, y + 6)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BRAND_NAVY)
  doc.text(data.exporterName.slice(0, 45), 13, y + 12)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(data.exporterAddress.slice(0, 90), 13, y + 18, { maxWidth: 86 })

  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BRAND_BLUE)
  doc.text("CONSIGNEE / BUYER:", 111, y + 6)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BRAND_NAVY)
  doc.text(data.consigneeName.slice(0, 45), 111, y + 12)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(data.consigneeAddress.slice(0, 90), 111, y + 18, { maxWidth: 86 })

  y += 38

  // Transport details bar
  doc.setFillColor(241, 245, 249)
  doc.rect(10, y, 190, 14, "FD")
  doc.setFontSize(7)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BRAND_NAVY)
  doc.text("CONTAINER NO:", 13, y + 5)
  doc.text("SEAL NO:", 65, y + 5)
  doc.text("TRUCK NO:", 115, y + 5)
  doc.text("DRIVER:", 155, y + 5)

  doc.setFont("helvetica", "normal")
  doc.setTextColor(...TEXT_MUTED)
  doc.text(data.containerNumbers || "N/A", 13, y + 10)
  doc.text(data.sealNumbers || "N/A", 65, y + 10)
  doc.text(data.truckNumber || "N/A", 115, y + 10)
  doc.text(`${data.driverName || "N/A"} (${data.driverContact || ""})`, 155, y + 10)

  y += 18

  // Items Table
  doc.setFillColor(30, 58, 138)
  doc.rect(10, y, 190, 8, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.text("#", 13, y + 5.5)
  doc.text("Commodity & Packaging", 22, y + 5.5)
  doc.text("Packages", 90, y + 5.5)
  doc.text("Unit Wt", 120, y + 5.5)
  doc.text("Net Weight (KG)", 150, y + 5.5)
  doc.text("Gross Weight (KG)", 195, y + 5.5, { align: "right" })

  y += 8
  doc.setTextColor(...BRAND_NAVY)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)

  data.items.forEach((item, idx) => {
    const bg = idx % 2 === 0 ? 255 : 248
    doc.setFillColor(bg, bg, bg)
    doc.rect(10, y, 190, 8, "FD")

    doc.text(String(idx + 1), 13, y + 5.5)
    doc.text(item.commodityName.slice(0, 40), 22, y + 5.5)
    doc.text(`${item.packageCount} ${item.packageType}`, 90, y + 5.5)
    doc.text(`${item.unitWeight} KG`, 120, y + 5.5)
    doc.text(`${item.netWeight.toLocaleString()} KG`, 150, y + 5.5)
    doc.text(`${item.grossWeight.toLocaleString()} KG`, 195, y + 5.5, { align: "right" })
    y += 8
  })

  // Totals
  doc.setFillColor(241, 245, 249)
  doc.rect(10, y, 190, 9, "FD")
  doc.setFont("helvetica", "bold")
  doc.text("GRAND TOTALS:", 22, y + 6)
  doc.text(`${data.totalPackages.toLocaleString()} ${data.packageType}`, 90, y + 6)
  doc.text(`${data.totalNetWeight.toLocaleString()} KG`, 150, y + 6)
  doc.text(`${data.totalGrossWeight.toLocaleString()} KG`, 195, y + 6, { align: "right" })

  y += 25
  doc.setDrawColor(...BORDER_COLOR)
  doc.rect(10, y, 190, 24, "D")
  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...TEXT_MUTED)
  doc.text(`Origin: ${data.originCountry} | Destination: ${data.destinationCountry} | Measurement: ${data.measurement || "42.5 CBM"}`, 13, y + 6)
  doc.text("Cargo packed in export-standard heavy-duty corrugated cartons suitable for maritime transit.", 13, y + 12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BRAND_NAVY)
  doc.text("Checked & Authorized by Warehouse Lead:", 135, y + 19)
}

// 3. TRANSIT PAPER PDF
export function addTransitPaperPage(doc: jsPDF, data: TransitPaperData) {
  renderHeader(doc, "Overland Transit Manifest", data.paperNumber, data.issueDate, data.shipperName)

  let y = 38

  // Truck & Driver Highlight Box
  doc.setFillColor(254, 243, 199) // amber-100
  doc.setDrawColor(245, 158, 11) // amber-500
  doc.rect(10, y, 190, 26, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(180, 83, 9)
  doc.text("AFGHAN OVERLAND TRANSIT PERMIT / مجوز ترانزیت جاده‌ای", 15, y + 7)

  doc.setFontSize(8.5)
  doc.setTextColor(...BRAND_NAVY)
  doc.text(`Truck Plate: ${data.truckNumber}`, 15, y + 14)
  doc.text(`Driver Name: ${data.driverName} s/o ${data.driverFatherName || "—"}`, 15, y + 21)
  doc.text(`Driver Contact: ${data.driverContact}`, 115, y + 14)
  doc.text(`Driver Rent: ${data.driverRent} ${data.driverRentCurrency || "AFN"}`, 115, y + 21)

  y += 32

  // Route & Border Stations
  doc.setDrawColor(...BORDER_COLOR)
  doc.setFillColor(248, 250, 252)
  doc.rect(10, y, 190, 22, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND_BLUE)
  doc.text("AUTHORIZED TRANSIT ROUTE & BORDER CHECKPOINTS:", 13, y + 6)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...BRAND_NAVY)
  doc.text(data.routeDescription, 13, y + 13)

  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(`Designated Border Stations: ${data.transitBorderPoints.join("  ➔  ")}`, 13, y + 19)

  y += 28

  // Cargo & Container Manifest
  doc.setFillColor(30, 58, 138)
  doc.rect(10, y, 190, 8, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.text("Manifested Cargo Description", 13, y + 5.5)
  doc.text("Packages", 100, y + 5.5)
  doc.text("Net Wt", 135, y + 5.5)
  doc.text("Gross Wt", 165, y + 5.5)
  doc.text("Container / Seal", 195, y + 5.5, { align: "right" })

  y += 8
  doc.setFillColor(255, 255, 255)
  doc.rect(10, y, 190, 14, "FD")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND_NAVY)
  doc.text(data.commodityDescription.slice(0, 55), 13, y + 6)
  doc.text(`${data.totalPackages} ${data.packageType}`, 100, y + 6)
  doc.text(`${data.netWeight.toLocaleString()} KG`, 135, y + 6)
  doc.text(`${data.grossWeight.toLocaleString()} KG`, 165, y + 6)
  doc.text(`${data.containerNumber || "TCLU"} / ${data.sealNumber || "SEAL"}`, 195, y + 6, { align: "right" })

  y += 22

  // Customs Seal & Border Control Stamps Section
  doc.setDrawColor(...BORDER_COLOR)
  doc.rect(10, y, 92, 38, "D")
  doc.rect(108, y, 92, 38, "D")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND_BLUE)
  doc.text("BORDER STATION 1: ISLAM QALA CUSTOMS", 13, y + 6)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MUTED)
  doc.text("Customs Inspection & Seal Verification:", 13, y + 12)
  doc.text("[  ] Physical Cargo Matches BOL Manifest", 13, y + 17)
  doc.text("[  ] Container Seal Number Verified Intact", 13, y + 22)
  doc.text("Customs Officer Signature: __________________", 13, y + 32)

  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BRAND_BLUE)
  doc.text("BORDER STATION 2: DOGHAROUN / IRAN CUSTOMS", 111, y + 6)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...TEXT_MUTED)
  doc.text("Transit Escort & Weight Verification:", 111, y + 12)
  doc.text("[  ] Weight Scale Passed", 111, y + 17)
  doc.text("[  ] TIR / Overland Transit Carnet Endorsed", 111, y + 22)
  doc.text("Port Inspector Signature: __________________", 111, y + 32)
}

// 4. PHYTOSANITARY CERTIFICATE DRAFT PDF
export function addPhytoDraftPage(doc: jsPDF, data: PhytosanitaryCertificateDraftData) {
  renderHeader(doc, "Phytosanitary Inspection Draft", data.draftNumber, data.creationDate, data.exporterName)

  let y = 38

  // Official Notice Banner
  doc.setFillColor(254, 226, 226) // rose-100
  doc.setDrawColor(225, 29, 72) // rose-600
  doc.rect(10, y, 190, 14, "FD")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(190, 18, 60)
  doc.text("INTERNAL DRAFT ONLY — PENDING OFFICIAL MINISTRY QUARANTINE STAMP & SIGNATURE", 15, y + 6)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.text("This draft prepares export data. Final clearance requires legitimate government quarantine approval.", 15, y + 11)

  y += 18

  // Plant Quarantine Manifest Info
  doc.setDrawColor(...BORDER_COLOR)
  doc.setFillColor(248, 250, 252)
  doc.rect(10, y, 190, 48, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND_BLUE)
  doc.text("1. EXPORTER (Name & Address):", 13, y + 6)
  doc.text("2. DECLARED CONSIGNEE:", 105, y + 6)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(...BRAND_NAVY)
  doc.text(data.exporterName, 13, y + 11)
  doc.text(data.exporterAddress.slice(0, 80), 13, y + 15, { maxWidth: 85 })

  doc.text(data.consigneeName, 105, y + 11)
  doc.text(data.consigneeAddress.slice(0, 80), 105, y + 15, { maxWidth: 85 })

  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BRAND_BLUE)
  doc.text("3. BOTANICAL NAME:", 13, y + 26)
  doc.text("4. COMMERCIAL CARGO DESCRIPTION:", 105, y + 26)

  doc.setFont("helvetica", "italic")
  doc.setTextColor(...BRAND_NAVY)
  doc.text(data.botanicalName || "Vitis vinifera", 13, y + 31)
  doc.setFont("helvetica", "normal")
  doc.text(data.commercialDescription, 105, y + 31)

  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BRAND_BLUE)
  doc.text("5. PACKAGES & WEIGHT:", 13, y + 38)
  doc.text("6. POINT OF ENTRY & CONVEYANCE:", 105, y + 38)

  doc.setFont("helvetica", "normal")
  doc.setTextColor(...BRAND_NAVY)
  doc.text(`${data.totalPackages} ${data.packageType}  |  Net: ${data.netWeight.toLocaleString()} KG  |  Gross: ${data.grossWeight.toLocaleString()} KG`, 13, y + 43)
  doc.text(`${data.pointOfEntry || "Nhava Sheva, IN"} via ${data.meansOfConveyance}`, 105, y + 43)

  y += 54

  // Disinfestation & Treatment Box
  doc.rect(10, y, 190, 30, "D")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND_BLUE)
  doc.text("DISINFESTATION AND / OR DISINFECTION TREATMENT:", 13, y + 6)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(`Date of Treatment: ${data.treatmentDate || "Pending Application"}`, 13, y + 12)
  doc.text(`Treatment Type: ${data.treatmentType || "Fumigation / Cold Storage Treatment"}`, 13, y + 17)
  doc.text(`Chemical Active Ingredient: ${data.chemicalActiveIngredient || "Methyl Bromide / Approved Organic Gas"}`, 13, y + 22)
  doc.text(`Duration & Temperature: ${data.durationAndTemperature || "24 Hours @ Ambient Warehouse Temperature"}`, 105, y + 12)
  doc.text(`Concentration: ${data.concentration || "Standard Export Dosage"}`, 105, y + 17)

  y += 36

  // Official Seal & Signature Placeholder
  doc.setDrawColor(...BORDER_COLOR)
  doc.rect(10, y, 190, 28, "D")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND_NAVY)
  doc.text("Official Inspection Certificate Details:", 13, y + 6)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(`Certificate No: ${data.officialCertificateNumber || "[ PENDING OFFICIAL REGISTRATION ]"}`, 13, y + 12)
  doc.text(`Quarantine Authority: ${data.inspectingAuthority || "Ministry of Agriculture, Plant Quarantine Dept."}`, 13, y + 17)
  doc.text("Official Seal & Stamp:", 140, y + 12)
  doc.text("Authorized Inspector Signature: _______________", 140, y + 24)
}

// 5. STICKER LABELS SUMMARY PDF
export function addStickersSummaryPage(doc: jsPDF, data: StickerLabelData) {
  renderHeader(doc, "Export Carton Labels (Sample)", `STK-${data.bolNumber}`, new Date().toISOString().split("T")[0], data.shipperName)

  let y = 38

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(
    `Master Sticker Sheet for ${data.totalPackages} ${data.packageType}. Displaying representative labels (Numbers ${data.startNumber} to ${Math.min(data.startNumber + 3, data.endNumber)} of ${data.totalPackages}):`,
    10,
    y
  )

  y += 6

  // Render 4 sample label tiles on an A4 sheet (2x2 grid)
  const tileW = 90
  const tileH = 50
  const positions = [
    { x: 10, y: y },
    { x: 110, y: y },
    { x: 10, y: y + 55 },
    { x: 110, y: y + 55 },
  ]

  positions.forEach((pos, idx) => {
    const pkgNum = data.startNumber + idx
    if (pkgNum > data.endNumber) return

    doc.setDrawColor(15, 23, 42)
    doc.setLineWidth(0.6)
    doc.setFillColor(255, 255, 255)
    doc.rect(pos.x, pos.y, tileW, tileH, "FD")

    // Label Header
    doc.setFillColor(30, 58, 138)
    doc.rect(pos.x, pos.y, tileW, 8, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.text("AFGHAN EXPORT CARGO", pos.x + tileW / 2, pos.y + 5.5, { align: "center" })

    // Label Content
    doc.setTextColor(...BRAND_NAVY)
    doc.setFontSize(7)
    doc.text(`PRODUCT: ${data.productName.slice(0, 30)}`, pos.x + 4, pos.y + 13)
    doc.text(`EXPORTER: ${data.shipperName.slice(0, 30)}`, pos.x + 4, pos.y + 18)
    doc.text(`IMPORTER: ${data.consigneeName.slice(0, 30)}`, pos.x + 4, pos.y + 23)
    doc.text(`LOT NO: ${data.lotNumber || "LOT-01"}  |  B/L: ${data.bolNumber}`, pos.x + 4, pos.y + 28)
    doc.text(`NET WT: ${data.netWeightPerPackage}  |  GROSS WT: ${data.grossWeightPerPackage}`, pos.x + 4, pos.y + 33)
    doc.text(`FSSAI: ${data.fssaiNumber || "10021021000123"}`, pos.x + 4, pos.y + 38)

    // Numbering Badge (e.g. 1 / 1427)
    doc.setFillColor(254, 243, 199)
    doc.rect(pos.x + 4, pos.y + 41, 40, 6, "F")
    doc.setTextColor(180, 83, 9)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.text(`CARTON NO: ${pkgNum} / ${data.totalPackages}`, pos.x + 6, pos.y + 45.5)

    // Origin Badge
    doc.setTextColor(...BRAND_BLUE)
    doc.setFontSize(6.5)
    doc.text("PRODUCE OF AFGHANISTAN", pos.x + tileW - 4, pos.y + 45.5, { align: "right" })
  })
}

// 6. MASTER COMBINED PDF PACKAGE GENERATOR
export async function generateCompleteShipmentPdfPackage(
  pkg: ShipmentDocumentPackage
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  await registerPDFFonts(doc)

  const ci = pkg.documents.commercial_invoice?.documentData as CommercialInvoiceData
  const pl = pkg.documents.packing_list?.documentData as PackingListData
  const tp = pkg.documents.transit_paper?.documentData as TransitPaperData
  const phyto = pkg.documents.phytosanitary?.documentData as PhytosanitaryCertificateDraftData
  const stk = pkg.documents.stickers?.documentData as StickerLabelData

  // 1. Page 1: Commercial Invoice
  if (ci) {
    addCommercialInvoicePage(doc, ci)
  }

  // 2. Page 2: Packing List
  if (pl) {
    doc.addPage()
    addPackingListPage(doc, pl)
  }

  // 3. Page 3: Transit Paper
  if (tp) {
    doc.addPage()
    addTransitPaperPage(doc, tp)
  }

  // 4. Page 4: Phytosanitary Certificate Draft
  if (phyto) {
    doc.addPage()
    addPhytoDraftPage(doc, phyto)
  }

  // 5. Page 5: Sticker Summary
  if (stk) {
    doc.addPage()
    addStickersSummaryPage(doc, stk)
  }

  return doc
}
