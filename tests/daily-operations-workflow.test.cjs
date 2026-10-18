const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

// Test environment setup
const TEST_DIR = path.join(__dirname, '.test-daily-ops')
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true })
}

test.after(() => {
  try {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true })
    }
  } catch (_) {}
})

// ============================================================================
// Core Daily Operations Invariance & Business Logic Unit Tests
// ============================================================================

test('1. Task Deduplication: stable keys prevent duplicate tasks on repeat scans', () => {
  const tasks = []

  function createOrUpdateTask(data) {
    const dedupKey = data.deduplication_key || `${data.task_type}::${data.entity_id}`
    const existingIndex = tasks.findIndex(
      (t) => t.deduplication_key === dedupKey && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
    )

    if (existingIndex >= 0) {
      const existing = tasks[existingIndex]
      tasks[existingIndex] = {
        ...existing,
        ...data,
        id: existing.id,
        updated_at: new Date().toISOString(),
        activity_history: [
          ...(existing.activity_history || []),
          { action: 'NOTE_ADDED', details: 'Task refreshed' },
        ],
      }
      return { task: tasks[existingIndex], created: false }
    }

    const newTask = {
      ...data,
      id: `TSK-2026-000${tasks.length + 1}`,
      deduplication_key: dedupKey,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      activity_history: [{ action: 'CREATED', details: data.title }],
    }
    tasks.push(newTask)
    return { task: newTask, created: true }
  }

  // Scan 1: Stale tracking detected
  const res1 = createOrUpdateTask({
    task_type: 'TRACKING_UPDATE_REQUIRED',
    entity_id: 'SHP-101',
    bol_number: 'BOL-9001',
    title: 'Tracking update required for BOL-9001',
    status: 'OPEN',
    priority: 'HIGH',
  })
  assert.equal(res1.created, true, 'Task should be created on first run')
  assert.equal(tasks.length, 1)

  // Scan 2 (Repeat morning scan): Same shipment
  const res2 = createOrUpdateTask({
    task_type: 'TRACKING_UPDATE_REQUIRED',
    entity_id: 'SHP-101',
    bol_number: 'BOL-9001',
    title: 'Tracking update required for BOL-9001',
    status: 'OPEN',
    priority: 'HIGH',
  })
  assert.equal(res2.created, false, 'Repeat scan must NOT create duplicate task')
  assert.equal(tasks.length, 1, 'Total tasks count must remain 1')
  assert.equal(tasks[0].activity_history.length, 2, 'Activity history should record refresh')
})

test('2. Stale Tracking Rules: road (24h), port (48h), and sea (72h) thresholds', () => {
  const config = {
    trackingFollowUpHoursRoad: 24,
    trackingFollowUpHoursPort: 48,
    trackingFollowUpHoursSea: 72,
  }

  function evaluateTrackingStaleness(shipment, nowMs) {
    const lastUpdateMs = new Date(shipment.updatedAt).getTime()
    const hoursSinceUpdate = Math.round((nowMs - lastUpdateMs) / (1000 * 60 * 60))

    if (shipment.stage === 'road' && hoursSinceUpdate >= config.trackingFollowUpHoursRoad) {
      return { stale: true, taskType: 'TRACKING_UPDATE_REQUIRED', hoursSinceUpdate }
    }
    if (shipment.stage === 'port' && hoursSinceUpdate >= config.trackingFollowUpHoursPort) {
      return { stale: true, taskType: 'PORT_FOLLOWUP', hoursSinceUpdate }
    }
    if (shipment.stage === 'sea' && hoursSinceUpdate >= config.trackingFollowUpHoursSea) {
      return { stale: true, taskType: 'VESSEL_FOLLOWUP', hoursSinceUpdate }
    }
    return { stale: false, hoursSinceUpdate }
  }

  const now = Date.now()
  const h25Ago = new Date(now - 25 * 3600 * 1000).toISOString()
  const h40Ago = new Date(now - 40 * 3600 * 1000).toISOString()
  const h50Ago = new Date(now - 50 * 3600 * 1000).toISOString()
  const h75Ago = new Date(now - 75 * 3600 * 1000).toISOString()

  // Road truck 25h ago -> Stale
  const roadCheck = evaluateTrackingStaleness({ stage: 'road', updatedAt: h25Ago }, now)
  assert.equal(roadCheck.stale, true)
  assert.equal(roadCheck.taskType, 'TRACKING_UPDATE_REQUIRED')

  // Port container 40h ago -> Not stale (<48h)
  const portCheck1 = evaluateTrackingStaleness({ stage: 'port', updatedAt: h40Ago }, now)
  assert.equal(portCheck1.stale, false)

  // Port container 50h ago -> Stale (>48h)
  const portCheck2 = evaluateTrackingStaleness({ stage: 'port', updatedAt: h50Ago }, now)
  assert.equal(portCheck2.stale, true)
  assert.equal(portCheck2.taskType, 'PORT_FOLLOWUP')

  // Vessel 75h ago -> Stale (>72h)
  const seaCheck = evaluateTrackingStaleness({ stage: 'sea', updatedAt: h75Ago }, now)
  assert.equal(seaCheck.stale, true)
  assert.equal(seaCheck.taskType, 'VESSEL_FOLLOWUP')
})

