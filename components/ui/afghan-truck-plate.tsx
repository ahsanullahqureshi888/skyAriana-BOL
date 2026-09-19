"use client"

import React, { useMemo } from "react"
import {
  parseAfghanPlate,
  getProvinceInfo,
  getProvinceCode,
  normalizeProvinceName,
  convertToLatinDigits,
  convertToPersianDigits,
  AFGHAN_PLATE_LETTERS,
  type AfghanProvince,
  type ParsedAfghanPlate,
} from "@/lib/utils/afghan-plate"

export {
  parseAfghanPlate,
  getProvinceInfo,
  getProvinceCode,
  normalizeProvinceName,
  convertToLatinDigits,
  convertToPersianDigits,
  AFGHAN_PLATE_LETTERS,
  type AfghanProvince,
  type ParsedAfghanPlate,
}

/**
 * Official Afghanistan National Emblem Silhouette for Vehicle Registration Plates.
 * Depicts the historic national emblem: mosque with mihrab and minbar,
 * flanked by two ears of wheat and a star, in authentic monochrome stamped style.
 */
function AfghanNationalPlateEmblem({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Top Star */}
      <polygon points="24,2 25.5,5.5 29,5.8 26.5,8.2 27.2,12 24,10 20.8,12 21.5,8.2 19,5.8 22.5,5.5" />

      {/* Mosque Dome & Crescent */}
      <path d="M24 13c-4.5 0-7 3.5-7 6.5h14c0-3-2.5-6.5-7-6.5z" />

      {/* Mosque Minaret Pillars & Arch */}
      <path d="M18 20.5v12h12v-12h-12zm6 10c-1.8 0-3-1.6-3-3.5v-6.5h6v6.5c0 1.9-1.2 3.5-3 3.5z" />

      {/* Minbar / Pulpit steps */}
      <path d="M23 27h2v3.5h-2zM21.5 28.5h5v2h-5z" />

      {/* Left Sheaf of Wheat */}
      <path
        d="M13 14c-1.5 3-2.5 7-1.5 12 1 4.5 3.5 8 7.5 10-1.8-3.5-2.2-7.5-1.5-11 .8-4 2-7 3.5-9.5-2.8-.5-5.5-.8-8-1.5z"
        opacity="0.95"
      />
      <path
        d="M11 19c-1.2 2.2-1.8 5-1.2 7.8 1.2-1.5 2.8-2.5 4.2-3.2-.8-2-1.8-3.8-3-4.6z"
        opacity="0.85"
      />

      {/* Right Sheaf of Wheat */}
      <path
        d="M35 14c1.5 3 2.5 7 1.5 12-1 4.5-3.5 8-7.5 10 1.8-3.5 2.2-7.5 1.5-11-.8-4-2-7-3.5-9.5 2.8-.5 5.5-.8 8-1.5z"
        opacity="0.95"
      />
      <path
        d="M37 19c1.2 2.2 1.8 5 1.2 7.8-1.2-1.5-2.8-2.5-4.2-3.2.8-2 1.8-3.8 3-4.6z"
        opacity="0.85"
      />

      {/* Base Ribbon / Plinth */}
      <path d="M15 40h18c2 0 4-1 5-2H10c1 1 3 2 5 2z" />
      <rect x="18" y="41.5" width="12" height="2" rx="0.5" />
    </svg>
  )
}

/**
 * Stamped plate mounting bolt / screw head indentation.
 */
function PlateMountingBolt({ className = "w-1 h-1" }: { className?: string }) {
  return (
    <div
      className={`rounded-full bg-slate-300 border border-slate-500/70 shadow-[inset_0_0.5px_0.5px_rgba(0,0,0,0.5)] flex items-center justify-center pointer-events-none shrink-0 ${className}`}
      aria-hidden="true"
    >
      <div className="w-[60%] h-[0.7px] bg-slate-600/80 rounded-full rotate-45" />
    </div>
  )
}

