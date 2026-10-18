/**
 * Test Suite: Rates, Quotations & Freight Pricing Center
 * Phase 18 verification for Sky Ariana Limited
 */

const test = require('node:test')
const assert = require('node:assert')

// ============================================================================
// REPLICATE CORE ALGORITHMIC LOGIC FOR DIRECT NODE VERIFICATION
// ============================================================================

const SEED_RATES = [
  {
    id: 'rate-gen-40hc',
    rateCode: 'RATE-GEN-40HC',
    name: 'General Bandar Abbas to Kabul 40HC',
    rateType: 'SELL_RATE',
    originName: 'Bandar Abbas',
    destinationName: 'Kabul',
    routeId: 'rt-bnd-kbl',
    containerType: '40HC',
    currency: 'USD',
    baseBuyRate: 4600,
    baseSellRate: 5350,
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    isActive: true,
  },
  {
    id: 'rate-cust-alokozay-40hc',
    rateCode: 'RATE-ALOKOZAY-40HC',
    name: 'Alokozay Contract 40HC',
    rateType: 'CONTRACT_RATE',
    customerId: 'cust-alokozay',
    customerName: 'Alokozay Ltd',
    originName: 'Bandar Abbas',
    destinationName: 'Kabul',
    routeId: 'rt-bnd-kbl',
    containerType: '40HC',
    currency: 'USD',
    baseBuyRate: 4500,
    baseSellRate: 5100, // Special discount contract
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    isActive: true,
  },
  {
    id: 'rate-expired-40rf',
    rateCode: 'RATE-EXP-40RF',
    name: 'Expired 40RF Rate',
    rateType: 'SELL_RATE',
    originName: 'Nhava Sheva',
    destinationName: 'Kabul',
    routeId: 'rt-nsa-kbl',
    containerType: '40RF',
    currency: 'USD',
    baseBuyRate: 9000,
    baseSellRate: 10500,
    validFrom: '2025-01-01',
    validUntil: '2025-12-31', // Already expired
    isActive: true,
  },
]

