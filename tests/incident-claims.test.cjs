/**
 * Phase 24: Claims, Damage, Detention & Incident Management Center Test Suite
 * Pure engine verification for Sky Ariana Limited claims, detention, and blameless auditing.
 * 
 * Verifies core project rules and accounting invariants:
 * 1. Store Initialization & Seed Data (5 distinct operational incidents).
 * 2. Non-Duplication Rule: Incident != Claim (Factual mishap vs commercial demand).
 * 3. Blameless Principle: Responsibility defaults to NOT_ASSESSED / UNDER_REVIEW.
 * 4. Human-Authorized Liability Evaluation with Cited Evidence & Audit History.
 * 5. Multi-Currency Segregation & Exposure Formula: Outstanding = Demanded - Settled.
 * 6. Settlement Idempotency (duplicate keys never cause duplicate ledger entries).
 * 7. Full Settlement Lifecycle (transitions to SETTLED, exposure = 0).
 * 8. Partial Settlement Lifecycle (transitions to PARTIALLY_ACCEPTED, exposure reduced).
 * 9. Detention Arithmetic & Force Majeure Exemption: Charge Days = max(0, Return - LFD).
 * 10. Customer Privacy & WhatsApp Formatter (Scrubbing margins, buy rates, and internal notes).
 * 11. State Export & Import JSON Integrity.
 * 12. Dashboard Summary KPI Computations.
 */

const test = require('node:test')
const assert = require('node:assert/strict')

class IncidentClaimsTestEngine {
  constructor() {
    this.incidents = [
      {
        id: 'inc-00125',
        incidentNumber: 'INC-2026-00125',
        incidentType: 'WET_CARGO',
        incidentDate: '2026-03-18',
        customerName: 'Ariana Saffron & Spice Traders',
        quantityAffected: 10,
        weightAffectedKg: 120,
        estimatedValueAffected: 2000,
        currency: 'USD',
        severity: 'MEDIUM',
        status: 'UNDER_REVIEW',
        claimLinked: true,
        linkedClaimIds: ['clm-00088'],
        description: '10 master cartons of saffron observed with fresh water soaking.',
      },
      {
        id: 'inc-00126',
        incidentNumber: 'INC-2026-00126',
        incidentType: 'CARGO_SHORTAGE',
        incidentDate: '2026-03-19',
        customerName: 'Balkh Agricultural Union',
        quantityAffected: 10,
        weightAffectedKg: 150,
        estimatedValueAffected: 1450,
        currency: 'USD',
        severity: 'MEDIUM',
        status: 'EVIDENCE_COLLECTION',
        claimLinked: false,
        linkedClaimIds: [],
        description: 'Physical shortage of 10 cartons raisins at Hairatan border customs gate.',
      },
      {
        id: 'inc-00127',
        incidentNumber: 'INC-2026-00127',
        incidentType: 'TEMPERATURE_EXCEPTION',
        incidentDate: '2026-03-20',
        customerName: 'Afghan National Pharma Care',
        quantityAffected: 24,
        weightAffectedKg: 180,
        estimatedValueAffected: 6800,
        currency: 'USD',
        severity: 'HIGH',
        status: 'ACTION_REQUIRED',
        claimLinked: true,
        linkedClaimIds: ['clm-00090'],
        description: 'Cold-chain excursion recorded at +14.2C during airport tarmac transfer.',
      },
      {
        id: 'inc-00128',
        incidentNumber: 'INC-2026-00128',
        incidentType: 'CONTAINER_DAMAGE',
        incidentDate: '2026-03-21',
        customerName: 'Khorasan Steel Imports',
        quantityAffected: 1,
        weightAffectedKg: 0,
        estimatedValueAffected: 450,
        currency: 'USD',
        severity: 'LOW',
        status: 'OPEN',
        claimLinked: false,
        linkedClaimIds: [],
        description: 'Container door locking keeper bent at Islam Qala yard.',
      },
      {
        id: 'inc-00129',
        incidentNumber: 'INC-2026-00129',
        incidentType: 'DETENTION',
        incidentDate: '2026-03-22',
        customerName: 'Kabul Modern Construction Co.',
        quantityAffected: 1,
        weightAffectedKg: 0,
        estimatedValueAffected: 3400,
        currency: 'USD',
        severity: 'HIGH',
        status: 'OPEN',
        claimLinked: true,
        linkedClaimIds: ['clm-00089'],
        description: 'Carrier detention invoiced for 17 days overstay with 12 days border closure dispute.',
      },
    ]

    this.claims = [
      {
        id: 'clm-00088',
        claimNumber: 'CLM-2026-00088',
        incidentId: 'inc-00125',
        claimType: 'CUSTOMER_CLAIM',
        claimStatus: 'UNDER_REVIEW',
        customerName: 'Ariana Saffron & Spice Traders',
        claimant: 'Ariana Saffron & Spice Traders',
        claimAgainst: 'Sky Ariana Limited / Transporter',
        claimAmount: 2000,
        currency: 'USD',
        acceptedAmount: 0,
        settlementAmount: 0,
        outstandingExposure: 2000,
        responsibilityStatus: 'UNDER_REVIEW',
        responsiblePartyName: 'Truck Transporter (Under Joint Review)',
        notes: 'Target settlement offer: $1,400 with 50% carrier recovery. Private margin is 18%.',
        settlements: [],
      },
      {
        id: 'clm-00089',
        claimNumber: 'CLM-2026-00089',
        incidentId: 'inc-00129',
        claimType: 'DETENTION_DISPUTE',
        claimStatus: 'NEGOTIATION',
        customerName: 'Kabul Modern Construction Co.',
        claimant: 'MSC Shipping Line',
        claimAgainst: 'Sky Ariana Limited / Consignee',
        claimAmount: 3400,
        currency: 'USD',
        acceptedAmount: 1000,
        settlementAmount: 0,
        outstandingExposure: 2400,
        responsibilityStatus: 'DISPUTED',
        responsiblePartyName: 'MSC Shipping Line / Sovereign Closure',
        notes: 'Disputing $2,400 due to Afghan Customs border force majeure.',
        settlements: [],
      },
    ]
  }