test('3. Border Delay Detection: flags trucks held at border >48 hours', () => {
  const borderThresholdHours = 48
  const now = Date.now()

  function evaluateBorderTruck(truck, nowMs) {
    const arrivalMs = new Date(truck.borderArrival).getTime()
    const waitHours = Math.round((nowMs - arrivalMs) / (1000 * 60 * 60))
    const isDelayed = waitHours >= borderThresholdHours
    return {
      isDelayed,
      waitHours,
      priority: waitHours > borderThresholdHours * 2 ? 'URGENT' : 'HIGH',
    }
  }

  const truck1 = { borderStation: 'Islam Qala', borderArrival: new Date(now - 30 * 3600 * 1000).toISOString() }
  const res1 = evaluateBorderTruck(truck1, now)
  assert.equal(res1.isDelayed, false, '30h waiting should not be flagged')

  const truck2 = { borderStation: 'Torghundi', borderArrival: new Date(now - 55 * 3600 * 1000).toISOString() }
  const res2 = evaluateBorderTruck(truck2, now)
  assert.equal(res2.isDelayed, true, '55h waiting must be flagged')
  assert.equal(res2.priority, 'HIGH')

  const truck3 = { borderStation: 'Hairatan', borderArrival: new Date(now - 100 * 3600 * 1000).toISOString() }
  const res3 = evaluateBorderTruck(truck3, now)
  assert.equal(res3.isDelayed, true)
  assert.equal(res3.priority, 'URGENT', 'Severe delay >96h must escalate to URGENT')
})

test('4. Document Reminders: identifies missing documents and itemizes incomplete fields', () => {
  const bol = {
    bolNumber: 'BOL-AFG-9021',
    shipperName: 'Ariana Fruits Ltd',
    grossWeightKg: null, // missing
    sealNumber: 'SL-88772',
    consigneeName: 'Dubai Global Trading',
  }

  const existingDocs = [
    { type: 'COMMERCIAL_INVOICE', status: 'DRAFT' },
    // PACKING_LIST is completely missing
  ]

  const requiredTypes = ['COMMERCIAL_INVOICE', 'PACKING_LIST', 'TRANSIT_PAPER']
  const incompleteTasks = []

  for (const reqType of requiredTypes) {
    const match = existingDocs.find((d) => d.type === reqType)
    const missingItems = []
    let isIncomplete = false

    if (!match) {
      isIncomplete = true
      missingItems.push('Document draft not created')
    } else if (match.status === 'DRAFT') {
      if (!bol.grossWeightKg) missingItems.push('Gross Weight')
      if (!bol.sealNumber) missingItems.push('Seal Number')
      if (!bol.consigneeName) missingItems.push('Consignee Details')
      isIncomplete = missingItems.length > 0 || match.status === 'DRAFT'
    }

    if (isIncomplete) {
      incompleteTasks.push({
        task_type: 'DOCUMENT_INCOMPLETE',
        bol_number: bol.bolNumber,
        doc_type: reqType,
        missing_items: missingItems,
      })
    }
  }

  assert.equal(incompleteTasks.length, 3, 'All 3 documents have issues')
  const ci = incompleteTasks.find((t) => t.doc_type === 'COMMERCIAL_INVOICE')
  assert.ok(ci.missing_items.includes('Gross Weight'), 'Missing gross weight must be itemized')
  const pl = incompleteTasks.find((t) => t.doc_type === 'PACKING_LIST')
  assert.ok(pl.missing_items.includes('Document draft not created'))
})

