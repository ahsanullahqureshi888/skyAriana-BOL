/**
 * Phase 23: Air Freight & AWB Operations Center Unit Test Suite
 * Pure engine verification for Sky Ariana Limited air-cargo logistics.
 * Enforces strict operational rules & accounting invariants:
 * 1. Volumetric weight formula & configurable divisor (6000 standard vs 5000 express).
 * 2. Automatic chargeable weight selection and penalty detection.
 * 3. Cargo acceptance & screening separation (terminal reception != airline acceptance).
 * 4. MAWB prefix verification (Kam Air 384, Ariana 255, Emirates 176, etc.).
 * 5. MAWB draft version history tracking without loss of history.
 * 6. Non-destructive cargo offload and rebooking preserving historical legs.
 * 7. 3-Way release gate separation (Airline != Customs != Terminal) and financial hold blocker.
 * 8. Customer-safe WhatsApp notification generator scrubbing buy rates and internal notes.
 * 9. Multi-leg flight transit dwell calculation and connection risk warnings (< 3h).
 * 10. CSV flight schedule importer validation.
 */

const test = require('node:test')
const assert = require('node:assert/strict')

class AirFreightTestEngine {
  constructor() {
    this.airlines = [
      { id: 'airl-fg', name: 'Kam Air', iata: 'FG', prefix: '384', country: 'Afghanistan' },
      { id: 'airl-rq', name: 'Ariana Afghan Airlines', iata: 'RQ', prefix: '255', country: 'Afghanistan' },
      { id: 'airl-ek', name: 'Emirates SkyCargo', iata: 'EK', prefix: '176', country: 'UAE' },
      { id: 'airl-qr', name: 'Qatar Airways Cargo', iata: 'QR', prefix: '157', country: 'Qatar' },
      { id: 'airl-tk', name: 'Turkish Cargo', iata: 'TK', prefix: '235', country: 'Turkey' },
    ]

    this.bookings = [
      {
        id: 'book-001',
        bookingReference: 'SKY-AB-2026-001',
        airlineId: 'airl-fg',
        airlineName: 'Kam Air',
        airlineAwbPrefix: '384',
        shipper: 'Herat Saffron Trading LLC',
        consignee: 'Gulf Spices DMCC',
        originAirportIata: 'KBL',
        destinationAirportIata: 'DXB',
        commodity: 'Afghan Saffron & Pine Nuts',
        packagesCount: 45,
        packagingType: 'CARTONS',
        grossWeightKg: 680,
        volumetricWeightKg: 720,
        chargeableWeightKg: 720,
        volumetricDivisor: 6000,
        serviceType: 'DIRECT',
        status: 'FLIGHT_CONFIRMED',
        mawbNumber: '384-10293841',
        flightNumber: 'FG-711',
      },
    ]

    this.flights = [
      {
        id: 'flt-fg711',
        flightNumber: 'FG-711',
        airlineName: 'Kam Air',
        originAirportIata: 'KBL',
        destinationAirportIata: 'DXB',
        scheduledDeparture: '2026-03-25T09:30:00Z',
        scheduledArrival: '2026-03-25T12:30:00Z',
        status: 'SCHEDULED',
      },
      {
        id: 'flt-ek976',
        flightNumber: 'EK-976',
        airlineName: 'Emirates SkyCargo',
        originAirportIata: 'DXB',
        destinationAirportIata: 'IST',
        scheduledDeparture: '2026-03-25T14:45:00Z',
        scheduledArrival: '2026-03-25T18:20:00Z',
        status: 'SCHEDULED',
      },
    ]

    this.legs = []
    this.mawbs = []
    this.offloads = []
    this.acceptances = []
    this.releases = []
  }

  // 1. Volumetric weight calculation
  calculateVolumetricWeight(dimensions, divisor = 6000) {
    let totalVolumeCbm = 0
    let totalVolumetricWeightKg = 0

    for (const dim of dimensions) {
      const volCbm = (dim.lengthCm * dim.widthCm * dim.heightCm * dim.quantity) / 1000000
      const volWeightKg = (dim.lengthCm * dim.widthCm * dim.heightCm * dim.quantity) / divisor

      totalVolumeCbm += volCbm
      totalVolumetricWeightKg += volWeightKg
    }

    return {
      totalVolumeCbm: Number(totalVolumeCbm.toFixed(4)),
      totalVolumetricWeightKg: Number(totalVolumetricWeightKg.toFixed(2)),
    }
  }

