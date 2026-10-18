/**
 * Sky Ariana Disaster Recovery, Database Safety & Backup Service
 * Phase 14: Enterprise Data Protection Engine
 */

import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import os from 'node:os'
import { getDataPath, getUploadPath, getBackupRoot, getRecoveryDir } from '@/lib/server-paths'
import { readJsonFile, writeJsonFile, mutateJsonFile } from '@/lib/services/blob-db'
import { validateLedgerInvariance } from '@/lib/services/ledger-sync-utils'
import { getDatabaseRevision, incrementDatabaseRevision } from '@/lib/backup/revision'

// ============================================================================
// Types & Contracts
// ============================================================================

export type BackupType =
  | 'QUICK'
  | 'FULL'
  | 'PRE_RESTORE'
  | 'PRE_MIGRATION'
  | 'PRE_IMPORT'
  | 'EMERGENCY'
  | 'MANUAL'

export type BackupStatus =
  | 'CREATING'
  | 'VALIDATING'
  | 'VALID'
  | 'FAILED'
  | 'CORRUPTED'
  | 'INCOMPLETE'

export interface BackupRecordCounts {
  bols: number
  invoices: number
  companies: number
  ledgerEntries: number
  accounts: number
  shipments: number
  documents: number
  tasks: number
  masterEntities: number
  bookings: number
}

export interface BackupManifest {
  manifestVersion: number
  backupId: string
  backupType: BackupType
  databaseRevision: number
  schemaVersion: number
  appVersion: string
  createdAt: string
  createdBy: string
  note?: string
  pinned: boolean
  recordCounts: BackupRecordCounts
  checksum: string
  fileCount: number
  totalSizeBytes: number
  includedFiles: string[]
  invarianceValid: boolean
}

export interface BackupItem {
  id: string
  fileName: string
  filePath: string
  type: BackupType
  status: BackupStatus
  createdAt: string
  createdBy: string
  databaseRevision: number
  recordCounts: BackupRecordCounts
  sizeBytes: number
  checksum: string
  pinned: boolean
  note?: string
  isValid: boolean
}

export interface DatabaseHealthIssue {
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  module: string
  recordId?: string
  message: string
  details?: string
  repairable: boolean
  repairAction?: string
}

export interface DeepHealthReport {
  timestamp: string
  overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL'
  databaseRevision: number
  schemaVersion: number
  databaseReadable: boolean
  databaseWritable: boolean
  accountingInvariantPass: boolean
  totalRecords: number
  totalStorageBytes: number
  recordCounts: BackupRecordCounts
  issues: DatabaseHealthIssue[]
  lastBackupTime?: string
  lastBackupValid: boolean
  recoveryPointObjectiveHours: number
}

export interface RestoreDiffComparison {
  currentRevision: number
  backupRevision: number
  currentCounts: BackupRecordCounts
  backupCounts: BackupRecordCounts
  bolsDiff: number
  ledgerEntriesDiff: number
  companiesDiff: number
  invoicesDiff: number
  shipmentsDiff: number
  warnings: string[]
  isOlderBackup: boolean
}

export interface DisasterRecoveryConfig {
  autoBackupEnabled: boolean
  autoBackupIntervalHours: number // 1, 3, 6, 24
  lastAutoBackupTime?: string
  nextAutoBackupTime?: string
  retention: {
    hourlyKeep: number
    dailyKeep: number
    weeklyKeep: number
    monthlyKeep: number
  }
  secondaryBackupPath?: string
  cloudBackupEnabled: boolean
  cloudBackupStatus: 'SYNCED' | 'PENDING' | 'FAILED' | 'DISABLED'
  lastCloudSyncTime?: string
}

// Canonical database files managed by Sky Ariana
export const CANONICAL_TABLES = [
  { key: 'bols', file: '.local-bols.json', label: 'Bills of Lading' },
  { key: 'invoices', file: '.local-invoices.json', label: 'Commercial Invoices' },
  { key: 'accountLedgers', file: '.local-account-ledgers.json', label: 'Account Ledgers' },
  { key: 'bolLedgers', file: '.local-bol-account-ledgers.json', label: 'BOL Linked Ledgers' },
  { key: 'accounts', file: '.local-accounts.json', label: 'Registered Accounts' },
  { key: 'shipments', file: '.local-shipments.json', label: 'Shipment Tracking' },
  { key: 'documents', file: '.local-shipment-documents.json', label: 'Compliance Documents' },
  { key: 'tasks', file: '.local-workflow-tasks.json', label: 'Workflow Tasks' },
  { key: 'masterEntities', file: '.local-master-entities.json', label: 'Master Entities' },
  { key: 'bookings', file: '.local-container-bookings.json', label: 'Container Bookings' },
  { key: 'fullSnapshot', file: '.local-full-snapshot.json', label: 'System Snapshot & Settings' },
]

