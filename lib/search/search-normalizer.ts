/**
 * High-Precision Search Normalizer & Pattern Detector
 * Sky Ariana Multi-Modal Logistics & Financial Suite
 */

/**
 * Normalizes a general search query string:
 * - Trims edges
 * - Collapses multiple spaces
 * - Lowercases for case-insensitive matching
 */
export function normalizeSearchQuery(query: string): string {
  if (!query) return ""
  return query.trim().replace(/\s+/g, " ").toLowerCase()
}

/**
 * Normalizes Persian / Dari / Pashto Unicode characters:
 * - Unifies Arabic Yeh (ي), Farsi Yeh (ی), and Pashto variations
 * - Unifies Arabic Kaf (ك) and Persian Keheh (ک)
 * - Removes zero-width non-joiner (ZWNJ / \u200c) for search matching
 * - Converts Arabic-Indic and Eastern-Arabic numerals (۰-۹ / ٠-٩) to standard ASCII 0-9
 */
export function normalizePersianPashto(str: string): string {
  if (!str) return ""
  return str
    .replace(/[\u200B-\u200D\uFEFF]/g, " ") // Normalize zero-width joiners/spaces to single space
    .replace(/[يى]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/[ة]/g, "ه")
    .replace(/[ؤ]/g, "و")
    .replace(/[إأآ]/g, "ا")
    // Convert Arabic & Persian digits to standard digits
    .replace(/[٠۰]/g, "0")
    .replace(/[١۱]/g, "1")
    .replace(/[٢۲]/g, "2")
    .replace(/[٣۳]/g, "3")
    .replace(/[٤۴]/g, "4")
    .replace(/[٥۵]/g, "5")
    .replace(/[٦۶]/g, "6")
    .replace(/[٧۷]/g, "7")
    .replace(/[٨۸]/g, "8")
    .replace(/[٩۹]/g, "9")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Normalizes a phone number to standard digit format.
 * Automatically aligns local Afghan numbers (e.g. 0700308086)
 * with international format (+93700308086 or 93700308086).
 * Returns both the raw stripped digits and the standard national/international representations.
 */
export function normalizePhone(phone: string): {
  digits: string
  normalized: string
  national: string
} {
  if (!phone) return { digits: "", normalized: "", national: "" }

  const converted = normalizePersianPashto(phone)
  const digits = converted.replace(/\D/g, "")
  if (!digits) return { digits: "", normalized: "", national: "" }

  let national = digits
  let international = digits

  // Afghan phone number handling:
  // Country code 93, mobile prefixes 70, 71, 72, 73, 74, 76, 77, 78, 79
  if (digits.startsWith("93") && digits.length >= 11) {
    national = "0" + digits.slice(2)
    international = "+" + digits
  } else if (digits.startsWith("0093") && digits.length >= 13) {
    national = "0" + digits.slice(4)
    international = "+" + digits.slice(2)
  } else if (digits.startsWith("07") && digits.length === 10) {
    national = digits
    international = "+93" + digits.slice(1)
  } else if (digits.startsWith("7") && digits.length === 9) {
    national = "0" + digits
    international = "+93" + digits
  } else if (converted.startsWith("+")) {
    international = "+" + digits
  }

  return {
    digits,
    normalized: international,
    national,
  }
}

/**
 * Checks if two phone numbers match, accounting for local vs international prefix.
 */
export function matchPhones(phoneA: string, phoneB: string): boolean {
  if (!phoneA || !phoneB) return false
  const pA = normalizePhone(phoneA)
  const pB = normalizePhone(phoneB)

  if (!pA.digits || !pB.digits) return false
  if (pA.digits === pB.digits) return true
  if (pA.normalized === pB.normalized) return true
  if (pA.national === pB.national) return true

  // Match if last 9 digits are identical
  const last9A = pA.digits.slice(-9)
  const last9B = pB.digits.slice(-9)
  return last9A.length >= 8 && last9A === last9B
}

/**
 * Preserves identifier characters without making distinct identifiers falsely equal.
 * Keeps standard delimiters (*, /, -) while normalizing case and whitespace.
 */
export function normalizeIdentifier(id: string): string {
  if (!id) return ""
  return id
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
}

/**
 * Detects if a search query looks like an ISO container number (e.g. TCLU1234567, HLXU870056-9).
 * Standard: 4 letters (owner code + category U/J/Z) + 6-7 digits.
 */
export function isContainerNumber(query: string): boolean {
  if (!query) return false
  const clean = query.trim().toUpperCase().replace(/[\s\-\/]/g, "")
  return /^[A-Z]{4}\d{6,7}$/.test(clean)
}

/**
 * Detects if a search query looks like a BOL reference.
 * e.g. SKY-BOL-2026-00125, SA-BL-2026-0001, SCLJEANSA02230, FULBNDNSA25000677
 */
export function isBolNumber(query: string): boolean {
  if (!query) return false
  const clean = query.trim().toUpperCase()
  if (/^(?:SKY|SA)?[\-_]?BOL[\-_]?\d+/i.test(clean)) return true
  if (/^SA[\-_]BL[\-_]?\d+/i.test(clean)) return true
  if (/^[A-Z]{3,6}[\-_]?[A-Z0-9]{3,}[\-_]?\d{3,}$/i.test(clean)) return true
  return false
}

/**
 * Detects if a query looks like an invoice reference (e.g. INV-2026-00125, SA-INV-..., IN NO. 002).
 */
export function isInvoiceNumber(query: string): boolean {
  if (!query) return false
  const clean = query.trim().toUpperCase()
  return /^(?:SA[\-_])?INV[\-_]?\d+/i.test(clean) || /^IN\s*NO[\.:]?\s*\d+/i.test(clean)
}

/**
 * Detects if a query looks like an official trade document sequence
 * (CI-..., PL-..., TP-..., PHY-DRAFT-...).
 */
export function isDocumentNumber(query: string): boolean {
  if (!query) return false
  const clean = query.trim().toUpperCase()
  return /^(?:CI|PL|TP|PHY(?:[\-_]DRAFT)?)[\-_](?:\d{4}[\-_])?\d+/i.test(clean)
}

/**
 * Detects if a query is a phone number search.
 */
export function isPhoneNumber(query: string): boolean {
  if (!query) return false
  const stripped = query.replace(/[\s\-\(\)\+\.]/g, "")
  return /^\d{7,15}$/.test(stripped)
}

/**
 * Calculates Dice coefficient similarity between two strings using bigrams.
 * Conservative scoring (0.0 to 1.0).
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeSearchQuery(normalizePersianPashto(str1))
  const s2 = normalizeSearchQuery(normalizePersianPashto(str2))

  if (s1 === s2) return 1.0
  if (s1.length < 2 || s2.length < 2) return 0.0

  const getBigrams = (str: string) => {
    const bigrams = new Set<string>()
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2))
    }
    return bigrams
  }

  const b1 = getBigrams(s1)
  const b2 = getBigrams(s2)
  let intersection = 0
  for (const item of b1) {
    if (b2.has(item)) intersection++
  }

  return (2.0 * intersection) / (b1.size + b2.size)
}

/**
 * Normalizes company names for deduplication and alias matching.
 * Strips common corporate and freight suffixes (LLC, LTD, TRANSPORT, etc.)
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return ""
  let cleaned = normalizePersianPashto(name).toLowerCase().trim()

  // Collapse dots inside acronyms
  cleaned = cleaned.replace(/\.(?=\s|$|[a-z])/g, "")
  // Replace delimiters with spaces
  cleaned = cleaned.replace(/[\,\-\_\&\/\(\)\#\@\+\:]+/g, " ")

  const commonSuffixes = [
    "llc", "ltd", "limited", "inc", "corp", "corporation",
    "co", "company", "fze", "fzco", "transport", "logistics",
    "cargo", "shipping", "general trading", "trading", "لمیتد", "شرکت"
  ]

  const tokens = cleaned.split(/\s+/).filter(Boolean)
  const filtered = tokens.filter((tok) => {
    if (tokens.length === 1) return true
    return !commonSuffixes.includes(tok)
  })

  return (filtered.length > 0 ? filtered : tokens).join(" ").trim()
}
