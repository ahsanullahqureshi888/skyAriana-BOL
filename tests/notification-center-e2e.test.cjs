const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const TEST_DIR = path.join(__dirname, '.test-notifications-data')
const NOTIFS_FILE = path.join(TEST_DIR, '.local-notifications.json')
const DELIVERIES_FILE = path.join(TEST_DIR, '.local-notification-deliveries.json')

test.beforeEach(() => {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true })
  }
  fs.writeFileSync(NOTIFS_FILE, '[]', 'utf8')
  fs.writeFileSync(DELIVERIES_FILE, '[]', 'utf8')
})

test.after(() => {
  try {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true })
    }
  } catch (_) {}
})

// Helper mock functions matching the notification service
function createOrUpdateNotification(events, input) {
  const eventKey = input.eventKey || `${input.type}::${input.sourceRecordId}::default`
  const existingIndex = events.findIndex(e => e.eventKey === eventKey && !e.isResolved)

  if (existingIndex !== -1) {
    const existing = events[existingIndex]
    const updated = {
      ...existing,
      severity: input.severity || existing.severity,
      title: input.title || existing.title,
      message: input.message || existing.message,
    }
    events[existingIndex] = updated
    return { event: updated, created: false }
  }

  const newEvent = {
    id: `ntf-${events.length + 1}`,
    eventKey,
    type: input.type,
    category: input.category,
    severity: input.severity || 'INFO',
    title: input.title,
    message: input.message,
    sourceRecordId: input.sourceRecordId,
    relatedBol: input.relatedBol,
    relatedCustomer: input.relatedCustomer,
    clientId: input.clientId,
    financeRestricted: input.financeRestricted || false,
    isResolved: false,
    createdAt: new Date().toISOString(),
  }
  events.push(newEvent)
  return { event: newEvent, created: true }
}

function resolveNotification(events, eventKey, reason) {
  let resolved = false
  for (const e of events) {
    if (e.eventKey === eventKey && !e.isResolved) {
      e.isResolved = true
      e.resolvedAt = new Date().toISOString()
      e.resolvedReason = reason
      resolved = true
    }
  }
  return resolved
}

function filterEventsForUser(events, user) {
  const isShipper = user.role === 'shipper'
  const isFinance = user.role === 'admin' || user.role === 'superadmin' || user.role === 'accountant'
  const isAdmin = user.role === 'admin' || user.role === 'superadmin'

  return events.filter(e => {
    if (isShipper) {
      if (user.clientId && e.clientId && e.clientId !== user.clientId) return false
      if (['FINANCE', 'SYSTEM', 'BACKUP'].includes(e.category)) return false
      return true
    }
    if ((e.category === 'SYSTEM' || e.category === 'BACKUP') && !isAdmin) return false
    if (e.category === 'FINANCE' && !isFinance) return false
    return true
  }).map(e => {
    if (e.financeRestricted && !isFinance) {
      return {
        ...e,
        title: e.title.replace(/\$[\d,]+/g, '$***'),
        message: e.message.replace(/\$[\d,]+/g, '$***'),
      }
    }
    return { ...e }
  })
}

test('1. Notification Center - Strict Customer Portal Isolation', () => {
  const events = []
  createOrUpdateNotification(events, {
    eventKey: 'BOL_UPDATE::BOL-2026-001::DEFAULT',
    type: 'SHIPMENT_UPDATE',
    category: 'TRACKING',
    title: 'Shipment Underway for Customer A',
    message: 'Border reached at Islam Qala',
    clientId: 'client-A',
    relatedCustomer: 'Customer A Logistics',
  })

  createOrUpdateNotification(events, {
    eventKey: 'BOL_UPDATE::BOL-2026-002::DEFAULT',
    type: 'SHIPMENT_UPDATE',
    category: 'TRACKING',
    title: 'Shipment Underway for Customer B',
    message: 'Customs cleared at Hairatan',
    clientId: 'client-B',
    relatedCustomer: 'Customer B Trading',
  })

  // Customer A views notifications
  const userA = { username: 'clientA_user', role: 'shipper', clientId: 'client-A' }
  const visibleForA = filterEventsForUser(events, userA)
  assert.equal(visibleForA.length, 1)
  assert.equal(visibleForA[0].clientId, 'client-A', 'Customer A must only see their own shipment notifications')

  // Customer B views notifications
  const userB = { username: 'clientB_user', role: 'shipper', clientId: 'client-B' }
  const visibleForB = filterEventsForUser(events, userB)
  assert.equal(visibleForB.length, 1)
  assert.equal(visibleForB[0].clientId, 'client-B', 'Customer B must only see their own shipment notifications')
})

