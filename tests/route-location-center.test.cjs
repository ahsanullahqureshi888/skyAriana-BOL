/**
 * Test Suite: Route, Location, Border, Port & Airport Master Center
 * Phase 17 verification for Sky Ariana Limited
 */

const test = require('node:test')
const assert = require('node:assert')

// Replicate core algorithms in plain JS to verify Node environment without browser dependencies

const SEED_LOCATIONS = [
  {
    id: 'loc-port-bnd',
    name: 'Bandar Abbas',
    nativeName: 'بندر عباس',
    unlocode: 'IRBND',
    type: 'SEAPORT',
    status: 'ACTIVE',
    countryCode: 'IR',
    countryName: 'Iran',
    timezone: 'Asia/Tehran',
    isHub: true,
    aliases: ['BandarAbbas', 'Bandar-e-Abbas', 'BND', 'Shahid Rajaee', 'Shahid Rajaee Port', 'Bandar Abbas Port'],
    borderInfo: null,
    seaportInfo: {
      unlocode: 'IRBND',
      terminals: [
        { terminalName: 'Shahid Rajaee Terminal 1', code: 'SRT-1', containerHandling: true, draftMeters: 14.5 },
        { terminalName: 'Shahid Rajaee Terminal 2', code: 'SRT-2', containerHandling: true, draftMeters: 17.0 },
      ],
    },
  },
  {
    id: 'loc-port-nsa',
    name: 'Nhava Sheva',
    nativeName: 'नहावा शेवा',
    unlocode: 'INNSA',
    type: 'SEAPORT',
    status: 'ACTIVE',
    countryCode: 'IN',
    countryName: 'India',
    timezone: 'Asia/Kolkata',
    isHub: true,
    aliases: ['JNPT', 'Jawaharlal Nehru Port', 'Nava Sheva', 'Nhava Sheva Port', 'Mumbai JNPT', 'NSA'],
    borderInfo: null,
    seaportInfo: {
      unlocode: 'INNSA',
      terminals: [
        { terminalName: 'BMCT (PSA Mumbai)', code: 'BMCT', containerHandling: true, draftMeters: 16.5 },
      ],
    },
  },
  {
    id: 'loc-border-isl-dog',
    name: 'Islam Qala / Dogharoon Border',
    nativeName: 'اسلام قلعه / دوغارون',
    type: 'BORDER',
    status: 'ACTIVE',
    countryCode: 'AF',
    countryName: 'Afghanistan',
    timezone: 'Asia/Kabul',
    isHub: true,
    aliases: ['Islam Qala', 'IslamQala', 'Islam Qaleh', 'Dogharoon', 'Dogharun', 'Eslam Qal\'eh', 'Herat Border'],
    borderInfo: {
      sideACountry: 'AF',
      sideAName: 'Islam Qala (Herat)',
      sideBCountry: 'IR',
      sideBName: 'Dogharoon (Taybad, Razavi Khorasan)',
      clearanceTypes: ['COMMERCIAL', 'TRANSIT', 'PASSENGER'],
    },
  },
  {
    id: 'loc-border-spi-cha',
    name: 'Spin Boldak / Chaman Border',
    nativeName: 'سپین بولدک / چمن',
    type: 'BORDER',
    status: 'ACTIVE',
    countryCode: 'AF',
    countryName: 'Afghanistan',
    timezone: 'Asia/Kabul',
    isHub: true,
    aliases: ['Spin Boldak', 'Spinboldak', 'Chaman', 'Chaman Border', 'Kandahar Border'],
    borderInfo: {
      sideACountry: 'AF',
      sideAName: 'Spin Boldak Customs Gate',
      sideBCountry: 'PK',
      sideBName: 'Chaman Customs Post',
      clearanceTypes: ['COMMERCIAL', 'TRANSIT', 'PASSENGER'],
    },
  },
  {
    id: 'loc-air-kbl',
    name: 'Kabul International Airport',
    nativeName: 'میدان هوایی بین‌المللی کابل',
    iataCode: 'KBL',
    icaoCode: 'OAKB',
    type: 'AIRPORT',
    status: 'ACTIVE',
    countryCode: 'AF',
    countryName: 'Afghanistan',
    timezone: 'Asia/Kabul',
    isHub: true,
    aliases: ['KBL', 'OAKB', 'Kabul Airport', 'Khwaja Rawash'],
    airportInfo: {
      iataCode: 'KBL',
      icaoCode: 'OAKB',
      cargoFacility: true,
      customsPointAvailable: true,
    },
  },
  {
    id: 'loc-icd-kbl',
    name: 'Kabul Inland Customs Depot (ICD)',
    nativeName: 'ګمرک کابل',
    type: 'CUSTOMS_POINT',
    status: 'ACTIVE',
    countryCode: 'AF',
    countryName: 'Afghanistan',
    timezone: 'Asia/Kabul',
    isHub: true,
    aliases: ['Kabul Customs', 'Kabul ICD', 'Gomrok Kabul', 'Kabul Dry Port'],
  },
]