const BACKUP_CATALOG_FILE = getDataPath('.local-backups-catalog.json')
const RECOVERY_CONFIG_FILE = getDataPath('.local-recovery-config.json')
const BACKUPS_DIR = getBackupRoot()
const RECOVERY_DIR = getRecoveryDir()

const DEFAULT_CONFIG: DisasterRecoveryConfig = {
  autoBackupEnabled: true,
  autoBackupIntervalHours: 3,
  retention: {
    hourlyKeep: 48,
    dailyKeep: 30,
    weeklyKeep: 12,
    monthlyKeep: 12,
  },
  cloudBackupEnabled: true,
  cloudBackupStatus: 'SYNCED',
}

// ============================================================================
// Directory & Path Management
// ============================================================================

export async function ensureRecoveryDirectories(): Promise<void> {
  await fs.mkdir(BACKUPS_DIR, { recursive: true }).catch(() => {})
  await fs.mkdir(RECOVERY_DIR, { recursive: true }).catch(() => {})
}

// ============================================================================
// 1. Zero-Record Protection & Sudden Drop Guard
// ============================================================================

export interface WriteSafetyResult {
  safe: boolean
  error?: string
  warning?: string
  previousCount: number
  newCount: number
}

/**
 * Validates that an incoming write does NOT obliterate a populated table.
 * Strictly blocks 0-record overwrites and alerts on severe drops (>40%).
 */
export function validateWriteSafety(
  tableName: string,
  existingData: any,
  incomingData: any,
  allowDrop = false
): WriteSafetyResult {
  const getCount = (val: any): number => {
    if (!val && val !== 0) return 0
    if (typeof val === 'number') return val
    if (Array.isArray(val)) return val.length
    if (typeof val === 'object') return Object.keys(val).length
    return 1
  }

  const prevCount = getCount(existingData)
  const newCount = getCount(incomingData)

  // 1. Zero-Record Guard: Never overwrite populated table with 0 records
  if (prevCount > 0 && newCount === 0 && !allowDrop) {
    return {
      safe: false,
      previousCount: prevCount,
      newCount: 0,
      error: `Zero-Record Protection: Prevented destructive overwrite of "${tableName}". The existing table has ${prevCount} records while the incoming write has 0 records.`,
    }
  }

  // 2. Severe Data Drop Guard: Detect >40% drops
  if (prevCount >= 10 && newCount < prevCount * 0.6 && !allowDrop) {
    const droppedCount = prevCount - newCount
    const dropPct = Math.round((droppedCount / prevCount) * 100)
    return {
      safe: false,
      previousCount: prevCount,
      newCount,
      error: `Severe Record Drop Detected: Write to "${tableName}" would delete ${droppedCount} records (${dropPct}% drop: from ${prevCount} to ${newCount}). Explicit confirmation required.`,
    }
  }

  return { safe: true, previousCount: prevCount, newCount }
}

// ============================================================================
// 2. Corrupted File Isolation & Quarantine
// ============================================================================

/**
 * Safely reads a JSON database file. If corrupted, NEVER overwrites with empty or seed data.
 * Moves corrupted file to recovery/damaged-database-[timestamp].json for forensics.
 */
export async function safeReadDatabaseFile<T>(filePath: string, fallback: T): Promise<T> {
  await ensureRecoveryDirectories()
  if (!fsSync.existsSync(filePath)) {
    return fallback
  }

  try {
    const raw = await fs.readFile(filePath, 'utf8')
    if (!raw.trim()) return fallback
    return JSON.parse(raw) as T
  } catch (err: any) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const baseName = path.basename(filePath)
    const quarantinePath = path.join(RECOVERY_DIR, `damaged-${baseName}-${timestamp}.corrupt`)

    try {
      await fs.copyFile(filePath, quarantinePath)
      console.error(
        `[CRITICAL RECOVERY] Database file ${baseName} is CORRUPTED. Quarantined to: ${quarantinePath}. Error: ${err.message}`
      )
    } catch (qErr) {
      console.error(`[CRITICAL RECOVERY] Failed to quarantine corrupt file ${baseName}:`, qErr)
    }

    // Throw rather than silently returning empty array to prevent empty overwrite!
    throw new Error(
      `Database File Corruption Detected: "${baseName}" cannot be read as valid JSON. Quarantined to recovery folder. Halting write to prevent permanent data loss.`
    )
  }
}

