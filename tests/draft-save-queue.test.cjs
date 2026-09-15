const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const filename = path.resolve(__dirname, '../lib/services/draft-save-queue.ts')
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const subject = new Module(filename, module)
subject._compile(compiled, filename)
const { DraftSaveQueue } = subject.exports
const tick = () => new Promise(resolve => setImmediate(resolve))

test('serializes requests and coalesces rapid edits into the newest draft', async () => {
  const requests = [], releases = [], statuses = []
  const queue = new DraftSaveQueue(draft => {
    requests.push(draft)
    return new Promise(resolve => releases.push(resolve))
  }, state => statuses.push(state))
  queue.enqueue('first')
  queue.enqueue('intermediate')
  queue.enqueue('latest')
  assert.deepEqual(requests, ['first'])
  releases.shift()()
  await tick()
  assert.deepEqual(requests, ['first', 'latest'])
  assert.equal(statuses.includes('saved'), false)
  releases.shift()()
  await tick()
  assert.equal(statuses.at(-1), 'saved')
  queue.dispose()
})

test('failed backup remains pending and can be retried without another edit', async () => {
  let attempts = 0
  const statuses = []
  const queue = new DraftSaveQueue(async draft => {
    assert.equal(draft, 'draft')
    if (++attempts === 1) throw new Error('offline')
  }, state => statuses.push(state))
  queue.enqueue('draft')
  await tick()
  assert.equal(statuses.at(-1), 'local')
  queue.retry()
  await tick()
  assert.equal(attempts, 2)
  assert.equal(statuses.at(-1), 'saved')
  queue.dispose()
})

test('unmount suppresses late status updates and pending requests', async () => {
  let release
  const statuses = [], requests = []
  const queue = new DraftSaveQueue(draft => {
    requests.push(draft)
    return new Promise(resolve => { release = resolve })
  }, state => statuses.push(state))
  queue.enqueue('first')
  queue.enqueue('later')
  queue.dispose()
  release()
  await tick()
  assert.deepEqual(requests, ['first'])
  assert.deepEqual(statuses, ['saving'])
})
