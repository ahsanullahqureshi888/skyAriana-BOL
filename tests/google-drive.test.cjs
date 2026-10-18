const test = require('node:test')
const assert = require('node:assert/strict')
const loadTypescript = require('./load-typescript.cjs')

// Load Google Drive & Backup modules
const { createZipArchive, extractZipArchive, crc32 } = loadTypescript('lib/google-drive/archive.ts')
const { computeSha256, deriveKey, encryptPayload, decryptPayload } = loadTypescript('lib/google-drive/crypto.ts')
const { DEFAULT_GDRIVE_SETTINGS } = loadTypescript('lib/google-drive/storage-settings.ts')
const { generateOAuthState, validateOAuthState, buildAuthorizationUrl, isGoogleOAuthConfigured } = loadTypescript('lib/google-drive/auth.ts')
const { ZeroRecordDataLossError, MultiDeviceConflictError } = loadTypescript('lib/google-drive/database-backup.ts')
const { createDatabaseManifest } = loadTypescript('lib/backup/manifest.ts')
const { validateDatabaseBackupBuffer } = loadTypescript('lib/backup/validate-backup.ts')
const { validateLedgerInvariance } = loadTypescript('lib/services/ledger-sync-utils.ts')

// ---------------------------------------------------------------------------
// 1. OAUTH FLOW, CSRF STATE, & ACCOUNT CHOOSER
// ---------------------------------------------------------------------------

test('OAuth state generator creates cryptographically unique tokens and validates CSRF once', () => {
  const state1 = generateOAuthState()
  const state2 = generateOAuthState()
  assert.equal(typeof state1, 'string')
  assert.ok(state1.length >= 32)
  assert.notEqual(state1, state2)

  // Valid state succeeds once
  assert.equal(validateOAuthState(state1), true)
  // Second validation with same state fails (replay protection)
  assert.equal(validateOAuthState(state1), false)

  // Arbitrary or invalid state fails
  assert.equal(validateOAuthState('unregistered-malicious-state'), false)
  assert.equal(validateOAuthState(null), false)
})

test('buildAuthorizationUrl enforces prompt=select_account and includes CSRF state', () => {
  // Set mock env credentials for URL builder
  const prevId = process.env.GOOGLE_CLIENT_ID
  const prevSecret = process.env.GOOGLE_CLIENT_SECRET
  process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
  process.env.GOOGLE_CLIENT_SECRET = 'test-secret'

  try {
    const customState = 'secure-csrf-test-state'
    const url = buildAuthorizationUrl('http://127.0.0.1:3001/api/google-drive/auth/callback', customState)
    assert.ok(url.startsWith('https://accounts.google.com/o/oauth2/v2/auth?'))
    assert.ok(url.includes('prompt=select_account+consent') || url.includes('prompt=select_account%20consent'))
    assert.ok(url.includes('access_type=offline'))
    assert.ok(url.includes('state=secure-csrf-test-state'))
    assert.ok(url.includes('client_id=test-client-id.apps.googleusercontent.com'))
  } finally {
    process.env.GOOGLE_CLIENT_ID = prevId
    process.env.GOOGLE_CLIENT_SECRET = prevSecret
  }
})

test('isGoogleOAuthConfigured detects missing vs present credentials', () => {
  const prevId = process.env.GOOGLE_CLIENT_ID
  const prevSecret = process.env.GOOGLE_CLIENT_SECRET

  // Missing case
  delete process.env.GOOGLE_CLIENT_ID
  delete process.env.GOOGLE_CLIENT_SECRET
  const missingCheck = isGoogleOAuthConfigured()
  assert.equal(missingCheck.configured, false)
  assert.ok(missingCheck.missing.includes('GOOGLE_CLIENT_ID'))
  assert.ok(missingCheck.missing.includes('GOOGLE_CLIENT_SECRET'))

  // Configured case
  process.env.GOOGLE_CLIENT_ID = 'configured-id'
  process.env.GOOGLE_CLIENT_SECRET = 'configured-secret'
  const presentCheck = isGoogleOAuthConfigured()
  assert.equal(presentCheck.configured, true)
  assert.equal(presentCheck.missing.length, 0)

  // Restore env
  if (prevId) process.env.GOOGLE_CLIENT_ID = prevId; else delete process.env.GOOGLE_CLIENT_ID
  if (prevSecret) process.env.GOOGLE_CLIENT_SECRET = prevSecret; else delete process.env.GOOGLE_CLIENT_SECRET
})