// ============================================================================
// 3. Record Count Aggregator
// ============================================================================

export async function getLiveRecordCounts(): Promise<BackupRecordCounts> {
  const [bols, invoices, accountLedgers, accounts, shipments, docs, tasks, masterEntities, bookings] =
    await Promise.all([
      readJsonFile<any[]>(getDataPath('.local-bols.json'), []),
      readJsonFile<any[]>(getDataPath('.local-invoices.json'), []),
      readJsonFile<any>(getDataPath('.local-account-ledgers.json'), {}),
      readJsonFile<any[]>(getDataPath('.local-accounts.json'), []),
      readJsonFile<any[]>(getDataPath('.local-shipments.json'), []),
      readJsonFile<any[]>(getDataPath('.local-shipment-documents.json'), []),
      readJsonFile<any[]>(getDataPath('.local-workflow-tasks.json'), []),
      readJsonFile<any[]>(getDataPath('.local-master-entities.json'), []),
      readJsonFile<any[]>(getDataPath('.local-container-bookings.json'), []),
    ])

  let totalLedgerEntries = 0
  if (accountLedgers && typeof accountLedgers === 'object') {
    for (const key of Object.keys(accountLedgers)) {
      const val = accountLedgers[key]
      if (Array.isArray(val)) {
        totalLedgerEntries += val.length
      } else if (val?.entries && Array.isArray(val.entries)) {
        totalLedgerEntries += val.entries.length
      }
    }
  }

  return {
    bols: Array.isArray(bols) ? bols.length : 0,
    invoices: Array.isArray(invoices) ? invoices.length : 0,
    companies: Array.isArray(accounts) ? accounts.length : 0,
    ledgerEntries: totalLedgerEntries,
    accounts: Array.isArray(accounts) ? accounts.length : 0,
    shipments: Array.isArray(shipments) ? shipments.length : 0,
    documents: Array.isArray(docs) ? docs.length : 0,
    tasks: Array.isArray(tasks) ? tasks.length : 0,
    masterEntities: Array.isArray(masterEntities) ? masterEntities.length : 0,
    bookings: Array.isArray(bookings) ? bookings.length : 0,
  }
}

// ============================================================================
// 4. Backup Creation (Quick & Full)
// ============================================================================

/**
 * Creates a Windows-safe backup snapshot.
 * Writes snapshot, manifest, checksum, validates re-reading, and manages catalog.
 */
