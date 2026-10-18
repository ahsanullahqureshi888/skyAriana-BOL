const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const load = require('./load-typescript.cjs')
const test = require('node:test')
const sandbox = require('./isolated-data.cjs')()
fs.writeFileSync(path.join(process.env.DATABASE_PATH, '.local-bols.json'), '[]')

// Load Disaster Recovery Service
const recoveryService = load('lib/recovery/disaster-recovery-service.ts')
const {
  validateWriteSafety,
  safeReadDatabaseFile,
  createDatabaseBackup,
  verifyBackupFile,
  compareCurrentWithBackup,
  executeGuidedRestore,
  runDeepDatabaseHealthScan,
  applyRetentionPolicy,
  togglePinBackup,
  findEmergencyRecoveryPoints,
  getRecoveryConfig,
  updateRecoveryConfig,
  getBackupCatalog,
} = recoveryService

const { getDatabaseRevision, incrementDatabaseRevision } = load('lib/backup/revision.ts')

async function runTests() {
  console.log('=================================================================')
  console.log('RUNNING ENTERPRISE DISASTER RECOVERY & DATA PROTECTION TEST SUITE')
  console.log('=================================================================')

  // ---------------------------------------------------------------------------
  // Test 1: Zero-Record Protection & Catastrophic Drop Guard
  // ---------------------------------------------------------------------------
  console.log('\n[Test 1] Zero-Record Protection & Catastrophic Drop Guard...')

  // Case 1A: Safe write with growing records
  const safeResult = validateWriteSafety('bols.json', 10, 12, false)
  assert.equal(safeResult.safe, true, 'Increasing record count should be safe')

  // Case 1B: Safe write with small reasonable drop (< 40%)
  const smallDropResult = validateWriteSafety('invoices.json', 100, 90, false)
  assert.equal(smallDropResult.safe, true, 'Small drop (10%) should be safe')

  // Case 1C: Zero-record write on populated database BLOCKED
  const zeroRecordDrop = validateWriteSafety('bols.json', 50, 0, false)
  assert.equal(zeroRecordDrop.safe, false, 'Zero-record drop over populated database must be blocked')
  assert.match(zeroRecordDrop.error || '', /zero-record/i, 'Reason should mention zero-record protection')

  // Case 1D: Severe drop (> 40%) BLOCKED
  const severeDrop = validateWriteSafety('ledger.json', 100, 50, false) // 50% drop
  assert.equal(severeDrop.safe, false, '50% drop exceeds 40% threshold and must be blocked')
  assert.match(severeDrop.error || '', /severe.*drop|catastrophic/i)

  // Case 1E: Allow zero records if previous was 0 (initial setup)
  const initialSetup = validateWriteSafety('empty_table.json', 0, 0, false)
  assert.equal(initialSetup.safe, true, 'Zero to zero write should be allowed')

  // Case 1F: Override flag bypasses the safety block when explicitly requested by superadmin
  const overriddenDrop = validateWriteSafety('bols.json', 50, 0, true)
  assert.equal(overriddenDrop.safe, true, 'Explicit superadmin override must permit action')

  console.log('  ✓ Zero-record protection blocked empty overwrites')
  console.log('  ✓ Catastrophic drop guard successfully blocked >40% drops')
  console.log('  ✓ Superadmin emergency override honored')

  // ---------------------------------------------------------------------------
  // Test 2: Windows-Safe Corrupt File Quarantine
  // ---------------------------------------------------------------------------
  console.log('\n[Test 2] Corrupt File Quarantine & Defensive Safety...')

  const testDir = path.join(sandbox, 'data')
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true })
  const corruptFile = path.resolve(testDir, 'corrupt-test-dummy.json')
  
  // Write deliberately invalid JSON
  fs.writeFileSync(corruptFile, '{"unclosed_json": [123, 456, ', 'utf8')

  try {
    await safeReadDatabaseFile(corruptFile, [])
    assert.fail('Corrupted JSON file must throw an error, never silently return empty array!')
  } catch (err) {
    assert.match(err.message, /corrupt/i, 'Error message should indicate quarantine / corruption')
  }

  // Check that damaged quarantine file was created in data/recovery
  const recoveryDir = path.join(sandbox, 'data/recovery')
  assert.equal(fs.existsSync(recoveryDir), true, 'data/recovery directory must exist')
  const filesInRecovery = fs.readdirSync(recoveryDir)
  const quarantined = filesInRecovery.find(f => f.includes('damaged-corrupt-test-dummy') && f.endsWith('.corrupt'))
  assert.ok(quarantined, 'Damaged file must be quarantined with .corrupt extension')
  console.log(`  ✓ Corrupt file quarantined to: ${quarantined}`)

  // Clean up test file
  if (fs.existsSync(corruptFile)) fs.unlinkSync(corruptFile)

  // ---------------------------------------------------------------------------
  // Test 3: Monotonic Database Revision Engine
  // ---------------------------------------------------------------------------
  console.log('\n[Test 3] Monotonic Database Revision Tracking...')

  const currentRev = await getDatabaseRevision()
  assert.ok(typeof currentRev === 'number' && currentRev >= 0, 'Database revision must be a valid non-negative number')
  
  const nextRev = await incrementDatabaseRevision()
  assert.equal(nextRev, currentRev + 1, 'Revision must strictly increment monotonically by +1')
  console.log(`  ✓ Database revision advanced monotonically: ${currentRev} -> ${nextRev}`)

  // ---------------------------------------------------------------------------
  // Test 4: Quick & Full Database Backup Creation & Manifest Verification
  // ---------------------------------------------------------------------------
  console.log('\n[Test 4] Backup Creation, Manifest & SHA-256 Checksum...')

  const testUser = 'admin-qa'
  const backupResult = await createDatabaseBackup('QUICK', testUser, {
    note: 'Automated QA Validation Backup',
    pinned: false,
  })

  assert.ok(backupResult.id, 'Backup must generate unique ID')
  assert.ok(backupResult.fileName, 'Backup must generate filename')
  assert.match(backupResult.fileName, /^Sky-Ariana-Backup-.*-QUICK\.json$/, 'Filename must match convention')
  assert.equal(backupResult.status, 'VALID', 'Backup status must be VALID')
  assert.equal(backupResult.isValid, true, 'Backup isValid must be true')
  assert.ok(backupResult.checksum && backupResult.checksum.length === 64, 'Backup must calculate 64-char SHA-256 checksum')
  assert.ok(backupResult.sizeBytes > 0, 'Backup size must be greater than 0 bytes')

  // Verify manifest file on disk
  const verifyRes = await verifyBackupFile(backupResult.id)
  assert.equal(verifyRes.isValid, true, 'verifyBackupFile must pass integrity check')
  assert.equal(verifyRes.manifest?.checksum, backupResult.checksum, 'Stored checksum must match re-computed SHA-256')
  console.log(`  ✓ Created valid backup: ${backupResult.fileName} (${backupResult.sizeBytes} bytes, SHA-256: ${backupResult.checksum.slice(0, 12)}...)`)

  // ---------------------------------------------------------------------------
  // Test 5: Diff Comparison (Current vs Backup)
  // ---------------------------------------------------------------------------
  console.log('\n[Test 5] Diff Comparison Between Database and Backup Point...')

  const diffResult = await compareCurrentWithBackup(backupResult.id)
  assert.ok(diffResult, 'Diff result should be returned')
  assert.equal(typeof diffResult.bolsDiff, 'number', 'bolsDiff must be a number')
  assert.equal(typeof diffResult.ledgerEntriesDiff, 'number', 'ledgerEntriesDiff must be a number')
  console.log(`  ✓ Calculated live diff: BOLs diff = ${diffResult.bolsDiff}, Ledger diff = ${diffResult.ledgerEntriesDiff}`)

  // ---------------------------------------------------------------------------
  // Test 6: Guided Restore & Mandatory Pre-Restore Snapshot
  // ---------------------------------------------------------------------------
  console.log('\n[Test 6] Guided Restore Protection & Pre-Restore Snapshot...')

  // Step 6A: Reject without RESTORE confirmation token
  try {
    await executeGuidedRestore(backupResult.id, 'INCORRECT_TOKEN', testUser)
    assert.fail('Restore must fail without exact RESTORE token confirmation!')
  } catch (err) {
    assert.match(err.message, /confirm/i, 'Must require exact typed confirmation token')
  }

  // Step 6B: Execute valid restore with RESTORE confirmation
  const restoreRes = await executeGuidedRestore(backupResult.id, 'RESTORE', testUser)
  assert.equal(restoreRes.success, true, 'Restore operation must succeed')
  assert.ok(restoreRes.preRestoreBackupId, 'Pre-restore safety snapshot must be generated before restore')
  assert.equal(restoreRes.invarianceValid, true, 'Accounting invariance must be verified post-restore')
  console.log(`  ✓ Restore succeeded with auto-created safety snapshot: ${restoreRes.preRestoreBackupId}`)

  // ---------------------------------------------------------------------------
  // Test 7: Retention Policy & Pinned Backup Protection
  // ---------------------------------------------------------------------------
  console.log('\n[Test 7] Retention Policy & Pinned Backup Protection...')

  // Create a backup and pin it
  const pinnedBackup = await createDatabaseBackup('FULL', testUser, {
    note: 'Critical Pinned Audit Point',
    pinned: true,
  })
  assert.equal(pinnedBackup.pinned, true, 'Backup should be pinned')

  // Toggle pin state check
  const isUnpinned = await togglePinBackup(pinnedBackup.id)
  assert.equal(isUnpinned, false, 'Backup unpinned')
  const isRepinned = await togglePinBackup(pinnedBackup.id)
  assert.equal(isRepinned, true, 'Backup re-pinned')

  // Run retention policy with aggressive limits (keep 1)
  const pruned = await applyRetentionPolicy({
    hourlyKeep: 1,
    dailyKeep: 1,
    weeklyKeep: 1,
    monthlyKeep: 1,
  })
  
  // Verify that the pinned backup was NEVER deleted
  const catalog = await getBackupCatalog()
  const exists = catalog.find(b => b.id === pinnedBackup.id)
  assert.ok(exists, 'Pinned backup MUST NEVER be pruned by retention policy')
  console.log(`  ✓ Pinned backup successfully protected from pruning (Catalog size: ${catalog.length})`)

  // ---------------------------------------------------------------------------
  // Test 8: Deep Read-Only Health Scanner
  // ---------------------------------------------------------------------------
  console.log('\n[Test 8] Deep Read-Only Database Health Scanner...')

  const healthReport = await runDeepDatabaseHealthScan()
  assert.ok(healthReport.timestamp, 'Health report must have timestamp')
  assert.ok(['HEALTHY', 'WARNING', 'CRITICAL'].includes(healthReport.overallStatus), 'Overall status must be valid enum')
  assert.equal(healthReport.databaseReadable, true, 'Database must be readable')
  assert.equal(healthReport.databaseWritable, true, 'Database must be writable')
  assert.equal(typeof healthReport.totalRecords, 'number', 'Total records must be counted')
  assert.equal(healthReport.accountingInvariantPass, true, 'Accounting invariance identity (Net = Debit - Credit) must hold')
  console.log(`  ✓ Deep scan completed: Status = ${healthReport.overallStatus}, Total records = ${healthReport.totalRecords}, Invariance = ${healthReport.accountingInvariantPass ? 'PASS' : 'FAIL'}`)

  // ---------------------------------------------------------------------------
  // Test 9: Emergency Recovery Points
  // ---------------------------------------------------------------------------
  console.log('\n[Test 9] Emergency Recovery Points Identification...')

  const emergencyPoints = await findEmergencyRecoveryPoints()
  assert.ok(emergencyPoints.availablePoints.length > 0, 'Must have at least one valid emergency recovery point')
  assert.ok(emergencyPoints.recommendedPoint, 'Must identify recommended recovery point')
  console.log(`  ✓ Found ${emergencyPoints.availablePoints.length} valid emergency recovery points. Recommended: ${emergencyPoints.recommendedPoint.fileName}`)

  console.log('\n=================================================================')
  console.log('ALL DISASTER RECOVERY & DATA PROTECTION TESTS PASSED (9/9) ✓')
  console.log('=================================================================')
}

test('Disaster recovery uses isolated storage for backup, restore and retention', runTests)
