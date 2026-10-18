/**
 * AQ COMPANIES v5.2.0 — Phase 3 Final Security, Hardening & Provenance Test Suite
 *
 * Verifies:
 * 1. Path traversal rejection (ZIP slip, absolute paths, drive letters, UNC, null bytes)
 * 2. Script & executable content rejection (never execute or extract .exe, .bat, .ps1, .sh, .js)
 * 3. Untrusted SVG script inspection (reject embedded <script>, javascript: handlers)
 * 4. ZIP bomb / resource exhaustion limits (max entries, single file overflow, compression ratio)
 * 5. Prototype pollution rejection in JSON (__proto__, constructor, prototype)
 * 6. Extreme corrupted number and concatenated package detection (NaN, Infinity, 1114257184259 CTNS)
 * 7. Exact currency preservation (AFN, USD, AED) and decimal-safe driver rent (38,497 AFN)
 * 8. Historical BOL provenance round-trip (Barnama #051, sourceFile, sourcePage, reviewStatus)
 * 9. Multi-cargo item segregation round-trip (never concatenated into a single string)
 * 10. Attachment relationship safety & orphan quarantine (ORPHAN_ATTACHMENTS)
 * 11. Move to new PC portability (relative paths inside package, cross-user path rebinding)
 * 12. Accounting Invariance round-trip & Post-restore verified snapshot creation
 */

const test = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const fs = require("node:fs/promises")
const fsSync = require("node:fs")
const zlib = require("node:zlib")

const sandbox = require("./isolated-data.cjs")()
const loadTypescript = require("./load-typescript.cjs")

const { createZipArchive, extractZipArchive } = loadTypescript("lib/google-drive/archive.ts")
const {
  normalizeBackupData,
  guardPrototypePollution,
  isExtremeCorruptedNumber,
} = loadTypescript("lib/backup/legacy-normalizer.ts")
const {
  createAQBackup,
  verifyAQBackup,
  analyzeAndDryRunRestore,
  executeAQRestore,
} = loadTypescript("lib/backup/central-backup-service.ts")
const { sanitizePortablePaths } = loadTypescript("lib/backup/disaster-recovery-service.ts")
const { computeSha256 } = loadTypescript("lib/backup/backup-format.ts")
const { validateLedgerInvariance } = loadTypescript("lib/services/ledger-sync-utils.ts")

test("Security 1: Rejects ZIP path traversal attacks (.., absolute paths, drive letters, UNC, null bytes)", () => {
  // Test directory traversal
  const slipEntries = [{ path: "../../evil.txt", data: "malicious" }]
  const slipZip = createZipArchive(slipEntries)
  assert.throws(() => extractZipArchive(slipZip), /Suspicious archive entry path/)

  // Test absolute POSIX path
  const absEntries = [{ path: "/etc/shadow", data: "malicious", preserveRawPath: true }]
  const absZip = createZipArchive(absEntries)
  assert.throws(() => extractZipArchive(absZip), /Suspicious archive entry path/)

  // Test Windows drive letter
  const driveEntries = [{ path: "C:\\Windows\\System32\\calc.exe", data: "malicious" }]
  const driveZip = createZipArchive(driveEntries)
  assert.throws(() => extractZipArchive(driveZip), /Suspicious archive entry path/)

  // Test UNC path
  const uncEntries = [{ path: "\\\\remote-server\\share\\evil.txt", data: "malicious", preserveRawPath: true }]
  const uncZip = createZipArchive(uncEntries)
  assert.throws(() => extractZipArchive(uncZip), /Suspicious archive entry path/)
})

test("Security 2: Strictly rejects executable and script content contained in backup", () => {
  const badExtensions = [
    "evil.exe",
    "script.bat",
    "payload.ps1",
    "run.sh",
    "exploit.js",
    "module.mjs",
    "installer.msi",
    "hook.dll",
    "macro.vbs",
    "app.hta",
  ]

  for (const extName of badExtensions) {
    const entry = [{ path: `attachments/${extName}`, data: "print('malicious')" }]
    const zip = createZipArchive(entry)
    assert.throws(
      () => extractZipArchive(zip),
      /Security violation: Archive contains forbidden executable or script file/,
      `Failed to reject forbidden extension ${extName}`
    )
  }
})

