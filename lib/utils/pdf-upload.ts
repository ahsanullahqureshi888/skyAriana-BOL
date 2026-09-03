"use client"
import type { BillOfLadingFormData } from "@/lib/types/bill-of-lading"
import { COMPANY_STAMP_SIGNATURE_DATA_URL } from "@/lib/company-stamp-data"

// Dynamically import PDF libraries only in browser environment
let html2canvasLib: any = null
let jsPDFConstructor: any = null
let jsPDFOnlyConstructor: any = null
let pdfFontAssets:
  | {
      notoSansRegular: string
      notoSansBold: string
      arabicRegular: string
      arabicBold: string
    }
  | null = null

async function loadPDFLibraries() {
  if (html2canvasLib && jsPDFConstructor) {
    return { html2canvas: html2canvasLib, jsPDF: jsPDFConstructor }
  }

  if (typeof window === "undefined") {
    throw new Error("PDF generation only works in browser")
  }

  try {
    html2canvasLib = (await import("html2canvas")).default
    // @ts-ignore - jsPDF ships this browser bundle without a separate declaration file.
    jsPDFConstructor = (await import("jspdf/dist/jspdf.es.min.js")).jsPDF
    return { html2canvas: html2canvasLib, jsPDF: jsPDFConstructor }
  } catch (error) {
    throw new Error(`Failed to load PDF libraries: ${error}`)
  }
}

async function loadJSPDFLibrary() {
  if (jsPDFConstructor || jsPDFOnlyConstructor) {
    return jsPDFConstructor || jsPDFOnlyConstructor
  }

  if (typeof window === "undefined") {
    throw new Error("PDF generation only works in browser")
  }

  try {
    // @ts-ignore - jsPDF ships this browser bundle without a separate declaration file.
    jsPDFOnlyConstructor = (await import("jspdf/dist/jspdf.es.min.js")).jsPDF
    return jsPDFOnlyConstructor
  } catch (error) {
    throw new Error(`Failed to load PDF library: ${error}`)
  }
}

async function normalizePDFBlob(pdfBlob: Blob): Promise<Blob> {
  const normalizedBlob =
    pdfBlob.type === "application/pdf"
      ? pdfBlob
      : new Blob([pdfBlob], { type: "application/pdf" })

  const header = await normalizedBlob.slice(0, 5).text()
  if (header !== "%PDF-") {
    throw new Error("Generated file is not a valid PDF. Please try again.")
  }

  return normalizedBlob
}

type ModernBOLPDFOptions = {
  bolNumber: string
  issueDate: string
  persianDateNumeric: string
  formData: BillOfLadingFormData
  logoUrl?: string
  companyName?: string
  companyNamePersian?: string
  companySubtitle?: string
  companyPhone?: string
  companyEmail?: string
  companyAddress?: string
  companyLicence?: string
  onProgress?: (progress: number, message: string) => void
}

type PDFDetailItem = {
  label: string
  value?: string | null
  important?: boolean
}

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const PAGE_MARGIN = 8
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2
const BLUE = [37, 99, 235] as const
const BLUE_DARK = [30, 64, 175] as const
const CYAN = [8, 145, 178] as const
const SKY_BG = [239, 246, 255] as const
const BORDER_BLUE = [147, 197, 253] as const
const TEXT_DARK = [15, 23, 42] as const
const TEXT_MUTED = [71, 85, 105] as const

function cleanPDFText(value?: string | null) {
  if (!value) return ""
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function hasPDFValue(value?: string | null) {
  return cleanPDFText(value).length > 0
}

function containsArabic(value: string) {
  return /[\u0600-\u06FF]/.test(value)
}

function truncateText(value: string, maxLength: number) {
  const text = cleanPDFText(value)
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 3))}...` : text
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function fetchAsBase64(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load asset: ${url}`)
  }
  const dataUrl = await blobToDataURL(await response.blob())
  return dataUrl.split(",")[1] || ""
}

async function fetchImageDataURL(url?: string) {
  try {
    const source = url || "/images/logo.png"
    const response = await fetch(source)
    if (!response.ok) return null
    return blobToDataURL(await response.blob())
  } catch {
    return null
  }
}

async function loadPDFFontAssets() {
  if (pdfFontAssets) return pdfFontAssets

  const [notoSansRegular, notoSansBold, arabicRegular, arabicBold] = await Promise.all([
    fetchAsBase64("/fonts/NotoSans-Regular.ttf"),
    fetchAsBase64("/fonts/NotoSans-Bold.ttf"),
    fetchAsBase64("/fonts/NotoNaskhArabic-Regular.ttf"),
    fetchAsBase64("/fonts/NotoNaskhArabic-Bold.ttf"),
  ])

  pdfFontAssets = {
    notoSansRegular,
    notoSansBold,
    arabicRegular,
    arabicBold,
  }

  return pdfFontAssets
}

async function registerPDFFonts(doc: any) {
  const fontList = typeof doc.getFontList === "function" ? doc.getFontList() : null
  if (fontList?.NotoSans && fontList?.NotoNaskhArabic) return

  const { notoSansRegular, notoSansBold, arabicRegular, arabicBold } = await loadPDFFontAssets()

  doc.addFileToVFS("NotoSans-Regular.ttf", notoSansRegular)
  doc.addFileToVFS("NotoSans-Bold.ttf", notoSansBold)
  doc.addFileToVFS("NotoNaskhArabic-Regular.ttf", arabicRegular)
  doc.addFileToVFS("NotoNaskhArabic-Bold.ttf", arabicBold)
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal")
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold")
  doc.addFont("NotoNaskhArabic-Regular.ttf", "NotoNaskhArabic", "normal")
  doc.addFont("NotoNaskhArabic-Bold.ttf", "NotoNaskhArabic", "bold")
}

function setColor(doc: any, rgb: readonly number[], target: "text" | "draw" | "fill") {
  if (target === "text") doc.setTextColor(rgb[0], rgb[1], rgb[2])
  if (target === "draw") doc.setDrawColor(rgb[0], rgb[1], rgb[2])
  if (target === "fill") doc.setFillColor(rgb[0], rgb[1], rgb[2])
}

function setPDFTextStyle(doc: any, text: string, size: number, weight: "normal" | "bold" = "normal") {
  doc.setFont(containsArabic(text) ? "NotoNaskhArabic" : "NotoSans", weight)
  doc.setFontSize(size)
}

function preparePDFText(doc: any, text: string) {
  if (containsArabic(text) && typeof doc.processArabic === "function") {
    return doc.processArabic(text)
  }
  return text
}

function drawText(
  doc: any,
  text: string,
  x: number,
  y: number,
  options: {
    size?: number
    weight?: "normal" | "bold"
    color?: readonly number[]
    align?: "left" | "center" | "right"
    maxWidth?: number
    lineHeight?: number
  } = {}
) {
  const value = cleanPDFText(text)
  if (!value) return 0

  const size = options.size ?? 8
  const lineHeight = options.lineHeight ?? size * 0.38
  setPDFTextStyle(doc, value, size, options.weight ?? "normal")
  setColor(doc, options.color ?? TEXT_DARK, "text")

  const lines = value
    .split("\n")
    .flatMap((line) => {
      const prepared = preparePDFText(doc, line)
      return options.maxWidth ? doc.splitTextToSize(prepared, options.maxWidth) : [prepared]
    })

  lines.forEach((line: string, index: number) => {
    doc.text(line, x, y + index * lineHeight, { align: options.align ?? "left", baseline: "top" })
  })

  return Math.max(lineHeight, lines.length * lineHeight)
}

function roundedCard(
  doc: any,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: readonly number[] = [255, 255, 255],
  stroke: readonly number[] = BORDER_BLUE,
  radius = 2.4
) {
  setColor(doc, fill, "fill")
  setColor(doc, stroke, "draw")
  doc.setLineWidth(0.25)
  doc.roundedRect(x, y, width, height, radius, radius, "FD")
}

function drawTransportIcon(doc: any, x: number, y: number, mode?: string, size = 7) {
  const cx = x
  const cy = y
  const s = size
  setColor(doc, BLUE, "fill")
  doc.setLineWidth(0.4)

  if (mode === "truck" || mode === "road") {
    // simple truck: trailer + cab + wheels
    setColor(doc, BLUE, "fill")
    doc.rect(cx, cy + s * 0.25, s * 0.9, s * 0.45, "F")
    doc.rect(cx + s * 0.6, cy, s * 0.35, s * 0.5, "F")
    setColor(doc, [0, 0, 0], "fill")
    doc.circle(cx + s * 0.2, cy + s * 0.82, s * 0.16, "F")
    doc.circle(cx + s * 0.68, cy + s * 0.82, s * 0.16, "F")
    return
  }

  if (mode === "vessel" || mode === "ship") {
    // simple vessel: deck + hull ellipse
    setColor(doc, BLUE, "fill")
    doc.rect(cx + s * 0.05, cy + s * 0.15, s * 0.9, s * 0.28, "F")
    setColor(doc, BLUE_DARK, "fill")
    // hull as ellipse-like shape (ellipse exists in jspdf)
    if (typeof doc.ellipse === "function") {
      doc.ellipse(cx + s * 0.5, cy + s * 0.78, s * 0.5, s * 0.22, "F")
    } else {
      doc.rect(cx + s * 0.15, cy + s * 0.6, s * 0.7, s * 0.2, "F")
    }
    return
  }

  if (mode === "airplane") {
    // simple airplane: fuselage + wings
    setColor(doc, BLUE, "fill")
    doc.rect(cx + s * 0.12, cy + s * 0.32, s * 0.76, s * 0.22, "F")
    setColor(doc, BLUE_DARK, "fill")
    doc.rect(cx + s * 0.02, cy + s * 0.4, s * 0.28, s * 0.08, "F")
    doc.rect(cx + s * 0.7, cy + s * 0.4, s * 0.28, s * 0.08, "F")
    return
  }

  // default: small filled circle
  setColor(doc, BLUE, "fill")
  doc.circle(cx + s / 2, cy + s / 2, s / 2, "F")
}