export interface AfghanTruckPlateProps {
  /** Combined raw truck plate string (e.g. "2877 کابل", "35974 کابل", "24345 کابل ل") */
  value?: string
  /** Explicit registration number */
  plateNumber?: string
  /** Explicit province name (Dari/Pashto or English) */
  province?: string
  /** Explicit 3-letter province code */
  provinceEn?: string
  /** Explicit plate letter (e.g. "ل" or "L") */
  plateLetter?: string
  /** Plate letter in Latin */
  plateLetterEn?: string
  /** Visual scale */
  size?: "compact" | "default" | "sm" | "md" | "lg" | "responsive"
  /** Show official emblem on bottom left beside province code */
  showEmblem?: boolean
  /** Show realistic stamped metal mounting bolts */
  showBolts?: boolean
  /** Additional CSS class names */
  className?: string
  /** Custom inline styles */
  style?: React.CSSProperties
}

/**
 * <AfghanTruckPlate />
 *
 * Authentic Afghanistan Vehicle Registration License Plate Component.
 * Faithfully matches real Afghanistan commercial truck plates:
 * - Stamped aluminum finish with metallic gradient and debossed perimeter groove
 * - Top row: Dari/Pashto Province (Left), Persian Numerals (Center), Persian Category Letter (Right)
 * - Bottom row: National Emblem & 3-letter Latin Code (Left), Latin Numerals (Center), Latin Letter (Right)
 * - Top and bottom numbers are locked into the same column of a unified grid, ensuring 100% vertical alignment
 * - RTL/LTR isolation: digits and letters strictly preserve their correct reading order
 * - Clean automotive aesthetic free of cartoon emojis or artificial badges
 */
