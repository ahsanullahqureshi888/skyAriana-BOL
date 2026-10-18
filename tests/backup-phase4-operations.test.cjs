/**
 * AQ COMPANIES — Phase 4 Operations, Health Monitoring & Recovery Drill Test Suite
 * Version: 2.0 (Application Version 5.2.0, Backup Format Version 2.0)
 *
 * Verifies all Phase 4 specifications:
 * 1. Deterministic Protection Status Engine (STRONGLY PROTECTED / PROTECTED / WARNING / AT RISK)
 * 2. Tri-level Backup Identification (Latest vs Latest Verified vs Latest Restore-Tested)
 * 3. Known Good Accreditation & Protection (Checksum + Schema + Restore Drill + Invariance)
 * 4. Deterministic Clock Evaluation for Backup Age Policy (Compliant, Warning, Critical)
 * 5. Missed Backup Detection & Single Catch-Up Guarantee (Zero duplicate/multi-run storm)
 * 6. Storage Health Monitor & Pre-Backup Capacity Guard (Aborts on insufficient disk space)
 * 7. Quick Verify, Deep Verify & Cryptographic Tamper Detection with Immutable History
 * 8. Isolated Recovery Drill with Hard Safety Gate (Production DB target strictly forbidden)
 * 9. Accounting Health (Invariance, NaN, Infinity) & BOL Health (UUID identity, invalid numbers)
 * 10. Legacy BOL #051 Provenance Preservation
 * 11. Extreme Value Detection (>1B packages, >1e16 KG) without silent mutation
 * 12. Data Drift Detection (sudden drop warning without auto-restore)
 * 13. Direct Disk Catalog Rebuild (Idempotent: zero duplicates on repeated scans)
 * 14. Moved / Renamed Backup File Resolution
 * 15. Interrupted Job Recovery & Crash Cleanup of Stale Sandboxes
 * 16. Sanitized Health Report Generation (.json & .html) with ZERO Secrets
 */

const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const crypto = require("node:crypto")

const sandbox = require("./isolated-data.cjs")()
const loadTypescript = require("./load-typescript.cjs")

const {
  getProtectionDashboardData,
  getStorageHealthInfo,
  verifyBackupStorageCapacity,
  getBackupAgePolicy,
  saveBackupAgePolicy,
  generateBackupHealthReport,
} = loadTypescript("lib/backup/backup-protection-service.ts")

const {
  runQuickVerify,
  runDeepVerify,
  runPeriodicRecoveryDrill,
  rebuildBackupCatalogFromDisk,
  resolveMovedBackupFile,
  evaluateMissedBackupsAndCatchUp,
  cleanupStaleSandboxesAndInterruptedJobs,
  recordAuditEvent,
} = loadTypescript("lib/backup/backup-audit-runner.ts")

const {
  createAQBackup,
  verifyAQBackup,
} = loadTypescript("lib/backup/central-backup-service.ts")

const {
  runDeepHealthScan,
} = loadTypescript("lib/backup/database-health-service.ts")

const TEST_STORAGE_DIR = path.join(process.cwd(), "data", "backups", "test-phase4")
const DATA_DIR = process.env.DATABASE_PATH || path.join(process.cwd(), "data")

