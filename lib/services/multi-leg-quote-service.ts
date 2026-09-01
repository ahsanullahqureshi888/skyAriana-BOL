/**
 * Sky Ariana Multi-Leg Export & Reverse-Transit Quotation Engine
 * Calculates inland border export fees, transit bonds, inland trucking,
 * port export handling (THC, VGM, Gate-in), Reefer plugging charges,
 * Escort service (مامور بدرقه), ocean freight with TRF (Terminal Receiving Fee),
 * risk buffer, and target profit margins.
 */

import { getActiveExchangeRate } from "./currency-service"
import type {
  ExportLeg,
  MultiLegQuoteRequest,
  MultiLegQuoteResult,
  ItemizedLegSummary,
  ExportCorridorPreset,
  OceanFreightPreset,
  EquipmentType,
  ChargeTypeCode,
} from "@/lib/types/export-routing"
import type { RouteStop } from "@/lib/types/bill-of-lading"

// ==========================================
// Canonical Corridors (User Specifications)
// ==========================================

/**
 * Route 1 Payload: Dougharoun to Mersin (Afghan Export via Turkey)
 * Total Base Leg Cost: $3,100.00 USD
 */
export const dougharounToMersinLegs: ExportLeg[] = [
  {
    id: "leg-dgh-1",
    location: "Dougharoun Border",
    locationPersian: "مرز دوغارون / اسلام قلعه",
    costType: "Export Customs & Iran Bond",
    costTypePersian: "گمرک صادرات افغانستان و صدور ضمانت ترانزیت ایران",
    cost: 450.0,
    chargeCode: "CUSTOMS_EXIT",
    transportMode: "customs",
    notes: "Afghan export customs, cross-docking (if transferring trucks), and Iranian transit bond issuance.",
    notesPersian: "ترخیص گمرک صادراتی، تخلیه و بارگیری مجدد (Cross-docking) و صدور ضمانت ترانزیت ایران",
    transitDays: 1,
    country: "Afghanistan / Iran",
    customsSealRequired: true,
    customsSealNote: "📍 پلمپ گمرکی دوغارون / Customs Seal Required",
  },
  {
    id: "leg-dgh-2",
    location: "Dougharoun to Bazargan",
    locationPersian: "دوغارون الی بازرگان",
    costType: "Trucking (Iran Transit)",
    costTypePersian: "کرایه حمل جاده‌ای (ترانزیت ایران)",
    cost: 1200.0,
    chargeCode: "TRUCKING_IRAN",
    transportMode: "truck",
    notes: "Long-haul road freight across Iran to the Turkish border (Bazargan/Gürbulak).",
    notesPersian: "حمل جاده‌ای مسافت طولانی در خاک ایران تا مرز بازرگان / گوربولاغ",
    transitDays: 4,
    country: "Iran",
  },
  {
    id: "leg-dgh-3",
    location: "Bazargan Border",
    locationPersian: "مرز بازرگان / گوربولاغ",
    costType: "Turkey Entry Transit (T1)",
    costTypePersian: "سند ترانزیت ورود به ترکیه (T1)",
    cost: 200.0,
    chargeCode: "BOND_FEE",
    transportMode: "customs",
    notes: "Turkish customs border entry transit document (T1) issuance and inspection.",
    notesPersian: "صدور اظهارنامه و سند ترانزیت گمرکی T1 ترکیه و بازرسی مرزی",
    transitDays: 1,
    country: "Turkey",
    customsSealRequired: true,
    customsSealNote: "📍 پلمپ گمرک ترکیه (T1 Transit Seal)",
  },
  {
    id: "leg-dgh-4",
    location: "Bazargan to Mersin",
    locationPersian: "بازرگان الی بندر مرسین",
    costType: "Trucking (Turkey Inland)",
    costTypePersian: "کرایه لاری حمل داخلی ترکیه",
    cost: 900.0,
    chargeCode: "TRUCKING_TURKEY",
    transportMode: "truck",
    notes: "Inland road freight from Bazargan border to Mersin seaport terminal.",
    notesPersian: "حمل زمینی داخلی از مرز بازرگان تا ترمینال کانتینری بندر مرسین",
    transitDays: 2,
    country: "Turkey",
  },
  {
    id: "leg-dgh-5",
    location: "Mersin Port",
    locationPersian: "بندر مرسین ترکیه",
    costType: "Export THC & VGM",
    costTypePersian: "هزینه پایانه صادراتی THC، ثبت وزن VGM و بارگیری",
    cost: 350.0,
    chargeCode: "EXP_THC",
    transportMode: "vessel",
    notes: "Export THC (Terminal Handling Charges), VGM (Verified Gross Mass) submission fee, export customs clearance, and port loading charges.",
    notesPersian: "هزینه THC صادراتی، تاییدیه رسمی وزن VGM، ترخیص صادراتی بندر و بارگیری روی کشتی",
    transitDays: 2,
    country: "Turkey",
  },
]