function drawRouteLegend(doc: any, x: number, y: number, size = 7) {
  const items: { mode: string; label: string }[] = [
    { mode: "truck", label: "Truck / Road" },
    { mode: "vessel", label: "Vessel / Ship" },
    { mode: "airplane", label: "Air / Airplane" },
    { mode: "train", label: "Train" },
  ]
  const padding = 3
  const itemW = 40
  const width = items.length * itemW + padding * 2
  const height = size + 4
  roundedCard(doc, x, y, width, height, [255, 255, 255], BORDER_BLUE, 1.8)
  let cx = x + padding
  items.forEach((it) => {
    drawTransportIcon(doc, cx, y + 1, it.mode, size)
    drawText(doc, it.label, cx + size + 2, y + 1.4, { size: 5.6, color: TEXT_DARK, maxWidth: itemW - size - 4 })
    cx += itemW
  })
  return height
}

function blueSectionHeader(
  doc: any,
  title: string,
  subtitle: string,
  x: number,
  y: number,
  width: number,
  height = 8
) {
  setColor(doc, BLUE, "fill")
  setColor(doc, BLUE, "draw")
  doc.roundedRect(x, y, width, height, 2.2, 2.2, "F")
  setColor(doc, CYAN, "fill")
  doc.rect(x + width * 0.58, y, width * 0.42, height, "F")
  drawText(doc, title, x + 4, y + 2.1, { size: 9, weight: "bold", color: [255, 255, 255] })
  if (subtitle) {
    drawText(doc, subtitle, x + width - 4, y + 1.8, {
      size: 7,
      weight: "bold",
      color: [255, 255, 255],
      align: "right",
    })
  }
}

function drawDetailCard(
  doc: any,
  item: PDFDetailItem,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const compact = height <= 15
  roundedCard(doc, x, y, width, height, [255, 255, 255], BORDER_BLUE, 1.6)
  drawText(doc, item.label || "", x + 2, y + 1.6, {
    size: compact ? 5.0 : 5.6,
    weight: "bold",
    color: BLUE,
    maxWidth: width - 4,
    lineHeight: 2.2,
  })
  drawText(doc, item.value || "", x + 2, y + (compact ? 5.2 : 6.2), {
    size: compact ? (item.important ? 6.4 : 5.8) : item.important ? 7.4 : 6.6,
    weight: item.important ? "bold" : "normal",
    color: TEXT_DARK,
    maxWidth: width - 4,
    lineHeight: 2.5,
  })
}

function drawPartyCard(
  doc: any,
  title: string,
  subtitle: string,
  name: string | undefined,
  address: string | undefined,
  contact: string | undefined,
  email: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number
) {
  roundedCard(doc, x, y, width, height, [255, 255, 255], BORDER_BLUE, 2)
  setColor(doc, SKY_BG, "fill")
  doc.roundedRect(x, y, width, 7, 2, 2, "F")
  drawText(doc, title, x + 3, y + 1.8, { size: 7.5, weight: "bold", color: TEXT_DARK })
  drawText(doc, subtitle, x + width - 3, y + 1.8, { size: 6.2, weight: "bold", color: BLUE, align: "right" })
  let cursorY = y + 8.5
  if (hasPDFValue(name)) {
    cursorY += drawText(doc, truncateText(name || "", 64), x + 3, cursorY, {
      size: 7.6,
      weight: "bold",
      color: TEXT_DARK,
      maxWidth: width - 6,
      lineHeight: 2.8,
    }) + 0.5
  }
  if (hasPDFValue(address) && cursorY < y + height - 4) {
    const addressLines = cleanPDFText(address).split("\n").slice(0, 2).join(" ")
    cursorY += drawText(doc, addressLines, x + 3, cursorY, {
      size: 6.0,
      weight: "normal",
      color: TEXT_DARK,
      maxWidth: width - 6,
      lineHeight: 2.6,
    }) + 0.5
  }
  if (hasPDFValue(contact) && cursorY < y + height - 3) {
    cursorY += drawText(doc, contact || "", x + 3, cursorY, {
      size: 5.8,
      weight: "bold",
      color: TEXT_DARK,
      maxWidth: width - 6,
      lineHeight: 2.5,
    }) + 0.5
  }
  if (hasPDFValue(email) && cursorY < y + height - 3) {
    drawText(doc, email || "", x + 3, cursorY, {
      size: 5.6,
      weight: "normal",
      color: TEXT_MUTED,
      maxWidth: width - 6,
      lineHeight: 2.5,
    })
  }
}

function drawFooter(doc: any, options: ModernBOLPDFOptions, page: number, totalPages: number) {
  const y = PAGE_HEIGHT - 18
  const companyTitle = cleanPDFText(options.companyName) || "SKY ARIANA LIMITED"
  const companyTagline = cleanPDFText(options.companySubtitle) || "Import & Export - International Transportation"
  roundedCard(doc, PAGE_MARGIN, y, CONTENT_WIDTH, 10, BLUE, BLUE, 2)
  drawText(
    doc,
    `${companyTitle} - ${companyTagline} | ${cleanPDFText(options.companyPhone)} | ${cleanPDFText(options.companyEmail)}${options.companyLicence ? ` | Licence: ${options.companyLicence}` : ""}`,
    PAGE_WIDTH / 2,
    y + 2.3,
    { size: 5.6, weight: "bold", color: [255, 255, 255], align: "center", maxWidth: CONTENT_WIDTH - 6 }
  )
  drawText(doc, cleanPDFText(options.companyAddress) || "2nd Floor, 16 No. Office, Shahidano, Chowk, Etimad Rahmi Market, Kandahar, Afghanistan", PAGE_WIDTH / 2, y + 6.1, {
    size: 5.2,
    color: [255, 255, 255],
    align: "center",
    maxWidth: CONTENT_WIDTH - 6,
  })
  drawText(doc, `Page ${page} of ${totalPages}`, PAGE_WIDTH - PAGE_MARGIN, PAGE_HEIGHT - 5, {
    size: 6,
    weight: "bold",
    color: TEXT_MUTED,
    align: "right",
  })
}