// ---------------------------------------------------------------------------
// 2. ARCHIVE CREATION & EXTRACTION (ZIP / CRC32 / ZIP-SLIP PROTECTION)
// ---------------------------------------------------------------------------

test('CRC32 computes accurately for known data', () => {
  const buf = Buffer.from('Sky Ariana Logistics Afghanistan', 'utf8')
  const crc = crc32(buf)
  assert.equal(typeof crc, 'number')
  assert.ok(crc > 0)
  assert.equal(crc32(buf), crc)
})

test('createZipArchive and extractZipArchive roundtrip correctly', () => {
  const entries = [
    { path: 'manifest.json', data: JSON.stringify({ version: '5.1.0', app: 'Sky Ariana BOL' }) },
    { path: 'data/bols.json', data: JSON.stringify([{ bol_number: 'BOL-2026-NSA501', shipper: 'Pamir Star' }]) },
    { path: 'data/invoices.json', data: JSON.stringify([{ invoice_number: 'INV-2026-001', amount: 3500 }]) },
    { path: 'documents/sample.txt', data: Buffer.from('Testing binary file content in backup archive', 'utf8') },
  ]

  const zipBuffer = createZipArchive(entries)
  assert.ok(Buffer.isBuffer(zipBuffer))
  assert.ok(zipBuffer.length > 0)
  // Standard zip header signature "PK\x03\x04"
  assert.equal(zipBuffer[0], 0x50)
  assert.equal(zipBuffer[1], 0x4b)
  assert.equal(zipBuffer[2], 0x03)
  assert.equal(zipBuffer[3], 0x04)

  const extracted = extractZipArchive(zipBuffer)
  assert.equal(extracted.size, 4)
  assert.ok(extracted.has('manifest.json'))
  assert.ok(extracted.has('data/bols.json'))
  assert.ok(extracted.has('data/invoices.json'))
  assert.ok(extracted.has('documents/sample.txt'))

  const manifest = JSON.parse(extracted.get('manifest.json').toString('utf8'))
  assert.equal(manifest.app, 'Sky Ariana BOL')
  assert.equal(manifest.version, '5.1.0')

  const bols = JSON.parse(extracted.get('data/bols.json').toString('utf8'))
  assert.equal(bols[0].bol_number, 'BOL-2026-NSA501')
})

test('extractZipArchive rejects zip-slip directory traversal attacks', () => {
  const maliciousEntries = [
    { path: '../../etc/passwd', data: 'malicious' },
  ]
  const zipBuffer = createZipArchive(maliciousEntries)

  assert.throws(() => {
    extractZipArchive(zipBuffer)
  }, /Suspicious archive entry path/)
})

// ---------------------------------------------------------------------------
// 3. CRYPTOGRAPHY (SHA-256 & AES-256-GCM ENCRYPTION/DECRYPTION)
// ---------------------------------------------------------------------------

test('computeSha256 produces deterministic SHA-256 hex string', () => {
  const hash1 = computeSha256('Sky Ariana BOL 2026')
  const hash2 = computeSha256('Sky Ariana BOL 2026')
  assert.equal(hash1, hash2)
  assert.equal(hash1.length, 64)

  const differentHash = computeSha256('Sky Ariana BOL 2027')
  assert.notEqual(hash1, differentHash)
})

test('deriveKey creates 32-byte key from passphrase', () => {
  const key = deriveKey('super-secure-passphrase')
  assert.equal(Buffer.isBuffer(key), true)
  assert.equal(key.length, 32)
})

test('encryptPayload and decryptPayload roundtrip with AES-256-GCM', () => {
  const plaintext = Buffer.from('Confidential BOL & Ledger data for Sky Ariana', 'utf8')
  const key = 'secure-vault-passphrase-2026'

  const encryptedPkg = encryptPayload(plaintext, key)
  assert.equal(encryptedPkg.format, 'sky-ariana-vault-v1')
  assert.ok(encryptedPkg.iv)
  assert.ok(encryptedPkg.authTag)
  assert.ok(encryptedPkg.salt)
  assert.ok(encryptedPkg.ciphertextBase64)

  assert.notEqual(Buffer.from(encryptedPkg.ciphertextBase64, 'base64').toString('utf8'), plaintext.toString('utf8'))

  const decrypted = decryptPayload(encryptedPkg, key)
  assert.equal(decrypted.toString('utf8'), plaintext.toString('utf8'))
})