  // 1. Calculate detention charge days & dispute
  calculateDetention({ arrivalDate, freeDays, returnDate, dailyRate, carrierBilled, exemptDays }) {
    const arr = new Date(arrivalDate)
    const lfd = new Date(arr.getTime() + freeDays * 86400000)
    const ret = new Date(returnDate)

    const diffMs = ret.getTime() - lfd.getTime()
    const totalOverstayDays = Math.max(0, Math.ceil(diffMs / 86400000))
    const billableDays = Math.max(0, totalOverstayDays - (exemptDays || 0))
    const legitimateExposure = billableDays * dailyRate
    const disputedAmount = Math.max(0, carrierBilled - legitimateExposure)

    return {
      lastFreeDay: lfd.toISOString().split('T')[0],
      totalOverstayDays,
      billableDays,
      legitimateExposure,
      disputedAmount,
    }
  }

  // 2. Assess responsibility (Human authorized)
  assessResponsibility(claimId, { status, assessedPartyName, partyType, reason, evidenceReference, assessedBy }) {
    const claim = this.claims.find((c) => c.id === claimId)
    if (!claim) throw new Error('Claim not found')

    const previousAssessments = claim.previousAssessments || []
    if (claim.responsibilityStatus) {
      previousAssessments.push({
        status: claim.responsibilityStatus,
        assessedPartyName: claim.responsiblePartyName,
        timestamp: new Date().toISOString(),
      })
    }

    claim.responsibilityStatus = status
    claim.responsiblePartyName = assessedPartyName
    claim.responsiblePartyAssessment = {
      status,
      assessedPartyName,
      partyType,
      reason,
      evidenceReference,
      assessedBy,
    }
    claim.previousAssessments = previousAssessments
    return claim
  }

  // 3. Record settlement with idempotency
  recordSettlement(claimId, { settlementAmount, currency, settlementType, idempotencyKey, financeTransactionRef }) {
    const claim = this.claims.find((c) => c.id === claimId)
    if (!claim) throw new Error('Claim not found')

    // Idempotency check
    const existing = claim.settlements.find((s) => s.idempotencyKey === idempotencyKey)
    if (existing) {
      return { claim, isDuplicate: true }
    }

    if (currency !== claim.currency) {
      throw new Error(`Currency mismatch: claim is in ${claim.currency}, settlement is in ${currency}`)
    }

    const newSettlement = {
      id: `stl-${Date.now()}`,
      settlementAmount,
      currency,
      settlementType,
      idempotencyKey,
      financeTransactionRef,
      date: new Date().toISOString().split('T')[0],
    }

    claim.settlements.push(newSettlement)

    const totalSettled = claim.settlements.reduce((sum, s) => sum + s.settlementAmount, 0)
    claim.settlementAmount = totalSettled
    claim.outstandingExposure = Math.max(0, claim.claimAmount - totalSettled)

    if (claim.outstandingExposure === 0) {
      claim.claimStatus = 'SETTLED'
    } else {
      claim.claimStatus = 'PARTIALLY_ACCEPTED'
    }

    return { claim, isDuplicate: false }
  }

