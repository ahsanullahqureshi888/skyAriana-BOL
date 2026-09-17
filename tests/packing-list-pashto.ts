import { generateShippingDocumentsPDF, type ShippingDocumentData } from "../lib/utils/shipping-documents"
import assert from "node:assert"

async function run() {
  const data: ShippingDocumentData = {
    bolNumber: "BOL-2026-NSA575",
    bookingNumber: "BK-575",
    invoiceNumber: "INV-154",
    invoiceDate: "2026-09-15",
    date: "2026-09-15",
    packingDateMonthYear: "SEP/2026",
    expiryDateMonthYear: "SEP/2028",
    truckNumber: "32319 کابل",
    driverName: "نوم حمیدالله",
    driverFatherName: "عبدالحتان",
    driverContact: "0707625710",
    driverRent: "38,500 - AFN - کرایه واپسی",
    driverRentCurrency: "AFN",
    shipper: "NAJEB AMIN LTD",
    shipperAddress: "Shorandam Industrial Area, Kandahar, Afghanistan",
    consignee: "MANIK TRADERS",
    consigneeAddress: "Vashi, Navi Mumbai, India",
    containerNumber: "MSCU9876543",
    sealNumber: "SL-999",
    containers: [],
    portOfLoading: "Kandahar",
    portOfDischarge: "Mundra",
    finalDestination: "Nhava Sheva, IN",
    commodity: "BLACK RAISINS",
    hsCode: "080620",
    packageCount: 1503,
    packageCountText: "1503",
    packageType: "Cartons",
    grossWeight: "26,001.9 KG",
    netWeight: "24,048 KG",
    marksAndNumbers: "کابل تجارتی مال",
    shipperPhone: "+93 700 308 086",
    shipperLicence: "27-975",
    consigneePhone: "+91 98200 00000",
    consigneeFssai: "10019011000000",
    consigneeEmail: "info@maniktraders.in",
    notifyParty: "YAAQOUB HAMDAN FOODSTUFF TRADING CO LLC",
    notifyPartyAddress: "Shop No: 28 Al Hawai Building, Deira Dubai, UAE",
    vesselName: "",
    voyageNumber: "",
    measurement: "45.00 CBM",
    containerType: "40HC",
    commodities: [],
    companyName: "SKY ARIANA LIMITED",
    companySubtitle: "Import & Export - International Transportation",
    companyPhone: "+93 700 939 365",
    companyEmail: "info@skyariana.com",
    companyAddress: "Kandahar, Afghanistan",
    companyLicence: "2401-2198",
  }

  const blob = await generateShippingDocumentsPDF({ kind: "packing-list", data })
  const buf = Buffer.from(await blob.arrayBuffer())
  const str = buf.toString("latin1")

  assert.strictEqual(str.slice(0, 5), "%PDF-", "Generated document is a valid PDF")
  
  // Verify no mojibake byte patterns
  const hasMojibake = str.includes("þ•") || str.includes("þ•þ•") || str.includes("þ®þë")
  assert.strictEqual(hasMojibake, false, "Packing List PDF must NOT contain mojibake (þ•)")

  // Verify TrueType fonts are registered
  const hasNotoArabic = str.includes("NotoNaskhArabic")
  const hasNotoSans = str.includes("NotoSans")
  assert.strictEqual(hasNotoArabic, true, "NotoNaskhArabic font must be embedded in the PDF")
  assert.strictEqual(hasNotoSans, true, "NotoSans font must be embedded in the PDF")

  // Also test Sticker generation
  const stickerBlob = await generateShippingDocumentsPDF({ kind: "stickers", data, stickerQuantity: 1 })
  const stickerStr = Buffer.from(await stickerBlob.arrayBuffer()).toString("latin1")
  assert.strictEqual(stickerStr.slice(0, 5), "%PDF-", "Sticker document is a valid PDF")
  assert.strictEqual(stickerStr.includes("NotoSans"), true, "Sticker has NotoSans embedded")
  assert.strictEqual(stickerStr.includes("NotoNaskhArabic"), true, "Sticker has NotoNaskhArabic embedded")
  const stickerHasMojibake = stickerStr.includes("þ•") || stickerStr.includes("þ•þ•") || stickerStr.includes("þ®þë")
  assert.strictEqual(stickerHasMojibake, false, "Sticker PDF must NOT contain mojibake (þ•)")

  console.log("ALL TESTS PASSED! Packing List and Stickers generate authentic vector text without mojibake.")
  console.log(`Packing List size: ${buf.length} bytes`)
  console.log(`Sticker size: ${stickerBlob.size} bytes`)
}

run().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