export async function generateModernBOLPDFBlob(options: ModernBOLPDFOptions): Promise<Blob> {
  const jsPDF = await loadJSPDFLibrary()
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  })

  options.onProgress?.(8, "Loading embedded fonts...")
  await registerPDFFonts(doc)
  doc.setLanguage?.("en-US")
  const smartPdfTitle = buildBolSmartFileName(options.formData, options.bolNumber, "").replace(/\.pdf$/i, "")
  doc.setProperties({
    title: smartPdfTitle,
    subject: smartPdfTitle,
    author: cleanPDFText(options.companyName) || "SKY ARIANA LIMITED",
    creator: "Sky Ariana BOL PDF Export",
    keywords: "bill of lading, logistics, cargo, shipment",
  })

  options.onProgress?.(18, "Preparing document assets...")
  const logoDataUrl = await fetchImageDataURL(options.logoUrl)

  const form = options.formData
  const companyTitle = cleanPDFText(options.companyName) || "SKY ARIANA LIMITED"
  const companyTagline = cleanPDFText(options.companySubtitle) || "Import & Export - International Transportation"
  const companyPersian = cleanPDFText(options.companyNamePersian) || "شرکت حمل و نقل بین المللی سکای آریانا لمیتد"
  let pageNo = 1
  let y = PAGE_MARGIN

  const addPage = () => {
    drawFooter(doc, options, pageNo, 0)
    doc.addPage()
    pageNo += 1
    y = PAGE_MARGIN
  }

  const ensureSpace = (height: number) => {
    if (y + height > PAGE_HEIGHT - 22) {
      addPage()
    }
  }

  options.onProgress?.(32, "Drawing premium header...")
  roundedCard(doc, PAGE_MARGIN, y, CONTENT_WIDTH, 32, [255, 255, 255], BORDER_BLUE, 4)
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", PAGE_MARGIN + 5, y + 5, 25, 20, undefined, "FAST")
  }
  drawText(doc, companyTitle, PAGE_WIDTH / 2, y + 6.5, {
    size: 16.5,
    weight: "bold",
    color: TEXT_DARK,
    align: "center",
    maxWidth: 105,
    lineHeight: 6.0,
  })
  drawText(doc, companyTagline, PAGE_WIDTH / 2, y + 17.5, {
    size: 8.5,
    weight: "bold",
    color: TEXT_DARK,
    align: "center",
  })
  drawText(doc, companyPersian, PAGE_WIDTH / 2, y + 22.8, {
    size: 10.5,
    weight: "bold",
    color: BLUE_DARK,
    align: "center",
  })
  roundedCard(doc, PAGE_WIDTH - PAGE_MARGIN - 35, y + 4, 32, 15, BLUE_DARK, BLUE_DARK, 2.5)
  drawText(doc, "BILL OF\nLADING", PAGE_WIDTH - PAGE_MARGIN - 19, y + 6.1, {
    size: 9,
    weight: "bold",
    color: [255, 255, 255],
    align: "center",
    lineHeight: 4,
  })
  roundedCard(doc, PAGE_WIDTH - PAGE_MARGIN - 35, y + 20, 32, 8.5, [255, 255, 255], BORDER_BLUE, 1.8)
  drawText(doc, options.bolNumber, PAGE_WIDTH - PAGE_MARGIN - 19, y + 22.6, {
    size: 7.4,
    weight: "bold",
    color: BLUE_DARK,
    align: "center",
  })
  y += 36

  options.onProgress?.(45, "Building shipment sections...")
  ensureSpace(54)
  blueSectionHeader(doc, "EXPORTER CONTACTS", "Exporter Contacts", PAGE_MARGIN, y, CONTENT_WIDTH)
  y += 10
  const contactW = (CONTENT_WIDTH - 3) / 2
  drawDetailCard(doc, { label: form.notes_1_label || "Contact Phone", value: form.notes_1, important: true }, PAGE_MARGIN, y, contactW, 18)
  drawDetailCard(doc, { label: form.notes_2_label || "Representative", value: form.notes_2, important: true }, PAGE_MARGIN + contactW + 3, y, contactW, 18)
  y += 21
  drawPartyCard(doc, "EXPORTER INFORMATION", "Exporter", form.shipper_name, form.shipper_address, form.shipper_contact, form.shipper_email, PAGE_MARGIN, y, contactW, 34)
  drawPartyCard(doc, "CONSIGNEE INFORMATION", "Consignee", form.consignee_name, form.consignee_address, form.consignee_contact, form.consignee_email, PAGE_MARGIN + contactW + 3, y, contactW, 34)
  y += 38

  ensureSpace(28)
  blueSectionHeader(doc, "ROUTE / TRANSPORTATION PATH", "Route", PAGE_MARGIN, y, CONTENT_WIDTH)
  y += 10
  let routeX = PAGE_MARGIN + 3
  let routeY = y
  form.routes.forEach((route, index) => {
    if (routeX + 38 > PAGE_WIDTH - PAGE_MARGIN) {
      routeX = PAGE_MARGIN + 3
      routeY += 13
    }
    roundedCard(doc, routeX, routeY, 34, 10, [255, 255, 255], BORDER_BLUE, 2)
    setColor(doc, BLUE, "fill")
    doc.circle(routeX + 5, routeY + 5, 3.2, "F")
    drawText(doc, String(index + 1), routeX + 5, routeY + 3.2, { size: 6.2, weight: "bold", color: [255, 255, 255], align: "center" })
    // draw small transport icon and adjust text
    drawTransportIcon(doc, routeX + 12, routeY + 1.6, route.transportMode, 7)
    drawText(doc, truncateText(route.location || `Stop ${index + 1}`, 16), routeX + 18, routeY + 2.4, { size: 6.4, weight: "bold", color: TEXT_DARK, maxWidth: 14 })
    if (route.locationPersian) {
      drawText(doc, route.locationPersian, routeX + 32, routeY + 6.2, { size: 5.4, color: BLUE, align: "right", maxWidth: 16 })
    }
    if (index < form.routes.length - 1) {
      setColor(doc, BORDER_BLUE, "draw")
      doc.setLineWidth(0.5)
      doc.line(routeX + 35, routeY + 5, routeX + 42, routeY + 5)
      drawText(doc, "->", routeX + 43.5, routeY + 3.1, { size: 7, weight: "bold", color: BLUE })
    }
    routeX += 49
  })
  y = routeY + 14

  // draw legend for transport icons (if space)
  ensureSpace(14)
  y += drawRouteLegend(doc, PAGE_MARGIN, y, 7) + 4

  ensureSpace(26)
  // show English title on the left and Pashto/Persian subtitle on the right
  blueSectionHeader(doc, "SHIPMENT INFORMATION", "اطلاعات حمل", PAGE_MARGIN, y, CONTENT_WIDTH)
  y += 10
  const shipmentItems: PDFDetailItem[] = [
    { label: "BOL Number", value: options.bolNumber, important: true },
    { label: "Invoice Reference", value: form.bol_number || options.bolNumber, important: true },
    { label: "Date", value: options.issueDate, important: true },
    { label: "Persian Date", value: options.persianDateNumeric, important: true },
  ]
  const shipmentW = (CONTENT_WIDTH - 6) / 4
  shipmentItems.forEach((item, index) => {
    drawDetailCard(doc, item, PAGE_MARGIN + index * (shipmentW + 2), y, shipmentW, 16)
  })
  y += 20

  ensureSpace(72)
  blueSectionHeader(doc, "CARGO DESCRIPTION", "Cargo", PAGE_MARGIN, y, CONTENT_WIDTH)
  y += 10
  const cargoItems: PDFDetailItem[] = [
    { label: "Container No.", value: form.container_numbers, important: true },
    { label: "Seal No.", value: form.seal_numbers, important: true },
    { label: "No. of Packages", value: form.number_of_packages, important: true },
    { label: "KGS per Carton", value: form.kgs_per_carton, important: true },
    { label: "Gross / Carton KGS", value: form.gross_weight_per_carton, important: true },
    { label: "Rate per KGS", value: form.rate_per_kgs, important: true },
    { label: "Goods Value", value: form.goods_value, important: true },
    { label: "Net Weight", value: form.net_weight, important: true },
    { label: "Gross Weight", value: form.gross_weight, important: true },
    { label: "Measurement", value: form.measurement },
  ].filter((item) => hasPDFValue(item.value))
  const cargoW = (CONTENT_WIDTH - 8) / 5
  cargoItems.forEach((item, index) => {
    const row = Math.floor(index / 5)
    const col = index % 5
    drawDetailCard(doc, item, PAGE_MARGIN + col * (cargoW + 2), y + row * 15, cargoW, 13)
  })
  y += Math.ceil(cargoItems.length / 5) * 15 + 2
  roundedCard(doc, PAGE_MARGIN, y, CONTENT_WIDTH, 34, [255, 255, 255], BORDER_BLUE, 2.2)
  drawText(doc, "Description of Goods", PAGE_MARGIN + 3, y + 3, {
    size: 8,
    weight: "bold",
    color: TEXT_DARK,
  })
  drawText(doc, form.cargo_description, PAGE_MARGIN + 3, y + 9, {
    size: 6.8,
    weight: "bold",
    color: TEXT_DARK,
    maxWidth: CONTENT_WIDTH - 6,
    lineHeight: 2.8,
  })
  y += 38

  if (hasPDFValue(form.freight_payable_at) || hasPDFValue(form.remarks)) {
    ensureSpace(20)
    blueSectionHeader(doc, "REMARKS / NOTES", "Remarks", PAGE_MARGIN, y, CONTENT_WIDTH)
    y += 10
    drawDetailCard(doc, { label: "Freight Payable At", value: form.freight_payable_at }, PAGE_MARGIN, y, contactW, 14)
    drawDetailCard(doc, { label: "Remarks", value: form.remarks }, PAGE_MARGIN + contactW + 3, y, contactW, 14)
    y += 18
  }

  ensureSpace(30)
  const sigW = (CONTENT_WIDTH - 3) / 2
  const sigX = PAGE_MARGIN + (CONTENT_WIDTH - sigW) / 2
  roundedCard(doc, sigX, y, sigW, 24, [255, 255, 255], BORDER_BLUE, 2)
  try {
    doc.addImage(COMPANY_STAMP_SIGNATURE_DATA_URL, "PNG", sigX + sigW / 2 - 10, y + 2, 20, 20)
  } catch {}
  drawText(doc, "Company Stamp & Sign", sigX + sigW / 2, y + 21.5, { size: 6.5, weight: "bold", color: TEXT_DARK, align: "center" })

  const totalPages = doc.internal.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page)
    drawFooter(doc, options, page, totalPages)
  }

  options.onProgress?.(100, "PDF ready")
  const blob = doc.output("blob") as Blob
  return normalizePDFBlob(blob)
}