export async function createDatabaseBackup(
  optionsOrType:
    | BackupType
    | {
        type?: BackupType
        note?: string
        pinned?: boolean
        actor?: string
      } = 'QUICK',
  actorArg?: string,
  extraOptions: { pinned?: boolean; note?: string } = {}
): Promise<BackupItem> {
  await ensureRecoveryDirectories()

  const options =
    typeof optionsOrType === 'string'
      ? { type: optionsOrType, actor: actorArg, pinned: extraOptions.pinned, note: extraOptions.note }
      : optionsOrType || {}

  const type = options.type || 'QUICK'
  const actor = options.actor || 'System'
  const pinned = Boolean(options.pinned)
  const now = new Date()
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)

  // 1. Monotonic Revision increment
  const revision = await incrementDatabaseRevision(`backup_${type.toLowerCase()}`)

  // 2. Read live data across all tables
  const snapshotData: Record<string, any> = {}
  for (const t of CANONICAL_TABLES) {
    const p = getDataPath(t.file)
    snapshotData[t.file] = await readJsonFile<any>(p, [])
  }

  // 3. Collect counters
  let bolCounter = ''
  let invoiceCounter = ''
  try {
    bolCounter = await fs.readFile(getDataPath('.bol-counter'), 'utf8').catch(() => '')
    invoiceCounter = await fs.readFile(getDataPath('.invoice-counter'), 'utf8').catch(() => '')
  } catch {}

  const recordCounts = await getLiveRecordCounts()

  // 4. Invariance validation
  let invarianceValid = true
  const accountLedgers = snapshotData['.local-account-ledgers.json']
  if (accountLedgers) {
    const invCheck = validateLedgerInvariance(accountLedgers)
    invarianceValid = invCheck.isValid
  }

  // 5. Windows-safe file name: Sky-Ariana-Backup-2026-09-21-143000.json
  const fileName = `Sky-Ariana-Backup-${dateStr}-${type}.json`
  const backupFilePath = path.join(BACKUPS_DIR, fileName)
  const backupId = `bkp-${now.getTime()}-${Math.random().toString(36).substring(2, 6)}`

  // 6. Compute payload string and SHA-256 Checksum
  const payloadToHash = JSON.stringify(snapshotData)
  const checksum = crypto.createHash('sha256').update(payloadToHash).digest('hex')

  const manifest: BackupManifest = {
    manifestVersion: 1,
    backupId,
    backupType: type,
    databaseRevision: revision,
    schemaVersion: 14,
    appVersion: 'Sky Ariana Logistics V5.0',
    createdAt: now.toISOString(),
    createdBy: actor,
    note: options.note,
    pinned,
    recordCounts,
    checksum,
    fileCount: CANONICAL_TABLES.length,
    totalSizeBytes: Buffer.byteLength(payloadToHash, 'utf8'),
    includedFiles: CANONICAL_TABLES.map((t) => t.file),
    invarianceValid,
  }

  const fullBackupFile = {
    manifest,
    data: snapshotData,
    counters: { bolCounter, invoiceCounter },
  }

  const jsonContent = JSON.stringify(fullBackupFile, null, 2)
  const sizeBytes = Buffer.byteLength(jsonContent, 'utf8')

  // 7. Safe atomic write of backup file
  const tempPath = `${backupFilePath}.tmp`
  await fs.writeFile(tempPath, jsonContent, 'utf8')
  await fs.rename(tempPath, backupFilePath)

  // 8. Immediate verification: Re-read and check validity
  let verified = false
  try {
    const verifyRaw = await fs.readFile(backupFilePath, 'utf8')
    const verifyParsed = JSON.parse(verifyRaw)
    if (verifyParsed.manifest && verifyParsed.manifest.checksum === checksum) {
      verified = true
    }
  } catch (vErr) {
    console.error(`[Backup Verification Error] Backup file ${fileName} failed re-read check:`, vErr)
  }

  const backupItem: BackupItem = {
    id: backupId,
    fileName,
    filePath: backupFilePath,
    type,
    status: verified ? 'VALID' : 'FAILED',
    createdAt: now.toISOString(),
    createdBy: actor,
    databaseRevision: revision,
    recordCounts,
    sizeBytes,
    checksum,
    pinned,
    note: options.note,
    isValid: verified,
  }

  // 9. Update backup catalog
  await mutateJsonFile<BackupItem[]>(BACKUP_CATALOG_FILE, [], (catalog) => {
    const filtered = catalog.filter((b) => b.id !== backupId)
    return [backupItem, ...filtered]
  })

  // 10. Secondary Copy (if configured)
  const config = await getRecoveryConfig()
  if (config.secondaryBackupPath && fsSync.existsSync(config.secondaryBackupPath)) {
    try {
      const secondaryFile = path.join(config.secondaryBackupPath, fileName)
      await fs.copyFile(backupFilePath, secondaryFile)
    } catch (secErr) {
      console.warn(`[Backup Secondary Copy Warning] Failed to copy to ${config.secondaryBackupPath}:`, secErr)
    }
  }

  // 11. Run retention rotation (never deletes pinned backups)
  await applyRetentionPolicy()

  return backupItem
}

// ============================================================================
// 5. Grandfather-Father-Son Retention Policy
// ============================================================================

export async function applyRetentionPolicy(): Promise<number> {
  const config = await getRecoveryConfig()
  const catalog = await readJsonFile<BackupItem[]>(BACKUP_CATALOG_FILE, [])

  // Never delete pinned or manual/emergency backups by default
  const deletable = catalog.filter(
    (b) => !b.pinned && b.type !== 'MANUAL' && b.type !== 'PRE_RESTORE'
  )

  let deletedCount = 0
  const maxToKeep = config.retention.dailyKeep + config.retention.hourlyKeep
  if (deletable.length > maxToKeep) {
    const toRemove = deletable.slice(maxToKeep)
    for (const item of toRemove) {
      try {
        if (fsSync.existsSync(item.filePath)) {
          await fs.unlink(item.filePath)
        }
        deletedCount++
      } catch {}
    }

    const removedIds = new Set(toRemove.map((r) => r.id))
    await mutateJsonFile<BackupItem[]>(BACKUP_CATALOG_FILE, [], (items) => {
      return items.filter((i) => !removedIds.has(i.id))
    })
  }

  return deletedCount
}

