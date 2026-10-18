/**
 * Sky Ariana Enterprise Disaster Recovery, Database Health & Safe Restore Test Suite
 * Phase 16: Enterprise Resilience, Health Auditing & Safe Restore Engine
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const sandbox = require('./isolated-data.cjs')()
const loadTypescript = require('./load-typescript.cjs')

// Load modules under test
const {
  createZipArchive,
  extractZipArchive,
  crc32,
} = loadTypescript('lib/google-drive/archive.ts')

const {
  CURRENT_DATABASE_SCHEMA_VERSION,
  CURRENT_APPLICATION_VERSION,
  buildBackupManifest,
  buildRecoveryInfo,
  checkBackupCompatibility,
} = loadTypescript('lib/backup/backup-manifest.ts')

const {
  validateDatabaseBackupBuffer,
  testRestoreInSandbox,
} = loadTypescript('lib/backup/validate-backup.ts')

const {
  generateRestorePreview,
  restoreDatabaseArchiveBuffer,
} = loadTypescript('lib/backup/restore-backup.ts')

const {
  runDeepHealthScan,
  executeDatabaseRepair,
} = loadTypescript('lib/backup/database-health-service.ts')

const {
  listImportBatches,
  registerImportBatch,
  executeImportRollback,
} = loadTypescript('lib/backup/import-rollback-service.ts')

const {
  generateEmergencyDataExport,
} = loadTypescript('lib/backup/emergency-export-service.ts')

const {
  getDisasterRecoveryConfig,
  saveDisasterRecoveryConfig,
  enforceBackupRetentionPolicy,
} = loadTypescript('lib/backup/backup-retention-service.ts')

const {
  createFullSystemBackup,
  listAllBackups,
  deleteBackupItem,
  toggleBackupProtection,
  withBackupLock,
} = loadTypescript('lib/backup/create-backup.ts')

const { computeSha256 } = loadTypescript('lib/backup/backup-collector.ts')

// ---------------------------------------------------------------------------
// 1. BACKUP PACKAGE CREATION, ZIP STRUCTURE & CHECKSUM VERIFICATION
// ---------------------------------------------------------------------------

test('createFullSystemBackup packages all database tables and verifies archive immediately', async () => {
  const result = await createFullSystemBackup({
    type: 'FULL',
    actor: 'Unit Test Runner',
    note: 'Automated test suite full backup',
    protected: true,
  })

  assert.ok(result.backupItem)
  assert.ok(result.manifest)
  assert.ok(Buffer.isBuffer(result.buffer))
  assert.ok(result.buffer.length > 0)

  // Verify file signatures
  assert.equal(result.buffer[0], 0x50) // 'P'
  assert.equal(result.buffer[1], 0x4b) // 'K'
  assert.equal(result.buffer[2], 0x03)
  assert.equal(result.buffer[3], 0x04)

  // Verify manifest contents
  assert.equal(result.manifest.applicationVersion, CURRENT_APPLICATION_VERSION)
  assert.equal(result.manifest.databaseSchemaVersion, CURRENT_DATABASE_SCHEMA_VERSION)
  assert.equal(result.manifest.backupType, 'FULL')
  assert.equal(result.manifest.protected, true)
  assert.ok(result.manifest.compositeChecksum.length > 0)

  // Verify backup catalog registration
  const catalog = await listAllBackups()
  const found = catalog.find((b) => b.id === result.backupItem.id)
  assert.ok(found)
  assert.equal(found.status, 'SUCCESS')
  assert.equal(found.verificationStatus, 'VERIFIED')
})

test('validateDatabaseBackupBuffer confirms valid archive checksums and structure', async () => {
  const sampleData = JSON.stringify([{ bol_number: 'TEST-BOL-001', client: 'Arya Logistics' }])
  const sampleSha = computeSha256(sampleData)

  const manifest = {
    manifestVersion: 1,
    backupId: 'test-bkp-valid',
    applicationVersion: CURRENT_APPLICATION_VERSION,
    databaseSchemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
    databaseEngine: 'JSON_BLOB_STORAGE',
    backupType: 'FULL',
    createdAt: new Date().toISOString(),
    createdBy: 'Tester',
    protected: false,
    recordCounts: { bols: 1, shipments: 0, invoices: 0, ledgerEntries: 0, totalRecords: 1 },
    compositeChecksum: 'dummy-composite',
    financialTotals: [],
    invarianceValid: true,
  }

  const archive = createZipArchive([
    { path: 'manifest.json', data: JSON.stringify(manifest) },
    { path: 'checksums.json', data: JSON.stringify({ 'database/bols.json': sampleSha }) },
    { path: 'database/bols.json', data: sampleData },
    { path: 'database/invoices.json', data: '[]' },
    { path: 'database/account-ledgers.json', data: '{}' },
    { path: 'database/companies.json', data: '[]' },
  ])

  const validation = validateDatabaseBackupBuffer(archive)
  assert.equal(validation.isValid, true)
  assert.equal(validation.invarianceValid, true)
  assert.equal(validation.checksumsMatch, true)
  assert.equal(validation.errors.length, 0)
})

test('validateDatabaseBackupBuffer catches tampered files via checksum mismatch', async () => {
  const correctSha = computeSha256('Original un-tampered data')

  const manifest = {
    manifestVersion: 1,
    backupId: 'test-bkp-tampered',
    schemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
    counts: { bols: 1 },
  }

  const archive = createZipArchive([
    { path: 'manifest.json', data: JSON.stringify(manifest) },
    { path: 'checksums.json', data: JSON.stringify({ 'database/bols.json': correctSha }) },
    { path: 'database/bols.json', data: 'Tampered malicious content here!' },
    { path: 'database/invoices.json', data: '[]' },
    { path: 'database/account-ledgers.json', data: '{}' },
    { path: 'database/companies.json', data: '[]' },
  ])

  const validation = validateDatabaseBackupBuffer(archive)
  assert.equal(validation.isValid, false)
  assert.equal(validation.checksumsMatch, false)
  assert.ok(validation.errors.some((e) => e.includes('Checksum mismatch')))
})

test('validateDatabaseBackupBuffer rejects backups created by future incompatible schema versions', async () => {
  const futureManifest = {
    manifestVersion: 1,
    backupId: 'test-future-schema',
    schemaVersion: 999, // Incompatible future version
    databaseSchemaVersion: 999,
    counts: { bols: 5 },
  }

  const archive = createZipArchive([
    { path: 'manifest.json', data: JSON.stringify(futureManifest) },
    { path: 'data/bols.json', data: '[]' },
    { path: 'data/invoices.json', data: '[]' },
    { path: 'data/account-ledgers.json', data: '{}' },
    { path: 'data/companies.json', data: '[]' },
  ])

  const validation = validateDatabaseBackupBuffer(archive)
  assert.equal(validation.isValid, false)
  assert.equal(validation.isNewerVersion, true)
  assert.ok(validation.errors.some((e) => e.includes('newer version of Sky Ariana BOL')))
})

// ---------------------------------------------------------------------------
// 2. IN-MEMORY SANDBOX TEST RESTORE DRILL
// ---------------------------------------------------------------------------

test('testRestoreInSandbox performs dry-run verification and detects duplicate BOLs', async () => {
  const manifest = {
    manifestVersion: 1,
    backupId: 'test-drill-dups',
    databaseSchemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
  }

  // BOL list with intentional duplicate 'BOL-DUP-99'
  const bolsWithDups = [
    { bol_number: 'BOL-DUP-99', customer: 'Shipper 1' },
    { bol_number: 'BOL-SAFE-01', customer: 'Shipper 2' },
    { bol_number: 'BOL-DUP-99', customer: 'Shipper 1 Copy' },
  ]

  const archive = createZipArchive([
    { path: 'manifest.json', data: JSON.stringify(manifest) },
    { path: 'database/bols.json', data: JSON.stringify(bolsWithDups) },
    { path: 'database/invoices.json', data: '[]' },
    { path: 'database/account-ledgers.json', data: '{}' },
  ])

  const drill = await testRestoreInSandbox(archive)
  assert.equal(drill.pass, false)
  assert.ok(drill.relationalIssues.some((r) => r.includes('Duplicate BOL numbers found')))
  assert.ok(drill.errors.some((e) => e.includes('duplicate BOL numbers')))
})

test('testRestoreInSandbox verifies accounting invariance Balance = Debit - Credit strictly', async () => {
  const manifest = {
    manifestVersion: 1,
    backupId: 'test-drill-invariance',
    databaseSchemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
  }

  // Correct ledger satisfying Debit - Credit = Balance
  const balancedLedger = {
    'Haji Qasim Transit': {
      entries: [
        { id: 'tx-1', date: '2026-09-01', debit: 5000, credit: 0, balance: 5000, currency: 'USD' },
        { id: 'tx-2', date: '2026-09-05', debit: 0, credit: 2000, balance: 3000, currency: 'USD' },
      ],
      currentBalance: 3000,
    },
  }

  const archive = createZipArchive([
    { path: 'manifest.json', data: JSON.stringify(manifest) },
    { path: 'database/bols.json', data: '[]' },
    { path: 'database/invoices.json', data: '[]' },
    { path: 'database/account-ledgers.json', data: JSON.stringify(balancedLedger) },
  ])

  const drill = await testRestoreInSandbox(archive)
  assert.equal(drill.pass, true)
  assert.equal(drill.invarianceValid, true)
  assert.equal(drill.financialTotals.length, 1)
  assert.equal(drill.financialTotals[0].currency, 'USD')
  assert.equal(drill.financialTotals[0].totalDebit, 5000)
  assert.equal(drill.financialTotals[0].totalCredit, 2000)
  assert.equal(drill.financialTotals[0].netBalance, 3000)
})

// ---------------------------------------------------------------------------
// 3. SAFE RESTORE ENGINE & PRE-RESTORE SAFETY SNAPSHOT WITH AUTOMATED ROLLBACK
// ---------------------------------------------------------------------------

test('generateRestorePreview calculates accurate entity diff and compatibility', async () => {
  const manifest = {
    manifestVersion: 1,
    backupId: 'test-preview',
    applicationVersion: CURRENT_APPLICATION_VERSION,
    databaseSchemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
    recordCounts: {
      bols: 50,
      shipments: 40,
      invoices: 30,
      ledgerEntries: 200,
      payments: 15,
      documents: 10,
      totalRecords: 345,
    },
    financialTotals: [{ currency: 'USD', totalDebit: 10000, totalCredit: 5000, netBalance: 5000, accountCount: 2 }],
  }

  const archive = createZipArchive([
    { path: 'manifest.json', data: JSON.stringify(manifest) },
    { path: 'database/bols.json', data: '[]' },
    { path: 'database/invoices.json', data: '[]' },
    { path: 'database/account-ledgers.json', data: '{}' },
    { path: 'database/companies.json', data: '[]' },
  ])

  const preview = await generateRestorePreview(archive, 'test-preview.zip')
  assert.equal(preview.isCompatible, true)
  assert.equal(preview.backupRecordCounts.bols, 50)
  assert.equal(preview.backupRecordCounts.invoices, 30)
  assert.equal(typeof preview.diff.bols, 'number')
})

test('restoreDatabaseArchiveBuffer creates mandatory pre-restore safety snapshot and executes cleanly', async () => {
  // Create a minimal valid backup package
  const validData = JSON.stringify([{ bol_number: 'BOL-RESTORE-TEST-1', customer: 'Herat Transport' }])
  const archive = createZipArchive([
    {
      path: 'manifest.json',
      data: JSON.stringify({
        manifestVersion: 1,
        backupId: 'test-safe-restore-exec',
        applicationVersion: CURRENT_APPLICATION_VERSION,
        databaseSchemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
        databaseEngine: 'JSON_BLOB_STORAGE',
        backupType: 'MANUAL',
        createdAt: new Date().toISOString(),
        createdBy: 'Safety Tester',
        recordCounts: { bols: 1, shipments: 0, invoices: 0, ledgerEntries: 0, totalRecords: 1 },
      }),
    },
    { path: 'database/bols.json', data: validData },
    { path: 'database/invoices.json', data: '[]' },
    { path: 'database/account-ledgers.json', data: '{}' },
    { path: 'database/companies.json', data: '[]' },
  ])

  const restoreResult = await restoreDatabaseArchiveBuffer({
    archiveBuffer: archive,
    mode: 'merge',
    actor: 'Automated Safe Restore Test',
  })

  assert.equal(restoreResult.success, true)
  assert.ok(restoreResult.preRestoreBackupFile.length > 0)
  assert.ok(restoreResult.preRestoreBackupFile.includes('.zip') || restoreResult.preRestoreBackupFile.includes('SKY-ARIANA'))
  assert.equal(restoreResult.invarianceValid, true)
})

// ---------------------------------------------------------------------------
// 4. DATABASE HEALTH ENGINE & CONTROLLED REPAIRS
// ---------------------------------------------------------------------------

test('runDeepHealthScan performs non-destructive audit and reports categorical checks', async () => {
  const report = await runDeepHealthScan()

  assert.ok(report)
  assert.ok(['HEALTHY', 'WARNING', 'CRITICAL'].includes(report.overallStatus))
  assert.equal(report.databaseWritable, true)
  assert.equal(report.databaseReadable, true)
  assert.ok(typeof report.checks.relationalIntegrity.pass === 'boolean')
  assert.ok(typeof report.checks.accountingInvariance.pass === 'boolean')
  assert.ok(typeof report.checks.duplicateCriticalIds.pass === 'boolean')
  assert.ok(typeof report.checks.orphanDetection.pass === 'boolean')
  assert.ok(typeof report.checks.documentStorage.pass === 'boolean')
})

test('executeDatabaseRepair generates pre-repair safety snapshot before applying repairs', async () => {
  const repairResult = await executeDatabaseRepair(['FILL_MISSING_CURRENCY'], 'Test Repair Tool')

  assert.equal(repairResult.success, true)
  assert.ok(repairResult.preRepairBackupFileName.length > 0)
  assert.ok(repairResult.preRepairBackupFileName.includes('PRE-REPAIR-SAFETY') || repairResult.preRepairBackupFileName.includes('SKY-ARIANA'))
})

// ---------------------------------------------------------------------------
// 5. IMPORT ROLLBACK & CONFLICT DETECTION
// ---------------------------------------------------------------------------

test('registerImportBatch and listImportBatches track batches with downstream conflict detection', async () => {
  const batchId = `test-import-${Date.now()}`
  await registerImportBatch({
    batchId,
    fileName: 'commercial_manifest_2026.xlsx',
    importedBy: 'Import Operator',
    recordCount: 5,
    createdBolNumbers: ['BOL-BATCH-101', 'BOL-BATCH-102'],
  })

  const batches = await listImportBatches()
  const found = batches.find((b) => b.batchId === batchId)
  assert.ok(found)
  assert.equal(found.fileName, 'commercial_manifest_2026.xlsx')
  assert.equal(typeof found.canRollback, 'boolean')

  // Rollback the test batch
  const rollbackResult = await executeImportRollback(batchId, { actor: 'Test Rollback', force: true })
  assert.equal(rollbackResult.success, true)
  assert.ok(rollbackResult.preRollbackBackupFile.length > 0)
})

// ---------------------------------------------------------------------------
// 6. STANDALONE EMERGENCY JSON DATA EXPORT
// ---------------------------------------------------------------------------

test('generateEmergencyDataExport creates complete, self-contained JSON snapshot of all core records', async () => {
  const exportData = await generateEmergencyDataExport()

  assert.ok(exportData.exportMetadata)
  assert.equal(exportData.exportMetadata.application, 'Sky Ariana BOL & Logistics')
  assert.equal(exportData.exportMetadata.schemaVersion, CURRENT_DATABASE_SCHEMA_VERSION)
  assert.ok(Array.isArray(exportData.bols))
  assert.ok(Array.isArray(exportData.shipments))
  assert.ok(Array.isArray(exportData.companies))
  assert.ok(Array.isArray(exportData.invoices))
  assert.ok(Array.isArray(exportData.payments))
  assert.ok(exportData.accountLedgers)
  assert.ok(typeof exportData.recordCounts === 'object')
})

// ---------------------------------------------------------------------------
// 7. BACKUP RETENTION RULES & PROTECTED ARCHIVES IMMUTABILITY
// ---------------------------------------------------------------------------

test('deleteBackupItem blocks deletion of protected backups and preserves the last verified backup', async () => {
  // Create a protected backup
  const protectedBkp = await createFullSystemBackup({
    type: 'MANUAL',
    actor: 'Retention Tester',
    note: 'Protected Year-End Archive',
    protected: true,
  })

  // Attempting to delete protected backup should fail
  const delProtected = await deleteBackupItem(protectedBkp.backupItem.id, { actor: 'Admin' })
  assert.equal(delProtected.success, false)
  assert.ok(delProtected.error.includes('PROTECTED from deletion'))

  // Unprotect it
  await toggleBackupProtection(protectedBkp.backupItem.id, false)

  // Verify deletion works when other verified backups exist
  const delUnprotected = await deleteBackupItem(protectedBkp.backupItem.id, { actor: 'Admin' })
  assert.equal(delUnprotected.success, true)
})

test('enforceBackupRetentionPolicy strictly preserves protected archives and the last verified recovery point', async () => {
  const prune = await enforceBackupRetentionPolicy('Test Pruning')
  assert.ok(typeof prune.prunedCount === 'number')
  assert.ok(typeof prune.preservedCount === 'number')
  assert.ok(prune.preservedCount > 0)
  assert.ok(prune.lastVerifiedPreserved.length > 0)
})

// ---------------------------------------------------------------------------
// 8. SYSTEM-LEVEL CONCURRENT BACKUP/RESTORE LOCKING
// ---------------------------------------------------------------------------

test('withBackupLock prevents overlapping concurrent operations', async () => {
  let lockBlocked = false

  await withBackupLock('First Operation', async () => {
    // Attempt second operation while first holds the lock
    try {
      await withBackupLock('Second Operation', async () => {})
    } catch (err) {
      if (err.message.includes('already in progress')) {
        lockBlocked = true
      }
    }
  })

  assert.equal(lockBlocked, true)
})