export async function generatePremiumBOLPDFBlob(options: ModernBOLPDFOptions): Promise<Blob> {
  const jsPDF = await loadJSPDFLibrary()
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  })

  options.onProgress?.(8, "Loading embedded fonts")
  await registerPDFFonts(doc)
  doc.setLanguage?.("en-US")
  const smartPdfTitle = buildBolSmartFileName(options.formData, options.bolNumber, "").replace(/\.pdf$/i, "")
  doc.setProperties({
    title: smartPdfTitle,
    subject: smartPdfTitle,
    author: cleanPDFText(options.companyName) || "SKY ARIANA LIMITED",
    creator: "Sky Ariana BOL PDF Export",
    keywords: "bill of lading, logistics, cargo, shipment",
  })

  options.onProgress?.(16, "Preparing assets")
  const logoDataUrl = await fetchImageDataURL(options.logoUrl)

  const form = options.formData
  const companyTitle = cleanPDFText(options.companyName) || "SKY ARIANA LIMITED"
  const companyTagline = cleanPDFText(options.companySubtitle) || "Import & Export - International Transportation"
  const companyPersian = cleanPDFText(options.companyNamePersian) || "شرکت حمل و نقل بین المللی سکای آریانا لمیتد"
  const contactCardWidth = (CONTENT_WIDTH - 3) / 2
  let y = PAGE_MARGIN

  options.onProgress?.(24, "Drawing premium header")
  roundedCard(doc, PAGE_MARGIN, y, CONTENT_WIDTH, 28, [255, 255, 255], BORDER_BLUE, 3)
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", PAGE_MARGIN + 3, y + 3.5, 22, 17, undefined, "FAST")
  }
  drawText(doc, companyTitle, PAGE_WIDTH / 2, y + 5.0, {
    size: 15.5,
    weight: "bold",
    color: TEXT_DARK,
    align: "center",
    maxWidth: 110,
    lineHeight: 5.5,
  })
  drawText(doc, companyTagline, PAGE_WIDTH / 2, y + 14.8, {
    size: 8.0,
    weight: "bold",
    color: TEXT_MUTED,
    align: "center",
  })
  drawText(doc, companyPersian, PAGE_WIDTH / 2, y + 19.8, {
    size: 9.8,
    weight: "bold",
    color: BLUE_DARK,
    align: "center",
  })
  roundedCard(doc, PAGE_WIDTH - PAGE_MARGIN - 34, y + 3.5, 31, 13, BLUE_DARK, BLUE_DARK, 2.2)
  drawText(doc, "BILL OF\nLADING", PAGE_WIDTH - PAGE_MARGIN - 18.5, y + 5.0, {
    size: 8.2,
    weight: "bold",
    color: [255, 255, 255],
    align: "center",
    lineHeight: 3.6,
  })
  roundedCard(doc, PAGE_WIDTH - PAGE_MARGIN - 34, y + 17.5, 31, 7.5, [255, 255, 255], BORDER_BLUE, 1.6)
  drawText(doc, options.bolNumber, PAGE_WIDTH - PAGE_MARGIN - 18.5, y + 19.4, {
    size: 6.8,
    weight: "bold",
    color: BLUE_DARK,
    align: "center",
  })
  y += 31

  options.onProgress?.(36, "Rendering parties and contacts")
  blueSectionHeader(doc, "EXPORTER CONTACTS", "تماس های صادرکننده", PAGE_MARGIN, y, CONTENT_WIDTH, 7)
  y += 8.5
  drawDetailCard(doc, { label: form.notes_1_label || "Loading Contact", value: form.notes_1, important: true }, PAGE_MARGIN, y, contactCardWidth, 14)
  drawDetailCard(doc, { label: form.notes_2_label || "Representative", value: form.notes_2, important: true }, PAGE_MARGIN + contactCardWidth + 3, y, contactCardWidth, 14)
  y += 16.5

  const partyHeight = 24
  drawPartyCard(doc, "EXPORTER INFORMATION", "فرستنده", form.shipper_name, form.shipper_address, form.shipper_contact, form.shipper_email, PAGE_MARGIN, y, contactCardWidth, partyHeight)
  drawPartyCard(doc, "CONSIGNEE INFORMATION", "گیرنده", form.consignee_name, form.consignee_address, form.consignee_contact, form.consignee_email, PAGE_MARGIN + contactCardWidth + 3, y, contactCardWidth, partyHeight)
  y += partyHeight + 2.5

  options.onProgress?.(48, "Rendering route and shipment data")
  const routes = form.routes?.length ? form.routes : []
  const routeColumns = 4
  const routeRows = Math.max(1, Math.ceil(routes.length / routeColumns))
  blueSectionHeader(doc, "ROUTE / TRANSPORTATION PATH", "مسیر حمل و نقل", PAGE_MARGIN, y, CONTENT_WIDTH, 7)
  y += 8.5
  const routeCardWidth = (CONTENT_WIDTH - (routeColumns - 1) * 3) / routeColumns
  routes.forEach((route, index) => {
    const row = Math.floor(index / routeColumns)
    const col = index % routeColumns
    const x = PAGE_MARGIN + col * (routeCardWidth + 3)
    const ry = y + row * 11
    roundedCard(doc, x, ry, routeCardWidth, 9.5, [255, 255, 255], BORDER_BLUE, 1.8)
    setColor(doc, BLUE, "fill")
    doc.circle(x + 4, ry + 4.8, 2.8, "F")
    drawText(doc, String(index + 1), x + 4, ry + 3.2, { size: 5.5, weight: "bold", color: [255, 255, 255], align: "center" })
    drawTransportIcon(doc, x + 8.5, ry + 1.8, route.transportMode, 5.8)
    drawText(doc, truncateText(route.location || `Stop ${index + 1}`, 22), x + 16, ry + 1.8, {
      size: 6.0,
      weight: "bold",
      color: TEXT_DARK,
      maxWidth: routeCardWidth - 17,
      lineHeight: 2.6,
    })
    if (route.locationPersian) {
      drawText(doc, truncateText(route.locationPersian, 22), x + 16, ry + 5.2, {
        size: 5.0,
        color: BLUE,
        maxWidth: routeCardWidth - 17,
        lineHeight: 2.4,
      })
    }
  })
  y += routeRows * 11 + 2.5

  // draw legend for transport icons
  y += drawRouteLegend(doc, PAGE_MARGIN, y, 5.5) + 2.5

  blueSectionHeader(doc, "SHIPMENT INFORMATION", "اطلاعات حمل", PAGE_MARGIN, y, CONTENT_WIDTH, 7)
  y += 8.5

  const driverNameVal = form.driver_name ? form.driver_name.trim() : ""
  const driverFatherNameVal = form.driver_father_name ? ` S/O ${form.driver_father_name.trim()}` : ""
  const driverFullInfo = driverNameVal || driverFatherNameVal ? `${driverNameVal}${driverFatherNameVal}` : undefined
  const combinedDateVal = [options.issueDate, options.persianDateNumeric].filter(Boolean).join("\n")

  const shipmentItems: PDFDetailItem[] = [
    { label: "Truck Number / شماره کامیون", value: form.truck_number, important: true },
    { label: "Driver Name / نام راننده", value: driverFullInfo, important: true },
    { label: "Driver Contact / تماس راننده", value: form.driver_contact, important: true },
    { label: "Driver Rent / کرایه راننده", value: form.driver_rent, important: true },
    { label: "Date / تاریخ / شمسی", value: combinedDateVal, important: true },
  ].filter((item) => hasPDFValue(item.value))

  const shipmentCols = Math.max(1, shipmentItems.length)
  const shipmentW = (CONTENT_WIDTH - (shipmentCols - 1) * 2) / shipmentCols
  shipmentItems.forEach((item, index) => {
    drawDetailCard(doc, item, PAGE_MARGIN + index * (shipmentW + 2), y, shipmentW, 14)
  })
  y += 16.5

  blueSectionHeader(doc, "CARGO DESCRIPTION", "شرح کالا", PAGE_MARGIN, y, CONTENT_WIDTH, 7)
  y += 8.5
  const cargoItems: PDFDetailItem[] = [
    { label: "Container No.", value: form.container_numbers, important: true },
    { label: "Seal No.", value: form.seal_numbers, important: true },
    { label: "No. of Packages", value: form.number_of_packages, important: true },
    { label: "KGS per Carton", value: form.kgs_per_carton, important: true },
    { label: "Gross / Carton KGS", value: form.gross_weight_per_carton, important: true },
    { label: "Rate per KGS", value: form.rate_per_kgs, important: true },
    { label: "Goods Value", value: form.goods_value, important: true },
    { label: "Net Weight", value: form.net_weight, important: true },
    { label: "Gross Weight", value: form.gross_weight, important: true },
    { label: "Measurement", value: form.measurement },
  ].filter((item) => hasPDFValue(item.value))
  const cargoColumns = 5
  const cargoW = (CONTENT_WIDTH - (cargoColumns - 1) * 2) / cargoColumns
  const cargoRows = Math.ceil(cargoItems.length / cargoColumns)
  cargoItems.forEach((item, index) => {
    const row = Math.floor(index / cargoColumns)
    const col = index % cargoColumns
    drawDetailCard(doc, item, PAGE_MARGIN + col * (cargoW + 2), y + row * 12.5, cargoW, 11.5)
  })
  y += cargoRows * 12.5 + 2

  const descriptionTitle = "Description of Goods / شرح کالا"
  const descriptionText = cleanPDFText(form.cargo_description)
  const descriptionBoxHeight = 22
  roundedCard(doc, PAGE_MARGIN, y, CONTENT_WIDTH, descriptionBoxHeight, [255, 255, 255], BORDER_BLUE, 2)
  drawText(doc, descriptionTitle, PAGE_MARGIN + 3, y + 2.5, { size: 7.2, weight: "bold", color: TEXT_DARK })
  if (descriptionText) {
    drawText(doc, descriptionText, PAGE_MARGIN + 3, y + 7.5, {
      size: 6.2,
      weight: "bold",
      color: TEXT_DARK,
      maxWidth: CONTENT_WIDTH - 6,
      lineHeight: 2.6,
    })
  }
  y += descriptionBoxHeight + 2.5

  options.onProgress?.(82, "Adding signature section")
  const signatureWidth = (CONTENT_WIDTH - 3) / 2
  const sigX = PAGE_MARGIN + (CONTENT_WIDTH - signatureWidth) / 2
  const sigHeight = 22
  roundedCard(doc, sigX, y, signatureWidth, sigHeight, [255, 255, 255], BORDER_BLUE, 2)
  try {
    doc.addImage(COMPANY_STAMP_SIGNATURE_DATA_URL, "PNG", sigX + signatureWidth / 2 - 9, y + 1.5, 18, 18)
  } catch {}
  drawText(doc, "Company Stamp & Sign", sigX + signatureWidth / 2, y + 20, {
    size: 6.0,
    weight: "bold",
    color: TEXT_DARK,
    align: "center",
  })

  const totalPages = doc.internal.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page)
    drawFooter(doc, options, page, totalPages)
  }

  options.onProgress?.(100, "PDF ready")
  return normalizePDFBlob(doc.output("blob") as Blob)
}

