/**
 * Comprehensive Pashto, Dari & Arabic Cursive Glyph Reshaper and BiDi Processor
 * Optimized for jsPDF, PDF Canvas, and Print Engines.
 * 
 * Supports full Afghan Pashto alphabet (ځ, څ, ډ, ړ, ږ, ښ, ڼ, ې, ۍ, ۀ),
 * Persian/Dari extensions (پ, چ, ژ, گ, ک, ی), Lam-Alef ligatures,
 * and mixed bidirectional English/Numbers/RTL layout.
 */

// Joining types:
// 0: Non-joining
// 1: Right-joining (joins with previous letter, does not join with next)
// 2: Dual-joining (joins with both previous and next letters)

interface GlyphMapping {
  isolated: string
  final: string
  initial: string
  medial: string
  joining: 0 | 1 | 2
}

const GLYPH_TABLE: Record<string, GlyphMapping> = {
  // --- Standard Arabic Alphabet ---
  "\u0621": { isolated: "\uFE80", final: "\uFE80", initial: "\uFE80", medial: "\uFE80", joining: 0 }, // Hamza
  "\u0622": { isolated: "\uFE81", final: "\uFE82", initial: "\uFE81", medial: "\uFE82", joining: 1 }, // Alef with Madda
  "\u0623": { isolated: "\uFE83", final: "\uFE84", initial: "\uFE83", medial: "\uFE84", joining: 1 }, // Alef with Hamza above
  "\u0624": { isolated: "\uFE85", final: "\uFE86", initial: "\uFE85", medial: "\uFE86", joining: 1 }, // Waw with Hamza
  "\u0625": { isolated: "\uFE87", final: "\uFE88", initial: "\uFE87", medial: "\uFE88", joining: 1 }, // Alef with Hamza below
  "\u0626": { isolated: "\uFE89", final: "\uFE8A", initial: "\uFE8B", medial: "\uFE8C", joining: 2 }, // Yeh with Hamza
  "\u0627": { isolated: "\uFE8D", final: "\uFE8E", initial: "\uFE8D", medial: "\uFE8E", joining: 1 }, // Alef
  "\u0628": { isolated: "\uFE8F", final: "\uFE90", initial: "\uFE91", medial: "\uFE92", joining: 2 }, // Beh
  "\u0629": { isolated: "\uFE93", final: "\uFE94", initial: "\uFE93", medial: "\uFE94", joining: 1 }, // Teh Marbuta
  "\u062A": { isolated: "\uFE95", final: "\uFE96", initial: "\uFE97", medial: "\uFE98", joining: 2 }, // Teh
  "\u062B": { isolated: "\uFE99", final: "\uFE9A", initial: "\uFE9B", medial: "\uFE9C", joining: 2 }, // Theh
  "\u062C": { isolated: "\uFE9D", final: "\uFE9E", initial: "\uFE9F", medial: "\uFEA0", joining: 2 }, // Jeem
  "\u062D": { isolated: "\uFEA1", final: "\uFEA2", initial: "\uFEA3", medial: "\uFEA4", joining: 2 }, // Hah
  "\u062E": { isolated: "\uFEA5", final: "\uFEA6", initial: "\uFEA7", medial: "\uFEA8", joining: 2 }, // Khah
  "\u062F": { isolated: "\uFEA9", final: "\uFEAA", initial: "\uFEA9", medial: "\uFEAA", joining: 1 }, // Dal
  "\u0630": { isolated: "\uFEAB", final: "\uFEAC", initial: "\uFEAB", medial: "\uFEAC", joining: 1 }, // Thal
  "\u0631": { isolated: "\uFEAD", final: "\uFEAE", initial: "\uFEAD", medial: "\uFEAE", joining: 1 }, // Reh
  "\u0632": { isolated: "\uFEAF", final: "\uFEB0", initial: "\uFEAF", medial: "\uFEB0", joining: 1 }, // Zain
  "\u0633": { isolated: "\uFEB1", final: "\uFEB2", initial: "\uFEB3", medial: "\uFEB4", joining: 2 }, // Seen
  "\u0634": { isolated: "\uFEB5", final: "\uFEB6", initial: "\uFEB7", medial: "\uFEB8", joining: 2 }, // Sheen
  "\u0635": { isolated: "\uFEB9", final: "\uFEBA", initial: "\uFEBB", medial: "\uFEBC", joining: 2 }, // Sad
  "\u0636": { isolated: "\uFEBD", final: "\uFEBE", initial: "\uFEBF", medial: "\uFEC0", joining: 2 }, // Dad
  "\u0637": { isolated: "\uFEC1", final: "\uFEC2", initial: "\uFEC3", medial: "\uFEC4", joining: 2 }, // Tah
  "\u0638": { isolated: "\uFEC5", final: "\uFEC6", initial: "\uFEC7", medial: "\uFEC8", joining: 2 }, // Zah
  "\u0639": { isolated: "\uFEC9", final: "\uFECA", initial: "\uFECB", medial: "\uFECC", joining: 2 }, // Ain
  "\u063A": { isolated: "\uFECD", final: "\uFECE", initial: "\uFECF", medial: "\uFED0", joining: 2 }, // Ghain
  "\u0641": { isolated: "\uFED1", final: "\uFED2", initial: "\uFED3", medial: "\uFED4", joining: 2 }, // Feh
  "\u0642": { isolated: "\uFED5", final: "\uFED6", initial: "\uFED7", medial: "\uFED8", joining: 2 }, // Qaf
  "\u0643": { isolated: "\uFED9", final: "\uFEDA", initial: "\uFEDB", medial: "\uFEDC", joining: 2 }, // Arabic Kaf
  "\u0644": { isolated: "\uFEDD", final: "\uFEDE", initial: "\uFEDF", medial: "\uFEE0", joining: 2 }, // Lam
  "\u0645": { isolated: "\uFEE1", final: "\uFEE2", initial: "\uFEE3", medial: "\uFEE4", joining: 2 }, // Meem
  "\u0646": { isolated: "\uFEE5", final: "\uFEE6", initial: "\uFEE7", medial: "\uFEE8", joining: 2 }, // Noon
  "\u0647": { isolated: "\uFEE9", final: "\uFEEA", initial: "\uFEEB", medial: "\uFEEC", joining: 2 }, // Heh
  "\u0648": { isolated: "\uFEED", final: "\uFEEE", initial: "\uFEED", medial: "\uFEEE", joining: 1 }, // Waw
  "\u0649": { isolated: "\uFEEF", final: "\uFEF0", initial: "\uFE8B", medial: "\uFE8C", joining: 2 }, // Alef Maksura
  "\u064A": { isolated: "\uFEF1", final: "\uFEF2", initial: "\uFEF3", medial: "\uFEF4", joining: 2 }, // Arabic Yeh

  // --- Persian & Dari Extensions ---
  "\u067E": { isolated: "\uFB56", final: "\uFB57", initial: "\uFB58", medial: "\uFB59", joining: 2 }, // Peh (پ)
  "\u0686": { isolated: "\uFB7A", final: "\uFB7B", initial: "\uFB7C", medial: "\uFB7D", joining: 2 }, // Tcheh (چ)
  "\u0698": { isolated: "\uFB8A", final: "\uFB8B", initial: "\uFB8A", medial: "\uFB8B", joining: 1 }, // Zheh (ژ)
  "\u06A9": { isolated: "\uFB8E", final: "\uFB8F", initial: "\uFB90", medial: "\uFB91", joining: 2 }, // Keheh / Farsi Kaf (ک)
  "\u06AF": { isolated: "\uFB92", final: "\uFB93", initial: "\uFB94", medial: "\uFB95", joining: 2 }, // Gaf (گ)
  "\u06CC": { isolated: "\uFBFC", final: "\uFBFD", initial: "\uFBFE", medial: "\uFBFF", joining: 2 }, // Farsi Yeh (ی)

  // --- Pashto-Specific Letters ---
  // ځ (Dzeh)
  "\u0681": { isolated: "\u0681", final: "\u0681", initial: "\u0681", medial: "\u0681", joining: 2 },
  // څ (Tse)
  "\u0685": { isolated: "\u0685", final: "\u0685", initial: "\u0685", medial: "\u0685", joining: 2 },
  // ډ (Pashto Dal)
  "\u0688": { isolated: "\uFB88", final: "\uFB89", initial: "\uFB88", medial: "\uFB89", joining: 1 },
  // ړ (Pashto Reh)
  "\u0693": { isolated: "\uFB8C", final: "\uFB8D", initial: "\uFB8C", medial: "\uFB8D", joining: 1 },
  // ږ (Pashto Zhe / Ge)
  "\u0696": { isolated: "\u0696", final: "\u0696", initial: "\u0696", medial: "\u0696", joining: 1 },
  // ښ (Pashto Seen / Xeh)
  "\u069A": { isolated: "\u069A", final: "\u069A", initial: "\u069A", medial: "\u069A", joining: 2 },
  // ڼ (Pashto Noon with ring)
  "\u06BC": { isolated: "\uFBD9", final: "\uFBDA", initial: "\uFBDB", medial: "\uFBDC", joining: 2 },
  // ې (Pashto Yeh with 2 vertical dots)
  "\u06D0": { isolated: "\uFBE4", final: "\uFBE5", initial: "\uFBE6", medial: "\uFBE7", joining: 2 },
  // ۍ (Pashto Yeh with tail)
  "\u06CD": { isolated: "\uFBE2", final: "\uFBE3", initial: "\uFBE2", medial: "\uFBE3", joining: 1 },
  // ۀ (Pashto Heh with yeh)
  "\u06C0": { isolated: "\uFBA4", final: "\uFBA5", initial: "\uFBA4", medial: "\uFBA5", joining: 1 },
  // ئ (Yeh with Hamza)
  "\u06D2": { isolated: "\uFBAE", final: "\uFBAF", initial: "\uFBAE", medial: "\uFBAF", joining: 1 },
}

