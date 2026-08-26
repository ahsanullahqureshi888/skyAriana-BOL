"use client"

import { useState, useEffect } from "react"
import type { CSSProperties, ReactNode, ComponentType } from "react"
import type { BillOfLadingFormData } from "@/lib/types/bill-of-lading"
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  FileText,
  Globe,
  Mail,
  MapPin,
  Package,
  Phone,
  Route,
  ShieldCheck,
  Ship,
  Truck,
  UserRound,
} from "lucide-react"
import {
  RouteAirIcon,
  RouteCarIcon,
  RouteTrainIcon,
  RouteTruckIcon,
  RouteVesselIcon,
} from "../icons/RouteTransportIcons"
import {
  COMPANY_STAMP_SIGNATURE_SRC,
  COMPANY_STAMP_SIGNATURE_DATA_URL,
  getStoredCompanyStamp,
  getStoredCompanyStampScale,
} from "@/lib/company-stamp-data"

interface A4PreviewProps {
  bolNumber: string
  issueDate: string
  persianDate: string
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
  exportTarget?: boolean
  pdfExport?: boolean
  includeColorStrip?: boolean
  backgroundImageUrl?: string
  backgroundOpacity?: number
  showStampSignature?: boolean
  onToggleStampSignature?: (show: boolean) => void
}

type DetailItem = {
  label: string
  value?: string | null
  important?: boolean
  rtl?: boolean
  highlight?: boolean
  highlightColor?: string
}

export const sampleBillOfLadingData: Partial<BillOfLadingFormData> = {
  bol_number: "BOL-2026-NSA001",
  notes_1_label: "Loading Contact",
  notes_1: "Nazar Mohammad (Yarmal)\n(+93) 0 700 203 307",
  notes_2_label: "Representative",
  notes_2: "Abdul Wahab Regwal / Najibullah Hussain Mahmoodi Muqadam\n0796140001  0703130001\nDougharoun Representative: 09152091993",
  shipper_name: "PAHLAWAN NOORI LTD",
  shipper_address: "Shorandam Industrial Park, Kandahar, Afghanistan",
  consignee_name: "S V INTERNATIONAL",
  consignee_address: "Delhi, India",
  routes: [
    { id: "sample-route-1", location: "Kandahar", locationPersian: "کندهار", stopOrder: 1, stopLabel: "Origin", transportMode: "truck" },
    { id: "sample-route-2", location: "Nimroz", locationPersian: "نیمروز", stopOrder: 2, stopLabel: "Stop 1", transportMode: "truck" },
    { id: "sample-route-3", location: "Bandar Abbas, IR", locationPersian: "بندرعباس، ایران", stopOrder: 3, stopLabel: "Stop 2", transportMode: "vessel" },
    { id: "sample-route-4", location: "Dubai, AE", locationPersian: "دبی، امارات", stopOrder: 4, stopLabel: "Stop 3", transportMode: "vessel" },
    { id: "sample-route-5", location: "Nhava Sheva, IN", locationPersian: "نهاوا شوا، هند", stopOrder: 5, stopLabel: "Destination", transportMode: "vessel" },
  ],
  cargo_description: `📦 CONTAINER & CARGO DETAILS │ 🧾 DOCUMENT & SHIPPING DETAILS
🥬 Cargo: | 📅 Transit Date: | 📄 HS CODE:  │ 📄 Afghan TC No:  │ 📄 Invoice NO: `,
  net_weight: "49,320 KGS",
  gross_weight: "55,685 KGS",
  number_of_packages: "1407 CNTS",
}

const a4ShellStyle = {
  background: "#ffffff",
  fontFamily: "Arial, Helvetica, Inter, Calibri, sans-serif",
} satisfies CSSProperties

const blueBarStyle = {
  background: "linear-gradient(90deg, #1d4ed8 0%, #2563eb 58%, #0891b2 100%)",
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
} satisfies CSSProperties

const darkHeaderStyle = {
  background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
} satisfies CSSProperties

const headerGridStyle = {
  display: "grid",
  gridTemplateColumns: "30mm 1fr 45mm",
  alignItems: "center",
  columnGap: "2mm",
} satisfies CSSProperties

const logoFrameStyle = {
  alignItems: "center",
  display: "flex",
  height: "22mm",
  justifyContent: "center",
  maxHeight: "22mm",
  maxWidth: "32mm",
  minHeight: "22mm",
  overflow: "visible",
  width: "32mm",
} satisfies CSSProperties

const logoImageStyle = {
  display: "block",
  height: "auto",
  maxHeight: "22mm",
  maxWidth: "32mm",
  objectFit: "contain",
  width: "auto",
  filter: "drop-shadow(0 1px 2px rgba(30, 58, 138, 0.12))",
} satisfies CSSProperties

const labels = {
  persianCompanyFallback: "\u0634\u0631\u06a9\u062a \u062d\u0645\u0644 \u0648 \u0646\u0642\u0644 \u0628\u06cc\u0646 \u0627\u0644\u0645\u0644\u0644\u06cc",
  billOfLadingFa: "\u0628\u0627\u0631\u0646\u0627\u0645\u0647",
  exporterContactsFa: "\u062a\u0645\u0627\u0633\u200c\u0647\u0627\u06cc \u0635\u0627\u062f\u0631\u06a9\u0646\u0646\u062f\u0647",
  exporterInfoFa: "\u0641\u0631\u0633\u062a\u0646\u062f\u0647",
  consigneeInfoFa: "\u06af\u06cc\u0631\u0646\u062f\u0647",
  notifyPartyFa: "\u0637\u0631\u0641 \u0627\u0637\u0644\u0627\u0639\u002d\u0631\u0633\u0627\u0646\u06cc",
  routeFa: "\u0645\u0633\u06cc\u0631 \u062d\u0645\u0644 \u0648 \u0646\u0642\u0644",
  shipmentInfoFa: "\u0627\u0637\u0644\u0627\u0639\u0627\u062a \u062d\u0645\u0644",
  cargoDescFa: "\u0634\u0631\u062d \u06a9\u0627\u0644\u0627",
  containerNoFa: "\u0634\u0645\u0627\u0631\u0647 \u06a9\u0627\u0646\u062a\u06cc\u0646\u0631",
  sealNoFa: "\u0634\u0645\u0627\u0631\u0647 \u067e\u0644\u0645\u0628",
  packagesFa: "\u062a\u0639\u062f\u0627\u062f \u0628\u0633\u062a\u0647",
  kgsPerCartonFa: "\u06a9\u06cc\u0644\u0648 \u0641\u06cc \u06a9\u0627\u0631\u062a\u0646",
  grossPerCartonFa: "\u0648\u0632\u0646 \u0646\u0627\u062e\u0627\u0644\u0635 \u0641\u06cc \u06a9\u0627\u0631\u062a\u0646",
  rateFa: "\u0646\u0631\u062e \u0641\u06cc \u06a9\u06cc\u0644\u0648",
  goodsValueFa: "\u0627\u0631\u0632\u0634 \u06a9\u0627\u0644\u0627",
  netWeightFa: "\u0648\u0632\u0646 \u062e\u0627\u0644\u0635",
  grossWeightFa: "\u0648\u0632\u0646 \u0646\u0627\u062e\u0627\u0644\u0635",
  measurementFa: "\u0627\u0646\u062f\u0627\u0632\u0647",
  goodsDescriptionFa: "\u0634\u0631\u062d \u06a9\u0627\u0644\u0627",
  stampFa: "\u0645\u0647\u0631",
  companyStampSignFa: "\u0645\u0647\u0631 \u0648 \u0627\u0645\u0636\u0627\u06cc \u0634\u0631\u06a9\u062a",
  authorityVerificationFa: "\u062a\u0627\u06cc\u06cc\u062f \u0631\u0633\u0645\u06cc",
  shippingDetailsFa: "جزئیات حمل و بنادر",
  portOfLoadingFa: "بندر بارگیری",
  portOfDischargeFa: "بندر تخلیه",
  placeOfDeliveryFa: "محل تحویل",
  vesselVoyageFa: "کشتی و شماره سفر",
  freightPayableFa: "محل پرداخت کرایه",
} as const

function cleanText(value?: string | null) {
  if (!value) return ""
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function cleanCargoDescriptionText(text?: string | null): string {
  if (!text) return ""

  const lines = text.split("\n")
  const cleanedLines = lines.map((line) => {
    const parts = line.split(/[│|]/)
    const validParts = parts
      .map((part) => part.trim())
      .filter((part) => {
        if (!part) return false
        if (part.includes(":")) {
          const colonIdx = part.indexOf(":")
          const val = part.slice(colonIdx + 1).trim()
          if (!val) return false
        }
        return true
      })

    return validParts.join(" │ ")
  })

  return cleanedLines.filter(Boolean).join("\n")
}

function hasValue(value?: string | null) {
  return cleanText(value).length > 0
}

function joinOfficeLine(parts: Array<string | undefined>) {
  return parts.map(cleanText).filter(Boolean).join(" | ")
}

function containsLatin(value: string) {
  return /[A-Za-z]/.test(value)
}

function containsArabic(value: string) {
  return /[\u0600-\u06FF]/.test(value)
}

function DocumentQRCode({ value, size = 28 }: { value: string; size?: number }) {
  const grid = 21
  const modules: boolean[][] = Array.from({ length: grid }, () => Array(grid).fill(false))

  const addFinder = (r: number, c: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
          modules[r + i][c + j] = true
        }
      }
    }
  }

  addFinder(0, 0)
  addFinder(0, 14)
  addFinder(14, 0)

  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }

  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const isFinder = (r < 7 && c < 7) || (r < 7 && c >= 14) || (r >= 14 && c < 7)
      if (!isFinder) {
        const bit = ((hash ^ (r * 31 + c * 17)) & 1) === 1
        modules[r][c] = bit
      }
    }
  }

  const cellSize = size / grid
  let path = ""
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      if (modules[r][c]) {
        path += `M${(c * cellSize).toFixed(2)},${(r * cellSize).toFixed(2)}h${cellSize.toFixed(2)}v${cellSize.toFixed(2)}h-${cellSize.toFixed(2)}z `
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0 block"
      style={{
        shapeRendering: "crispEdges",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
        backgroundColor: "#ffffff",
      }}
    >
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  )
}

function textDirection(value?: string | null) {
  const text = cleanText(value)
  const hasArabic = /[\u0600-\u06FF]/.test(text)
  const hasLatin = /[A-Za-z]/.test(text)
  return hasArabic && !hasLatin ? "rtl" : "ltr"
}

function hasRTLText(value?: string | null) {
  const text = cleanText(value)
  return /[\u0600-\u06FF]/.test(text) && !/[A-Za-z]/.test(text)
}

function parseNamePhonePair(segment: string): { label: string; number: string } | null {
  const clean = segment.trim()
  if (!clean.includes(":")) return null
  const colonIdx = clean.indexOf(":")
  const label = clean.slice(0, colonIdx).trim()
  const number = clean.slice(colonIdx + 1).trim()
  if (!label || !number) return null

  // Reject general business fields from being formatted as phone pairs
  const isBusinessField = /^(no|gst|pan|iec|fssai|cargo|item|items|invoice|bl|bol|container|seal|truck|driver|weight|gross|net|rate|qty|quantity|total|remarks|goods|description|address|date|place|origin|destination)$/i.test(label)
  if (isBusinessField) return null

  // Phone number MUST be purely digits, +, spaces, hyphens, parentheses, and NO English letters
  const isPurePhone = /^\+?[\d\s\-\(\)\/\.]{5,22}$/.test(number) && /\d{4,}/.test(number) && !/[a-zA-Z]/.test(number)

  if (isPurePhone && (hasRTLText(label) || /^(phone|cell|tel|mobile|contact|rep|representative|whatsApp|telegram)$/i.test(label))) {
    return { label, number }
  }
  return null
}

