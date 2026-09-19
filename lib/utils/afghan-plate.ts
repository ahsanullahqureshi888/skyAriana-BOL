/**
 * Afghanistan Vehicle License Plate Data and Parsing Utilities
 * Supports:
 * - Conversion between Latin and Eastern Arabic / Persian digits
 * - Mapping of all 34 Afghanistan provinces (Dari/Pashto spellings & 3-letter codes)
 * - Vehicle category classification letters (e.g. ل / L for Lorri / Truck)
 * - Dynamic string parsing for formats like "2877 کابل", "35974 کابل", "24345 کابل ل", "38663-HRT"
 */

export interface AfghanProvince {
  nameFa: string
  nameEn: string
  code: string
  aliases: string[]
}

/**
 * Official Afghanistan Provinces Configuration
 * Covers all 34 provinces of Afghanistan with English license plate codes & Dari/Pashto spellings.
 */
export const AFGHAN_PROVINCES: AfghanProvince[] = [
  { nameFa: "کابل", nameEn: "Kabul", code: "KBL", aliases: ["kabul", "kbl", "کابل"] },
  { nameFa: "هرات", nameEn: "Herat", code: "HRT", aliases: ["herat", "hrt", "هرات"] },
  { nameFa: "کندهار", nameEn: "Kandahar", code: "KDR", aliases: ["kandahar", "qandahar", "kdr", "کندهار", "قندهار"] },
  { nameFa: "بلخ", nameEn: "Balkh", code: "BLK", aliases: ["balkh", "mazar", "mazar-i-sharif", "blk", "بلخ", "مزار", "مزارشریف", "مزار شریف"] },
  { nameFa: "ننگرهار", nameEn: "Nangarhar", code: "NGR", aliases: ["nangarhar", "jalalabad", "ngr", "ننگرهار", "جلال آباد", "جلال اباد"] },
  { nameFa: "نیمروز", nameEn: "Nimroz", code: "NRZ", aliases: ["nimroz", "nimruz", "nrz", "nim", "نیمروز"] },
  { nameFa: "کندز", nameEn: "Kunduz", code: "KDZ", aliases: ["kunduz", "qonduz", "kdz", "کندز", "قندوز"] },
  { nameFa: "بادغیس", nameEn: "Badghis", code: "BDG", aliases: ["badghis", "bdg", "بادغیس"] },
  { nameFa: "هلمند", nameEn: "Helmand", code: "HLM", aliases: ["helmand", "hlm", "هلمند"] },
  { nameFa: "غزنی", nameEn: "Ghazni", code: "GZN", aliases: ["ghazni", "gzn", "غزنی", "غزنه"] },
  { nameFa: "فراه", nameEn: "Farah", code: "FRH", aliases: ["farah", "frh", "فراه"] },
  { nameFa: "فاریاب", nameEn: "Faryab", code: "FYB", aliases: ["faryab", "fyb", "فاریاب"] },
  { nameFa: "بدخشان", nameEn: "Badakhshan", code: "BDK", aliases: ["badakhshan", "bdk", "بدخشان"] },
  { nameFa: "تخار", nameEn: "Takhar", code: "TKH", aliases: ["takhar", "tkh", "تخار"] },
  { nameFa: "پروان", nameEn: "Parwan", code: "PRW", aliases: ["parwan", "prw", "پروان"] },
  { nameFa: "بغلان", nameEn: "Baghlan", code: "BGL", aliases: ["baghlan", "bgl", "بغلان"] },
  { nameFa: "پکتیا", nameEn: "Paktia", code: "PKT", aliases: ["paktia", "pkt", "پکتیا"] },
  { nameFa: "خوست", nameEn: "Khost", code: "KST", aliases: ["khost", "kst", "خوست"] },
  { nameFa: "لغمان", nameEn: "Laghman", code: "LGM", aliases: ["laghman", "lgm", "لغمان"] },
  { nameFa: "لوگر", nameEn: "Logar", code: "LGR", aliases: ["logar", "lgr", "لوگر"] },
  { nameFa: "زابل", nameEn: "Zabul", code: "ZBL", aliases: ["zabul", "zbl", "زابل"] },
  { nameFa: "جوزجان", nameEn: "Jowzjan", code: "JZJ", aliases: ["jowzjan", "jzj", "جوزجان"] },
  { nameFa: "سرپل", nameEn: "Sar-e Pol", code: "SRP", aliases: ["sar-e pol", "saripul", "srp", "سرپل"] },
  { nameFa: "سمنگان", nameEn: "Samangan", code: "SMG", aliases: ["samangan", "smg", "سمنگان"] },
  { nameFa: "دایکندی", nameEn: "Daykundi", code: "DYK", aliases: ["daykundi", "dyk", "دایکندی"] },
  { nameFa: "بامیان", nameEn: "Bamyan", code: "BMY", aliases: ["bamyan", "bmy", "بامیان"] },
  { nameFa: "غور", nameEn: "Ghor", code: "GHR", aliases: ["ghor", "ghr", "غور"] },
  { nameFa: "ارزگان", nameEn: "Uruzgan", code: "URG", aliases: ["uruzgan", "urg", "ارزگان", "اوروزگان"] },
  { nameFa: "پکتیکا", nameEn: "Paktika", code: "PKG", aliases: ["paktika", "pkg", "پکتیکا"] },
  { nameFa: "پنجشیر", nameEn: "Panjshir", code: "PJR", aliases: ["panjshir", "pjr", "پنجشیر"] },
  { nameFa: "کاپیسا", nameEn: "Kapisa", code: "KPS", aliases: ["kapisa", "kps", "کاپیسا"] },
  { nameFa: "نورستان", nameEn: "Nuristan", code: "NRT", aliases: ["nuristan", "nrt", "نورستان"] },
  { nameFa: "کنر", nameEn: "Kunar", code: "KNR", aliases: ["kunar", "knr", "کنر"] },
  { nameFa: "وردک", nameEn: "Wardak", code: "WDK", aliases: ["wardak", "wdk", "وردک", "میدان وردک"] },
]