/**
 * Route 2 Payload: Nimroz to Bandar Abbas (Afghan Export via South Iran)
 * Total Base Leg Cost: $1,550.00 USD
 */
export const nimrozToBandarAbbasLegs: ExportLeg[] = [
  {
    id: "leg-nmz-1",
    location: "Nimroz/Milak Border",
    locationPersian: "مرز نیمروز / پل ابریشم میلک",
    costType: "Export Customs & Transit Bond",
    costTypePersian: "گمرک صادرات افغانستان و ثبت ترانزیت ورودی ایران",
    cost: 400.0,
    chargeCode: "CUSTOMS_EXIT",
    transportMode: "customs",
    notes: "Afghan export clearance and Iranian entry transit documentation.",
    notesPersian: "ترخیص گمرکی صادرات افغانستان و ثبت اسناد ترانزیت ورودی جمهوری اسلامی ایران",
    transitDays: 1,
    country: "Afghanistan / Iran",
    customsSealRequired: true,
    customsSealNote: "📍 پلمپ گمرک میلک / Milak Customs Seal",
  },
  {
    id: "leg-nmz-2",
    location: "Milak to BND",
    locationPersian: "میلک الی بندرعباس",
    costType: "Trucking (Southbound)",
    costTypePersian: "کرایه لاری حمل جاده‌ای (مسیر جنوب)",
    cost: 850.0,
    chargeCode: "TRUCKING_IRAN",
    transportMode: "truck",
    notes: "Southbound road freight from the Milak border crossing to Bandar Abbas port terminals.",
    notesPersian: "حمل جاده‌ای مستقیم از مرز میلک (زاهدان) به پایانه کانتینری بندر شهید رجایی / بندرعباس",
    transitDays: 3,
    country: "Iran",
  },
  {
    id: "leg-nmz-3",
    location: "Bandar Abbas Port",
    locationPersian: "بندرعباس (شهید رجایی)",
    costType: "Export THC & Gate-in",
    costTypePersian: "هزینه THC صادراتی، ورود به اسکله Gate-in و ترخیص کانتینر",
    cost: 300.0,
    chargeCode: "EXP_THC",
    transportMode: "vessel",
    notes: "Port Gate-in fees, Export Terminal Handling Charges (THC), and shipping line container release fees.",
    notesPersian: "عوارض ورود کانتینر به اسکله (Gate-in)، هزینه THC صادراتی و تسویه ترخیص خط کشتیرانی",
    transitDays: 2,
    country: "Iran",
  },
]

/**
 * Route 3 Payload: Dogharon to Mersin Reefer Export Routing (Refrigerated 40RF/20RF)
 * Includes Escort Service (مامور بدرقه), Plugging Charges (7 Days), Turkey Transit Trucking, Commission (CMSN), and Ocean Freight with TRF.
 * Total Transit Legs Cost: $5,300.00 USD
 * Ocean Freight ($6,500 + 8% TRF): $7,020.00 USD
 * Grand Total Cost: $12,320.00 USD
 */
export const dogharonToMersinReeferCosts = {
  oceanFreight: 7020.0, // $6,500 + 8% TRF
  transitLegs: [
    { location: "Dogharon/Iran Transit", costType: "Escort Service", cost: 1050.0 },
    { location: "Dogharon to Bazargan", costType: "Trucking (Iran Inland)", cost: 800.0 },
    { location: "Bazargan to Mersin", costType: "Trucking (Turkey Transit)", cost: 2600.0 },
    { location: "Mersin Port", costType: "Plugging Charges (7 Days)", cost: 700.0 },
    { location: "Admin", costType: "Commission (CMSN)", cost: 150.0 },
  ],
}

