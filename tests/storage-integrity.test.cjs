const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const load = require('./load-typescript.cjs')
const storage = load('lib/services/blob-db.ts', {
  '@vercel/blob': {
    list: async () => ({ blobs: [] }),
    put: async () => ({}),
  },
})

async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sky-storage-test-'))
  t.after(() => fs.rm(dir, { recursive: true, force: true }))
  return path.join(dir, 'snapshot.json')
}

test('modifying input or returned JSON cannot change persisted cache values', async t => {
  const file = await fixture(t)
  const input = { rows: [{ debit: 10 }] }
  await storage.writeJsonFile(file, input)
  input.rows[0].debit = 999
  const first = await storage.readJsonFile(file, {})
  assert.equal(first.rows[0].debit, 10)
  first.rows[0].debit = 500
  assert.equal((await storage.readJsonFile(file, {})).rows[0].debit, 10)
  assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).rows[0].debit, 10)
})

test('a queued write captures the draft at the time it is requested', async t => {
  const file = await fixture(t)
  const input = { debit: 10 }
  const writing = storage.writeJsonFile(file, input)
  input.debit = 99
  await writing
  assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).debit, 10)
})

test('failed mutation does not leak unsaved changes into reads', async t => {
  const file = await fixture(t)
  await storage.writeJsonFile(file, { debit: 10 })
  await assert.rejects(storage.mutateJsonFile(file, {}, current => {
    current.debit = 99
    throw new Error('cancelled')
  }), /cancelled/)
  assert.equal((await storage.readJsonFile(file, {})).debit, 10)
})

test('concurrent read-modify-write operations preserve every increment', async t => {
  const file = await fixture(t)
  await Promise.all(Array.from({ length: 20 }, () => storage.mutateJsonFile(file, 0, n => n + 1)))
  assert.equal(await storage.readJsonFile(file, 0), 20)
})