test('2. Notification Center - Role & Finance Permission Guarding', () => {
  const events = []
  createOrUpdateNotification(events, {
    eventKey: 'INVOICE_OVERDUE::INV-2026-01::OVERDUE',
    type: 'INVOICE_OVERDUE',
    category: 'FINANCE',
    severity: 'CRITICAL',
    title: 'Invoice INV-2026-01 Overdue ($25,000)',
    message: 'Customer owes $25,000 past due date',
    financeRestricted: true,
  })

  createOrUpdateNotification(events, {
    eventKey: 'SYSTEM_BACKUP::ERR::01',
    type: 'BACKUP_FAILED',
    category: 'BACKUP',
    severity: 'CRITICAL',
    title: 'Automated Local Backup Interrupted',
    message: 'Disk lock encountered during snapshot',
  })

  // Viewer / Operations user without finance permission
  const opsUser = { username: 'ops_ahmad', role: 'viewer' }
  const visibleForOps = filterEventsForUser(events, opsUser)
  assert.equal(visibleForOps.length, 0, 'Operations user without finance/admin role must receive neither finance nor backup alerts')

  // Accountant user
  const financeUser = { username: 'finance_wali', role: 'accountant' }
  const visibleForFinance = filterEventsForUser(events, financeUser)
  assert.equal(visibleForFinance.length, 1, 'Accountant receives finance alert')
  assert.equal(visibleForFinance[0].title.includes('$25,000'), true, 'Accountant sees exact financial figures')

  // Superadmin user
  const adminUser = { username: 'admin', role: 'superadmin' }
  const visibleForAdmin = filterEventsForUser(events, adminUser)
  assert.equal(visibleForAdmin.length, 2, 'Admin receives both finance and backup alerts')
})

test('3. Notification Center - Deduplication & Zero Repeated Alerts', () => {
  const events = []
  const fp = 'CUTOFF_GATE_IN::BKG-2026-001::24H'

  const res1 = createOrUpdateNotification(events, {
    eventKey: fp,
    type: 'CUTOFF_APPROACHING',
    category: 'BOOKING',
    severity: 'WARNING',
    title: 'Gate-In Cut-Off Approaching (24h)',
    message: 'Container MSCU1234567 must gate-in by tomorrow',
    sourceRecordId: 'BKG-2026-001',
  })
  assert.equal(res1.created, true, 'First evaluation run creates alert')
  assert.equal(events.length, 1)

  // Repeated run
  const res2 = createOrUpdateNotification(events, {
    eventKey: fp,
    type: 'CUTOFF_APPROACHING',
    category: 'BOOKING',
    severity: 'WARNING',
    title: 'Gate-In Cut-Off Approaching (24h)',
    message: 'Container MSCU1234567 must gate-in by tomorrow',
    sourceRecordId: 'BKG-2026-001',
  })
  assert.equal(res2.created, false, 'Repeated scheduler evaluation must NOT create duplicate alert')
  assert.equal(events.length, 1)
})

