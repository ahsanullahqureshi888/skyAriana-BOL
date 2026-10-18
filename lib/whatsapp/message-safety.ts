import type { NormalizedWhatsAppShipment } from "./message-types"

/**
 * Audit and purge sensitive financial or operational fields from a normalized shipment
 * before generating customer-facing messages.
 */
export function sanitizeShipmentForCustomer(
  shipment: NormalizedWhatsAppShipment
): NormalizedWhatsAppShipment {
  return {
    ...shipment,
    internalNotes: undefined,
    driverRent: undefined,
    driverRentCurrency: undefined,
    customerBalance: undefined,
    freightAmount: undefined,
    profit: undefined,
    driver: shipment.driver
      ? {
          name: shipment.driver.name,
          fatherName: shipment.driver.fatherName,
          phone: undefined, // Do not expose driver direct personal phone to customer
          rent: undefined,
          rentCurrency: undefined,
        }
      : undefined,
  }
}

/**
 * Regex patterns that represent sensitive operational or financial data
 * that must NEVER appear in Customer Safe WhatsApp messages.
 */
const SENSITIVE_PATTERNS = [
  /\b(?:profit|margin|markup)\s*[:=]/i,
  /\b(?:cost\s*price|purchase\s*price|supplier\s*rate|driver\s*rent|driver\s*freight)\b/i,
  /\b(?:customer\s*balance|ledger\s*balance|outstanding\s*balance|debit\s*balance|credit\s*balance)\b/i,
  /\b(?:internal\s*note|staff\s*comment|private\s*remark)\b/i,
  /\b(?:db_id|uuid|primary_key|mongo_id|schema_id)\b/i,
]

/**
 * Verifies that a message string does not contain sensitive internal terms.
 */
export function isMessageCustomerSafe(message: string): { safe: boolean; matchedReason?: string } {
  for (const pattern of SENSITIVE_PATTERNS) {
    const match = message.match(pattern)
    if (match) {
      return {
        safe: false,
        matchedReason: `Contains restricted term "${match[0]}"`,
      }
    }
  }
  return { safe: true }
}