export type GenerateBOLPDFBlobOptions = {
  fileName?: string
  previewElement?: HTMLElement | null
  modern?: ModernBOLPDFOptions
  onFallback?: (reason: string) => void
}

export async function generateBOLPDFBlob(options: GenerateBOLPDFBlobOptions): Promise<Blob>
export async function generateBOLPDFBlob(bolDocument: Record<string, any>): Promise<Blob>
export async function generateBOLPDFBlob(
  optionsOrBol: GenerateBOLPDFBlobOptions | Record<string, any>
): Promise<Blob> {
  const rawDoc = optionsOrBol as Record<string, any>
  const isDirectBol = Boolean(
    rawDoc &&
      !rawDoc.modern &&
      (rawDoc.bol_number || rawDoc.id || rawDoc.barnamehNo)
  )

  const options: GenerateBOLPDFBlobOptions = isDirectBol
    ? {
        fileName: buildBolSmartFileName(
          rawDoc,
          rawDoc.bol_number || rawDoc.id,
          ".pdf"
        ),
        modern: {
          bolNumber: rawDoc.bol_number || rawDoc.id || "BOL",
          issueDate: rawDoc.issue_date || "",
          persianDateNumeric: "",
          formData: rawDoc as BillOfLadingFormData,
          logoUrl: "/images/logo.png",
          companyName: "SKY ARIANA LIMITED",
          companyNamePersian: "شرکت حمل و نقل بین المللی سکای آریانا لمیتد",
          companySubtitle: "Import & Export - International Transportation",
          companyPhone: "+93 700 939 365",
          companyEmail: "info@skyariana.com",
          companyAddress: "Kandahar, Afghanistan",
          companyLicence: "2401-2198",
        },
      }
    : (optionsOrBol as GenerateBOLPDFBlobOptions)

  const fileName = options?.fileName || "BOL.pdf"
  const previewElement =
    options?.previewElement ||
    (typeof document !== "undefined"
      ? (document.querySelector('[data-bol-a4="true"]') as HTMLElement | null) ||
        (document.querySelector('[data-pdf-export="true"]') as HTMLElement | null)
      : null)

  if (previewElement) {
    try {
      return await generatePDFBlob(previewElement, fileName)
    } catch (error) {
      console.warn("Direct element PDF capture failed, falling back to premium generator:", error)
      options?.onFallback?.(error instanceof Error ? error.message : String(error))
    }
  }

  if (options?.modern) {
    return await generatePremiumBOLPDFBlob(options.modern)
  }

  throw new Error("No preview element or modern BOL options available to generate PDF.")
}

