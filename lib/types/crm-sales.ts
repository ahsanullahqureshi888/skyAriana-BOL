/**
 * Phase 25: CRM, Sales Pipeline & Customer Service Center Types
 * Single source of truth for commercial customer relationships, leads, inquiries,
 * sales opportunities, follow-up workflow, and customer service across Sky Ariana Limited.
 * 
 * Strict Guarantees:
 * - NO duplicate customer/company database (uses Company Master / MasterEntity).
 * - NO second quotation engine (uses Rates & Quotations / freightPricingService).
 * - NO sales-side general ledger edits (finance ledger balances are read-only and permission-controlled).
 * - NO AI-invented win probabilities (uses user-entered / stage-configured "Internal Pipeline Estimate").
 * - NO cargo goods value used as sales revenue (opportunity value = freight service revenue).
 * - NO duplicate shipment conversions from one accepted quotation.
 * - Multi-currency pipeline segregation (USD, AED, EUR, AFN preserved separately).
 */

export type LeadSource =
  | 'REFERRAL'
  | 'WHATSAPP'
  | 'PHONE'
  | 'EMAIL'
  | 'WEBSITE'
  | 'FACEBOOK'
  | 'WALK_IN'
  | 'EXISTING_CUSTOMER'
  | 'AGENT'
  | 'SALES_VISIT'
  | 'UNKNOWN'
  | 'OTHER'

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFYING'
  | 'QUALIFIED'
  | 'UNQUALIFIED'
  | 'CONVERTED'
  | 'CLOSED'

export interface LeadRecord {
  id: string
  leadNumber: string // e.g. "LEAD-2026-00125"
  companyId?: string // Linked Company Master ID if exists
  companyName: string
  contactPerson: string
  phone: string
  whatsApp?: string
  email?: string
  country: string
  city: string
  source: LeadSource
  interestedService: 'ROAD' | 'SEA' | 'AIR' | 'MULTIMODAL' | 'REEFER' | 'DRY' | 'OTHER'
  tradeLane?: string
  origin?: string
  destination?: string
  commodity?: string
  expectedVolume?: string
  containerType?: string
  notes?: string
  owner: string // Sales Representative
  status: LeadStatus
  convertedOpportunityId?: string
  nextFollowUp?: string // YYYY-MM-DD
  createdAt: string
  updatedAt: string
}

export type ServiceMode =
  | 'ROAD'
  | 'SEA'
  | 'AIR'
  | 'MULTIMODAL'
  | 'REEFER'
  | 'DRY'
  | 'OTHER'

export type InquiryStatus =
  | 'NEW'
  | 'REVIEWING'
  | 'RATE_REQUESTED'
  | 'READY_TO_QUOTE'
  | 'QUOTED'
  | 'CLOSED'
  | 'CANCELLED'

export interface SalesInquiryRecord {
  id: string
  inquiryNumber: string // e.g. "INQ-2026-00125"
  customerId?: string // Company Master ID
  customerName: string
  contactPerson?: string
  contactPhone?: string
  contactEmail?: string
  inquiryDate: string // YYYY-MM-DD
  serviceMode: ServiceMode
  origin: string
  destination: string
  routeId?: string
  routeName?: string
  commodity: string
  packagesCount?: number
  weightKg?: number
  containerType: string // 20GP, 40HC, 40RF, etc.
  containerQuantity: number
  temperature?: string // If reefer (e.g. "-18°C" or "+2°C to +8°C")
  requestedService: 'FULL_WAY' | 'HALF_WAY' | 'PORT_TO_PORT' | 'DOOR_TO_DOOR' | 'CUSTOMS_ONLY' | 'OTHER'
  requestedDeliveryDate?: string
  specialRequirements?: string
  status: InquiryStatus
  owner: string
  quotationId?: string // Linked quotation when quoted
  source: 'WHATSAPP' | 'PHONE' | 'EMAIL' | 'PORTAL' | 'OTHER'
  notes?: string
  createdAt: string
  updatedAt: string
}

export type OpportunityStage =
  | 'NEW_INQUIRY'
  | 'QUALIFIED'
  | 'RATE_REQUESTED'
  | 'QUOTATION_PREPARED'
  | 'QUOTATION_SENT'
  | 'FOLLOW_UP'
  | 'NEGOTIATION'
  | 'CUSTOMER_CONFIRMATION'
  | 'WON'
  | 'LOST'
  | 'ON_HOLD'

export type OpportunityStatus = 'ACTIVE' | 'WON' | 'LOST' | 'ON_HOLD'

export type LostReason =
  | 'PRICE'
  | 'ROUTE'
  | 'TRANSIT_TIME'
  | 'NO_CAPACITY'
  | 'CUSTOMER_CANCELLED'
  | 'COMPETITOR'
  | 'NO_RESPONSE'
  | 'OTHER'