// Lam-Alef Ligature combinations
const LAM_ALEF_MAP: Record<string, { isolated: string; final: string }> = {
  "\u0622": { isolated: "\uFEF5", final: "\uFEF6" }, // Lam + Alef with Madda
  "\u0623": { isolated: "\uFEF7", final: "\uFEF8" }, // Lam + Alef with Hamza above
  "\u0625": { isolated: "\uFEF9", final: "\uFEFA" }, // Lam + Alef with Hamza below
  "\u0627": { isolated: "\uFEFB", final: "\uFEFC" }, // Lam + Plain Alef
}

// Arabic diacritics / Tashkeel
const TASHKEEL_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED]/

export function isPashtoOrArabic(value: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(value)
}

/**
 * Reshapes an individual cursive word of Arabic/Pashto text into its
 * contextual glyph forms (initial, medial, final, isolated) and Lam-Alef ligatures.
 */
export function reshapeCursiveWord(word: string): string {
  if (!word || !isPashtoOrArabic(word)) return word

  const chars: string[] = []
  // Strip or preserve characters
  for (let i = 0; i < word.length; i++) {
    chars.push(word[i])
  }

  const result: string[] = []
  let prevJoining = false

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const mapping = GLYPH_TABLE[ch]

    if (!mapping) {
      result.push(ch)
      prevJoining = false
      continue
    }

    // Check for Lam-Alef ligature
    if (ch === "\u0644" && i + 1 < chars.length) {
      const nextCh = chars[i + 1]
      const ligature = LAM_ALEF_MAP[nextCh]
      if (ligature) {
        result.push(prevJoining ? ligature.final : ligature.isolated)
        prevJoining = false
        i++ // Skip the Alef
        continue
      }
    }

    // Determine if next character can connect from the right
    let nextConnects = false
    if (i + 1 < chars.length) {
      const nextChar = chars[i + 1]
      const nextMapping = GLYPH_TABLE[nextChar]
      if (nextMapping && (nextMapping.joining === 1 || nextMapping.joining === 2)) {
        nextConnects = true
      }
    }

    // Determine which positional form to use
    if (mapping.joining === 0) {
      result.push(mapping.isolated)
      prevJoining = false
    } else if (mapping.joining === 1) {
      // Right-joining only (Alef, Dal, Reh, Waw, etc.)
      result.push(prevJoining ? mapping.final : mapping.isolated)
      prevJoining = false
    } else {
      // Dual-joining (Beh, Seen, Lam, Meem, etc.)
      if (prevJoining && nextConnects) {
        result.push(mapping.medial)
      } else if (prevJoining && !nextConnects) {
        result.push(mapping.final)
      } else if (!prevJoining && nextConnects) {
        result.push(mapping.initial)
      } else {
        result.push(mapping.isolated)
      }
      prevJoining = true
    }
  }

  return result.join("")
}

