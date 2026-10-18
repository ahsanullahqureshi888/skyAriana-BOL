const test = require('node:test')
const assert = require('node:assert/strict')
const loadTypescript = require('./load-typescript.cjs')

const { mergeRecordFields } = loadTypescript('lib/sync/merge.ts')

test('disjoint field-level edits auto-merge without conflict', () => {
  const base = {
    id: 'bol-123',
    type: 'bol',
    version: 1,
    schemaVersion: 2,
    createdAt: '2026-09-19T10:00:00Z',
    updatedAt: '2026-09-19T10:00:00Z',
    updatedByDevice: 'DEVICE-ORIGIN',
    deleted: false,
    checksum: 'base-hash',
    data: {
      bol_number: 'NSA499',
      consignee: 'Original Consignee',
      notifyParty: 'Original Notify Party',
      cargo_route_note: 'ازدوغارون کانتینر یخچالی ازبندرعباس کانتینر یخچالی',
    },
  }

  // Device A modifies consignee offline
  const localRecord = {
    ...base,
    version: 2,
    updatedAt: '2026-09-19T10:05:00Z',
    updatedByDevice: 'DEVICE-A',
    data: {
      ...base.data,
      consignee: 'Updated by Device A',
    },
  }

  // Device B modifies notifyParty offline
  const cloudRecord = {
    ...base,
    version: 2,
    updatedAt: '2026-09-19T10:06:00Z',
    updatedByDevice: 'DEVICE-B',
    data: {
      ...base.data,
      notifyParty: 'Updated by Device B',
    },
  }

  const result = mergeRecordFields(localRecord, cloudRecord, base)

  assert.equal(result.hasConflict, false)
  assert.equal(result.success, true)
  assert.equal(result.conflictingFields.length, 0)
  assert.equal(result.mergedData.consignee, 'Updated by Device A')
  assert.equal(result.mergedData.notifyParty, 'Updated by Device B')
  assert.equal(result.mergedData.cargo_route_note, 'ازدوغارون کانتینر یخچالی ازبندرعباس کانتینر یخچالی')
})

test('conflicting edits on the same scalar field flag a sync conflict', () => {
  const base = {
    id: 'bol-123',
    type: 'bol',
    version: 1,
    schemaVersion: 2,
    createdAt: '2026-09-19T10:00:00Z',
    updatedAt: '2026-09-19T10:00:00Z',
    updatedByDevice: 'DEVICE-ORIGIN',
    deleted: false,
    checksum: 'base-hash',
    data: {
      bol_number: 'NSA499',
      consignee: 'Initial Buyer',
    },
  }

  // Device A edits consignee to ABC
  const localRecord = {
    ...base,
    version: 2,
    data: { bol_number: 'NSA499', consignee: 'ABC Logistics' },
  }

  // Device B edits consignee to XYZ
  const cloudRecord = {
    ...base,
    version: 2,
    data: { bol_number: 'NSA499', consignee: 'XYZ International' },
  }

  const result = mergeRecordFields(localRecord, cloudRecord, base)

  assert.equal(result.hasConflict, true)
  assert.equal(result.success, false)
  assert.ok(result.conflictingFields.includes('consignee'))
})