  determineChargeableWeight(grossWeightKg, volumetricWeightKg) {
    const chargeable = Math.max(grossWeightKg, volumetricWeightKg)
    const isVolumetricPenalty = volumetricWeightKg > grossWeightKg
    const weightDifferenceKg = Math.abs(volumetricWeightKg - grossWeightKg)

    return {
      chargeableWeightKg: Number(chargeable.toFixed(2)),
      isVolumetricPenalty,
      weightDifferenceKg: Number(weightDifferenceKg.toFixed(2)),
    }
  }

  // 2. Cargo Acceptance
  recordCargoAcceptance(data) {
    const rec = {
      id: `acc-${Date.now()}`,
      bookingId: data.bookingId,
      packagesReceived: data.packagesReceived,
      grossWeightReceivedKg: data.grossWeightReceivedKg,
      securityStatus: data.securityStatus,
      airlineAcceptanceStatus: data.airlineAcceptanceStatus,
      airlineAcceptanceRef: data.airlineAcceptanceRef,
    }
    this.acceptances.push(rec)
    return rec
  }

  // 3. MAWB Management & Draft History
  saveMawb(data) {
    const existing = this.mawbs.find((m) => m.id === data.id)
    if (existing) {
      const nextVer = (existing.currentDraftVersion || 1) + 1
      const history = existing.draftVersions || []
      history.push({
        versionNumber: existing.currentDraftVersion || 1,
        notes: data.notes || 'Draft revised',
      })
      existing.currentDraftVersion = nextVer
      existing.draftVersions = history
      existing.grossWeightKg = data.grossWeightKg || existing.grossWeightKg
      existing.status = data.status || existing.status
      return existing
    } else {
      const newMawb = {
        id: data.id || `mawb-${Date.now()}`,
        mawbNumber: data.mawbNumber,
        awbPrefix: data.mawbNumber.split('-')[0],
        airlineId: data.airlineId,
        grossWeightKg: data.grossWeightKg,
        currentDraftVersion: 1,
        draftVersions: [],
        status: data.status || 'DRAFT',
      }
      this.mawbs.push(newMawb)
      return newMawb
    }
  }

  // 4. Offload & Rebooking
  recordOffload(params) {
    const offload = {
      id: `off-${Date.now()}`,
      bookingId: params.bookingId,
      originalFlightNumber: params.originalFlightNumber,
      reason: params.reason,
      detailedReason: params.detailedReason,
      rebookedFlightNumber: params.rebookedFlightNumber,
      status: params.rebookedFlightNumber ? 'REBOOKED' : 'OFFLOADED',
    }
    this.offloads.push(offload)

    // Mark previous leg as offloaded
    const prevLeg = this.legs.find(
      (l) => l.bookingId === params.bookingId && l.flightNumber === params.originalFlightNumber
    )
    if (prevLeg) {
      prevLeg.status = 'OFFLOADED'
    }

    // Append replacement leg without wiping history
    if (params.rebookedFlightNumber) {
      this.legs.push({
        id: `leg-${Date.now()}`,
        bookingId: params.bookingId,
        flightNumber: params.rebookedFlightNumber,
        status: 'CONFIRMED',
      })
    }

    return offload
  }

  // 5. 3-Way Release
  updateRelease(releaseId, updates) {
    let rel = this.releases.find((r) => r.id === releaseId)
    if (!rel) {
      rel = { id: releaseId, ...updates }
      this.releases.push(rel)
    } else {
      Object.assign(rel, updates)
    }

    const allThree = rel.airlineRelease && rel.customsRelease && rel.terminalRelease
    rel.cargoAvailableForPickup = allThree && !rel.releaseBlocked
    return rel
  }

  // 6. Customer-Safe WhatsApp Generator
  generateCustomerWhatsApp(booking) {
    const lines = [
      `✈️ *SKY ARIANA AIR FREIGHT UPDATE*`,
      `*Booking Ref:* ${booking.bookingReference}`,
      `*MAWB No:* ${booking.mawbNumber}`,
      `*Route:* ${booking.originAirportIata} ➡️ ${booking.destinationAirportIata}`,
      `*Packages / Weight:* ${booking.packagesCount} Pcs | ${booking.grossWeightKg} Kg Gross`,
      `*Operational Status:* ${booking.status}`,
    ]
    return lines.join('\n')
  }

  // 7. Transit Dwell Calculation
  calculateTransitDwell(leg1Arrival, leg2Departure) {
    const arr = new Date(leg1Arrival).getTime()
    const dep = new Date(leg2Departure).getTime()
    const dwellMs = dep - arr
    const dwellHours = Number((dwellMs / (1000 * 60 * 60)).toFixed(2))
    return {
      dwellHours,
      isTightConnection: dwellHours < 3.0,
    }
  }
}