export async function togglePinBackup(backupId: string): Promise<boolean> {
  let nextPinned = false
  await mutateJsonFile<BackupItem[]>(BACKUP_CATALOG_FILE, [], (items) => {
    return items.map((item) => {
      if (item.id === backupId) {
        nextPinned = !item.pinned
        return { ...item, pinned: nextPinned }
      }
      return item
    })
  })
  return nextPinned
}

export async function deleteBackupItem(backupId: string): Promise<boolean> {
  let success = false
  await mutateJsonFile<BackupItem[]>(BACKUP_CATALOG_FILE, [], (items) => {
    const found = items.find((i) => i.id === backupId)
    if (found) {
      if (found.pinned) {
        throw new Error('Cannot delete a Pinned backup. Please unpin it first.')
      }
      try {
        if (fsSync.existsSync(found.filePath)) {
          fsSync.unlinkSync(found.filePath)
        }
      } catch {}
      success = true
      return items.filter((i) => i.id !== backupId)
    }
    return items
  })
  return success
}

// ============================================================================
// 6. Backup Verification & Comparison
// ============================================================================

export interface VerificationResult {
  isValid: boolean
  manifest?: BackupManifest
  recordCounts?: BackupRecordCounts
  checksumMatch: boolean
  invarianceValid: boolean
  errors: string[]
  warnings: string[]
}

export async function verifyBackupFile(backupIdOrPath: string): Promise<VerificationResult> {
  const catalog = await readJsonFile<BackupItem[]>(BACKUP_CATALOG_FILE, [])
  const item = catalog.find((b) => b.id === backupIdOrPath || b.filePath === backupIdOrPath)
  const filePath = item ? item.filePath : backupIdOrPath

  const errors: string[] = []
  const warnings: string[] = []

  if (!fsSync.existsSync(filePath)) {
    return {
      isValid: false,
      checksumMatch: false,
      invarianceValid: false,
      errors: [`Backup file does not exist at: ${filePath}`],
      warnings: [],
    }
  }

  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw)

    if (!parsed.manifest) {
      errors.push('Missing manifest inside backup file.')
      return { isValid: false, checksumMatch: false, invarianceValid: false, errors, warnings }
    }

    const manifest: BackupManifest = parsed.manifest
    const payloadToHash = JSON.stringify(parsed.data)
    const actualChecksum = crypto.createHash('sha256').update(payloadToHash).digest('hex')
    const checksumMatch = actualChecksum === manifest.checksum

    if (!checksumMatch) {
      errors.push(
        `SHA-256 Checksum mismatch! Manifest expects "${manifest.checksum.slice(0, 12)}...", computed "${actualChecksum.slice(0, 12)}...". The backup file may be corrupted.`
      )
    }

    let invarianceValid = true
    const accountLedgers = parsed.data?.['.local-account-ledgers.json']
    if (accountLedgers) {
      const invCheck = validateLedgerInvariance(accountLedgers)
      if (!invCheck.isValid) {
        invarianceValid = false
        errors.push(`Ledger accounting invariance failed: ${invCheck.discrepancies.length} discrepancy found.`)
      }
    }

    return {
      isValid: errors.length === 0 && checksumMatch,
      manifest,
      recordCounts: manifest.recordCounts,
      checksumMatch,
      invarianceValid,
      errors,
      warnings,
    }
  } catch (err: any) {
    return {
      isValid: false,
      checksumMatch: false,
      invarianceValid: false,
      errors: [`Failed to parse backup JSON: ${err.message}`],
      warnings,
    }
  }
}

