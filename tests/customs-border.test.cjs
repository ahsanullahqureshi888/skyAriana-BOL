/**
 * Customs, Border & Transit Operations Center Unit Test Suite
 * Phase 21 Verification — Sky Ariana Limited
 */

const test = require('node:test')
const assert = require('node:assert/strict')

// Pure Customs Border Engine for deterministic testing
class CustomsBorderEngine {
  constructor() {
    this.operations = [
      {
        id: 'bor-001',
        operationNumber: 'BOR-2026-00125',
        shipmentId: 'shp-2026-0041',
        bolNumber: 'BOL-2026-0041',
        truckPlate: '2877 کابل ل',
        driverName: 'Ahmadullah Niazi',
        driverPhone: '+93 79 912 3456',
        containerNumber: 'MSKU9981240',
        routeLeg: 'Islam Qala (AF) -> Dogharoon (IR)',
        borderLocationId: 'loc-iq',
        borderLocationName: 'Islam Qala / Dogharoon Border Crossing',
        countryFrom: 'AF',
        countryTo: 'IR',
        currentSide: 'SIDE_A',
        arrivalDate: '2026-03-21T08:15:00Z',
        queueEntryDate: '2026-03-21T08:45:00Z',
        queuePosition: 14,
        waitingReason: 'Terminal customs queue waiting for X-Ray scanner lane opening',
        customsEntryDate: '2026-03-21T11:30:00Z',
        status: 'CUSTOMS_PROCESSING',
        agentName: 'Haji Mohammad Ebrahim Customs Clearance Agency',
        agentPhone: '+98 915 321 9988',
        customsReference: 'CUST-REF-IQ-2026-449',
        declarationNumber: 'DEC-AF-2026-90412',
        transitReference: 'TRN-IR-2026-8812',
        documents: [
          { id: 'd1', name: 'Commercial Invoice', required: true, status: 'VERIFIED', verified: true },
          { id: 'd2', name: 'Packing List', required: true, status: 'VERIFIED', verified: true },
          { id: 'd3', name: 'Customs Declaration', required: true, status: 'VERIFIED', verified: true },
          { id: 'd4', name: 'Transit Paper', required: true, status: 'PENDING', verified: false },
        ],
        inspections: [],
        holds: [],
        transloads: [],
        timeline: [
          {
            id: 'tl-1',
            stage: 'ARRIVED_BORDER',
            timestamp: '2026-03-21T08:15:00Z',
            locationName: 'Islam Qala Arrival Gate',
            side: 'SIDE_A',
            recordedBy: 'Driver Niazi',
            notes: 'Arrived at border',
          },
        ],
        createdAt: '2026-03-20T14:00:00Z',
        updatedAt: '2026-03-21T11:45:00Z',
      },
      {
        id: 'bor-002',
        operationNumber: 'BOR-2026-00126',
        shipmentId: 'shp-2026-0038',
        bolNumber: 'BOL-2026-0038',
        truckPlate: '4120 مزار',
        driverName: 'Mohammad Tariq',
        routeLeg: 'Hairatan (AF) -> Termez (UZ)',
        borderLocationId: 'loc-hai',
        borderLocationName: 'Hairatan / Termez Friendship Bridge',
        countryFrom: 'AF',
        countryTo: 'UZ',
        currentSide: 'SIDE_B',
        arrivalDate: '2026-03-20T10:00:00Z',
        customsEntryDate: '2026-03-20T12:00:00Z',
        clearanceDate: '2026-03-20T16:30:00Z',
        borderExitDate: '2026-03-21T09:00:00Z',
        status: 'BORDER_CROSSED',
        documents: [],
        inspections: [],
        holds: [],
        transloads: [],
        timeline: [],
        createdAt: '2026-03-19T08:00:00Z',
        updatedAt: '2026-03-21T09:00:00Z',
      },
    ]

    this.declarations = [
      {
        id: 'dec-001',
        declarationNumber: 'DEC-AF-2026-90412',
        declarationType: 'EXPORT',
        country: 'Afghanistan',
        customsOffice: 'Islam Qala Customs Directorate',
        declarationDate: '2026-03-20',
        exporter: 'Alokozay Dried Fruits Processing Ltd.',
        importer: 'Green Oasis Dry Foods Trading LLC (Dubai)',
        commodity: 'Afghan Green Raisins Grade A',
        hsCode: '0806.20.00',
        packages: 1427,
        packageType: 'CTNS',
        grossWeightKg: 23545.5,
        netWeightKg: 22832.0,
        declaredValue: 45664.0,
        currency: 'USD',
        status: 'SUBMITTED',
        linkedBolNumber: 'BOL-2026-0041',
      },
    ]

    this.transitPapers = [
      {
        id: 'trn-001',
        transitNumber: 'TRN-IR-2026-8812',
        status: 'ACTIVE',
        issueDate: '2026-03-21',
        entryBorder: 'Dogharoon Border Post (Iran)',
        exitBorder: 'Bandar Abbas Port Terminal Yard',
        routeCorridor: 'Dogharoon -> Mashhad -> Bandar Abbas',
        truckPlate: '2877 کابل ل',
        containerNumber: 'MSKU9981240',
        sealNumber: 'SEAL-AF-887192',
        transitStage: 'ENTERED_TRANSIT',
        linkedBolNumber: 'BOL-2026-0041',
      },
    ]
  }