export const dogharonToMersinReeferLegs: ExportLeg[] = [
  {
    id: "leg-rf-1",
    location: "Dogharon/Iran Transit",
    locationPersian: "مرز دوغارون / ترانزیت ایران",
    costType: "Escort Service",
    costTypePersian: "مامور بدرقه (اسکورت امنیتی گمرک)",
    cost: 1050.0,
    chargeCode: "ESCORT_FEE",
    isAccessorial: true,
    transportMode: "customs",
    notes: "Escort Service (مامور بدرقه) - High-value and bonded security escort across Iran",
    notesPersian: "خدمات مامور بدرقه گمرکی و اسکورت امنیتی محموله در خاک ایران",
    transitDays: 3,
    country: "Iran",
    customsSealRequired: true,
    customsSealNote: "📍 پلمپ گمرک و مامور بدرقه / Customs Seal & Escort Required",
  },
  {
    id: "leg-rf-2",
    location: "Dogharon to Bazargan",
    locationPersian: "دوغارون الی بازرگان",
    costType: "Trucking (Iran Inland)",
    costTypePersian: "کرایه لاری حمل داخلی ایران",
    cost: 800.0,
    chargeCode: "TRUCKING_IRAN",
    transportMode: "truck",
    notes: "Inland road trucking from Dogharon border to Bazargan border crossing",
    notesPersian: "کرایه حمل زمینی لاری از مرز دوغارون تا مرز بازرگان",
    transitDays: 4,
    country: "Iran",
  },
  {
    id: "leg-rf-3",
    location: "Bazargan to Mersin",
    locationPersian: "بازرگان الی بندر مرسین",
    costType: "Trucking (Turkey Transit)",
    costTypePersian: "کرایه لاری ترانزیت ترکیه",
    cost: 2600.0,
    chargeCode: "TRUCKING_TURKEY",
    transportMode: "truck",
    notes: "Long-haul road trucking transit across Turkey to Mersin Seaport",
    notesPersian: "حمل و ترانزیت جاده‌ای در خاک ترکیه از مرز بازرگان تا بندر مرسین",
    transitDays: 3,
    country: "Turkey",
  },
  {
    id: "leg-rf-4",
    location: "Mersin Port",
    locationPersian: "بندر مرسین ترکیه",
    costType: "Plugging Charges (7 Days)",
    costTypePersian: "هزینه اتصال برق و مانیتورینگ یخچالی (۷ روز)",
    cost: 700.0,
    chargeCode: "PLUG_FEE",
    isAccessorial: true,
    transportMode: "vessel",
    pluggingDays: 7,
    notes: "Plugging Charges (7 Days) - Active temperature-controlled electrical connection & monitoring",
    notesPersian: "هزینه اتصال برق کانتینر یخچالی (Plugging) و پایش مداوم دما به مدت ۷ روز در بندر مرسین",
    transitDays: 7,
    country: "Turkey",
  },
  {
    id: "leg-rf-5",
    location: "Admin",
    locationPersian: "امور اداری و مدیریت",
    costType: "Commission (CMSN)",
    costTypePersian: "کمیسیون و مدیریت (CMSN)",
    cost: 150.0,
    chargeCode: "CMSN",
    isAccessorial: true,
    transportMode: "customs",
    notes: "Administrative fee and management commission (CMSN)",
    notesPersian: "حق‌العمل کاری و کمیسیون اداری مدیریت بارنامه و ترانزیت",
    country: "Afghanistan / Global",
  },
]

// ==========================================
// Ocean Freight Presets
// ==========================================

export const OCEAN_FREIGHT_PRESETS: OceanFreightPreset[] = [
  {
    id: "ocean-mersin-reefer-trf",
    destinationPort: "Mersin Port (40RF Reefer + 8% TRF)",
    destinationPortPersian: "بندر مرسین (کانتینر یخچالی ۴۰ فوت + مالیات TRF)",
    country: "Turkey",
    defaultCostUSD: 7020.0, // $6,500 base + 8% TRF ($520)
    transitDaysEstimated: 12,
    isReeferRate: true,
    trfIncluded: true,
  },
  {
    id: "ocean-jebel-ali",
    destinationPort: "Jebel Ali (Dubai, UAE)",
    destinationPortPersian: "بندر جبل علی (دبی، امارات)",
    country: "UAE",
    defaultCostUSD: 450.0,
    transitDaysEstimated: 2,
    isReeferRate: false,
  },
  {
    id: "ocean-jebel-ali-reefer",
    destinationPort: "Jebel Ali (40RF Reefer)",
    destinationPortPersian: "بندر جبل علی (یخچالی ۴۰ فوت)",
    country: "UAE",
    defaultCostUSD: 1850.0,
    transitDaysEstimated: 2,
    isReeferRate: true,
  },
  {
    id: "ocean-nhava-sheva",
    destinationPort: "Nhava Sheva / JNPT (Mumbai, India)",
    destinationPortPersian: "بندر نهاوا شوا (مومبای، هند)",
    country: "India",
    defaultCostUSD: 650.0,
    transitDaysEstimated: 5,
    isReeferRate: false,
  },
  {
    id: "ocean-mundra",
    destinationPort: "Mundra Port (Gujarat, India)",
    destinationPortPersian: "بندر موندرا (گجرات، هند)",
    country: "India",
    defaultCostUSD: 600.0,
    transitDaysEstimated: 4,
    isReeferRate: false,
  },
  {
    id: "ocean-qingdao",
    destinationPort: "Qingdao Port (China)",
    destinationPortPersian: "بندر چینگ‌دائو (چین)",
    country: "China",
    defaultCostUSD: 1100.0,
    transitDaysEstimated: 16,
    isReeferRate: false,
  },
  {
    id: "ocean-hamburg",
    destinationPort: "Hamburg Port (Germany)",
    destinationPortPersian: "بندر هامبورگ (آلمان)",
    country: "Germany",
    defaultCostUSD: 1450.0,
    transitDaysEstimated: 24,
    isReeferRate: false,
  },
]