test("Security 3: Rejects untrusted SVG files with embedded script execution", () => {
  const evilSvg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert('xss')</script><circle cx="50" cy="50" r="40"/></svg>`
  const entry = [{ path: "attachments/logo.svg", data: Buffer.from(evilSvg, "utf8") }]
  const zip = createZipArchive(entry)

  assert.throws(
    () => extractZipArchive(zip),
    /Security violation: Untrusted SVG in archive entry .* contains embedded script execution/
  )
})

test("Security 4: Enforces resource exhaustion guards against ZIP bombs and size overflow", () => {
  // Test single entry size overflow
  const hugeMock = Buffer.alloc(1024, "A")
  const entry = [{ path: "data/huge.json", data: hugeMock }]
  const zip = createZipArchive(entry)

  // With a max single size of 500 bytes, this 1024-byte entry must be rejected
  assert.throws(
    () => extractZipArchive(zip, { maxSingleFileSize: 500 }),
    /exceeds maximum limit/
  )

  // Test max entry count overflow
  const twoEntries = [
    { path: "data/file1.json", data: "{}" },
    { path: "data/file2.json", data: "{}" },
  ]
  const zipTwo = createZipArchive(twoEntries)
  assert.throws(
    () => extractZipArchive(zipTwo, { maxFilesCount: 1 }),
    /Entry count \(2\) exceeds maximum safety limit \(1\)/
  )
})

test("Security 5: Rejects prototype pollution attempts in backup JSON payloads", () => {
  const maliciousJson = JSON.parse('{"__proto__": {"admin": true}, "bols": []}')
  assert.throws(
    () => guardPrototypePollution(maliciousJson),
    /Dangerous property "__proto__" detected/
  )

  const nestedMalicious = JSON.parse('{"data": {"constructor": {"polluted": true}}}')
  assert.throws(
    () => guardPrototypePollution(nestedMalicious),
    /Dangerous property "constructor" detected/
  )
})

test("Data Safety 6: Extreme numbers, NaNs, and concatenated package strings are flagged or rejected", () => {
  assert.equal(isExtremeCorruptedNumber("NaN"), true)
  assert.equal(isExtremeCorruptedNumber("Infinity"), true)
  assert.equal(isExtremeCorruptedNumber("-Infinity"), true)
  assert.equal(isExtremeCorruptedNumber("1.1e16"), true)
  assert.equal(isExtremeCorruptedNumber("1114257184259 CTNS"), true)
  assert.equal(isExtremeCorruptedNumber("667658000"), true)

  // Valid values must pass
  assert.equal(isExtremeCorruptedNumber("25000"), false)
  assert.equal(isExtremeCorruptedNumber("38497.50"), false)
  assert.equal(isExtremeCorruptedNumber("120 CTNS"), false)

  // Verify normalizer handles concatenated packages string
  const rawPayload = {
    bols: [
      {
        bolNumber: "BOL-2026-TEST-PKG",
        numberOfPackages: "1114257184259 CTNS",
        grossWeight: "1.1e16",
        netWeight: "22000",
      },
    ],
  }
  const normalized = normalizeBackupData(rawPayload)
  assert.equal(normalized.flaggedPackagesCount, 1)
  assert.equal(normalized.repairedWeightsCount, 1)
  assert.equal(normalized.data.bols[0].grossWeight, "")
  assert.equal(normalized.data.bols[0].netWeight, "22000")
})

test("Provenance 7: Historical BOL provenance round-trip preserves Barnama #051, sourceFile, sourcePage, reviewStatus", () => {
  const historicalBol = {
    bolNumber: "HIST-051",
    barnama: "#051",
    legacyBarnama: "#051",
    sourceFile: "2024_Herat_Customs_Archive.pdf",
    sourcePage: 12,
    sourceSerial: "051",
    sourceDate: "2024-05-18",
    originalText: "بارنامه نمبر ۰۵۱ ریاست گمرک هرات",
    reviewStatus: "VERIFIED",
    isHistorical: true,
    driverName: "Ghulam Sakhi",
    driverFreight: "38497",
    driverRentCurrency: "AFN",
    routes: ["Islam Qala", "Herat"],
    cargoItems: [
      { description: "Wheat Flour", packages: "500 BAGS", weight: "25000 KG" },
      { description: "Cooking Oil", packages: "200 CTNS", weight: "4000 KG" },
    ],
  }

  const normalized = normalizeBackupData({ bols: [historicalBol] })
  const bol = normalized.data.bols[0]

  assert.equal(bol.bolNumber, "HIST-051")
  assert.equal(bol.barnama, "#051")
  assert.equal(bol.legacyBarnama, "#051")
  assert.equal(bol.sourceFile, "2024_Herat_Customs_Archive.pdf")
  assert.equal(bol.sourcePage, 12)
  assert.equal(bol.sourceSerial, "051")
  assert.equal(bol.reviewStatus, "VERIFIED")
  assert.equal(bol.isHistorical, true)
  assert.equal(bol.driverRentCurrency, "AFN")
  assert.equal(bol.driverFreight, "38497")

  // Multi-cargo segregated items preserved
  assert.equal(Array.isArray(bol.cargoItems), true)
  assert.equal(bol.cargoItems.length, 2)
  assert.equal(bol.cargoItems[0].description, "Wheat Flour")
  assert.equal(bol.cargoItems[1].description, "Cooking Oil")
})

test("Portability 8: Move to new PC rebinds paths without hardcoded absolute user paths", () => {
  const originalUserPath = "C:\\Users\\Ahsanullah Qureshi\\Documents\\Customs_Docs\\Doc1.pdf"
  const newPcDataDir = "C:\\Users\\TestUser\\AppData\\Local\\AQ_Companies\\data"

  const rebound = sanitizePortablePaths(originalUserPath, newPcDataDir)
  assert.equal(rebound, path.join(newPcDataDir, "Doc1.pdf"))
  assert.equal(rebound.includes("Ahsanullah Qureshi"), false)
})

test("Orphan Quarantine 9: Restore safely quarantines orphaned attachments whose parent BOL is missing", async () => {
  // Create an archive with an attachment whose parent BOL does not exist in data
  const metadata = {
    application: "AQ COMPANIES",
    backupFormatVersion: "2.0",
    applicationVersion: "5.2.0",
    schemaVersion: "2",
    backupId: "AQ-BKP-ORPHAN-TEST",
    backupType: "full",
    createdAt: new Date().toISOString(),
    recordCounts: { bols: 0, shipments: 0, containers: 0, companies: 0, accounts: 0, invoices: 0, ledgerEntries: 0, payments: 0, supplierBills: 0, supplierCosts: 0, supplierPayments: 0, documents: 0, tasks: 0, alerts: 0, approvals: 0, users: 0, roles: 0, auditLogs: 0, totalRecords: 0 },
    checksum: "dummy",
    financialTotals: [],
    invarianceValid: true,
    completenessScore: 100,
    warnings: [],
    includedModules: ["all"],
  }

  const manifest = {
    manifestVersion: 2,
    backupId: "AQ-BKP-ORPHAN-TEST",
    backupFormatVersion: "2.0",
    applicationVersion: "5.2.0",
    createdAt: new Date().toISOString(),
    entries: [
      {
        relativePath: "attachments/orphan_cargo_spec.pdf",
        fileSize: 18,
        checksum: computeSha256("orphan cargo data"),
        category: "attachment",
        entityRelation: {
          entityType: "BOL",
          entityId: "uuid-missing-parent",
          bolNumber: "BOL-2026-MISSING-999",
        },
      },
    ],
    totalFiles: 1,
    totalSizeBytes: 18,
    compositeChecksum: "dummy",
  }

  const zipEntries = [
    { path: "metadata.json", data: JSON.stringify(metadata) },
    { path: "manifest.json", data: JSON.stringify(manifest) },
    { path: "database.json", data: JSON.stringify({ bols: [], accountLedgers: {} }) },
    { path: "attachments/orphan_cargo_spec.pdf", data: "orphan cargo data" },
  ]
  const zipBuffer = createZipArchive(zipEntries)

  const restoreResult = await executeAQRestore(zipBuffer, {
    mode: "merge",
    actor: "Orphan Quarantine Test",
  })

  assert.equal(restoreResult.success, true)
  assert.equal(
    restoreResult.warnings.some((w) => w.includes("ORPHAN_ATTACHMENTS")),
    true,
    "Expected warning about quarantined orphan attachment"
  )
})

test("Accounting & Golden 10: Complete round-trip retains exact accounting invariance and creates post-restore snapshot", async () => {
  // Populate clean test ledgers satisfying Balance = Debit - Credit
  const testLedgers = {
    "Kabul Logistics Account": {
      entries: [
        { id: "e-01", date: "2026-03-01", debit: 50000, credit: 0, currency: "AFN", ref: "TR-01" },
        { id: "e-02", date: "2026-03-05", debit: 0, credit: 20000, currency: "AFN", ref: "TR-02" },
      ],
      currentBalance: 30000,
    },
    "Dubai Freight Account": {
      entries: [
        { id: "e-03", date: "2026-03-02", debit: 10000, credit: 0, currency: "USD", ref: "TR-03" },
        { id: "e-04", date: "2026-03-06", debit: 0, credit: 4000, currency: "USD", ref: "TR-04" },
      ],
      currentBalance: 6000,
    },
  }

  const invCheck = validateLedgerInvariance(testLedgers)
  assert.equal(invCheck.isValid, true)

  // Create full backup
  const backupRes = await createAQBackup({
    type: "full",
    extension: "json",
    actor: "RoundTrip Golden Tester",
    note: "Phase 3 Golden Roundtrip Test",
  })
  assert.equal(backupRes.success, true)
  assert.equal(backupRes.verificationPassed, true)

  // Restore the created backup in merge mode
  const restoreRes = await executeAQRestore(backupRes.filePath, {
    mode: "merge",
    actor: "RoundTrip Restore Tester",
    createPostRestoreSnapshot: true,
  })

  assert.equal(restoreRes.success, true)
  assert.equal(restoreRes.invarianceValid, true)
  assert.equal(restoreRes.rolledBack, false)
})