function renderLineContent(line: string, forceLTR = false) {
  let clean = line.trim()
  if (!clean) return null

  // If line is a pure phone number with an accidental trailing colon (e.g. "0794983011:")
  if (/^\+?[\d\s\-\(\)\/\.]+:$/.test(clean) && !/[a-zA-Z]/.test(clean)) {
    clean = clean.slice(0, -1).trim()
  }

  // Check if line is purely phone numbers or dialing codes (e.g. "0796140001 0703130001" or "(+93) 0 700 203 307")
  const isPureNumericPhone = /^\+?[\d\s\-\(\)\/\.]{7,30}$/.test(clean) && /\d{5,}/.test(clean) && !/[a-zA-Z]/.test(clean)
  if (isPureNumericPhone) {
    return (
      <span
        className="block font-mono font-bold text-blue-950 tracking-wider text-[8.8pt] leading-tight text-left"
        dir="ltr"
        style={{ direction: "ltr", unicodeBidi: "isolate" }}
      >
        {clean}
      </span>
    )
  }

  // Check if line contains multiple contact items separated by comma, pipe, or semicolon (e.g. "عصمت الله: 0729807676 , حکمت الله: 0799007371")
  const delimiter = clean.includes(" , ") ? " , " : clean.includes(",") ? "," : clean.includes("|") ? "|" : clean.includes("؛") ? "؛" : null
  if (delimiter) {
    const rawSegments = clean.split(delimiter).map((s) => s.trim()).filter(Boolean)
    const hasPairs = rawSegments.some((s) => parseNamePhonePair(s) !== null)

    if (hasPairs) {
      return (
        <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1 font-bold leading-normal text-left max-w-full" dir="ltr">
          {rawSegments.map((segment, idx) => {
            const pair = parseNamePhonePair(segment)
            if (pair) {
              const isLabelPersian = hasRTLText(pair.label)
              return (
                <span key={idx} className="whitespace-nowrap inline-flex items-center gap-1">
                  {idx > 0 && <span className="text-blue-400 font-bold mx-0.5">•</span>}
                  <span
                    className={isLabelPersian ? "persian-text bol-persian-text font-[vazirmatn] text-slate-800 font-extrabold text-[8.2pt]" : "text-slate-800 font-bold text-[8.2pt]"}
                    dir="ltr"
                    style={{ unicodeBidi: "isolate" }}
                  >
                    {pair.label}
                  </span>
                  <span className="text-slate-400 font-black text-[8.2pt]">:</span>
                  <span className="font-mono font-bold text-blue-950 tracking-tight text-[8.5pt]" dir="ltr" style={{ direction: "ltr", unicodeBidi: "isolate" }}>
                    {pair.number}
                  </span>
                </span>
              )
            }

            const isSegPersian = hasRTLText(segment)
            return (
              <span key={idx} className="whitespace-nowrap inline-flex items-center gap-1">
                {idx > 0 && <span className="text-blue-400 font-bold mx-0.5">•</span>}
                <span
                  className={isSegPersian ? "persian-text bol-persian-text font-[vazirmatn] text-slate-800 font-extrabold text-[8.2pt]" : "text-slate-800 font-bold text-[8.2pt]"}
                  dir="ltr"
                  style={{ unicodeBidi: "isolate" }}
                >
                  {segment}
                </span>
              </span>
            )
          })}
        </span>
      )
    }
  }

  // Check if line is a single contact label:number pair (e.g. "نماینده دوغارون / شماره تماس: 09152091993")
  const singlePair = parseNamePhonePair(clean)
  if (singlePair) {
    const isLabelPersian = hasRTLText(singlePair.label)
    return (
      <span className="whitespace-nowrap inline-flex items-center gap-1 font-bold leading-normal text-left" dir="ltr">
        <span
          className={isLabelPersian ? "persian-text bol-persian-text font-[vazirmatn] text-slate-800 font-extrabold text-[8.4pt]" : "text-slate-800 font-bold text-[8.4pt]"}
          dir="ltr"
          style={{ unicodeBidi: "isolate" }}
        >
          {singlePair.label}
        </span>
        <span className="text-slate-400 font-black text-[8.4pt]">:</span>
        <span className="font-mono font-bold text-blue-950 tracking-wider text-[8.8pt]" dir="ltr" style={{ direction: "ltr", unicodeBidi: "isolate" }}>
          {singlePair.number}
        </span>
      </span>
    )
  }

  // Check if line is a Persian section label ending with colon (e.g. "حاجی معلم صاحب:")
  if (clean.endsWith(":") && hasRTLText(clean.slice(0, -1))) {
    const labelOnly = clean.slice(0, -1).trim()
    return (
      <span
        className="block persian-text bol-persian-text font-[vazirmatn] text-[8.6pt] font-black text-blue-900 leading-tight text-left mt-0.5"
        dir="rtl"
        style={{ unicodeBidi: "isolate", textAlign: "left" }}
      >
        {labelOnly}:
      </span>
    )
  }

  // Ensure slashes in text have clean space around them so they don't stick to words
  const spacedLine = clean.replace(/([^\s])\/([^\s])/g, "$1 / $2")
  const isPersian = hasRTLText(spacedLine)
  const isPersianDigitsOnly = /^[\u06F0-\u06F9\/\-\s:]+$/.test(spacedLine)

  return (
    <span
      className={`block ${
        isPersian
          ? "persian-text bol-persian-text font-[vazirmatn] text-[8.4pt] font-extrabold text-slate-900"
          : "font-sans font-semibold text-slate-900 text-[8pt]"
      } ${isPersianDigitsOnly ? "persian-digits" : ""} leading-snug text-left break-words`}
      dir={isPersianDigitsOnly ? "ltr" : isPersian ? "rtl" : "ltr"}
      style={{ unicodeBidi: "isolate", textAlign: "left", wordBreak: "break-word", overflowWrap: "break-word" }}
    >
      {spacedLine}
    </span>
  )
}

function TextLines({
  value,
  className,
  forceLTR = false,
}: {
  value?: string | null
  className?: string
  forceLTR?: boolean
}) {
  const lines = cleanText(value).split("\n").filter(Boolean)

  if (lines.length === 0) return null

  return (
    <span
      className={`block min-w-0 max-w-full ${className || ""} ${forceLTR ? "text-left" : ""}`}
      dir={forceLTR ? "ltr" : undefined}
      style={{
        overflowWrap: "anywhere",
        unicodeBidi: "plaintext",
        textAlign: forceLTR ? "left" : "inherit",
        wordBreak: "break-word",
      }}
    >
      {lines.map((line, index) => (
        <span key={`${line}-${index}`} className="block text-left">
          {renderLineContent(line, forceLTR)}
        </span>
      ))}
    </span>
  )
}

function Section({
  title,
  subtitle,
  icon,
  children,
  glass = false,
  printKey,
  pdfMode = false,
  titleClassName,
}: {
  title: string
  subtitle?: string
  icon: ReactNode
  children: ReactNode
  glass?: boolean
  printKey?: string
  pdfMode?: boolean
  titleClassName?: string
}) {
  return (
    <section
      dir="ltr"
      data-print-section={printKey || title}
      {...(pdfMode ? { 'data-no-break': true } : {})}
      className={`overflow-hidden rounded-xl border ${pdfMode ? 'border-blue-200/90 bg-white' : 'shadow-md shadow-blue-100/70 border-blue-200/80 bg-white/92 backdrop-blur-xs'}`}
    >
      <div className="flex items-center justify-between px-2.5 py-0.6 text-white" style={blueBarStyle}>
        <div className="flex items-center gap-1.5">
          {icon}
          {/* Force English title to render left-to-right so mixed-language headers don't flip */}
          <h3 dir="ltr" className={`${titleClassName || 'text-[8.5pt]'} font-black uppercase leading-none tracking-wide`}>
            {title}
          </h3>
        </div>
        {subtitle && (
          <p className="persian-text bol-persian-text font-[vazirmatn] text-[8.5pt] font-bold leading-none" dir="rtl">
            {subtitle}
          </p>
        )}
      </div>
      <div className="p-1">{children}</div>
    </section>
  )
}

function renderFormattedLabel(label: string, forceLTR = false) {
  if (!label) return null

  if (label.includes("/")) {
    const parts = label.split("/")
    const englishPart = parts[0].trim()
    const persianPart = parts.slice(1).join("/").trim()

    return (
      <div className="flex items-center justify-between gap-2 text-left" dir="ltr">
        <span className="block text-[6.5pt] font-black uppercase tracking-wider text-blue-700 leading-tight text-left">
          {englishPart}
        </span>
        {persianPart && (
          <span className="block persian-text bol-persian-text font-[vazirmatn] text-[6.8pt] font-extrabold text-blue-600 leading-tight text-right" dir="rtl" style={{ unicodeBidi: "isolate" }}>
            {persianPart}
          </span>
        )}
      </div>
    )
  }

  if (label.includes("\n")) {
    const lines = label.split("\n")
    return (
      <div className="flex flex-col space-y-[1px] text-left" dir="ltr">
        {lines.map((line, idx) => {
          const isPersian = /[\u0600-\u06FF]/.test(line)
          return (
            <span
              key={idx}
              className={`block ${
                isPersian
                  ? "persian-text bol-persian-text font-[vazirmatn] text-[6.8pt] font-extrabold text-blue-600"
                  : "text-[6.5pt] font-black uppercase tracking-wider text-blue-700"
              } leading-tight text-left`}
              dir="ltr"
              style={{ unicodeBidi: "isolate", textAlign: "left" }}
            >
              {line.trim()}
            </span>
          )
        })}
      </div>
    )
  }

  const isPersianOnly = /[\u0600-\u06FF]/.test(label) && !/[A-Za-z]/.test(label)
  return (
    <div
      className={`block ${
        isPersianOnly
          ? "persian-text bol-persian-text font-[vazirmatn] text-[7pt] font-black text-blue-700"
          : "text-[6.5pt] font-black uppercase tracking-wider text-blue-700"
      } leading-tight text-left`}
      dir="ltr"
      style={{ unicodeBidi: "isolate", textAlign: "left" }}
    >
      {label}
    </div>
  )
}

function DetailCard({
  label,
  value,
  important,
  rtl,
  glass = false,
  pdfMode = false,
  compact = false,
  highlight = false,
  highlightColor,
  className,
  center = false,
}: DetailItem & { glass?: boolean; pdfMode?: boolean; compact?: boolean; className?: string; center?: boolean }) {
  if (!hasValue(value)) return null
  const labelDirection = textDirection(label)
  const valueDirection = textDirection(value || "")
  const rightAligned = rtl ?? (labelDirection === "rtl" || valueDirection === "rtl")
  const forceLTR = rtl === false || !rightAligned
  const isShipmentInfoCard = className?.includes("shipment-info-card")
  const theme = (highlightColor || '').toLowerCase()
  const isRedHighlight = theme === "red"
  const isBlueHighlight = theme === "blue"
  const isGreenHighlight = theme === "green"

  return (
    <div
      dir={forceLTR ? "ltr" : rightAligned ? "rtl" : "ltr"}
      {...(pdfMode ? { 'data-no-break': true } : {})}
        className={`min-h-[7mm] rounded-lg border px-1.5 py-0.8 ${pdfMode ? '' : 'shadow-xs shadow-blue-100/60'} ${
        isRedHighlight
          ? "border-red-200 bg-red-50/80"
          : isBlueHighlight
          ? "border-blue-200 bg-sky-50/80"
          : isGreenHighlight
          ? "border-green-200 bg-green-50/80"
          : highlight
          ? "border-blue-200 bg-sky-50/70"
          : pdfMode
          ? "border-blue-100 bg-white"
          : "border-blue-100/80 bg-white shadow-2xs"
      } ${center ? "text-center" : forceLTR ? "text-left" : rightAligned ? "text-right" : "text-left"} break-word ${className || ""}`}
      style={{ unicodeBidi: 'plaintext', textAlign: forceLTR ? 'left' : rightAligned ? 'right' : 'left' }}
    >
      <div className={`${center ? "text-center" : "text-left"} mb-0.5`}>
        {renderFormattedLabel(label, forceLTR)}
      </div>
      <TextLines
        value={cleanText(value)}
        forceLTR={forceLTR}
        className={`${center ? "text-center " : forceLTR ? "text-left " : ""}${important ? (compact ? "text-[9.5pt]" : isShipmentInfoCard ? "text-[8.5pt]" : "text-[9pt]") : (compact ? "text-[9.5pt]" : "text-[8.5pt]")} font-extrabold leading-tight ${isRedHighlight ? "text-red-600" : isBlueHighlight ? "text-blue-800" : isGreenHighlight ? "text-green-700" : (highlight ? "text-red-600" : (important ? "text-blue-950" : "text-slate-600"))}`}
      />
    </div>
  )
}