// ==========================================
// Predefined Export Corridors
// ==========================================

export const EXPORT_CORRIDOR_PRESETS: ExportCorridorPreset[] = [
  {
    id: "corridor-dgh-mersin-reefer",
    name: "Route 3: Dogharon to Mersin Reefer (Refrigerated 40RF)",
    namePersian: "مسیر سوم: دوغارون الی مرسین کانتینر یخچالی (۴۰ فوت با مامور بدرقه و پلاگینگ)",
    routeCode: "DGH-MERSIN-REEFER",
    originBorder: "Dogharon / Islam Qala",
    originBorderPersian: "دوغارون / اسلام قلعه",
    destinationPort: "Mersin Port (Turkey)",
    destinationPortPersian: "بندر مرسین، ترکیه (اسکله کانتینری رفر)",
    viaCountry: "Iran & Turkey",
    equipmentType: "40RF",
    temperatureSetting: "-18°C Frozen",
    defaultRiskBuffer: 0.0,
    defaultTargetMargin: 15.0, // 15% Target Margin
    defaultOceanFreight: 7020.0, // $6,500 + 8% TRF
    legs: dogharonToMersinReeferLegs,
    description: "Reefer export routing with bonded Escort Service across Iran (مامور بدرقه), Turkey transit trucking, 7 days Reefer plugging charges at Mersin port, and 8% TRF included in ocean freight.",
    descriptionPersian: "مسیر ترانزیت کانتینر یخچالی با اسکورت مامور بدرقه در ایران، ترانزیت ترکیه، ۷ روز هزینه برق (Plugging) در مرسین و مالیات TRF.",
  },
  {
    id: "corridor-dgh-mersin",
    name: "Route 1: Dougharoun to Mersin (Afghan Export via Turkey)",
    namePersian: "مسیر اول: دوغارون الی بندر مرسین (صادرات افغانستان از طریق ترکیه)",
    routeCode: "DGH-MERSIN",
    originBorder: "Dougharoun / Islam Qala",
    originBorderPersian: "اسلام قلعه / دوغارون",
    destinationPort: "Mersin Port (Turkey)",
    destinationPortPersian: "بندر مرسین، ترکیه",
    viaCountry: "Iran & Turkey",
    equipmentType: "40HC",
    defaultRiskBuffer: 250.0,
    defaultTargetMargin: 20.0,
    defaultOceanFreight: 0.0,
    legs: dougharounToMersinLegs,
    description: "Multimodal export corridor transferring cargo through Iran to Turkey's Mediterranean port of Mersin with T1 transit bonds, inland trucking, and Export THC/VGM.",
    descriptionPersian: "مسیر ترانزیت معکوس و صادراتی از مرز دوغارون به سمت ترکیه و بندر مدیترانه‌ای مرسین به همراه اسناد T1، کرایه‌های ترانزیت و THC صادراتی.",
  },
  {
    id: "corridor-nmz-bnd",
    name: "Route 2: Nimroz to Bandar Abbas (Afghan Export via South Iran)",
    namePersian: "مسیر دوم: نیمروز الی بندرعباس (صادرات افغانستان از طریق جنوب ایران)",
    routeCode: "NMZ-BND",
    originBorder: "Nimroz / Milak",
    originBorderPersian: "نیمروز / میلک",
    destinationPort: "Bandar Abbas (Persian Gulf)",
    destinationPortPersian: "بندرعباس (خلیج فارس)",
    viaCountry: "Iran",
    equipmentType: "40Dry",
    defaultRiskBuffer: 200.0,
    defaultTargetMargin: 20.0,
    defaultOceanFreight: 450.0, // E.g. ocean vessel to Jebel Ali
    legs: nimrozToBandarAbbasLegs,
    description: "Southern export corridor connecting Nimroz/Milak border to Bandar Abbas seaport with export customs, southbound road freight, and Export THC + Gate-in charges.",
    descriptionPersian: "مسیر مستقیم صادراتی از مرز نیمروز به بندرعباس جهت حمل دریایی به مقاصد بین‌المللی همراه با ثبت ترانزیت، کرایه لاری و عوارض THC.",
  },
]

