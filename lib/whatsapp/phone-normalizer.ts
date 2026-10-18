import type { NormalizedWhatsAppShipment, RecipientType } from "./message-types"

/**
 * Normalizes phone numbers for wa.me deep links safely.
 * Strips formatting (spaces, dashes, parentheses) and applies international prefixes
 * without mutating any underlying database record.
 */
export function normalizePhoneNumber(rawPhone: string | undefined | null): string {
  if (!rawPhone) return ""

  // 1. Remove non-digits except a leading +
  let cleaned = String(rawPhone).trim()
  if (!cleaned) return ""

  // Replace leading 00 with +
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2)
  }

  // Remove all non-digits, preserving leading +
  const hasPlus = cleaned.startsWith("+")
  const digits = cleaned.replace(/\D/g, "")
  if (!digits) return ""

  // 2. Country-specific heuristics when no country code is present
  // Afghanistan: 10 digits starting with 07... (e.g., 0799123456)
  if (!hasPlus && digits.length === 10 && digits.startsWith("07")) {
    return "93" + digits.slice(1)
  }
  // Afghanistan: 9 digits starting with 7...
  if (!hasPlus && digits.length === 9 && digits.startsWith("7")) {
    return "93" + digits
  }

  // India: 11 digits starting with 098... or 08... or 07... or 06...
  // Note: 098 is India (mobile prefix 98), NOT Iran (Iran has no 098 operator code)
  if (!hasPlus && digits.length === 11 && (digits.startsWith("098") || /^0[6-8]/.test(digits))) {
    return "91" + digits.slice(1)
  }

  // Iran: 11 digits starting with 09... (e.g., 09121234567, 0935...)
  if (!hasPlus && digits.length === 11 && /^09[0-49]/.test(digits)) {
    return "98" + digits.slice(1)
  }

  // India: other 11 digits starting with 0[6-9]
  if (!hasPlus && digits.length === 11 && /^0[6-9]/.test(digits)) {
    return "91" + digits.slice(1)
  }

  // UAE: 10 digits starting with 05... (e.g., 0501234567)
  if (!hasPlus && digits.length === 10 && digits.startsWith("05")) {
    return "971" + digits.slice(1)
  }

  // Pakistan: 11 digits starting with 03...
  if (!hasPlus && digits.length === 11 && digits.startsWith("03")) {
    return "92" + digits.slice(1)
  }

  // If it already had a plus or is a full international number with country code
  return digits
}

export interface RecipientOption {
  type: RecipientType
  label: string
  name: string
  rawPhone: string
  normalizedPhone: string
}

/**
 * Extracts recipient options strictly if a valid phone exists.
 * Never guesses a phone number.
 */
export function getAvailableRecipients(shipment: NormalizedWhatsAppShipment): RecipientOption[] {
  const options: RecipientOption[] = []

  if (shipment.consignee?.phone) {
    const norm = normalizePhoneNumber(shipment.consignee.phone)
    if (norm) {
      options.push({
        type: "consignee",
        label: "Consignee",
        name: shipment.consignee.name,
        rawPhone: shipment.consignee.phone,
        normalizedPhone: norm,
      })
    }
  }

  if (shipment.notifyParty?.phone) {
    const norm = normalizePhoneNumber(shipment.notifyParty.phone)
    if (norm) {
      options.push({
        type: "notify",
        label: "Notify Party",
        name: shipment.notifyParty.name,
        rawPhone: shipment.notifyParty.phone,
        normalizedPhone: norm,
      })
    }
  }

  if (shipment.shipper?.phone) {
    const norm = normalizePhoneNumber(shipment.shipper.phone)
    if (norm) {
      options.push({
        type: "shipper",
        label: "Shipper",
        name: shipment.shipper.name,
        rawPhone: shipment.shipper.phone,
        normalizedPhone: norm,
      })
    }
  }

  if (shipment.driver?.phone) {
    const norm = normalizePhoneNumber(shipment.driver.phone)
    if (norm) {
      options.push({
        type: "driver",
        label: "Driver",
        name: shipment.driver.name,
        rawPhone: shipment.driver.phone,
        normalizedPhone: norm,
      })
    }
  }

  return options
}

/**
 * Generates an official, standard WhatsApp deep-link URL.
 * Works seamlessly on desktop (WhatsApp Web / desktop client) and mobile.
 */
export function buildWhatsAppDeepLink(phone: string | undefined | null, messageText: string): string {
  const encodedText = encodeURIComponent(messageText)
  const norm = normalizePhoneNumber(phone)

  if (norm) {
    return `https://wa.me/${norm}?text=${encodedText}`
  }

  // Fallback if no specific phone number is selected
  return `https://api.whatsapp.com/send?text=${encodedText}`
}
