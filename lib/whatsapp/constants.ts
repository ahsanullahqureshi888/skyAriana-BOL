import type { WhatsAppSettings } from "./message-types"

export const DEFAULT_WHATSAPP_SETTINGS: WhatsAppSettings = {
  companyName: "SKY ARIANA LIMITED",
  signatureText: "Thank you,\nSKY ARIANA LIMITED",
  companyPhone: "+93 799 000 000",
  companyWebsite: "www.skyariana.com",
  includeCompanyName: true,
  includeBol: true,
  includeShipper: true,
  includeContainer: true,
  includeDestination: true,
  includeEta: true,
  includeLastUpdated: true,
  includeSignature: true,
  defaultLanguage: "en",
  defaultDateFormat: "20 Sep 2026",
  storeMessageTextInHistory: false, // Requirement 50: Default Privacy Setting OFF
  allowInternalMode: true,
}
