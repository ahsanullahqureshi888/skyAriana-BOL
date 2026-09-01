/**
 * Sky Ariana Export & Reverse-Transit Logistics Types
 * Models inland border to seaport multi-leg corridors, Reefer equipment (40RF, 20RF),
 * accessorial charges (Plugging fees, Escort service / مامور بدرقه),
 * export THC, VGM certification, border exit transit bonds, and dynamic multi-leg quotes.
 */

export type ExportTransportMode = "truck" | "vessel" | "train" | "airplane" | "customs"

export type EquipmentType =
  | "40RF" // 40ft High Cube / Standard Reefer
  | "20RF" // 20ft Standard Reefer
  | "40HR" // 40ft High Cube Reefer
  | "40HC" // 40ft High Cube Dry
  | "40Dry" // 40ft Standard Dry
  | "20GP" // 20ft General Purpose
  | "40OT" // 40ft Open Top
  | "40FR" // 40ft Flat Rack
  | string

export type ChargeTypeCode =
  | "ESCORT_FEE" // Escort Service (مامور بدرقه / High-value & bonded security)
  | "PLUG_FEE" // Plugging Charges (هزینه اتصال برق و مانیتورینگ کانتینر یخچالی)
  | "CMSN" // Commission (کمیسیون و مدیریت)
  | "TRF" // Terminal Receiving Fee / Tax (عوارض و مالیات پایانه)
  | "EXP_THC" // Export Terminal Handling Charge (THC صادراتی)
  | "VGM_FEE" // Verified Gross Mass Fee (ثبت رسمی وزن VGM)
  | "BOND_FEE" // Transit Bond Issuance (ضمانت ترانزیت ایران / T1)
  | "CUSTOMS_EXIT" // Export Customs Clearance (ترخیص گمرک صادرات)
  | "TRUCKING_IRAN" // Iran Inland Trucking Freight
  | "TRUCKING_TURKEY" // Turkey Inland Trucking Freight
  | "OCEAN_FRT" // Ocean Freight
  | "RISK_BUFFER" // Border Wait Contingency Buffer
  | string

export interface MasterChargeTypeDefinition {
  code: ChargeTypeCode
  name: string
  namePersian: string
  category: "accessorial" | "customs" | "transport" | "security" | "port" | "admin"
  equipmentRestriction?: "REEFER" | "ALL" | "BONDED"
  defaultRateUSD?: number
}

export const MASTER_CHARGE_TYPES: MasterChargeTypeDefinition[] = [
  {
    code: "ESCORT_FEE",
    name: "Escort Service (Bonded Transit Security)",
    namePersian: "مامور بدرقه / اسکورت امنیتی گمرک",
    category: "security",
    equipmentRestriction: "BONDED",
    defaultRateUSD: 1050.0,
  },
  {
    code: "PLUG_FEE",
    name: "Plugging Charges (Reefer Power & Monitoring)",
    namePersian: "هزینه اتصال به برق و مانیتورینگ کانتینر یخچالی",
    category: "accessorial",
    equipmentRestriction: "REEFER",
    defaultRateUSD: 700.0,
  },
  {
    code: "CMSN",
    name: "Admin Commission Fee",
    namePersian: "کمیسیون و حق‌العمل کاری مدیریتی (CMSN)",
    category: "admin",
    equipmentRestriction: "ALL",
    defaultRateUSD: 200.0,
  },
  {
    code: "TRF",
    name: "Terminal Receiving Fee / Tax (TRF)",
    namePersian: "عوارض و مالیات پایانه بندری (TRF)",
    category: "port",
    equipmentRestriction: "ALL",
    defaultRateUSD: 520.0,
  },
  {
    code: "EXP_THC",
    name: "Export Terminal Handling Charge (THC)",
    namePersian: "هزینه پایانه و جابجایی کانتینر صادراتی (THC)",
    category: "port",
    equipmentRestriction: "ALL",
    defaultRateUSD: 350.0,
  },
  {
    code: "VGM_FEE",
    name: "Verified Gross Mass (VGM) Certification",
    namePersian: "تاییدیه و ثبت رسمی وزن ناخالص کانتینر (VGM)",
    category: "port",
    equipmentRestriction: "ALL",
    defaultRateUSD: 50.0,
  },
  {
    code: "BOND_FEE",
    name: "Transit Bond Issuance (Iran Bond / T1)",
    namePersian: "صدور ضمانت‌نامه ترانزیت ورودی / سند T1 ترکیه",
    category: "customs",
    equipmentRestriction: "ALL",
    defaultRateUSD: 200.0,
  },
  {
    code: "CUSTOMS_EXIT",
    name: "Afghan Export Customs Clearance",
    namePersian: "ترخیص گمرک صادراتی افغانستان",
    category: "customs",
    equipmentRestriction: "ALL",
    defaultRateUSD: 400.0,
  },
  {
    code: "TRUCKING_IRAN",
    name: "Iran Inland Road Freight",
    namePersian: "کرایه لاری ترانزیت جاده‌ای ایران",
    category: "transport",
    equipmentRestriction: "ALL",
  },
  {
    code: "TRUCKING_TURKEY",
    name: "Turkey Inland Road Freight",
    namePersian: "کرایه لاری حمل داخلی ترکیه",
    category: "transport",
    equipmentRestriction: "ALL",
  },
  {
    code: "OCEAN_FRT",
    name: "Ocean Vessel Freight",
    namePersian: "کرایه حمل کانتینری دریایی",
    category: "transport",
    equipmentRestriction: "ALL",
  },
]

