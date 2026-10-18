/**
 * Sky Ariana AI Operations Assistant Types
 * Phase 16: Database-Grounded AI Assistant
 */

import { StaffRole } from '@/lib/rbac/rbac-types'

export type AIAssistantIntentType =
  | 'LOOKUP_BOL'
  | 'LOOKUP_CONTAINER'
  | 'LOOKUP_SHIPMENT'
  | 'LOOKUP_BOOKING'
  | 'LOOKUP_CUSTOMER'
  | 'LOOKUP_INVOICE'
  | 'SEARCH_SHIPMENTS'
  | 'SEARCH_CONTAINERS'
  | 'STALE_TRACKING'
  | 'BORDER_STATUS'
  | 'PORT_STATUS'
  | 'VESSEL_STATUS'
  | 'MISSING_DOCUMENTS'
  | 'CUSTOMER_BALANCE'
  | 'OVERDUE_INVOICES'
  | 'TODAY_PAYMENTS'
  | 'SHIPMENT_PROFIT'
  | 'DAILY_REPORT'
  | 'WHATSAPP_STATUS'
  | 'TASK_STATUS'
  | 'AUDIT_HISTORY'
  | 'CONTROL_TOWER_OVERVIEW'
  | 'ACTION_PROPOSAL'
  | 'NAVIGATION'
  | 'GENERAL_QUESTION'

export type AIActionType =
  | 'UPDATE_TRACKING'
  | 'CREATE_TASK'
  | 'PREPARE_DOCUMENT'
  | 'PREPARE_PAYMENT'
  | 'NAVIGATE'

export type AIProviderType = 'gemini' | 'offline_local'

export type AIAssistantMode = 'READ_ONLY' | 'READ_AND_ACTIONS'

export type SupportedLanguage = 'EN' | 'PS' | 'FA' | 'UR' | 'HI'

export interface AIAssistantConfig {
  enabled: boolean
  provider: AIProviderType
  apiKey?: string
  model: string
  defaultLanguage: SupportedLanguage
  mode: AIAssistantMode
  maxResults: number
  chatHistoryEnabled: boolean
  lastTestedAt?: string
  lastTestStatus?: 'SUCCESS' | 'ERROR'
  lastTestMessage?: string
}

export interface AICardItem {
  id: string
  type: 'BOL' | 'CONTAINER' | 'CUSTOMER' | 'INVOICE' | 'BOOKING' | 'DOCUMENT' | 'BORDER' | 'REPORT'
  title: string
  subtitle?: string
  status?: string
  statusColor?: string
  primaryReference: string
  secondaryReference?: string
  location?: string
  eta?: string
  financials?: {
    amount: number
    currency: string
    label: string
  }[]
  missingItems?: string[]
  updatedAt?: string
  isStale?: boolean
  staleReason?: string
  actions: {
    label: string
    action: string
    params?: Record<string, any>
    variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  }[]
}

export interface AIActionProposal {
  id: string
  actionType: AIActionType
  title: string
  description: string
  entityType: 'shipment' | 'container' | 'task' | 'document' | 'payment'
  entityId: string
  entityRef: string
  currentValues: Record<string, any>
  proposedValues: Record<string, any>
  requiresConfirmation: boolean
  confirmed: boolean
  executedAt?: string
  executedBy?: string
  auditNote?: string
}

export interface AIChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  intent?: AIAssistantIntentType
  filterChips?: {
    key: string
    label: string
    value: string
  }[]
  cards?: AICardItem[]
  actionProposal?: AIActionProposal
  sourceTags?: string[]
  recordCount?: number
  timestamp: string
  confidence?: number
  isError?: boolean
  isDraft?: boolean
}

export interface AIUserSessionContext {
  userId?: string
  username: string
  name: string
  role: StaffRole | string
  isClientUser?: boolean
  clientId?: string
  clientName?: string
  permissions?: string[]
  language?: SupportedLanguage
  currentBolId?: string
  currentAccountId?: string
}

export interface AIQueryFilter {
  query?: string
  companyId?: string
  companyName?: string
  bolNumber?: string
  containerNumber?: string
  invoiceNumber?: string
  bookingNumber?: string
  truckPlate?: string
  vesselName?: string
  status?: string
  origin?: string
  destination?: string
  stage?: 'road' | 'border' | 'port' | 'sea' | 'delivered'
  dateRange?: {
    from?: string
    to?: string
    namedPeriod?: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month'
  }
  isOverdue?: boolean
  hasMissingDocs?: boolean
  isStale?: boolean
}

export interface AIResponsePayload {
  success: boolean
  message: AIChatMessage
  suggestions?: string[]
  requiresClarification?: boolean
  clarificationOptions?: string[]
  error?: string
}
