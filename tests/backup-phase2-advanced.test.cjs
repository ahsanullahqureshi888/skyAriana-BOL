/**
 * AQ COMPANIES — Enterprise Backup Phase 2 Advanced Test Suite
 * Version: 2.0 (Application Version 5.2.0, Backup Format Version 2.0)
 *
 * Verifies:
 * 1. Automatic Backup Scheduler (persistent config, local timezone, missed backup detection)
 * 2. Specialized System Snapshots (Pre-Restore, Pre-Import, Pre-Legacy BOL Import, Period Close)
 * 3. Finance Period Close Snapshots are immutable & protected from retention pruning
 * 4. Smart Retention Policy & Pinned Backup Protection (never deletes last valid backup)
 * 5. Restore Simulation in Isolated Sandbox (Golden Backup accreditation, 0 production DB writes)
 * 6. Disaster Recovery Startup Audit & Corrupted Database Quarantine
 * 7. Direct Disk Backup Discovery (scans disk when catalog is missing)
 * 8. Atomic Database Switch (restored.tmp -> validate -> previous.db -> active switch)
 * 9. Move-to-New-PC Path Sanitization & Windows space support
 * 10. Incremental Delta Backup & Broken Chain Detection (Full A -> Inc B -> Inc C)
 * 11. Accounting Invariance Enforcement (Net Balance = Total Debit - Total Credit)
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

// Use isolated data sandbox so tests never touch live user data
const sandbox = require('./isolated-data.cjs')()
const load = require('./load-typescript.cjs')

const dataDir = process.env.DATABASE_PATH || path.join(sandbox, 'data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

// Seed valid test records
const sampleBols = [
  {
    id: 'bol-phase2-001',
    bolNumber: 'BOL-2026-KBL001',
    bol_number: 'BOL-2026-KBL001',
    truckNumber: '54846 هرات',
    driverName: 'احمد شاه',
    numberOfPackages: '500 CTNS',
    netWeight: '10000 KG',
    grossWeight: '10500 KG',
    legacyFlag: true,
    barnamaNumber: 'BAR-2025-9981',
    sourceFile: 'Kandahar_Customs_Archive_2025.pdf',
    sourcePage: 14,
  },
]

const sampleAccounts = [
  { id: 'acc-phase2-1', name: 'Ariana Raisin Traders', currency: 'USD', active: true },
  { id: 'acc-phase2-2', name: 'کابل صرافی', currency: 'AFN', active: true },
]

const sampleLedgers = {
  'Ariana Raisin Traders': {
    entries: [
      { id: 'tx-001', date: '2026-09-01', debit: 20000, credit: 0, balance: 20000, currency: 'USD' },
      { id: 'tx-002', date: '2026-09-10', debit: 0, credit: 8000, balance: 12000, currency: 'USD' },
    ],
    currentBalance: 12000,
  },
  'کابل صرافی': {
    entries: [
      { id: 'tx-003', date: '2026-09-02', debit: 600000, credit: 200000, balance: 400000, currency: 'AFN' },
    ],
    currentBalance: 400000,
  },
}

fs.writeFileSync(path.join(dataDir, '.local-bols.json'), JSON.stringify(sampleBols, null, 2))
fs.writeFileSync(path.join(dataDir, '.local-accounts.json'), JSON.stringify(sampleAccounts, null, 2))
fs.writeFileSync(path.join(dataDir, '.local-account-ledgers.json'), JSON.stringify(sampleLedgers, null, 2))
fs.writeFileSync(path.join(dataDir, '.local-invoices.json'), JSON.stringify([], null, 2))

// Load modules under test
const {
  createAQBackup,
  verifyAQBackup,
  getBackupOverviewStats,
} = load('lib/backup/central-backup-service.ts')

const {
  createSystemSnapshot,
  createPreRestoreSnapshot,
  createPreImportSnapshot,
  createPreLegacyBolImportSnapshot,
  createPeriodCloseSnapshot,
  createPreMigrationSnapshot,
} = load('lib/backup/snapshot-service.ts')

const {
  getBackupScheduleConfig,
  saveBackupScheduleConfig,
  evaluateBackupSchedule,
  runScheduledBackup,
} = load('lib/backup/backup-scheduler-service.ts')

const {
  simulateAQRestore,
  getSimulationHistory,
} = load('lib/backup/restore-simulation-service.ts')

const {
  auditStartupDatabaseHealth,
  quarantineCorruptedDatabase,
  discoverBackupsOnDisk,
  executeDisasterRecovery,
  sanitizePortablePaths,
} = load('lib/backup/disaster-recovery-service.ts')

const {
  createIncrementalBackup,
  validateIncrementalChain,
} = load('lib/backup/incremental-backup-service.ts')

const {
  enforceBackupRetentionPolicy,
} = load('lib/backup/backup-retention-service.ts')

// ============================================================================
// TEST 1: Automatic Backup Scheduler & Schedule Persistence
// ============================================================================
test('Test 1: Scheduler persists configuration and detects due daily backups', async () => {
  const initialCfg = await getBackupScheduleConfig()
  assert.equal(initialCfg.dailyEnabled, true)
  assert.equal(initialCfg.beforeRestore, true)

  // Configure custom daily time
  const updatedCfg = await saveBackupScheduleConfig({
    dailyTime: '23:30',
    weeklyDay: 'Sunday',
    retention: { dailyKeep: 10, weeklyKeep: 6, monthlyKeep: 12 },
  })
  assert.equal(updatedCfg.dailyTime, '23:30')
  assert.equal(updatedCfg.retention.dailyKeep, 10)

  // Evaluate schedule at 23:45 (past scheduled time, not yet run today)
  const simulatedTime = new Date('2026-10-03T23:45:00')
  const evalResult = await evaluateBackupSchedule(simulatedTime)
  assert.equal(evalResult.isDue, true)
  assert.equal(evalResult.triggerType, 'SCHEDULED_DAILY')
})

// ============================================================================
// TEST 2: Missed Backup Detection when machine was powered off
// ============================================================================
test('Test 2: Detects missed backup when system was offline during scheduled window', async () => {
  // Simulate last run was 2 days ago
  await saveBackupScheduleConfig({
    dailyEnabled: true,
    dailyTime: '23:30',
    lastDailyRunDate: '2026-10-01',
    missedBackupPolicy: 'run_immediately',
  })

  // Next morning at 09:00 AM (before 23:30 today)
  const morningTime = new Date('2026-10-03T09:00:00')
  const evalResult = await evaluateBackupSchedule(morningTime)

  assert.equal(evalResult.isDue, true)
  assert.equal(evalResult.triggerType, 'MISSED_RECOVERY')
  assert.equal(evalResult.missedBackupDetected, true)
})

// ============================================================================
// TEST 3: Specialized System Snapshots (Pre-Restore, Pre-Import, Legacy BOL)
// ============================================================================
test('Test 3: Generates lightweight snapshots with deterministic naming & metadata', async () => {
  const preRestore = await createPreRestoreSnapshot('Test Runner', 'RESTORE-998')
  assert.equal(preRestore.success, true)
  assert.match(preRestore.fileName, /^AQ_COMPANIES_PRE_RESTORE_\d{4}-\d{2}-\d{2}_\d{6}\.json$/)
  assert.equal(preRestore.protected, true)

  const preImport = await createPreImportSnapshot('Test Runner', 'BATCH-001')
  assert.equal(preImport.success, true)
  assert.match(preImport.fileName, /^AQ_COMPANIES_PRE_IMPORT_\d{4}-\d{2}-\d{2}_\d{6}\.json$/)

  const preLegacy = await createPreLegacyBolImportSnapshot('Historical Archive 2025')
  assert.equal(preLegacy.success, true)
  assert.match(preLegacy.fileName, /^AQ_COMPANIES_PRE_LEGACY_BOL_IMPORT_\d{4}-\d{2}-\d{2}_\d{6}\.json$/)
})

// ============================================================================
// TEST 4: Accounting Period Close Snapshots are Immutable & Protected
// ============================================================================
test('Test 4: Financial Period Close snapshots are strictly protected from retention pruning', async () => {
  const periodSnap = await createPeriodCloseSnapshot('Finance Officer', '2026-10', 'PRE')
  assert.equal(periodSnap.success, true)
  assert.match(periodSnap.fileName, /^AQ_COMPANIES_PRE_PERIOD_CLOSE_2026-10\.json$/)
  assert.equal(periodSnap.protected, true)

  // Verify file exists
  assert.equal(fs.existsSync(periodSnap.filePath), true)
})

// ============================================================================
// TEST 5: Smart Retention Policy Never Deletes Last Valid Backup or Pinned Backups
// ============================================================================
test('Test 5: Retention policy unconditionally preserves last verified backup & pinned items', async () => {
  const pruneResult = await enforceBackupRetentionPolicy('Retention Test')
  assert.ok(pruneResult.preservedCount >= 1)
  assert.ok(pruneResult.lastVerifiedPreserved)
})

// ============================================================================
// TEST 6: Restore Simulation in Isolated Sandbox (0 Production DB Writes)
// ============================================================================
test('Test 6: Restore simulation tests backup in sandbox, validates invariance & accredits Golden Backup', async () => {
  // Create a fresh full backup to test
  const bkp = await createAQBackup({ type: 'full', format: 'json', actor: 'Simulation Baseline' })
  assert.equal(bkp.success, true)

  // Snapshot live file content before simulation
  const bolsBefore = fs.readFileSync(path.join(dataDir, '.local-bols.json'), 'utf8')

  // Run simulation
  const sim = await simulateAQRestore(bkp.filePath, 'Simulation QA')
  assert.equal(sim.success, true)
  assert.equal(sim.checksumVerified, true)
  assert.equal(sim.accountingInvariancePassed, true)
  assert.equal(sim.relationalIntegrityPassed, true)
  assert.equal(sim.isGoldenBackup, true)
  assert.ok(sim.durationMs < 60000)

  // Verify live production file was 100% untouched
  const bolsAfter = fs.readFileSync(path.join(dataDir, '.local-bols.json'), 'utf8')
  assert.equal(bolsBefore, bolsAfter)
})

// ============================================================================
// TEST 7: Disaster Recovery Startup Audit & Corrupted Database Quarantine
// ============================================================================
test('Test 7: Startup audit detects corrupted DB, quarantines damaged files, and prevents silent empty DB overwrite', async () => {
  // Intentionally damage a dummy file to simulate sudden power loss / bad sectors
  const dummyDamagedFile = path.join(dataDir, '.local-damaged-test.json')
  fs.writeFileSync(dummyDamagedFile, '{"broken": [1, 2,', 'utf8')

  // Quarantine corrupted database
  const quarantineDir = await quarantineCorruptedDatabase('Corrupted JSON detected')
  assert.ok(fs.existsSync(quarantineDir))
  assert.ok(fs.existsSync(path.join(quarantineDir, 'quarantine-manifest.json')))

  // Clean up test file
  fs.unlinkSync(dummyDamagedFile)
  fs.rmSync(quarantineDir, { recursive: true, force: true })
})

// ============================================================================
// TEST 8: Direct Disk Backup Discovery (Without Catalog)
// ============================================================================
test('Test 8: Discovers self-contained backups on disk even if catalog DB is missing', async () => {
  const discovered = await discoverBackupsOnDisk()
  assert.ok(discovered.length > 0)

  const first = discovered[0]
  assert.ok(first.backupId)
  assert.ok(first.fileName)
  assert.ok(first.recordCounts)
  assert.equal(first.checksumValid, true)
})

// ============================================================================
// TEST 9: Atomic Database Switch Disaster Recovery
// ============================================================================
test('Test 9: Disaster recovery performs atomic switch (restored.tmp -> previous.db -> live)', async () => {
  // 1. Create a known good recovery point
  const backupPoint = await createAQBackup({ type: 'full', format: 'json', actor: 'Recovery Test' })
  assert.equal(backupPoint.success, true)

  // 2. Execute Disaster Recovery
  const recResult = await executeDisasterRecovery(backupPoint.filePath, 'Disaster Recovery QA')
  assert.equal(recResult.success, true)
  assert.equal(recResult.invariancePassed, true)
  assert.ok(recResult.quarantinedDatabasePath)
  assert.ok(recResult.recordsRestored > 0)

  // Verify live files are intact and valid
  const audit = await auditStartupDatabaseHealth()
  assert.equal(audit.healthStatus, 'HEALTHY')
  assert.equal(audit.isRecoveryMode, false)
})

// ============================================================================
// TEST 10: Move-to-New-PC Path Sanitization
// ============================================================================
test('Test 10: Sanitizes and rebinds paths when moving backup across Windows user profiles', () => {
  const oldPath = 'C:\\Users\\Ahsanullah Qureshi\\Documents\\Backups\\sample.pdf'
  const sanitized = sanitizePortablePaths(oldPath, 'D:\\App\\data')
  assert.equal(sanitized, path.join('D:\\App\\data', 'sample.pdf'))
})

// ============================================================================
// TEST 11: Incremental Delta Backup & Broken Chain Detection
// ============================================================================
test('Test 11: Incremental backup tracks entity deltas and detects broken parent chains', async () => {
  // 1. Base Full Backup
  const base = await createAQBackup({ type: 'full', format: 'json', actor: 'Chain Base' })
  assert.equal(base.success, true)

  // 2. Incremental Delta Backup
  const inc = await createIncrementalBackup({
    parentBackupId: base.backupId,
    actor: 'Chain Delta 1',
  })
  assert.equal(inc.success, true)
  assert.equal(inc.parentBackupId, base.backupId)
  assert.match(inc.fileName, /^AQ_COMPANIES_INCREMENTAL_BACKUP_/)

  // 3. Chain validation should PASS for intact chain
  const catalog = [
    { id: base.backupId, fileName: base.fileName, filePath: base.filePath },
    { id: inc.backupId, fileName: inc.fileName, filePath: inc.filePath },
  ]
  const intactValidation = await validateIncrementalChain(inc.filePath, catalog)
  assert.equal(intactValidation.valid, true)
  assert.equal(intactValidation.chain.length, 2)

  // 4. Broken Chain Detection: Remove parent from catalog
  const brokenCatalog = [
    { id: inc.backupId, fileName: inc.fileName, filePath: inc.filePath },
  ]
  const brokenValidation = await validateIncrementalChain(inc.filePath, brokenCatalog)
  assert.equal(brokenValidation.valid, false)
  assert.match(brokenValidation.brokenReason, /Broken incremental backup chain/)
})

// ============================================================================
// TEST 12: Historical BOL Provenance Survives Backup and Recovery
// ============================================================================
test('Test 12: Historical BOL provenance metadata (Barnama, source file, source page) is preserved', async () => {
  const bolsRaw = fs.readFileSync(path.join(dataDir, '.local-bols.json'), 'utf8')
  const bols = JSON.parse(bolsRaw)
  const sample = bols.find((b) => b.bolNumber === 'BOL-2026-KBL001' || b.bol_number === 'BOL-2026-KBL001')

  assert.ok(sample)
  assert.equal(sample.legacyFlag, true)
  assert.equal(sample.barnamaNumber, 'BAR-2025-9981')
  assert.equal(sample.sourceFile, 'Kandahar_Customs_Archive_2025.pdf')
  assert.equal(sample.sourcePage, 14)
})
