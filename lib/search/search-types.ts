/**
 * Global Smart Search & Command Center Data Types
 * Sky Ariana Multi-Modal Logistics & Financial Suite
 */

import type { User, ExtendedUser } from "@/lib/rbac/rbac-types"

export type SearchResultType =
  | "bol"
  | "shipment"
  | "container"
  | "company"
  | "supplier"
  | "invoice"
  | "ledger"
  | "payment"
  | "truck"
  | "driver"
  | "vessel"
  | "voyage"
  | "document"
  | "commodity"
  | "route"
  | "tracking"
  | "task"
  | "alert"
  | "command"

export type MatchType =
  | "exact_id"
  | "exact_normalized"
  | "prefix"
  | "contains"
  | "alias"
  | "fuzzy"
  | "natural_command"

export interface ConnectedEntityRef {
  id: string
  type: SearchResultType
  title: string
  subtitle?: string
  status?: string
  badgeText?: string
  badgeColor?: string
  route?: string
}

export interface ConnectedRecordsSummary {
  bolNumber?: string
  bolCount?: number
  shipmentCount?: number
  containerNumbers?: string[]
  containerCount?: number
  shipperName?: string
  consigneeName?: string
  currentLocation?: string
  trackingStatus?: string
  eta?: string
  etd?: string
  vesselName?: string
  voyageNumber?: string
  truckNumber?: string
  driverName?: string
  driverPhone?: string
  invoiceNumber?: string
  invoiceCount?: number
  invoiceTotal?: number
  invoicePaid?: number
  invoiceOutstanding?: number
  invoiceStatus?: string
  ledgerAccount?: string
  ledgerBalance?: number
  ledgerCount?: number
  paymentCount?: number
  paymentTotal?: number
  documentCount?: number
  documentTypes?: string[]
  documentsReady?: boolean
  trackingMilestonesCount?: number
  connectedEntities?: ConnectedEntityRef[]
}

export interface QuickActionDef {
  id: string
  label: string
  labelFa?: string
  icon: string
  actionType: "navigate" | "modal" | "copy" | "event"
  payload: any
  primary?: boolean
  destructive?: boolean
  requiredPermission?: string
}

export interface SearchResultItem {
  id: string
  type: SearchResultType
  title: string
  subtitle: string
  badgeText?: string
  badgeColor?: string
  matchedField: string
  matchType: MatchType
  score: number
  targetView: string
  targetId: string
  metadata: Record<string, any>
  connectedSummary?: ConnectedRecordsSummary
  quickActions: QuickActionDef[]
}

export interface GroupedSearchResults {
  all: SearchResultItem[]
  topMatch?: SearchResultItem
  bols: SearchResultItem[]
  containers: SearchResultItem[]
  companies: SearchResultItem[]
  invoices: SearchResultItem[]
  ledgers: SearchResultItem[]
  payments: SearchResultItem[]
  documents: SearchResultItem[]
  tracking: SearchResultItem[]
  trucks: SearchResultItem[]
  drivers: SearchResultItem[]
  vessels: SearchResultItem[]
  suppliers: SearchResultItem[]
  commands: SearchResultItem[]
  totalMatches: number
}

export interface GlobalSearchResponse {
  query: string
  results: SearchResultItem[]
  topMatch?: SearchResultItem
  grouped: GroupedSearchResults
  categoryCounts: Record<string, number>
  executionTimeMs: number
  fuzzySuggestions?: string[]
}

export interface SearchOptions {
  category?: string
  limit?: number
  includeConnected?: boolean
  strictClientIsolation?: boolean
  authorizedClientId?: string
  authorizedCompanyName?: string
  role?: string
}

export interface AdvancedSearchFilters {
  query?: string
  recordType?: string
  dateFrom?: string
  dateTo?: string
  companyName?: string
  shipperName?: string
  consigneeName?: string
  route?: string
  origin?: string
  destination?: string
  borderCrossing?: string
  status?: string
  currency?: string
  minAmount?: number
  maxAmount?: number
  commodity?: string
  containerType?: string
  truckNumber?: string
  vesselName?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface DuplicateCheckResult {
  isDuplicate: boolean
  confidence: "EXACT" | "HIGH" | "MEDIUM" | "NONE"
  matchField?: string
  matchedEntityId?: string
  matchedEntityName?: string
  reason?: string
  suggestedAction?: "MERGE" | "RENAME" | "LINK" | "PROCEED"
}