/**
 * Reverses shaped Arabic/Pashto text characters for Left-To-Right rendering in jsPDF.
 * Numbers, Latin characters, and punctuation maintain their natural visual orientation.
 */
export function reverseRTLString(text: string): string {
  // Reverse characters in purely RTL segments
  return Array.from(text).reverse().join("")
}

/**
 * Tokenizes a mixed string into LTR and RTL tokens, reshapes RTL tokens,
 * and formats the line for visual layout in jsPDF coordinate systems.
 */
export function prepareBidiPdfText(input: string): string {
  if (!input) return ""
  if (!isPashtoOrArabic(input)) return input

  // Handle line breaks
  const lines = input.split(/\r?\n/)
  if (lines.length > 1) {
    return lines.map(prepareBidiPdfText).join("\n")
  }

  const line = lines[0]
  if (!line.trim()) return line

  // Tokenize line into Arabic/Pashto sequences and Non-Arabic sequences
  // Arabic sequence: Arabic/Pashto letters + connecting marks
  const tokens: Array<{ type: "rtl" | "ltr"; text: string }> = []
  let currentType: "rtl" | "ltr" | null = null
  let currentBuffer = ""

  for (const char of line) {
    const isRtl = isPashtoOrArabic(char)
    const type = isRtl ? "rtl" : "ltr"

    if (currentType === null) {
      currentType = type
      currentBuffer = char
    } else if (currentType === type) {
      currentBuffer += char
    } else {
      tokens.push({ type: currentType, text: currentBuffer })
      currentType = type
      currentBuffer = char
    }
  }
  if (currentBuffer) {
    tokens.push({ type: currentType || "ltr", text: currentBuffer })
  }

  // Reshape RTL tokens and reverse them so jsPDF draws them correctly
  const processedTokens = tokens.map((token) => {
    if (token.type === "rtl") {
      const reshaped = reshapeCursiveWord(token.text)
      return reverseRTLString(reshaped)
    }
    return token.text
  })

  // In RTL base direction (first strong directional token is RTL), reverse the tokens on the line.
  // In LTR base direction (starts with English/digits, e.g. "32319 کابل"), preserve token sequence.
  const firstStrong = tokens.find((t) => t.text.trim().length > 0)
  const isBaseRtl = firstStrong ? firstStrong.type === "rtl" : tokens.some((t) => t.type === "rtl")

  if (isBaseRtl) {
    return processedTokens.reverse().join("")
  }

  return processedTokens.join("")
}

/**
 * Universal helper for jsPDF drawText operations.
 * Resolves font, size, and prepared bidirectional text with full Pashto/Dari support.
 */
export function formatPashtoForPDF(text: string): {
  isRTL: boolean
  preparedText: string
  preferredFont: "NotoNaskhArabic" | "NotoSans"
} {
  const isRTL = isPashtoOrArabic(text)
  const preparedText = prepareBidiPdfText(text)
  const preferredFont = isRTL ? "NotoNaskhArabic" : "NotoSans"
  return { isRTL, preparedText, preferredFont }
}