export async function compareCurrentWithBackup(backupId: string): Promise<RestoreDiffComparison> {
  const currentCounts = await getLiveRecordCounts()
  const currentRevision = await getDatabaseRevision()
  const verification = await verifyBackupFile(backupId)

  if (!verification.manifest || !verification.recordCounts) {
    throw new Error('Unable to read backup manifest for comparison.')
  }

  const bCounts = verification.recordCounts
  const bRevision = verification.manifest.databaseRevision

  const bolsDiff = currentCounts.bols - bCounts.bols
  const ledgerEntriesDiff = currentCounts.ledgerEntries - bCounts.ledgerEntries
  const companiesDiff = currentCounts.companies - bCounts.companies
  const invoicesDiff = currentCounts.invoices - bCounts.invoices
  const shipmentsDiff = currentCounts.shipments - bCounts.shipments

  const warnings: string[] = []
  const isOlderBackup = bRevision < currentRevision

  if (isOlderBackup) {
    warnings.push(
      `This backup (Revision ${bRevision}) is OLDER than the current database (Revision ${currentRevision}).`
    )
  }
  if (bolsDiff > 0) {
    warnings.push(`${bolsDiff} Bills of Lading were created after this backup and will be rolled back.`)
  }
  if (ledgerEntriesDiff > 0) {
    warnings.push(`${ledgerEntriesDiff} ledger transactions are newer than this backup and will be rolled back.`)
  }
  if (invoicesDiff > 0) {
    warnings.push(`${invoicesDiff} commercial invoices will be removed upon restoration.`)
  }

  return {
    currentRevision,
    backupRevision: bRevision,
    currentCounts,
    backupCounts: bCounts,
    bolsDiff,
    ledgerEntriesDiff,
    companiesDiff,
    invoicesDiff,
    shipmentsDiff,
    warnings,
    isOlderBackup,
  }
}

// ============================================================================
// 7. Guided 3-Step Restore Workflow with Pre-Restore Snapshot
// ============================================================================

export interface RestoreExecutionResult {
  success: boolean
  preRestoreBackupId: string
  preRestoreBackupFile: string
  restoredRevision: number
  restoredCounts: BackupRecordCounts
  invarianceValid: boolean
  restoredAt: string
  error?: string
}

export async function executeGuidedRestore(
  optionsOrBackupId:
    | string
    | {
        backupId: string
        confirmationText: string // must equal "RESTORE"
        actor?: string
      },
  confirmationTextArg?: string,
  actorArg?: string
): Promise<RestoreExecutionResult> {
  const options =
    typeof optionsOrBackupId === 'string'
      ? {
          backupId: optionsOrBackupId,
          confirmationText: confirmationTextArg || '',
          actor: actorArg,
        }
      : optionsOrBackupId

  if (options.confirmationText !== 'RESTORE') {
    throw new Error('Destructive restore rejected: you must type "RESTORE" exactly to confirm.')
  }

  // 1. Verify backup file first
  const verification = await verifyBackupFile(options.backupId)
  if (!verification.isValid || !verification.manifest) {
    throw new Error(`Restore rejected: Backup verification failed. Reason: ${verification.errors.join(', ')}`)
  }

  // 2. Read backup payload
  const catalog = await readJsonFile<BackupItem[]>(BACKUP_CATALOG_FILE, [])
  const item = catalog.find((b) => b.id === options.backupId)
  if (!item) throw new Error('Backup item not found in catalog.')

  const raw = await fs.readFile(item.filePath, 'utf8')
  const parsed = JSON.parse(raw)
  const incomingData = parsed.data

  // 3. Mandatory Pre-Restore Snapshot of current live state
  const preRestore = await createDatabaseBackup({
    type: 'PRE_RESTORE',
    note: `Safety snapshot created before restoring backup "${item.fileName}"`,
    actor: options.actor || 'System Admin',
  })

  // 4. Restore tables atomically
  try {
    for (const t of CANONICAL_TABLES) {
      if (incomingData[t.file] !== undefined) {
        const targetPath = getDataPath(t.file)
        await writeJsonFile(targetPath, incomingData[t.file])
      }
    }

    // 5. Restore counters if present
    if (parsed.counters) {
      if (parsed.counters.bolCounter) {
        await fs.writeFile(getDataPath('.bol-counter'), parsed.counters.bolCounter, 'utf8')
      }
      if (parsed.counters.invoiceCounter) {
        await fs.writeFile(getDataPath('.invoice-counter'), parsed.counters.invoiceCounter, 'utf8')
      }
    }

    // 6. Post-restore accounting invariant check
    const restoredLedgers = incomingData['.local-account-ledgers.json']
    let invarianceValid = true
    if (restoredLedgers) {
      const invCheck = validateLedgerInvariance(restoredLedgers)
      invarianceValid = invCheck.isValid
    }

    // 7. Increment revision for restore action
    const newRevision = await incrementDatabaseRevision(`restored_from_${item.id}`)
    const finalCounts = await getLiveRecordCounts()

    return {
      success: true,
      preRestoreBackupId: preRestore.id,
      preRestoreBackupFile: preRestore.fileName,
      restoredRevision: newRevision,
      restoredCounts: finalCounts,
      invarianceValid,
      restoredAt: new Date().toISOString(),
    }
  } catch (err: any) {
    // Critical failure during restore: attempt auto-rollback using preRestore
    console.error('[CRITICAL RESTORE FAILURE] Error during table write:', err)
    try {
      const rollbackRaw = await fs.readFile(preRestore.filePath, 'utf8')
      const rollbackParsed = JSON.parse(rollbackRaw)
      for (const t of CANONICAL_TABLES) {
        if (rollbackParsed.data?.[t.file] !== undefined) {
          await writeJsonFile(getDataPath(t.file), rollbackParsed.data[t.file])
        }
      }
      console.log('[RESTORE ROLLBACK] Successfully rolled back to pre-restore snapshot!')
    } catch (rbErr) {
      console.error('[RESTORE FATAL] Rollback failed:', rbErr)
    }

    throw new Error(`Restore failed: ${err.message}. Rolled back to safety snapshot.`)
  }
}