/**
 * Official Afghanistan Vehicle Category Letters
 * ل (Lorri / Truck / Commercial) -> L
 * ش (Personal / Shakhsi) -> P or S
 * ت (Taxi) -> T
 * etc.
 */
export const AFGHAN_PLATE_LETTERS: Record<string, { fa: string; en: string }> = {
  "ل": { fa: "ل", en: "L" },
  "L": { fa: "ل", en: "L" },
  "l": { fa: "ل", en: "L" },
  "ش": { fa: "ش", en: "P" },
  "P": { fa: "ش", en: "P" },
  "p": { fa: "ش", en: "P" },
  "S": { fa: "ش", en: "S" },
  "s": { fa: "ش", en: "S" },
  "ت": { fa: "ت", en: "T" },
  "T": { fa: "ت", en: "T" },
  "t": { fa: "ت", en: "T" },
  "ب": { fa: "ب", en: "B" },
  "B": { fa: "ب", en: "B" },
  "b": { fa: "ب", en: "B" },
  "د": { fa: "د", en: "D" },
  "D": { fa: "د", en: "D" },
  "d": { fa: "د", en: "D" },
  "م": { fa: "م", en: "M" },
  "M": { fa: "م", en: "M" },
  "m": { fa: "م", en: "M" },
  "ک": { fa: "ک", en: "C" },
  "C": { fa: "ک", en: "C" },
  "c": { fa: "ک", en: "C" },
}

/**
 * Convert standard Latin digits (0-9) to Eastern Arabic/Persian digits (۰-۹).
 */
export function convertToPersianDigits(input: string | number): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]
  return String(input).replace(/[0-9]/g, (digit) => persianDigits[parseInt(digit, 10)])
}

/**
 * Convert Eastern Arabic/Persian digits (۰-۹) or Arabic-Indic digits (٠-٩) to Latin (0-9).
 */
export function convertToLatinDigits(input: string): string {
  return input
    .replace(/[۰٠]/g, "0")
    .replace(/[۱١]/g, "1")
    .replace(/[۲٢]/g, "2")
    .replace(/[۳٣]/g, "3")
    .replace(/[۴٤]/g, "4")
    .replace(/[۵٥]/g, "5")
    .replace(/[۶٦]/g, "6")
    .replace(/[۷٧]/g, "7")
    .replace(/[۸٨]/g, "8")
    .replace(/[۹٩]/g, "9")
}

/**
 * Lookup province info from name or code.
 */
export function getProvinceInfo(nameOrCode?: string): AfghanProvince {
  if (!nameOrCode || !nameOrCode.trim()) {
    return { nameFa: "کابل", nameEn: "Kabul", code: "KBL", aliases: ["kabul", "kbl", "کابل"] }
  }

  const query = nameOrCode.trim().toLowerCase()

  for (const prov of AFGHAN_PROVINCES) {
    if (
      prov.code.toLowerCase() === query ||
      prov.nameFa === query ||
      prov.nameEn.toLowerCase() === query ||
      prov.aliases.some((alias) => alias.toLowerCase() === query)
    ) {
      return prov
    }
  }

  // Exact word boundary match in substring
  for (const prov of AFGHAN_PROVINCES) {
    if (query.includes(prov.nameFa) || query.includes(prov.code.toLowerCase())) {
      return prov
    }
    if (prov.aliases.some((alias) => query.includes(alias.toLowerCase()))) {
      return prov
    }
  }

  // Clean fallback preserving original string if custom
  return {
    nameFa: nameOrCode.trim(),
    nameEn: nameOrCode.trim().toUpperCase(),
    code: nameOrCode.trim().slice(0, 3).toUpperCase(),
    aliases: [],
  }
}