function findMatchingRates(criteria, rates = SEED_RATES) {
  const today = criteria.date || '2026-03-22'
  const matchedActive = []
  const matchedExpired = []

  for (const rate of rates) {
    if (!rate.isActive) continue

    if (criteria.containerType && rate.containerType !== criteria.containerType) {
      continue
    }

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
    }

    if (!routeMatches) continue

    // Customer Isolation Check
    if (rate.customerId && rate.customerId !== criteria.customerId) {
      continue
    }

    const isExpired = rate.validUntil && rate.validUntil < today
    if (isExpired) {
      matchedExpired.push(rate)
    } else {
      matchedActive.push(rate)
    }
  }

  let recommendedRate = undefined
  let matchSource = 'NONE'

  if (criteria.customerId) {
    const contractRate = matchedActive.find(
      (r) => r.customerId === criteria.customerId && r.rateType === 'CONTRACT_RATE'
    )
    if (contractRate) {
      recommendedRate = contractRate
      matchSource = 'CUSTOMER_CONTRACT'
    }
  }

  if (!recommendedRate && matchedActive.length > 0) {
    const routeMatch = matchedActive.find(
      (r) => r.routeId && r.containerType === criteria.containerType
    )
    if (routeMatch) {
      recommendedRate = routeMatch
      matchSource = 'ROUTE_CONTAINER'
    } else {
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

function calculatePricingTotals(lines, discountType, discountValue, containerQuantity = 1) {
  let totalBuyCost = 0
  let grossSellPrice = 0

  for (const line of lines) {
    if (line.isOptional) continue
    const qty = line.quantity || 1
    totalBuyCost += (line.buyAmount || 0) * qty
    grossSellPrice += (line.sellAmount || 0) * qty
  }

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

function createQuotationRevision(existingQuote) {
  return {
    ...JSON.parse(JSON.stringify(existingQuote)),
    id: `qt-${Date.now()}`,
    revision: existingQuote.revision + 1,
    status: 'DRAFT',
    sentDate: undefined,
    acceptedDate: undefined,
  }
}

function generateCustomerSafeWhatsApp(quote) {
  // CRITICAL SECURITY TEST: Ensure no buy costs or margins leak
  const curr = quote.currency || 'USD'
  const total = quote.totalSellPrice.toLocaleString()

  return (
`FREIGHT QUOTATION — SKY ARIANA LIMITED
Quotation Ref: ${quote.quotationNumber}
Customer: ${quote.customerName}
Routing: ${quote.originName} to ${quote.destinationName}
Equipment: ${quote.containerQuantity} x ${quote.containerType}
Total Quoted Rate: ${curr} ${total}
Valid Until: ${quote.validUntil}`
  )
}

function convertQuotationToShipment(quote) {
  if (quote.convertedShipmentId) {
    return { success: false, error: 'Already converted' }
  }
  const shipmentId = `SHP-SA-26-${Math.floor(1000 + Math.random() * 9000)}`
  return {
    success: true,
    shipmentId,
    bolNumber: shipmentId.replace('SHP-', ''),
    updatedQuote: {
      ...quote,
      status: 'CONVERTED',
      convertedShipmentId: shipmentId,
      convertedAt: new Date().toISOString(),
    },
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

test('1. Deterministic Rate Precedence: Customer Contract overrides General Rate', () => {
  // Query with Customer ID for Alokozay
  const matchWithCustomer = findMatchingRates({
    routeId: 'rt-bnd-kbl',
    containerType: '40HC',
    customerId: 'cust-alokozay',
  })

  assert.strictEqual(matchWithCustomer.matchSource, 'CUSTOMER_CONTRACT')
  assert.strictEqual(matchWithCustomer.recommendedRate.id, 'rate-cust-alokozay-40hc')
  assert.strictEqual(matchWithCustomer.recommendedRate.baseSellRate, 5100)

  // Query without Customer ID gets general rate
  const matchGeneral = findMatchingRates({
    routeId: 'rt-bnd-kbl',
    containerType: '40HC',
  })

  assert.strictEqual(matchGeneral.matchSource, 'ROUTE_CONTAINER')
  assert.strictEqual(matchGeneral.recommendedRate.id, 'rate-gen-40hc')
  assert.strictEqual(matchGeneral.recommendedRate.baseSellRate, 5350)
})

test('2. Customer Isolation: Customer A rate does NOT leak to Customer B', () => {
  const matchOtherCustomer = findMatchingRates({
    routeId: 'rt-bnd-kbl',
    containerType: '40HC',
    customerId: 'cust-different-company',
  })

  // Must NOT match Alokozay contract rate!
  assert.notStrictEqual(matchOtherCustomer.recommendedRate.id, 'rate-cust-alokozay-40hc')
  assert.strictEqual(matchOtherCustomer.recommendedRate.id, 'rate-gen-40hc')
})

test('3. Expired Rate Exclusion: Expired rates are excluded from active suggestions', () => {
  const matchResult = findMatchingRates({
    routeId: 'rt-nsa-kbl',
    containerType: '40RF',
    date: '2026-03-22',
  })

  // Active matches must be empty for 40RF because rate-expired-40rf expired in 2025
  assert.strictEqual(matchResult.activeMatches.length, 0)
  assert.strictEqual(matchResult.expiredMatches.length, 1)
  assert.strictEqual(matchResult.expiredMatches[0].id, 'rate-expired-40rf')
  assert.strictEqual(matchResult.recommendedRate, undefined)
})

test('4. Estimated Gross Margin & Discount Arithmetic', () => {
  const lines = [
    { chargeName: 'Ocean Freight', buyAmount: 2000, sellAmount: 2500, quantity: 2 },
    { chargeName: 'Road Freight', buyAmount: 3000, sellAmount: 3600, quantity: 2 },
    { chargeName: 'Docs Fee', buyAmount: 200, sellAmount: 300, quantity: 1 },
    { chargeName: 'Optional Insurance', buyAmount: 500, sellAmount: 600, quantity: 1, isOptional: true },
  ]

  // Buy Cost = (2000*2) + (3000*2) + (200*1) = 4000 + 6000 + 200 = 10,200
  // Gross Sell = (2500*2) + (3600*2) + (300*1) = 5000 + 7200 + 300 = 12,500
  // Discount = $500
  // Total Sell = 12,500 - 500 = 12,000
  // Estimated Gross Margin = 12,000 - 10,200 = 1,800
  // Margin % = (1800 / 12000) * 100 = 15.00%
  const totals = calculatePricingTotals(lines, 'FIXED', 500, 2)

  assert.strictEqual(totals.totalBuyCost, 10200)
  assert.strictEqual(totals.grossSellPrice, 12500)
  assert.strictEqual(totals.discountAmount, 500)
  assert.strictEqual(totals.totalSellPrice, 12000)
  assert.strictEqual(totals.estimatedGrossMargin, 1800)
  assert.strictEqual(totals.marginPercentage, 15.00)
})

test('5. Customer Safety Invariant: Customer WhatsApp text never leaks buy rate or margin', () => {
  const testQuote = {
    quotationNumber: 'SA-QT-2026-00042',
    customerName: 'Haji Wase Limited',
    originName: 'Bandar Abbas',
    destinationName: 'Kabul',
    containerQuantity: 2,
    containerType: '40HC',
    currency: 'USD',
    totalSellPrice: 12000,
    totalBuyCost: 10200, // INTERNAL
    estimatedGrossMargin: 1800, // INTERNAL
    validUntil: '2026-04-15',
  }

  const whatsappText = generateCustomerSafeWhatsApp(testQuote)

  // Must contain selling price and customer name
  assert.match(whatsappText, /12,000/)
  assert.match(whatsappText, /Haji Wase Limited/)

  // STRICT INVARIANT: Must NOT contain buy cost 10,200 or margin 1,800!
  assert.doesNotMatch(whatsappText, /10,200/)
  assert.doesNotMatch(whatsappText, /10200/)
  assert.doesNotMatch(whatsappText, /1,800/)
  assert.doesNotMatch(whatsappText, /1800/)
  assert.doesNotMatch(whatsappText, /margin/i)
  assert.doesNotMatch(whatsappText, /buy/i)
})

test('6. Quotation Revision Manager: Preserves Rev 1 when creating Rev 2', () => {
  const quoteRev1 = {
    id: 'qt-101',
    quotationNumber: 'SA-QT-2026-00100',
    revision: 1,
    status: 'SENT',
    totalSellPrice: 9500,
  }

  const quoteRev2 = createQuotationRevision(quoteRev1)

  assert.strictEqual(quoteRev1.revision, 1)
  assert.strictEqual(quoteRev1.status, 'SENT')

  assert.strictEqual(quoteRev2.revision, 2)
  assert.strictEqual(quoteRev2.status, 'DRAFT')
  assert.strictEqual(quoteRev2.quotationNumber, 'SA-QT-2026-00100')
  assert.notStrictEqual(quoteRev2.id, quoteRev1.id)
})

test('7. Quotation-to-Shipment Conversion: Generates shipment reference and blocks duplicate conversion', () => {
  const initialQuote = {
    id: 'qt-200',
    quotationNumber: 'SA-QT-2026-00200',
    status: 'ACCEPTED',
    totalSellPrice: 14800,
  }

  // 1st conversion: Should succeed
  const result1 = convertQuotationToShipment(initialQuote)
  assert.strictEqual(result1.success, true)
  assert.ok(result1.shipmentId.startsWith('SHP-SA-26-'))
  assert.strictEqual(result1.updatedQuote.status, 'CONVERTED')
  assert.strictEqual(result1.updatedQuote.convertedShipmentId, result1.shipmentId)

  // 2nd conversion on already converted quote: Must be blocked
  const result2 = convertQuotationToShipment(result1.updatedQuote)
  assert.strictEqual(result2.success, false)
  assert.match(result2.error, /already converted/i)
})