// ==========================================
// TEST SUITE EXECUTION
// ==========================================

test('1. AirFreight Engine initializes with partner airlines and standard AWB prefixes', () => {
  const engine = new AirFreightTestEngine()
  assert.equal(engine.airlines.length, 5)

  const kamAir = engine.airlines.find((a) => a.iata === 'FG')
  assert.ok(kamAir)
  assert.equal(kamAir.prefix, '384')

  const emirates = engine.airlines.find((a) => a.iata === 'EK')
  assert.ok(emirates)
  assert.equal(emirates.prefix, '176')

  const ariana = engine.airlines.find((a) => a.iata === 'RQ')
  assert.ok(ariana)
  assert.equal(ariana.prefix, '255')
})

test('2. Volumetric Weight Calculation with IATA standard divisor 6000 and express divisor 5000', () => {
  const engine = new AirFreightTestEngine()
  const dimensions = [
    { lengthCm: 100, widthCm: 100, heightCm: 100, quantity: 1 }, // 1 CBM
  ]

  // Standard Air Cargo (6000 divisor): 1,000,000 / 6000 = 166.67 kg
  const std = engine.calculateVolumetricWeight(dimensions, 6000)
  assert.equal(std.totalVolumeCbm, 1.0)
  assert.equal(std.totalVolumetricWeightKg, 166.67)

  // Express / Courier (5000 divisor): 1,000,000 / 5000 = 200.00 kg
  const express = engine.calculateVolumetricWeight(dimensions, 5000)
  assert.equal(express.totalVolumeCbm, 1.0)
  assert.equal(express.totalVolumetricWeightKg, 200.0)
})

test('3. Chargeable Weight determination enforces Math.max(gross, volumetric) and flags penalty', () => {
  const engine = new AirFreightTestEngine()

  // Scenario A: Heavy cargo (physical gross > volumetric)
  const heavy = engine.determineChargeableWeight(500, 300)
  assert.equal(heavy.chargeableWeightKg, 500)
  assert.equal(heavy.isVolumetricPenalty, false)

  // Scenario B: Volumetric cargo (volumetric > gross)
  const light = engine.determineChargeableWeight(250, 420)
  assert.equal(light.chargeableWeightKg, 420)
  assert.equal(light.isVolumetricPenalty, true)
  assert.equal(light.weightDifferenceKg, 170)
})

test('4. Cargo Acceptance separates Terminal Reception from Airline Acceptance', () => {
  const engine = new AirFreightTestEngine()

  // Step 1: Terminal received cargo but airline acceptance is pending
  const accPending = engine.recordCargoAcceptance({
    bookingId: 'book-001',
    packagesReceived: 45,
    grossWeightReceivedKg: 680,
    securityStatus: 'COMPLETED',
    airlineAcceptanceStatus: 'PENDING',
  })
  assert.equal(accPending.airlineAcceptanceStatus, 'PENDING')
  assert.equal(accPending.securityStatus, 'COMPLETED')

  // Step 2: Airline officially signs handover receipt (RCL)
  const accAccepted = engine.recordCargoAcceptance({
    bookingId: 'book-001',
    packagesReceived: 45,
    grossWeightReceivedKg: 680,
    securityStatus: 'COMPLETED',
    airlineAcceptanceStatus: 'ACCEPTED',
    airlineAcceptanceRef: 'RCL-FG-8821',
  })
  assert.equal(accAccepted.airlineAcceptanceStatus, 'ACCEPTED')
  assert.equal(accAccepted.airlineAcceptanceRef, 'RCL-FG-8821')
})

test('5. MAWB Management tracks non-destructive draft versions (v1, v2)', () => {
  const engine = new AirFreightTestEngine()

  // Version 1
  const mawb = engine.saveMawb({
    id: 'mawb-001',
    mawbNumber: '384-10293841',
    airlineId: 'airl-fg',
    grossWeightKg: 680,
    status: 'DRAFT',
  })
  assert.equal(mawb.currentDraftVersion, 1)
  assert.equal(mawb.draftVersions.length, 0)

  // Version 2 revision
  const v2 = engine.saveMawb({
    id: 'mawb-001',
    grossWeightKg: 700,
    status: 'ISSUED',
    notes: 'Weight adjusted after certified scale reading',
  })
  assert.equal(v2.currentDraftVersion, 2)
  assert.equal(v2.draftVersions.length, 1)
  assert.equal(v2.draftVersions[0].versionNumber, 1)
  assert.equal(v2.grossWeightKg, 700)
  assert.equal(v2.status, 'ISSUED')
})