function PartyCard({
  title,
  subtitle,
  icon,
  name,
  address,
  contact,
  email,
  glass = false,
  pdfMode = false,
}: {
  title: string
  subtitle: string
  icon: ReactNode
  name?: string
  address?: string
  contact?: string
  email?: string
  glass?: boolean
  pdfMode?: boolean
}) {
  if (![name, address, contact, email].some(hasValue)) return null

  return (
    <div
      {...(pdfMode ? { 'data-no-break': true } : {})}
      className={`party-card ${glass ? 'party-card-glass' : 'party-card-solid'} ${pdfMode ? 'party-card-pdf' : ''}`}
    >
      <div className={`party-card-header ${glass ? 'party-card-header-glass' : 'party-card-header-solid'}`}>
        <span className="party-card-icon">{icon}</span>
        <div className="party-card-header-text">
          <h4 className="party-card-title">{title}</h4>
          <p className="party-card-subtitle" dir="rtl">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="party-card-body">
        <TextLines value={name} className="party-card-name" />
        <div className="party-card-info-list">
          {hasValue(address) && (
            <div className="party-card-info-row">
              <MapPin className="party-card-info-icon" />
              <TextLines value={address} className="party-card-info-text" />
            </div>
          )}
          {hasValue(contact) && (
            <div className="party-card-info-row">
              <Phone className="party-card-info-icon" />
              <TextLines value={contact} className="party-card-info-text" />
            </div>
          )}
          {hasValue(email) && (
            <div className="party-card-info-row">
              <Mail className="party-card-info-icon" />
              <TextLines value={email} className="party-card-info-text" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type RouteTransportIcon = ComponentType<{ size?: number; strokeWidth?: number }>

type RouteTransportMeta = {
  label: string
  Icon: RouteTransportIcon
  color: string
}

const defaultRouteTransportMeta: RouteTransportMeta = {
  label: "TRUCK",
  Icon: RouteTruckIcon,
  color: "#2563eb",
}

const routeTransportMap: Record<string, RouteTransportMeta> = {
  air: {
    label: "AIR",
    Icon: RouteAirIcon,
    color: "#0f72e6",
  },
  airplane: {
    label: "AIR",
    Icon: RouteAirIcon,
    color: "#0f72e6",
  },
  plane: {
    label: "AIR",
    Icon: RouteAirIcon,
    color: "#0f72e6",
  },
  truck: {
    label: "TRUCK",
    Icon: RouteTruckIcon,
    color: "#2563eb",
  },
  road: {
    label: "TRUCK",
    Icon: RouteTruckIcon,
    color: "#2563eb",
  },
  lorry: {
    label: "TRUCK",
    Icon: RouteTruckIcon,
    color: "#2563eb",
  },
  van: {
    label: "VAN",
    Icon: RouteCarIcon,
    color: "#1d4ed8",
  },
  car: {
    label: "CAR",
    Icon: RouteCarIcon,
    color: "#1d4ed8",
  },
  train: {
    label: "TRAIN",
    Icon: RouteTrainIcon,
    color: "#0f172a",
  },
  rail: {
    label: "TRAIN",
    Icon: RouteTrainIcon,
    color: "#0f172a",
  },
  vessel: {
    label: "VESSEL",
    Icon: RouteVesselIcon,
    color: "#2563eb",
  },
  ship: {
    label: "VESSEL",
    Icon: RouteVesselIcon,
    color: "#2563eb",
  },
  boat: {
    label: "VESSEL",
    Icon: RouteVesselIcon,
    color: "#2563eb",
  },
  sea: {
    label: "VESSEL",
    Icon: RouteVesselIcon,
    color: "#2563eb",
  },
  ocean: {
    label: "VESSEL",
    Icon: RouteVesselIcon,
    color: "#2563eb",
  },
}

export function getRouteTransportMeta(mode?: string): RouteTransportMeta {
  if (!mode || typeof mode !== "string") {
    return defaultRouteTransportMeta
  }

  const normalizedMode = mode.trim().toLowerCase()
  return routeTransportMap[normalizedMode] ?? defaultRouteTransportMeta
}

function TransportIcon({ mode, size = 24 }: { mode?: string; size?: number }) {
  const { Icon } = getRouteTransportMeta(mode)
  return <Icon size={size} strokeWidth={2.4} aria-hidden="true" />
}

function routeModeLabel(mode?: string) {
  const normalizedMode = String(mode || "").trim().toLowerCase()
  if (!normalizedMode) return ""
  switch (normalizedMode) {
    case "airplane":
    case "plane":
    case "air":
      return "AIR"
    case "vessel":
    case "ship":
    case "boat":
    case "sea":
    case "ocean":
      return "VESSEL"
    case "train":
    case "rail":
      return "TRAIN"
    case "road":
    case "truck":
    case "lorry":
      return "TRUCK"
    case "car":
      return "CAR"
    case "van":
      return "VAN"
    default:
      return normalizedMode.toUpperCase()
  }
}

function routeFallbackLabels(location?: string | null) {
  const normalized = cleanText(location).toLowerCase()
  if (!normalized) return { persian: "", pashto: "" }

  if (normalized.includes("kandahar")) {
    return { persian: "\u06a9\u0646\u062f\u0647\u0627\u0631", pashto: "\u06a9\u0646\u062f\u0647\u0627\u0631" }
  }
  if (normalized.includes("nimroz") || normalized.includes("milak")) {
    return {
      persian: "\u0646\u06cc\u0645\u0631\u0648\u0632 / \u0645\u06cc\u0644\u06a9",
      pashto: "\u0646\u06cc\u0645\u0631\u0648\u0632 / \u0645\u06cc\u0644\u06a9",
    }
  }
  if (normalized.includes("dougharoun")) {
    return { persian: "\u062f\u0648\u063a\u0627\u0631\u0648\u0646\u060c \u0627\u06cc\u0631\u0627\u0646", pashto: "\u062f\u0648\u063a\u0627\u0631\u0648\u0646\u060c \u0627\u06cc\u0631\u0627\u0646" }
  }
  if (normalized.includes("dubai")) {
    return {
      persian: "\u062f\u0628\u06cc\u060c \u0627\u0645\u0627\u0631\u0627\u062a",
      pashto: "\u062f\u0628\u06cc\u060c \u0627\u0645\u0627\u0631\u0627\u062a",
    }
  }
  if (normalized.includes("iran") || normalized.includes("bandar abbas")) {
    return { persian: "\u0627\u06cc\u0631\u0627\u0646", pashto: "\u0627\u06cc\u0631\u0627\u0646" }
  }
  if (normalized.includes("nhava") || normalized.includes("sheva") || normalized.includes("india")) {
    return {
      persian: "\u0628\u0646\u062f\u0631 \u0646\u0627\u0648\u0627\u0634\u06cc\u0648\u0627",
      pashto: "\u0628\u0646\u062f\u0631 \u0646\u0627\u0648\u0627\u0634\u06cc\u0648\u0627",
    }
  }

  return { persian: "", pashto: "" }
}

function countryCodeToEmoji(countryCode?: string) {
  if (!countryCode) return ""
  const code = countryCode.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return ""
  return code
    .split("")
    .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
    .join("")
}

function getRouteCountryMeta(location?: string, locationPersian?: string) {
  const source = String(location || locationPersian || "").trim()
  if (!source) return { emoji: "🌍", code: "", label: "" }

  const codeMatch = source.match(/,\s*([A-Za-z]{2})$/)
  const normalized = source.toLowerCase()

  const countryMatch = codeMatch?.[1]?.toUpperCase() ||
    (normalized.includes("afghanistan") || normalized.includes("kandahar") || normalized.includes("nimroz") || normalized.includes("milak") || normalized.includes("herat") || normalized.includes("kabul") || normalized.includes("mazar") || normalized.includes("hairatan") || normalized.includes("zaranj") || normalized.includes("islam qala") ? "AF" :
    normalized.includes("iran") || normalized.includes("bandar abbas") || normalized.includes("dougharoun") || normalized.includes("tehran") || normalized.includes("chabahar") || normalized.includes("milak border") ? "IR" :
    normalized.includes("india") || normalized.includes("nhava") || normalized.includes("sheva") || normalized.includes("mumbai") || normalized.includes("delhi") || normalized.includes("mundra") ? "IN" :
    normalized.includes("dubai") || normalized.includes("emirates") || normalized.includes("uae") || normalized.includes("abu dhabi") || normalized.includes("sharjah") || normalized.includes("jebel ali") ? "AE" :
    normalized.includes("pakistan") || normalized.includes("quetta") || normalized.includes("chaman") || normalized.includes("karachi") || normalized.includes("lahore") ? "PK" :
    normalized.includes("china") || normalized.includes("beijing") || normalized.includes("shanghai") || normalized.includes("qingdao") || normalized.includes("ningbo") || normalized.includes("guangzhou") || normalized.includes("shenzhen") ? "CN" :
    normalized.includes("turkey") || normalized.includes("mersin") || normalized.includes("istanbul") || normalized.includes("ankara") || normalized.includes("izmir") ? "TR" :
    normalized.includes("uzbekistan") || normalized.includes("tashkent") || normalized.includes("termez") ? "UZ" :
    normalized.includes("turkmenistan") || normalized.includes("ashgabat") ? "TM" :
    normalized.includes("tajikistan") || normalized.includes("dushanbe") ? "TJ" :
    normalized.includes("russia") || normalized.includes("moscow") || normalized.includes("saint petersburg") ? "RU" :
    normalized.includes("oman") || normalized.includes("muscat") || normalized.includes("sohar") ? "OM" :
    normalized.includes("saudi") || normalized.includes("riyadh") || normalized.includes("jeddah") || normalized.includes("dammam") ? "SA" :
    "")

  const emojiMap: Record<string, string> = {
    AF: "🇦🇫",
    IR: "🇮🇷",
    IN: "🇮🇳",
    AE: "🇦🇪",
    PK: "🇵🇰",
    CN: "🇨🇳",
    TR: "🇹🇷",
    UZ: "🇺🇿",
    TM: "🇹🇲",
    TJ: "🇹🇯",
    RU: "🇷🇺",
    OM: "🇴🇲",
    SA: "🇸🇦",
    US: "🇺🇸",
    CA: "🇨🇦",
    GB: "🇬🇧",
  }

  const labelMap: Record<string, string> = {
    AF: "Afghanistan",
    IR: "Iran",
    IN: "India",
    AE: "UAE",
    PK: "Pakistan",
    CN: "China",
    TR: "Turkey",
    UZ: "Uzbekistan",
    TM: "Turkmenistan",
    TJ: "Tajikistan",
    RU: "Russia",
    OM: "Oman",
    SA: "Saudi Arabia",
    US: "USA",
    CA: "Canada",
    GB: "UK",
  }

  const code = countryMatch || ""
  const emoji = emojiMap[code] || countryCodeToEmoji(code) || "🌍"
  const label = labelMap[code] || code || ""

  return {
    emoji,
    code,
    label,
  }
}

interface FormattedRouteStopLocation {
  primaryName: string
  subFacility: string
  codeBadge: string
  persianMain: string
  persianSub: string
}

function formatRouteStopLocation(location?: string | null, locationPersian?: string | null): FormattedRouteStopLocation {
  const rawLoc = cleanText(location) || ""
  const rawFa = cleanText(locationPersian) || ""

  // Clean country code suffix like ", UZ", ", IN", ", AF", ", IR", ", AE", ", CI", ", GH"
  const cleanedLoc = rawLoc.replace(/,\s*[A-Za-z]{2,3}$/i, "").trim()

  // Extract airport/port code in parentheses e.g. (TAS / UTTT) -> TAS, (DEL / INDEL) -> DEL, (JNPT / Nhava Sheva) -> JNPT
  let codeBadge = ""
  const codeMatch = cleanedLoc.match(/\(([A-Za-z0-9\s\/\-_]+)\)/)
  if (codeMatch) {
    const inside = codeMatch[1].trim()
    const firstCode = inside.split(/[\/\s,]+/)[0].trim()
    if (firstCode.length >= 2 && firstCode.length <= 6) {
      codeBadge = firstCode
    }
  }

  let primaryName = cleanedLoc
  let subFacility = ""

  if (cleanedLoc.includes(" — ")) {
    const parts = cleanedLoc.split(" — ")
    primaryName = parts[0].trim()
    subFacility = parts[1].replace(/\([^)]+\)/g, "").trim()
  } else if (cleanedLoc.includes(" - ")) {
    const parts = cleanedLoc.split(" - ")
    primaryName = parts[0].trim()
    subFacility = parts[1].replace(/\([^)]+\)/g, "").trim()
  } else if (cleanedLoc.includes(" / ")) {
    const parts = cleanedLoc.split(" / ")
    primaryName = parts[0].trim()
    if (parts[1]) {
      subFacility = parts[1].replace(/\([^)]+\)/g, "").trim()
    }
  } else if (cleanedLoc.includes(" (") && cleanedLoc.length > 20) {
    primaryName = cleanedLoc.split(" (")[0].trim()
    const inside = cleanedLoc.match(/\(([^)]+)\)/)?.[1] || ""
    if (inside && inside !== codeBadge) {
      subFacility = inside
    }
  }

  // Persian formatting
  let persianMain = rawFa.replace(/،\s*(ازبکستان|هند|افغانستان|ایران|پاکستان|امارات|چین|ترکیه|آسیای مرکزی).*$/g, "").trim()
  let persianSub = ""

  if (persianMain.includes(" — ")) {
    const faParts = persianMain.split(" — ")
    persianMain = faParts[0].trim()
    persianSub = faParts[1]?.trim() || ""
  } else if (persianMain.includes(" (") && persianMain.length > 25) {
    const faParts = persianMain.split(" (")
    persianMain = faParts[0].trim()
    persianSub = faParts[1]?.replace(")", "").trim() || ""
  }

  return {
    primaryName: primaryName || cleanedLoc,
    subFacility: subFacility !== primaryName ? subFacility : "",
    codeBadge,
    persianMain: persianMain || rawFa,
    persianSub,
  }
}