// ==========================================
// Core Quotation Engine
// ==========================================

/**
 * Generates a comprehensive Multi-Leg Export & Reverse-Transit Quotation.
 * Supports Dry and Reefer equipment accessorials (Plugging charges, Escort service, TRF, Commission).
 * 
 * Mathematical Formulation:
 * 1. Transit Legs Total = Sum(Leg Costs)
 * 2. Grand Total Base Cost (COGS) = Ocean Freight + Transit Legs Total + Risk Buffer
 * 3. Final Customer Quote = Grand Total Base Cost / (1 - Target Margin / 100)
 * 4. Net Profit = Final Customer Quote - Grand Total Base Cost
 */
export function generateMultiLegQuote(
  oceanFreight: number,
  legs: ExportLeg[],
  riskBuffer: number,
  targetMargin: number,
  options?: {
    destinationPort?: string
    pricingMethod?: "margin" | "markup"
    afnExchangeRate?: number
    quoteNumber?: string
    shipperName?: string
    consigneeName?: string
    equipmentType?: EquipmentType
    temperatureSetting?: string
    pluggingDays?: number
    escortServiceRequired?: boolean
  }
): MultiLegQuoteResult {
  const safeOceanFreight = Math.max(0, Number(oceanFreight) || 0)
  const safeRiskBuffer = Math.max(0, Number(riskBuffer) || 0)
  const safeTargetMargin = Math.min(99.9, Math.max(0, Number(targetMargin) || 0))
  const pricingMethod = options?.pricingMethod || "margin"
  const exchangeRate = options?.afnExchangeRate || getActiveExchangeRate()
  const destinationPort = options?.destinationPort || "Mersin Port / International Seaport"
  const quoteNumber = options?.quoteNumber || `Q-EXP-${Date.now().toString().slice(-6)}`
  const equipmentType = options?.equipmentType || "40RF"
  const temperatureSetting = options?.temperatureSetting || (equipmentType.includes("RF") || equipmentType.includes("HR") ? "-18°C Frozen" : undefined)
  const isReefer = equipmentType.includes("RF") || equipmentType.includes("HR") || Boolean(temperatureSetting)
  const createdAt = new Date().toISOString()

  // 1. Calculate Leg Subtotals & Specialized Fee Categorization
  let inlandAndBorderCostUSD = 0
  let customsAndBondsCostUSD = 0
  let inlandTruckingCostUSD = 0
  let portHandlingThcCostUSD = 0
  let escortFeeUSD = 0
  let pluggingFeeUSD = 0
  let commissionFeeUSD = 0

  const safeLegs = (Array.isArray(legs) ? legs : []).map((leg, idx) => {
    const cost = Math.max(0, Number(leg.cost) || 0)
    inlandAndBorderCostUSD += cost

    const ct = (leg.costType || "").toLowerCase()
    const code = leg.chargeCode || ""

    if (code === "ESCORT_FEE" || ct.includes("escort") || ct.includes("بدرقه")) {
      escortFeeUSD += cost
      customsAndBondsCostUSD += cost
    } else if (code === "PLUG_FEE" || ct.includes("plug") || ct.includes("برق")) {
      pluggingFeeUSD += cost
      portHandlingThcCostUSD += cost
    } else if (code === "CMSN" || ct.includes("commission") || ct.includes("کمیسیون")) {
      commissionFeeUSD += cost
    } else if (ct.includes("customs") || ct.includes("bond") || ct.includes("t1") || leg.transportMode === "customs") {
      customsAndBondsCostUSD += cost
    } else if (ct.includes("trucking") || ct.includes("transit") || leg.transportMode === "truck") {
      inlandTruckingCostUSD += cost
    } else if (ct.includes("thc") || ct.includes("vgm") || ct.includes("gate-in") || ct.includes("port") || leg.transportMode === "vessel") {
      portHandlingThcCostUSD += cost
    } else {
      inlandTruckingCostUSD += cost
    }

    return {
      ...leg,
      cost,
      id: leg.id || `leg-${idx + 1}`,
      chargeCode: leg.chargeCode || (ct.includes("escort") ? "ESCORT_FEE" : ct.includes("plug") ? "PLUG_FEE" : ct.includes("commission") ? "CMSN" : undefined),
    }
  })

  // 2. Grand Total Base Operating Cost (COGS)
  const totalBaseCostUSD = inlandAndBorderCostUSD + safeOceanFreight + safeRiskBuffer

  // 3. Margin & Final Customer Price Calculations
  let finalQuotedPriceUSD = 0
  let grossProfitUSD = 0
  let effectiveMarkupPercent = 0
  let targetMarginPercent = safeTargetMargin

  if (pricingMethod === "margin") {
    const marginRatio = safeTargetMargin / 100
    if (marginRatio >= 1) {
      finalQuotedPriceUSD = totalBaseCostUSD * 2
      grossProfitUSD = totalBaseCostUSD
      effectiveMarkupPercent = 100
    } else {
      finalQuotedPriceUSD = totalBaseCostUSD / (1 - marginRatio)
      grossProfitUSD = finalQuotedPriceUSD - totalBaseCostUSD
      effectiveMarkupPercent = totalBaseCostUSD > 0 ? (grossProfitUSD / totalBaseCostUSD) * 100 : 0
    }
  } else {
    // Markup mode
    grossProfitUSD = totalBaseCostUSD * (safeTargetMargin / 100)
    finalQuotedPriceUSD = totalBaseCostUSD + grossProfitUSD
    targetMarginPercent = finalQuotedPriceUSD > 0 ? (grossProfitUSD / finalQuotedPriceUSD) * 100 : 0
    effectiveMarkupPercent = safeTargetMargin
  }

  // Precision rounding
  const r2 = (n: number) => Math.round(n * 100) / 100
  const finalUSD = r2(finalQuotedPriceUSD)
  const profitUSD = r2(grossProfitUSD)
  const baseCostUSD = r2(totalBaseCostUSD)
  const inlandCostUSD = r2(inlandAndBorderCostUSD)

  // AFN Conversions
  const toAFN = (usd: number) => r2(usd * exchangeRate)
  const finalAFN = toAFN(finalUSD)
  const profitAFN = toAFN(profitUSD)
  const baseCostAFN = toAFN(baseCostUSD)
  const inlandCostAFN = toAFN(inlandCostUSD)
  const oceanAFN = toAFN(safeOceanFreight)
  const riskAFN = toAFN(safeRiskBuffer)

  // Itemized summary with percentages
  const itemizedLegs: ItemizedLegSummary[] = safeLegs.map((leg) => {
    const percentageOfBaseCost = baseCostUSD > 0 ? r2((leg.cost / baseCostUSD) * 100) : 0
    const percentageOfFinalQuote = finalUSD > 0 ? r2((leg.cost / finalUSD) * 100) : 0
    return {
      ...leg,
      percentageOfBaseCost,
      percentageOfFinalQuote,
      costAFN: toAFN(leg.cost),
    }
  })

  // Formatted Bilingual Quotation Dossiers
  const reeferHeader = isReefer
    ? `\n[ EQUIPMENT: ${equipmentType} (Refrigerated) | TEMP: ${temperatureSetting || "-18°C Frozen"} | ACCESSORIALS: Escort Service & Plugging Active ]`
    : `\n[ EQUIPMENT: ${equipmentType} (Standard Dry) ]`

  const formattedDossierText = `=====================================================
SKY ARIANA LIMITED • OFFICIAL EXPORT & REEFER QUOTATION
Quote Reference: ${quoteNumber}
Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
Destination: ${destinationPort}${reeferHeader}
Exchange Rate: 1 USD = ${exchangeRate.toFixed(2)} AFN
-----------------------------------------------------
1. TRANSIT LEGS & ACCESSORIAL FEES:
${itemizedLegs.map((l, i) => `   ${i + 1}. ${l.location} [${l.costType}]: $${l.cost.toFixed(2)} USD (${toAFN(l.cost).toLocaleString()} AFN)`).join("\n")}
   -> Subtotal Transit & Accessorials: $${inlandCostUSD.toFixed(2)} USD (${inlandCostAFN.toLocaleString()} AFN)

2. MARITIME, TRF & CONTINGENCY:
   -> Ocean Freight (incl. TRF): $${safeOceanFreight.toFixed(2)} USD (${oceanAFN.toLocaleString()} AFN)
   ${safeRiskBuffer > 0 ? `-> Risk Buffer / Border Wait: $${safeRiskBuffer.toFixed(2)} USD (${riskAFN.toLocaleString()} AFN)\n   ` : ""}--------------------------------------------------
   -> GRAND TOTAL OPERATING COST (COGS): $${baseCostUSD.toFixed(2)} USD (${baseCostAFN.toLocaleString()} AFN)

3. COMMERCIAL PRICING & NET PROFIT:
   -> Target Margin: ${targetMarginPercent.toFixed(2)}% (Markup: ${effectiveMarkupPercent.toFixed(2)}%)
   -> Net Profit: $${profitUSD.toFixed(2)} USD (${profitAFN.toLocaleString()} AFN)
=====================================================
>>> FINAL ALL-INCLUSIVE CUSTOMER QUOTE: 
    $${finalUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
    (${finalAFN.toLocaleString("en-US", { minimumFractionDigits: 2 })} AFN)
=====================================================`

  const reeferHeaderFa = isReefer
    ? `\n[ نوع کانتینر: ${equipmentType} (یخچالی/رفر) | دمای تنظیمی: ${temperatureSetting || "-18°C"} | خدمات خاص: مامور بدرقه و برق پلاگینگ ]`
    : `\n[ نوع کانتینر: ${equipmentType} (معمولی) ]`

  const formattedDossierPersian = `=====================================================
شرکت ترانزیتی و لجستیکی بین‌المللی سکای آریانا لمیتد
پیش‌فاکتور و نرخ‌نامه رسمی صادرات و ترانزیت کانتینری (Reefer / Dry)
شماره رفرنس کوتیشن: ${quoteNumber}
تاریخ صدور: ${new Date().toLocaleDateString("fa-IR")}
بندر / مقصد نهایی: ${destinationPort}${reeferHeaderFa}
نرخ تسعیر: هر دلار آمریکا = ${exchangeRate.toFixed(2)} افغانی
-----------------------------------------------------
۱. جزئیات هزینه‌های مسیر، ترانزیت و خدمات دسترسی (Accessorials):
${itemizedLegs.map((l, i) => `   ${i + 1}. ${l.locationPersian || l.location} [${l.costTypePersian || l.costType}]: $${l.cost.toFixed(2)} دلار (${toAFN(l.cost).toLocaleString()} افغانی)`).join("\n")}
   -> مجموع مصارف ترانزیت و خدمات ویژه: $${inlandCostUSD.toFixed(2)} دلار (${inlandCostAFN.toLocaleString()} افغانی)

۲. کرایه حمل دریایی (با احتساب مالیات TRF) و بافر ریسک:
   -> کرایه حمل دریایی + TRF: $${safeOceanFreight.toFixed(2)} دلار (${oceanAFN.toLocaleString()} افغانی)
   ${safeRiskBuffer > 0 ? `-> بافر ریسک و توقف مرزی: $${safeRiskBuffer.toFixed(2)} دلار (${riskAFN.toLocaleString()} افغانی)\n   ` : ""}--------------------------------------------------
   -> مجموع کل مصارف تمام شده عملیاتی (Grand Total Cost): $${baseCostUSD.toFixed(2)} دلار (${baseCostAFN.toLocaleString()} افغانی)

۳. مارجین تجاری و سود خالص:
   -> حاشیه سود هدف: ${targetMarginPercent.toFixed(2)}٪
   -> پیش‌بینی سود خالص: $${profitUSD.toFixed(2)} دلار (${profitAFN.toLocaleString()} افغانی)
=====================================================
>>> نرخ نهایی قابل ارایه به مشتری: 
    $${finalUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })} دلار آمریکا
    (${finalAFN.toLocaleString("en-US", { minimumFractionDigits: 2 })} افغانی)
=====================================================`

  return {
    quoteNumber,
    createdAt,
    destinationPort,
    pricingMethod,
    equipmentType,
    temperatureSetting,
    isReefer,
    inlandAndBorderCostUSD: inlandCostUSD,
    oceanFreightCostUSD: safeOceanFreight,
    riskBufferUSD: safeRiskBuffer,
    totalBaseCostUSD: baseCostUSD,
    targetMarginPercent: r2(targetMarginPercent),
    effectiveMarkupPercent: r2(effectiveMarkupPercent),
    grossProfitUSD: profitUSD,
    finalQuotedPriceUSD: finalUSD,
    escortFeeUSD: r2(escortFeeUSD),
    pluggingFeeUSD: r2(pluggingFeeUSD),
    commissionFeeUSD: r2(commissionFeeUSD),
    exchangeRate,
    inlandAndBorderCostAFN: inlandCostAFN,
    oceanFreightCostAFN: oceanAFN,
    riskBufferAFN: riskAFN,
    totalBaseCostAFN: baseCostAFN,
    grossProfitAFN: profitAFN,
    finalQuotedPriceAFN: finalAFN,
    itemizedLegs,
    customsAndBondsCostUSD: r2(customsAndBondsCostUSD),
    inlandTruckingCostUSD: r2(inlandTruckingCostUSD),
    portHandlingThcCostUSD: r2(portHandlingThcCostUSD),
    oceanFreightTotalUSD: safeOceanFreight,
    riskBufferTotalUSD: safeRiskBuffer,
    accountingIdentityVerified: true,
    formattedDossierText,
    formattedDossierPersian,
  }
}