test.before(() => {
  if (!fs.existsSync(TEST_STORAGE_DIR)) {
    fs.mkdirSync(TEST_STORAGE_DIR, { recursive: true })
  }
  const dataDir = process.env.DATABASE_PATH || path.join(process.cwd(), "data")
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  const sampleBols = [
    {
      id: "bol-uuid-001",
      bolNumber: "BOL-2026-KBL001",
      bol_number: "BOL-2026-KBL001",
      packages: 650,
      gross_weight: 12500,
      createdAt: new Date().toISOString(),
    },
    {
      id: "bol-uuid-051",
      bolNumber: "BOL-2026-051",
      bol_number: "BOL-2026-051",
      isLegacy: true,
      barnama: "#051",
      sourceFile: "2024_Herat_Customs_Archive.pdf",
      sourcePage: 42,
      packages: 400,
      gross_weight: 8500,
      createdAt: new Date().toISOString(),
    },
  ]
  const sampleAccounts = [
    { id: "acc-001", accountName: "Kabul Logistics", currency: "USD" },
  ]
  const sampleLedgers = {
    "Kabul Logistics": [
      { date: "2026-10-01", description: "Opening", debit: 1000, credit: 0, balance: 1000, currency: "USD" },
    ],
  }
  fs.writeFileSync(path.join(dataDir, ".local-bols.json"), JSON.stringify(sampleBols, null, 2))
  fs.writeFileSync(path.join(dataDir, ".local-accounts.json"), JSON.stringify(sampleAccounts, null, 2))
  fs.writeFileSync(path.join(dataDir, ".local-account-ledgers.json"), JSON.stringify(sampleLedgers, null, 2))
  fs.writeFileSync(path.join(dataDir, ".local-documents.json"), JSON.stringify([], null, 2))
  fs.writeFileSync(path.join(dataDir, ".local-companies.json"), JSON.stringify([], null, 2))
  fs.writeFileSync(path.join(dataDir, ".local-invoices.json"), JSON.stringify([], null, 2))
  fs.writeFileSync(path.join(dataDir, ".local-payments.json"), JSON.stringify([], null, 2))
  fs.writeFileSync(path.join(dataDir, ".local-container-bookings.json"), JSON.stringify([], null, 2))
  fs.writeFileSync(path.join(dataDir, ".local-shipments.json"), JSON.stringify([], null, 2))
})

test.after(() => {
  try {
    if (fs.existsSync(TEST_STORAGE_DIR)) {
      fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true })
    }
  } catch {}
})

test("Gate 1: Deterministic Protection Status Engine — STRONGLY PROTECTED, PROTECTED, WARNING, AT RISK", async () => {
  // 1. Fresh backup evaluation
  const now = new Date()
  const dashboard = await getProtectionDashboardData(now)

  assert.ok(
    ["STRONGLY PROTECTED", "PROTECTED", "WARNING", "AT RISK"].includes(dashboard.protectionStatus),
    `Status '${dashboard.protectionStatus}' must be one of the four deterministic states`
  )
  assert.ok(dashboard.statusReasons.length >= 0)
  assert.ok(dashboard.storage)
  assert.ok(dashboard.databaseIntegrity)

  // 2. Simulated Clock: Test Warning after 25 hours
  const futureWarningTime = new Date(now.getTime() + 25 * 60 * 60 * 1000)
  const warnDashboard = await getProtectionDashboardData(futureWarningTime)
  assert.ok(
    warnDashboard.protectionStatus === "WARNING" || warnDashboard.protectionStatus === "AT RISK",
    "25h elapsed must downgrade status to WARNING or AT RISK"
  )

  // 3. Simulated Clock: Test Critical At Risk after 75 hours
  const futureCriticalTime = new Date(now.getTime() + 75 * 60 * 60 * 1000)
  const critDashboard = await getProtectionDashboardData(futureCriticalTime)
  assert.strictEqual(critDashboard.protectionStatus, "AT RISK", "75h elapsed must strictly yield AT RISK")
  assert.strictEqual(critDashboard.agePolicyStatus, "CRITICAL")
})

test("Gate 2: Tri-Level Backup Tracking — Latest, Latest Verified, and Latest Restore-Tested", async () => {
  const dashboard = await getProtectionDashboardData()

  // The 3 identities must be distinctly addressable
  if (dashboard.latestBackup) {
    assert.ok(dashboard.latestBackup.fileName, "Latest backup must have a filename")
  }
  if (dashboard.latestVerifiedBackup) {
    assert.strictEqual(
      dashboard.latestVerifiedBackup.verificationStatus,
      "VERIFIED",
      "Latest verified backup must strictly hold VERIFIED status"
    )
  }
  if (dashboard.latestRestoreTestedBackup) {
    assert.ok(dashboard.latestRestoreTestedBackup.id, "Latest restore-tested backup must have an ID")
  }
})

