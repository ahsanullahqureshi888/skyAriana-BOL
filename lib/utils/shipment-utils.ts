import type { ShipmentMaster, DocumentMismatchAlert } from "@/lib/types/shipment"
import { parseWeight, parsePackages } from "@/lib/reports/parsers"

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