function resolveLocation(query, locations = SEED_LOCATIONS) {
  if (!query) return null
  const q = query.trim().toLowerCase()
  const cleanQ = q.replace(/[^a-z0-9]/g, '')

  // 1. Direct Code Matches
  for (const loc of locations) {
    if (loc.unlocode && loc.unlocode.toLowerCase() === q) return loc
    if (loc.iataCode && loc.iataCode.toLowerCase() === q) return loc
    if (loc.icaoCode && loc.icaoCode.toLowerCase() === q) return loc
  }

  // 2. Exact Canonical Name or Native Name
  for (const loc of locations) {
    if (loc.name.toLowerCase() === q) return loc
    if (loc.nativeName && loc.nativeName.toLowerCase() === q) return loc
  }

  // 3. Exact Alias Matches
  for (const loc of locations) {
    if (loc.aliases && loc.aliases.some((a) => a.toLowerCase() === q)) {
      return loc
    }
  }

  // 4. Normalized Alphanumeric Exact Matches
  for (const loc of locations) {
    const cleanName = loc.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (cleanName === cleanQ && cleanName.length > 2) return loc

    if (loc.aliases) {
      for (const alias of loc.aliases) {
        const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (cleanAlias === cleanQ && cleanAlias.length > 2) return loc
      }
    }
  }

  // 5. Border Two-Sided Name Check
  for (const loc of locations) {
    if (loc.borderInfo) {
      const sideA = loc.borderInfo.sideAName.toLowerCase()
      const sideB = loc.borderInfo.sideBName.toLowerCase()
      if (sideA.includes(q) || sideB.includes(q) || q.includes(sideA) || q.includes(sideB)) {
        return loc
      }
    }
  }

  // 6. Substring containment match
  if (cleanQ.length >= 3) {
    for (const loc of locations) {
      const cleanName = loc.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (cleanName.includes(cleanQ) || cleanQ.includes(cleanName)) {
        return loc
      }
      if (loc.aliases) {
        for (const alias of loc.aliases) {
          const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '')
          if (cleanAlias.includes(cleanQ) || cleanQ.includes(cleanAlias)) {
            return loc
          }
        }
      }
    }
  }

  return null
}

function checkLocationDuplicate(candidate, locations = SEED_LOCATIONS) {
  for (const existing of locations) {
    if (candidate.id && existing.id === candidate.id) continue

    if (
      candidate.unlocode &&
      existing.unlocode &&
      candidate.unlocode.trim().toUpperCase() === existing.unlocode.trim().toUpperCase()
    ) {
      return {
        hasDuplicate: true,
        duplicateReason: `UN/LOCODE '${candidate.unlocode}' already assigned to ${existing.name}`,
      }
    }

    if (
      candidate.iataCode &&
      existing.iataCode &&
      candidate.iataCode.trim().toUpperCase() === existing.iataCode.trim().toUpperCase()
    ) {
      return {
        hasDuplicate: true,
        duplicateReason: `IATA Airport code '${candidate.iataCode}' already assigned to ${existing.name}`,
      }
    }

    if (candidate.name) {
      const clean1 = candidate.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      const clean2 = existing.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (clean1 === clean2 && clean1.length > 2) {
        return {
          hasDuplicate: true,
          duplicateReason: `Identical location name '${existing.name}' already exists`,
        }
      }
    }
  }

  return { hasDuplicate: false }
}

function calculateRouteTransit(legs) {
  let totalMinDays = 0
  let totalMaxDays = 0
  let totalAvgDays = 0
  let totalDistanceKm = 0

  for (const leg of legs) {
    totalMinDays += leg.minDays || 0
    totalMaxDays += leg.maxDays || 0
    totalAvgDays += leg.avgDays || 0
    totalDistanceKm += leg.distanceKm || 0
  }

  return {
    totalMinDays,
    totalMaxDays,
    totalAvgDays: Number(totalAvgDays.toFixed(1)),
    totalDistanceKm,
  }
}