function RouteTimeline({ routes, glass = false }: { routes: BillOfLadingFormData["routes"]; glass?: boolean }) {
  if (!routes?.length) return null

  const modeThemeMap: Record<string, { icon: string; label: string; persian: string; bg: string }> = {
    truck: { icon: "🚚", label: "TRUCK", persian: "جاده‌ای", bg: "bg-emerald-50 text-emerald-950 border-emerald-400 shadow-2xs" },
    road: { icon: "🚚", label: "TRUCK", persian: "جاده‌ای", bg: "bg-emerald-50 text-emerald-950 border-emerald-400 shadow-2xs" },
    lorry: { icon: "🚚", label: "TRUCK", persian: "جاده‌ای", bg: "bg-emerald-50 text-emerald-950 border-emerald-400 shadow-2xs" },
    vessel: { icon: "🚢", label: "VESSEL", persian: "دریایی", bg: "bg-cyan-50 text-cyan-950 border-cyan-400 shadow-2xs" },
    ship: { icon: "🚢", label: "VESSEL", persian: "دریایی", bg: "bg-cyan-50 text-cyan-950 border-cyan-400 shadow-2xs" },
    boat: { icon: "🚢", label: "VESSEL", persian: "دریایی", bg: "bg-cyan-50 text-cyan-950 border-cyan-400 shadow-2xs" },
    sea: { icon: "🚢", label: "VESSEL", persian: "دریایی", bg: "bg-cyan-50 text-cyan-950 border-cyan-400 shadow-2xs" },
    ocean: { icon: "🚢", label: "VESSEL", persian: "دریایی", bg: "bg-cyan-50 text-cyan-950 border-cyan-400 shadow-2xs" },
    train: { icon: "🚆", label: "TRAIN", persian: "ریلی", bg: "bg-purple-50 text-purple-950 border-purple-400 shadow-2xs" },
    rail: { icon: "🚆", label: "TRAIN", persian: "ریلی", bg: "bg-purple-50 text-purple-950 border-purple-400 shadow-2xs" },
    airplane: { icon: "✈️", label: "AIR", persian: "هوایی", bg: "bg-sky-50 text-sky-950 border-sky-400 shadow-2xs" },
    air: { icon: "✈️", label: "AIR", persian: "هوایی", bg: "bg-sky-50 text-sky-950 border-sky-400 shadow-2xs" },
    plane: { icon: "✈️", label: "AIR", persian: "هوایی", bg: "bg-sky-50 text-sky-950 border-sky-400 shadow-2xs" },
    car: { icon: "🚗", label: "CAR", persian: "خودرو", bg: "bg-blue-50 text-blue-900 border-blue-200" },
    van: { icon: "🚐", label: "VAN", persian: "ون", bg: "bg-blue-50 text-blue-900 border-blue-200" },
  }
  const defaultModeTheme = { icon: "🚚", label: "TRUCK", persian: "جاده‌ای", bg: "bg-emerald-50 text-emerald-950 border-emerald-400 shadow-2xs" }

  return (
    <div
      className={`route-timeline-container ${glass ? "glass-card" : ""}`}
      style={{
        background: "linear-gradient(145deg, #ffffff 0%, #f8faff 50%, #eff6ff 100%)",
        border: "1.5px solid #bfdbfe",
        borderRadius: "10px",
        padding: "4px 6px",
        boxShadow: "0 2px 10px rgba(37, 99, 235, 0.05)",
      }}
      aria-label="Route and transportation path timeline"
    >
      {/* Route Cards Container */}
      <div className="route-timeline-cards flex items-stretch justify-between gap-1" role="list">
        {routes.map((route, index) => {
          const mode = (route.transportMode || "truck").toLowerCase().trim()
          const countryMeta = getRouteCountryMeta(route.location, route.locationPersian)
          const isLastRoute = index === routes.length - 1
          const isOrigin = index === 0
          const computedStopLabel = isOrigin ? "ORIGIN" : isLastRoute ? "DESTINATION" : `STOP ${index}`
          const modeTheme = modeThemeMap[mode] || defaultModeTheme

          const formattedLoc = formatRouteStopLocation(route.location, route.locationPersian)

          return (
            <div key={route.id || `${route.location}-${index}`} className="route-timeline-item flex items-center flex-1 min-w-0" role="listitem">
              <div
                className={`route-timeline-card transition-all duration-200 w-full text-center relative overflow-hidden flex flex-col justify-between ${
                  isOrigin
                    ? "border-1.5 border-emerald-500/90 bg-linear-to-b from-emerald-50/70 via-white to-emerald-50/25 shadow-2xs shadow-emerald-100/60"
                    : isLastRoute
                    ? "border-1.5 border-indigo-500/90 bg-linear-to-b from-indigo-50/70 via-white to-indigo-50/25 shadow-2xs shadow-indigo-100/60"
                    : "border-1.5 border-blue-300/90 bg-linear-to-b from-blue-50/60 via-white to-blue-50/20 shadow-2xs shadow-blue-100/60"
                }`}
                style={{
                  borderRadius: "7px",
                  padding: "3px 2px",
                  minHeight: "46px",
                }}
              >
                {/* Top Accent Strip */}
                <div className={`h-0.8 w-full absolute top-0 left-0 right-0 ${
                  isOrigin ? 'bg-linear-to-r from-emerald-500 to-teal-500' : isLastRoute ? 'bg-linear-to-r from-indigo-600 to-purple-600' : 'bg-linear-to-r from-blue-500 to-cyan-500'
                }`} />

                {/* Header 2-Tone Capsule Badge */}
                <div className="flex items-center justify-center mt-0.2 mb-0.2 px-0.5">
                  <div className="inline-flex items-center rounded-full border shadow-2xs overflow-hidden max-w-full text-[4.8pt] font-black tracking-tight uppercase">
                    {/* Stop Type */}
                    <span className={`px-1 py-0.2 text-white shrink-0 ${
                      isOrigin
                        ? "bg-emerald-600 border-emerald-700"
                        : isLastRoute
                        ? "bg-indigo-600 border-indigo-700"
                        : "bg-blue-600 border-blue-700"
                    }`}>
                      {computedStopLabel}
                    </span>
                    {/* Country Code & Flag */}
                    {countryMeta.code && (
                      <span className="px-1 py-0.2 bg-slate-100/95 text-slate-800 flex items-center gap-0.5 border-l border-slate-200 truncate font-extrabold text-[4.8pt]">
                        <span className="text-[5.8pt] leading-none shrink-0">{countryMeta.emoji}</span>
                        <span className="truncate">{countryMeta.label?.toUpperCase() || countryMeta.code}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* City & Location Name (Vertically Balanced with Zero Cut-off) */}
                <div className="flex-1 flex flex-col justify-center px-0.5 my-auto min-h-[22px] space-y-0.2">
                  <div className="text-[7.2pt] font-black text-slate-950 leading-tight break-words line-clamp-2 tracking-tight">
                    <span>{formattedLoc.primaryName}</span>
                    {formattedLoc.codeBadge && (
                      <span className="ml-0.5 inline-block rounded bg-amber-100 text-amber-950 font-mono text-[5.2pt] px-0.8 py-0.2 font-black border border-amber-300 align-middle">
                        {formattedLoc.codeBadge}
                      </span>
                    )}
                  </div>
                  {formattedLoc.subFacility && (
                    <div className="text-[5.2pt] font-semibold text-slate-600 leading-tight break-words line-clamp-1">
                      {formattedLoc.subFacility}
                    </div>
                  )}
                  {hasValue(formattedLoc.persianMain) && (
                    <div className="text-[6.2pt] font-bold text-blue-950 font-[vazirmatn] leading-tight break-words line-clamp-2 mt-0.2" dir="rtl">
                      {formattedLoc.persianMain}
                    </div>
                  )}
                </div>

                {/* Bottom Row: Mode Pill */}
                <div className="mt-0.5">
                  <span className={`inline-flex items-center justify-center gap-0.5 px-1.5 py-0.2 rounded-full text-[4.8pt] font-black uppercase tracking-wide border whitespace-nowrap ${modeTheme.bg}`}>
                    <span className="text-[6pt] leading-none">{modeTheme.icon}</span>
                    <span>{modeTheme.label}</span>
                    <span className="font-[vazirmatn] text-[4.6pt] opacity-90">({modeTheme.persian})</span>
                  </span>
                </div>

                {/* Truck Specifications & Customs Seal Badges */}
                {(route.plateNumber || route.chassisNumber || route.trailerMan || route.customsSealRequired) && (
                  <div className="mt-0.5 pt-0.5 border-t border-slate-200/80 space-y-0.2 text-left w-full">
                    {route.plateNumber && (
                      <div className="inline-flex items-center gap-0.5 bg-blue-100/90 text-blue-950 font-mono font-black text-[5.8pt] px-1 py-0.2 rounded border border-blue-200">
                        <span>پلیټ:</span>
                        <span>{route.plateNumber}</span>
                      </div>
                    )}
                    {route.chassisNumber && (
                      <div className="text-[5.8pt] font-extrabold text-slate-800 truncate">
                        <span className="text-slate-500">شاسی:</span> {route.chassisNumber}
                      </div>
                    )}
                    {route.trailerMan && (
                      <div className="text-[5.8pt] font-extrabold text-slate-800 truncate" dir="rtl font-[vazirmatn]">
                        <span className="text-slate-500">ټیلر مان:</span> {route.trailerMan}
                      </div>
                    )}
                    {route.customsSealRequired && (
                      <div className="mt-0.2 bg-amber-100 text-amber-950 font-black text-[5.8pt] px-1 py-0.2 rounded border border-amber-300 flex items-center gap-0.5 truncate" dir="rtl font-[vazirmatn]">
                        <span>📍 ګمرک سیل</span>
                        {route.customsSealNote ? <span className="font-semibold text-amber-800">({route.customsSealNote})</span> : null}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Connecting Arrow Circle */}
              {!isLastRoute && (
                <div
                  className="route-timeline-arrow mx-1 shrink-0 flex items-center justify-center w-4.5 h-4.5 rounded-full bg-linear-to-b from-white to-blue-50 border border-blue-400 shadow-2xs text-blue-600 z-10"
                  aria-hidden="true"
                >
                  <ArrowRight className="w-2.5 h-2.5 text-blue-700" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function parseDriverContactPhones(contact?: string | null): string[] {
  const text = cleanText(contact)
  if (!text) return []
  return text
    .split(/[,;/]+|\s{2,}/)
    .map((p) => p.trim().replace(/^,+|,+$/g, ""))
    .filter(Boolean)
}

function parseDriverRentInfo(rent?: string | null): { amount: string; note: string } {
  const text = cleanText(rent)
  if (!text) return { amount: "", note: "" }

  if (text.includes("\n")) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
    return { amount: lines[0] || "", note: lines.slice(1).join(" - ") }
  }

  const match = text.match(/^([\d,.]+\s*(?:AFN|USD|\$|دالر|افغانی|تومان|IRR|PKR)?)(?:\s*[-:]\s*|\s+)(.*)$/i)
  if (match && match[1] && match[2]) {
    return { amount: match[1].trim(), note: match[2].trim() }
  }

  if (text.includes("کرایه") || text.includes("واپسی") || text.includes("-")) {
    const parts = text.split(/\s*-\s*|\s*:\s*/)
    if (parts.length >= 2) {
      const amountPart = parts[0].trim()
      const notePart = parts.slice(1).join(" - ").trim()
      return { amount: amountPart, note: notePart }
    }
  }

  return { amount: text, note: "" }
}

function ShipmentOverview({
  issueDate,
  persianDateNumeric,
  formData,
  labels,
  pdfMode = false,
}: {
  issueDate?: string
  persianDateNumeric?: string
  formData: BillOfLadingFormData
  labels: Record<string, string>
  pdfMode?: boolean
}) {
  const driverNameVal = formData.driver_name ? formData.driver_name.trim() : ""
  const driverFatherNameVal = formData.driver_father_name ? ` S/O ${formData.driver_father_name.trim()}` : ""
  const driverFullInfo = driverNameVal || driverFatherNameVal ? `${driverNameVal}${driverFatherNameVal}` : ""

  const phones = parseDriverContactPhones(formData.driver_contact)
  const rentInfo = parseDriverRentInfo(formData.driver_rent)

  const hasIssueDate = hasValue(issueDate) || hasValue(persianDateNumeric)
  const hasTruck = hasValue(formData.truck_number)
  const hasDriver = hasValue(driverFullInfo)
  const hasContact = phones.length > 0
  const hasRent = hasValue(formData.driver_rent)
  const hasBol = hasValue(formData.bol_number)

  const activeCardsCount = [hasIssueDate, hasTruck, hasDriver, hasContact, hasRent, hasBol].filter(Boolean).length
  if (activeCardsCount === 0) return null

  return (
    <div
      className={`grid gap-1.5 ${
        activeCardsCount >= 6 ? "grid-cols-3 sm:grid-cols-6 print:grid-cols-6" :
        activeCardsCount === 5 ? "grid-cols-5" :
        activeCardsCount === 4 ? "grid-cols-4" :
        activeCardsCount === 3 ? "grid-cols-3" :
        activeCardsCount === 2 ? "grid-cols-2" : "grid-cols-1"
      }`}
      dir="ltr"
    >
      {/* 1. ISSUE DATE */}
      {hasIssueDate && (
        <div
          className={`rounded-lg border px-1.5 py-1 text-center flex flex-col justify-between min-h-[14mm] overflow-visible ${
            pdfMode ? "border-blue-100 bg-white" : "border-blue-100/90 bg-white/95 shadow-2xs shadow-blue-100/50"
          }`}
        >
          <div>
            <div className="text-[6.2pt] font-black uppercase tracking-wider text-blue-700 leading-tight">
              ISSUE DATE
            </div>
            <div className="persian-text bol-persian-text font-[vazirmatn] text-[5.8pt] font-bold text-blue-600 leading-tight mt-0.2" dir="rtl">
              تاریخ صدور
            </div>
          </div>
          <div className="mt-0.5 space-y-0.5">
            {hasValue(issueDate) && (
              <div className="font-mono font-black text-slate-950 text-[8.2pt] leading-tight break-words">
                {issueDate}
              </div>
            )}
            {hasValue(persianDateNumeric) && (
              <div
                className="persian-text bol-persian-text font-[vazirmatn] font-black text-blue-900 text-[7.5pt] leading-tight break-words"
                dir="ltr"
                style={{ direction: "ltr", unicodeBidi: "isolate" }}
              >
                {persianDateNumeric}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. TRUCK NUMBER */}
      {hasTruck && (
        <div
          className={`rounded-lg border px-1.5 py-1 text-center flex flex-col justify-between min-h-[14mm] overflow-visible ${
            pdfMode ? "border-blue-100 bg-white" : "border-blue-100/90 bg-white/95 shadow-2xs shadow-blue-100/50"
          }`}
        >
          <div>
            <div className="text-[6.2pt] font-black uppercase tracking-wider text-blue-700 leading-tight">
              TRUCK NUMBER
            </div>
            <div className="persian-text bol-persian-text font-[vazirmatn] text-[5.8pt] font-bold text-blue-600 leading-tight mt-0.2" dir="rtl">
              شماره کامیون / موټر
            </div>
          </div>
          <div className="mt-0.5 flex items-center justify-center">
            <div className="inline-flex items-center gap-0.5 font-mono font-black text-[8.2pt] text-slate-950 bg-slate-100/90 px-1.5 py-0.5 rounded border border-slate-300 shadow-2xs break-all">
              <span>🚛</span>
              <span className="tracking-wide">{formData.truck_number}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. DRIVER NAME */}
      {hasDriver && (
        <div
          className={`rounded-lg border px-1.5 py-1 text-center flex flex-col justify-between min-h-[14mm] overflow-visible ${
            pdfMode ? "border-blue-100 bg-white" : "border-blue-100/90 bg-white/95 shadow-2xs shadow-blue-100/50"
          }`}
        >
          <div>
            <div className="text-[6.2pt] font-black uppercase tracking-wider text-blue-700 leading-tight">
              DRIVER NAME
            </div>
            <div className="persian-text bol-persian-text font-[vazirmatn] text-[5.8pt] font-bold text-blue-600 leading-tight mt-0.2" dir="rtl">
              نام راننده
            </div>
          </div>
          <div className="mt-0.5 font-[vazirmatn] font-black text-slate-950 text-[8.2pt] leading-tight break-words" dir="rtl">
            {driverFullInfo}
          </div>
        </div>
      )}

      {/* 4. DRIVER CONTACT */}
      {hasContact && (
        <div
          className={`rounded-lg border px-1.5 py-1 text-center flex flex-col justify-between min-h-[14mm] overflow-visible ${
            pdfMode ? "border-blue-100 bg-white" : "border-blue-100/90 bg-white/95 shadow-2xs shadow-blue-100/50"
          }`}
        >
          <div>
            <div className="text-[6.2pt] font-black uppercase tracking-wider text-blue-700 leading-tight">
              DRIVER CONTACT
            </div>
            <div className="persian-text bol-persian-text font-[vazirmatn] text-[5.8pt] font-bold text-blue-600 leading-tight mt-0.2" dir="rtl">
              تماس راننده
            </div>
          </div>
          <div className="mt-0.5 space-y-0.5 flex flex-col items-center justify-center">
            {phones.map((phone, idx) => (
              <div key={idx} className="font-mono font-bold text-blue-950 text-[7.8pt] leading-tight tracking-wider bg-blue-50/80 px-1 py-0.2 rounded border border-blue-200/80 w-full text-center break-all">
                {phone}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. DRIVER RENT */}
      {hasRent && (
        <div
          className={`rounded-lg border px-1.5 py-1 text-center flex flex-col justify-between min-h-[14mm] overflow-visible ${
            pdfMode ? "border-blue-100 bg-white" : "border-blue-100/90 bg-white/95 shadow-2xs shadow-blue-100/50"
          }`}
        >
          <div>
            <div className="text-[6.2pt] font-black uppercase tracking-wider text-blue-700 leading-tight">
              DRIVER RENT
            </div>
            <div className="persian-text bol-persian-text font-[vazirmatn] text-[5.8pt] font-bold text-blue-600 leading-tight mt-0.2" dir="rtl">
              کرایه راننده
            </div>
          </div>
          <div className="mt-0.5 space-y-0.5">
            <div className="font-mono font-black text-emerald-950 text-[8.2pt] leading-tight break-words">
              {rentInfo.amount || formData.driver_rent}
            </div>
            {rentInfo.note && (
              <div className="persian-text bol-persian-text font-[vazirmatn] font-extrabold text-[6.8pt] text-emerald-800 leading-tight break-words whitespace-normal" dir="rtl">
                {rentInfo.note}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. BOL NUMBER */}
      {hasBol && (
        <div
          className={`rounded-lg border px-1.5 py-1 text-center flex flex-col justify-between min-h-[14mm] overflow-visible ${
            pdfMode ? "border-blue-100 bg-white" : "border-blue-100/90 bg-white/95 shadow-2xs shadow-blue-100/50"
          }`}
        >
          <div>
            <div className="text-[6.2pt] font-black uppercase tracking-wider text-blue-700 leading-tight">
              BOL NUMBER
            </div>
            <div className="persian-text bol-persian-text font-[vazirmatn] text-[5.8pt] font-bold text-blue-600 leading-tight mt-0.2" dir="rtl">
              شماره بارنامه
            </div>
          </div>
          <div className="mt-0.5 font-mono font-black text-blue-950 text-[8.2pt] leading-tight break-words">
            {formData.bol_number}
          </div>
        </div>
      )}
    </div>
  )
}

function formatMultiCargoValue(val?: string | null, customClass = "text-[9.5pt]"): ReactNode {
  const text = cleanText(val)
  if (!text) return "—"

  // Split on newlines, pipes, or " / " (slash with surrounding space or between distinct amounts)
  // Do NOT split on hyphens '-' like "16-KGS", "17.30 - KGS", "667 - 16 KGS"
  let parts: string[] = []
  if (text.includes("\n")) {
    parts = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  } else if (text.includes("|")) {
    parts = text.split("|").map((s) => s.trim()).filter(Boolean)
  } else if (/\s+\/\s+/.test(text)) {
    parts = text.split(/\s+\/\s+/).map((s) => s.trim()).filter(Boolean)
  } else if (/\s*;\s*/.test(text) && text.includes(";")) {
    parts = text.split(";").map((s) => s.trim()).filter(Boolean)
  }

  if (parts.length > 1) {
    return (
      <div className="flex flex-col space-y-0.2 w-full">
        {parts.map((p, idx) => (
          <span key={idx} className={`block leading-tight font-mono font-black ${customClass} break-words`}>
            {p.trim()}
          </span>
        ))}
      </div>
    )
  }

  return <span className={`font-mono font-black ${customClass} break-words leading-tight`}>{text}</span>
}

function CargoOverview({
  formData,
  labels,
  pdfMode = false,
}: {
  formData: BillOfLadingFormData
  labels: Record<string, string>
  pdfMode?: boolean
}) {
  const hasPackages = hasValue(formData.number_of_packages)
  const hasNetCtn = hasValue(formData.kgs_per_carton)
  const hasGrossCtn = hasValue(formData.gross_weight_per_carton)
  const hasRate = hasValue(formData.rate_per_kgs)
  const hasGoodsValue = hasValue(formData.goods_value)
  const hasNetWeight = hasValue(formData.net_weight)
  const hasGrossWeight = hasValue(formData.gross_weight)
  const hasContainer = hasValue(formData.container_numbers)
  const hasSeal = hasValue(formData.seal_numbers)
  const hasMeasurement = hasValue(formData.measurement)

  const hasCards = hasPackages || hasNetCtn || hasGrossCtn || hasRate || hasGoodsValue || hasNetWeight || hasGrossWeight

  if (!hasCards && !hasContainer && !hasSeal && !hasMeasurement) return null

  return (
    <div className="space-y-1">
      {/* Top Metadata Badges (Container, Seal, Measurement) */}
      {(hasContainer || hasSeal || hasMeasurement) && (
        <div className="flex flex-wrap items-center gap-1 px-0.5">
          {hasContainer && (
            <div className="inline-flex items-center gap-1 bg-blue-50/90 text-blue-950 font-mono font-black text-[7.2pt] px-1.5 py-0.5 rounded-md border border-blue-200 shadow-2xs">
              <span className="text-blue-700 font-black">CONT:</span>
              <span>{formData.container_numbers}</span>
            </div>
          )}
          {hasSeal && (
            <div className="inline-flex items-center gap-1 bg-amber-50/90 text-amber-950 font-mono font-black text-[7.2pt] px-1.5 py-0.5 rounded-md border border-amber-200 shadow-2xs">
              <span className="text-amber-700 font-black">SEAL:</span>
              <span>{formData.seal_numbers}</span>
            </div>
          )}
          {hasMeasurement && (
            <div className="inline-flex items-center gap-1 bg-slate-50 text-slate-800 font-mono font-black text-[7.2pt] px-1.5 py-0.5 rounded-md border border-slate-200 shadow-2xs">
              <span className="text-slate-600 font-black">MEASUREMENT:</span>
              <span>{formData.measurement}</span>
            </div>
          )}
        </div>
      )}

      {/* 4 Executive KPI Cards */}
      {hasCards && (
        <div className="grid grid-cols-4 gap-1">
          {/* 1. NO. OF PACKAGES */}
          <div
            className={`rounded-xl border px-1.5 py-0.8 text-center flex flex-col justify-between ${
              pdfMode ? "border-blue-200 bg-white" : "border-blue-200/90 bg-white/95 shadow-2xs shadow-blue-100/50"
            }`}
          >
            <div className="border-b border-blue-100/80 pb-0.5 mb-0.5">
              <div className="text-[7pt] font-black uppercase tracking-wider text-blue-800 leading-tight">
                NO. OF PACKAGES
              </div>
              <div className="persian-text bol-persian-text font-[vazirmatn] text-[6.2pt] font-bold text-blue-600 leading-tight mt-0.2" dir="rtl">
                {labels.packagesFa || "تعداد بسته"}
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center min-h-[20px] py-0.5">
              {formatMultiCargoValue(formData.number_of_packages, "text-[8.5pt] text-slate-950")}
            </div>
          </div>

          {/* 2. WEIGHT PER CARTON */}
          <div
            className={`rounded-xl border px-1.5 py-0.8 text-center flex flex-col justify-between ${
              pdfMode ? "border-blue-200 bg-white" : "border-blue-200/90 bg-white/95 shadow-2xs shadow-blue-100/50"
            }`}
          >
            <div className="border-b border-blue-100/80 pb-0.5 mb-0.5">
              <div className="text-[7pt] font-black uppercase tracking-wider text-blue-800 leading-tight">
                WT / CARTON
              </div>
              <div className="persian-text bol-persian-text font-[vazirmatn] text-[6.2pt] font-bold text-blue-600 leading-tight mt-0.2" dir="rtl">
                وزن خالص و ناخالص فی کارتن
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center space-y-0.5 text-left py-0.5">
              {hasNetCtn && (
                <div className="flex flex-col gap-0 text-blue-950">
                  <span className="text-[5.8pt] font-black text-blue-700 uppercase tracking-wide">NET / CTN:</span>
                  <div className="break-words">
                    {formatMultiCargoValue(formData.kgs_per_carton, "text-[8pt] text-blue-950")}
                  </div>
                </div>
              )}
              {hasGrossCtn && (
                <div className="flex flex-col gap-0 text-slate-900 border-t border-slate-100 pt-0.5">
                  <span className="text-[5.8pt] font-black text-slate-600 uppercase tracking-wide">GROSS / CTN:</span>
                  <div className="break-words">
                    {formatMultiCargoValue(formData.gross_weight_per_carton, "text-[8pt] text-slate-900")}
                  </div>
                </div>
              )}
              {!hasNetCtn && !hasGrossCtn && <div className="text-slate-400 text-center font-bold">—</div>}
            </div>
          </div>

          {/* 3. TOTAL WEIGHTS */}
          <div
            className={`rounded-xl border px-1.5 py-0.8 text-center flex flex-col justify-between ${
              pdfMode ? "border-blue-200 bg-white" : "border-blue-200/90 bg-white/95 shadow-2xs shadow-blue-100/50"
            }`}
          >
            <div className="border-b border-blue-100/80 pb-0.5 mb-0.5">
              <div className="text-[7pt] font-black uppercase tracking-wider text-blue-800 leading-tight">
                TOTAL WEIGHTS
              </div>
              <div className="persian-text bol-persian-text font-[vazirmatn] text-[6.2pt] font-bold text-blue-600 leading-tight mt-0.2" dir="rtl">
                وزن کل خالص و ناخالص
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center space-y-0.5 text-left py-0.5">
              {hasNetWeight && (
                <div className="flex flex-col gap-0 text-blue-950">
                  <span className="text-[5.8pt] font-black text-blue-700 uppercase tracking-wide">NET WT:</span>
                  <div className="break-words">
                    {formatMultiCargoValue(formData.net_weight, "text-[8pt] text-blue-950")}
                  </div>
                </div>
              )}
              {hasGrossWeight && (
                <div className="flex flex-col gap-0 text-slate-900 border-t border-slate-100 pt-0.5">
                  <span className="text-[5.8pt] font-black text-slate-600 uppercase tracking-wide">GROSS WT:</span>
                  <div className="break-words">
                    {formatMultiCargoValue(formData.gross_weight, "text-[8pt] text-slate-900")}
                  </div>
                </div>
              )}
              {!hasNetWeight && !hasGrossWeight && <div className="text-slate-400 text-center font-bold">—</div>}
            </div>
          </div>

          {/* 4. RATE & GOODS VALUE */}
          <div
            className={`rounded-xl border px-1.5 py-0.8 text-center flex flex-col justify-between ${
              pdfMode ? "border-blue-200 bg-white" : "border-blue-200/90 bg-white/95 shadow-2xs shadow-blue-100/50"
            }`}
          >
            <div className="border-b border-blue-100/80 pb-0.5 mb-0.5">
              <div className="text-[7pt] font-black uppercase tracking-wider text-blue-800 leading-tight">
                RATE & GOODS VALUE
              </div>
              <div className="persian-text bol-persian-text font-[vazirmatn] text-[6.2pt] font-bold text-blue-600 leading-tight mt-0.2" dir="rtl">
                نرخ و ارزش کالا
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center space-y-0.5 text-left py-0.5">
              {hasRate && (
                <div className="flex flex-col gap-0 text-slate-800">
                  <span className="text-[5.8pt] font-black text-slate-600 uppercase tracking-wide">RATE / KG:</span>
                  <div className="break-words">
                    {formatMultiCargoValue(formData.rate_per_kgs, "text-[8pt] text-slate-900")}
                  </div>
                </div>
              )}
              {hasGoodsValue && (
                <div className="flex flex-col gap-0 text-emerald-950 border-t border-slate-100 pt-0.5">
                  <span className="text-[5.8pt] font-black text-emerald-700 uppercase tracking-wide">GOODS VALUE:</span>
                  <div className="break-words">
                    {formatMultiCargoValue(formData.goods_value, "text-[8pt] text-emerald-900")}
                  </div>
                </div>
              )}
              {!hasRate && !hasGoodsValue && <div className="text-slate-400 text-center font-bold">—</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ShippingOverview({
  formData,
  labels,
  pdfMode = false,
}: {
  formData: BillOfLadingFormData
  labels: Record<string, string>
  pdfMode?: boolean
}) {
  const hasLoading = hasValue(formData.port_of_loading)
  const hasDischarge = hasValue(formData.port_of_discharge)
  const hasDelivery = hasValue(formData.place_of_delivery)
  const hasVessel = hasValue(formData.vessel_name) || hasValue(formData.voyage_number)
  const hasFreight = hasValue(formData.freight_payable_at) || hasValue(formData.freight_terms)

  const vesselVoyageText = [
    formData.vessel_name ? `Vessel: ${formData.vessel_name}` : "",
    formData.voyage_number ? `Voy: ${formData.voyage_number}` : "",
  ].filter(Boolean).join(" / ")

  const freightText = [
    formData.freight_payable_at ? `Payable: ${formData.freight_payable_at}` : "",
    formData.freight_terms ? `Terms: ${formData.freight_terms}` : "",
  ].filter(Boolean).join(" | ")

  const items = [
    hasLoading && {
      title: "PORT OF LOADING",
      subtitle: labels.portOfLoadingFa || "بندر بارگیری",
      icon: "⚓",
      value: formData.port_of_loading,
      color: "text-blue-900",
      bg: "bg-blue-50/80",
    },
    hasDischarge && {
      title: "PORT OF DISCHARGE",
      subtitle: labels.portOfDischargeFa || "بندر تخلیه",
      icon: "🚢",
      value: formData.port_of_discharge,
      color: "text-indigo-900",
      bg: "bg-indigo-50/80",
    },
    hasDelivery && {
      title: "PLACE OF DELIVERY",
      subtitle: labels.placeOfDeliveryFa || "محل تحویل",
      icon: "📍",
      value: formData.place_of_delivery,
      color: "text-emerald-900",
      bg: "bg-emerald-50/80",
    },
    hasVessel && {
      title: "VESSEL / VOYAGE",
      subtitle: labels.vesselVoyageFa || "کشتی و سفر",
      icon: "🛥️",
      value: vesselVoyageText,
      color: "text-cyan-900",
      bg: "bg-cyan-50/80",
    },
    hasFreight && {
      title: "FREIGHT CHARGES",
      subtitle: labels.freightPayableFa || "پرداخت کرایه",
      icon: "💳",
      value: freightText,
      color: "text-slate-900",
      bg: "bg-slate-50/80",
    },
  ].filter(Boolean) as Array<{
    title: string
    subtitle: string
    icon: string
    value: string
    color: string
    bg: string
  }>

  if (items.length === 0) return null

  return (
    <div
      className={`grid gap-1 ${
        items.length >= 5 ? "grid-cols-2 sm:grid-cols-5" :
        items.length === 4 ? "grid-cols-2 sm:grid-cols-4" :
        items.length === 3 ? "grid-cols-3" :
        items.length === 2 ? "grid-cols-2" : "grid-cols-1"
      }`}
      dir="ltr"
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          className={`rounded-lg border px-2 py-1 text-center flex flex-col justify-between ${
            pdfMode ? "border-blue-100 bg-white" : "border-blue-100/90 bg-white/95 shadow-2xs shadow-blue-100/50"
          }`}
        >
          <div>
            <div className="flex items-center justify-center gap-1">
              <span className="text-[7.5pt] leading-none">{item.icon}</span>
              <span className="text-[6.2pt] font-black uppercase tracking-wider text-blue-800 leading-tight">
                {item.title}
              </span>
            </div>
            <div className="persian-text bol-persian-text font-[vazirmatn] text-[5.5pt] font-bold text-blue-600 leading-tight mt-0.2" dir="rtl">
              {item.subtitle}
            </div>
          </div>
          <div className="mt-0.8 font-sans font-black text-slate-950 text-[8.2pt] leading-tight break-words px-0.5">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}

export function A4Preview({
  bolNumber,
  issueDate,
  persianDateNumeric,
  formData,
  logoUrl,
  companyName,
  companyNamePersian,
  companySubtitle,
  companyPhone,
  companyEmail,
  companyAddress,
  companyLicence,
  exportTarget = false,
  pdfExport = false,
  includeColorStrip = true,
  backgroundImageUrl = "/images/mountain_logistics_bg.jpg",
  backgroundOpacity = 0.11,
  showStampSignature,
  onToggleStampSignature,
}: A4PreviewProps) {
  const [internalStampActive, setInternalStampActive] = useState(true)
  const isStampActive = showStampSignature !== undefined ? showStampSignature : internalStampActive
  const [stampImageSrc, setStampImageSrc] = useState<string>(COMPANY_STAMP_SIGNATURE_SRC)
  const [stampScale, setStampScale] = useState<number>(1.0)

  useEffect(() => {
    setStampImageSrc(getStoredCompanyStamp())
    setStampScale(getStoredCompanyStampScale())

    const handleStampUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ dataUrl?: string; scale?: number }>
      if (customEvent.detail?.dataUrl) {
        setStampImageSrc(customEvent.detail.dataUrl)
      } else {
        setStampImageSrc(getStoredCompanyStamp())
      }
      if (customEvent.detail?.scale !== undefined) {
        setStampScale(customEvent.detail.scale)
      } else {
        setStampScale(getStoredCompanyStampScale())
      }
    }

    window.addEventListener("company_stamp_updated", handleStampUpdate)
    return () => {
      window.removeEventListener("company_stamp_updated", handleStampUpdate)
    }
  }, [])

  const toggleStamp = () => {
    if (onToggleStampSignature) {
      onToggleStampSignature(!isStampActive)
    } else {
      setInternalStampActive(!internalStampActive)
    }
  }

  const pdfMode = exportTarget || pdfExport
  const companyTitle = cleanText(companyName) || "SKY ARIANA LIMITED"
  const companyTagline = cleanText(companySubtitle) || "Import & Export - International Transportation"
  const companyPersian = cleanText(companyNamePersian) || labels.persianCompanyFallback
  const companyFooter = joinOfficeLine([
    companyPhone,
    companyEmail,
    companyLicence ? `Licence: ${companyLicence}` : undefined,
  ])
  const companyAddressLine =
    cleanText(companyAddress) ||
    "2nd Floor, 16 No. Office, Shahidano, Chowk, Etimad Rahmi Market, Kandahar, Afghanistan"
  const iranOffice = joinOfficeLine([
    formData.iran_office_building ? `IRAN OFFICE: ${formData.iran_office_building}` : undefined,
    formData.iran_office_location,
    formData.iran_office_pobox ? `P.O.Box: ${formData.iran_office_pobox}` : undefined,
    formData.iran_office_telefax ? `Tel/Fax: ${formData.iran_office_telefax}` : undefined,
    formData.iran_office_cellphone ? `Cell: ${formData.iran_office_cellphone}` : undefined,
    formData.iran_office_email ? `Email: ${formData.iran_office_email}` : undefined,
  ])

  const contactItems: DetailItem[] = [
    { label: formData.notes_1_label || "Contact Phone", value: formData.notes_1, important: true, highlight: true, highlightColor: formData.notes_1_theme || "blue" },
    { label: formData.notes_2_label || "Border Representative / نماینده مرزی", value: formData.notes_2, important: true, highlight: true, highlightColor: formData.notes_2_theme || "blue" },
  ]

  const driverNameVal = formData.driver_name || ""
  const driverFatherNameVal = formData.driver_father_name ? ` S/O ${formData.driver_father_name}` : ""
  const driverFullInfo = driverNameVal || driverFatherNameVal ? `${driverNameVal}${driverFatherNameVal}` : undefined

  const combinedDateVal = [issueDate, persianDateNumeric].filter(Boolean).join("\n")

  const hasShipmentData = [
    issueDate,
    persianDateNumeric,
    formData.bol_number,
    formData.truck_number,
    formData.driver_name,
    formData.driver_father_name,
    formData.driver_contact,
    formData.driver_rent,
  ].some(hasValue)

  const hasCargoData = [
    formData.number_of_packages,
    formData.kgs_per_carton,
    formData.gross_weight_per_carton,
    formData.rate_per_kgs,
    formData.goods_value,
    formData.net_weight,
    formData.gross_weight,
    formData.container_numbers,
    formData.seal_numbers,
    formData.measurement,
  ].some(hasValue)

  const hasShippingData = [
    formData.port_of_loading,
    formData.port_of_discharge,
    formData.place_of_delivery,
    formData.vessel_name,
    formData.voyage_number,
    formData.freight_payable_at,
    formData.freight_terms,
  ].some(hasValue)

  const cleanedCargoDesc = cleanCargoDescriptionText(formData.cargo_description)
  const hasExporter = [formData.shipper_name, formData.shipper_address, formData.shipper_contact, formData.shipper_email].some(hasValue)
  const hasNotify = [formData.notify_party, formData.notify_party_address].some(hasValue)

  return (
    <div
      data-bol-a4="true"
      data-pdf-export={pdfMode ? "true" : undefined}
      data-color-strip={includeColorStrip ? "true" : "false"}
      className="mx-auto flex min-h-[297mm] w-[210mm] max-w-[210mm] h-[297mm] max-h-[297mm] flex-col overflow-hidden text-slate-950 shadow-2xl shadow-blue-200/50 ring-1 ring-blue-100 print:m-0 print:p-0 print:h-[297mm] print:min-h-[297mm] print:max-h-[297mm] print:w-[210mm] print:max-w-[210mm] print:shadow-none print:ring-0 relative box-border"
      style={pdfMode ? { ...a4ShellStyle, width: "210mm", minHeight: "297mm", height: "297mm", maxHeight: "297mm", overflow: "hidden", boxSizing: "border-box" } : a4ShellStyle}
    >
      <div data-bol-page="true" className="relative flex h-full flex-col p-[1.8mm] print:p-[1.6mm] gap-[0.6mm] print:gap-[0.4mm] overflow-hidden box-border">
        {/* Technical Blueprint & Mountain Scenery Background Overlay */}
        {backgroundImageUrl && (
          <div
            data-bol-watermark="true"
            className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-2xl transition-all duration-300"
            style={{
              backgroundImage: `url('${backgroundImageUrl}')`,
              backgroundSize: "cover",
              backgroundPosition: "center center",
              backgroundRepeat: "no-repeat",
              opacity: pdfMode ? Math.min(0.09, backgroundOpacity) : Math.min(0.12, backgroundOpacity),
              filter: "contrast(1.02) brightness(1.04)",
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact",
              maskImage: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.85) 100%)",
              WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.85) 100%)",
            }}
            aria-hidden="true"
          />
        )}
        <header
          data-bol-header="true"
          className={`overflow-hidden rounded-xl border shrink-0 ${
            pdfMode ? "border-blue-200 bg-white" : "border-blue-200/90 bg-white shadow-md shadow-blue-100/70"
          }`}
          style={pdfMode ? { boxShadow: "none" } : undefined}
        >
          <div className="p-1.5" style={headerGridStyle}>
            {/* 1. Left: Logo Frame */}
            <div
              className={`flex items-center justify-center p-0.5 ${
                pdfMode ? "bg-transparent" : "bg-transparent"
              }`}
              style={logoFrameStyle}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl || "/logo.png"}
                alt="Company logo"
                className="logo object-contain"
                style={logoImageStyle}
              />
            </div>

            {/* 2. Center: Company Brand Title & Subtitle */}
            <div className="bol-company-block min-w-0 px-2 text-center flex flex-col items-center justify-center">
              <h1 className="bol-company-name english-text text-[16.5pt] sm:text-[18pt] font-black uppercase tracking-tight text-blue-950 leading-tight">
                {companyTitle}
              </h1>
              <p className="english-text text-[7.8pt] sm:text-[8.5pt] mt-0.5 font-black uppercase tracking-[0.22em] text-slate-600 leading-tight">
                {companyTagline}
              </p>
              <p className="persian-text bol-persian-text text-[11pt] sm:text-[12.5pt] mt-0.5 font-[vazirmatn] font-black leading-snug text-blue-900" dir="rtl">
                {companyPersian}
              </p>
            </div>

            {/* 3. Right: Official Document & BOL Number Card */}
            <div
              data-bol-title-card="true"
              className={`bol-title-card overflow-hidden rounded-lg border ${
                pdfMode ? "border-blue-200 bg-white" : "border-blue-200/90 bg-white shadow-sm shadow-blue-100/60"
              }`}
            >
              <div className="bol-title-box px-1.5 py-0.5 text-center text-white flex flex-col items-center justify-center" style={darkHeaderStyle}>
                <p className="bol-title-en english-text text-[8.8pt] font-black uppercase tracking-wider leading-tight">
                  Bill of Lading
                </p>
                <p className="bol-title-fa persian-text bol-persian-text font-[vazirmatn] text-[7.8pt] font-bold leading-tight" dir="rtl">
                  {labels.billOfLadingFa}
                </p>
              </div>
              <div
                data-pdf-bol-badge="true"
                className="bol-number-box w-full bg-white px-1 py-0.6 border-t border-blue-100 flex items-center justify-between gap-1"
              >
                <div className="flex-1 text-center min-w-0">
                  <span className="block text-[4.8pt] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.2">
                    DOCUMENT NO.
                  </span>
                  <span
                    data-pdf-bol-number="true"
                    className="bol-number-text block font-mono text-[7.8pt] font-black leading-tight text-blue-950 tracking-tight truncate"
                    style={{ color: "#1e3a8a" }}
                  >
                    {bolNumber}
                  </span>
                </div>
                <div className="shrink-0 flex items-center justify-center p-0.5 bg-white border border-slate-200 rounded shadow-2xs">
                  <DocumentQRCode value={bolNumber || "SKY-BOL"} size={22} />
                </div>
              </div>
            </div>
          </div>
        </header>

        <main
          data-bol-content="true"
          className="mt-0 flex min-h-0 flex-1 flex-col gap-[0.6mm] print:gap-[0.4mm] overflow-visible"
        >
          {hasShipmentData && (
            <Section title="Shipment Information" subtitle={labels.shipmentInfoFa} icon={<CalendarDays className="h-4 w-4" />} glass={!pdfMode} printKey="shipment" pdfMode={pdfMode} titleClassName="text-[9.2pt]">
              <ShipmentOverview
                issueDate={issueDate}
                persianDateNumeric={persianDateNumeric}
                formData={formData}
                labels={labels}
                pdfMode={pdfMode}
              />
            </Section>
          )}

          <Section title="Exporter Contacts" subtitle={labels.exporterContactsFa} icon={<Phone className="h-4 w-4" />} glass={!pdfMode} printKey="contacts" pdfMode={pdfMode}>
            {contactItems.length > 0 && (
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2" dir="ltr">
                {contactItems.map((item) => (
                  <DetailCard key={item.label} {...item} rtl={false} glass={!pdfMode} pdfMode={pdfMode} compact className="exporter-contact-detail-card text-left" />
                ))}
              </div>
            )}
            <div className="mt-0 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-2 print:grid-cols-2 print:gap-1 print:mt-0" dir="ltr">
              {/* COMBINED EXPORTER & NOTIFY PARTY CARD (HIDE BLANK ONES CLEANLY) */}
              {(hasExporter || hasNotify) && (
                <div
                  {...(pdfMode ? { 'data-no-break': true } : {})}
                  className={`party-card ${!pdfMode ? 'party-card-glass' : 'party-card-solid'} ${pdfMode ? 'party-card-pdf' : ''}`}
                  dir="ltr"
                >
                <div className="flex flex-col divide-y divide-blue-100/80" dir="ltr">
                    {/* EXPORTER INFORMATION */}
                    {hasExporter && (
                      <div dir="ltr" className="text-left">
                        <div className={`party-card-header ${!pdfMode ? 'party-card-header-glass' : 'party-card-header-solid'}`} dir="ltr">
                          <span className="party-card-icon"><Building2 className="h-3.5 w-3.5" /></span>
                          <div className="party-card-header-text text-left" dir="ltr">
                            <h4 className="party-card-title text-left" dir="ltr">Exporter Info</h4>
                            <p className="party-card-subtitle text-left" dir="ltr">{labels.exporterInfoFa}</p>
                          </div>
                        </div>
                        <div className="party-card-body text-left" dir="ltr">
                          <TextLines value={formData.shipper_name} className="party-card-name text-left" />
                          <div className="party-card-info-list text-left" dir="ltr">
                            {hasValue(formData.shipper_address) && (
                              <div className="party-card-info-row text-left" dir="ltr">
                                <MapPin className="party-card-info-icon" />
                                <TextLines value={formData.shipper_address} className="party-card-info-text text-left" />
                              </div>
                            )}
                            {hasValue(formData.shipper_contact) && (
                              <div className="party-card-info-row text-left" dir="ltr">
                                <Phone className="party-card-info-icon" />
                                <TextLines value={formData.shipper_contact} className="party-card-info-text text-left" />
                              </div>
                            )}
                            {hasValue(formData.shipper_email) && (
                              <div className="party-card-info-row text-left" dir="ltr">
                                <Mail className="party-card-info-icon" />
                                <TextLines value={formData.shipper_email} className="party-card-info-text text-left" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* NOTIFY PARTY */}
                    {hasNotify && (
                      <div>
                        <div className={`party-card-header ${!pdfMode ? 'party-card-header-glass' : 'party-card-header-solid'}`}>
                          <span className="party-card-icon"><Mail className="h-3.5 w-3.5" /></span>
                          <div className="party-card-header-text">
                            <h4 className="party-card-title">Notify Party</h4>
                            <p className="party-card-subtitle" dir="rtl">{labels.notifyPartyFa}</p>
                          </div>
                        </div>
                        <div className="party-card-body">
                          <TextLines value={formData.notify_party} className="party-card-name" />
                          <div className="party-card-info-list">
                            {hasValue(formData.notify_party_address) && (
                              <div className="party-card-info-row">
                                <MapPin className="party-card-info-icon" />
                                <TextLines value={formData.notify_party_address} className="party-card-info-text" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CONSIGNEE INFORMATION CARD */}
              <PartyCard
                title="Consignee Information"
                subtitle={labels.consigneeInfoFa}
                icon={<UserRound className="h-3.5 w-3.5" />}
                name={formData.consignee_name}
                address={formData.consignee_address}
                contact={formData.consignee_contact}
                email={formData.consignee_email}
                glass={!pdfMode}
                pdfMode={pdfMode}
              />
            </div>
          </Section>

          <Section title="Route / Transportation Path" subtitle={labels.routeFa} icon={<Route className="h-4 w-4" />} glass={!pdfMode} printKey="route" pdfMode={pdfMode}>
            <RouteTimeline routes={formData.routes} glass={!pdfMode} />
          </Section>

          {hasShippingData && (
            <Section
              title="Shipping Details & Ports"
              subtitle={labels.shippingDetailsFa}
              icon={<Ship className="h-4 w-4" />}
              glass={!pdfMode}
              printKey="shipping"
              pdfMode={pdfMode}
              titleClassName="text-[9.2pt]"
            >
              <ShippingOverview formData={formData} labels={labels} pdfMode={pdfMode} />
            </Section>
          )}

          {(hasCargoData || hasValue(cleanedCargoDesc)) && (
            <Section title="Cargo Description" subtitle={labels.cargoDescFa} icon={<Package className="h-4 w-4" />} glass={!pdfMode} printKey="cargo" pdfMode={pdfMode} titleClassName="text-[9.2pt]">
              {hasCargoData && (
                <CargoOverview formData={formData} labels={labels} pdfMode={pdfMode} />
              )}
              {hasValue(cleanedCargoDesc) && (
                <div
                  className={`mt-1.5 rounded-xl border p-2 shadow-xs ${
                    pdfMode ? "border-blue-100 bg-white" : "border-blue-100/90 bg-white shadow-2xs"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-1.5 text-blue-800">
                    <FileText className="h-3.5 w-3.5" />
                    <p className="text-[8.5pt] font-black leading-tight">
                      Description of Goods / <span className="persian-text bol-persian-text font-[vazirmatn]" dir="rtl">{labels.goodsDescriptionFa}</span>
                    </p>
                  </div>
                  <TextLines
                    value={cleanedCargoDesc}
                    className="text-[8.2pt] font-extrabold leading-snug text-slate-950"
                  />
                </div>
              )}
            </Section>
          )}

          <div data-no-break className="mt-auto flex items-end justify-between pt-0.5 px-3 flex-shrink-0">
            {/* Left side: Official Document Verification & interactive toggle */}
            <div className="flex flex-col items-start justify-end text-left text-[5.2pt] text-slate-500 font-medium pb-0.5">
              <div className="flex items-center gap-1 font-extrabold text-blue-900 uppercase tracking-wider text-[5.5pt]">
                <ShieldCheck className="h-3 w-3 text-blue-600 shrink-0" />
                <span>Verified Carrier Document</span>
              </div>
              <span className="font-[vazirmatn] text-slate-500 text-[5pt] mt-0.2" dir="rtl">
                سند رسمی و قانونی حمل و نقل بین‌المللی
              </span>
              {!pdfMode && (
                <button
                  type="button"
                  onClick={toggleStamp}
                  className="no-print mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[6.5pt] font-black transition cursor-pointer border shadow-2xs bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
                  title="Click to toggle official stamp and signature on/off"
                >
                  <span>{isStampActive ? "🖋️ Stamp & Sign: ON" : "⚪ Stamp & Sign: OFF"}</span>
                </button>
              )}
            </div>

            {/* Right side: Authorized Signature & Official Seal Block (NO ENCLOSING BOX) */}
            <div className="relative flex flex-col items-center justify-center min-w-[55mm] max-w-[68mm] text-center">
              {/* Official Stamp & Signature Overlay - Balanced size identical in A4 preview and print */}
              <div className="relative w-full h-[18mm] flex items-center justify-center">
                {isStampActive ? (
                  <div
                    className="absolute -bottom-1 inset-x-0 flex items-center justify-center pointer-events-none select-none z-10"
                    style={{ transform: `scale(${stampScale})`, transformOrigin: "center bottom" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      data-company-stamp-img="true"
                      src={stampImageSrc || COMPANY_STAMP_SIGNATURE_SRC}
                      alt="Sky Ariana Limited Official Stamp & Signature"
                      className="h-[35mm] max-h-[36mm] w-auto max-w-[58mm] object-contain drop-shadow-sm transform -rotate-1"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        const target = e.currentTarget
                        if (target.src !== COMPANY_STAMP_SIGNATURE_DATA_URL) {
                          target.src = COMPANY_STAMP_SIGNATURE_DATA_URL
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-[6.5pt] italic text-slate-400 font-semibold my-auto">
                    (Sign & Stamp Here / محل امضا و مهر)
                  </div>
                )}
              </div>

              {/* Clean Signature Baseline Line */}
              <div className="w-full border-b-1.5 border-slate-700/80 my-0.5" />

              {/* Authorized Labels */}
              <p className="text-[7pt] font-black text-blue-950 uppercase tracking-tight leading-tight">
                For & On Behalf of: {companyTitle}
              </p>
              <p className="persian-text bol-persian-text font-[vazirmatn] text-[6.2pt] font-extrabold text-blue-900 leading-tight mt-0.2" dir="rtl">
                {labels.companyStampSignFa || "مهر و امضای مجاز شرکت"}
              </p>
            </div>
          </div>
        </main>

        <footer
          data-bol-footer="true"
          className={`mt-0.5 overflow-hidden rounded-xl border text-center shadow-sm shadow-blue-100/70 ${
            pdfMode ? "border-blue-200 bg-white" : "border-blue-200/90 bg-white"
          }`}
          data-no-break
        >
          {/* Main Executive Banner */}
          <div className="px-2.5 py-0.8 text-white" style={blueBarStyle}>
            <div className="flex items-center justify-between gap-2 border-b border-white/20 pb-0.5 mb-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[6.5pt] font-black uppercase tracking-wider text-white truncate">
                  {companyTitle}
                </span>
                <span className="text-sky-200 opacity-60 text-[5.5pt]">•</span>
                <span className="text-[5.8pt] font-bold text-sky-100 truncate">
                  {companyTagline}
                </span>
              </div>
              {companyLicence && (
                <span className="shrink-0 bg-white/20 text-white font-mono font-black text-[5.2pt] px-1.5 py-0.2 rounded border border-white/25">
                  LICENCE: {companyLicence}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 text-[5.2pt] font-semibold text-sky-50">
              <div className="flex items-center gap-1 truncate">
                <MapPin className="h-2.8 w-2.8 shrink-0 text-sky-200" />
                <span className="truncate">{companyAddressLine}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono text-[5.2pt]">
                {companyPhone && (
                  <span className="flex items-center gap-0.5">
                    <Phone className="h-2.5 w-2.5 text-sky-200" />
                    <span>{companyPhone}</span>
                  </span>
                )}
                {companyEmail && (
                  <span className="flex items-center gap-0.5">
                    <Mail className="h-2.5 w-2.5 text-sky-200" />
                    <span>{companyEmail}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sub-bar: Office & Official Verification */}
          <div className="flex items-center justify-between gap-2 px-2.5 py-0.5 text-[5pt] font-bold text-slate-600 bg-slate-50/80">
            <div className="flex items-center gap-1 truncate text-left">
              {iranOffice ? (
                <span className="truncate">{iranOffice}</span>
              ) : (
                <span className="flex items-center gap-1 text-slate-500">
                  <Globe className="h-2.8 w-2.8 text-blue-600 shrink-0" />
                  <span>www.skyariana.com</span>
                  <span className="opacity-40">|</span>
                  <Mail className="h-2.8 w-2.8 text-blue-600 shrink-0" />
                  <span>transport@skyariana.com</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 text-blue-900 font-extrabold text-[5.2pt]">
              <ShieldCheck className="h-3 w-3 text-blue-600 shrink-0" />
              <span>OFFICIAL CARRIER DOCUMENT</span>
              <span className="font-[vazirmatn] text-slate-500 text-[4.8pt] font-semibold" dir="rtl">
                (سند معتبر حمل و نقل بین‌المللی)
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