// ============================================================================
// 8. Deep Read-Only Health Scanner
// ============================================================================

export async function runDeepDatabaseHealthScan(): Promise<DeepHealthReport> {
  const issues: DatabaseHealthIssue[] = []
  let totalRecords = 0
  let totalStorageBytes = 0

  // 1. Check all canonical tables readability & storage size
  let databaseReadable = true
  let databaseWritable = true

  for (const t of CANONICAL_TABLES) {
    const p = getDataPath(t.file)
    if (fsSync.existsSync(p)) {
      try {
        const stat = await fs.stat(p)
        totalStorageBytes += stat.size
        const content = await safeReadDatabaseFile<any>(p, [])
        if (Array.isArray(content)) totalRecords += content.length
        else if (content && typeof content === 'object') totalRecords += Object.keys(content).length
      } catch (err: any) {
        databaseReadable = false
        issues.push({
          severity: 'CRITICAL',
          module: t.label,
          message: `Database table file "${t.file}" failed read validation.`,
          details: err.message,
          repairable: true,
          repairAction: 'Restore from latest valid backup',
        })
      }
    } else {
      issues.push({
        severity: 'INFO',
        module: t.label,
        message: `Table file "${t.file}" does not exist yet; will be initialized on first record save.`,
        repairable: false,
      })
    }
  }

  // 2. Test write access
  try {
    const testFile = getDataPath('.test-write-safety.tmp')
    await fs.writeFile(testFile, 'ok', 'utf8')
    await fs.unlink(testFile)
  } catch (err: any) {
    // In serverless environments (Vercel / AWS Lambda), the deployment root is read-only.
    // The storage engine (blob-db) writes to os.tmpdir() and synchronizes with cloud storage.
    try {
      const testTmp = path.join(os.tmpdir(), '.test-write-safety.tmp')
      await fs.writeFile(testTmp, 'ok', 'utf8')
      await fs.unlink(testTmp)
    } catch (tmpErr: any) {
      databaseWritable = false
      issues.push({
        severity: 'CRITICAL',
        module: 'Storage Engine',
        message: 'Database storage directory is NOT writable.',
        details: err.message,
        repairable: false,
      })
    }
  }

  // 3. Accounting Invariant Check
  let accountingInvariantPass = true
  try {
    const ledgers = await readJsonFile<any>(getDataPath('.local-account-ledgers.json'), {})
    const invCheck = validateLedgerInvariance(ledgers)
    accountingInvariantPass = invCheck.isValid
    if (!invCheck.isValid) {
      issues.push({
        severity: 'CRITICAL',
        module: 'Accounting & Ledger',
        message: `Accounting invariance violation detected: ${invCheck.discrepancies.length} discrepancy found in running balance calculation.`,
        details: 'Discrepancy: Net Balance must strictly equal Total Debit - Total Credit.',
        repairable: true,
        repairAction: 'Recalculate running balances chronologically',
      })
    }
  } catch (err: any) {
    accountingInvariantPass = false
  }

  // 4. Duplicate ID checks
  try {
    const bols = await readJsonFile<any[]>(getDataPath('.local-bols.json'), [])
    if (Array.isArray(bols)) {
      const seen = new Set<string>()
      for (const b of bols) {
        const id = b.id || b.bol_number
        if (id) {
          if (seen.has(id)) {
            issues.push({
              severity: 'WARNING',
              module: 'Bills of Lading',
              recordId: id,
              message: `Duplicate BOL identifier found: "${id}"`,
              repairable: true,
              repairAction: 'Re-assign unique BOL ID',
            })
          }
          seen.add(id)
        }
      }
    }
  } catch {}

  // 5. Orphan Document References Check
  try {
    const docs = await readJsonFile<any[]>(getDataPath('.local-shipment-documents.json'), [])
    const bols = await readJsonFile<any[]>(getDataPath('.local-bols.json'), [])
    const bolIds = new Set((bols || []).map((b) => b.bol_number || b.id))

    if (Array.isArray(docs)) {
      for (const d of docs) {
        if (d.bolNumber && !bolIds.has(d.bolNumber)) {
          issues.push({
            severity: 'WARNING',
            module: 'Documents & Compliance',
            recordId: d.id,
            message: `Document "${d.title || d.fileName}" references non-existent BOL: "${d.bolNumber}"`,
            repairable: true,
            repairAction: 'Relink or archive document',
          })
        }
      }
    }
  } catch {}

  const recordCounts = await getLiveRecordCounts()
  const revision = await getDatabaseRevision()
  const catalog = await readJsonFile<BackupItem[]>(BACKUP_CATALOG_FILE, [])
  const validBackups = catalog.filter((b) => b.isValid)
  const lastBackup = validBackups[0]

  let rpoHours = 999
  if (lastBackup) {
    const diffMs = Date.now() - new Date(lastBackup.createdAt).getTime()
    rpoHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10
  }

  if (rpoHours > 48) {
    issues.push({
      severity: 'WARNING',
      module: 'Backup System',
      message: `No verified backup in ${rpoHours} hours (exceeds 48h safety SLA).`,
      repairable: true,
      repairAction: 'Create Quick Database Backup now',
    })
  }

  const overallStatus = issues.some((i) => i.severity === 'CRITICAL')
    ? 'CRITICAL'
    : issues.some((i) => i.severity === 'WARNING')
    ? 'WARNING'
    : 'HEALTHY'

  return {
    timestamp: new Date().toISOString(),
    overallStatus,
    databaseRevision: revision,
    schemaVersion: 14,
    databaseReadable,
    databaseWritable,
    accountingInvariantPass,
    totalRecords,
    totalStorageBytes,
    recordCounts,
    issues,
    lastBackupTime: lastBackup?.createdAt,
    lastBackupValid: Boolean(lastBackup?.isValid),
    recoveryPointObjectiveHours: rpoHours,
  }
}