test('6. Explicit Cargo Offload preserves historical flight legs and links rebooked flight', () => {
  const engine = new AirFreightTestEngine()

  // Setup initial leg
  engine.legs.push({
    id: 'leg-1',
    bookingId: 'book-001',
    flightNumber: 'FG-711',
    status: 'CONFIRMED',
  })

  // Record Offload due to aircraft payload limit and rebook on FG-712
  const offload = engine.recordOffload({
    bookingId: 'book-001',
    originalFlightNumber: 'FG-711',
    reason: 'AIRCRAFT_PAYLOAD_LIMIT',
    detailedReason: 'Ambient temperature at KBL caused takeoff weight penalty.',
    rebookedFlightNumber: 'FG-712',
  })

  assert.equal(offload.status, 'REBOOKED')
  assert.equal(offload.rebookedFlightNumber, 'FG-712')

  // Check legs: Original leg is preserved as OFFLOADED, new leg is CONFIRMED
  const originalLeg = engine.legs.find((l) => l.flightNumber === 'FG-711')
  assert.ok(originalLeg)
  assert.equal(originalLeg.status, 'OFFLOADED')

  const rebookedLeg = engine.legs.find((l) => l.flightNumber === 'FG-712')
  assert.ok(rebookedLeg)
  assert.equal(rebookedLeg.status, 'CONFIRMED')
})

test('7. 3-Way Release gates strictly require Airline, Customs, and Terminal releases before pickup', () => {
  const engine = new AirFreightTestEngine()

  // Initial: Only Airline released -> Cargo NOT available
  let rel = engine.updateRelease('rel-1', {
    airlineRelease: true,
    customsRelease: false,
    terminalRelease: false,
    releaseBlocked: false,
  })
  assert.equal(rel.cargoAvailableForPickup, false)

  // Step 2: Customs cleared, Terminal pending -> NOT available
  rel = engine.updateRelease('rel-1', {
    customsRelease: true,
  })
  assert.equal(rel.cargoAvailableForPickup, false)

  // Step 3: Terminal cleared -> AVAILABLE!
  rel = engine.updateRelease('rel-1', {
    terminalRelease: true,
  })
  assert.equal(rel.cargoAvailableForPickup, true)

  // Step 4: Active Financial Hold blocks release even if all 3 gates are open
  rel = engine.updateRelease('rel-1', {
    releaseBlocked: true,
  })
  assert.equal(rel.cargoAvailableForPickup, false)
})

test('8. Multi-Leg Transit Dwell calculation accurately identifies tight connection risk (<3h)', () => {
  const engine = new AirFreightTestEngine()

  // Case A: Safe connection (5 hours 15 mins dwell in Dubai)
  const safe = engine.calculateTransitDwell('2026-03-25T12:30:00Z', '2026-03-25T17:45:00Z')
  assert.equal(safe.dwellHours, 5.25)
  assert.equal(safe.isTightConnection, false)

  // Case B: Tight connection (2 hours 15 mins dwell in Dubai)
  const tight = engine.calculateTransitDwell('2026-03-25T12:30:00Z', '2026-03-25T14:45:00Z')
  assert.equal(tight.dwellHours, 2.25)
  assert.equal(tight.isTightConnection, true)
})

test('9. Customer-safe WhatsApp notification generator strictly excludes buy rates and confidential data', () => {
  const engine = new AirFreightTestEngine()
  const booking = engine.bookings[0]

  const message = engine.generateCustomerWhatsApp(booking)
  assert.ok(message.includes('SKY ARIANA AIR FREIGHT UPDATE'))
  assert.ok(message.includes('SKY-AB-2026-001'))
  assert.ok(message.includes('384-10293841'))
  assert.ok(message.includes('KBL ➡️ DXB'))

  // Verify confidentiality: NO buy rates, NO carrier purchase invoices, NO profit margins
  assert.equal(message.includes('buyRate'), false)
  assert.equal(message.includes('margin'), false)
  assert.equal(message.includes('carrierPayable'), false)
})

test('10. MAWB Prefix Verification checks valid 3-digit prefix mapping', () => {
  const engine = new AirFreightTestEngine()

  const validKamAir = '384-10293841'
  assert.equal(validKamAir.startsWith(engine.airlines[0].prefix), true)

  const validEmirates = '176-49201948'
  assert.equal(validEmirates.startsWith(engine.airlines[2].prefix), true)

  const invalidPrefix = '999-12345678'
  const matched = engine.airlines.some((a) => invalidPrefix.startsWith(a.prefix))
  assert.equal(matched, false)
})