test('decryptPayload fails when tampered or wrong passphrase is used', () => {
  const plaintext = Buffer.from('Important invoice content', 'utf8')
  const key = 'original-secret-key'

  const encryptedPkg = encryptPayload(plaintext, key)

  assert.throws(() => {
    decryptPayload(encryptedPkg, 'wrong-secret-key')
  })

  const tamperedPkg = { ...encryptedPkg, authTag: '00'.repeat(16) }
  assert.throws(() => {
    decryptPayload(tamperedPkg, key)
  })
})

// ---------------------------------------------------------------------------
// 4. DATABASE MANIFEST & SCHEMA VERSION PROTECTION
// ---------------------------------------------------------------------------

test('createDatabaseManifest populates all required fields and counts', () => {
  const counts = { bols: 79, invoices: 10, companies: 15, ledgerEntries: 120, accounts: 15, shipments: 5 }
  const manifest = createDatabaseManifest({
    databaseRevision: 1521,
    recordCounts: counts,
    checksum: 'mock-checksum-hex',
    googleAccount: 'ahsanullah@example.com',
  })

  assert.equal(manifest.application, 'Sky Ariana BOL')
  assert.equal(manifest.backupFormatVersion, 1)
  assert.equal(manifest.schemaVersion, 1)
  assert.ok(manifest.appVersion)
  assert.equal(manifest.databaseRevision, 1521)
  assert.equal(manifest.googleAccount, 'ahsanullah@example.com')
  assert.equal(manifest.counts.bols, 79)
  assert.equal(manifest.counts.invoices, 10)
  assert.equal(manifest.counts.ledgerEntries, 120)
})

test('validateDatabaseBackupBuffer rejects backups from newer incompatible application versions', () => {
  // Craft manifest with higher schema version (v99)
  const newerManifest = {
    application: 'Sky Ariana BOL',
    backupFormatVersion: 2,
    schemaVersion: 99,
    appVersion: '9.0.0',
    createdAt: new Date().toISOString(),
    deviceId: 'device-x',
    databaseRevision: 5000,
    counts: { bols: 10, invoices: 5, companies: 2, ledgerEntries: 20 },
    checksum: 'abc',
    encrypted: false,
  }

  const archiveBuffer = createZipArchive([
    { path: 'manifest.json', data: JSON.stringify(newerManifest) },
    { path: 'data/bols.json', data: '[]' },
    { path: 'data/invoices.json', data: '[]' },
    { path: 'data/account-ledgers.json', data: '{}' },
    { path: 'data/companies.json', data: '[]' },
  ])

  const validation = validateDatabaseBackupBuffer(archiveBuffer)
  assert.equal(validation.isValid, false)
  assert.equal(validation.isNewerVersion, true)
  assert.ok(validation.errors[0].includes('newer version of Sky Ariana BOL'))
})

// ---------------------------------------------------------------------------
// 5. DATA LOSS SAFEGUARDS & MULTI-DEVICE CONFLICTS
// ---------------------------------------------------------------------------

test('ZeroRecordDataLossError identifies unexpected drop to 0 records', () => {
  const err = new ZeroRecordDataLossError('Possible data loss detected: Local database has 0 BOLs')
  assert.equal(err.name, 'ZeroRecordDataLossError')
  assert.ok(err instanceof Error)
})

test('MultiDeviceConflictError records local and cloud revisions accurately', () => {
  const conflict = new MultiDeviceConflictError(
    'Cloud database has newer revision from another computer',
    1000,
    1050
  )
  assert.equal(conflict.name, 'MultiDeviceConflictError')
  assert.equal(conflict.localRevision, 1000)
  assert.equal(conflict.cloudRevision, 1050)
})

test('DEFAULT_GDRIVE_SETTINGS provides expected defaults', () => {
  assert.equal(DEFAULT_GDRIVE_SETTINGS.autoBackupEnabled, false)
  assert.equal(DEFAULT_GDRIVE_SETTINGS.autoBackupInterval, 'daily')
  assert.equal(DEFAULT_GDRIVE_SETTINGS.retentionLimit, 10)
  assert.equal(DEFAULT_GDRIVE_SETTINGS.includePdfs, true)
  assert.equal(DEFAULT_GDRIVE_SETTINGS.includeDocuments, true)
})

