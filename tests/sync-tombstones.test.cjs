const test = require('node:test')
const assert = require('node:assert/strict')
const loadTypescript = require('./load-typescript.cjs')

const {
  addTombstone,
  getTombstones,
  isRecordTombstoned,
  restoreRecord,
  permanentlyDelete,
  purgeExpiredTombstones,
} = loadTypescript('lib/sync/tombstones.ts')

test('tombstone is created upon deletion and prevents record resurrection', () => {
  const recordId = `test_bol_${Date.now()}`
  const originalData = { bol_number: 'NSA472', shipper: 'Etihad' }

  // Add tombstone
  const tombstone = addTombstone(recordId, 'bol', 5, 'BOL NSA472', originalData)
  assert.equal(tombstone.recordId, recordId)
  assert.equal(tombstone.version, 6)

  // Verify tombstone is recognized
  assert.equal(isRecordTombstoned(recordId), true)

  // Test restore
  const restored = restoreRecord(recordId)
  assert.ok(restored, 'Restored data must exist')
  assert.equal(restored.bol_number, 'NSA472')
  assert.equal(isRecordTombstoned(recordId), false)
})

test('permanent deletion removes tombstone from storage', () => {
  const recordId = `perm_del_${Date.now()}`
  addTombstone(recordId, 'invoice', 1, 'INV-102')
  assert.equal(isRecordTombstoned(recordId), true)

  permanentlyDelete(recordId)
  assert.equal(isRecordTombstoned(recordId), false)
})