function hasUnsupportedColor(value: string): boolean {
  return /\b(?:lab|lch|oklab|oklch|color-mix)\(/i.test(value)
}

function setPDFStyle(
  element: HTMLElement | SVGElement,
  property: string,
  value: string
): void {
  element.style.setProperty(property, value, "important")
}

function getClassText(source: Element): string {
  const className = source.getAttribute("class") || ""
  return className.toString()
}

function getPDFTextColor(
  className: string,
  sourceStyle: CSSStyleDeclaration
): string {
  if (className.includes("text-white")) return "#ffffff"
  if (className.includes("text-blue-100")) return "#dbeafe"
  if (className.includes("text-blue-400")) return "#60a5fa"
  if (className.includes("text-blue-500")) return "#3b82f6"
  if (className.includes("text-blue-600")) return "#2563eb"
  if (className.includes("text-blue-700")) return "#1d4ed8"
  if (className.includes("text-blue-800")) return "#1e40af"
  if (className.includes("text-red-400")) return "#f87171"
  if (className.includes("text-red-500")) return "#ef4444"
  if (className.includes("text-red-600")) return "#dc2626"
  if (className.includes("text-red-700")) return "#b91c1c"
  if (className.includes("text-red-800")) return "#991b1b"
  if (className.includes("text-green-600")) return "#16a34a"
  if (className.includes("text-green-700")) return "#15803d"
  if (className.includes("text-green-800")) return "#166534"
  if (className.includes("text-emerald-600")) return "#059669"
  if (className.includes("text-amber-600")) return "#d97706"
  if (className.includes("text-purple-600")) return "#9333ea"
  if (className.includes("text-cyan-600")) return "#0891b2"
  if (className.includes("text-sky-600")) return "#0284c7"
  if (className.includes("text-orange-600")) return "#ea580c"
  if (className.includes("text-gray-500")) return "#6b7280"
  if (className.includes("text-gray-600")) return "#4b5563"
  if (className.includes("text-gray-800")) return "#1f2937"

  if (
    sourceStyle.color &&
    sourceStyle.color !== "rgba(0, 0, 0, 0)" &&
    sourceStyle.color !== "transparent" &&
    !hasUnsupportedColor(sourceStyle.color)
  ) {
    return sourceStyle.color
  }

  return "#0f172a"
}

function getPDFBackgroundColor(className: string, sourceStyle: CSSStyleDeclaration): string {
  if (className.includes("bg-white/40")) return "rgba(255, 255, 255, 0.4)"
  if (className.includes("bg-white/50")) return "rgba(255, 255, 255, 0.5)"
  if (className.includes("bg-white/70")) return "rgba(255, 255, 255, 0.7)"
  if (className.includes("bg-white/80")) return "rgba(255, 255, 255, 0.8)"
  if (className.includes("bg-white/20")) return "rgba(255, 255, 255, 0.2)"
  if (className.includes("bg-blue-900/35")) return "rgba(30, 58, 138, 0.35)"
  if (className.includes("from-blue-500/10") || className.includes("to-blue-600/10")) return "#eff6ff"
  if (className.includes("from-green-500/10") || className.includes("to-green-600/10")) return "#f0fdf4"

  if (
    className.includes("from-blue-600") ||
    className.includes("bg-blue-600") ||
    className.includes("to-blue-800")
  ) {
    return "#1e40ff"
  }
  if (
    className.includes("from-blue-500") ||
    className.includes("to-blue-700") ||
    className.includes("bg-blue-500")
  ) {
    return "#1d4ed8"
  }
  if (
    className.includes("from-red-600") ||
    className.includes("bg-red-600") ||
    className.includes("to-rose-500")
  ) {
    return "#ff263b"
  }
  if (className.includes("from-red-50") || className.includes("bg-red-50")) return "#fef2f2"
  if (
    className.includes("from-green-600") ||
    className.includes("bg-green-600") ||
    className.includes("from-emerald-600")
  ) {
    return "#16a34a"
  }
  if (
    className.includes("from-green-500/10") ||
    className.includes("bg-green-100") ||
    className.includes("from-emerald-50")
  ) {
    return "#f0fdf4"
  }
  if (
    className.includes("from-blue-50") ||
    className.includes("bg-blue-50") ||
    className.includes("bg-blue-100")
  ) {
    return "#eff6ff"
  }
  if (
    className.includes("bg-white") ||
    className.includes("via-white") ||
    className.includes("from-white") ||
    className.includes("to-white")
  ) {
    return "#ffffff"
  }
  if (className.includes("bg-gray-50") || className.includes("from-gray-50")) return "#f9fafb"
  if (className.includes("bg-slate-50") || className.includes("from-slate-50")) return "#f8fafc"

  if (
    sourceStyle.backgroundColor !== "rgba(0, 0, 0, 0)" &&
    sourceStyle.backgroundColor !== "transparent" &&
    !hasUnsupportedColor(sourceStyle.backgroundColor)
  ) {
    return sourceStyle.backgroundColor
  }

  return "transparent"
}

function getPDFBackgroundImage(className: string, sourceStyle: CSSStyleDeclaration): string {
  if (
    className.includes("from-blue-600") &&
    className.includes("via-blue-700") &&
    className.includes("to-blue-800")
  ) {
    return "linear-gradient(90deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)"
  }
  if (className.includes("from-blue-600") && className.includes("to-blue-700")) {
    return "linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)"
  }
  if (className.includes("from-blue-500") && className.includes("to-blue-700")) {
    return "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
  }
  if (className.includes("from-red-600") && className.includes("to-rose-500")) {
    return "linear-gradient(90deg, #dc2626 0%, #f43f5e 100%)"
  }
  if (className.includes("from-red-50") && className.includes("to-white")) {
    return "linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)"
  }
  if (className.includes("from-blue-50") && className.includes("via-white")) {
    return "linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #eff6ff 100%)"
  }
  if (className.includes("from-blue-50") && className.includes("to-white")) {
    return "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)"
  }
  if (className.includes("from-blue-300") && className.includes("to-blue-500")) {
    return "linear-gradient(90deg, #93c5fd 0%, #3b82f6 100%)"
  }
  if (className.includes("from-blue-500") && className.includes("to-blue-300")) {
    return "linear-gradient(90deg, #3b82f6 0%, #93c5fd 100%)"
  }
  if (className.includes("from-green-600") && className.includes("to-green-700")) {
    return "linear-gradient(90deg, #16a34a 0%, #15803d 100%)"
  }

  if (
    sourceStyle.backgroundImage &&
    sourceStyle.backgroundImage !== "none" &&
    !hasUnsupportedColor(sourceStyle.backgroundImage)
  ) {
    return sourceStyle.backgroundImage
  }

  return "none"
}

function getPDFBorderColor(className: string): string {
  if (className.includes("border-blue-")) return "#93c5fd"
  if (className.includes("border-red-")) return "#ff4d5f"
  if (className.includes("border-green-") || className.includes("border-emerald-")) return "#86efac"
  if (className.includes("border-purple-")) return "#c4b5fd"
  if (className.includes("border-amber-")) return "#fcd34d"
  return "#cbd5e1"
}

function getPDFBoxShadow(className: string): string {
  if (className.includes("shadow-2xl")) return "0 25px 50px -12px rgba(15, 23, 42, 0.25)"
  if (className.includes("shadow-lg")) return "0 10px 15px -3px rgba(15, 23, 42, 0.18)"
  if (className.includes("shadow-md")) return "0 4px 6px -1px rgba(15, 23, 42, 0.16)"
  if (className.includes("shadow-sm")) return "0 1px 2px 0 rgba(15, 23, 42, 0.12)"
  return "none"
}

function sanitizeElementForPDF(source: Element, target: Element): void {
  const sourceStyle = window.getComputedStyle(source)
  const targetElement = target as HTMLElement
  const className = getClassText(source)
  const textColor = getPDFTextColor(className, sourceStyle)
  const backgroundColor = getPDFBackgroundColor(className, sourceStyle)
  const backgroundImage = getPDFBackgroundImage(className, sourceStyle)
  const borderColor = getPDFBorderColor(className)
  const boxShadow = getPDFBoxShadow(className)
  const isBOLBadge = source.getAttribute("data-pdf-bol-badge") === "true"
  const isBOLNumber = source.getAttribute("data-pdf-bol-number") === "true"

  setPDFStyle(targetElement, "color", isBOLNumber || isBOLBadge ? "#1e40af" : textColor)
  setPDFStyle(targetElement, "background-color", isBOLBadge ? "#ffffff" : backgroundColor)
  setPDFStyle(targetElement, "background-image", backgroundImage)
  setPDFStyle(targetElement, "border-color", borderColor)
  setPDFStyle(targetElement, "outline-color", "#2563eb")
  setPDFStyle(targetElement, "text-decoration-color", textColor)
  setPDFStyle(targetElement, "box-shadow", boxShadow)
  setPDFStyle(targetElement, "opacity", "1")
  setPDFStyle(targetElement, "visibility", "visible")
  setPDFStyle(targetElement, "backdrop-filter", "none")
  setPDFStyle(targetElement, "-webkit-backdrop-filter", "none")

  if (isBOLBadge) {
    setPDFStyle(targetElement, "display", "inline-flex")
    setPDFStyle(targetElement, "align-items", "center")
    setPDFStyle(targetElement, "justify-content", "center")
    setPDFStyle(targetElement, "min-width", "150px")
    setPDFStyle(targetElement, "min-height", "34px")
  }

  if (isBOLNumber) {
    setPDFStyle(targetElement, "display", "block")
    setPDFStyle(targetElement, "font-family", "Arial, Helvetica, sans-serif")
    setPDFStyle(targetElement, "font-size", "13px")
    setPDFStyle(targetElement, "font-weight", "700")
    setPDFStyle(targetElement, "line-height", "1.2")
    setPDFStyle(targetElement, "white-space", "nowrap")
  }

  if (sourceStyle.borderTopStyle !== "none") {
    setPDFStyle(targetElement, "border-top-color", borderColor)
  }
  if (sourceStyle.borderRightStyle !== "none") {
    setPDFStyle(targetElement, "border-right-color", borderColor)
  }
  if (sourceStyle.borderBottomStyle !== "none") {
    setPDFStyle(targetElement, "border-bottom-color", borderColor)
  }
  if (sourceStyle.borderLeftStyle !== "none") {
    setPDFStyle(targetElement, "border-left-color", borderColor)
  }

  if (backgroundImage === "none" && hasUnsupportedColor(sourceStyle.backgroundImage)) {
    setPDFStyle(targetElement, "background-image", "none")
  }

  if (target instanceof SVGElement) {
    setPDFStyle(target, "color", textColor)
    setPDFStyle(target, "fill", sourceStyle.fill === "none" ? "none" : textColor)
    setPDFStyle(target, "stroke", sourceStyle.stroke === "none" ? "none" : textColor)
  }

  Array.from(source.children).forEach((sourceChild, index) => {
    const targetChild = target.children.item(index)
    if (targetChild) {
      sanitizeElementForPDF(sourceChild, targetChild)
    }
  })
}

/**
 * Generate PDF from HTML element and return as Blob
 * Uses html-to-image (native SVG foreignObject) for 100% pixel-perfect, font-perfect,
 * RTL-compatible rendering identical to the on-screen A4 preview.
 */
export async function generatePDFBlob(
  element: HTMLElement,
  fileName: string
): Promise<Blob> {
  const jsPDF = await loadJSPDFLibrary()
  const pageWidth = 210
  const pageHeight = 297

  // Target the exact A4 root element if element is a container wrapper
  const a4Element =
    (element.matches?.('[data-bol-a4="true"]')
      ? element
      : (element.querySelector?.('[data-bol-a4="true"]') as HTMLElement | null)) || element

  // 1. Wait for document fonts and all image assets to be fully ready & decoded
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.ready
    } catch {}
  }

  const images = Array.from(a4Element.querySelectorAll("img"))
  await Promise.all(
    images.map(async (img) => {
      if (!img.complete) {
        await new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.onerror = () => resolve()
        })
      }
      if (typeof img.decode === "function") {
        try {
          await img.decode()
        } catch {}
      }
    })
  )

  // 2. Pre-bundle embedded font CSS for html-to-image so it doesn't fail on external stylesheets
  let fontCSS = ""
  try {
    const fonts = await loadPDFFontAssets()
    if (fonts) {
      fontCSS = `
        @font-face {
          font-family: 'NotoSans';
          font-weight: 400;
          font-style: normal;
          src: url(data:font/truetype;charset=utf-8;base64,${fonts.notoSansRegular}) format('truetype');
        }
        @font-face {
          font-family: 'NotoSans';
          font-weight: 700;
          font-style: normal;
          src: url(data:font/truetype;charset=utf-8;base64,${fonts.notoSansBold}) format('truetype');
        }
        @font-face {
          font-family: 'NotoNaskhArabic';
          font-weight: 400;
          font-style: normal;
          src: url(data:font/truetype;charset=utf-8;base64,${fonts.arabicRegular}) format('truetype');
        }
        @font-face {
          font-family: 'NotoNaskhArabic';
          font-weight: 700;
          font-style: normal;
          src: url(data:font/truetype;charset=utf-8;base64,${fonts.arabicBold}) format('truetype');
        }
      `
    }
  } catch (fontErr) {
    console.warn("Could not pre-bundle fonts for PDF capture:", fontErr)
  }

  // 3. Primary capture: High-resolution native SVG foreignObject rasterization via html-to-image
  try {
    const { toCanvas } = await import("html-to-image")

    const canvas = await toCanvas(a4Element, {
      pixelRatio: 4, // 384 DPI publication-grade sharpness
      quality: 1.0,
      cacheBust: false,
      skipFonts: true, // Embedded via fontEmbedCSS to avoid stylesheet CORS/SecurityError crashes
      fontEmbedCSS: fontCSS,
      backgroundColor: "#ffffff",
      style: {
        transform: "none",
        margin: "0",
        opacity: "1",
        visibility: "visible",
        boxShadow: "none",
        outline: "none",
      },
      filter: (node: HTMLElement) => {
        if (node.getAttribute?.("data-print-ignore") === "true") return false
        return true
      },
    })

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
      putOnlyUsedFonts: true,
    })

    const cleanTitle = (fileName || "BOL").replace(/\.pdf$/i, "")
    pdf.setProperties({
      title: cleanTitle,
      subject: cleanTitle,
      author: "SKY ARIANA LIMITED",
      creator: "Sky Ariana BOL PDF Export",
    })

    const imageData = canvas.toDataURL("image/png", 1.0)
    pdf.addImage(imageData, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST")

    const blob = pdf.output("blob") as Blob
    return await normalizePDFBlob(blob)
  } catch (htmlToImageError) {
    console.warn("html-to-image capture failed, trying html2canvas fallback:", htmlToImageError)
  }

  // 4. Secondary fallback: html2canvas
  let wrapper: HTMLDivElement | null = null

  try {
    const { html2canvas } = await loadPDFLibraries()

    // Clone element to avoid modifying the original
    const clonedElement = a4Element.cloneNode(true) as HTMLElement

    // Remove data attributes
    clonedElement.removeAttribute("data-pdf-export")
    clonedElement.setAttribute("data-pdf-export-fixed", "true")

    // Clean fixed dimensions matching standard A4
    clonedElement.style.width = "210mm"
    clonedElement.style.height = "297mm"
    clonedElement.style.maxHeight = "297mm"
    clonedElement.style.maxWidth = "210mm"
    clonedElement.style.minHeight = "297mm"
    clonedElement.style.overflow = "hidden"
    clonedElement.style.background = "white"
    clonedElement.style.boxShadow = "none"
    clonedElement.style.margin = "0"
    clonedElement.style.backdropFilter = "none"
    sanitizeElementForPDF(a4Element, clonedElement)

    const pixelWidth = Math.round((210 * 96) / 25.4)
    const pixelHeight = Math.round((297 * 96) / 25.4)

    wrapper = document.createElement("div")
    wrapper.style.position = "fixed"
    wrapper.style.left = "-10000px"
    wrapper.style.top = "0"
    wrapper.style.width = "210mm"
    wrapper.style.height = "297mm"
    wrapper.style.background = "#ffffff"
    wrapper.style.overflow = "hidden"
    wrapper.style.opacity = "1"
    wrapper.style.pointerEvents = "none"
    wrapper.style.zIndex = "-1"
    wrapper.appendChild(clonedElement)
    document.body.appendChild(wrapper)

    const canvas = await html2canvas(clonedElement, {
      scale: 4, // 384 DPI sharpness
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      allowTaint: true,
      imageTimeout: 8000,
      width: pixelWidth,
      height: pixelHeight,
      windowWidth: pixelWidth,
      windowHeight: pixelHeight,
      ignoreElements: (el: Element) => {
        const tag = el.tagName?.toUpperCase()
        if (tag === "FILTER" || tag === "DEFS") return true
        if (el instanceof HTMLCanvasElement && (el.width === 0 || el.height === 0)) return true
        if (el instanceof HTMLImageElement && (el.naturalWidth === 0 || el.naturalHeight === 0)) return true
        return false
      },
      onclone: (clonedDocument: Document) => {
        const style = clonedDocument.createElement("style")
        style.textContent = `
              :root, html, body {
                --background: #ffffff !important;
                --foreground: #0f172a !important;
                --card: #ffffff !important;
                --card-foreground: #0f172a !important;
                --popover: #ffffff !important;
                --popover-foreground: #0f172a !important;
                --primary: #1d4ed8 !important;
                --primary-foreground: #ffffff !important;
                --secondary: #f8fafc !important;
                --secondary-foreground: #0f172a !important;
                --muted: #f8fafc !important;
                --muted-foreground: #475569 !important;
                --accent: #dbeafe !important;
                --accent-foreground: #0f172a !important;
                --destructive: #dc2626 !important;
                --destructive-foreground: #ffffff !important;
                --border: #cbd5e1 !important;
                --input: #cbd5e1 !important;
                --ring: #2563eb !important;
              }

              *, *::before, *::after {
                text-shadow: none !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
              }

              [data-pdf-export-fixed="true"] {
                width: 210mm !important;
                height: 297mm !important;
                max-height: 297mm !important;
                min-height: 297mm !important;
                overflow: hidden !important;
                box-shadow: none !important;
                margin: 0 !important;
              }
            `
        clonedDocument.head.appendChild(style)
      },
    })

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    })

    const cleanTitle = (fileName || "BOL").replace(/\.pdf$/i, "")
    pdf.setProperties({
      title: cleanTitle,
      subject: cleanTitle,
      author: "SKY ARIANA LIMITED",
      creator: "Sky Ariana BOL PDF Export",
    })

    const imageData = canvas.toDataURL("image/png")
    pdf.addImage(imageData, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST")

    const blob = pdf.output("blob") as Blob
    return normalizePDFBlob(blob)
  } catch (error) {
    console.error("PDF generation error:", error)
    throw new Error(
      `Failed to generate PDF: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  } finally {
    wrapper?.remove()
  }
}

/**
 * Upload PDF to server storage
 */
export async function uploadPDFToServer(
  pdfBlob: Blob,
  bolId: string,
  bolNumber: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const validPdfBlob = await normalizePDFBlob(pdfBlob)
    const formData = new FormData()
    formData.append("pdf", validPdfBlob, `${bolNumber || "BOL"}.pdf`)
    formData.append("bolId", bolId || bolNumber || "BOL")
    formData.append("bolNumber", bolNumber || "BOL")

    const response = await fetch("/api/bol/pdf", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || "Failed to upload PDF",
      }
    }

    const data = await response.json()

    if (data.success && data.data) {
      return {
        success: true,
        url: data.data.pdfUrl,
      }
    }

    return {
      success: false,
      error: data.error || "Failed to upload PDF",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error uploading PDF",
    }
  }
}

/**
 * Download PDF from server
 */
export async function downloadPDFFromServer(
  bolId: string,
  fileName: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/bol/pdf?action=download&bolId=${bolId}`
    )

    if (!response.ok) {
      throw new Error("Failed to download PDF")
    }

    const data = await response.json()

    if (data.success && data.data?.pdfUrl) {
      // Redirect to the PDF URL for download
      window.open(data.data.pdfUrl, "_blank")
      return true
    }

    return false
  } catch (error) {
    console.error("Error downloading PDF:", error)
    return false
  }
}

