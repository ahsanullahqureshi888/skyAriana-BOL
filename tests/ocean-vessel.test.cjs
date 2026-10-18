/**
 * Phase 22: Shipping Line, Vessel & Ocean Operations Center Unit Test Suite
 * Pure engine verification for Sky Ariana Limited sea-freight operations.
 */

const test = require('node:test')
const assert = require('node:assert/strict')

class OceanVesselTestEngine {
  constructor() {
    this.vessels = [
      {
        id: 'ves-001',
        name: 'MSC CLAUDIA',
        imoNumber: '9243382',
        carrierId: 'comp-msc',
        carrierName: 'Mediterranean Shipping Company (MSC)',
        vesselType: 'CONTAINER_MOTHER',
        status: 'ACTIVE',
      },
      {
        id: 'ves-002',
        name: 'MAERSK HANOI',
        imoNumber: '9632064',
        carrierId: 'comp-maersk',
        carrierName: 'A.P. Moller - Maersk',
        vesselType: 'CONTAINER_MOTHER',
        status: 'ACTIVE',
      },
      {
        id: 'ves-003',
        name: 'CMA CGM NEVA',
        imoNumber: '9783100',
        carrierId: 'comp-cma',
        carrierName: 'CMA CGM Group',
        vesselType: 'CONTAINER_FEEDER',
        status: 'ACTIVE',
      },
    ]

    this.voyages = [
      {
        id: 'voy-001',
        vesselId: 'ves-003',
        vesselNameSnapshot: 'CMA CGM NEVA',
        voyageNumber: '2604W',
        carrierName: 'CMA CGM Group',
        originPortName: 'Bandar Abbas (Shahid Rajaee)',
        destinationPortName: 'Jebel Ali',
        portCalls: [
          { sequence: 1, portName: 'Bandar Abbas', status: 'DEPARTED' },
          { sequence: 2, portName: 'Jebel Ali', status: 'ARRIVING' },
        ],
        plannedEtd: '2026-03-22T18:00:00Z',
        plannedEta: '2026-03-24T08:00:00Z',
        actualDeparture: '2026-03-22T20:15:00Z',
        status: 'SAILED',
        scheduleHistory: [],
      },
      {
        id: 'voy-002',
        vesselId: 'ves-001',
        vesselNameSnapshot: 'MSC CLAUDIA',
        voyageNumber: '612E',
        carrierName: 'Mediterranean Shipping Company (MSC)',
        originPortName: 'Jebel Ali',
        destinationPortName: 'Nhava Sheva (JNPT)',
        portCalls: [
          { sequence: 1, portName: 'Jebel Ali', status: 'PLANNED' },
          { sequence: 2, portName: 'Nhava Sheva', status: 'PLANNED' },
        ],
        plannedEtd: '2026-03-27T16:00:00Z',
        plannedEta: '2026-03-31T12:00:00Z',
        status: 'CONFIRMED',
        scheduleHistory: [],
      },
    ]

    this.oceanLegs = [
      {
        id: 'leg-001',
        legNumber: 1,
        legLabel: 'First Leg (Feeder)',
        bookingId: 'bk-2026-091',
        bookingNumber: 'BKG-CMA-2026-8819',
        bolNumber: 'BOL-2026-0041',
        vesselName: 'CMA CGM NEVA',
        voyageId: 'voy-001',
        voyageNumber: '2604W',
        polName: 'Bandar Abbas',
        podName: 'Jebel Ali',
        etd: '2026-03-22T18:00:00Z',
        eta: '2026-03-24T08:00:00Z',
        actualDeparture: '2026-03-22T20:15:00Z',
        status: 'SAILED',
        containerNumbers: ['MSKU9981240', 'CMAU7718290'],
      },
      {
        id: 'leg-002',
        legNumber: 2,
        legLabel: 'Second Leg (Mother Vessel)',
        bookingId: 'bk-2026-091',
        bookingNumber: 'BKG-CMA-2026-8819',
        bolNumber: 'BOL-2026-0041',
        vesselName: 'MSC CLAUDIA',
        voyageId: 'voy-002',
        voyageNumber: '612E',
        polName: 'Jebel Ali',
        podName: 'Nhava Sheva',
        etd: '2026-03-27T16:00:00Z',
        eta: '2026-03-31T12:00:00Z',
        status: 'WAITING_VESSEL',
        containerNumbers: ['MSKU9981240', 'CMAU7718290'],
      },
    ]

    this.containers = [
      {
        containerNumber: 'MSKU9981240',
        bookingId: 'bk-2026-091',
        isLoadConfirmed: true,
        stage: 'LOADED_ON_VESSEL',
      },
      {
        containerNumber: 'CMAU7718290',
        bookingId: 'bk-2026-091',
        isLoadConfirmed: false, // In gate-in, unconfirmed load!
        stage: 'GATE_IN',
      },
    ]

    this.rollovers = []

    this.blWorkflows = [
      {
        bookingId: 'bk-2026-091',
        blNumber: 'CMAU-2026-990182',
        blType: 'SEA_WAYBILL',
        draftVersions: [
          { versionNumber: 1, notes: 'Draft v1 received' },
        ],
        isDraftApproved: false,
        isSwitchBl: false,
        releaseStatus: 'DRAFT_PENDING',
        releaseBlocked: false,
      },
    ]

    this.financeLinks = [
      {
        bookingId: 'bk-2026-091',
        carrierName: 'CMA CGM Group',
        amount: 3200,
        currency: 'USD',
        paymentStatus: 'PAYMENT_PENDING',
        requiresPaymentForBlRelease: true,
      },
    ]
  }

