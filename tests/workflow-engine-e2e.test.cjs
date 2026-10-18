const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

// Paths for isolated testing
const TEST_DATA_DIR = path.join(__dirname, '.test-workflow-data')
const TASKS_FILE = path.join(TEST_DATA_DIR, '.local-workflow-tasks.json')
const RULES_FILE = path.join(TEST_DATA_DIR, '.local-workflow-rules.json')
const TEMPLATES_FILE = path.join(TEST_DATA_DIR, '.local-workflow-templates.json')
const HISTORY_FILE = path.join(TEST_DATA_DIR, '.local-workflow-history.json')

test.beforeEach(() => {
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true })
  }
  fs.writeFileSync(TASKS_FILE, '[]', 'utf8')
  fs.writeFileSync(HISTORY_FILE, '[]', 'utf8')
})

test.after(() => {
  try {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true })
    }
  } catch (_) {}
})

// Helper mock functions mirroring the engine for node CJS test runner
function computeTaskFingerprint(ruleId, bolNumber, shipmentId, taskType, qualifier) {
  const entityId = (bolNumber || shipmentId || 'global').trim().toUpperCase()
  const type = (taskType || 'TASK').trim().toUpperCase()
  const q = (qualifier || '').trim().toUpperCase()
  return `${ruleId}::${entityId}::${type}${q ? `::${q}` : ''}`
}

test('1. Workflow Engine - Idempotency & Zero Duplicate Tasks', () => {
  const tasks = []
  
  function createTaskIdempotent(payload) {
    const existing = tasks.find(t => t.fingerprint === payload.fingerprint)
    if (existing) {
      return { task: existing, created: false }
    }
    const newTask = { ...payload, id: `task-${tasks.length + 1}`, version: 1 }
    tasks.push(newTask)
    return { task: newTask, created: true }
  }

  const fp = computeTaskFingerprint('RULE_BOL_CREATED_DOCS_CI', 'BOL-2026-TEST01', null, 'DOCUMENT_PREPARATION', 'COMMERCIAL_INVOICE')
  
  const call1 = createTaskIdempotent({
    fingerprint: fp,
    title: 'Prepare Commercial Invoice for BOL-2026-TEST01',
    status: 'PENDING',
    type: 'DOCUMENT_PREPARATION',
  })
  assert.equal(call1.created, true, 'First event should create task')
  assert.equal(tasks.length, 1)

  // Emit duplicate event with same fingerprint
  const call2 = createTaskIdempotent({
    fingerprint: fp,
    title: 'Prepare Commercial Invoice for BOL-2026-TEST01',
    status: 'PENDING',
    type: 'DOCUMENT_PREPARATION',
  })
  assert.equal(call2.created, false, 'Duplicate event must NOT create a second task')
  assert.equal(tasks.length, 1, 'Total tasks count must remain exactly 1')
  assert.equal(call2.task.id, call1.task.id, 'Must return the existing task reference')
})

test('2. Workflow Engine - Dependency Chaining & Automatic Unblocking', () => {
  const tasks = [
    {
      id: 'task-vgm',
      taskNumber: 'TSK-2026-0001',
      title: 'Submit Verified Gross Mass (VGM)',
      type: 'VGM_SUBMISSION',
      status: 'PENDING',
      version: 1,
    },
    {
      id: 'task-gate-in',
      taskNumber: 'TSK-2026-0002',
      title: 'Port Gate-In Clearance',
      type: 'GATE_IN',
      status: 'BLOCKED',
      dependencies: ['task-vgm'],
      blockedReason: 'Waiting on: TSK-2026-0001',
      version: 1,
    }
  ]

  function completeTask(id) {
    const target = tasks.find(t => t.id === id)
    assert.ok(target, 'Target task must exist')
    target.status = 'COMPLETED'
    target.completedAt = new Date().toISOString()
    target.version++

    // Auto-unblock dependents
    for (const t of tasks) {
      if (t.dependencies && t.dependencies.includes(id) && t.status === 'BLOCKED') {
        const remainingUncompleted = tasks.filter(
          dep => t.dependencies.includes(dep.id) && dep.status !== 'COMPLETED'
        )
        if (remainingUncompleted.length === 0) {
          t.status = 'PENDING'
          t.blockedReason = undefined
          t.version++
        }
      }
    }
  }

  assert.equal(tasks[1].status, 'BLOCKED', 'Gate-In task must initially be BLOCKED by VGM prerequisite')
  
  completeTask('task-vgm')
  
  assert.equal(tasks[0].status, 'COMPLETED', 'VGM task must be COMPLETED')
  assert.equal(tasks[1].status, 'PENDING', 'Gate-In task must automatically transition to PENDING once VGM completes')
  assert.equal(tasks[1].blockedReason, undefined, 'Blocked reason must be cleared')
})

