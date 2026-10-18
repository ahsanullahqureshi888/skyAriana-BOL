import {
  RateMasterRecord,
  QuotationRecord,
  PricingChargeLine,
  ContainerType,
  ServiceType,
  ChargeMasterItem,
} from '@/lib/types/freight-pricing'

// ============================================================================
// DEFAULT CHARGE MASTER
// ============================================================================

export const DEFAULT_CHARGE_TYPES: ChargeMasterItem[] = [
  { code: 'OCEAN_FREIGHT', name: 'Ocean Freight (Main Carriage)', category: 'FREIGHT', defaultCurrency: 'USD', defaultUnit: 'PER_CONTAINER' },
  { code: 'ROAD_FREIGHT', name: 'Inland Road Trucking', category: 'FREIGHT', defaultCurrency: 'USD', defaultUnit: 'PER_CONTAINER' },
  { code: 'AIR_FREIGHT', name: 'Air Cargo Freight', category: 'FREIGHT', defaultCurrency: 'USD', defaultUnit: 'PER_KG' },
  { code: 'DOCS_FEE', name: 'Documentation & BL Issuance', category: 'DOCUMENTATION', defaultCurrency: 'USD', defaultUnit: 'PER_SHIPMENT' },
  { code: 'CUSTOMS_PROCESSING', name: 'Customs Clearance & Transit Bond', category: 'CUSTOMS', defaultCurrency: 'USD', defaultUnit: 'PER_SHIPMENT' },
  { code: 'BORDER_HANDLING', name: 'Border Station Cross-Docking & Escort', category: 'TERMINAL', defaultCurrency: 'USD', defaultUnit: 'PER_CONTAINER' },
  { code: 'THC_PORT', name: 'Terminal Handling Charge (THC)', category: 'TERMINAL', defaultCurrency: 'USD', defaultUnit: 'PER_CONTAINER' },
  { code: 'VGM_SEAL', name: 'VGM & High-Security Seal Fee', category: 'DOCUMENTATION', defaultCurrency: 'USD', defaultUnit: 'PER_CONTAINER' },
  { code: 'REEFER_PLUGIN', name: 'Reefer Monitoring & Electricity Plug-In', category: 'REEFER', defaultCurrency: 'USD', defaultUnit: 'PER_CONTAINER' },
  { code: 'REEFER_GENSET', name: 'Clip-On Genset & Fuel Surcharge', category: 'REEFER', defaultCurrency: 'USD', defaultUnit: 'PER_CONTAINER' },
  { code: 'CARGO_INSURANCE', name: 'Marine & Inland Cargo Insurance', category: 'OTHER', defaultCurrency: 'USD', defaultUnit: 'PER_SHIPMENT' },
]

// ============================================================================
// CANONICAL SEED RATES (REGIONAL LOGISTICS CORRIDORS)
// ============================================================================