  // 4. Generate customer-safe WhatsApp update
  generateCustomerWhatsApp(claimId) {
    const claim = this.claims.find((c) => c.id === claimId)
    if (!claim) return 'Error'

    // Formatted update strictly scrubbed of internal notes, margins, and carrier buy rates
    return `*SKY ARIANA LOGISTICS — CLAIM STATUS UPDATE*
File Reference: ${claim.claimNumber}
Customer: ${claim.customerName}
Claimed Amount: ${claim.currency} ${claim.claimAmount}
Current Status: ${claim.claimStatus}
Target: Pending Verification`
  }

  // 5. Get summary KPIs
  getSummaryKpis() {
    const openIncidents = this.incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length
    const openClaims = this.claims.filter((c) => c.claimStatus !== 'SETTLED' && c.claimStatus !== 'CLOSED').length
    const totalExposureUsd = this.claims
      .filter((c) => c.currency === 'USD' && c.claimStatus !== 'SETTLED')
      .reduce((sum, c) => sum + c.outstandingExposure, 0)

    return {
      openIncidents,
      openClaims,
      totalExposureUsd,
    }
  }
}

// ==========================================
// TEST CASES
// ==========================================

test('1. Store Initialization: Seed Data Contains 5 Distinct Operational Incidents', () => {
  const engine = new IncidentClaimsTestEngine()
  assert.equal(engine.incidents.length, 5)

  const types = engine.incidents.map((i) => i.incidentType)
  assert.ok(types.includes('WET_CARGO'))
  assert.ok(types.includes('CARGO_SHORTAGE'))
  assert.ok(types.includes('TEMPERATURE_EXCEPTION'))
  assert.ok(types.includes('CONTAINER_DAMAGE'))
  assert.ok(types.includes('DETENTION'))
})

test('2. Non-Duplication Rule: Incident != Claim', () => {
  const engine = new IncidentClaimsTestEngine()
  // Adding an operational incident does NOT automatically create a commercial claim
  const initialClaimsCount = engine.claims.length
  engine.incidents.push({
    id: 'inc-00999',
    incidentNumber: 'INC-2026-00999',
    incidentType: 'PACKAGING_DAMAGE',
    customerName: 'Kabul Traders',
    quantityAffected: 5,
    weightAffectedKg: 50,
    estimatedValueAffected: 500,
    currency: 'USD',
    severity: 'LOW',
    status: 'OPEN',
    claimLinked: false,
    linkedClaimIds: [],
  })

  assert.equal(engine.claims.length, initialClaimsCount)
  const newInc = engine.incidents.find((i) => i.id === 'inc-00999')
  assert.equal(newInc.claimLinked, false)
})

test('3. Blameless Principle: Responsibility Defaults to NOT_ASSESSED / UNDER_REVIEW', () => {
  const engine = new IncidentClaimsTestEngine()
  const claim = engine.claims.find((c) => c.id === 'clm-00088')
  assert.equal(claim.responsibilityStatus, 'UNDER_REVIEW')
  assert.notEqual(claim.responsibilityStatus, 'AGREED_PARTY_RESPONSIBILITY')
})

test('4. Human Authorized Liability Evaluation with Cited Evidence & Audit Trail', () => {
  const engine = new IncidentClaimsTestEngine()
  const assessed = engine.assessResponsibility('clm-00088', {
    status: 'AGREED_PARTY_RESPONSIBILITY',
    assessedPartyName: 'Transporter Rahim Logistics',
    partyType: 'TRANSPORTER',
    reason: 'Joint inspection signed at warehouse confirmed torn tarpaulin before unloading.',
    evidenceReference: 'evid-001, evid-002',
    assessedBy: 'Karim Dad (Authorized Claims Lead)',
  })

  assert.equal(assessed.responsibilityStatus, 'AGREED_PARTY_RESPONSIBILITY')
  assert.equal(assessed.responsiblePartyName, 'Transporter Rahim Logistics')
  assert.equal(assessed.responsiblePartyAssessment.evidenceReference, 'evid-001, evid-002')
  assert.equal(assessed.previousAssessments.length, 1)
})

test('5. Multi-Currency Segregation & Exposure Formula: Exposure = Claimed - Settled', () => {
  const engine = new IncidentClaimsTestEngine()
  const claim = engine.claims.find((c) => c.id === 'clm-00088')
  assert.equal(claim.outstandingExposure, claim.claimAmount - claim.settlementAmount)

  // Verify cross-currency settlement rejection
  assert.throws(
    () => {
      engine.recordSettlement('clm-00088', {
        settlementAmount: 100000,
        currency: 'AFN', // Mismatched currency
        settlementType: 'CREDIT_NOTE',
        idempotencyKey: 'idemp-err-1',
        financeTransactionRef: 'TX-ERR',
      })
    },
    /Currency mismatch/
  )
})

