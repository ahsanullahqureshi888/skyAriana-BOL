import type { ShipmentStatus } from "@/lib/types/shipment"

export type WhatsAppLanguage =
  | "en"
  | "ps"
  | "fa"
  | "ur"
  | "hi"
  | "en_fa"
  | "en_ps"
  | "en_hi"
  | "fa_ps"

export type WhatsAppMessageType =
  | "status_update"
  | "short_update"
  | "ops_short"
  | "customer_update"
  | "truck_update"
  | "container_update"
  | "border_update"
  | "port_update"
  | "vessel_update"
  | "departure_update"
  | "arrival_update"
  | "eta_update"
  | "document_update"
  | "delivery_update"
  | "custom"

export type WhatsAppDateFormat = "20 Sep 2026" | "20/09/2026" | "September 20, 2026"

export type RecipientType = "consignee" | "notify" | "shipper" | "driver" | "custom"

export interface WhatsAppParty {
  name: string
  namePersian?: string
  phone?: string
  address?: string
}

export interface WhatsAppRouteLeg {
  from: string
  to: string
  vesselOrCarrier?: string
  status: string
  eta?: string
  completed?: boolean
}

export interface NormalizedWhatsAppShipment {
  id: string
  bolNumber: string
  invoiceNumber?: string
  shipper: WhatsAppParty
  consignee: WhatsAppParty
  notifyParty?: WhatsAppParty
  driver?: {
    name: string
    fatherName?: string
    phone?: string
    rent?: number
    rentCurrency?: string
  }
  truckNumber?: string
  containerNumber?: string
  containerType?: string
  sealNumber?: string
  commodity: string
  packagesCount?: number
  packagesType?: string
  packagesFormatted?: string
  grossWeightKg?: number
  netWeightKg?: number
  currentLocation: string
  nextLocation?: string
  origin: string
  destination: string
  portOfLoading?: string
  portOfDischarge?: string
  statusCode: ShipmentStatus | string
  statusDisplay: string
  vesselName?: string
  voyageNumber?: string
  feederVessel?: string
  etd?: string
  eta?: string
  lastUpdated: string
  legs?: WhatsAppRouteLeg[]
  documents?: {
    name: string
    present: boolean
    statusText: string
  }[]
  // Sensitive internal fields - strictly isolated!
  internalNotes?: string
  driverRent?: number
  driverRentCurrency?: string
  customerBalance?: number
  freightAmount?: number
  profit?: number
}

export interface WhatsAppTemplate {
  id: string
  name: string
  category: "truck" | "border" | "port" | "vessel" | "documents" | "delivery" | "custom"
  language: WhatsAppLanguage
  messageType: WhatsAppMessageType
  statusCode?: ShipmentStatus | string
  templateText: string
  isBuiltIn?: boolean
  isFavorite?: boolean
  updatedAt: string
}

export interface WhatsAppSettings {
  companyName: string
  signatureText: string
  companyPhone?: string
  companyWebsite?: string
  includeCompanyName: boolean
  includeBol: boolean
  includeShipper: boolean
  includeContainer: boolean
  includeDestination: boolean
  includeEta: boolean
  includeLastUpdated: boolean
  includeSignature: boolean
  defaultLanguage: WhatsAppLanguage
  defaultDateFormat: WhatsAppDateFormat
  storeMessageTextInHistory: boolean
  allowInternalMode: boolean
}

export type WhatsAppHistoryAction = "generated" | "copied" | "opened_whatsapp"

export interface WhatsAppHistoryEntry {
  id: string
  bolNumber: string
  templateId?: string
  language: WhatsAppLanguage
  messageType: WhatsAppMessageType
  recipientType?: RecipientType
  recipientPhone?: string
  action: WhatsAppHistoryAction
  generatedAt: string
  generatedBy: string
  isInternal: boolean
  messageText?: string // Only stored if storeMessageTextInHistory is ON
}

export interface MessageTransport {
  copy: (text: string) => Promise<boolean>
  openWhatsApp: (phone: string, text: string) => void
  sendViaApi?: (phone: string, text: string) => Promise<{ success: boolean; messageId?: string }>
}
