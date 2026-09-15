const test = require('node:test')
const assert = require('node:assert/strict')
const { validateLedgerInvariance } = require('./load-typescript.cjs')('lib/services/ledger-sync-utils.ts')

test('detects an incorrect intermediate balance even when the final total is correct', () => {
  const result = validateLedgerInvariance({ client: [
    { date: '2026-09-01', debit: 100, balance: 999 },
    { date: '2026-09-02', credit: 20, balance: 80 },
  ] })
  assert.equal(result.isValid, false)
  assert.equal(result.discrepancies.length, 1)
})

test('audits in chronological order without rearranging the source records', () => {
  const entries = [
    { date: '2026-09-02', credit: 20, balance: 80 },
    { date: '2026-09-01', debit: 100, balance: 100 },
  ]
  assert.equal(validateLedgerInvariance({ client: entries }).isValid, true)
  assert.equal(entries[0].date, '2026-09-02')
})

test('invalid financial values cannot produce a healthy audit', () => {
  for (const value of ['invalid', Infinity, NaN]) {
    assert.equal(validateLedgerInvariance({ client: [{ debit: value, balance: 0 }] }).isValid, false)
    assert.equal(validateLedgerInvariance({ client: [{ debit: 10, balance: value }] }).isValid, false)
  }
})

test('orders legacy day-first dates and Persian digits by year, month, then day', () => {
  assert.equal(validateLedgerInvariance({ client: [
    { date: '۰۱-۱۰-۱۴۰۴', credit: 20, balance: 80 },
    { date: '۳۰-۰۹-۱۴۰۴', debit: 100, balance: 100 },
  ] }).isValid, true)
})

test('accepts credits, missing optional balances, and normal decimal arithmetic', () => {
  const result = validateLedgerInvariance({ client: [
    { debit: 0.1, balance: 0.1 },
    { debit: 0.2, balance: 0.3 },
    { credit: 1 },
  ] })
  assert.equal(result.isValid, true)
  assert.equal(result.netBalance, result.totalDebit - result.totalCredit)
})