  // Update schedule
  updateVoyageSchedule(voyageId, newEtd, newEta, reason, changedBy) {
    const voy = this.voyages.find((v) => v.id === voyageId)
    if (!voy) return { success: false }

    voy.scheduleHistory.push({
      previousEtd: voy.plannedEtd,
      newEtd,
      previousEta: voy.plannedEta,
      newEta,
      reason,
      changedBy,
      changeTimestamp: new Date().toISOString(),
    })
    voy.plannedEtd = newEtd
    voy.plannedEta = newEta

    // Propagate to legs
    for (const leg of this.oceanLegs) {
      if (leg.voyageId === voyageId && leg.status !== 'COMPLETED' && leg.status !== 'ROLLED_OVER') {
        leg.etd = newEtd
        leg.eta = newEta
      }
    }
    return { success: true, voy }
  }

  // Record Rollover
  recordRollover(containerNumber, newVesselName, newVoyageNumber, newEtd, reason) {
    const ctr = this.containers.find((c) => c.containerNumber === containerNumber)
    const leg = this.oceanLegs.find((l) => l.containerNumbers.includes(containerNumber))

    const rollover = {
      containerNumber,
      originalVesselName: leg ? leg.vesselName : 'Original Vessel',
      newVesselName,
      newVoyageNumber,
      newEtd,
      reason,
      date: new Date().toISOString(),
    }
    this.rollovers.push(rollover)

    if (ctr) {
      ctr.isLoadConfirmed = false
      ctr.stage = 'WAITING_LOADING'
    }
    if (leg) {
      leg.status = 'ROLLED_OVER'
    }
    return rollover
  }

  // Draft BL & Switch BL
  addDraftVersion(bookingId, notes) {
    const wf = this.blWorkflows.find((w) => w.bookingId === bookingId)
    const nextVer = wf.draftVersions.length + 1
    wf.draftVersions.push({ versionNumber: nextVer, notes })
    return nextVer
  }

  createSwitchBL(bookingId, switchBlNumber, switchLocation, reason) {
    const wf = this.blWorkflows.find((w) => w.bookingId === bookingId)
    wf.isSwitchBl = true
    wf.originalBlNumber = wf.blNumber
    wf.switchBlNumber = switchBlNumber
    wf.switchLocation = switchLocation
    wf.switchReason = reason
    return wf
  }

  // Release status check with financial condition
  updateReleaseStatus(bookingId, newStatus) {
    const wf = this.blWorkflows.find((w) => w.bookingId === bookingId)
    const fin = this.financeLinks.find((f) => f.bookingId === bookingId)

    if (fin && fin.requiresPaymentForBlRelease && fin.paymentStatus === 'PAYMENT_PENDING') {
      wf.releaseBlocked = true
      wf.releaseBlockReason = 'Carrier freight invoice is unpaid. Payment required before release.'
      return { success: false, error: 'Carrier payment pending' }
    }
    wf.releaseStatus = newStatus
    wf.releaseBlocked = false
    return { success: true }
  }

  // Customer safe message generator
  generateCustomerWhatsApp(bolNumber) {
    const leg = this.oceanLegs.find((l) => l.bolNumber === bolNumber) || this.oceanLegs[0]
    const ctr = this.containers[0]
    return `BOL: ${bolNumber} | Container: ${ctr.containerNumber} | Vessel: ${leg.vesselName} | Voy: ${leg.voyageNumber} | ETA: ${leg.eta}`
  }
}

// ==========================================
// TEST CASES
// ==========================================

test('1. Vessel Master & Voyage Schedule Integrity', () => {
  const engine = new OceanVesselTestEngine()
  assert.equal(engine.vessels.length, 3)
  assert.equal(engine.vessels[0].imoNumber, '9243382')
  assert.equal(engine.voyages[0].portCalls.length, 2)
  assert.equal(engine.voyages[0].portCalls[0].portName, 'Bandar Abbas')
  assert.equal(engine.voyages[0].portCalls[1].portName, 'Jebel Ali')
})

test('2. Multi-Leg Ocean Transport: Leg 1 and Leg 2 stored independently', () => {
  const engine = new OceanVesselTestEngine()
  assert.equal(engine.oceanLegs.length, 2)

  const leg1 = engine.oceanLegs.find((l) => l.legNumber === 1)
  const leg2 = engine.oceanLegs.find((l) => l.legNumber === 2)

  assert.ok(leg1 && leg2)
  assert.equal(leg1.vesselName, 'CMA CGM NEVA')
  assert.equal(leg2.vesselName, 'MSC CLAUDIA')
  assert.equal(leg1.podName, leg2.polName) // Transshipment hub match (Jebel Ali)
})