export interface OpportunityRecord {
  id: string
  opportunityNumber: string // e.g. "OPP-2026-00125"
  customerId: string // Company Master ID
  customerName: string
  inquiryId?: string
  title: string
  tradeLane: string // Origin to Destination
  service: string // Full Way, Half Way, etc.
  commodity: string
  equipment: string // e.g. "1 x 40RF"
  expectedVolume: string
  expectedRevenue: number // Service revenue only (never cargo commercial goods value!)
  currency: string // USD, AFN, AED, EUR
  probability: number // Internal Pipeline Estimate percentage (0 - 100)
  targetStartDate?: string
  expectedCloseDate: string
  owner: string
  stage: OpportunityStage
  status: OpportunityStatus
  competitorNotes?: string
  lostReason?: LostReason
  lostCompetitor?: string
  lostNotes?: string
  nextAction: string
  nextActionDate?: string
  linkedQuotationIds: string[]
  acceptedQuotationId?: string
  convertedShipmentId?: string
  revision: number // Optimistic locking token for multi-PC conflict detection
  notes?: string
  createdAt: string
  updatedAt: string
}

export type FollowUpType =
  | 'PHONE'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'MEETING'
  | 'QUOTE_FOLLOW_UP'
  | 'PAYMENT_FOLLOW_UP'
  | 'SERVICE_FOLLOW_UP'
  | 'OTHER'

export type FollowUpStatus = 'PENDING' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED'

export interface CrmFollowUpTask {
  id: string
  customerId: string
  customerName: string
  opportunityId?: string
  quotationId?: string
  dueDate: string // YYYY-MM-DD or ISO
  assignedUser: string
  type: FollowUpType
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  status: FollowUpStatus
  notes: string
  completedAt?: string
  createdAt: string
}

export type CommunicationChannel =
  | 'PHONE'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'MEETING'
  | 'OFFICE_VISIT'
  | 'PORTAL'
  | 'OTHER'

export type CommunicationDirection = 'INBOUND' | 'OUTBOUND'

export interface CrmActivityRecord {
  id: string
  date: string // ISO timestamp
  customerId: string
  customerName: string
  contactPerson?: string
  user: string
  channel: CommunicationChannel
  direction: CommunicationDirection
  subject: string
  summary: string // Short business summary (not full private transcript)
  relatedOpportunityId?: string
  relatedQuoteId?: string
  relatedShipmentId?: string
  nextAction?: string
  nextActionDate?: string
  createdAt: string
}

export type ServiceRequestCategory =
  | 'TRACKING'
  | 'DOCUMENT'
  | 'BOOKING'
  | 'FINANCE'
  | 'CUSTOMS'
  | 'WAREHOUSE'
  | 'CLAIM'
  | 'RATE'
  | 'GENERAL'
  | 'OTHER'

export type ServiceRequestStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_CUSTOMER'
  | 'WAITING_INTERNAL'
  | 'RESOLVED'
  | 'CLOSED'

export type ServiceRequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export interface ServiceRequestResponse {
  id: string
  user: string
  date: string
  channel: CommunicationChannel
  response: string
  customerVisible: boolean
}

export interface CustomerServiceRequest {
  id: string
  requestNumber: string // e.g. "SR-2026-00125"
  customerId: string
  customerName: string
  contactPerson?: string
  contactPhone?: string
  shipmentId?: string
  bolNumber?: string
  containerNumber?: string
  category: ServiceRequestCategory
  subject: string
  description: string
  priority: ServiceRequestPriority
  status: ServiceRequestStatus
  assignedTo: string
  createdAt: string
  dueDate?: string
  resolvedAt?: string
  resolution?: string
  customerVisible: boolean
  linkedIncidentId?: string
  linkedClaimId?: string
  responses: ServiceRequestResponse[]
}

export interface CustomerProfileCrmExtension {
  customerId: string
  preferredTradeLanes: string[]
  preferredServices: string[]
  preferredEquipment: string[]
  commonCommodities: string[]
  tags: string[]
  segment: 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'CONTRACT' | 'SPOT' | 'HIGH_VOLUME'
  status: 'ACTIVE' | 'INACTIVE' | 'PROSPECT' | 'SUSPENDED' | 'ARCHIVED'
  accountManager: string
  creditLimit?: number
  paymentTerms?: string
  notes?: string
}

export interface CrmDashboardKpi {
  newLeads: number
  openInquiries: number
  activeOpportunities: number
  quotesPending: number
  quotesSent: number
  followUpsToday: number
  followUpsOverdue: number
  wonThisMonth: number
  lostThisMonth: number
  activeCustomers: number
  customerServiceOpen: number
  pipelineUsd: number
  pipelineAed: number
  pipelineEur: number
}