/**
 * Automatically builds a rich document and file name from the BOL data following the user's specification:
 * [Consignee Name]-[Quantity]-[Inv No]-[Shipper Name] (e.g. VEER ENTERPRISES-1350-CTNS-INV-033-NAJIB AHMAD LTD.pdf)
 */
export function buildBolSmartFileName(
  docOrFormData: any,
  fallbackBolNumber: string = "BOL",
  extension: string = ".pdf"
): string {
  if (!docOrFormData) {
    const cleanFallback = (fallbackBolNumber || "BOL").trim()
    return extension ? (cleanFallback.endsWith(extension) ? cleanFallback : `${cleanFallback}${extension}`) : cleanFallback
  }

  // 1. Extract Consignee Name (Take first line if multiline address)
  const rawConsignee = (docOrFormData.consignee_name || docOrFormData.consignee || docOrFormData.consigneeName || "").trim()
  let consignee = rawConsignee.split(/[\r\n]+/)[0].trim()
  consignee = consignee.replace(/[/\\:*?"<>|]/g, "").replace(/\s+/g, " ").trim()

  // 2. Extract Quantity (e.g. 1350 CTNS or 1407 CNTS)
  let rawQty = (docOrFormData.number_of_packages || docOrFormData.numberOfPackages || docOrFormData.quantity || docOrFormData.packages || "").trim()
  if (!rawQty) {
    const cargo = (docOrFormData.cargo_description || "").trim()
    const qtyMatch = cargo.match(/(\d+[\s\-]*(?:CTNS|CNTS|BAGS|PACKAGES|BOXES|PCS|KGS|MT|CARTONS|DRUMS))/i)
    if (qtyMatch) {
      rawQty = qtyMatch[1].trim()
    }
  }
  let quantity = rawQty.replace(/[/\\:*?"<>|]/g, "").replace(/\s+/g, "-").trim()

  // 3. Extract Invoice Number
  let invNo = (docOrFormData.invoiceNo || docOrFormData.invoice_number || docOrFormData.invoice_no || docOrFormData.invoiceNumber || "").trim()
  if (!invNo) {
    const combinedNotes = `${docOrFormData.cargo_description || ""} ${docOrFormData.notes_1 || ""} ${docOrFormData.notes_2 || ""} ${docOrFormData.notes_3 || ""}`
    const match = combinedNotes.match(/(?:Invoice\s*No|Invoice\s*#|INV\s*NO|IN\s*NO|Invoice|INV)\s*[:#-]?\s*([A-Z0-9/_-]+)/i)
    if (match && match[1]) {
      const parsed = match[1].trim()
      if (parsed.length < 25) {
        invNo = /^INV|^IN/i.test(parsed) ? parsed.toUpperCase() : `INV-${parsed.toUpperCase()}`
      }
    }
  } else if (!/^INV|^IN/i.test(invNo)) {
    invNo = `INV-${invNo.toUpperCase()}`
  }

  // 4. Extract Shipper Name (Take first line if multiline)
  const rawShipper = (docOrFormData.shipper_name || docOrFormData.shipperDescription || docOrFormData.shipper || docOrFormData.shipperName || "").trim()
  let shipper = rawShipper.split(/[\r\n]+/)[0].trim()
  shipper = shipper.replace(/[/\\:*?"<>|]/g, "").replace(/\s+/g, " ").trim()

  // 5. BOL Number fallback
  const bolNumber = (docOrFormData.bol_number || docOrFormData.barnamehNo || docOrFormData.bolNo || fallbackBolNumber || "").trim()

  // Construct components in exact order: Consignee -> Quantity -> Inv No -> Shipper
  const parts: string[] = []
  if (consignee) parts.push(consignee)
  if (quantity) parts.push(quantity)
  if (invNo) parts.push(invNo)
  if (shipper) parts.push(shipper)

  if (parts.length === 0) {
    const cleanFallback = (bolNumber || fallbackBolNumber || "BOL").trim().replace(/[/\\:*?"<>|]/g, "_")
    return extension ? (cleanFallback.endsWith(extension) ? cleanFallback : `${cleanFallback}${extension}`) : cleanFallback
  }

  // Join parts with hyphen, ensuring clean file name
  const rawFileName = parts.join("-").replace(/[/\\:*?"<>|]/g, "_").replace(/-+/g, "-").replace(/\s+/g, " ").trim()
  return extension ? (rawFileName.endsWith(extension) ? rawFileName : `${rawFileName}${extension}`) : rawFileName
}

/**
 * Save a PDF blob as a file on the user's device
 */
export async function savePDFToDevice(
  pdfBlob: Blob,
  fileName: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    if (typeof window === "undefined") {
      throw new Error("Local PDF save is only available in the browser")
    }

    const validPdfBlob = await normalizePDFBlob(pdfBlob)

    // Trigger direct browser file download immediately to user's device
    const url = URL.createObjectURL(validPdfBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 10000)

    // Background backup call to local save API if endpoint exists
    try {
      const formData = new FormData()
      formData.append("pdf", validPdfBlob, fileName)
      formData.append("fileName", fileName)

      fetch("/api/bol/pdf/local-save", {
        method: "POST",
        body: formData,
      }).catch(() => {})
    } catch {}

    return { success: true, path: fileName }
  } catch (error) {
    console.error("Error saving PDF to device:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error saving PDF",
    }
  }
}

/**
 * Open the generated PDF in the browser print flow.
 */
export async function printPDFBlob(
  pdfBlob: Blob,
  fileName: string
): Promise<boolean> {
  try {
    if (typeof window === "undefined") {
      throw new Error("PDF print is only available in the browser")
    }

    const validPdfBlob = await normalizePDFBlob(pdfBlob)
    const url = URL.createObjectURL(validPdfBlob)

    const printWindow = window.open(url, "_blank")
    if (printWindow) {
      printWindow.document.title = fileName
      printWindow.focus()
      setTimeout(() => {
        try {
          printWindow.print()
        } finally {
          setTimeout(() => URL.revokeObjectURL(url), 60000)
        }
      }, 1000)
      return true
    }

    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "0"
    iframe.src = url
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe)
          URL.revokeObjectURL(url)
        }, 60000)
      }
    }
    document.body.appendChild(iframe)

    return true
  } catch (error) {
    console.error("Error printing PDF:", error)
    return false
  }
}

const PRINT_WINDOW_READY_TIMEOUT_MS = 5000

function waitForPrintWindowReady(printWindow: Window | null, timeout = PRINT_WINDOW_READY_TIMEOUT_MS): Promise<boolean> {
  return new Promise((resolve) => {
    if (!printWindow || printWindow.closed) {
      resolve(false)
      return
    }

    const start = Date.now()
    const interval = window.setInterval(() => {
      if (!printWindow || printWindow.closed) {
        window.clearInterval(interval)
        resolve(false)
        return
      }

      try {
        if ((printWindow as any).__skyBolPrintReady === true || printWindow.document.readyState === "complete") {
          window.clearInterval(interval)
          resolve(true)
          return
        }
      } catch {
        // ignore cross-window access issues until the preview window is ready
      }

      if (Date.now() - start > timeout) {
        window.clearInterval(interval)
        resolve(false)
      }
    }, 50)
  })
}

export function openPDFPrintWindow(fileName: string): Window | null {
  if (typeof window === "undefined") return null

  const printWindow = window.open("", "_blank", "width=1000,height=840")
  if (!printWindow) return null

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <title>${fileName}</title>
        <style>
          * { box-sizing: border-box; }
          html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: #eff6ff;
            color: #0f172a;
            font-family: Arial, Helvetica, sans-serif;
          }
          .toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 16px;
            background: #ffffff;
            border-bottom: 1px solid #dbeafe;
          }
          .toolbar h1 {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
          }
          .toolbar button {
            border: none;
            background: #2563eb;
            color: #ffffff;
            font-size: 13px;
            font-weight: 700;
            padding: 10px 16px;
            border-radius: 9999px;
            cursor: pointer;
          }
          .toolbar button:hover {
            background: #1d4ed8;
          }
          .viewer {
            position: absolute;
            top: 52px;
            left: 0;
            right: 0;
            bottom: 0;
            background: #f8fafc;
          }
          .viewer iframe {
            width: 100%;
            height: 100%;
            border: none;
            background: #ffffff;
          }
          .loading {
            display: grid;
            min-height: 100vh;
            place-items: center;
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <h1>${fileName}</h1>
          <button id="print-button" type="button">Print</button>
        </div>
        <div class="viewer">
          <iframe id="pdf-preview" title="PDF Preview"></iframe>
        </div>
        <script>
          window.__skyBolPrintReady = false

          const printButton = document.getElementById('print-button')
          const previewFrame = document.getElementById('pdf-preview')

          window.addEventListener('message', (event) => {
            if (event?.data?.type === 'sky-bol-load-pdf' && event.data.url) {
              previewFrame.src = event.data.url
            }
          })

          if (printButton) {
            printButton.addEventListener('click', () => {
              if (previewFrame && previewFrame.contentWindow) {
                previewFrame.contentWindow.focus()
                previewFrame.contentWindow.print()
              }
            })
          }

          function markReady() {
            window.__skyBolPrintReady = true
          }

          if (document.readyState === 'complete') {
            markReady()
          } else {
            window.addEventListener('DOMContentLoaded', markReady)
          }
        </script>
      </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  return printWindow
}

export async function printPDFBlobInWindow(
  pdfBlob: Blob,
  fileName: string,
  printWindow: Window | null
): Promise<boolean> {
  try {
    if (!printWindow || printWindow.closed) {
      return printPDFBlob(pdfBlob, fileName)
    }

    const validPdfBlob = await normalizePDFBlob(pdfBlob)
    const url = URL.createObjectURL(validPdfBlob)

    try {
      const windowReady = await waitForPrintWindowReady(printWindow)
      if (windowReady) {
        try {
          printWindow.postMessage({ type: "sky-bol-load-pdf", url }, window.location.origin)
          printWindow.focus()
        } catch (error) {
          console.error("Failed to send PDF preview URL to print window:", error)
          if (!printWindow.closed) {
            printWindow.location.replace(url)
          }
        }
      } else {
        console.warn("Print window did not become ready in time; falling back to direct PDF navigation")
        if (!printWindow.closed) {
          printWindow.location.replace(url)
          printWindow.focus()
        }
      }
    } catch (error) {
      console.error("Failed to prepare print window:", error)
      if (printWindow && !printWindow.closed) {
        try {
          printWindow.location.replace(url)
          printWindow.focus()
        } catch {
          // ignore
        }
      }
    }

    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000)
    return true
  } catch (error) {
    console.error("Error printing PDF in window:", error)
    return false
  }
}

/**
 * Delete PDF from server
 */
export async function deletePDFFromServer(
  bolId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/bol/pdf?bolId=${bolId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || "Failed to delete PDF",
      }
    }

    const data = await response.json()

    return {
      success: data.success,
      error: data.error,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error deleting PDF",
    }
  }
}

