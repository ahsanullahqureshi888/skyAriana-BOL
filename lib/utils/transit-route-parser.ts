export interface RouteLeg {
  origin: string
  containerType: string
  isReefer: boolean
  isDry: boolean
  raw: string
}

export interface ParsedLogisticsRoute {
  originalText: string
  isStructured: boolean
  legs: RouteLeg[]
  switchBlBadge: string | null
  reeferBadge: string | null
  destinationBadge?: string | null
}

const KNOWN_TRANSIT_LOCATIONS = [
  "اسلام قلعه",
  "تورغندی",
  "حیرتان",
  "نیمروز",
  "دوغارون",
  "اسپین بولدک",
  "سپین بولدک",
  "بندرعباس",
  "کراچی",
  "چابهار",
  "میرجاوه",
  "دبی / جبل علی",
  "جبل علی / دبی",
  "جبل علی",
  "دبی",
  "بندر مرسین ترکیه",
  "مرسین ترکیه",
  "مرسین",
  "موندرا / نهاوا شیوا هند",
  "موندرا هند",
  "نهاوا شیوا",
  "Nhava Sheva",
  "مقصد نهایی",
  "هرات",
  "کابل",
  "قندهار",
  "مزار شریف",
]

/**
 * Parses a raw logistics route directive text (such as "از نیمروز کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال در دبی / جبل علی)")
 * into structured multi-leg segments, container type indicators, switch B/L instructions, and destinations.
 */
export function parseLogisticsRoute(rawText?: string | null): ParsedLogisticsRoute {
  if (!rawText || typeof rawText !== "string") {
    return {
      originalText: "",
      isStructured: false,
      legs: [],
      switchBlBadge: null,
      reeferBadge: null,
      destinationBadge: null,
    }
  }

  const text = rawText.trim()
  if (!text) {
    return {
      originalText: "",
      isStructured: false,
      legs: [],
      switchBlBadge: null,
      reeferBadge: null,
      destinationBadge: null,
    }
  }

  // 1. Extract Reefer condition badge: e.g. "(تمام مسیر یخچالی - Full Way Reefer)" or "(Full Way Reefer)"
  let reeferBadge: string | null = null
  const reeferMatch = text.match(/\(([^)]*(?:Reefer|یخچالی)[^)]*)\)/i)
  if (reeferMatch) {
    reeferBadge = reeferMatch[1].trim()
  } else if (text.includes("تمام مسیر کانتینر یخچالی") || text.includes("تمام مسیر یخچالی") || /full\s*way\s*reefer/i.test(text)) {
    reeferBadge = "تمام مسیر یخچالی (Full Way Reefer)"
  }

  // 2. Extract Switch B/L directive: e.g. "(با سوییچ بی ال در دبی / جبل علی)" or "با سوییچ B/L در دبی / جبل علی"
  let switchBlBadge: string | null = null
  const switchBlRegex = /(?:\(?\s*(?:با\s+)?سوی[ی]?چ\s*(?:بی\s*ال|B\/L|بارنامه)(?:\s+در\s+([^\)\(,\.؛،]+))?\s*\)?)/i
  const switchMatch = text.match(switchBlRegex)
  if (switchMatch) {
    const loc = switchMatch[1] ? switchMatch[1].trim() : ""
    switchBlBadge = loc ? `سوییچ بی ال در ${loc}` : "با سوییچ بی ال"
  }

  // 3. Extract Destination directive: e.g. "مقصد نهایی: نهاوا شیوا (Nhava Sheva)"
  let destinationBadge: string | null = null
  const destMatch = text.match(/(?:مقصد\s*(?:نهایی)?[:\s]+)([^,\.؛،\n]+)/i)
  if (destMatch) {
    destinationBadge = destMatch[1].trim()
  }

  // 4. Extract multi-leg segments starting with "از ..."
  let cleanedForLegs = text
    .replace(/[🗺️📦❄️🔄📍]/g, " ")
    .replace(switchBlRegex, "")
    .replace(/\([^)]*(?:Reefer|یخچالی)[^)]*\)/gi, "")
    .replace(/(?:و\s+)?مقصد\s*(?:نهایی)?[:\s]+[^,\.؛،\n]+/gi, "")
    .trim()

  // Normalize inverted Persian phrasing: "سپس با کانتینر یخچالی از بندرعباس" -> "از بندرعباس با کانتینر یخچالی"
  cleanedForLegs = cleanedForLegs.replace(
    /سپس\s+((?:با\s+)?کانتینر\s+(?:یخچالی|معمولی)[^از]*)\s+از\s+([^\s،,]+)/g,
    (_, cont, loc) => `از ${loc} ${cont}`
  )

  const legs: RouteLeg[] = []
  const rawParts = cleanedForLegs.split(/(?=از\s+)/).map((p) => p.trim()).filter(Boolean)

  for (const part of rawParts) {
    if (!part.startsWith("از")) continue

    let matchedLocation = ""
    const afterAz = part.replace(/^از\s+/, "").trim()
    for (const loc of KNOWN_TRANSIT_LOCATIONS) {
      if (afterAz.startsWith(loc)) {
        matchedLocation = loc
        break
      }
    }
    if (!matchedLocation) {
      const tokens = afterAz.split(/\s+/)
      matchedLocation =
        tokens[0] === "اسلام" || tokens[0] === "اسپین" || tokens[0] === "سپین"
          ? `${tokens[0]} ${tokens[1] || ""}`
          : tokens[0] || ""
    }

    const isReefer = part.includes("یخچالی") || part.toLowerCase().includes("reefer")
    const isDry = part.includes("معمولی") || part.toLowerCase().includes("dry")
    const containerType = isReefer ? "کانتینر یخچالی" : isDry ? "کانتینر معمولی" : ""

    legs.push({
      origin: `از ${matchedLocation}`.trim(),
      containerType,
      isReefer,
      isDry,
      raw: part,
    })
  }

  const isStructured = legs.length > 0 || Boolean(switchBlBadge) || Boolean(reeferBadge)

  return {
    originalText: text,
    isStructured,
    legs,
    switchBlBadge,
    reeferBadge,
    destinationBadge,
  }
}

