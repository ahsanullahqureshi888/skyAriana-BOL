import {
  generateShippingDocumentsPDF,
  type ShippingDocumentData,
  type StickerLayout,
} from "../lib/utils/shipping-documents.ts"

const data: ShippingDocumentData = {
  bolNumber: "BOL-TEST-001",
  bookingNumber: "BK-001",
  invoiceNumber: "INV-001",
  invoiceDate: "2026-09-10",
  date: "2026-09-10",
  packingDateMonthYear: "SEP.2026",
  expiryDateMonthYear: "SEP.2028",
  shipper: "NAJEB AMIN LTD",
  shipperAddress: "Shorandam Industrial Park, Kandahar, Afghanistan",
  shipperPhone: "+93 700 000 000",
  shipperLicence: "27-975",
  consignee: "NTC NUTS AND SPICES LLP",
  consigneeAddress: "Hyderabad, Telangana, India",
  consigneePhone: "+91 90000 00000",
  consigneeFssai: "13621999000079",
  consigneeEmail: "imports@example.com",
  notifyParty: "",
  notifyPartyAddress: "",
  containerNumber: "MSCU1234567",
  sealNumber: "SL-001",
  containers: [],
  vesselName: "TEST VESSEL",
  voyageNumber: "V001",
  portOfLoading: "KARACHI",
  portOfDischarge: "MUNDRA",
  finalDestination: "HYDERABAD",
  commodity: "DRY APRICOT",
  hsCode: "081310",
  packageCount: 12,
  packageCountText: "12",
  packageType: "Cartons",
  grossWeight: "204 KG",
  netWeight: "192 KG",
  measurement: "1.20 CBM",
  containerType: "40HC",
  marksAndNumbers: "N/M",
  commodities: [],
  companyName: "SKY ARIANA LIMITED",
  companySubtitle: "International Transportation • Transit • Forwarding",
  companyPhone: "",
  companyEmail: "",
  companyAddress: "",
  companyLicence: "",
}

async function assertPdf(layout: StickerLayout, quantity: number, expectedPages: number): Promise<void> {
  const blob = await generateShippingDocumentsPDF({
    kind: "stickers",
    data,
    stickerLayout: layout,
    stickerQuantity: quantity,
  })
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const text = new TextDecoder("latin1").decode(bytes)
  const pages = text.match(/\/Type\s*\/Page\b/g)?.length || 0
  if (blob.type !== "application/pdf" || text.slice(0, 5) !== "%PDF-" || pages !== expectedPages) {
    throw new Error(`${layout} layout: expected ${expectedPages} valid PDF pages, got ${pages}`)
  }
  console.log(`${layout}: ${quantity} labels -> ${pages} pages (${bytes.byteLength} bytes)`)
}

await assertPdf("sheet", 12, 2)
await assertPdf("single", 3, 3)

const packingBlob = await generateShippingDocumentsPDF({ kind: "packing-list", data })
const packingText = new TextDecoder("latin1").decode(new Uint8Array(await packingBlob.arrayBuffer()))
if (packingText.slice(0, 5) !== "%PDF-" || (packingText.match(/\/Type\s*\/Page\b/g)?.length || 0) !== 1) {
  throw new Error("Packing list did not produce a valid single-page PDF")
}
console.log(`packing-list: 1 page (${packingBlob.size} bytes)`)