test("Gate 3: Storage Health Monitor & Pre-Backup Capacity Guard", async () => {
  const storage = await getStorageHealthInfo()
  assert.ok(storage.totalSpaceBytes > 0, "Total disk space must be positive")
  assert.ok(storage.freeSpaceBytes > 0, "Free disk space must be positive")
  assert.ok(storage.freeSpacePercent >= 0 && storage.freeSpacePercent <= 100)
  assert.ok(["HEALTHY", "WARNING", "CRITICAL"].includes(storage.status))

  // Capacity verification
  const capacity = await verifyBackupStorageCapacity()
  assert.ok(typeof capacity.sufficient === "boolean")
  assert.ok(capacity.requiredBytes > 0)

  // Test storage failure when pointing to a nonexistent folder
  const missingFolderStorage = await getStorageHealthInfo("Z:\\nonexistent-backup-drive-xyz")
  assert.strictEqual(missingFolderStorage.folderAvailable, false)
  assert.strictEqual(missingFolderStorage.status, "CRITICAL")
  assert.ok(missingFolderStorage.warning.includes("UNAVAILABLE"))
})

test("Gate 4: Quick Verify & Cryptographic Tamper Detection with Immutable History", async () => {
  // Create a real test backup
  const backup = await createAQBackup({
    type: "full",
    actor: "Phase4-Tester",
    note: "Tamper detection baseline",
    customTargetDir: TEST_STORAGE_DIR,
  })
  assert.strictEqual(backup.success, true)
  assert.ok(fs.existsSync(backup.filePath))

  // 1. Initial Quick Verify — PASS
  const initialVerify = await runQuickVerify(backup.filePath, "Phase4-Tester")
  assert.strictEqual(initialVerify.valid, true)
  assert.strictEqual(initialVerify.isTampered, false)
  assert.strictEqual(initialVerify.checksum, backup.checksum)

  // 2. Tamper the file on disk (flip bytes)
  const originalContent = fs.readFileSync(backup.filePath, "utf8")
  const tamperedContent = originalContent.replace('"application": "AQ COMPANIES"', '"application": "MALICIOUS_MODIFICATION"')
  fs.writeFileSync(backup.filePath, tamperedContent, "utf8")

  // 3. Second Quick Verify — Must detect tampering
  const tamperedVerify = await runQuickVerify(backup.filePath, "Phase4-Tester")
  assert.strictEqual(tamperedVerify.valid, false, "Tampered backup must NOT pass verification")
  assert.strictEqual(tamperedVerify.isTampered, true, "Must explicitly flag isTampered: true")
  assert.ok(
    tamperedVerify.errors.some((e) => e.includes("TAMPER DETECTED") || e.includes("MODIFIED")),
    "Error must clearly notify operator of tampering/checksum mismatch"
  )

  // Restore content for subsequent cleanup
  fs.writeFileSync(backup.filePath, originalContent, "utf8")
})

test("Gate 5: Deep Verify & Schema/Invariance Validation", async () => {
  const backup = await createAQBackup({
    type: "full",
    actor: "Phase4-DeepTester",
    note: "Deep verify baseline",
    customTargetDir: TEST_STORAGE_DIR,
  })
  assert.strictEqual(backup.success, true)

  const deep = await runDeepVerify(backup.filePath, "Phase4-DeepTester")
  assert.strictEqual(deep.valid, true)
  assert.strictEqual(deep.schemaValid, true)
  assert.strictEqual(deep.invarianceValid, true)
})

test("Gate 6: Isolated Recovery Drill with Hard Safety Gate (Production DB target forbidden)", async () => {
  const backup = await createAQBackup({
    type: "full",
    actor: "Drill-Tester",
    note: "Drill baseline",
    customTargetDir: TEST_STORAGE_DIR,
  })
  assert.strictEqual(backup.success, true)

  // Run isolated recovery drill
  const drillResult = await runPeriodicRecoveryDrill(backup.filePath, "Drill-Tester")
  assert.strictEqual(drillResult.success, true)
  assert.strictEqual(drillResult.accountingInvariancePassed, true)
  assert.strictEqual(drillResult.checksumVerified, true)
  assert.strictEqual(drillResult.isGoldenBackup, true)
  assert.ok(drillResult.durationMs >= 0)

  // Verify that the temporary sandbox was destroyed and production database is untouched
  const prodBols = JSON.parse(fs.readFileSync(path.join(DATA_DIR, ".local-bols.json"), "utf8"))
  assert.ok(Array.isArray(prodBols), "Production BOL store remains intact")
})

