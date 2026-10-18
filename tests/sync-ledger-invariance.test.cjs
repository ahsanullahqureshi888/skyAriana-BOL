const test = require('node:test')
const assert = require('node:assert/strict')
const loadTypescript = require('./load-typescript.cjs')

const { mergeLedgerEntriesByStableId, verifyAccountingInvariance } = loadTypescript('lib/sync/merge.ts')

test('ledger accounting invariance strictly satisfies Balance = Debit - Credit', () => {
  const entries = [
    { id: 'tx-1', date: '2026-09-01', debit: 1500, credit: 0 },
    { id: 'tx-2', date: '2026-09-02', debit: 0, credit: 500 },
    { id: 'tx-3', date: '2026-09-03', debit: 2000, credit: 0 },
    { id: 'tx-4', date: '2026-09-04', debit: 0, credit: 1200 },
  ]

  const check = verifyAccountingInvariance(entries)
  assert.equal(check.valid, true)
  assert.equal(check.totalDebit, 3500)
  assert.equal(check.totalCredit, 1700)
  assert.equal(check.netBalance, 1800)
})

test('ledger entries merge by stable ID and recalculate running balances chronologically', () => {
  // Device A has transactions 1 & 2
  const localEntries = [
    { id: 'led_01', date: '2026-09-10', description: 'Freight NSA490', debit: 1000, credit: 0 },
    { id: 'led_02', date: '2026-09-12', description: 'Payment received', debit: 0, credit: 400 },
  ]

  // Device B added transaction 3 offline with date between 1 & 2
  const cloudEntries = [
    { id: 'led_01', date: '2026-09-10', description: 'Freight NSA490', debit: 1000, credit: 0 },
    { id: 'led_03', date: '2026-09-11', description: 'Border Clearance Fee', debit: 250, credit: 0 },
  ]

  const merged = mergeLedgerEntriesByStableId(localEntries, cloudEntries)

  assert.equal(merged.entries.length, 3)
  assert.equal(merged.invariance.valid, true)
  assert.equal(merged.invariance.totalDebit, 1250)
  assert.equal(merged.invariance.totalCredit, 400)
  assert.equal(merged.invariance.netBalance, 850)

  // Verify chronological order: led_01 (Sep 10) -> led_03 (Sep 11) -> led_02 (Sep 12)
  assert.equal(merged.entries[0].id, 'led_01')
  assert.equal(merged.entries[0].balance, 1000)

  assert.equal(merged.entries[1].id, 'led_03')
  assert.equal(merged.entries[1].balance, 1250)

  assert.equal(merged.entries[2].id, 'led_02')
  assert.equal(merged.entries[2].balance, 850)
})