/**
 * Get 3-letter province code from province name or code.
 */
export function getProvinceCode(nameOrCode?: string): string {
  return getProvinceInfo(nameOrCode).code
}

/**
 * Get normalized Persian/Dari province name from province name or code.
 */
export function normalizeProvinceName(nameOrCode?: string): string {
  return getProvinceInfo(nameOrCode).nameFa
}

export interface ParsedAfghanPlate {
  plateNumber: string
  plateNumberFa: string
  provinceFa: string
  provinceEn: string
  provinceCode: string
  plateLetterFa: string
  plateLetterEn: string
  hasLetter: boolean
}

/**
 * Parse an Afghan plate string into its constituent parts:
 * Examples handled:
 * - "2877 کابل" -> number: 2877, prov: کابل / KBL
 * - "35974 کابل" -> number: 35974, prov: کابل / KBL
 * - "24345 کابل ل" -> number: 24345, prov: کابل / KBL, letter: ل / L
 * - "24345 کابل - ل" -> number: 24345, prov: کابل / KBL, letter: ل / L
 * - "AF-1234-KBL" -> number: 1234, prov: کابل / KBL
 * - "38663-HRT" -> number: 38663, prov: هرات / HRT
 * - "71731کابل" -> number: 71731, prov: کابل / KBL
 * - "هرات 21723" -> number: 21723, prov: هرات / HRT
 */
export function parseAfghanPlate(input?: string): ParsedAfghanPlate {
  if (!input || !input.trim()) {
    return {
      plateNumber: "—",
      plateNumberFa: "—",
      provinceFa: "کابل",
      provinceEn: "Kabul",
      provinceCode: "KBL",
      plateLetterFa: "",
      plateLetterEn: "",
      hasLetter: false,
    }
  }

  const raw = input.trim()
  const latinClean = convertToLatinDigits(raw)

  // 1. Extract the primary registration digits
  const digitMatch = latinClean.match(/\d+/)
  const plateNumber = digitMatch ? digitMatch[0] : ""
  const plateNumberFa = plateNumber ? convertToPersianDigits(plateNumber) : ""

  // 2. Split remainder into distinct tokens by whitespace and common punctuation
  const remainingStr = latinClean.replace(plateNumber, " ")
  const tokens = remainingStr
    .split(/[\s\-_/:,.]+/)
    .map((t) => t.trim())
    .filter((t) => Boolean(t) && t.toUpperCase() !== "AF")

  let matchedProvince: AfghanProvince | null = null
  let letterFa = ""
  let letterEn = ""

  // 3. First identify if any token is a known Afghan province
  const provinceTokens: string[] = []
  const nonProvinceTokens: string[] = []

  for (const token of tokens) {
    const isProv = AFGHAN_PROVINCES.find(
      (p) =>
        p.code.toLowerCase() === token.toLowerCase() ||
        p.nameFa === token ||
        p.nameEn.toLowerCase() === token.toLowerCase() ||
        p.aliases.some((a) => a.toLowerCase() === token.toLowerCase())
    )

    if (isProv && !matchedProvince) {
      matchedProvince = isProv
      provinceTokens.push(token)
    } else {
      nonProvinceTokens.push(token)
    }
  }

  // Fallback: If no single token matched, test compound phrase (e.g. "مزار شریف")
  if (!matchedProvince && tokens.length > 0) {
    const joined = tokens.join(" ")
    matchedProvince = getProvinceInfo(joined)
  }

  // Fallback province if still empty
  if (!matchedProvince) {
    matchedProvince = getProvinceInfo(raw)
  }

  // 4. Now search remaining non-province tokens for plate letter
  for (const token of nonProvinceTokens) {
    if (AFGHAN_PLATE_LETTERS[token]) {
      letterFa = AFGHAN_PLATE_LETTERS[token].fa
      letterEn = AFGHAN_PLATE_LETTERS[token].en
      break
    }
  }

  return {
    plateNumber: plateNumber || raw,
    plateNumberFa: plateNumberFa || convertToPersianDigits(raw),
    provinceFa: matchedProvince.nameFa,
    provinceEn: matchedProvince.nameEn,
    provinceCode: matchedProvince.code,
    plateLetterFa: letterFa,
    plateLetterEn: letterEn,
    hasLetter: Boolean(letterFa && letterEn),
  }
}