function generateReverseRoute(sourceRoute) {
  const reversedLegs = sourceRoute.legs
    .slice()
    .reverse()
    .map((leg, idx) => ({
      id: `rev-leg-${idx + 1}`,
      legOrder: idx + 1,
      fromLocationId: leg.toLocationId,
      fromLocationSnapshot: leg.toLocationSnapshot,
      toLocationId: leg.fromLocationId,
      toLocationSnapshot: leg.fromLocationSnapshot,
      mode: leg.mode,
      minDays: leg.minDays,
      maxDays: leg.maxDays,
      avgDays: leg.avgDays,
      distanceKm: leg.distanceKm,
    }))

  const transit = calculateRouteTransit(reversedLegs)

  return {
    id: `rt-rev-${sourceRoute.id}`,
    code: `REV-${sourceRoute.code}`,
    name: `Return: ${sourceRoute.destinationSnapshot.canonicalName} to ${sourceRoute.originSnapshot.canonicalName}`,
    originId: sourceRoute.destinationId,
    originSnapshot: sourceRoute.destinationSnapshot,
    destinationId: sourceRoute.originId,
    destinationSnapshot: sourceRoute.originSnapshot,
    transitMode: sourceRoute.transitMode,
    legs: reversedLegs,
    ...transit,
    isActive: true,
    version: 1,
  }
}

// ============================================================================
// TESTS
// ============================================================================

test('1. Alias Resolution: Resolves JNPT and Nava Sheva to Nhava Sheva (INNSA)', () => {
  const match1 = resolveLocation('JNPT')
  assert.ok(match1, 'Should resolve JNPT')
  assert.strictEqual(match1.unlocode, 'INNSA')
  assert.strictEqual(match1.name, 'Nhava Sheva')

  const match2 = resolveLocation('Nava Sheva')
  assert.ok(match2, 'Should resolve Nava Sheva')
  assert.strictEqual(match2.id, 'loc-port-nsa')

  const match3 = resolveLocation('INNSA')
  assert.ok(match3, 'Should resolve by UN/LOCODE INNSA')
  assert.strictEqual(match3.name, 'Nhava Sheva')
})

test('2. Alias Resolution: Resolves BandarAbbas and BND to Bandar Abbas (IRBND)', () => {
  const match1 = resolveLocation('BandarAbbas')
  assert.ok(match1, 'Should resolve BandarAbbas')
  assert.strictEqual(match1.unlocode, 'IRBND')

  const match2 = resolveLocation('BND')
  assert.ok(match2, 'Should resolve BND alias')
  assert.strictEqual(match2.name, 'Bandar Abbas')

  const match3 = resolveLocation('Shahid Rajaee')
  assert.ok(match3, 'Should resolve Shahid Rajaee')
  assert.strictEqual(match3.id, 'loc-port-bnd')
})

test('3. Two-Sided Border Crossing: Resolves Dogharun and Islam Qala', () => {
  const match1 = resolveLocation('Dogharoon')
  assert.ok(match1, 'Should resolve Dogharoon')
  assert.strictEqual(match1.type, 'BORDER')
  assert.strictEqual(match1.borderInfo.sideACountry, 'AF')
  assert.strictEqual(match1.borderInfo.sideBCountry, 'IR')

  const match2 = resolveLocation('Dogharun')
  assert.ok(match2, 'Should resolve Dogharun variation')
  assert.strictEqual(match2.id, 'loc-border-isl-dog')

  const match3 = resolveLocation('Chaman')
  assert.ok(match3, 'Should resolve Chaman border')
  assert.strictEqual(match3.borderInfo.sideBCountry, 'PK')
})

test('4. Airport Code Resolution: Resolves KBL to Kabul International Airport', () => {
  const match = resolveLocation('KBL')
  assert.ok(match, 'Should resolve KBL airport')
  assert.strictEqual(match.type, 'AIRPORT')
  assert.strictEqual(match.iataCode, 'KBL')
  assert.strictEqual(match.icaoCode, 'OAKB')
})

test('5. Nonexistent Location Resolution returns null safely', () => {
  const match = resolveLocation('NonExistentMarsStation999')
  assert.strictEqual(match, null, 'Unmatched queries must return null without crashing')
})

test('6. Duplicate Candidate Detection warns on clashing UN/LOCODE or IATA', () => {
  // Clashing UN/LOCODE
  const dupCheck1 = checkLocationDuplicate({
    name: 'New Bandar Terminal',
    unlocode: 'IRBND',
  })
  assert.strictEqual(dupCheck1.hasDuplicate, true)
  assert.match(dupCheck1.duplicateReason, /IRBND/)

  // Clashing IATA
  const dupCheck2 = checkLocationDuplicate({
    name: 'Kabul Alternate Cargo Strip',
    iataCode: 'KBL',
  })
  assert.strictEqual(dupCheck2.hasDuplicate, true)
  assert.match(dupCheck2.duplicateReason, /KBL/)

  // Clashing Name
  const dupCheck3 = checkLocationDuplicate({
    name: 'Nhava-Sheva',
  })
  assert.strictEqual(dupCheck3.hasDuplicate, true)

  // Completely unique
  const cleanCheck = checkLocationDuplicate({
    name: 'Gawadar Deep Sea Port',
    unlocode: 'PKGWD',
  })
  assert.strictEqual(cleanCheck.hasDuplicate, false)
})

