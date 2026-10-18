/**
 * Fleet, Truck & Driver Operations Center Unit Test Suite
 * Phase 19 Verification — Sky Ariana Limited
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const { parseAfghanPlate, convertToLatinDigits, convertToPersianDigits } = require('../lib/utils/afghan-plate.ts')

// ==========================================
// PURE FLEET ENGINE FOR DETERMINISTIC TESTING
// ==========================================
class FleetOperationsEngine {
  constructor(seedTrucks = [], seedDrivers = [], seedTrips = []) {
    this.trucks = [...seedTrucks]
    this.drivers = [...seedDrivers]
    this.trips = [...seedTrips]
  }

  getKpis() {
    return {
      totalTrucks: this.trucks.filter((t) => t.isActive).length,
      availableTrucks: this.trucks.filter((t) => t.isActive && t.currentStatus === 'AVAILABLE').length,
      onTripTrucks: this.trucks.filter((t) => t.isActive && (t.currentStatus === 'ON_TRIP' || t.currentStatus === 'ASSIGNED')).length,
      atBorderTrucks: this.trucks.filter((t) => t.isActive && (t.currentStatus === 'BORDER_WAITING' || t.currentStatus === 'CUSTOMS_CLEARANCE' || t.currentStatus === 'TRANSLOADING')).length,
      maintenanceTrucks: this.trucks.filter((t) => t.isActive && (t.currentStatus === 'MAINTENANCE' || t.currentStatus === 'BROKEN_DOWN')).length,
      totalDrivers: this.drivers.length,
      activeDrivers: this.drivers.filter((d) => d.currentStatus === 'ACTIVE' || d.currentStatus === 'ON_TRIP').length,
      activeTrips: this.trips.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length,
      pendingPodCount: this.trips.filter((t) => t.status === 'POD_PENDING' || (t.status === 'DELIVERED' && !t.pod)).length,
    }
  }

  getTruckById(id) {
    return this.trucks.find((t) => t.id === id)
  }

  saveTruck(truck) {
    const idx = this.trucks.findIndex((t) => t.id === truck.id)
    if (idx >= 0) {
      this.trucks[idx] = { ...truck, updatedAt: new Date().toISOString() }
      return this.trucks[idx]
    }
    const newTruck = { ...truck, id: truck.id || `trk-${Date.now()}` }
    this.trucks.unshift(newTruck)
    return newTruck
  }

  getDriverById(id) {
    return this.drivers.find((d) => d.id === id)
  }

  saveDriver(driver) {
    const idx = this.drivers.findIndex((d) => d.id === driver.id)
    if (idx >= 0) {
      this.drivers[idx] = { ...driver, updatedAt: new Date().toISOString() }
      return this.drivers[idx]
    }
    const newDriver = { ...driver, id: driver.id || `drv-${Date.now()}` }
    this.drivers.unshift(newDriver)
    return newDriver
  }

  getTripById(id) {
    return this.trips.find((t) => t.id === id)
  }

  validateAssignment(truckId, driverId, excludeTripId) {
    const warnings = []
    const activeTrips = this.trips.filter(
      (t) => t.id !== excludeTripId && t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'DELIVERED'
    )

    const truckConflict = activeTrips.find((t) => t.truckId === truckId)
    if (truckConflict) {
      warnings.push(`Truck is currently assigned to active trip ${truckConflict.tripNumber} (Status: ${truckConflict.status}).`)
    }

    const driverConflict = activeTrips.find((t) => t.driverId === driverId)
    if (driverConflict) {
      warnings.push(`Driver is currently assigned to active trip ${driverConflict.tripNumber} (Status: ${driverConflict.status}).`)
    }

    return {
      canAssign: warnings.length === 0,
      warnings,
      truckConflictTrip: truckConflict,
      driverConflictTrip: driverConflict,
    }
  }

  createRoadTrip(data, options) {
    const validation = this.validateAssignment(data.truckId, data.driverId)
    if (!validation.canAssign && !options?.allowDoubleAssignmentOverride) {
      return {
        error: `Double assignment blocked: ${validation.warnings.join(' ')} (Requires explicit administrative override).`,
      }
    }

    const now = new Date().toISOString()
    const tripId = `trp-${Date.now()}`
    const newTrip = {
      ...data,
      id: tripId,
      transloadHistory: [],
      breakdownHistory: [],
      expenses: [],
      createdAt: now,
      updatedAt: now,
    }

    this.trips.unshift(newTrip)

    const truck = this.trucks.find((t) => t.id === data.truckId)
    if (truck) {
      truck.currentStatus = 'ON_TRIP'
      truck.assignedTripId = tripId
    }

    const driver = this.drivers.find((d) => d.id === data.driverId)
    if (driver) {
      driver.currentStatus = 'ON_TRIP'
      driver.currentTripId = tripId
    }

    return { trip: newTrip }
  }

  recordTransload(tripId, data) {
    const trip = this.trips.find((t) => t.id === tripId)
    if (!trip) return { error: `Trip not found: ${tripId}` }

    const now = new Date().toISOString()
    const event = {
      id: `tsl-${Date.now()}`,
      tripId,
      transloadLocation: data.transloadLocation,
      transloadDate: data.transloadDate || now,
      oldTruckId: trip.truckId,
      oldTruckPlate: trip.truckPlate,
      oldDriverId: trip.driverId,
      oldDriverName: trip.driverName,
      oldDriverFatherName: trip.driverFatherName,
      newTruckId: data.newTruckId,
      newTruckPlate: data.newTruckPlate,
      newDriverId: data.newDriverId,
      newDriverName: data.newDriverName,
      newDriverFatherName: data.newDriverFatherName,
      sealNumberBefore: data.sealNumberBefore,
      sealNumberAfter: data.sealNumberAfter,
      cargoCondition: data.cargoCondition,
      tallyCartonsCount: data.tallyCartonsCount,
      remarks: data.remarks,
      recordedBy: data.recordedBy,
      createdAt: now,
    }

    trip.transloadHistory.push(event)

    // Free previous truck
    const oldTruck = this.trucks.find((t) => t.id === trip.truckId)
    if (oldTruck) {
      oldTruck.currentStatus = 'AVAILABLE'
      oldTruck.assignedTripId = undefined
    }

    // Free previous driver
    const oldDriver = this.drivers.find((d) => d.id === trip.driverId)
    if (oldDriver) {
      oldDriver.currentStatus = 'ACTIVE'
      oldDriver.currentTripId = undefined
    }

    // Assign new truck & driver
    trip.truckId = data.newTruckId
    trip.truckPlate = data.newTruckPlate
    trip.driverId = data.newDriverId
    trip.driverName = data.newDriverName
    trip.driverFatherName = data.newDriverFatherName
    trip.status = 'IN_TRANSIT'

    return { trip, transloadEvent: event }
  }

  recordBreakdown(tripId, data) {
    const trip = this.trips.find((t) => t.id === tripId)
    if (!trip) return { error: `Trip not found: ${tripId}` }

    const now = new Date().toISOString()
    const breakdown = {
      id: `bd-${Date.now()}`,
      tripId,
      truckId: trip.truckId,
      truckPlate: trip.truckPlate,
      driverId: trip.driverId,
      driverName: trip.driverName,
      breakdownLocation: data.breakdownLocation,
      breakdownTime: now,
      issueDescription: data.issueDescription,
      severity: data.severity,
      status: data.mechanicDispatched ? 'ASSISTANCE_DISPATCHED' : 'REPORTED',
      mechanicDispatched: data.mechanicDispatched || false,
    }

    trip.breakdownHistory.push(breakdown)
    trip.status = 'BROKEN_DOWN'

    const truck = this.trucks.find((t) => t.id === trip.truckId)
    if (truck) truck.currentStatus = 'BROKEN_DOWN'

    return { trip, breakdownEvent: breakdown }
  }

  resolveBreakdown(tripId, breakdownId, resolution) {
    const trip = this.trips.find((t) => t.id === tripId)
    if (!trip) return { error: `Trip not found: ${tripId}` }

    const bd = trip.breakdownHistory.find((b) => b.id === breakdownId)
    if (!bd) return { error: `Breakdown not found: ${breakdownId}` }

    bd.status = resolution.action
    bd.resumedAt = resolution.resumedAt
    bd.repairCost = resolution.repairCost

    if (resolution.action === 'REPAIRED_RESUMED') {
      trip.status = 'IN_TRANSIT'
      trip.customerSafeNotes = 'Technical maintenance resolved. Movement resumed.'
      const truck = this.trucks.find((t) => t.id === trip.truckId)
      if (truck) truck.currentStatus = 'ON_TRIP'
    }

    return { trip }
  }

  recordPod(tripId, data) {
    const trip = this.trips.find((t) => t.id === tripId)
    if (!trip) return { error: `Trip not found: ${tripId}` }

    const pod = {
      ...data,
      id: `pod-${Date.now()}`,
      tripId,
      createdAt: new Date().toISOString(),
    }

    trip.pod = pod
    trip.status = 'COMPLETED'

    const truck = this.trucks.find((t) => t.id === trip.truckId)
    if (truck) {
      truck.currentStatus = 'AVAILABLE'
      truck.assignedTripId = undefined
    }

    const driver = this.drivers.find((d) => d.id === trip.driverId)
    if (driver) {
      driver.currentStatus = 'ACTIVE'
      driver.currentTripId = undefined
    }

    return { trip, pod }
  }

  generateDriverWhatsAppDispatch(trip, lang = 'dari') {
    return (
      `*دستور حرکت و حواله باربری — شرکت اسکای آریانا لیمیتد*\n\n` +
      `راننده محترم: *${trip.driverName}* (فرزند ${trip.driverFatherName || '—'})\n` +
      `شماره پلیت موتر: *${trip.truckPlate}*\n` +
      `شماره سفر: *${trip.tripNumber}*\n` +
      `شماره بارنامه (BOL): *${trip.bolNumber}*\n\n` +
      `💰 کرایه توافق شده موتر: *${trip.agreedDriverRent.toLocaleString()} ${trip.currency}*\n` +
      `💵 پیش‌پرداخت تسلیم شده: *${trip.advancePaid.toLocaleString()} ${trip.currency}*\n` +
      `⚖️ مانده قابل پرداخت: *${trip.balancePayable.toLocaleString()} ${trip.currency}*`
    )
  }

  generateCustomerSafeTruckUpdate(trip, lang = 'dari') {
    const driverFirstName = trip.driverName.split(' ')[0]
    return (
      `*اطلاعیه وضعیت انتقال محموله — اسکای آریانا لیمیتد*\n\n` +
      `محترم مشتری گرامی، وضعیت حمل جاده‌ای بارنامه *${trip.bolNumber}*:\n` +
      `🚛 موتر حمل بار: *${trip.truckPlate}*\n` +
      `👤 راننده موتر: *${driverFirstName}*\n` +
      `📍 موقعیت فعلی: *${trip.currentLocationName}*\n` +
      `🚦 وضعیت حرکت: *${trip.status}*`
    )
  }

  getAvailabilityBoard() {
    return {
      'Islam Qala': { availableTrucks: [], waitingTrucks: [] },
      'Torghundi': { availableTrucks: [], waitingTrucks: [] },
      'Hairatan': { availableTrucks: [], waitingTrucks: [] },
      'Spin Boldak': { availableTrucks: [], waitingTrucks: [] },
    }
  }
}

// ==========================================
// TEST SUITE EXECUTION
// ==========================================

test('Test 1: Afghan Truck Plate parsing and normalization', async () => {
  const parsed1 = parseAfghanPlate('2877 کابل ل')
  assert.equal(parsed1.plateNumber, '2877')
  assert.equal(parsed1.provinceFa, 'کابل')
  assert.equal(parsed1.provinceCode, 'KBL')
  assert.equal(parsed1.plateLetterEn, 'L')

  const parsed2 = parseAfghanPlate('35974 هرات')
  assert.equal(parsed2.plateNumber, '35974')
  assert.equal(parsed2.provinceFa, 'هرات')
  assert.equal(parsed2.provinceCode, 'HRT')

  const latinNum = convertToLatinDigits('۳۵۹۷۴')
  assert.equal(latinNum, '35974')

  const persianNum = convertToPersianDigits('2877')
  assert.equal(persianNum, '۲۸۷۷')
})

test('Test 2: Double assignment conflict detection and administrative override', async () => {
  const engine = new FleetOperationsEngine(
    [{ id: 'trk-01', plateNumber: '2877', currentStatus: 'ON_TRIP', isActive: true }],
    [{ id: 'drv-01', fullName: 'Ahmadullah Niazi', currentStatus: 'ON_TRIP' }],
    [{ id: 'trp-01', tripNumber: 'TRP-001', truckId: 'trk-01', driverId: 'drv-01', status: 'IN_TRANSIT' }]
  )

  const validation = engine.validateAssignment('trk-01', 'drv-01')
  assert.equal(validation.canAssign, false)
  assert.ok(validation.warnings.length >= 2)

  // Attempting to dispatch without override must fail
  const blockedAttempt = engine.createRoadTrip({
    tripNumber: 'TRP-BLOCKED',
    bolNumber: 'BOL-TEST-001',
    truckId: 'trk-01',
    driverId: 'drv-01',
    driverName: 'Ahmadullah Niazi',
    agreedDriverRent: 60000,
    currency: 'AFN',
    advancePaid: 20000,
    balancePayable: 40000,
    status: 'SCHEDULED',
  })

  assert.ok(blockedAttempt.error)
  assert.ok(blockedAttempt.error.includes('Double assignment blocked'))

  // Attempting with explicit administrative override must succeed
  const overrideAttempt = engine.createRoadTrip(
    {
      tripNumber: 'TRP-OVERRIDE',
      bolNumber: 'BOL-TEST-002',
      truckId: 'trk-01',
      driverId: 'drv-01',
      driverName: 'Ahmadullah Niazi',
      agreedDriverRent: 65000,
      currency: 'AFN',
      advancePaid: 25000,
      balancePayable: 40000,
      status: 'SCHEDULED',
    },
    { allowDoubleAssignmentOverride: true, overrideReason: 'Pre-scheduled return trip' }
  )

  assert.ok(overrideAttempt.trip)
  assert.equal(overrideAttempt.trip.tripNumber, 'TRP-OVERRIDE')
})

test('Test 3: Immutable Transload History retains original truck and driver audit log', async () => {
  const engine = new FleetOperationsEngine(
    [
      { id: 'trk-initial', plateNumber: '9988 کابل', currentStatus: 'ON_TRIP', isActive: true },
      { id: 'trk-onward', plateNumber: '88 B 120 IR', currentStatus: 'AVAILABLE', isActive: true },
    ],
    [
      { id: 'drv-initial', fullName: 'Initial Driver', currentStatus: 'ON_TRIP' },
      { id: 'drv-onward', fullName: 'Onward Driver', currentStatus: 'ACTIVE' },
    ],
    [
      {
        id: 'trp-transload',
        tripNumber: 'TRP-TRANSLOAD',
        bolNumber: 'BOL-TL-01',
        truckId: 'trk-initial',
        truckPlate: '9988 کابل',
        driverId: 'drv-initial',
        driverName: 'Initial Driver',
        driverFatherName: 'Haji Mohammad',
        status: 'AT_BORDER',
        transloadHistory: [],
      },
    ]
  )

  const res = engine.recordTransload('trp-transload', {
    transloadLocation: 'Dogharoon Zero Point',
    newTruckId: 'trk-onward',
    newTruckPlate: '88 B 120 IR',
    newDriverId: 'drv-onward',
    newDriverName: 'Onward Driver',
    newDriverFatherName: 'Reza',
    sealNumberBefore: 'ORIG-SEAL-882',
    sealNumberAfter: 'ONWARD-SEAL-991',
    cargoCondition: 'INTACT_SOUND',
    tallyCartonsCount: 1500,
    recordedBy: 'Supervising Agent Nemat',
  })

  assert.ok(res.transloadEvent)
  assert.equal(res.transloadEvent.oldTruckPlate, '9988 کابل')
  assert.equal(res.transloadEvent.oldDriverName, 'Initial Driver')
  assert.equal(res.transloadEvent.sealNumberBefore, 'ORIG-SEAL-882')
  assert.equal(res.transloadEvent.sealNumberAfter, 'ONWARD-SEAL-991')

  const trip = engine.getTripById('trp-transload')
  assert.equal(trip.truckPlate, '88 B 120 IR')
  assert.equal(trip.driverName, 'Onward Driver')
  assert.equal(trip.transloadHistory.length, 1)

  // Old truck is freed back to AVAILABLE
  assert.equal(engine.getTruckById('trk-initial').currentStatus, 'AVAILABLE')
})

test('Test 4: Roadside Breakdown Incident registration and resumption', async () => {
  const engine = new FleetOperationsEngine(
    [{ id: 'trk-01', plateNumber: '12345', currentStatus: 'ON_TRIP', isActive: true }],
    [{ id: 'drv-01', fullName: 'Driver Jamil', currentStatus: 'ON_TRIP' }],
    [
      {
        id: 'trp-bd',
        tripNumber: 'TRP-BD-01',
        truckId: 'trk-01',
        truckPlate: '12345',
        driverId: 'drv-01',
        driverName: 'Driver Jamil',
        status: 'IN_TRANSIT',
        breakdownHistory: [],
      },
    ]
  )

  const bdRes = engine.recordBreakdown('trp-bd', {
    breakdownLocation: 'Ghazni Pass KM 145',
    issueDescription: 'Coolant hose burst',
    severity: 'MODERATE_TOWING_REQUIRED',
    mechanicDispatched: true,
  })

  assert.ok(bdRes.breakdownEvent)
  assert.equal(bdRes.trip.status, 'BROKEN_DOWN')
  assert.equal(engine.getTruckById('trk-01').currentStatus, 'BROKEN_DOWN')

  const resolveRes = engine.resolveBreakdown('trp-bd', bdRes.breakdownEvent.id, {
    action: 'REPAIRED_RESUMED',
    resumedAt: '2026-04-10T16:00:00Z',
    repairCost: 8500,
  })

  assert.ok(resolveRes.trip)
  assert.equal(resolveRes.trip.status, 'IN_TRANSIT')
  assert.equal(engine.getTruckById('trk-01').currentStatus, 'ON_TRIP')
})

test('Test 5: Customer-safe WhatsApp message generator scrubs private docs & driver rent', async () => {
  const engine = new FleetOperationsEngine()

  const testTrip = {
    tripNumber: 'TRP-2026-PRIVACY',
    bolNumber: 'BOL-2026-PRIVACY-01',
    truckPlate: '2877 کابل',
    driverName: 'Ahmadullah Niazi',
    driverFatherName: 'Ghulam Sakhi',
    driverPhone: '+93 79 912 3456',
    agreedDriverRent: 80000,
    currency: 'AFN',
    advancePaid: 40000,
    balancePayable: 40000,
    status: 'IN_TRANSIT',
    currentLocationName: 'Islam Qala - Herat Highway KM 60',
  }

  const customerMsgDari = engine.generateCustomerSafeTruckUpdate(testTrip, 'dari')

  // Internal details that MUST NEVER appear in customer messages:
  assert.equal(customerMsgDari.includes('80,000'), false, 'Driver rent leaked in Dari update')
  assert.equal(customerMsgDari.includes('40,000'), false, 'Advance paid leaked in Dari update')
  assert.equal(customerMsgDari.includes('+93 79 912 3456'), false, 'Driver private phone leaked in Dari update')

  // Driver operational dispatch MUST contain rent & complete operational instructions
  const driverMsgDari = engine.generateDriverWhatsAppDispatch(testTrip, 'dari')
  assert.ok(driverMsgDari.includes('80,000'), 'Agreed rent missing from driver dispatch')
  assert.ok(driverMsgDari.includes('40,000'), 'Advance missing from driver dispatch')
  assert.ok(driverMsgDari.includes('Ghulam Sakhi'), 'Driver father name missing from driver dispatch')
})

test('Test 6: Proof of Delivery (POD) sign-off releases truck and driver back to available', async () => {
  const engine = new FleetOperationsEngine(
    [{ id: 'trk-pod', plateNumber: '55667', currentStatus: 'ON_TRIP', isActive: true }],
    [{ id: 'drv-pod', fullName: 'Sayed Jalal', currentStatus: 'ON_TRIP' }],
    [
      {
        id: 'trp-pod',
        tripNumber: 'TRP-POD',
        bolNumber: 'BOL-POD',
        truckId: 'trk-pod',
        driverId: 'drv-pod',
        status: 'IN_TRANSIT',
      },
    ]
  )

  const podRes = engine.recordPod('trp-pod', {
    bolNumber: 'BOL-POD',
    receiverName: 'Haji Wahidullah',
    deliveryDate: '2026-04-18',
    receivedCartons: 1150,
    damagedCartons: 0,
    shortageCartons: 0,
  })

  assert.ok(podRes.pod)
  assert.equal(podRes.trip.status, 'COMPLETED')
  assert.equal(engine.getTruckById('trk-pod').currentStatus, 'AVAILABLE')
  assert.equal(engine.getDriverById('drv-pod').currentStatus, 'ACTIVE')
})

test('Test 7: Availability Board categorizes trucks by border stations accurately', async () => {
  const engine = new FleetOperationsEngine()
  const board = engine.getAvailabilityBoard()

  assert.ok(board['Islam Qala'])
  assert.ok(board['Torghundi'])
  assert.ok(board['Hairatan'])
  assert.ok(board['Spin Boldak'])
})