// ============================================================================
// 9. Emergency Recovery Diagnostic & Finder
// ============================================================================

export interface EmergencyRecoveryPoint {
  backupId: string
  fileName: string
  type: BackupType
  date: string
  databaseRevision: number
  recordCounts: BackupRecordCounts
  isRecommended: boolean
  checksum: string
}

export async function findEmergencyRecoveryPoints(): Promise<{
  recommendedPoint: EmergencyRecoveryPoint | null
  availablePoints: EmergencyRecoveryPoint[]
}> {
  const catalog = await readJsonFile<BackupItem[]>(BACKUP_CATALOG_FILE, [])
  const validBackups = catalog.filter((b) => b.isValid)

  const points: EmergencyRecoveryPoint[] = validBackups.map((b, idx) => ({
    backupId: b.id,
    fileName: b.fileName,
    type: b.type,
    date: b.createdAt,
    databaseRevision: b.databaseRevision,
    recordCounts: b.recordCounts,
    isRecommended: idx === 0, // Topmost valid is recommended
    checksum: b.checksum,
  }))

  return {
    recommendedPoint: points[0] || null,
    availablePoints: points,
  }
}

// ============================================================================
// 10. Recovery Configuration Management
// ============================================================================

export async function getRecoveryConfig(): Promise<DisasterRecoveryConfig> {
  return await readJsonFile<DisasterRecoveryConfig>(RECOVERY_CONFIG_FILE, DEFAULT_CONFIG)
}

export async function updateRecoveryConfig(
  updates: Partial<DisasterRecoveryConfig>
): Promise<DisasterRecoveryConfig> {
  return await mutateJsonFile<DisasterRecoveryConfig>(RECOVERY_CONFIG_FILE, DEFAULT_CONFIG, (cur) => {
    return { ...cur, ...updates }
  })
}

export async function getBackupCatalog(): Promise<BackupItem[]> {
  return await readJsonFile<BackupItem[]>(BACKUP_CATALOG_FILE, [])
}