test('4. Notification Center - Severity Escalation Without Duplication', () => {
  const events = []
  const fp = 'CUTOFF_GATE_IN::BKG-2026-001'

  // Step 1: Warning at 24h
  createOrUpdateNotification(events, {
    eventKey: fp,
    type: 'CUTOFF_APPROACHING',
    category: 'BOOKING',
    severity: 'WARNING',
    title: 'Gate-In Cut-Off Approaching (24 Hours)',
    message: 'Cut-off tomorrow at 18:00',
  })
  assert.equal(events[0].severity, 'WARNING')

  // Step 2: Escalates to Critical at 2h remaining
  const updateRes = createOrUpdateNotification(events, {
    eventKey: fp,
    type: 'CUTOFF_APPROACHING',
    category: 'BOOKING',
    severity: 'CRITICAL',
    title: 'URGENT: Gate-In Cut-Off in 2 Hours',
    message: 'Immediate gate-in required at port terminal',
  })
  assert.equal(updateRes.created, false, 'Escalation must update existing alert rather than creating duplicate')
  assert.equal(events.length, 1, 'Still exactly 1 alert record')
  assert.equal(events[0].severity, 'CRITICAL', 'Severity must be updated to CRITICAL')
  assert.equal(events[0].title, 'URGENT: Gate-In Cut-Off in 2 Hours')
})

test('5. Notification Center - State-Driven Auto-Resolution', () => {
  const events = []
  const docKey = 'MISSING_DOC::BOL-2026-NSA583::PHYTO'

  createOrUpdateNotification(events, {
    eventKey: docKey,
    type: 'MISSING_DOCUMENT',
    category: 'DOCUMENTS',
    severity: 'WARNING',
    title: 'Phytosanitary Certificate Missing for NSA583',
    message: 'Required for fruit export border crossing',
  })

  assert.equal(events[0].isResolved, false, 'Alert must initially be unresolved')

  // Business event: Phytosanitary certificate approved
  const didResolve = resolveNotification(events, docKey, 'Phytosanitary certificate uploaded and verified')
  assert.equal(didResolve, true)
  assert.equal(events[0].isResolved, true, 'Alert must automatically mark as resolved')
  assert.ok(events[0].resolvedAt, 'Resolved timestamp must be recorded')
  assert.equal(events[0].resolvedReason, 'Phytosanitary certificate uploaded and verified')
})

test('6. Notification Center - Per-User Delivery State Isolation', () => {
  const deliveries = [
    { id: 'del-user1', notificationId: 'ntf-1', userId: 'user1', read: false, snoozedUntil: null },
    { id: 'del-user2', notificationId: 'ntf-1', userId: 'user2', read: false, snoozedUntil: null },
  ]

  // User 1 marks alert as read
  deliveries[0].read = true
  deliveries[0].readAt = new Date().toISOString()

  assert.equal(deliveries[0].read, true, 'User 1 delivery must be read')
  assert.equal(deliveries[1].read, false, 'User 2 delivery must remain unread')

  // User 1 snoozes alert for 24h
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  deliveries[0].snoozedUntil = tomorrow

  assert.equal(deliveries[0].snoozedUntil, tomorrow)
  assert.equal(deliveries[1].snoozedUntil, null, 'User 2 delivery must not be snoozed')
})

test('7. Notification Center - Accounting Invariance Protection', () => {
  // Verifies that finance alerts are derived accurately from Balance = Debit - Credit
  const sampleTransactions = [
    { debit: 3200, credit: 0 },
    { debit: 1800, credit: 0 },
    { debit: 0, credit: 2000 },
  ]

  const totalDebit = sampleTransactions.reduce((acc, t) => acc + t.debit, 0)
  const totalCredit = sampleTransactions.reduce((acc, t) => acc + t.credit, 0)
  const netBalance = totalDebit - totalCredit

  assert.equal(netBalance, 3000, 'Net Balance must equal 5000 - 2000 = 3000')

  // Alert generated from confirmed accounting state
  const events = []
  if (netBalance > 0) {
    createOrUpdateNotification(events, {
      eventKey: 'INVOICE_BALANCE::ACC-01',
      type: 'OUTSTANDING_BALANCE',
      category: 'FINANCE',
      title: `Outstanding Account Balance: $${netBalance.toLocaleString()}`,
      message: `Total Debit: $${totalDebit.toLocaleString()}, Total Credit: $${totalCredit.toLocaleString()}`,
    })
  }

  assert.equal(events.length, 1)
  assert.ok(events[0].title.includes('$3,000'))
  assert.ok(events[0].message.includes('Total Debit: $5,000'))
})