export interface ExportLeg {
  id?: string
  location: string
  locationPersian?: string
  costType: string
  costTypePersian?: string
  cost: number
  costCurrency?: "USD" | "AFN"
  chargeCode?: ChargeTypeCode
  isAccessorial?: boolean
  transportMode?: ExportTransportMode
  notes?: string
  notesPersian?: string
  transitDays?: number
  country?: string
  customsSealRequired?: boolean
  customsSealNote?: string
  pluggingDays?: number
  temperatureRequirement?: string
}

export interface OceanFreightPreset {
  id: string
  destinationPort: string
  destinationPortPersian: string
  country: string
  defaultCostUSD: number
  transitDaysEstimated: number
  isReeferRate?: boolean
  trfIncluded?: boolean
}

export interface MultiLegQuoteRequest {
  oceanFreight: number
  legs: ExportLeg[]
  riskBuffer: number
  targetMargin: number // Percentage, e.g. 15 or 20
  destinationPort?: string
  pricingMethod?: "margin" | "markup" // 'margin': Base / (1 - M), 'markup': Base * (1 + M)
  afnExchangeRate?: number
  cargoWeightKgs?: number
  cargoDescription?: string
  equipmentType?: EquipmentType
  temperatureSetting?: string
  pluggingDays?: number
  escortServiceRequired?: boolean
  gensetRequired?: boolean
  shipperName?: string
  consigneeName?: string
  quoteNumber?: string
}

export interface ItemizedLegSummary extends ExportLeg {
  percentageOfBaseCost: number
  percentageOfFinalQuote: number
  costAFN: number
  chargeCode?: ChargeTypeCode
}

export interface MultiLegQuoteResult {
  quoteNumber: string
  createdAt: string
  destinationPort: string
  pricingMethod: "margin" | "markup"
  equipmentType: EquipmentType
  temperatureSetting?: string
  isReefer: boolean
  
  // Cost Components (USD)
  inlandAndBorderCostUSD: number
  oceanFreightCostUSD: number
  riskBufferUSD: number
  totalBaseCostUSD: number // Operating COGS (Grand Total Base Cost)
  
  // Margin & Pricing (USD)
  targetMarginPercent: number
  effectiveMarkupPercent: number
  grossProfitUSD: number // Net Profit
  finalQuotedPriceUSD: number // Final Customer Quote
  
  // Specific Accessorials Breakdown (USD)
  escortFeeUSD: number // مامور بدرقه
  pluggingFeeUSD: number // Plugging Charges (7 Days, etc.)
  commissionFeeUSD: number // CMSN
  customsAndBondsCostUSD: number
  inlandTruckingCostUSD: number
  portHandlingThcCostUSD: number
  oceanFreightTotalUSD: number
  riskBufferTotalUSD: number
  
  // Currency Conversions (AFN)
  exchangeRate: number
  inlandAndBorderCostAFN: number
  oceanFreightCostAFN: number
  riskBufferAFN: number
  totalBaseCostAFN: number
  grossProfitAFN: number
  finalQuotedPriceAFN: number
  
  // Itemized Legs
  itemizedLegs: ItemizedLegSummary[]
  
  // Summary & Ledger Compliance
  accountingIdentityVerified: boolean // Total Debit - Total Credit = Net Balance
  formattedDossierText: string
  formattedDossierPersian: string
}

export interface ExportCorridorPreset {
  id: string
  name: string
  namePersian: string
  routeCode: "DGH-MERSIN" | "NMZ-BND" | "DGH-MERSIN-REEFER" | "DGH-MERSIN-NHAVA-REEFER" | "CUSTOM"
  originBorder: string
  originBorderPersian: string
  destinationPort: string
  destinationPortPersian: string
  viaCountry: string
  equipmentType: EquipmentType
  temperatureSetting?: string
  defaultRiskBuffer: number
  defaultTargetMargin: number
  defaultOceanFreight: number
  legs: ExportLeg[]
  description: string
  descriptionPersian: string
}