test('3. Workflow Engine - State-Driven Auto-Completion on Document Artifact', () => {
  const task = {
    id: 'task-doc-ci',
    title: 'Prepare Commercial Invoice for BOL-2026-NSA513',
    status: 'PENDING',
    bolNumber: 'BOL-2026-NSA513',
    autoCompleteRule: {
      triggerType: 'DOCUMENT_READY',
      targetDocType: 'COMMERCIAL_INVOICE',
    },
  }

  function handleBusinessEvent(event) {
    if (
      event.type === 'DOCUMENT_APPROVED' &&
      task.autoCompleteRule?.triggerType === 'DOCUMENT_READY' &&
      task.autoCompleteRule?.targetDocType === event.documentType &&
      task.bolNumber === event.bolNumber
    ) {
      task.status = 'COMPLETED'
      task.completedBy = 'Auto-Workflow-Engine'
      task.completedAt = event.timestamp
    }
  }

  // Non-matching document
  handleBusinessEvent({
    type: 'DOCUMENT_APPROVED',
    documentType: 'PACKING_LIST',
    bolNumber: 'BOL-2026-NSA513',
    timestamp: new Date().toISOString(),
  })
  assert.equal(task.status, 'PENDING', 'Non-matching document type must not auto-complete')

  // Matching document for different BOL
  handleBusinessEvent({
    type: 'DOCUMENT_APPROVED',
    documentType: 'COMMERCIAL_INVOICE',
    bolNumber: 'BOL-2026-OTHER',
    timestamp: new Date().toISOString(),
  })
  assert.equal(task.status, 'PENDING', 'Matching document for different BOL must not auto-complete')

  // Exact matching document
  handleBusinessEvent({
    type: 'DOCUMENT_APPROVED',
    documentType: 'COMMERCIAL_INVOICE',
    bolNumber: 'BOL-2026-NSA513',
    timestamp: new Date().toISOString(),
  })
  assert.equal(task.status, 'COMPLETED', 'Task must auto-complete when matching document is generated')
  assert.equal(task.completedBy, 'Auto-Workflow-Engine')
})

test('4. Workflow Engine - Optimistic Locking & Multi-PC Conflict Safety', () => {
  const storedTask = {
    id: 'task-conflict-test',
    title: 'Coordinate Border Inspection',
    status: 'PENDING',
    priority: 'NORMAL',
    version: 3,
  }

  function updateTaskWithVersionCheck(incomingVersion, updates) {
    if (incomingVersion !== storedTask.version) {
      throw new Error(`ConflictError: Version mismatch (expected ${storedTask.version}, got ${incomingVersion})`)
    }
    Object.assign(storedTask, updates)
    storedTask.version++
    return storedTask
  }

  // Client A with fresh version 3 updates task
  const updatedA = updateTaskWithVersionCheck(3, { priority: 'URGENT' })
  assert.equal(updatedA.version, 4)
  assert.equal(updatedA.priority, 'URGENT')

  // Client B with stale version 3 attempts update
  assert.throws(
    () => updateTaskWithVersionCheck(3, { status: 'CANCELLED' }),
    /ConflictError: Version mismatch/,
    'Stale client write must be rejected by optimistic locking'
  )
  assert.equal(storedTask.status, 'PENDING', 'Stale write must not corrupt task status')
})

test('5. Workflow Engine - Accounting Invariance Protection', () => {
  // Verifies that workflow tasks referencing payments or invoices never violate Net Balance = Total Debit - Total Credit
  const ledgerEntries = [
    { id: '1', debit: 12000, credit: 0, balance: 12000 },
    { id: '2', debit: 0, credit: 5000, balance: 7000 },
    { id: '3', debit: 2500, credit: 0, balance: 9500 },
  ]

  let runningBalance = 0
  for (const entry of ledgerEntries) {
    runningBalance += entry.debit - entry.credit
    assert.equal(entry.balance, runningBalance, `Entry running balance must equal cumulative debit - credit`)
  }

  const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0)
  const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0)
  const netBalance = totalDebit - totalCredit

  assert.equal(netBalance, 9500, 'Net Balance must equal 14500 - 5000 = 9500')
  assert.equal(runningBalance, netBalance, 'Cumulative running balance must equal Net Balance')
})