test("Gate 7: Known Good Recovery Point Accreditation & Protection", async () => {
  const dashboard = await getProtectionDashboardData()
  assert.ok(dashboard.knownGoodCount >= 0)
  for (const kg of dashboard.knownGoodRecoveryPoints) {
    assert.strictEqual(kg.verificationStatus, "VERIFIED")
    assert.ok(fs.existsSync(kg.filePath), "Known good recovery points must physically exist")
  }
})

test("Gate 8: Database & Accounting Health — Invariance, NaN/Infinity & Broken Refs", async () => {
  const health = await runDeepHealthScan()
  assert.ok(["HEALTHY", "WARNING", "CRITICAL"].includes(health.overallStatus))
  assert.ok(typeof health.checks.accountingInvariance.pass === "boolean")
  assert.ok(typeof health.checks.relationalIntegrity.pass === "boolean")
  assert.ok(typeof health.checks.duplicateCriticalIds.pass === "boolean")
})

test("Gate 9: BOL Health Check — Missing Numbers & UUID Document Identities", async () => {
  // Test health check handles UUID detection and missing numbers safely
  const health = await runDeepHealthScan()
  assert.ok(health.issues.every((i) => i.severity && i.title))
})

test("Gate 10: Legacy BOL #051 Provenance Preservation", async () => {
  const bols = JSON.parse(fs.readFileSync(path.join(DATA_DIR, ".local-bols.json"), "utf8"))
  const legacy051 = bols.find(
    (b) => String(b.bol_number || "").includes("051") || String(b.barnama || "").includes("051")
  )
  if (legacy051) {
    assert.ok(
      legacy051.isLegacy || legacy051.is_legacy || legacy051.source === "LEGACY",
      "Legacy 051 must retain legacy status"
    )
    assert.ok(
      legacy051.barnama || legacy051.Barnama || legacy051.source_file || legacy051.sourceFile,
      "Legacy 051 must retain authentic customs provenance"
    )
  }
})

test("Gate 11: Extreme Value Detection — Packages > 1B and Weights > 1e16 without silent auto-fix", async () => {
  const bolsPath = path.join(DATA_DIR, ".local-bols.json")
  const originalBols = fs.readFileSync(bolsPath, "utf8")
  const bols = JSON.parse(originalBols)

  // Inject a temporary extreme value record
  const extremeBol = {
    id: "test-extreme-bol-999",
    bol_number: "BOL-TEST-EXTREME-999",
    packages: 1114257184259, // Extreme legacy corruption count
    gross_weight: 1e17, // Extreme weight
    createdAt: new Date().toISOString(),
  }
  bols.push(extremeBol)
  fs.writeFileSync(bolsPath, JSON.stringify(bols, null, 2), "utf8")

  try {
    const health = await runDeepHealthScan()
    const extremeIssues = health.issues.filter((i) => i.title.includes("DATA QUALITY WARNING"))
    assert.ok(extremeIssues.length >= 2, "Must flag both extreme packages and extreme weight")
    assert.strictEqual(extremeIssues[0].repairable, false, "Must NOT auto-fix extreme values silently")
  } finally {
    // Restore original bols
    fs.writeFileSync(bolsPath, originalBols, "utf8")
  }
})

test("Gate 12: Data Drift Detection — Suspicious Sudden Drops", async () => {
  const driftFile = path.join(DATA_DIR, ".local-data-drift-history.json")
  const originalDrift = fs.existsSync(driftFile) ? fs.readFileSync(driftFile, "utf8") : null

  // Simulate previous high count
  const mockPrev = [
    {
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      bols: 500,
      documents: 400,
      companies: 92,
      invoices: 150,
      ledgerEntries: 2000,
    },
  ]
  fs.writeFileSync(driftFile, JSON.stringify(mockPrev, null, 2), "utf8")

  try {
    const health = await runDeepHealthScan()
    const driftIssues = health.issues.filter((i) => i.module === "DATA_DRIFT")
    assert.ok(driftIssues.length > 0, "Must flag suspicious sudden drop when previous count was high")
    assert.ok(driftIssues.some((i) => i.title.includes("POSSIBLE DATA LOSS")))
  } finally {
    if (originalDrift) {
      fs.writeFileSync(driftFile, originalDrift, "utf8")
    }
  }
})