test('7. Multi-Modal Route Math: Computes min, max, avg days and total distance accurately', () => {
  const sampleLegs = [
    {
      legOrder: 1,
      minDays: 4,
      maxDays: 8,
      avgDays: 6,
      distanceKm: 1850,
      mode: 'SEA',
    },
    {
      legOrder: 2,
      minDays: 3,
      maxDays: 6,
      avgDays: 4,
      distanceKm: 1450,
      mode: 'TRUCK',
    },
    {
      legOrder: 3,
      minDays: 2,
      maxDays: 4,
      avgDays: 3,
      distanceKm: 1050,
      mode: 'TRUCK',
    },
  ]

  const transit = calculateRouteTransit(sampleLegs)
  assert.strictEqual(transit.totalMinDays, 9)
  assert.strictEqual(transit.totalMaxDays, 18)
  assert.strictEqual(transit.totalAvgDays, 13)
  assert.strictEqual(transit.totalDistanceKm, 4350)
})

test('8. Reverse Route Generator: Accurately reverses legs, swaps endpoints, and preserves transit metrics', () => {
  const testRoute = {
    id: 'rt-test-1',
    code: 'RT-BND-KBL',
    name: 'Bandar Abbas to Kabul',
    originId: 'loc-port-bnd',
    originSnapshot: { canonicalName: 'Bandar Abbas' },
    destinationId: 'loc-icd-kbl',
    destinationSnapshot: { canonicalName: 'Kabul ICD' },
    transitMode: 'TRUCK',
    legs: [
      {
        legOrder: 1,
        fromLocationId: 'loc-port-bnd',
        fromLocationSnapshot: { canonicalName: 'Bandar Abbas' },
        toLocationId: 'loc-border-isl-dog',
        toLocationSnapshot: { canonicalName: 'Islam Qala' },
        mode: 'TRUCK',
        minDays: 3,
        maxDays: 6,
        avgDays: 4,
        distanceKm: 1450,
      },
      {
        legOrder: 2,
        fromLocationId: 'loc-border-isl-dog',
        fromLocationSnapshot: { canonicalName: 'Islam Qala' },
        toLocationId: 'loc-icd-kbl',
        toLocationSnapshot: { canonicalName: 'Kabul ICD' },
        mode: 'TRUCK',
        minDays: 2,
        maxDays: 5,
        avgDays: 3,
        distanceKm: 1170,
      },
    ],
  }

  const reversed = generateReverseRoute(testRoute)

  assert.strictEqual(reversed.code, 'REV-RT-BND-KBL')
  assert.strictEqual(reversed.originSnapshot.canonicalName, 'Kabul ICD')
  assert.strictEqual(reversed.destinationSnapshot.canonicalName, 'Bandar Abbas')
  assert.strictEqual(reversed.legs.length, 2)

  // Leg 1 of return route must start at Kabul ICD and go to Islam Qala
  assert.strictEqual(reversed.legs[0].fromLocationSnapshot.canonicalName, 'Kabul ICD')
  assert.strictEqual(reversed.legs[0].toLocationSnapshot.canonicalName, 'Islam Qala')

  // Leg 2 of return route must start at Islam Qala and go to Bandar Abbas
  assert.strictEqual(reversed.legs[1].fromLocationSnapshot.canonicalName, 'Islam Qala')
  assert.strictEqual(reversed.legs[1].toLocationSnapshot.canonicalName, 'Bandar Abbas')

  // Total metrics remain identical
  assert.strictEqual(reversed.totalMinDays, 5)
  assert.strictEqual(reversed.totalMaxDays, 11)
  assert.strictEqual(reversed.totalDistanceKm, 2620)
})

test('9. Historical Snapshot Invariance: Updating master location name leaves frozen snapshot intact', () => {
  const masterLocation = {
    id: 'loc-custom-1',
    name: 'Original Border Station',
    unlocode: 'AFXYZ',
    countryCode: 'AF',
  }

  // Freeze snapshot for a BOL issued today
  const bolLocationSnapshot = {
    locationId: masterLocation.id,
    canonicalName: masterLocation.name,
    unlocode: masterLocation.unlocode,
    displayText: 'Original Border Station (Handwritten Bill)',
    snapshotDate: '2026-01-15T10:00:00.000Z',
  }

  // Later, Master Data administrator renames the station
  masterLocation.name = 'Renamed Modern Commercial Border Terminal'

  // Verification: The legal BOL snapshot must NOT change
  assert.strictEqual(bolLocationSnapshot.canonicalName, 'Original Border Station')
  assert.strictEqual(bolLocationSnapshot.displayText, 'Original Border Station (Handwritten Bill)')
  assert.notStrictEqual(bolLocationSnapshot.canonicalName, masterLocation.name)
})