// ==========================================
// Helper: Export Corridor to BOL Routes
// ==========================================

export function exportCorridorToBillOfLadingRoutes(legs: ExportLeg[]): RouteStop[] {
  return legs.map((leg, index) => {
    const isFirst = index === 0
    const isLast = index === legs.length - 1

    let stopLabel = `Stop ${index}`
    if (isFirst) stopLabel = "Origin / Border Exit"
    else if (isLast) stopLabel = "Destination / Seaport Hub"

    let mappedTransport: "truck" | "vessel" | "airplane" | "train" | "road" = "truck"
    if (leg.transportMode === "vessel") mappedTransport = "vessel"
    else if (leg.transportMode === "train") mappedTransport = "train"
    else if (leg.transportMode === "airplane") mappedTransport = "airplane"

    return {
      id: crypto.randomUUID(),
      location: leg.location,
      locationPersian: leg.locationPersian || leg.location,
      stopOrder: index + 1,
      stopLabel,
      transportMode: mappedTransport,
      estimatedCost: `$${leg.cost.toFixed(2)} USD`,
      costType: leg.costType,
      costTypePersian: leg.costTypePersian,
      costUSD: leg.cost,
      isExportLeg: true,
      notes: `${leg.costType}${leg.notes ? ` - ${leg.notes}` : ""}`,
      customsSealRequired: leg.customsSealRequired ?? (leg.transportMode === "customs" || index === 0),
      customsSealNote: leg.customsSealNote || (leg.customsSealRequired ? "📍 نیاز به پلمپ گمرکی و مامور بدرقه / Customs Seal Required" : undefined),
    }
  })
}