export function AfghanTruckPlate({
  value,
  plateNumber: explicitNumber,
  province: explicitProvince,
  provinceEn: explicitProvinceEn,
  plateLetter: explicitLetter,
  plateLetterEn: explicitLetterEn,
  size = "compact",
  showEmblem = true,
  showBolts = true,
  className = "",
  style,
}: AfghanTruckPlateProps) {
  // Parse or compute data
  const data = useMemo(() => {
    const parsed = parseAfghanPlate(value || explicitNumber || "")

    const finalNumber = explicitNumber ? convertToLatinDigits(explicitNumber.trim()) : parsed.plateNumber
    const finalNumberFa = finalNumber ? convertToPersianDigits(finalNumber) : parsed.plateNumberFa

    let finalProvFa = parsed.provinceFa
    let finalProvCode = parsed.provinceCode

    if (explicitProvince) {
      const info = getProvinceInfo(explicitProvince)
      finalProvFa = info.nameFa
      finalProvCode = explicitProvinceEn ? explicitProvinceEn.toUpperCase() : info.code
    } else if (explicitProvinceEn) {
      finalProvCode = explicitProvinceEn.toUpperCase()
    }

    let finalLetterFa = parsed.plateLetterFa
    let finalLetterEn = parsed.plateLetterEn

    if (explicitLetter) {
      const letterInfo = AFGHAN_PLATE_LETTERS[explicitLetter] || {
        fa: explicitLetter,
        en: explicitLetterEn || explicitLetter.toUpperCase(),
      }
      finalLetterFa = letterInfo.fa
      finalLetterEn = explicitLetterEn || letterInfo.en
    } else if (explicitLetterEn) {
      const letterInfo = AFGHAN_PLATE_LETTERS[explicitLetterEn] || {
        fa: explicitLetterEn,
        en: explicitLetterEn.toUpperCase(),
      }
      finalLetterFa = letterInfo.fa
      finalLetterEn = explicitLetterEn.toUpperCase()
    }

    const hasLetter = Boolean(finalLetterFa && finalLetterEn)

    return {
      number: finalNumber,
      numberFa: finalNumberFa,
      provinceFa: finalProvFa,
      provinceCode: finalProvCode,
      letterFa: finalLetterFa,
      letterEn: finalLetterEn,
      hasLetter,
    }
  }, [value, explicitNumber, explicitProvince, explicitProvinceEn, explicitLetter, explicitLetterEn])

  // Precision dimensional presets matching real license plate proportions (~3:1 aspect)
  const sizeStyles = {
    compact: {
      container: "w-[160px] h-[40px] px-2.5 py-0.5 rounded-[6px]",
      border: "border-[1.8px]",
      insetRim: "inset-[2px]",
      provFa: "text-[8.5pt] leading-none",
      numFa: "text-[12pt] leading-none tracking-[0.03em]",
      letterFa: "text-[9.5pt] leading-none",
      emblem: "w-3.5 h-3.5",
      provEn: "text-[7pt] leading-none tracking-wider",
      numEn: "text-[10.5pt] leading-none tracking-normal font-black",
      letterEn: "text-[8.5pt] leading-none font-black",
      bolt: "w-1 h-1",
    },
    sm: {
      container: "w-[138px] h-[36px] px-2 py-0.5 rounded-[5px]",
      border: "border-[1.8px]",
      insetRim: "inset-[1.5px]",
      provFa: "text-[7.5pt] leading-none",
      numFa: "text-[10.5pt] leading-none tracking-[0.03em]",
      letterFa: "text-[8pt] leading-none",
      emblem: "w-3 h-3",
      provEn: "text-[6.2pt] leading-none tracking-wider",
      numEn: "text-[9.2pt] leading-none tracking-tight font-black",
      letterEn: "text-[7.5pt] leading-none font-black",
      bolt: "w-0.8 h-0.8",
    },
    default: {
      container: "w-[204px] h-[52px] px-3 py-1 rounded-[7px]",
      border: "border-[2.2px]",
      insetRim: "inset-[2px]",
      provFa: "text-[10.5pt] leading-none",
      numFa: "text-[15pt] leading-none tracking-[0.04em]",
      letterFa: "text-[12pt] leading-none",
      emblem: "w-4.5 h-4.5",
      provEn: "text-[9pt] leading-none tracking-wider",
      numEn: "text-[13.5pt] leading-none tracking-normal font-black",
      letterEn: "text-[11pt] leading-none font-black",
      bolt: "w-1.2 h-1.2",
    },
    md: {
      container: "w-[220px] h-[56px] px-3.5 py-1 rounded-[8px]",
      border: "border-[2.5px]",
      insetRim: "inset-[2.2px]",
      provFa: "text-[11.5pt] leading-none",
      numFa: "text-[16.5pt] leading-none tracking-[0.04em]",
      letterFa: "text-[13pt] leading-none",
      emblem: "w-5 h-5",
      provEn: "text-[9.5pt] leading-none tracking-wider",
      numEn: "text-[15pt] leading-none tracking-normal font-black",
      letterEn: "text-[12pt] leading-none font-black",
      bolt: "w-1.4 h-1.4",
    },
    lg: {
      container: "w-[264px] h-[66px] px-4 py-1.5 rounded-[9px]",
      border: "border-[2.8px]",
      insetRim: "inset-[2.5px]",
      provFa: "text-[13.5pt] leading-none",
      numFa: "text-[19.5pt] leading-none tracking-[0.05em]",
      letterFa: "text-[15.5pt] leading-none",
      emblem: "w-6 h-6",
      provEn: "text-[11.5pt] leading-none tracking-wider",
      numEn: "text-[18pt] leading-none tracking-normal font-black",
      letterEn: "text-[14.5pt] leading-none font-black",
      bolt: "w-1.6 h-1.6",
    },
    responsive: {
      container: "w-full max-w-[210px] aspect-[3.4/1] px-2.5 py-1 rounded-[7px]",
      border: "border-[2px]",
      insetRim: "inset-[2px]",
      provFa: "text-[clamp(8px,2.2vw,11.5px)] leading-none",
      numFa: "text-[clamp(11px,3.2vw,16.5px)] leading-none tracking-[0.04em]",
      letterFa: "text-[clamp(9px,2.5vw,13.5px)] leading-none",
      emblem: "w-[clamp(11px,2.2vw,18px)] h-[clamp(11px,2.2vw,18px)]",
      provEn: "text-[clamp(7px,1.8vw,10px)] leading-none tracking-wider",
      numEn: "text-[clamp(10.5px,3vw,15.5px)] leading-none font-black",
      letterEn: "text-[clamp(8px,2.2vw,12.5px)] leading-none font-black",
      bolt: "w-1 h-1",
    },
  }[size]

  return (
    <div
      data-afghan-plate="true"
      dir="ltr"
      className={`relative inline-flex flex-col justify-between shrink-0 select-none overflow-hidden ${sizeStyles.container} ${sizeStyles.border} border-[#181a20] bg-gradient-to-b from-[#fafaf7] via-[#f0efe9] to-[#e4e3db] text-slate-950 shadow-sm ${className}`}
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.12)",
        ...style,
      }}
      title={`Afghanistan Vehicle Registration Plate: ${data.provinceCode} ${data.number}${data.hasLetter ? ` ${data.letterEn}` : ""}`}
    >
      {/* Stamped plate inner debossed rim line */}
      <div
        className={`pointer-events-none absolute ${sizeStyles.insetRim} rounded-[inherit] border border-[#181a20]/25 shadow-[inset_0_0.5px_0_rgba(255,255,255,0.8),0_0.5px_0_rgba(255,255,255,0.5)]`}
        aria-hidden="true"
      />

      {/* Left Stamped Mounting Bolt */}
      {showBolts && (
        <div className="absolute left-[3px] top-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <PlateMountingBolt className={sizeStyles.bolt} />
        </div>
      )}

      {/* Right Stamped Mounting Bolt */}
      {showBolts && (
        <div className="absolute right-[3px] top-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <PlateMountingBolt className={sizeStyles.bolt} />
        </div>
      )}

      {/* Plate Content Grid: Exactly 2 rows and matching columns */}
      <div
        className={`relative z-10 grid ${
          data.hasLetter ? "grid-cols-[auto_1fr_auto]" : "grid-cols-[auto_1fr]"
        } grid-rows-2 h-full w-full items-center min-w-0 ${showBolts ? "px-1.5" : "px-0.5"}`}
      >
        {/* ROW 1 - CELL 1: Dari/Pashto Province Name (Left) */}
        <div className="flex items-center justify-start min-w-0 pr-1.5">
          <span
            dir="rtl"
            className={`font-[vazirmatn] font-black text-slate-950 truncate text-left leading-none ${sizeStyles.provFa}`}
            style={{ textShadow: "0 0.5px 0 rgba(255,255,255,0.9)" }}
          >
            {data.provinceFa}
          </span>
        </div>

        {/* ROW 1 - CELL 2: Eastern Arabic / Persian Numerals (Centered) */}
        <div className="flex items-center justify-center min-w-0">
          <span
            dir="ltr"
            style={{ direction: "ltr", unicodeBidi: "isolate", textShadow: "0 0.5px 0 rgba(255,255,255,0.9)" }}
            className={`font-[vazirmatn] font-black text-slate-950 text-center tabular-nums leading-none tracking-[0.03em] ${sizeStyles.numFa}`}
          >
            {data.numberFa}
          </span>
        </div>

        {/* ROW 1 - CELL 3: Persian Letter (Right, if available) */}
        {data.hasLetter && (
          <div className="flex items-center justify-end min-w-0 pl-1.5">
            <span
              dir="rtl"
              className={`font-[vazirmatn] font-black text-slate-950 text-right leading-none ${sizeStyles.letterFa}`}
              style={{ textShadow: "0 0.5px 0 rgba(255,255,255,0.9)" }}
            >
              {data.letterFa}
            </span>
          </div>
        )}

        {/* ROW 2 - CELL 1: Emblem + English/Latin Province Code (Left) */}
        <div className="flex items-center justify-start gap-1 min-w-0 pr-1.5">
          {showEmblem && (
            <div className="shrink-0 text-slate-800 flex items-center" aria-hidden="true">
              <AfghanNationalPlateEmblem className={sizeStyles.emblem} />
            </div>
          )}
          <span
            className={`font-mono font-black text-slate-950 uppercase tracking-wider leading-none ${sizeStyles.provEn}`}
            style={{ textShadow: "0 0.5px 0 rgba(255,255,255,0.9)" }}
          >
            {data.provinceCode}
          </span>
        </div>

        {/* ROW 2 - CELL 2: Latin Registration Digits (Centered directly below Persian Digits) */}
        <div className="flex items-center justify-center min-w-0">
          <span
            dir="ltr"
            style={{ direction: "ltr", unicodeBidi: "isolate", textShadow: "0 0.5px 0 rgba(255,255,255,0.9)" }}
            className={`font-mono font-black text-slate-950 tabular-nums text-center leading-none tracking-normal ${sizeStyles.numEn}`}
          >
            {data.number}
          </span>
        </div>

        {/* ROW 2 - CELL 3: Latin Letter (Right, if available) */}
        {data.hasLetter && (
          <div className="flex items-center justify-end min-w-0 pl-1.5">
            <span
              className={`font-mono font-black text-slate-950 uppercase text-right leading-none ${sizeStyles.letterEn}`}
              style={{ textShadow: "0 0.5px 0 rgba(255,255,255,0.9)" }}
            >
              {data.letterEn}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default AfghanTruckPlate