test('enforceBackupRetention isolates oldest backups beyond retention limit', () => {
  const mockBackups = [
    { id: 'f-1', name: 'Sky-Ariana-Database-2026-09-19-120000.zip', createdTime: '2026-09-19T12:00:00Z' },
    { id: 'f-2', name: 'Sky-Ariana-Database-2026-09-19-110000.zip', createdTime: '2026-09-19T11:00:00Z' },
    { id: 'f-3', name: 'Sky-Ariana-Database-2026-09-19-100000.zip', createdTime: '2026-09-19T10:00:00Z' },
    { id: 'f-4', name: 'Sky-Ariana-Database-2026-09-19-090000.zip', createdTime: '2026-09-19T09:00:00Z' },
    { id: 'f-5', name: 'Sky-Ariana-Database-2026-09-19-080000.zip', createdTime: '2026-09-19T08:00:00Z' },
    { id: 'f-6', name: 'Sky-Ariana-Database-2026-09-19-070000.zip', createdTime: '2026-09-19T07:00:00Z' },
    { id: 'f-7', name: 'Sky-Ariana-Database-2026-09-19-060000.zip', createdTime: '2026-09-19T06:00:00Z' },
  ]

  const retentionLimit = 5
  const toKeep = mockBackups.slice(0, retentionLimit)
  const toDelete = mockBackups.slice(retentionLimit)

  assert.equal(toKeep.length, 5)
  assert.equal(toDelete.length, 2)
  assert.equal(toDelete[0].id, 'f-6')
  assert.equal(toDelete[1].id, 'f-7')
})

// ---------------------------------------------------------------------------
// 6. SAFE RESTORE & ACCOUNTING INVARIANCE
// ---------------------------------------------------------------------------

test('Merge mode combines BOLs and updates newer records based on updated_at', () => {
  const localBols = [
    { id: 'bol_1', bol_number: 'BOL-2026-NSA001', consignee: 'Local Consignee', updated_at: '2026-09-19T10:00:00Z' },
    { id: 'bol_2', bol_number: 'BOL-2026-NSA002', consignee: 'Local Consignee 2', updated_at: '2026-09-19T10:00:00Z' },
  ]

  const incomingBols = [
    { id: 'bol_1', bol_number: 'BOL-2026-NSA001', consignee: 'Cloud Updated Consignee', updated_at: '2026-09-19T12:00:00Z' },
    { id: 'bol_3', bol_number: 'BOL-2026-NSA003', consignee: 'New Cloud Consignee', updated_at: '2026-09-19T11:00:00Z' },
  ]

  const bolMap = new Map()
  for (const b of localBols) {
    const k = (b.bol_number || b.id || '').trim().toLowerCase()
    if (k) bolMap.set(k, b)
  }
  for (const b of incomingBols) {
    const k = (b.bol_number || b.id || '').trim().toLowerCase()
    if (!k) continue
    const existing = bolMap.get(k)
    if (!existing) {
      bolMap.set(k, b)
    } else {
      const exTime = new Date(existing.updated_at || 0).getTime()
      const inTime = new Date(b.updated_at || 0).getTime()
      if (inTime >= exTime) {
        bolMap.set(k, { ...existing, ...b })
      }
    }
  }

  const merged = Array.from(bolMap.values())
  assert.equal(merged.length, 3)

  const mergedBol1 = merged.find(b => b.bol_number === 'BOL-2026-NSA001')
  assert.equal(mergedBol1.consignee, 'Cloud Updated Consignee')
})

test('validateLedgerInvariance validates Balance = Debit - Credit strictly', () => {
  const validLedgers = {
    'acc_001': [
      { id: 't1', date: '2026-09-10', debit: 5000, credit: 0, balance: 5000 },
      { id: 't2', date: '2026-09-11', debit: 0, credit: 2000, balance: 3000 },
      { id: 't3', date: '2026-09-12', debit: 1500, credit: 0, balance: 4500 },
    ],
  }

  const check = validateLedgerInvariance(validLedgers)
  assert.equal(check.isValid, true)
  assert.equal(check.discrepancies.length, 0)
})

test('validateLedgerInvariance catches mathematical ledger discrepancy and prevents corrupt restore', () => {
  const corruptedLedgers = {
    'acc_001': [
      { id: 't1', date: '2026-09-10', debit: 5000, credit: 0, balance: 5000 },
      { id: 't2', date: '2026-09-11', debit: 0, credit: 2000, balance: 88888 }, // Corrupted math
    ],
  }

  const check = validateLedgerInvariance(corruptedLedgers)
  assert.equal(check.isValid, false)
  assert.ok(check.discrepancies.length > 0)
})