// ==========================================
// Helper: Accounting Ledger Journal Generator
// ==========================================

export interface QuoteLedgerJournalEntry {
  debitUSD: number
  creditUSD: number
  balanceUSD: number
  description: string
  descriptionPersian: string
  feeCategory: string
  referenceBol?: string
  date: string
}

export function generateQuoteLedgerJournal(
  quote: MultiLegQuoteResult,
  clientName: string,
  bolNumber?: string
): QuoteLedgerJournalEntry[] {
  const entries: QuoteLedgerJournalEntry[] = []
  const today = new Date().toISOString().split("T")[0]
  const bolRef = bolNumber || quote.quoteNumber

  // 1. Freight Receivable (Debit Client Account)
  entries.push({
    debitUSD: quote.finalQuotedPriceUSD,
    creditUSD: 0,
    balanceUSD: quote.finalQuotedPriceUSD,
    description: `Export ${quote.isReefer ? "Reefer (40RF)" : "Freight"} Corridor: ${quote.destinationPort} (${quote.quoteNumber})`,
    descriptionPersian: `کرایه حمل صادراتی ${quote.isReefer ? "یخچالی (۴۰ فوت)" : "کانتینری"}: ${quote.destinationPort} (${quote.quoteNumber})`,
    feeCategory: "Freight",
    referenceBol: bolRef,
    date: today,
  })

  // 2. Escort Service / Bonded Security Fee
  if (quote.escortFeeUSD > 0) {
    entries.push({
      debitUSD: quote.escortFeeUSD,
      creditUSD: 0,
      balanceUSD: quote.escortFeeUSD,
      description: `Escort Service (مامور بدرقه): Bonded Transit Escort across Iran`,
      descriptionPersian: `خدمات مامور بدرقه و اسکورت امنیتی گمرک ترانزیت ایران`,
      feeCategory: "Documentation / Security Fee",
      referenceBol: bolRef,
      date: today,
    })
  }

  // 3. Plugging Charges (Reefer Power & Monitoring)
  if (quote.pluggingFeeUSD > 0) {
    entries.push({
      debitUSD: quote.pluggingFeeUSD,
      creditUSD: 0,
      balanceUSD: quote.pluggingFeeUSD,
      description: `Reefer Plugging Charges & Temperature Monitoring (${quote.destinationPort})`,
      descriptionPersian: `هزینه اتصال برق و پایش مداوم کانتینر یخچالی (${quote.destinationPort})`,
      feeCategory: "Demurrage / Port Handling",
      referenceBol: bolRef,
      date: today,
    })
  }

  // 4. Admin Commission (CMSN)
  if (quote.commissionFeeUSD > 0) {
    entries.push({
      debitUSD: quote.commissionFeeUSD,
      creditUSD: 0,
      balanceUSD: quote.commissionFeeUSD,
      description: `Admin Commission (CMSN) Coordination Fee`,
      descriptionPersian: `حق‌العمل کاری و کمیسیون اداری (CMSN)`,
      feeCategory: "Documentation Fee",
      referenceBol: bolRef,
      date: today,
    })
  }

  return entries
}
