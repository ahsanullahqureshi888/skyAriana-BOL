/**
 * Persian (Jalali/Shamsi) Calendar Converter
 * Converts Gregorian dates to Persian calendar format accurately
 */

const PERSIAN_MONTHS = [
  "فروردین", // Farvardin
  "اردیبهشت", // Ordibehesht
  "خرداد", // Khordad
  "تیر", // Tir
  "مرداد", // Mordad
  "شهریور", // Shahrivar
  "مهر", // Mehr
  "آبان", // Aban
  "آذر", // Azar
  "دی", // Dey
  "بهمن", // Bahman
  "اسفند", // Esfand
]

const PERSIAN_MONTHS_EN = [
  "Farvardin",
  "Ordibehesht",
  "Khordad",
  "Tir",
  "Mordad",
  "Shahrivar",
  "Mehr",
  "Aban",
  "Azar",
  "Dey",
  "Bahman",
  "Esfand",
]

interface PersianDate {
  year: number
  month: number
  day: number
}

/**
 * Convert Gregorian date to Persian (Jalali) date
 */
export function gregorianToPersian(gy: number, gm: number, gd: number): PersianDate {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  let jy: number
  
  if (gy > 1600) {
    jy = 979
    gy -= 1600
  } else {
    jy = 0
    gy -= 621
  }
  
  const gy2 = gm > 2 ? gy + 1 : gy
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1]
  
  jy += 33 * Math.floor(days / 12053)
  days %= 12053
  jy += 4 * Math.floor(days / 1461)
  days %= 1461
  
  if (days > 365) {
    jy += Math.floor((days - 1) / 365)
    days = (days - 1) % 365
  }
  
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30)
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30)
  
  return { year: jy, month: jm, day: jd }
}

/**
 * Convert a date string (YYYY-MM-DD) to Persian date
 */
export function toPersianDate(dateString: string): PersianDate | null {
  if (!dateString) return null
  
  const parts = String(dateString).split("T")[0].split("-")
  if (parts.length !== 3) return null
  
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  
  return gregorianToPersian(year, month, day)
}

const PERSIAN_NUMERALS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]

export function toPersianNumeral(num: number | string, padding: number = 0): string {
  const str = num.toString().padStart(padding, "0")
  return str
    .split("")
    .map((digit) => (/\d/.test(digit) ? PERSIAN_NUMERALS[parseInt(digit, 10)] : digit))
    .join("")
}

/**
 * Format Persian date as string in Persian numerals (e.g. "۱۹ مرداد ۱۴۰۵")
 */
export function formatPersianDateWithMonthName(persianDate: PersianDate): string {
  const day = toPersianNumeral(persianDate.day)
  const month = PERSIAN_MONTHS[persianDate.month - 1] || ""
  const year = toPersianNumeral(persianDate.year)
  
  return `${day} ${month} ${year}`
}

/**
 * Format Persian date as numeric string (YYYY/MM/DD) in Persian numerals (e.g. "۱۴۰۵/۰۵/۱۹")
 */
export function formatPersianDateNumeric(persianDate: PersianDate): string {
  const y = toPersianNumeral(persianDate.year)
  const m = toPersianNumeral(persianDate.month, 2)
  const d = toPersianNumeral(persianDate.day, 2)
  return `\u200E${y}/\u200E${m}/\u200E${d}\u200E`
}

/**
 * Format Persian date in English transliteration (e.g. "19 Mordad 1405")
 */
export function formatPersianDateEnglish(persianDate: PersianDate): string {
  const day = persianDate.day
  const month = PERSIAN_MONTHS_EN[persianDate.month - 1] || ""
  const year = persianDate.year
  
  return `${day} ${month} ${year}`
}

/**
 * Get both Gregorian and Persian date from a date string
 */
export function getDualDates(dateString: string): {
  gregorian: string
  persian: string
  persianNumeric: string
  persianEnglish: string
} | null {
  if (!dateString) return null
  
  const persianDate = toPersianDate(dateString)
  if (!persianDate) return null
  
  return {
    gregorian: dateString,
    persian: formatPersianDateWithMonthName(persianDate),
    persianNumeric: formatPersianDateNumeric(persianDate),
    persianEnglish: formatPersianDateEnglish(persianDate),
  }
}

export function formatPersianDateFromDate(dateInput: Date | string): string | null {
  if (!dateInput) return null

  let dateStr: string
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null
    const yyyy = dateInput.getFullYear()
    const mm = String(dateInput.getMonth() + 1).padStart(2, "0")
    const dd = String(dateInput.getDate()).padStart(2, "0")
    dateStr = `${yyyy}-${mm}-${dd}`
  } else {
    dateStr = String(dateInput).split("T")[0]
  }

  const pd = toPersianDate(dateStr)
  if (!pd) return null

  return formatPersianDateNumeric(pd)
}

export const formatPersianDate = formatPersianDateFromDate

