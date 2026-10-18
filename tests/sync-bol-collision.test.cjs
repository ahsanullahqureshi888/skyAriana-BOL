const test = require('node:test')
const assert = require('node:assert/strict')
const loadTypescript = require('./load-typescript.cjs')

const { detectBolNumberCollision } = loadTypescript('lib/sync/merge.ts')
const { resolveConflict } = loadTypescript('lib/sync/conflict-resolver.ts')

test('detectBolNumberCollision flags duplicate BOL numbers with distinct internal IDs', () => {
  const localRecords = [
    {
      id: 'bol_internal_01',
      type: 'bol',
      version: 1,
      schemaVersion: 2,
      createdAt: '2026-09-19T10:00:00Z',
      updatedAt: '2026-09-19T10:00:00Z',
      updatedByDevice: 'DEVICE-KANDAHAR',
      deleted: false,
      checksum: 'h1',
      data: { bol_number: 'BOL-2026-NSA500', shipper_name: 'Shipper A' },
    },
  ]

  const cloudRecords = [
    {
      id: 'bol_internal_02', // Different internal primary key!
      type: 'bol',
      version: 1,
      schemaVersion: 2,
      createdAt: '2026-09-19T10:02:00Z',
      updatedAt: '2026-09-19T10:02:00Z',
      updatedByDevice: 'DEVICE-LAPTOP',
      deleted: false,
      checksum: 'h2',
      data: { bol_number: 'BOL-2026-NSA500', shipper_name: 'Shipper B' },
    },
  ]

  const detection = detectBolNumberCollision(localRecords, cloudRecords)
  assert.equal(detection.hasCollision, true)
  assert.equal(detection.collisions.length, 1)
  assert.equal(detection.collisions[0].bolNumber, 'BOL-2026-NSA500')
  assert.equal(detection.collisions[0].localId, 'bol_internal_01')
  assert.equal(detection.collisions[0].cloudId, 'bol_internal_02')
})
