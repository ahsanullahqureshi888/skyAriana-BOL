/**
 * Amount in Words converter for Sky Ariana invoices and receipts.
 * Supports USD, AED, AFN, EUR, INR, TRY with proper integer and decimal handling.
 */

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
]

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
]

const SCALES = ["", "Thousand", "Million", "Billion", "Trillion"]

function convertThreeDigits(num: number): string {
  let result = ""
  const hundred = Math.floor(num / 100)
  const remainder = num % 100

  if (hundred > 0) {
    result += ONES[hundred] + " Hundred"
    if (remainder > 0) {
      result += " "
    }
  }

  if (remainder > 0) {
    if (remainder < 20) {
      result += ONES[remainder]
    } else {
      const ten = Math.floor(remainder / 10)
      const one = remainder % 10
      result += TENS[ten]
      if (one > 0) {
        result += "-" + ONES[one]
      }
    }
  }

  return result
}

function convertIntegerToWords(num: number): string {
  if (num === 0) return "Zero"

  let result = ""
  let scaleIndex = 0
  let current = Math.abs(num)

  while (current > 0) {
    const chunk = current % 1000
    if (chunk > 0) {
      const chunkText = convertThreeDigits(chunk)
      const scale = SCALES[scaleIndex]
      const chunkWithScale = scale ? `${chunkText} ${scale}` : chunkText
      result = result ? `${chunkWithScale} ${result}` : chunkWithScale
    }
    current = Math.floor(current / 1000)
    scaleIndex++
  }

  return result.trim()
}

export interface CurrencyWordsUnit {
  majorSingular: string
  majorPlural: string
  minorSingular: string
  minorPlural: string
}

const CURRENCY_UNITS: Record<string, CurrencyWordsUnit> = {
  USD: {
    majorSingular: "US Dollar",
    majorPlural: "US Dollars",
    minorSingular: "Cent",
    minorPlural: "Cents",
  },
  AED: {
    majorSingular: "UAE Dirham",
    majorPlural: "UAE Dirhams",
    minorSingular: "Fils",
    minorPlural: "Fils",
  },
  AFN: {
    majorSingular: "Afghani",
    majorPlural: "Afghanis",
    minorSingular: "Pul",
    minorPlural: "Puls",
  },
  EUR: {
    majorSingular: "Euro",
    majorPlural: "Euros",
    minorSingular: "Cent",
    minorPlural: "Cents",
  },
  INR: {
    majorSingular: "Indian Rupee",
    majorPlural: "Indian Rupees",
    minorSingular: "Paisa",
    minorPlural: "Paise",
  },
  TRY: {
    majorSingular: "Turkish Lira",
    majorPlural: "Turkish Liras",
    minorSingular: "Kurus",
    minorPlural: "Kurus",
  },
}

/**
 * Converts a monetary number to words.
 * Example: 16621.25, "USD" -> "Sixteen Thousand Six Hundred Twenty-One US Dollars and Twenty-Five Cents Only"
 */
export function numberToWords(amount: number | string | undefined | null, currency = "USD"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount || 0)
  if (isNaN(num) || !isFinite(num) || num === 0) {
    const unit = CURRENCY_UNITS[currency.toUpperCase()] || {
      majorPlural: currency.toUpperCase(),
      minorPlural: "Cents",
    }
    return `Zero ${unit.majorPlural} Only`
  }

  const isNegative = num < 0
  const absNum = Math.abs(num)
  const integerPart = Math.floor(absNum)
  const decimalPart = Math.round((absNum - integerPart) * 100)

  const unit = CURRENCY_UNITS[currency.toUpperCase()] || {
    majorSingular: currency.toUpperCase(),
    majorPlural: currency.toUpperCase(),
    minorSingular: "Cent",
    minorPlural: "Cents",
  }

  const integerWords = convertIntegerToWords(integerPart)
  const majorName = integerPart === 1 ? unit.majorSingular : unit.majorPlural

  let words = `${isNegative ? "Minus " : ""}${integerWords} ${majorName}`

  if (decimalPart > 0) {
    const decimalWords = convertIntegerToWords(decimalPart)
    const minorName = decimalPart === 1 ? unit.minorSingular : unit.minorPlural
    words += ` and ${decimalWords} ${minorName}`
  }

  return `${words} Only`
}
