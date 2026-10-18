import { ParsedBulkRow, WhatsAppParsedResult } from "../types/bulk-import"

// Keywords dictionaries covering English, Dari/Persian, Pashto
const KEYWORDS = {
  commodity: ["commodity", "goods", "cargo", "جنس", "اموال", "بار", "نوعیت"],
  packages: ["packages", "cartons", "bags", "qty", "quantity", "تعداد", "بسته", "کارتن", "بوجی", "مقدار"],
  grossWeight: ["weight", "gross weight", "net weight", "kgs", "وزن", "باردان", "خالص", "ناخالص", "کیلو"],
  rate: ["rate", "price", "usd", "$", "نرخ", "قیمت", "دالر", "فی"],
  mark: ["mark", "brand", "مارکه", "برند", "نشان"],
  truckNumber: ["truck", "vehicle", "plate", "موتر نمبر", "نمبر پلیت", "موتر", "لاری"],
  driver: ["driver", "name", "موتروان", "دریور", "راننده", "نام راننده"],
  driverPhone: ["phone", "contact", "mobile", "شماره تماس", "تلفن", "موبایل", "تماس"],
  route: ["route", "transit", "via", "لار", "مسیر", "عبور", "از طریق"],
  destination: ["destination", "port", "pod", "بندر", "مقصد", "تخلیه"]
}

export const WhatsAppParser = {
  parseText: (text: string): { results: WhatsAppParsedResult[], mappedRow: ParsedBulkRow } => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
    
    const results: WhatsAppParsedResult[] = []
    const mappedRow: ParsedBulkRow = {}

    // Helper to find match
    const findMatch = (line: string, keys: string[]) => {
      const lowerLine = line.toLowerCase()
      return keys.find(k => lowerLine.includes(k.toLowerCase()))
    }

    // Helper to extract value after colon or keyword
    const extractValue = (line: string, keyword: string) => {
      let val = line
      
      // Try splitting by colon
      if (line.includes(":")) {
        val = line.split(":").slice(1).join(":").trim()
      } else if (line.includes("؛")) { // Persian colon
        val = line.split("؛").slice(1).join("؛").trim()
      } else {
        // Strip the keyword itself
        const regex = new RegExp(keyword, 'i')
        val = line.replace(regex, '').trim()
        // Strip leading dashes or equals
        val = val.replace(/^[-=\s]+/, '')
      }
      return val
    }

    lines.forEach(line => {
      let matched = false

      // Check each category
      for (const [field, keys] of Object.entries(KEYWORDS)) {
        const keywordMatched = findMatch(line, keys)
        if (keywordMatched) {
          const value = extractValue(line, keywordMatched)
          
          if (value) {
            results.push({
              field: field as keyof ParsedBulkRow,
              originalText: line,
              parsedValue: value,
              confidence: value.length > 2 ? "CONFIRMED" : "REVIEW"
            })
            mappedRow[field as keyof ParsedBulkRow] = value
            matched = true
            break
          }
        }
      }

      // If no keyword match, try generic regex patterns
      if (!matched) {
        // Look for phone numbers (contains lots of digits/plus)
        if (/(?:\+93|0)[7-9][0-9]{8}/.test(line) || /(?:\+98|0)[9][0-9]{9}/.test(line)) {
          // Extract phone
          const phones = line.match(/(?:\+93|0)[7-9][0-9]{8}|(?:\+98|0)[9][0-9]{9}/g)
          if (phones && phones.length > 0) {
            results.push({
              field: "driverPhone",
              originalText: line,
              parsedValue: phones[0],
              confidence: "CONFIRMED"
            })
            mappedRow.driverPhone = phones[0]
          }
        }
      }
    })

    // Add missing fields
    const coreFields: (keyof ParsedBulkRow)[] = ["commodity", "packages", "grossWeight", "truckNumber", "destination"]
    coreFields.forEach(f => {
      if (!mappedRow[f]) {
        results.push({
          field: f,
          originalText: "",
          parsedValue: "",
          confidence: "MISSING"
        })
      }
    })

    return { results, mappedRow }
  }
}