test('5. Customer Collection Notes: logs contact method, promise date, and updates follow-up date', () => {
  let task = {
    id: 'TSK-2026-0042',
    task_type: 'CUSTOMER_PAYMENT_FOLLOWUP',
    account_name: 'Kabul Traders LLC',
    outstanding_amount: 15000,
    currency: 'USD',
    days_overdue: 10,
    status: 'OPEN',
    collection_notes: [],
  }

  function recordCollectionNote(taskRef, noteData) {
    const note = {
      id: `cn-${Date.now()}`,
      ...noteData,
    }
    return {
      ...taskRef,
      collection_notes: [note, ...(taskRef.collection_notes || [])],
      last_follow_up_date: noteData.date,
      promised_payment_date: noteData.promisedDate || taskRef.promised_payment_date,
      follow_up_date: noteData.promisedDate || taskRef.follow_up_date,
      updated_at: new Date().toISOString(),
    }
  }

  const updatedTask = recordCollectionNote(task, {
    date: '2026-09-22',
    user: 'Ahmad (Finance)',
    contactMethod: 'Phone',
    note: 'Spoke with CFO; approved payment voucher for Thursday wire transfer.',
    promisedDate: '2026-09-25',
    result: 'Payment Promised',
  })

  assert.equal(updatedTask.collection_notes.length, 1)
  assert.equal(updatedTask.collection_notes[0].contactMethod, 'Phone')
  assert.equal(updatedTask.promised_payment_date, '2026-09-25')
  assert.equal(updatedTask.follow_up_date, '2026-09-25', 'Follow-up date should sync with promise date')
})

test('6. Auto-Resolver Engine: resolves tasks when underlying entity is updated', () => {
  const openTasks = [
    { id: 'T1', task_type: 'MISSING_CONTAINER_NUMBER', entity_id: 'SHP-501', status: 'OPEN' },
    { id: 'T2', task_type: 'CUSTOMER_PAYMENT_FOLLOWUP', entity_id: 'INV-2026-10', status: 'OPEN' },
    { id: 'T3', task_type: 'APPROVAL_REQUIRED', entity_id: 'APP-99', status: 'OPEN' },
  ]

  // Simulating updated DB state
  const liveShipments = [{ id: 'SHP-501', container: { containerNumber: 'MSCU1234567' } }]
  const liveInvoices = [{ id: 'INV-2026-10', status: 'paid', isPaid: true }]
  const liveApprovals = [{ id: 'APP-99', status: 'APPROVED', action_by_name: 'Executive Director' }]

  function resolveTasks(tasks) {
    return tasks.map((t) => {
      let resolved = false
      let note = ''

      if (t.task_type === 'MISSING_CONTAINER_NUMBER') {
        const s = liveShipments.find((x) => x.id === t.entity_id)
        if (s && s.container?.containerNumber) {
          resolved = true
          note = `Container assigned: ${s.container.containerNumber}`
        }
      } else if (t.task_type === 'CUSTOMER_PAYMENT_FOLLOWUP') {
        const inv = liveInvoices.find((x) => x.id === t.entity_id)
        if (inv && inv.isPaid) {
          resolved = true
          note = 'Invoice settled in full'
        }
      } else if (t.task_type === 'APPROVAL_REQUIRED') {
        const app = liveApprovals.find((x) => x.id === t.entity_id)
        if (app && app.status !== 'PENDING') {
          resolved = true
          note = `Approval completed with status: ${app.status}`
        }
      }

      return resolved
        ? { ...t, status: 'COMPLETED', completion_note: note, completed_at: new Date().toISOString() }
        : t
    })
  }

  const results = resolveTasks(openTasks)
  assert.equal(results.filter((t) => t.status === 'COMPLETED').length, 3)
  assert.equal(results[0].completion_note, 'Container assigned: MSCU1234567')
  assert.equal(results[1].completion_note, 'Invoice settled in full')
  assert.equal(results[2].completion_note, 'Approval completed with status: APPROVED')
})

test('7. Multi-Currency Segregation: End-of-Day report segregates USD, AFN, EUR without cross-currency sum', () => {
  const payments = [
    { amount: 5000, currency: 'USD' },
    { amount: 120000, currency: 'AFN' },
    { amount: 3000, currency: 'USD' },
    { amount: 4500, currency: 'EUR' },
  ]

  const totalsMap = new Map()
  for (const p of payments) {
    totalsMap.set(p.currency, (totalsMap.get(p.currency) || 0) + p.amount)
  }

  const totals = Array.from(totalsMap.entries()).map(([currency, amount]) => ({ currency, amount }))

  assert.equal(totals.length, 3, 'Should produce 3 distinct currency buckets')
  assert.equal(totals.find((t) => t.currency === 'USD').amount, 8000)
  assert.equal(totals.find((t) => t.currency === 'AFN').amount, 120000)
  assert.equal(totals.find((t) => t.currency === 'EUR').amount, 4500)

  // Verify formatting does not lump them together
  const formatted = totals.map((t) => `${t.amount.toLocaleString()} ${t.currency}`).join(' | ')
  assert.ok(formatted.includes('8,000 USD'))
  assert.ok(formatted.includes('120,000 AFN'))
  assert.ok(formatted.includes('4,500 EUR'))
})

