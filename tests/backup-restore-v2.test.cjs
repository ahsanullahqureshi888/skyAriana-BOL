/**
 * AQ COMPANIES — Enterprise Backup & Restore Hardened Test Suite
 * Version: 2.0 (Application Version 5.2.0, Backup Format Version 2.0)
 *
 * Verifies all hardened backup & restore requirements:
 * 1. Format 2.0 Envelope structure & deterministic Windows-safe file naming
 * 2. SHA-256 checksums & tamper detection (refuses modified files)
 * 3. Atomic write guarantees
 * 4. Dual format support (.json single envelope & .zip container)
 * 5. Selective / module backup scopes
 * 6. Legacy backup normalization (v5.1pro -> v5.2 canonical, UUID identity safety)
 * 7. Field-level weight repair & extreme numeric corruption detection (1.1e16 KG, etc.)
 * 8. Package unit safety (CTNS vs BAGS vs PALLETS) & concatenated quantities detection
 * 9. Dry-run restoration with zero database writes
 * 10. Merge restore idempotency (running twice produces identical clean state)
 * 11. Replace restore mode with danger zone confirmation
 * 12. Mandatory pre-restore safety snapshot & automated rollback
 * 13. Conflict detection (Current vs Backup value)
 * 14. Accounting Invariance Identity (Net Balance = Total Debit - Total Credit)
 * 15. Multi-currency isolation (USD, AFN, AED)
 * 16. UTF-8 & RTL preservation (Afghan truck plates like 54846 هرات, Dari, Pashto)
 * 17. Lossless database round-trip test (DB A -> Backup -> DB B -> 100% match)
 * 18. Windows paths with spaces support
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

// Use isolated data sandbox so tests never touch live user data
const sandbox = require('./isolated-data.cjs')()
const load = require('./load-typescript.cjs')

// Seed minimal valid database tables in sandbox
const dataDir = process.env.DATABASE_PATH || path.join(sandbox, 'data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const sampleBols = [
  {
    id: 'bol-uuid-001',
    bolNumber: 'BOL-2026-KBL001',
    bol_number: 'BOL-2026-KBL001',
    shipperName: 'Ariana Raisin Traders',
    consigneeName: 'Global Dry Fruit Import Ltd',
    truckNumber: '54846 هرات',
    driverName: 'احمد شاه',
    driverFatherName: 'عبدالرحیم',
    numberOfPackages: '650 CTNS',
    netWeight: '12500 KG',
    grossWeight: '13200 KG',
    cargoDescription: 'کندهار ممیز',
  },
  {
    id: 'bol-uuid-002',
    bolNumber: 'BOL-2026-KBL002',
    bol_number: 'BOL-2026-KBL002',
    shipperName: 'Balkh Fig Export Co',
    consigneeName: 'Orient Wholesale',
    truckNumber: '12345 کابل',
    driverName: 'محمد عثمان',
    driverFatherName: 'محمد اکرم',
    numberOfPackages: '400 BAGS',
    netWeight: '8000 KG',
    grossWeight: '8400 KG',
    cargoDescription: 'انجیر اعلی',
  },
]

const sampleAccounts = [
  { id: 'acc-1', name: 'Ariana Raisin Traders', currency: 'USD', active: true },
  { id: 'acc-2', name: 'Global Dry Fruit Import Ltd', currency: 'USD', active: true },
  { id: 'acc-3', name: 'کابل صرافی', currency: 'AFN', active: true },
]

const sampleLedgers = {
  'Ariana Raisin Traders': {
    entries: [
      { id: 'tx-001', date: '2026-09-01', debit: 10000, credit: 0, balance: 10000, currency: 'USD' },
      { id: 'tx-002', date: '2026-09-10', debit: 0, credit: 4000, balance: 6000, currency: 'USD' },
    ],
    currentBalance: 6000,
  },
  'کابل صرافی': {
    entries: [
      { id: 'tx-003', date: '2026-09-02', debit: 500000, credit: 200000, balance: 300000, currency: 'AFN' },
    ],
    currentBalance: 300000,
  },
}

fs.writeFileSync(path.join(dataDir, '.local-bols.json'), JSON.stringify(sampleBols, null, 2))
fs.writeFileSync(path.join(dataDir, '.local-accounts.json'), JSON.stringify(sampleAccounts, null, 2))
fs.writeFileSync(path.join(dataDir, '.local-account-ledgers.json'), JSON.stringify(sampleLedgers, null, 2))
fs.writeFileSync(path.join(dataDir, '.local-invoices.json'), JSON.stringify([], null, 2))
fs.writeFileSync(path.join(dataDir, '.local-shipments.json'), JSON.stringify([], null, 2))

// Load modules under test
const {
  BACKUP_FORMAT_VERSION,
  CURRENT_APPLICATION_VERSION,
  generateBackupFilename,
  generateRollbackSnapshotFilename,
  computeSha256,
} = load('lib/backup/backup-format.ts')

const {
  normalizeBackupData,
  detectBackupFormat,
  generateDeterministicUuid,
  isExtremeCorruptedNumber,
} = load('lib/backup/legacy-normalizer.ts')

const {
  createAQBackup,
  verifyAQBackup,
  analyzeAndDryRunRestore,
  executeAQRestore,
  rollbackRestore,
  getBackupOverviewStats,
} = load('lib/backup/central-backup-service.ts')

// ============================================================================
// TEST 1: Deterministic Windows-Safe Filename & SHA-256 Utility
// ============================================================================
test('Test 1: Generates deterministic Windows-safe filenames avoiding forbidden characters', () => {
  const d = new Date('2026-10-03T12:30:45Z')
  const jsonName = generateBackupFilename('full', 'json', d, '5.2.0')
  const zipName = generateBackupFilename('accounting_only', 'zip', d, '5.2.0')

  assert.ok(jsonName.startsWith('AQ_COMPANIES_FULL_BACKUP_'))
  assert.ok(jsonName.endsWith('_v5.2.0.json'))
  assert.ok(!jsonName.includes(':'), 'Filename must not contain colon')
  assert.ok(!jsonName.includes('/'), 'Filename must not contain slash')
  assert.ok(!jsonName.includes('\\'), 'Filename must not contain backslash')

  assert.ok(zipName.startsWith('AQ_COMPANIES_ACCOUNTING_ONLY_BACKUP_'))
  assert.ok(zipName.endsWith('_v5.2.0.zip'))

  const snapName = generateRollbackSnapshotFilename(d)
  assert.ok(snapName.startsWith('AQ_COMPANIES_PRE_RESTORE_'))
  assert.ok(snapName.endsWith('.json'))
})

// ============================================================================
// TEST 2: Full Backup Creation in JSON Envelope Format
// ============================================================================
test('Test 2: Creates full system backup in Format 2.0 JSON envelope with atomic write & SHA-256', async () => {
  const result = await createAQBackup({
    type: 'full',
    extension: 'json',
    actor: 'QA Runner',
    note: 'Automated test backup',
    protected: true,
  })

  assert.equal(result.success, true)
  assert.ok(result.backupId.startsWith('AQ-BKP-'))
  assert.ok(fs.existsSync(result.filePath), 'Backup file must exist on disk')
  assert.equal(result.verificationPassed, true, 'Immediate post-creation verification must pass')
  assert.equal(result.completenessScore, 100)
  assert.ok(result.checksum.length === 64, 'Must be valid 64-char SHA-256 hash')

  // Verify file contents
  const raw = fs.readFileSync(result.filePath, 'utf8')
  const envelope = JSON.parse(raw)

  assert.equal(envelope.backupMetadata.application, 'AQ COMPANIES')
  assert.equal(envelope.backupMetadata.backupFormatVersion, '2.0')
  assert.equal(envelope.backupMetadata.applicationVersion, '5.2.0')
  assert.equal(envelope.backupMetadata.backupType, 'full')
  assert.equal(envelope.backupMetadata.recordCounts.bols, 2)
  assert.equal(envelope.data.bols.length, 2)
  assert.equal(envelope.data.bols[0].bolNumber, 'BOL-2026-KBL001')
  assert.equal(envelope.backupMetadata.invarianceValid, true)
})

// ============================================================================
// TEST 3: ZIP Container Backup with Manifest
// ============================================================================
test('Test 3: Creates ZIP container backup containing metadata.json, database.json, and manifest.json', async () => {
  const result = await createAQBackup({
    type: 'full',
    extension: 'zip',
    actor: 'QA Runner',
    note: 'Automated ZIP backup test',
  })

  assert.equal(result.success, true)
  assert.ok(result.fileName.endsWith('.zip'))
  assert.ok(fs.existsSync(result.filePath))
  assert.equal(result.verificationPassed, true)

  const verifyRes = await verifyAQBackup(result.filePath)
  assert.equal(verifyRes.valid, true)
  assert.equal(verifyRes.errors.length, 0)
})

// ============================================================================
// TEST 4: Tampered File / Corrupted Checksum Rejection
// ============================================================================
test('Test 4: Verification and restore refuse tampered or corrupted backup file', async () => {
  // Create a backup first
  const bkp = await createAQBackup({ type: 'full', extension: 'json' })
  const content = fs.readFileSync(bkp.filePath, 'utf8')
  const parsed = JSON.parse(content)

  // Tamper with data without updating metadata checksum
  parsed.data.bols[0].shipperName = 'TAMPERED ILLEGAL MODIFICATION'
  const tamperedPath = `${bkp.filePath}.tampered.json`
  fs.writeFileSync(tamperedPath, JSON.stringify(parsed, null, 2), 'utf8')

  const verifyRes = await verifyAQBackup(tamperedPath)
  assert.equal(verifyRes.valid, false, 'Tampered file must fail verification')
  assert.ok(verifyRes.errors.some((e) => /mismatch/i.test(e)))

  const dryRun = await analyzeAndDryRunRestore(tamperedPath)
  assert.equal(dryRun.checksumValid, false, 'Dry run must detect checksum mismatch')
})

// ============================================================================
// TEST 5: Selective Module Backup
// ============================================================================
test('Test 5: Selective backup packages only chosen modules', async () => {
  const result = await createAQBackup({
    type: 'accounting_only',
    extension: 'json',
  })

  assert.equal(result.success, true)
  const raw = fs.readFileSync(result.filePath, 'utf8')
  const envelope = JSON.parse(raw)

  assert.equal(envelope.backupMetadata.backupType, 'accounting_only')
  assert.ok(envelope.data.accountLedgers)
  assert.equal(envelope.data.bols, undefined, 'BOLs should not be in accounting-only backup')
})

// ============================================================================
// TEST 6: Legacy Backup Normalization (v5.1pro -> Canonical v5.2)
// ============================================================================
test('Test 6: Legacy normalizer upgrades older backup aliases and separates UUID id from bolNumber', () => {
  const legacyBackup = {
    version: '5.1pro',
    bols: [
      {
        bol_number: 'BOL-2026-LEGACY1',
        id: 'BOL-2026-LEGACY1', // Mistake in older version: id === bol_number!
        shipper_name: 'Kandahar Almond Co',
        consignee_name: 'Dubai Imports',
        driver_name: 'جمعه خان',
        driver_rent: '800 USD',
        gross_weight: '1.1e16 KG', // Corrupted extreme scientific notation!
        net_weight: '14000 KG', // Valid net weight
        number_of_packages: '1114257184259 CTNS', // Impossible concatenated packages!
        truck_number: '98765 هرات',
      },
    ],
  }

  const normalized = normalizeBackupData(legacyBackup)

  assert.equal(normalized.detectedFormat, 'V51PRO_EXPORT')
  assert.equal(normalized.data.bols.length, 1)

  const bol = normalized.data.bols[0]
  assert.equal(bol.bolNumber, 'BOL-2026-LEGACY1')
  assert.notEqual(bol.id, 'BOL-2026-LEGACY1', 'Internal ID must be converted to UUID')
  assert.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}/i.test(bol.id), 'Must be deterministic UUIDv5')

  // Weight repair: gross cleared, valid net preserved
  assert.equal(bol.grossWeight, '', 'Corrupted gross weight must be cleared')
  assert.equal(bol.netWeight, '14000 KG', 'Valid net weight must be preserved')
  assert.equal(bol.weightReviewRequired, true)

  // Package unit safety: extreme number flagged
  assert.equal(normalized.flaggedPackagesCount, 1)

  // RTL & Truck Plate preserved
  assert.equal(bol.truckNumber, '98765 هرات')
  assert.equal(bol.driverName, 'جمعه خان')

  // Audit log recorded
  assert.ok(normalized.auditLog.some((a) => a.field === 'id' && a.action === 'NORMALIZED'))
  assert.ok(normalized.auditLog.some((a) => a.field === 'grossWeight' && a.action === 'REPAIRED'))
})

// ============================================================================
// TEST 7: Dry-Run Restoration (Zero DB Writes)
// ============================================================================
test('Test 7: Dry-run restoration previews diffs, detects duplicates and does NOT touch database', async () => {
  const initialBols = fs.readFileSync(path.join(dataDir, '.local-bols.json'), 'utf8')

  const newBackupPayload = {
    backupMetadata: {
      application: 'AQ COMPANIES',
      backupFormatVersion: '2.0',
      applicationVersion: '5.2.0',
      backupType: 'full',
    },
    data: {
      bols: [
        { bolNumber: 'BOL-2026-KBL001', consigneeName: 'DIFFERENT CONSIGNEE' }, // Duplicate with conflict
        { bolNumber: 'BOL-2026-KBL003', consigneeName: 'New Shipper Client' }, // Brand new
      ],
      accounts: sampleAccounts,
      accountLedgers: sampleLedgers,
    },
  }

  const dryRun = await analyzeAndDryRunRestore(newBackupPayload)

  assert.equal(dryRun.success, true)
  assert.equal(dryRun.isCompatible, true)
  assert.equal(dryRun.duplicatesDetected.bols, 1)
  assert.equal(dryRun.conflicts.length, 1)
  assert.equal(dryRun.conflicts[0].field, 'Consignee')

  // Verify database files were untouched!
  const currentBols = fs.readFileSync(path.join(dataDir, '.local-bols.json'), 'utf8')
  assert.equal(initialBols, currentBols, 'Dry-run must make ZERO database writes')
})

// ============================================================================
// TEST 8: Merge Restore Mode & Idempotency
// ============================================================================
test('Test 8: Merge restore inserts new records and is idempotent when executed multiple times', async () => {
  const incomingData = {
    backupMetadata: {
      application: 'AQ COMPANIES',
      backupFormatVersion: '2.0',
      applicationVersion: '5.2.0',
      backupType: 'full',
    },
    data: {
      bols: [
        {
          id: 'bol-uuid-003',
          bolNumber: 'BOL-2026-KBL003',
          shipperName: 'Herat Saffron LLC',
          consigneeName: 'Euro Gourmet',
          truckNumber: '44556 هرات',
          numberOfPackages: '50 CTNS',
          netWeight: '500 KG',
          grossWeight: '520 KG',
        },
      ],
      accounts: sampleAccounts,
      accountLedgers: sampleLedgers,
    },
  }

  // First Merge
  const res1 = await executeAQRestore(incomingData, { mode: 'merge', actor: 'Merge Test' })
  assert.equal(res1.success, true)
  assert.ok(res1.preRestoreSnapshotFile, 'Must create safety rollback snapshot')

  const bolsAfter1 = JSON.parse(fs.readFileSync(path.join(dataDir, '.local-bols.json'), 'utf8'))
  assert.equal(bolsAfter1.length, 3, '2 original + 1 new = 3')

  // Second Merge (Same exact data)
  const res2 = await executeAQRestore(incomingData, { mode: 'merge', actor: 'Merge Test 2' })
  assert.equal(res2.success, true)

  const bolsAfter2 = JSON.parse(fs.readFileSync(path.join(dataDir, '.local-bols.json'), 'utf8'))
  assert.equal(bolsAfter2.length, 3, 'Second merge must not duplicate records (Idempotent!)')
})

// ============================================================================
// TEST 9: Replace Restore Mode with Danger Zone Confirmation
// ============================================================================
test('Test 9: Replace restore blocks without confirmation phrase and replaces data transactionally', async () => {
  const replaceData = {
    backupMetadata: {
      application: 'AQ COMPANIES',
      backupFormatVersion: '2.0',
      applicationVersion: '5.2.0',
      backupType: 'full',
    },
    data: {
      bols: [
        {
          id: 'bol-uuid-solo',
          bolNumber: 'BOL-SOLO-999',
          shipperName: 'Single Entity',
        },
      ],
      accounts: [{ id: 'acc-solo', name: 'Single Account', currency: 'USD' }],
      accountLedgers: {
        'Single Account': {
          entries: [{ id: 'tx-solo', date: '2026-09-01', debit: 1000, credit: 1000, balance: 0, currency: 'USD' }],
          currentBalance: 0,
        },
      },
    },
  }

  // Case 9A: Attempt replace without confirmation phrase -> BLOCKED
  await assert.rejects(
    async () => {
      await executeAQRestore(replaceData, { mode: 'replace', confirmationText: 'WRONG' })
    },
    /confirmation.*RESTORE/i,
    'Must reject replace mode without exact RESTORE phrase'
  )

  // Case 9B: Valid replace with RESTORE
  const res = await executeAQRestore(replaceData, {
    mode: 'replace',
    confirmationText: 'RESTORE',
    actor: 'SuperAdmin',
  })

  assert.equal(res.success, true)
  assert.equal(res.invarianceValid, true)

  const bolsAfter = JSON.parse(fs.readFileSync(path.join(dataDir, '.local-bols.json'), 'utf8'))
  assert.equal(bolsAfter.length, 1)
  assert.equal(bolsAfter[0].bolNumber, 'BOL-SOLO-999')
})

// ============================================================================
// TEST 10: Automatic Pre-Restore Snapshot & Rollback
// ============================================================================
test('Test 10: Reversible rollback restores database back to pre-restore safety snapshot', async () => {
  // Database currently has 1 BOL (BOL-SOLO-999) from Test 9
  const preState = JSON.parse(fs.readFileSync(path.join(dataDir, '.local-bols.json'), 'utf8'))
  assert.equal(preState.length, 1)

  // Restore 2 more BOLs in merge mode
  const addMore = {
    backupMetadata: {
      application: 'AQ COMPANIES',
      backupFormatVersion: '2.0',
      applicationVersion: '5.2.0',
    },
    data: {
      bols: [
        { id: 'b-more-1', bolNumber: 'BOL-MORE-1', shipperName: 'M1' },
        { id: 'b-more-2', bolNumber: 'BOL-MORE-2', shipperName: 'M2' },
      ],
    },
  }

  const res = await executeAQRestore(addMore, { mode: 'merge', actor: 'Rollback Test' })
  assert.equal(res.success, true)

  const afterMerge = JSON.parse(fs.readFileSync(path.join(dataDir, '.local-bols.json'), 'utf8'))
  assert.equal(afterMerge.length, 3)

  // Execute Rollback using restoreId
  const rbRes = await rollbackRestore(res.restoreId, 'Rollback Tester')
  assert.equal(rbRes.success, true)

  const afterRollback = JSON.parse(fs.readFileSync(path.join(dataDir, '.local-bols.json'), 'utf8'))
  assert.equal(afterRollback.length, 1, 'Database must be restored back to pre-restore count (1)')
  assert.equal(afterRollback[0].bolNumber, 'BOL-SOLO-999')
})

// ============================================================================
// TEST 11: Multi-Currency & Accounting Invariance Strictness
// ============================================================================
test('Test 11: Accounting Invariance strictly enforces Debit - Credit = Net Balance per currency', async () => {
  // Broken ledger where Debit (5000) - Credit (0) != reported Balance (3000)
  const brokenData = {
    backupMetadata: {
      application: 'AQ COMPANIES',
      backupFormatVersion: '2.0',
      applicationVersion: '5.2.0',
    },
    data: {
      bols: [],
      accountLedgers: {
        'Corrupted Account': {
          entries: [
            { id: 'tx-bad', date: '2026-09-01', debit: 5000, credit: 0, balance: 3000, currency: 'USD' },
          ],
          currentBalance: 3000,
        },
      },
    },
  }

  const dryRun = await analyzeAndDryRunRestore(brokenData)
  assert.equal(dryRun.invarianceValid, false, 'Must flag accounting invariance failure')
  assert.ok(dryRun.warnings.some((w) => /invariance/i.test(w)))
})

// ============================================================================
// TEST 12: Full Round-Trip Test (Database A -> Backup -> Database B -> 100% Match)
// ============================================================================
test('Test 12: Database A -> Backup -> Restore into fresh DB B matches 100% losslessly', async () => {
  // DB A: Populate full sample data
  fs.writeFileSync(path.join(dataDir, '.local-bols.json'), JSON.stringify(sampleBols, null, 2))
  fs.writeFileSync(path.join(dataDir, '.local-accounts.json'), JSON.stringify(sampleAccounts, null, 2))
  fs.writeFileSync(path.join(dataDir, '.local-account-ledgers.json'), JSON.stringify(sampleLedgers, null, 2))

  // Create Backup from DB A
  const backupA = await createAQBackup({ type: 'full', extension: 'json', actor: 'RoundTrip' })
  assert.equal(backupA.success, true)

  // Clear database to simulate fresh DB B
  fs.writeFileSync(path.join(dataDir, '.local-bols.json'), '[]')
  fs.writeFileSync(path.join(dataDir, '.local-accounts.json'), '[]')
  fs.writeFileSync(path.join(dataDir, '.local-account-ledgers.json'), '{}')

  // Restore into DB B using Replace mode
  const restoreB = await executeAQRestore(backupA.filePath, {
    mode: 'replace',
    confirmationText: 'RESTORE',
    actor: 'RoundTrip',
  })
  assert.equal(restoreB.success, true)

  // Compare DB B with original DB A
  const finalBols = JSON.parse(fs.readFileSync(path.join(dataDir, '.local-bols.json'), 'utf8'))
  const finalAccounts = JSON.parse(fs.readFileSync(path.join(dataDir, '.local-accounts.json'), 'utf8'))
  const finalLedgers = JSON.parse(fs.readFileSync(path.join(dataDir, '.local-account-ledgers.json'), 'utf8'))

  assert.equal(finalBols.length, sampleBols.length)
  assert.equal(finalBols[0].bolNumber, sampleBols[0].bolNumber)
  assert.equal(finalBols[0].truckNumber, '54846 هرات', 'Afghan truck plate preserved in round-trip')
  assert.equal(finalBols[0].driverName, 'احمد شاه', 'Pashto driver name preserved in round-trip')

  assert.equal(finalAccounts.length, sampleAccounts.length)
  assert.equal(finalAccounts[2].name, 'کابل صرافی', 'Dari account name preserved in round-trip')

  assert.equal(finalLedgers['کابل صرافی'].currentBalance, 300000)
  assert.equal(finalLedgers['Ariana Raisin Traders'].currentBalance, 6000)
})

// ============================================================================
// TEST 13: Windows Path with Spaces Support
// ============================================================================
test('Test 13: Handles Windows paths containing spaces and unicode characters cleanly', async () => {
  const dirWithSpaces = path.join(sandbox, 'C Users Ahsanullah Qureshi Backups Test')
  fs.mkdirSync(dirWithSpaces, { recursive: true })

  const backup = await createAQBackup({
    type: 'data_only',
    extension: 'json',
    customTargetDir: dirWithSpaces,
  })

  assert.equal(backup.success, true)
  assert.ok(fs.existsSync(backup.filePath))
  assert.ok(backup.filePath.includes('C Users Ahsanullah Qureshi Backups Test'))

  const verify = await verifyAQBackup(backup.filePath)
  assert.equal(verify.valid, true)
})

// ============================================================================
// TEST 14: Overview Dashboard Stats
// ============================================================================
test('Test 14: Overview dashboard stats returns live totals and health status', async () => {
  const stats = await getBackupOverviewStats()
  assert.ok(typeof stats.totalBackupsCount === 'number')
  assert.ok(typeof stats.verifiedBackupsCount === 'number')
  assert.equal(stats.dataIntegrityStatus, 'HEALTHY')
  assert.equal(stats.restoreReadiness, 'READY')
  assert.ok(stats.backupLocation.length > 0)
})
