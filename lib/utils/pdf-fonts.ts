"use client"

import type { jsPDF } from "jspdf"
import { isPashtoOrArabic, prepareBidiPdfText } from "./pashto-bidi"

export interface PDFFontAssets {
  notoSansRegular: string
  notoSansBold: string
  arabicRegular: string
  arabicBold: string
}

let cachedFontAssets: PDFFontAssets | null = null

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || "")
      resolve(dataUrl.split(",")[1] || "")
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function fetchFontBase64(fileName: string): Promise<string> {
  // 1. Browser environment: fetch from static public route
  if (typeof window !== "undefined") {
    const response = await fetch(`/fonts/${fileName}`)
    if (!response.ok) {
      throw new Error(`Failed to load font from /fonts/${fileName} (${response.status})`)
    }
    const blob = await response.blob()
    return await blobToBase64(blob)
  }

  // 2. Node.js / SSR / Test runner environment: read from disk
  try {
    const fs = await import(/* webpackIgnore: true */ "fs")
    const path = await import(/* webpackIgnore: true */ "path")
    const fullPath = path.join(process.cwd(), "public", "fonts", fileName)
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath).toString("base64")
    }
  } catch {
    // Fallback if fs is unavailable
  }

  return ""
}

/**
 * Loads and caches base64 TrueType fonts for Noto Sans and Noto Naskh Arabic.
 */
export async function loadPDFFontAssets(): Promise<PDFFontAssets | null> {
  if (cachedFontAssets) return cachedFontAssets

  try {
    const [notoSansRegular, notoSansBold, arabicRegular, arabicBold] = await Promise.all([
      fetchFontBase64("NotoSans-Regular.ttf"),
      fetchFontBase64("NotoSans-Bold.ttf"),
      fetchFontBase64("NotoNaskhArabic-Regular.ttf"),
      fetchFontBase64("NotoNaskhArabic-Bold.ttf"),
    ])

    if (!notoSansRegular || !arabicRegular) {
      return null
    }

    cachedFontAssets = {
      notoSansRegular,
      notoSansBold: notoSansBold || notoSansRegular,
      arabicRegular,
      arabicBold: arabicBold || arabicRegular,
    }

    return cachedFontAssets
  } catch (err) {
    console.warn("Could not preload PDF font assets:", err)
    return null
  }
}

/**
 * Registers NotoSans and NotoNaskhArabic fonts into a jsPDF instance.
 * Embeds TrueType CIDFont (Identity-H) so Arabic and Pashto characters
 * render cleanly without 8-bit WinAnsi mojibake.
 */
export async function registerPDFFonts(doc: jsPDF): Promise<boolean> {
  try {
    const fontList = typeof doc.getFontList === "function" ? doc.getFontList() : null
    const alreadyRegistered = Boolean(fontList?.NotoSans && fontList?.NotoNaskhArabic)
    if (alreadyRegistered) return true

    const assets = await loadPDFFontAssets()
    if (!assets) return false

    // Register into virtual file system
    doc.addFileToVFS("NotoSans-Regular.ttf", assets.notoSansRegular)
    doc.addFileToVFS("NotoSans-Bold.ttf", assets.notoSansBold)
    doc.addFileToVFS("NotoNaskhArabic-Regular.ttf", assets.arabicRegular)
    doc.addFileToVFS("NotoNaskhArabic-Bold.ttf", assets.arabicBold)

    // Register font families
    doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal")
    doc.addFont("NotoSans-Regular.ttf", "NotoSans", "italic")
    doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold")
    doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bolditalic")
    doc.addFont("NotoNaskhArabic-Regular.ttf", "NotoNaskhArabic", "normal")
    doc.addFont("NotoNaskhArabic-Regular.ttf", "NotoNaskhArabic", "italic")
    doc.addFont("NotoNaskhArabic-Bold.ttf", "NotoNaskhArabic", "bold")
    doc.addFont("NotoNaskhArabic-Bold.ttf", "NotoNaskhArabic", "bolditalic")

    return true
  } catch (err) {
    console.warn("PDF TrueType font registration fallback:", err)
    return false
  }
}

export function hasRegisteredPDFFonts(doc: jsPDF): { hasArabic: boolean; hasSans: boolean } {
  const fontList = typeof doc.getFontList === "function" ? doc.getFontList() : null
  return {
    hasArabic: Boolean(fontList?.NotoNaskhArabic),
    hasSans: Boolean(fontList?.NotoSans),
  }
}

/**
 * Selects either NotoNaskhArabic or NotoSans/Helvetica depending on the script.
 */
export function setSmartPDFFont(
  doc: jsPDF,
  text: string,
  weight: "normal" | "bold" = "normal",
): { fontName: string; isArabic: boolean } {
  const isArabic = isPashtoOrArabic(text)
  const fontStatus = hasRegisteredPDFFonts(doc)

  if (isArabic && fontStatus.hasArabic) {
    doc.setFont("NotoNaskhArabic", weight)
    return { fontName: "NotoNaskhArabic", isArabic: true }
  }

  if (fontStatus.hasSans) {
    doc.setFont("NotoSans", weight)
    return { fontName: "NotoSans", isArabic: false }
  }

  doc.setFont("helvetica", weight)
  return { fontName: "helvetica", isArabic: false }
}

/**
 * Prepares and draws text with automatic font selection and bidirectional support.
 */
export function drawSmartPdfText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options?: {
    size?: number
    weight?: "normal" | "bold"
    color?: readonly [number, number, number]
    align?: "left" | "center" | "right"
    maxWidth?: number
    lineHeight?: number
  },
): number {
  if (!text) return 0
  const size = options?.size ?? 7.5
  const weight = options?.weight ?? "normal"
  const align = options?.align ?? "left"
  const maxWidth = options?.maxWidth
  const lineHeight = options?.lineHeight ?? size * 0.42

  if (options?.color) {
    doc.setTextColor(options.color[0], options.color[1], options.color[2])
  }
  doc.setFontSize(size)

  const isArabic = isPashtoOrArabic(text)
  setSmartPDFFont(doc, text, weight)

  const rawLines = text.split(/\r?\n/)
  const processedLines: string[] = []

  for (const rawLine of rawLines) {
    if (!rawLine.trim()) {
      processedLines.push("")
      continue
    }

    if (isArabic) {
      const prepared = prepareBidiPdfText(rawLine)
      if (maxWidth && doc.getTextWidth(prepared) > maxWidth) {
        // Wrap with splitTextToSize
        const wrapped = doc.splitTextToSize(rawLine, maxWidth) as string[]
        for (const w of wrapped) {
          processedLines.push(prepareBidiPdfText(w))
        }
      } else {
        processedLines.push(prepared)
      }
    } else {
      if (maxWidth && doc.getTextWidth(rawLine) > maxWidth) {
        const wrapped = doc.splitTextToSize(rawLine, maxWidth) as string[]
        processedLines.push(...wrapped)
      } else {
        processedLines.push(rawLine)
      }
    }
  }

  processedLines.forEach((line, idx) => {
    const lineY = y + idx * lineHeight
    doc.text(line, x, lineY, { align })
  })

  return processedLines.length * lineHeight
}