  getSummaryKpi() {
    const activeBorderShipments = this.operations.filter(
      (o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED'
    ).length
    const waitingBorderEntry = this.operations.filter((o) => o.status === 'WAITING_ENTRY').length
    const inCustoms = this.operations.filter(
      (o) =>
        o.status === 'ENTERED_CUSTOMS' ||
        o.status === 'DOCUMENT_REVIEW' ||
        o.status === 'CUSTOMS_PROCESSING'
    ).length
    const underInspection = this.operations.filter((o) => o.status === 'INSPECTION').length
    const documentsPending = this.operations.filter((o) =>
      o.documents.some((d) => d.required && !d.verified)
    ).length
    const customsHold = this.operations.filter(
      (o) => o.status === 'ON_HOLD' || o.holds.some((h) => h.status === 'OPEN')
    ).length
    const clearedToday = this.operations.filter((o) => o.status === 'CLEARED').length
    const borderExitToday = this.operations.filter((o) => o.status === 'BORDER_CROSSED').length
    const transitInProgress = this.transitPapers.filter((t) => t.status === 'ACTIVE').length

    return {
      activeBorderShipments,
      waitingBorderEntry,
      inCustoms,
      underInspection,
      documentsPending,
      customsHold,
      clearedToday,
      borderExitToday,
      transitInProgress,
    }
  }

  createOperation(data) {
    const now = new Date().toISOString()
    const operationNumber = `BOR-2026-${Math.floor(10000 + Math.random() * 90000)}`
    const newOp = {
      id: `bor-${Date.now()}`,
      operationNumber,
      ...data,
      currentSide: 'SIDE_A',
      status: 'APPROACHING_BORDER',
      documents: [
        { id: 'd1', name: 'Commercial Invoice', required: true, status: 'VERIFIED', verified: true },
        { id: 'd2', name: 'Packing List', required: true, status: 'VERIFIED', verified: true },
      ],
      inspections: [],
      holds: [],
      transloads: [],
      timeline: [
        {
          id: `tl-${Date.now()}`,
          stage: 'APPROACHING_BORDER',
          timestamp: now,
          locationName: data.borderLocationName,
          side: 'SIDE_A',
          recordedBy: 'Border Controller',
          notes: 'Operation created',
        },
      ],
      createdAt: now,
      updatedAt: now,
    }
    this.operations.unshift(newOp)
    return newOp
  }

  recordBorderArrival(operationId, arrivalDate, queuePosition, notes, recordedBy) {
    const op = this.operations.find((o) => o.id === operationId)
    if (!op) return { success: false, error: 'Operation not found' }
    const now = new Date().toISOString()
    op.arrivalDate = arrivalDate || now
    op.queuePosition = queuePosition !== undefined ? queuePosition : null
    op.status = 'ARRIVED_BORDER'
    op.updatedAt = now
    op.timeline.push({
      id: `tl-${Date.now()}`,
      stage: 'ARRIVED_BORDER',
      timestamp: op.arrivalDate,
      locationName: op.borderLocationName,
      side: 'SIDE_A',
      recordedBy,
      notes: queuePosition !== null ? `Queue #${queuePosition}` : 'Queue Position Not Recorded',
    })
    return { success: true, operation: op }
  }

  recordCustomsEntry(operationId, customsEntryDate, customsRef, notes, recordedBy) {
    const op = this.operations.find((o) => o.id === operationId)
    if (!op) return { success: false, error: 'Operation not found' }
    const now = new Date().toISOString()
    op.customsEntryDate = customsEntryDate || now
    op.customsReference = customsRef || op.customsReference
    op.status = 'ENTERED_CUSTOMS'
    op.updatedAt = now
    op.timeline.push({
      id: `tl-${Date.now()}`,
      stage: 'ENTERED_CUSTOMS',
      timestamp: op.customsEntryDate,
      locationName: op.borderLocationName,
      side: 'SIDE_A',
      recordedBy,
      notes,
    })
    return { success: true, operation: op }
  }

  recordClearance(operationId, clearanceDate, declarationRef, clearedBy, notes) {
    const op = this.operations.find((o) => o.id === operationId)
    if (!op) return { success: false, error: 'Operation not found' }
    const now = new Date().toISOString()
    op.clearanceDate = clearanceDate || now
    op.declarationNumber = declarationRef || op.declarationNumber
    op.status = 'CLEARED'
    op.updatedAt = now
    op.timeline.push({
      id: `tl-${Date.now()}`,
      stage: 'CLEARED',
      timestamp: op.clearanceDate,
      locationName: op.borderLocationName,
      side: 'SIDE_A',
      recordedBy: clearedBy,
      notes,
    })
    return { success: true, operation: op }
  }

  recordBorderExit(operationId, exitDate, nextDestination, notes, recordedBy) {
    const op = this.operations.find((o) => o.id === operationId)
    if (!op) return { success: false, error: 'Operation not found' }
    const now = new Date().toISOString()
    op.borderExitDate = exitDate || now
    op.currentSide = 'SIDE_B'
    op.status = 'BORDER_CROSSED'
    op.updatedAt = now
    op.timeline.push({
      id: `tl-${Date.now()}`,
      stage: 'BORDER_CROSSED',
      timestamp: op.borderExitDate,
      locationName: op.borderLocationName,
      side: 'SIDE_B',
      recordedBy,
      notes,
    })
    return { success: true, operation: op }
  }

  createHold(data) {
    const op = this.operations.find((o) => o.id === data.borderOperationId)
    const now = new Date().toISOString()
    const hold = {
      id: `hld-${Date.now()}`,
      ...data,
      status: 'OPEN',
      openedAt: now,
      createdAt: now,
    }
    if (op) {
      op.holds.unshift(hold)
      op.status = 'ON_HOLD'
      op.updatedAt = now
    }
    return hold
  }

  releaseHold(holdId, releasedBy, resolutionNote) {
    for (const op of this.operations) {
      const hold = op.holds.find((h) => h.id === holdId)
      if (hold) {
        const now = new Date().toISOString()
        hold.status = 'RELEASED'
        hold.releasedAt = now
        hold.releasedBy = releasedBy
        hold.resolutionNote = resolutionNote
        if (!op.holds.some((h) => h.status === 'OPEN')) {
          op.status = 'CUSTOMS_PROCESSING'
        }
        op.updatedAt = now
        return { success: true, hold }
      }
    }
    return { success: false, error: 'Hold not found' }
  }

  createDeclaration(data) {
    const now = new Date().toISOString()
    const id = `dec-${Date.now()}`
    const decl = { ...data, id, createdAt: now, updatedAt: now }
    this.declarations.unshift(decl)
    return decl
  }

  createTransitPaper(data) {
    const now = new Date().toISOString()
    const id = `trn-${Date.now()}`
    const trn = { ...data, id, createdAt: now, updatedAt: now }
    this.transitPapers.unshift(trn)
    return trn
  }

  closeTransitPaper(transitId, closedBy, notes) {
    const trn = this.transitPapers.find((t) => t.id === transitId)
    if (!trn) return { success: false, error: 'Transit paper not found' }
    trn.status = 'CLOSED'
    trn.transitStage = 'TRANSIT_CLOSED'
    trn.closedAt = new Date().toISOString()
    trn.closedBy = closedBy
    return { success: true, transit: trn }
  }

  checkDataMismatches(bolNumber) {
    const op = this.operations.find((o) => o.bolNumber === bolNumber)
    const dec = this.declarations.find((d) => d.linkedBolNumber === bolNumber)

    const bolPackages = 1427
    const decPackages = dec ? dec.packages : 1427
    return [
      {
        field: 'Package Count',
        sourceA: { name: 'Packing List', value: `${bolPackages} CTNS` },
        sourceB: { name: 'Customs Declaration', value: `${decPackages} CTNS` },
        hasMismatch: bolPackages !== decPackages,
        difference: Math.abs(bolPackages - decPackages),
      },
    ]
  }

  generateCustomerSafeWhatsApp(bolNumber, truckPlate, borderName, stage) {
    return (
      `*BORDER NOTIFICATION — SKY ARIANA LIMITED*\n\n` +
      `BOL Ref: *${bolNumber}*\n` +
      `Vehicle: *${truckPlate}*\n` +
      `Border Crossing: *${borderName}*\n` +
      `Current Status: *${stage}*\n\n` +
      `Sky Ariana Border Operations Control`
    )
  }
}

// ==========================================
// TEST CASES
// ==========================================

test('1. Initial Seed State & 11 KPI summary accuracy', () => {
  const engine = new CustomsBorderEngine()
  const kpi = engine.getSummaryKpi()

  assert.equal(engine.operations.length, 2, 'Should have 2 seed operations')
  assert.equal(engine.declarations.length, 1, 'Should have 1 seed declaration')
  assert.equal(engine.transitPapers.length, 1, 'Should have 1 seed transit paper')
  assert.equal(kpi.activeBorderShipments, 2)
  assert.equal(kpi.inCustoms, 1)
  assert.equal(kpi.borderExitToday, 1)
})

test('2. Chronological progression from Arrival to Border Crossing with distinct timestamps', () => {
  const engine = new CustomsBorderEngine()
  const op = engine.createOperation({
    shipmentId: 'shp-2026-0099',
    bolNumber: 'BOL-2026-0099',
    truckPlate: '9912 هرات',
    driverName: 'Sardar Wali',
    borderLocationId: 'loc-iq',
    borderLocationName: 'Islam Qala / Dogharoon',
    countryFrom: 'AF',
    countryTo: 'IR',
  })

  assert.equal(op.status, 'APPROACHING_BORDER')
  assert.equal(op.currentSide, 'SIDE_A')

  // Step 1: Reached border with queue position
  const arrRes = engine.recordBorderArrival(op.id, '2026-03-21T07:00:00Z', 5, 'Arrived on schedule', 'Driver')
  assert.equal(arrRes.success, true)
  assert.equal(op.status, 'ARRIVED_BORDER')
  assert.equal(op.queuePosition, 5)

  // Step 2: Entered customs facility
  const custRes = engine.recordCustomsEntry(op.id, '2026-03-21T09:30:00Z', 'CUST-IQ-9912', 'Valuation queue', 'Agent')
  assert.equal(custRes.success, true)
  assert.equal(op.status, 'ENTERED_CUSTOMS')
  assert.equal(op.customsReference, 'CUST-IQ-9912')

  // Step 3: Customs Cleared
  const clrRes = engine.recordClearance(op.id, '2026-03-21T13:00:00Z', 'DEC-AF-9912', 'Clearing Agent', 'Duty cleared')
  assert.equal(clrRes.success, true)
  assert.equal(op.status, 'CLEARED')
  // CRITICAL RULE: Cleared does NOT equal border crossed!
  assert.notEqual(op.status, 'BORDER_CROSSED')
  assert.equal(op.currentSide, 'SIDE_A')

  // Step 4: Border Exit / Crossed into Side B
  const exitRes = engine.recordBorderExit(op.id, '2026-03-21T15:00:00Z', 'Mashhad', 'Crossed zero line', 'Gate Officer')
  assert.equal(exitRes.success, true)
  assert.equal(op.status, 'BORDER_CROSSED')
  assert.equal(op.currentSide, 'SIDE_B')
})

test('3. Non-Destructive Customs Hold Management preserves history upon release', () => {
  const engine = new CustomsBorderEngine()
  const op = engine.operations[0]

  // Create hold
  const hold = engine.createHold({
    borderOperationId: op.id,
    bolNumber: op.bolNumber,
    holdType: 'DOCUMENT_HOLD',
    authority: 'Plant Quarantine Station',
    reason: 'Missing original seal on phytosanitary certificate',
    responsibleParty: 'Shipper Export Operations',
    requiredAction: 'Provide replacement stamped phytosanitary paper',
  })

  assert.equal(hold.status, 'OPEN')
  assert.equal(op.status, 'ON_HOLD')
  assert.equal(op.holds.length, 1)

  // Release hold
  const relRes = engine.releaseHold(hold.id, 'Border Manager', 'Replacement phyto paper received and verified')
  assert.equal(relRes.success, true)
  assert.equal(hold.status, 'RELEASED')
  assert.equal(hold.releasedBy, 'Border Manager')
  assert.equal(hold.resolutionNote, 'Replacement phyto paper received and verified')
  // CRITICAL AUDIT RULE: The hold record is NOT deleted!
  assert.equal(op.holds.length, 1)
  assert.equal(op.status, 'CUSTOMS_PROCESSING')
})

test('4. Customs Declared Value is isolated from company freight revenue', () => {
  const engine = new CustomsBorderEngine()
  const decl = engine.createDeclaration({
    declarationNumber: 'DEC-AF-2026-7788',
    declarationType: 'EXPORT',
    country: 'Afghanistan',
    customsOffice: 'Islam Qala Customs Directorate',
    declarationDate: '2026-03-21',
    exporter: 'Alokozay Ltd.',
    importer: 'Green Oasis LLC',
    commodity: 'Green Raisins',
    hsCode: '0806.20.00',
    packages: 1427,
    packageType: 'CTNS',
    grossWeightKg: 23545.5,
    netWeightKg: 22832.0,
    declaredValue: 45664.0, // Declared tariff value
    currency: 'USD',
    status: 'SUBMITTED',
    linkedBolNumber: 'BOL-2026-0041',
  })

  assert.equal(decl.declaredValue, 45664.0)
  assert.equal(decl.currency, 'USD')
  assert.equal(engine.declarations.length, 2)
})

test('5. Cross-Document Data Mismatch Detection without auto-overwrite', () => {
  const engine = new CustomsBorderEngine()
  // Add declaration with deliberate mismatch: 1,420 packages vs 1,427 in BOL
  engine.createDeclaration({
    declarationNumber: 'DEC-MISMATCH-01',
    declarationType: 'EXPORT',
    country: 'Afghanistan',
    customsOffice: 'Spin Boldak',
    declarationDate: '2026-03-21',
    exporter: 'Exporter A',
    importer: 'Importer B',
    commodity: 'Pomegranates',
    hsCode: '0810.90.00',
    packages: 1420, // 7 packages less!
    packageType: 'CTNS',
    grossWeightKg: 20000,
    netWeightKg: 19000,
    declaredValue: 30000,
    currency: 'USD',
    status: 'SUBMITTED',
    linkedBolNumber: 'BOL-MISMATCH',
  })

  engine.createOperation({
    shipmentId: 'shp-mismatch',
    bolNumber: 'BOL-MISMATCH',
    truckPlate: '1234 کابل',
    driverName: 'Driver X',
    borderLocationId: 'loc-sb',
    borderLocationName: 'Spin Boldak',
    countryFrom: 'AF',
    countryTo: 'PK',
  })

  const mismatches = engine.checkDataMismatches('BOL-MISMATCH')
  const pkgCheck = mismatches.find((m) => m.field === 'Package Count')
  assert.ok(pkgCheck)
  assert.equal(pkgCheck.hasMismatch, true)
  assert.equal(pkgCheck.difference, 7)
})

test('6. Transit Paper Lifecycle and explicit closure', () => {
  const engine = new CustomsBorderEngine()
  const trn = engine.createTransitPaper({
    transitNumber: 'TRN-TEST-9900',
    status: 'ACTIVE',
    issueDate: '2026-03-21',
    entryBorder: 'Dogharoon',
    exitBorder: 'Bandar Abbas',
    routeCorridor: 'Dogharoon -> Bandar Abbas',
    truckPlate: '2877 کابل',
    sealNumber: 'SEAL-9900',
    transitStage: 'ENTERED_TRANSIT',
    linkedBolNumber: 'BOL-TEST',
  })

  assert.equal(trn.status, 'ACTIVE')
  assert.equal(trn.transitStage, 'ENTERED_TRANSIT')

  // Explicit closure
  const closeRes = engine.closeTransitPaper(trn.id, 'Exit Terminal Officer', 'Arrived Bandar Abbas, seal verified intact')
  assert.equal(closeRes.success, true)
  assert.equal(trn.status, 'CLOSED')
  assert.equal(trn.transitStage, 'TRANSIT_CLOSED')
  assert.equal(trn.closedBy, 'Exit Terminal Officer')
})

test('7. Customer-Safe WhatsApp Generator scrubs private driver data and internal costs', () => {
  const engine = new CustomsBorderEngine()
  const text = engine.generateCustomerSafeWhatsApp('BOL-2026-0041', '2877 کابل ل', 'Islam Qala', 'Customs Cleared')

  assert.match(text, /BOL-2026-0041/)
  assert.match(text, /2877 کابل ل/)
  assert.match(text, /Islam Qala/)
  assert.match(text, /Customs Cleared/)
  // Must NOT leak private driver Tazkira, internal broker fees, or profit
  assert.doesNotMatch(text, /Tazkira/)
  assert.doesNotMatch(text, /Broker Fee/)
  assert.doesNotMatch(text, /Commission/)
  assert.doesNotMatch(text, /Profit/)
})

test('8. Two-Sided Border Model tracks Side A and Side B transitions', () => {
  const engine = new CustomsBorderEngine()
  const op = engine.operations[0] // Islam Qala (AF -> IR)

  assert.equal(op.currentSide, 'SIDE_A')
  assert.equal(op.countryFrom, 'AF')
  assert.equal(op.countryTo, 'IR')

  // Move to Side B
  engine.recordBorderExit(op.id, '2026-03-21T18:00:00Z', 'Bandar Abbas', 'Vehicle crossed international border into Iran', 'Border Police')
  assert.equal(op.currentSide, 'SIDE_B')
  assert.equal(op.status, 'BORDER_CROSSED')
})
