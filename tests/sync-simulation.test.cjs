const test = require('node:test')
const assert = require('node:assert/strict')
const loadTypescript = require('./load-typescript.cjs')

const { mergeRecordFields } = loadTypescript('lib/sync/merge.ts')
const { registerConflict, resolveConflict } = loadTypescript('lib/sync/conflict-resolver.ts')

test('Multi-Device E2E Simulation: Non-overlapping edits preserve both changes, then conflicting edits flag conflict', () => {
  // --- STEP 1: Device A creates BOL NSA500 ---
  const initialBol = {
    id: 'bol-nsa500-base',
    type: 'bol',
    version: 1,
    schemaVersion: 2,
    createdAt: '2026-09-19T08:00:00Z',
    updatedAt: '2026-09-19T08:00:00Z',
    updatedByDevice: 'DEVICE-A',
    deleted: false,
    checksum: 'hash-initial',
    data: {
      bol_number: 'NSA500',
      shipper: 'NAJEB AMIN LTD',
      consignee: 'Initial Consignee Ltd',
      notifyParty: 'Initial Notify Party',
      cargo_route_note: 'ازدوغارون کانتینر یخچالی ازبندرعباس کانتینر یخچالی',
    },
  }

  // --- STEP 2: Device B downloads it ---
  let deviceB_copy = JSON.parse(JSON.stringify(initialBol))

  // --- STEP 3: Offline edits ---
  // Device B modifies consignee
  deviceB_copy = {
    ...deviceB_copy,
    version: 2,
    updatedAt: '2026-09-19T08:30:00Z',
    updatedByDevice: 'DEVICE-B',
    data: {
      ...deviceB_copy.data,
      consignee: 'Al Burhan Global Logistics (Modified by Device B)',
    },
  }

  // Device A modifies notify party
  let deviceA_copy = {
    ...initialBol,
    version: 2,
    updatedAt: '2026-09-19T08:35:00Z',
    updatedByDevice: 'DEVICE-A',
    data: {
      ...initialBol.data,
      notifyParty: 'Kabul Express Cargo (Modified by Device A)',
    },
  }

  // --- STEP 4: First Sync Cycle ---
  const firstSyncResult = mergeRecordFields(deviceA_copy, deviceB_copy, initialBol)

  assert.equal(firstSyncResult.hasConflict, false, 'Non-overlapping changes must not conflict')
  assert.equal(firstSyncResult.success, true)
  assert.equal(
    firstSyncResult.mergedData.consignee,
    'Al Burhan Global Logistics (Modified by Device B)',
    'Device B consignee edit must be preserved'
  )
  assert.equal(
    firstSyncResult.mergedData.notifyParty,
    'Kabul Express Cargo (Modified by Device A)',
    'Device A notify party edit must be preserved'
  )
  assert.equal(
    firstSyncResult.mergedData.cargo_route_note,
    'ازدوغارون کانتینر یخچالی ازبندرعباس کانتینر یخچالی',
    'Route note must be preserved'
  )

  // Establish new synchronized base state
  const syncedBase = {
    ...initialBol,
    version: 3,
    updatedAt: '2026-09-19T09:00:00Z',
    data: firstSyncResult.mergedData,
  }

  // --- STEP 5: Conflicting Edits ---
  // Device A changes consignee to "ABC Trading"
  const deviceA_conflicting = {
    ...syncedBase,
    version: 4,
    updatedAt: '2026-09-19T09:10:00Z',
    updatedByDevice: 'DEVICE-A',
    data: {
      ...syncedBase.data,
      consignee: 'ABC Trading Dubai',
    },
  }

  // Device B changes consignee to "XYZ Cargo"
  const deviceB_conflicting = {
    ...syncedBase,
    version: 4,
    updatedAt: '2026-09-19T09:12:00Z',
    updatedByDevice: 'DEVICE-B',
    data: {
      ...syncedBase.data,
      consignee: 'XYZ Cargo Sharjah',
    },
  }

  // --- STEP 6: Second Sync Cycle (Collision) ---
  const secondSyncResult = mergeRecordFields(deviceA_conflicting, deviceB_conflicting, syncedBase)

  assert.equal(secondSyncResult.hasConflict, true, 'Concurrent edits on identical field must trigger conflict')
  assert.equal(secondSyncResult.success, false)
  assert.ok(secondSyncResult.conflictingFields.includes('consignee'))

  // Register conflict
  const conflict = registerConflict(
    'bol-nsa500-base',
    'bol',
    deviceA_conflicting,
    deviceB_conflicting,
    secondSyncResult.conflictingFields
  )
  assert.ok(conflict.id)
  assert.equal(conflict.resolved, false)

  // Resolve conflict using "keep_both" strategy
  const resolution = resolveConflict(conflict.id, {
    strategy: 'keep_both',
    resolvedByDevice: 'DEVICE-A',
  })

  assert.ok(resolution.winningRecord, 'Winning record must exist')
  assert.ok(resolution.duplicateRecord, 'Duplicate cloned record must exist when keeping both')
  assert.equal(resolution.winningRecord.data.consignee, 'ABC Trading Dubai')
  assert.equal(resolution.duplicateRecord.data.consignee, 'XYZ Cargo Sharjah')
  assert.ok(resolution.duplicateRecord.data.bol_number.includes('-CLOUD'))
})
