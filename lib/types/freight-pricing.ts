/**
 * Freight Pricing, Rates & Quotation Types
 * Phase 18 for Sky Ariana Limited
 * Establishes centralized pricing models separating Buy Rates (costs) from Sell Rates (customer revenue).
 */

export type RateType =
  | 'BUY_RATE'
  | 'SELL_RATE'
  | 'CUSTOMER_RATE'
  | 'CONTRACT_RATE'
  | 'SPOT_RATE'
  | 'PROMOTIONAL_RATE'
  | 'INTERNAL_COST_RATE'

export type ServiceType =
  | 'FULL_WAY'
  | 'HALF_WAY'
  | 'PORT_TO_PORT'
  | 'DOOR_TO_PORT'
  | 'PORT_TO_DOOR'
  | 'DOOR_TO_DOOR'
  | 'ROAD_ONLY'
  | 'SEA_ONLY'
  | 'AIR_ONLY'
  | 'MULTIMODAL'

export type ContainerType =
  | '20GP'
  | '40GP'
  | '40HC'
  | '20RF'
  | '40RF'
  | 'OPEN_TOP'
  | 'FLAT_RACK'

export type RateUnit =
  | 'PER_CONTAINER'
  | 'PER_KG'
  | 'PER_TON'
  | 'PER_CBM'
  | 'PER_SHIPMENT'
  | 'PER_TRUCK'
  | 'CUSTOM'

export type RateValidityStatus =
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'FUTURE'
  | 'DRAFT'

export interface ReeferPricingDetails {
  temperatureRange?: string // e.g. "-18°C" or "+2°C to +8°C"
  plugInIncluded?: boolean
  plugInChargeUsd?: number
  gensetIncluded?: boolean
  gensetChargeUsd?: number
  monitoringIncluded?: boolean
}

export interface PricingChargeLine {
  id: string
  chargeCode: string // e.g. "OCEAN_FREIGHT", "ROAD_FREIGHT", "DOCS_FEE", "BORDER_HANDLING"
  chargeName: string
  category: 'FREIGHT' | 'DOCUMENTATION' | 'CUSTOMS' | 'TERMINAL' | 'REEFER' | 'SURCHARGE' | 'OTHER'
  buyAmount: number
  sellAmount: number
  currency: string // USD, AFN, AED, EUR, INR
  quantity: number
  unit: RateUnit
  isOptional?: boolean
  isIncludedInFreight?: boolean
  notes?: string
}

export interface RateMasterRecord {
  id: string
  rateCode: string // e.g. "RT-BND-KBL-40RF"
  name: string // e.g. "Bandar Abbas to Kabul 40RF Full-Way"
  rateType: RateType
  
  // Geographical / Route references
  originId?: string
  originName: string
  destinationId?: string
  destinationName: string
  viaLocations?: string[]
  routeId?: string
  routeName?: string
  
  transportMode: 'TRUCK' | 'SEA' | 'AIR' | 'RAIL' | 'MULTIMODAL'
  serviceType: ServiceType
  containerType: ContainerType
  rateUnit: RateUnit
  currency: string
  
  // Core financial rates
  baseBuyRate: number
  baseSellRate: number
  charges: PricingChargeLine[]
  
  // Validity
  validFrom: string // YYYY-MM-DD
  validUntil: string // YYYY-MM-DD
  
  // Stakeholder associations
  supplierId?: string // Shipping line or trucker from Master Data
  supplierName?: string
  customerId?: string // If customer-specific rate
  customerName?: string
  
  reeferDetails?: ReeferPricingDetails
  freeDays?: number
  notes?: string
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type QuotationStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'SENT'
  | 'VIEWED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'CONVERTED'

export interface QuotationRecord {
  id: string
  quotationNumber: string // e.g. "SA-QT-2026-00125"
  revision: number // 1, 2, 3
  
  // Customer Details
  customerId?: string
  customerName: string
  customerContact?: string
  customerPhone?: string
  customerEmail?: string
  customerAddress?: string
  
  date: string // YYYY-MM-DD
  validUntil: string // YYYY-MM-DD
  
  // Cargo & Routing
  originName: string
  destinationName: string
  viaLocations?: string[]
  routeId?: string
  routeName?: string
  
  commodity?: string
  containerType: ContainerType
  containerQuantity: number
  serviceType: ServiceType
  temperature?: string
  
  currency: string
  pricingLines: PricingChargeLine[]
  
  // Discounting
  discountType?: 'FIXED' | 'PERCENTAGE' | 'PER_CONTAINER'
  discountValue?: number
  discountAmount: number
  
  // Computed Financial Totals
  totalSellPrice: number
  totalBuyCost: number // Internal only - NEVER exposed to customer
  estimatedGrossMargin: number // Internal only
  marginPercentage: number // Internal only
  
  terms: string[]
  includedServices: string[]
  excludedServices: string[]
  
  status: QuotationStatus
  notes?: string
  internalNotes?: string // Staff notes, never shown on customer PDF or WhatsApp
  
  // Approvals & Tracking
  createdBy: string
  approvedBy?: string
  sentDate?: string
  acceptedDate?: string
  rejectedReason?: string
  
  // Conversion to Shipment
  convertedShipmentId?: string
  convertedAt?: string
  
  createdAt: string
  updatedAt: string
}

export interface QuotationPricingSnapshot {
  quotationId: string
  quotationNumber: string
  totalSellPrice: number
  estimatedBuyCost: number
  estimatedGrossMargin: number
  currency: string
  containerType: ContainerType
  containerQuantity: number
  frozenAt: string
}

export interface ChargeMasterItem {
  code: string
  name: string
  category: PricingChargeLine['category']
  defaultCurrency: string
  defaultUnit: RateUnit
  description?: string
}