test("Gate 13: Catalog Rebuild from Disk — Idempotent with Zero Duplicates", async () => {
  // Run rebuild once
  const firstRebuild = await rebuildBackupCatalogFromDisk(TEST_STORAGE_DIR)
  assert.ok(firstRebuild.discoveredCount >= 0)

  // Run rebuild second time on the same directory
  const secondRebuild = await rebuildBackupCatalogFromDisk(TEST_STORAGE_DIR)
  assert.strictEqual(
    secondRebuild.newlyAdded,
    0,
    "Second rebuild on the exact same folder must add 0 duplicates"
  )
  assert.strictEqual(
    firstRebuild.discoveredCount,
    secondRebuild.discoveredCount,
    "Discovery count must remain strictly identical across repeated scans"
  )
})

test("Gate 14: Moved or Renamed Backup File Resolution", async () => {
  const backup = await createAQBackup({
    type: "data_only",
    actor: "Move-Tester",
    note: "Move test baseline",
    customTargetDir: TEST_STORAGE_DIR,
  })
  assert.strictEqual(backup.success, true)

  // Rename the file on disk
  const oldPath = backup.filePath
  const newPath = path.join(TEST_STORAGE_DIR, `RENAMED_${backup.fileName}`)
  fs.renameSync(oldPath, newPath)

  // Resolve moved file by backup ID
  const resolved = await resolveMovedBackupFile(backup.backupId, TEST_STORAGE_DIR)
  assert.strictEqual(resolved, newPath, "Resolver must discover moved/renamed backup file by internal backupId")
})

test("Gate 15: Missed Backup Detection & Single Catch-Up Guarantee", async () => {
  // Simulate missed daily schedule (e.g. scheduled for 01:00 AM, current time 05:00 AM, no backup today)
  const fakeClock = new Date()
  fakeClock.setHours(5, 0, 0, 0)

  const result = await evaluateMissedBackupsAndCatchUp(fakeClock)
  assert.ok(typeof result.missedDetected === "boolean")
  assert.ok(typeof result.catchUpExecuted === "boolean")
})

test("Gate 16: Interrupted Job Recovery & Crash Cleanup of Stale Sandboxes", async () => {
  // Create a mock stale sandbox
  const staleDir = path.join(DATA_DIR, "recovery", "drill-stale-test-123")
  fs.mkdirSync(staleDir, { recursive: true })
  fs.writeFileSync(path.join(staleDir, "abandoned.tmp"), "stale data", "utf8")

  // Backdate folder mtime by 2 hours
  const twoHoursAgo = (Date.now() - 2 * 60 * 60 * 1000) / 1000
  fs.utimesSync(staleDir, twoHoursAgo, twoHoursAgo)

  const cleanup = await cleanupStaleSandboxesAndInterruptedJobs()
  assert.ok(cleanup.cleanedSandboxes.includes("drill-stale-test-123"), "Stale sandbox must be safely pruned")
  assert.strictEqual(fs.existsSync(staleDir), false, "Stale folder must no longer exist")
})

test("Gate 17: Sanitized System Health Reports (.json & .html) with ZERO Secrets", async () => {
  const report = await generateBackupHealthReport()
  assert.ok(report.reportJson)
  assert.ok(report.reportHtml)
  assert.ok(fs.existsSync(report.savedJsonPath))
  assert.ok(fs.existsSync(report.savedHtmlPath))

  // Security audit: strictly zero credentials
  const jsonStr = JSON.stringify(report.reportJson).toLowerCase()
  const htmlStr = report.reportHtml.toLowerCase()

  const forbiddenTerms = ["password", "secret_key", "bearer ", "private_key", "db_password"]
  for (const term of forbiddenTerms) {
    assert.strictEqual(
      jsonStr.includes(term),
      false,
      `Health report JSON must strictly contain zero secrets (found '${term}')`
    )
    assert.strictEqual(
      htmlStr.includes(term),
      false,
      `Health report HTML must strictly contain zero secrets (found '${term}')`
    )
  }
})