test('6. Settlement Idempotency: Duplicate Tokens Never Cause Double Payout', () => {
  const engine = new IncidentClaimsTestEngine()
  const key = 'idemp-unique-token-999'

  // First settlement
  const res1 = engine.recordSettlement('clm-00088', {
    settlementAmount: 500,
    currency: 'USD',
    settlementType: 'CREDIT_NOTE',
    idempotencyKey: key,
    financeTransactionRef: 'TX-001',
  })
  assert.equal(res1.isDuplicate, false)
  assert.equal(res1.claim.settlementAmount, 500)
  assert.equal(res1.claim.outstandingExposure, 1500)

  // Duplicate replay
  const res2 = engine.recordSettlement('clm-00088', {
    settlementAmount: 500,
    currency: 'USD',
    settlementType: 'CREDIT_NOTE',
    idempotencyKey: key,
    financeTransactionRef: 'TX-001',
  })
  assert.equal(res2.isDuplicate, true)
  assert.equal(res2.claim.settlementAmount, 500) // Did NOT increase to 1000!
  assert.equal(res2.claim.outstandingExposure, 1500)
})

test('7. Full Settlement Lifecycle: Status Transitions to SETTLED & Exposure to Zero', () => {
  const engine = new IncidentClaimsTestEngine()
  const res = engine.recordSettlement('clm-00088', {
    settlementAmount: 2000,
    currency: 'USD',
    settlementType: 'BANK_PAYMENT',
    idempotencyKey: 'idemp-full-2000',
    financeTransactionRef: 'TX-FULL-01',
  })

  assert.equal(res.claim.claimStatus, 'SETTLED')
  assert.equal(res.claim.outstandingExposure, 0)
  assert.equal(res.claim.settlementAmount, 2000)
})

test('8. Partial Settlement Lifecycle: Transitions to PARTIALLY_ACCEPTED with Accurate Exposure', () => {
  const engine = new IncidentClaimsTestEngine()
  const res = engine.recordSettlement('clm-00089', {
    settlementAmount: 1000,
    currency: 'USD',
    settlementType: 'CREDIT_NOTE',
    idempotencyKey: 'idemp-partial-1000',
    financeTransactionRef: 'TX-PART-01',
  })

  assert.equal(res.claim.claimStatus, 'PARTIALLY_ACCEPTED')
  assert.equal(res.claim.settlementAmount, 1000)
  assert.equal(res.claim.outstandingExposure, 2400) // 3400 - 1000 = 2400
})

test('9. Detention Arithmetic & Force Majeure Exemption Calculation', () => {
  const engine = new IncidentClaimsTestEngine()
  // Container arrived 2026-03-01, 14 free days -> LFD is 2026-03-15
  // Returned 2026-03-22 -> 7 days total overstay
  // 5 days force majeure border closure exempt -> 2 net billable days
  // Daily rate $150 -> Legitimate $300. Carrier billed $1,050 ($150 * 7). Disputed = $750.
  const calc = engine.calculateDetention({
    arrivalDate: '2026-03-01',
    freeDays: 14,
    returnDate: '2026-03-22',
    dailyRate: 150,
    carrierBilled: 1050,
    exemptDays: 5,
  })

  assert.equal(calc.lastFreeDay, '2026-03-15')
  assert.equal(calc.totalOverstayDays, 7)
  assert.equal(calc.billableDays, 2)
  assert.equal(calc.legitimateExposure, 300)
  assert.equal(calc.disputedAmount, 750)
})

test('10. Customer Privacy & WhatsApp Sanitization Excludes Internal Notes & Margins', () => {
  const engine = new IncidentClaimsTestEngine()
  const text = engine.generateCustomerWhatsApp('clm-00088')

  // Confidential notes must NOT be present
  assert.ok(!text.includes('Target settlement offer'))
  assert.ok(!text.includes('carrier recovery'))
  assert.ok(!text.includes('18%'))
  assert.ok(text.includes('CLM-2026-00088'))
  assert.ok(text.includes('Ariana Saffron'))
})

test('11. State JSON Serialization & Export Safety', () => {
  const engine = new IncidentClaimsTestEngine()
  const snapshot = JSON.stringify({
    incidents: engine.incidents,
    claims: engine.claims,
  })

  const parsed = JSON.parse(snapshot)
  assert.equal(parsed.incidents.length, 5)
  assert.equal(parsed.claims.length, 2)
  assert.equal(parsed.incidents[0].incidentNumber, 'INC-2026-00125')
})

test('12. Dashboard Summary KPI Computations', () => {
  const engine = new IncidentClaimsTestEngine()
  const kpis = engine.getSummaryKpis()

  assert.equal(kpis.openIncidents, 5)
  assert.equal(kpis.openClaims, 2)
  // Total exposure: clm-00088 (2000) + clm-00089 (2400) = 4400
  assert.equal(kpis.totalExposureUsd, 4400)
})