test('8. Report Finalization & Snapshot Immutability: locked reports cannot be overwritten without force', () => {
  const reports = [
    {
      id: 'DOP-20260922-V1',
      reportDate: '2026-09-22',
      version: 1,
      status: 'FINAL',
      finalizedAt: '2026-09-22T17:00:00.000Z',
      finalizedBy: 'Director',
      summary: { activeShipments: 12 },
    },
  ]

  function getOrGenerateReport(targetDate, forceRegenerate = false) {
    const existing = reports.find((r) => r.reportDate === targetDate && r.status === 'FINAL')
    if (existing && !forceRegenerate) {
      return { report: existing, regenerated: false }
    }
    const newReport = {
      id: `DOP-20260922-V${reports.length + 1}`,
      reportDate: targetDate,
      version: reports.length + 1,
      status: 'DRAFT',
      summary: { activeShipments: 15 },
    }
    reports.push(newReport)
    return { report: newReport, regenerated: true }
  }

  // Normal request returns immutable FINAL snapshot
  const res1 = getOrGenerateReport('2026-09-22', false)
  assert.equal(res1.regenerated, false)
  assert.equal(res1.report.status, 'FINAL')
  assert.equal(res1.report.version, 1)

  // Explicit forceRegenerate spawns Rev 2
  const res2 = getOrGenerateReport('2026-09-22', true)
  assert.equal(res2.regenerated, true)
  assert.equal(res2.report.version, 2)
  assert.equal(res2.report.status, 'DRAFT')
})

test('9. Multilingual WhatsApp Status Generator: verifies English, Pashto, and Dari outputs', () => {
  const sampleReport = {
    reportDate: '2026-09-22',
    summary: {
      activeShipments: 18,
      atBorder: 3,
      atPort: 4,
      atSea: 5,
      arrivingSoon: 2,
      updatesNeeded: 4,
      documentsPending: 2,
      invoicesOverdue: 3,
      pendingApprovals: 1,
      criticalIssues: 0,
    },
    customerPaymentTotals: [{ currency: 'USD', amount: 15000 }],
    outstandingTotals: [{ currency: 'USD', amount: 45000 }],
    managementNote: 'All border operations running smoothly.',
  }

  function generateWhatsApp(report, lang) {
    const { summary, reportDate } = report
    if (lang === 'EN') {
      return `*SKY ARIANA LIMITED — DAILY OPERATIONS STATUS*\nDate: ${reportDate}\nActive Shipments: ${summary.activeShipments}\nAt Border: ${summary.atBorder}`
    }
    if (lang === 'PS') {
      return `*د سکای آریانا لمټیډ د ورځنیو عملیاتو راپور*\nنېټه: ${reportDate}\nفعال کارګوګانې: ${summary.activeShipments}\nپه سرحد کې: ${summary.atBorder}`
    }
    if (lang === 'FA') {
      return `*گزارش روزانه عملیاتی شرکت بین‌المللی اسکای آریانا*\nتاریخ: ${reportDate}\nمحموله‌های فعال: ${summary.activeShipments}\nدر مرز: ${summary.atBorder}`
    }
    return ''
  }

  const en = generateWhatsApp(sampleReport, 'EN')
  assert.ok(en.includes('SKY ARIANA LIMITED'))
  assert.ok(en.includes('Active Shipments: 18'))

  const ps = generateWhatsApp(sampleReport, 'PS')
  assert.ok(ps.includes('د سکای آریانا لمټیډ د ورځنیو عملیاتو راپور'))
  assert.ok(ps.includes('فعال کارګوګانې: 18'))

  const fa = generateWhatsApp(sampleReport, 'FA')
  assert.ok(fa.includes('گزارش روزانه عملیاتی شرکت بین‌المللی اسکای آریانا'))
  assert.ok(fa.includes('محموله‌های فعال: 18'))
})

test('10. Accounting Invariance Identity: Balance = Total Debit - Total Credit preserved in accounts', () => {
  const ledgerEntries = [
    { type: 'DEBIT', amount: 10000, description: 'Freight charge BOL-101' },
    { type: 'CREDIT', amount: 4000, description: 'Customer deposit' },
    { type: 'DEBIT', amount: 1500, description: 'Demurrage fee' },
    { type: 'CREDIT', amount: 2000, description: 'Bank wire transfer' },
  ]

  let runningBalance = 0
  let totalDebit = 0
  let totalCredit = 0

  for (const entry of ledgerEntries) {
    if (entry.type === 'DEBIT') {
      totalDebit += entry.amount
      runningBalance += entry.amount
    } else {
      totalCredit += entry.amount
      runningBalance -= entry.amount
    }
  }

  const netBalance = totalDebit - totalCredit
  assert.equal(runningBalance, netBalance, 'Running balance must equal Total Debit - Total Credit')
  assert.equal(totalDebit, 11500)
  assert.equal(totalCredit, 6000)
  assert.equal(netBalance, 5500)
})
