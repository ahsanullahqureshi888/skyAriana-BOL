/**
 * Sky Ariana Logistics — Duplicate Prevention & Entity Normalization Engine
 *
 * Implements strict canonical normalization and fuzzy candidate detection for:
 * - Company / Trader names (Shippers, Consignees, Notify Parties)
 * - Container serials (ISO 6346 standard)
 * - Bill of Lading & Invoice reference numbers
 */

// Corporate and legal entity suffixes to strip for canonical comparison
const LEGAL_SUFFIXES = [
  "limited",
  "ltd",
  "l.t.d",
  "l t d",
  "llc",
  "l.l.c",
  "l l c",
  "inc",
  "inc.",
  "incorporated",
  "corp",
  "corp.",
  "corporation",
  "co",
  "co.",
  "company",
  "trading",
  "pvt",
  "pvt.",
  "private",
  "plc",
  "p.l.c",
  "gmbh",
  "s.a",
  "sa",
  // Dari / Pashto suffixes
  "لمیتد",
  "شرکت تجارتی",
  "تجارتی",
  "شرکت",
  "مسئولیت محدود",
  "تضامنی",
  "سهامی خاص",
  "سهامی عام",
]

/**
 * Normalizes a company name into its canonical core format.
 *
 * Examples:
 * - "NAJEB AMIN LTD" -> "najeb amin"
 * - "Najeb Amin Ltd." -> "najeb amin"
 * - "NAJEB AMIN L.T.D" -> "najeb amin"
 * - "Haji Najeb Amin Trading Co." -> "najeb amin"
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return ""

  let cleaned = name
    // Normalize Persian/Arabic characters
    .replace(/\u064A/g, "\u06CC") // Arabic Yeh to Persian Yeh
    .replace(/\u0643/g, "\u06A9") // Arabic Kaf to Persian Keheh
    .replace(/\u0629/g, "\u0647") // Teh Marbuta to Heh
    .replace(/\u200C/g, " ") // Zero-width non-joiner to space
    .toLowerCase()

  // Remove common prefixes like "Haji", "حاجی", "Sherkat", "شرکت", "شرکت تجارتی"
  cleaned = cleaned
    .replace(/^(?:haji|haj|al-haj|حاجی|الحاج)\s+/gi, "")
    .replace(/^(?:sherkat-e\s+tejarati|sherkat\s+tejarati|شرکت\s+تجارتی|sherkat-e\s+bazargani|شرکت\s+بازرگانی|sherkat-e|sherkat|شرکت)\s+/gi, "")
    .replace(/^(?:tejarati|تجارتی|bazargani|بازرگانی)\s+/gi, "")

  // Compact dotted acronyms like L.T.D or L.L.C or P.V.T to single tokens before removing dots
  cleaned = cleaned
    .replace(/\b([a-z\u0600-\u06FF])\s*\.\s*([a-z\u0600-\u06FF])\s*\.\s*([a-z\u0600-\u06FF])\b/gi, "$1$2$3")
    .replace(/\b([a-z\u0600-\u06FF])\s*\.\s*([a-z\u0600-\u06FF])\b/gi, "$1$2")

  // Remove punctuation (periods, commas, hyphens, slashes, quotes, parens)
  cleaned = cleaned.replace(/[.,\-_/\\'"()[\]{}*&^%$#@!+=~`|:;<>?]/g, " ")

  // Remove legal suffixes iteratively
  let words = cleaned.trim().split(/\s+/).filter(Boolean)

  while (words.length > 1) {
    const lastWord = words[words.length - 1]
    const lastTwoWords = words.slice(-2).join(" ")
    const lastThreeWords = words.slice(-3).join(" ")

    if (LEGAL_SUFFIXES.includes(lastThreeWords)) {
      words = words.slice(0, -3)
    } else if (LEGAL_SUFFIXES.includes(lastTwoWords)) {
      words = words.slice(0, -2)
    } else if (LEGAL_SUFFIXES.includes(lastWord)) {
      words = words.slice(0, -1)
    } else {
      break
    }
  }

  return words.join(" ").trim()
}

/**
 * Calculates Levenshtein edit distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Calculates normalized string similarity score between 0.0 and 1.0
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeCompanyName(str1)
  const norm2 = normalizeCompanyName(str2)

  if (!norm1 || !norm2) return 0
  if (norm1 === norm2) return 1.0

  // Substring inclusion
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const minLen = Math.min(norm1.length, norm2.length)
    const maxLen = Math.max(norm1.length, norm2.length)
    return minLen / maxLen > 0.6 ? 0.9 : 0.75
  }

  // Edit distance ratio
  const maxLen = Math.max(norm1.length, norm2.length)
  const dist = levenshteinDistance(norm1, norm2)
  return Math.max(0, 1 - dist / maxLen)
}

export interface DuplicateCandidate {
  id: string
  name: string
  similarity: number
  matchedCanonical: string
  reason: "exact_normalized" | "high_similarity" | "substring_match"
}

/**
 * Scans a party list for potential duplicate entries without automatically merging them.
 */
export function findDuplicatePartyCandidates(
  targetName: string,
  existingParties: { id: string; name: string }[],
  threshold = 0.82
): DuplicateCandidate[] {
  if (!targetName || !targetName.trim()) return []

  const targetNorm = normalizeCompanyName(targetName)
  if (!targetNorm) return []

  const candidates: DuplicateCandidate[] = []

  for (const party of existingParties) {
    if (!party.name) continue
    const candidateNorm = normalizeCompanyName(party.name)

    if (targetNorm === candidateNorm) {
      candidates.push({
        id: party.id,
        name: party.name,
        similarity: 1.0,
        matchedCanonical: candidateNorm,
        reason: "exact_normalized",
      })
      continue
    }

    const similarity = calculateSimilarity(targetName, party.name)
    if (similarity >= threshold) {
      candidates.push({
        id: party.id,
        name: party.name,
        similarity: Math.round(similarity * 100) / 100,
        matchedCanonical: candidateNorm,
        reason: similarity >= 0.9 ? "high_similarity" : "substring_match",
      })
    }
  }

  return candidates.sort((a, b) => b.similarity - a.similarity)
}

/**
 * Normalizes container number: standard ISO 6346 (4 letters + 7 digits)
 */
export function normalizeContainerNumber(containerNo: string): string {
  if (!containerNo) return ""
  return containerNo
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim()
}

/**
 * Normalizes Bill of Lading reference number
 */
export function normalizeBolNumber(bolNo: string): string {
  if (!bolNo) return ""
  return bolNo
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
}

/**
 * Checks for identifier collision across an existing list
 */
export function checkDuplicateIdentifier(
  type: "bol" | "container" | "invoice",
  value: string,
  existingList: string[]
): { isDuplicate: boolean; matchedWith?: string } {
  if (!value || !value.trim()) return { isDuplicate: false }

  let normValue = value.trim()
  if (type === "container") normValue = normalizeContainerNumber(value)
  else if (type === "bol") normValue = normalizeBolNumber(value)
  else normValue = value.toUpperCase().replace(/[\s_-]+/g, "")

  for (const existing of existingList) {
    let existingNorm = (existing || "").trim()
    if (type === "container") existingNorm = normalizeContainerNumber(existing)
    else if (type === "bol") existingNorm = normalizeBolNumber(existing)
    else existingNorm = existingNorm.toUpperCase().replace(/[\s_-]+/g, "")

    if (normValue === existingNorm && normValue.length > 0) {
      return { isDuplicate: true, matchedWith: existing }
    }
  }

  return { isDuplicate: false }
}