export const SEED_RATES: RateMasterRecord[] = [
  {
    id: 'rate-nsa-kbl-40rf',
    rateCode: 'RATE-NSA-KBL-40RF',
    name: 'Nhava Sheva to Kabul Multimodal Reefer (40RF)',
    rateType: 'SELL_RATE',
    originName: 'Nhava Sheva (JNPT), India',
    destinationName: 'Kabul ICD, Afghanistan',
    viaLocations: ['Bandar Abbas Port', 'Islam Qala Border', 'Herat'],
    routeId: 'rt-nsa-kbl-multimodal',
    routeName: 'Nhava Sheva (JNPT) to Kabul Multimodal',
    transportMode: 'MULTIMODAL',
    serviceType: 'FULL_WAY',
    containerType: '40RF',
    rateUnit: 'PER_CONTAINER',
    currency: 'USD',
    baseBuyRate: 9800,
    baseSellRate: 11400,
    charges: [
      {
        id: 'c-1',
        chargeCode: 'OCEAN_FREIGHT',
        chargeName: 'Ocean Freight (Nhava Sheva to Bandar Abbas)',
        category: 'FREIGHT',
        buyAmount: 2600,
        sellAmount: 3100,
        currency: 'USD',
        quantity: 1,
        unit: 'PER_CONTAINER',
      },
      {
        id: 'c-2',
        chargeCode: 'ROAD_FREIGHT',
        chargeName: 'Transit Road Trucking (Bandar Abbas to Kabul ICD)',
        category: 'FREIGHT',
        buyAmount: 5800,
        sellAmount: 6600,
        currency: 'USD',
        quantity: 1,
        unit: 'PER_CONTAINER',
      },
      {
        id: 'c-3',
        chargeCode: 'REEFER_GENSET',
        chargeName: 'Diesel Genset & Temperature Maintenance (-18°C)',
        category: 'REEFER',
        buyAmount: 900,
        sellAmount: 1100,
        currency: 'USD',
        quantity: 1,
        unit: 'PER_CONTAINER',
      },
      {
        id: 'c-4',
        chargeCode: 'DOCS_FEE',
        chargeName: 'Documentation & Transit Guarantee Bond',
        category: 'DOCUMENTATION',
        buyAmount: 500,
        sellAmount: 600,
        currency: 'USD',
        quantity: 1,
        unit: 'PER_SHIPMENT',
        isIncludedInFreight: true,
      },
    ],
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    supplierName: 'Maersk / Ariana Overland Fleet',
    reeferDetails: {
      temperatureRange: '-18°C to -22°C',
      plugInIncluded: true,
      gensetIncluded: true,
      monitoringIncluded: true,
    },
    freeDays: 14,
    notes: 'Premium refrigerated reefer corridor for fresh fruit, dairy, and pharmaceuticals.',
    version: 1,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rate-bnd-kbl-40hc',
    rateCode: 'RATE-BND-KBL-40HC',
    name: 'Bandar Abbas to Kabul 40HC Road Transit',
    rateType: 'SELL_RATE',
    originName: 'Bandar Abbas Port, Iran',
    destinationName: 'Kabul ICD, Afghanistan',
    viaLocations: ['Islam Qala Border', 'Herat', 'Kandahar'],
    routeId: 'rt-bnd-kbl-via-isl',
    routeName: 'Bandar Abbas to Kabul via Islam Qala',
    transportMode: 'TRUCK',
    serviceType: 'PORT_TO_DOOR',
    containerType: '40HC',
    rateUnit: 'PER_CONTAINER',
    currency: 'USD',
    baseBuyRate: 4600,
    baseSellRate: 5350,
    charges: [
      {
        id: 'c-bnd-1',
        chargeCode: 'ROAD_FREIGHT',
        chargeName: 'Inland Trucking (Shahid Rajaee to Kabul ICD)',
        category: 'FREIGHT',
        buyAmount: 4200,
        sellAmount: 4850,
        currency: 'USD',
        quantity: 1,
        unit: 'PER_CONTAINER',
      },
      {
        id: 'c-bnd-2',
        chargeCode: 'BORDER_HANDLING',
        chargeName: 'Islam Qala Border Clearance & Transit Documentation',
        category: 'CUSTOMS',
        buyAmount: 400,
        sellAmount: 500,
        currency: 'USD',
        quantity: 1,
        unit: 'PER_SHIPMENT',
      },
    ],
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    supplierName: 'Herat Transport Co-op',
    freeDays: 10,
    notes: 'Standard high cube commercial dry cargo container pricing.',
    version: 1,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rate-khi-kdh-40hc',
    rateCode: 'RATE-KHI-KDH-40HC',
    name: 'Karachi Port to Kandahar via Spin Boldak (40HC)',
    rateType: 'SELL_RATE',
    originName: 'Karachi Port, Pakistan',
    destinationName: 'Kandahar Customs Depot, Afghanistan',
    viaLocations: ['Quetta', 'Chaman', 'Spin Boldak Border'],
    routeId: 'rt-khi-kdh-via-spi',
    routeName: 'Karachi Port to Kandahar via Spin Boldak',
    transportMode: 'TRUCK',
    serviceType: 'PORT_TO_DOOR',
    containerType: '40HC',
    rateUnit: 'PER_CONTAINER',
    currency: 'USD',
    baseBuyRate: 3100,
    baseSellRate: 3650,
    charges: [
      {
        id: 'c-khi-1',
        chargeCode: 'ROAD_FREIGHT',
        chargeName: 'ATT Road Transit (Karachi to Kandahar)',
        category: 'FREIGHT',
        buyAmount: 2800,
        sellAmount: 3300,
        currency: 'USD',
        quantity: 1,
        unit: 'PER_CONTAINER',
      },
      {
        id: 'c-khi-2',
        chargeCode: 'BORDER_HANDLING',
        chargeName: 'Chaman / Spin Boldak Gate Processing',
        category: 'TERMINAL',
        buyAmount: 300,
        sellAmount: 350,
        currency: 'USD',
        quantity: 1,
        unit: 'PER_SHIPMENT',
      },
    ],
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    supplierName: 'NLC Logistics',
    freeDays: 7,
    notes: 'Direct southern route for transit cargo.',
    version: 1,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rate-dxb-kbl-air',
    rateCode: 'RATE-DXB-KBL-AIR',
    name: 'Dubai (DXB) to Kabul (KBL) Air Cargo per KG',
    rateType: 'SELL_RATE',
    originName: 'Dubai International Airport (DXB)',
    destinationName: 'Kabul International Airport (KBL)',
    transportMode: 'AIR',
    serviceType: 'PORT_TO_PORT',
    containerType: '40GP',
    rateUnit: 'PER_KG',
    currency: 'USD',
    baseBuyRate: 2.1,
    baseSellRate: 2.75,
    charges: [
      {
        id: 'c-air-1',
        chargeCode: 'AIR_FREIGHT',
        chargeName: 'Air Cargo Rate (+500 KG Tier)',
        category: 'FREIGHT',
        buyAmount: 2.1,
        sellAmount: 2.75,
        currency: 'USD',
        quantity: 1,
        unit: 'PER_KG',
      },
    ],
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    supplierName: 'Kam Air Cargo / Ariana Afghan Airlines',
    notes: 'Express air charter & scheduled consolidation.',
    version: 1,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

// ============================================================================
// SAMPLE SEED QUOTATIONS
// ============================================================================

export const SEED_QUOTATIONS: QuotationRecord[] = [
  {
    id: 'qt-2026-001',
    quotationNumber: 'SA-QT-2026-00042',
    revision: 1,
    customerName: 'HAJI ABDUL WASE KHAN ALOKOZAY LIMITED',
    customerContact: 'Haji Abdul Wase',
    customerPhone: '+93 79 912 3456',
    customerAddress: 'Kabul Commercial Center, District 4, Kabul',
    date: '2026-03-01',
    validUntil: '2026-04-15',
    originName: 'Nhava Sheva (JNPT), India',
    destinationName: 'Kabul ICD, Afghanistan',
    viaLocations: ['Bandar Abbas', 'Islam Qala Border'],
    routeId: 'rt-nsa-kbl-multimodal',
    routeName: 'Nhava Sheva (JNPT) to Kabul Multimodal',
    commodity: 'Fresh Black Tea & Spices',
    containerType: '40HC',
    containerQuantity: 2,
    serviceType: 'FULL_WAY',
    currency: 'USD',
    pricingLines: [
      {
        id: 'pl-1',
        chargeCode: 'OCEAN_FREIGHT',
        chargeName: 'Ocean Freight (Nhava Sheva to Bandar Abbas)',
        category: 'FREIGHT',
        buyAmount: 2200,
        sellAmount: 2600,
        currency: 'USD',
        quantity: 2,
        unit: 'PER_CONTAINER',
      },
      {
        id: 'pl-2',
        chargeCode: 'ROAD_FREIGHT',
        chargeName: 'Road Trucking (Bandar Abbas to Kabul ICD)',
        category: 'FREIGHT',
        buyAmount: 4200,
        sellAmount: 4900,
        currency: 'USD',
        quantity: 2,
        unit: 'PER_CONTAINER',
      },
      {
        id: 'pl-3',
        chargeCode: 'DOCS_FEE',
        chargeName: 'Documentation & BL Issuance',
        category: 'DOCUMENTATION',
        buyAmount: 200,
        sellAmount: 250,
        currency: 'USD',
        quantity: 1,
        unit: 'PER_SHIPMENT',
        isIncludedInFreight: true,
      },
    ],
    discountType: 'FIXED',
    discountValue: 200,
    discountAmount: 200,
    totalSellPrice: 14800, // (2600*2 + 4900*2) - 200 = 15000 - 200 = 14800
    totalBuyCost: 13000,   // (2200*2 + 4200*2) + 200 docs = 13000
    estimatedGrossMargin: 1800,
    marginPercentage: 12.16,
    terms: [
      'Rate validity subject to ocean carrier schedule confirmation.',
      'Includes 14 days free demurrage at destination.',
      'Destination customs import duties and taxes are strictly excluded.',
    ],
    includedServices: ['Ocean Freight', 'Port Transshipment', 'Border Transit Bond', 'Road Trucking to Kabul ICD'],
    excludedServices: ['Afghanistan Import Customs Duties', 'Terminal Storage beyond Free Days'],
    status: 'ACCEPTED',
    notes: 'Agreed commercial rate for seasonal tea shipment.',
    createdBy: 'operations',
    approvedBy: 'management',
    sentDate: '2026-03-01T10:00:00.000Z',
    acceptedDate: '2026-03-03T14:30:00.000Z',
    createdAt: '2026-03-01T09:00:00.000Z',
    updatedAt: '2026-03-03T14:30:00.000Z',
  },
]

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class FreightPricingService {
  private static instance: FreightPricingService
  private rates: RateMasterRecord[] = []
  private quotations: QuotationRecord[] = []
  private chargeTypes: ChargeMasterItem[] = []
  private isInitialized = false

  private constructor() {
    this.init()
  }

  public static getInstance(): FreightPricingService {
    if (!FreightPricingService.instance) {
      FreightPricingService.instance = new FreightPricingService()
    }
    return FreightPricingService.instance
  }

  private init() {
    if (this.isInitialized) return
    this.rates = [...SEED_RATES]
    this.quotations = [...SEED_QUOTATIONS]
    this.chargeTypes = [...DEFAULT_CHARGE_TYPES]
    this.loadFromLocalStorage()
    this.isInitialized = true
  }

  private loadFromLocalStorage() {
    if (typeof window === 'undefined') return
    try {
      const storedRates = window.localStorage.getItem('skybol:rate-master')
      if (storedRates) {
        const parsed = JSON.parse(storedRates)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, RateMasterRecord>()
          for (const s of SEED_RATES) map.set(s.id, s)
          for (const p of parsed) map.set(p.id, p)
          this.rates = Array.from(map.values())
        }
      }

      const storedQuotes = window.localStorage.getItem('skybol:quotations')
      if (storedQuotes) {
        const parsed = JSON.parse(storedQuotes)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, QuotationRecord>()
          for (const s of SEED_QUOTATIONS) map.set(s.id, s)
          for (const p of parsed) map.set(p.id, p)
          this.quotations = Array.from(map.values())
        }
      }

      const storedCharges = window.localStorage.getItem('skybol:pricing-charge-master')
      if (storedCharges) {
        const parsed = JSON.parse(storedCharges)
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.chargeTypes = parsed
        }
      }
    } catch (e) {
      console.warn('[FreightPricingService] Error loading localStorage:', e)
    }
  }

  private saveToLocalStorage() {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('skybol:rate-master', JSON.stringify(this.rates))
      window.localStorage.setItem('skybol:quotations', JSON.stringify(this.quotations))
      window.localStorage.setItem('skybol:pricing-charge-master', JSON.stringify(this.chargeTypes))
      window.dispatchEvent(new CustomEvent('skybol:rates-updated', { detail: { count: this.rates.length } }))
    } catch (e) {
      console.warn('[FreightPricingService] Error saving localStorage:', e)
    }
  }

  // --- RATE MASTER OPERATIONS ---

  public getRates(): RateMasterRecord[] {
    return [...this.rates]
  }

  public getRateById(id: string): RateMasterRecord | undefined {
    return this.rates.find((r) => r.id === id)
  }

  /**
   * Deterministic Rate Precedence Engine:
   * 1. Exact Customer Contract
   * 2. Customer-Specific Rate
   * 3. Route + Container Specific Rate
   * 4. General Corridor Rate
   * Invariant: Expired rates are excluded from active matching!
   */
  public findMatchingRates(criteria: {
    originName?: string
    destinationName?: string
    routeId?: string
    containerType?: ContainerType
    serviceType?: ServiceType
    customerId?: string
    date?: string // defaults to today
  }): {
    activeMatches: RateMasterRecord[]
    expiredMatches: RateMasterRecord[]
    recommendedRate?: RateMasterRecord
    matchSource?: 'CUSTOMER_CONTRACT' | 'CUSTOMER_SPECIFIC' | 'ROUTE_CONTAINER' | 'GENERAL' | 'NONE'
  } {
    const today = criteria.date || new Date().toISOString().split('T')[0]
    const matchedActive: RateMasterRecord[] = []
    const matchedExpired: RateMasterRecord[] = []

    for (const rate of this.rates) {
      if (!rate.isActive) continue

      // Filter by container type if specified
      if (criteria.containerType && rate.containerType !== criteria.containerType) {
        continue
      }

      // Filter by service type if specified
      if (criteria.serviceType && rate.serviceType !== criteria.serviceType) {
        continue
      }

      // Check route or origin/dest match
      let routeMatches = false
      if (criteria.routeId && rate.routeId && criteria.routeId === rate.routeId) {
        routeMatches = true
      } else if (
        criteria.originName &&
        criteria.destinationName &&
        rate.originName.toLowerCase().includes(criteria.originName.toLowerCase()) &&
        rate.destinationName.toLowerCase().includes(criteria.destinationName.toLowerCase())
      ) {
        routeMatches = true
      } else if (!criteria.routeId && !criteria.originName) {
        routeMatches = true
      }

      if (!routeMatches) continue

      // Customer isolation check: If rate is customer-specific, it MUST NOT match a different customer!
      if (rate.customerId && rate.customerId !== criteria.customerId) {
        continue
      }

      // Check validity date
      const isExpired = rate.validUntil && rate.validUntil < today
      if (isExpired) {
        matchedExpired.push(rate)
      } else {
        matchedActive.push(rate)
      }
    }

    // Determine highest precedence recommended rate
    let recommendedRate: RateMasterRecord | undefined
    let matchSource: 'CUSTOMER_CONTRACT' | 'CUSTOMER_SPECIFIC' | 'ROUTE_CONTAINER' | 'GENERAL' | 'NONE' = 'NONE'

    if (criteria.customerId) {
      // 1. Check for contract rate for this customer
      const contractRate = matchedActive.find(
        (r) => r.customerId === criteria.customerId && r.rateType === 'CONTRACT_RATE'
      )
      if (contractRate) {
        recommendedRate = contractRate
        matchSource = 'CUSTOMER_CONTRACT'
      } else {
        // 2. Check for customer-specific sell rate
        const custRate = matchedActive.find(
          (r) => r.customerId === criteria.customerId || r.rateType === 'CUSTOMER_RATE'
        )
        if (custRate) {
          recommendedRate = custRate
          matchSource = 'CUSTOMER_SPECIFIC'
        }
      }
    }

    if (!recommendedRate && matchedActive.length > 0) {
      // 3. Route + Container match
      const routeMatch = matchedActive.find(
        (r) => r.routeId && r.containerType === criteria.containerType
      )
      if (routeMatch) {
        recommendedRate = routeMatch
        matchSource = 'ROUTE_CONTAINER'
      } else {
        // 4. General match
        recommendedRate = matchedActive[0]
        matchSource = 'GENERAL'
      }
    }

    return {
      activeMatches: matchedActive,
      expiredMatches: matchedExpired,
      recommendedRate,
      matchSource,
    }
  }

  public createRate(data: Omit<RateMasterRecord, 'id' | 'createdAt' | 'updatedAt' | 'version'>): RateMasterRecord {
    const newRate: RateMasterRecord = {
      ...data,
      id: `rate-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.rates.unshift(newRate)
    this.saveToLocalStorage()
    return newRate
  }

  public updateRate(id: string, updates: Partial<RateMasterRecord>): RateMasterRecord {
    const idx = this.rates.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error(`Rate not found: ${id}`)

    const current = this.rates[idx]
    const updated: RateMasterRecord = {
      ...current,
      ...updates,
      version: (current.version || 1) + 1,
      updatedAt: new Date().toISOString(),
    }

    this.rates[idx] = updated
    this.saveToLocalStorage()
    return updated
  }

  public deleteRate(id: string): boolean {
    const prev = this.rates.length
    this.rates = this.rates.filter((r) => r.id !== id)
    if (this.rates.length !== prev) {
      this.saveToLocalStorage()
      return true
    }
    return false
  }

  // --- FINANCIAL CALCULATIONS & ARITHMETIC ---

  public calculatePricingTotals(
    lines: PricingChargeLine[],
    discountType?: 'FIXED' | 'PERCENTAGE' | 'PER_CONTAINER',
    discountValue?: number,
    containerQuantity: number = 1
  ): {
    totalBuyCost: number
    grossSellPrice: number
    discountAmount: number
    totalSellPrice: number
    estimatedGrossMargin: number
    marginPercentage: number
  } {
    let totalBuyCost = 0
    let grossSellPrice = 0

    for (const line of lines) {
      if (line.isOptional) continue // Optional lines do not count toward base total

      const qty = line.quantity || 1
      const buyLine = (line.buyAmount || 0) * qty
      const sellLine = (line.sellAmount || 0) * qty

      totalBuyCost += buyLine
      grossSellPrice += sellLine
    }

    // Compute Discount
    let discountAmount = 0
    if (discountValue && discountValue > 0) {
      if (discountType === 'PERCENTAGE') {
        discountAmount = (grossSellPrice * discountValue) / 100
      } else if (discountType === 'PER_CONTAINER') {
        discountAmount = discountValue * containerQuantity
      } else {
        discountAmount = discountValue
      }
    }

    const totalSellPrice = Math.max(0, grossSellPrice - discountAmount)
    const estimatedGrossMargin = totalSellPrice - totalBuyCost
    const marginPercentage =
      totalSellPrice > 0 ? Number(((estimatedGrossMargin / totalSellPrice) * 100).toFixed(2)) : 0

    return {
      totalBuyCost: Number(totalBuyCost.toFixed(2)),
      grossSellPrice: Number(grossSellPrice.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      totalSellPrice: Number(totalSellPrice.toFixed(2)),
      estimatedGrossMargin: Number(estimatedGrossMargin.toFixed(2)),
      marginPercentage,
    }
  }

  // --- QUOTATION OPERATIONS ---

  public getQuotations(): QuotationRecord[] {
    return [...this.quotations]
  }

  public getQuotationById(id: string): QuotationRecord | undefined {
    return this.quotations.find((q) => q.id === id)
  }

  public createQuotation(
    data: Omit<
      QuotationRecord,
      | 'id'
      | 'quotationNumber'
      | 'revision'
      | 'totalSellPrice'
      | 'totalBuyCost'
      | 'estimatedGrossMargin'
      | 'marginPercentage'
      | 'discountAmount'
      | 'createdAt'
      | 'updatedAt'
    >
  ): QuotationRecord {
    const year = new Date().getFullYear()
    const seq = Math.floor(1000 + Math.random() * 9000)
    const quoteNum = `SA-QT-${year}-${seq}`

    const totals = this.calculatePricingTotals(
      data.pricingLines,
      data.discountType,
      data.discountValue,
      data.containerQuantity
    )

    const newQuote: QuotationRecord = {
      ...data,
      id: `qt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      quotationNumber: quoteNum,
      revision: 1,
      ...totals,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.quotations.unshift(newQuote)
    this.saveToLocalStorage()
    return newQuote
  }

  public updateQuotation(id: string, updates: Partial<QuotationRecord>): QuotationRecord {
    const idx = this.quotations.findIndex((q) => q.id === id)
    if (idx === -1) throw new Error(`Quotation not found: ${id}`)

    const current = this.quotations[idx]

    // Recalculate totals if pricing lines or discount updated
    let totals = {
      totalBuyCost: current.totalBuyCost,
      totalSellPrice: current.totalSellPrice,
      discountAmount: current.discountAmount,
      estimatedGrossMargin: current.estimatedGrossMargin,
      marginPercentage: current.marginPercentage,
    }

    if (updates.pricingLines || updates.discountValue !== undefined || updates.discountType !== undefined) {
      const lines = updates.pricingLines || current.pricingLines
      const dType = updates.discountType !== undefined ? updates.discountType : current.discountType
      const dVal = updates.discountValue !== undefined ? updates.discountValue : current.discountValue
      const qty = updates.containerQuantity !== undefined ? updates.containerQuantity : current.containerQuantity
      totals = this.calculatePricingTotals(lines, dType, dVal, qty)
    }

    const updated: QuotationRecord = {
      ...current,
      ...updates,
      ...totals,
      updatedAt: new Date().toISOString(),
    }

    this.quotations[idx] = updated
    this.saveToLocalStorage()
    return updated
  }

  /**
   * Revision Generator:
   * When a sent quotation price changes, creates Rev 2 preserving Rev 1 history.
   */
  public createQuotationRevision(id: string): QuotationRecord {
    const existing = this.getQuotationById(id)
    if (!existing) throw new Error(`Quotation not found: ${id}`)

    const revised: QuotationRecord = {
      ...JSON.parse(JSON.stringify(existing)),
      id: `qt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      revision: existing.revision + 1,
      status: 'DRAFT',
      sentDate: undefined,
      acceptedDate: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.quotations.unshift(revised)
    this.saveToLocalStorage()
    return revised
  }

  public recordQuotationAcceptance(id: string): QuotationRecord {
    return this.updateQuotation(id, {
      status: 'ACCEPTED',
      acceptedDate: new Date().toISOString(),
    })
  }

  public recordQuotationRejection(id: string, reason?: string): QuotationRecord {
    return this.updateQuotation(id, {
      status: 'REJECTED',
      rejectedReason: reason || 'Customer declined pricing/terms',
    })
  }

  /**
   * Conversion Engine:
   * Converts an Accepted Quotation into an Active Shipment / BOL.
   * Invariants:
   * - Quotation must be ACCEPTED (or APPROVED).
   * - Prevents duplicate conversion.
   * - Stores pricing snapshot so future rate changes never mutate shipment revenue.
   */
  public convertQuotationToShipment(quotationId: string): {
    success: boolean
    shipmentId: string
    bolNumber: string
    message: string
  } {
    const quote = this.getQuotationById(quotationId)
    if (!quote) throw new Error(`Quotation not found: ${quotationId}`)

    if (quote.convertedShipmentId) {
      return {
        success: false,
        shipmentId: quote.convertedShipmentId,
        bolNumber: '',
        message: `Quotation already converted to shipment ${quote.convertedShipmentId}`,
      }
    }

    const year = new Date().getFullYear().toString().slice(-2)
    const seq = Math.floor(1000 + Math.random() * 9000)
    const newBolNumber = `SA-${year}-${seq}`
    const newShipmentId = `SHP-${newBolNumber}`

    // Construct BOL and Shipment Draft Objects in localStorage
    if (typeof window !== 'undefined') {
      try {
        const storedBols = window.localStorage.getItem('skybol:saved-documents')
        const currentBols = storedBols ? JSON.parse(storedBols) : []

        const newBol = {
          id: `bol-${Date.now()}`,
          bol_number: newBolNumber,
          shipper_name: quote.customerName,
          consignee_name: quote.customerName,
          cargo_description: quote.commodity || 'General Freight',
          origin_station: quote.originName,
          destination_station: quote.destinationName,
          issue_date: new Date().toISOString().split('T')[0],
          status: 'ISSUED',
          agreed_freight_usd: quote.totalSellPrice,
          quotation_reference: quote.quotationNumber,
        }

        currentBols.unshift(newBol)
        window.localStorage.setItem('skybol:saved-documents', JSON.stringify(currentBols))
        window.dispatchEvent(new CustomEvent('skybol:documents-updated', { detail: {} }))
      } catch (e) {
        console.warn('[FreightPricingService] Error writing converted BOL:', e)
      }
    }

    // Mark quotation as CONVERTED
    this.updateQuotation(quotationId, {
      status: 'CONVERTED',
      convertedShipmentId: newShipmentId,
      convertedAt: new Date().toISOString(),
    })

    return {
      success: true,
      shipmentId: newShipmentId,
      bolNumber: newBolNumber,
      message: `Quotation ${quote.quotationNumber} successfully converted to Shipment ${newShipmentId} (BOL: ${newBolNumber})`,
    }
  }

  // --- CUSTOMER-SAFE WHATSAPP GENERATOR ---

  /**
   * Generates a concise, professional WhatsApp offer for customers.
   * STRICT SAFETY INVARIANT: Buy rates, internal margins, and supplier names are completely stripped.
   */
  public generateWhatsAppOffer(
    quote: QuotationRecord,
    language: 'EN' | 'FA' | 'PS' = 'EN'
  ): string {
    const curr = quote.currency || 'USD'
    const total = quote.totalSellPrice.toLocaleString()

    if (language === 'FA') {
      return (
`*پیشنهاد قیمت حمل و نقل — شرکت بین‌المللی اسکای آریانا*
شماره پیش‌فاکتور: ${quote.quotationNumber}
مشتری گرامی: ${quote.customerName}

📍 *مسیر و نوع سرویس:*
مبدا: ${quote.originName}
مقصد: ${quote.destinationName}
نوع سرویس: ${quote.serviceType.replace('_', ' ')}
تجهیزات: ${quote.containerQuantity} × ${quote.containerType}
${quote.temperature ? `دمای مورد نیاز: ${quote.temperature}\n` : ''}
💰 *نرخ کل پیشنهادی:* ${curr} ${total}
اعتبار قیمت تا: ${quote.validUntil}

✅ *خدمات شامل:*
${quote.includedServices.length > 0 ? quote.includedServices.map((s) => `• ${s}`).join('\n') : '• کرایه حمل کامل و مدارک استاندارد'}

❌ *موارد غیر شامل:*
${quote.excludedServices.length > 0 ? quote.excludedServices.map((s) => `• ${s}`).join('\n') : '• عوارض و گمرک مقصد'}

جهت تایید پیش‌فاکتور، لطفاً به این پیام پاسخ دهید.
با تشکر، عملیات اسکای آریانا`
      )
    }

    if (language === 'PS') {
      return (
`*د بار وړلو د قیمت وړاندیز — اسکای آریانا لمیټډ*
د وړاندیز شمېره: ${quote.quotationNumber}
دروند پیرودونکی: ${quote.customerName}

📍 *مسیر او د خدمت بڼه:*
مبدا: ${quote.originName}
مقصد: ${quote.destinationName}
د خدمت بڼه: ${quote.serviceType.replace('_', ' ')}
کانټینر: ${quote.containerQuantity} × ${quote.containerType}
${quote.temperature ? `اړینه تودوخه: ${quote.temperature}\n` : ''}
💰 *ټول ټاکل شوی قیمت:* ${curr} ${total}
د اعتبار نیټه: ${quote.validUntil}

✅ *شامل خدمتونه:*
${quote.includedServices.length > 0 ? quote.includedServices.map((s) => `• ${s}`).join('\n') : '• د بار وړلو بشپړ خدمت او اسناد'}

د تایید لپاره، لطفاً په همدې واټس‌اپ پیغام راولېږئ.
مننه، اسکای آریانا لمیټډ`
      )
    }

    // Default: English
    return (
`*FREIGHT QUOTATION — SKY ARIANA LIMITED*
Quotation Ref: ${quote.quotationNumber}
Customer: ${quote.customerName}

📍 *Routing & Service Scope:*
Origin: ${quote.originName}
Destination: ${quote.destinationName}
Service Type: ${quote.serviceType.replace('_', ' ')}
Equipment: ${quote.containerQuantity} × ${quote.containerType}
${quote.temperature ? `Required Temp: ${quote.temperature}\n` : ''}
💰 *Total Quoted Freight Rate:* ${curr} ${total}
Validity: Valid until ${quote.validUntil}

✅ *Included Services:*
${quote.includedServices.length > 0 ? quote.includedServices.map((s) => `• ${s}`).join('\n') : '• Full Carriage & Standard Transport Documentation'}

❌ *Excluded:*
${quote.excludedServices.length > 0 ? quote.excludedServices.map((s) => `• ${s}`).join('\n') : '• Destination customs clearance & import taxes'}

Please reply to confirm and lock this freight rate for booking.
Thank you, Sky Ariana Logistics Operations`
    )
  }

  // --- CHARGE MASTER ---

  public getChargeMaster(): ChargeMasterItem[] {
    return [...this.chargeTypes]
  }

  public addChargeType(item: ChargeMasterItem): void {
    if (!this.chargeTypes.some((c) => c.code === item.code)) {
      this.chargeTypes.push(item)
      this.saveToLocalStorage()
    }
  }
}

export const freightPricingService = FreightPricingService.getInstance()
