const test = require('node:test')
const assert = require('node:assert/strict')
const loadTypescript = require('./load-typescript.cjs')

const { canonicalizeJson, computeRecordChecksum, isChecksumEqual } = loadTypescript('lib/sync/checksums.ts')

test('deterministic canonicalization sorts keys and ignores key insertion order', () => {
  const objA = { z: 1, a: 'test', m: { b: 2, a: 1 } }
  const objB = { a: 'test', m: { a: 1, b: 2 }, z: 1 }

  assert.equal(canonicalizeJson(objA), canonicalizeJson(objB))
  assert.equal(computeRecordChecksum(objA), computeRecordChecksum(objB))
})

test('checksum changes when nested data is modified', () => {
  const objA = { bol_number: 'NSA500', consignee: { name: 'Company A' } }
  const objB = { bol_number: 'NSA500', consignee: { name: 'Company B' } }

  const hashA = computeRecordChecksum(objA)
  const hashB = computeRecordChecksum(objB)

  assert.notEqual(hashA, hashB)
  assert.equal(isChecksumEqual(hashA, hashB), false)
  assert.equal(isChecksumEqual(hashA, hashA), true)
})

test('checksum handles empty objects, nulls, and arrays stably', () => {
  const emptyHash = computeRecordChecksum({})
  assert.equal(typeof emptyHash, 'string')
  assert.equal(emptyHash.length, 64)

  const arrayHash1 = computeRecordChecksum([1, 2, 3])
  const arrayHash2 = computeRecordChecksum([1, 2, 3])
  assert.equal(arrayHash1, arrayHash2)
})