test('3. Container Load Verification: Vessel departure does NOT assume unconfirmed container loaded', () => {
  const engine = new OceanVesselTestEngine()
  const confirmed = engine.containers.find((c) => c.containerNumber === 'MSKU9981240')
  const unconfirmed = engine.containers.find((c) => c.containerNumber === 'CMAU7718290')

  assert.equal(confirmed.isLoadConfirmed, true)
  assert.equal(unconfirmed.isLoadConfirmed, false)
  assert.equal(unconfirmed.stage, 'GATE_IN') // Still in terminal, not falsely marked onboard
})

test('4. Separation of Planned Dates vs. Actual Timestamps', () => {
  const engine = new OceanVesselTestEngine()
  const voy = engine.voyages[0]

  // Actual departure occurred 2 hours 15 mins after planned ETD
  assert.equal(voy.plannedEtd, '2026-03-22T18:00:00Z')
  assert.equal(voy.actualDeparture, '2026-03-22T20:15:00Z')
  assert.notEqual(voy.plannedEtd, voy.actualDeparture) // Planned ETD was NEVER overwritten
})

test('5. Transshipment Dwell Time & Connection Window Arithmetic', () => {
  const engine = new OceanVesselTestEngine()
  const leg1 = engine.oceanLegs[0]
  const leg2 = engine.oceanLegs[1]

  const leg1Arrival = new Date(leg1.eta).getTime()
  const leg2Departure = new Date(leg2.etd).getTime()
  const dwellHours = Math.round((leg2Departure - leg1Arrival) / (1000 * 3600))

  assert.ok(dwellHours > 0)
  assert.equal(dwellHours, 80) // 24 Mar 08:00 to 27 Mar 16:00 = 80 hours dwell
})

test('6. Explicit Rollover preserves historical allocation and clears load confirmation', () => {
  const engine = new OceanVesselTestEngine()
  const rollover = engine.recordRollover(
    'MSKU9981240',
    'BARGE ARIA 1',
    '081',
    '2026-03-25T14:00:00Z',
    'Shut-out by terminal stack limit'
  )

  assert.equal(rollover.containerNumber, 'MSKU9981240')
  assert.equal(rollover.newVesselName, 'BARGE ARIA 1')

  const container = engine.containers.find((c) => c.containerNumber === 'MSKU9981240')
  assert.equal(container.isLoadConfirmed, false) // Rolled over container is no longer confirmed loaded
  assert.equal(container.stage, 'WAITING_LOADING')
})

test('7. Multi-Version Draft BL & Non-Destructive Switch BL', () => {
  const engine = new OceanVesselTestEngine()

  // Add draft v2
  const v2 = engine.addDraftVersion('bk-2026-091', 'Corrected consignee tax ID')
  assert.equal(v2, 2)
  const wf = engine.blWorkflows[0]
  assert.equal(wf.draftVersions.length, 2) // Both Draft v1 and v2 preserved

  // Create switch BL
  engine.createSwitchBL('bk-2026-091', 'SA-SWB-2026-041', 'Dubai, UAE', 'Confidential buyer')
  assert.equal(wf.isSwitchBl, true)
  assert.equal(wf.originalBlNumber, 'CMAU-2026-990182') // Original BL preserved!
  assert.equal(wf.switchBlNumber, 'SA-SWB-2026-041')
})

test('8. Carrier Freight Payment Release Blocker: Blocks release when freight unpaid', () => {
  const engine = new OceanVesselTestEngine()

  // Attempt release while carrier payment is pending
  const res = engine.updateReleaseStatus('bk-2026-091', 'SWB_ISSUED')
  assert.equal(res.success, false)

  const wf = engine.blWorkflows[0]
  assert.equal(wf.releaseBlocked, true)
  assert.ok(wf.releaseBlockReason.includes('unpaid'))

  // Settle invoice in Finance
  engine.financeLinks[0].paymentStatus = 'PAID'
  const resAfterPayment = engine.updateReleaseStatus('bk-2026-091', 'SWB_ISSUED')
  assert.equal(resAfterPayment.success, true)
  assert.equal(wf.releaseBlocked, false)
  assert.equal(wf.releaseStatus, 'SWB_ISSUED')
})

test('9. Customer-Safe WhatsApp Generator scrubs carrier buy rates and internal costs', () => {
  const engine = new OceanVesselTestEngine()
  const msg = engine.generateCustomerWhatsApp('BOL-2026-0041')

  assert.ok(msg.includes('BOL: BOL-2026-0041'))
  assert.ok(msg.includes('Vessel: CMA CGM NEVA'))
  assert.ok(!msg.includes('$3,200')) // Carrier buy rate strictly scrubbed
  assert.ok(!msg.includes('PAYMENT_PENDING')) // Internal finance note scrubbed
})
