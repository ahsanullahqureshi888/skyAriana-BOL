/**
 * Sky Ariana Logistics — Communications & Notifications Center Data Types
 * Phase 20: Notification Center, WhatsApp-Ready Generator, Status Templates,
 * Payment Reminders, Document Notices & Daily Status Reports
 */

export type NotificationPriority = "INFO" | "NORMAL" | "HIGH" | "URGENT"

export type NotificationCategory =
  | "SHIPMENT"
  | "TRACKING"
  | "DOCUMENTS"
  | "ACCOUNTING"
  | "PAYMENTS"
  | "SUPPLIERS"
  | "APPROVALS"
  | "TASKS"
  | "SYSTEM"

export type NotificationEntityType =
  | "BOL"
  | "SHIPMENT"
  | "INVOICE"
  | "PAYMENT"
  | "DOCUMENT"
  | "APPROVAL"
  | "TASK"
  | "CONTAINER"
  | "SYSTEM"

export interface NotificationRecord {
  id: string
  user_id: string // "all" or specific username
  company_id?: string
  type: string // e.g. "ETA_CHANGED", "VESSEL_DEPARTED", "PACKING_LIST_READY", "PAYMENT_RECEIVED", "INVOICE_OVERDUE"
  category: NotificationCategory
  title: string
  message: string
  entity_type: NotificationEntityType
  entity_id: string
  bol_id?: string
  shipment_id?: string
  invoice_id?: string
  payment_id?: string
  document_id?: string
  priority: NotificationPriority
  read_at?: string | null
  created_at: string
  deduplication_key: string
  action_url?: string
}

export type CommunicationChannel = "WHATSAPP" | "PHONE" | "EMAIL" | "OTHER"

export type CommunicationType =
  | "SHIPMENT_STATUS"
  | "PAYMENT_REMINDER"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_PROOF"
  | "DOCUMENT_NOTICE"
  | "DAILY_STATUS"
  | "ETA_UPDATE"
  | "DELAY_NOTICE"
  | "BALANCE_SUMMARY"
  | "CUSTOM"

export type CommunicationSentStatus =
  | "GENERATED"
  | "COPIED"
  | "OPENED_IN_WHATSAPP"
  | "SENT_CONFIRMED"
  | "FAILED"

export type MessageLengthMode = "SHORT" | "STANDARD" | "DETAILED"

export type MessageLanguage = "en" | "ps" | "fa" | "ur"

export type TemplateVisibility = "INTERNAL" | "CLIENT" | "BOTH"

export type TemplateCategory =
  | "Shipment Created"
  | "Truck Departed"
  | "At Border"
  | "Border Cleared"
  | "On Road"
  | "Arrived Port"
  | "Waiting Container"
  | "Container Stuffed"
  | "Waiting Vessel"
  | "Vessel Departed"
  | "At Sea"
  | "Arrived Transshipment"
  | "Waiting Connection"
  | "Connecting Vessel Departed"
  | "Arrived Destination"
  | "Customs Clearance"
  | "Delivered"
  | "ETA Changed"
  | "Delay Notice"
  | "Document Ready"
  | "Payment Reminder"
  | "Payment Received"

export interface MessageTemplate {
  id: string
  name: string
  category: TemplateCategory
  length_mode: MessageLengthMode
  visibility: TemplateVisibility
  company_name: string // e.g. "SKY ARIANA LTD"
  content: {
    en: string
    ps: string
    fa: string
    ur: string
  }
  is_default: boolean
  updated_at: string
  updated_by: string
}

export interface CommunicationHistoryRecord {
  id: string
  communication_type: CommunicationType
  channel: CommunicationChannel
  template_id?: string
  entity_type: string
  entity_id: string
  company_id?: string
  recipient_name: string
  recipient_phone: string
  language: MessageLanguage
  message_text: string
  generated_by: string
  generated_at: string
  sent_status: CommunicationSentStatus
  external_reference?: string
  next_followup_date?: string
  contact_method?: "WhatsApp" | "Phone" | "Email" | "Other"
}

export interface CommunicationContextData {
  bol_number?: string
  container_number?: string
  shipper?: string
  consignee?: string
  commodity?: string
  current_location?: string
  status?: string
  next_destination?: string
  origin?: string
  destination?: string
  route?: string
  eta?: string
  etd?: string
  previous_eta?: string
  vessel?: string
  voyage?: string
  truck_number?: string
  driver_name?: string
  driver_phone?: string
  shipping_line?: string
  delay_reason?: string
  internal_note?: string
  client_note?: string
  documents_ready?: string[]
  document_type?: string
  invoice_number?: string
  invoice_date?: string
  due_date?: string
  days_overdue?: number
  outstanding?: string | number
  currency?: string
  total_debit?: string | number
  total_credit?: string | number
  payment_amount?: string | number
  payment_reference?: string
  remaining_balance?: string | number
  company_name?: string
  recipient_phone?: string
  recipient_name?: string
}

export interface RenderTemplateOptions {
  language: MessageLanguage
  lengthMode?: MessageLengthMode
  isCustomerSafe?: boolean
  customRemark?: string
  omitMissing?: boolean
  dateFormat?: "DD/MM/YYYY" | "YYYY-MM-DD"
}

export interface DailyStatusShipmentSummary {
  bolNumber: string
  containerNumber?: string
  customer: string
  origin: string
  destination: string
  currentLocation: string
  status: string
  eta?: string
  isDelayed?: boolean
}

export interface DailyStatusReportResult {
  date: string
  language: MessageLanguage
  scope: "all" | "customer" | "route" | "selected"
  totalShipments: number
  stats: {
    active: number
    atBorder: number
    atPort: number
    atSea: number
    delayed: number
    arrivingToday: number
  }
  formattedMessage: string
  shipments: DailyStatusShipmentSummary[]
}

export type CommunicationCategory = NotificationCategory

export interface NotificationSummary {
  total: number
  unreadCount: number
  byCategory: Record<string, number>
  byPriority: Record<string, number>
}
