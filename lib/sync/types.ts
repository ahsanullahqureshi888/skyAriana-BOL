/**
 * Sky Ariana BOL — Synchronization Engine Types & Schemas
 * Strict TypeScript models for local-first Google Drive synchronization.
 */

export type SyncRecordType =
  | "bol"
  | "invoice"
  | "ledger_entry"
  | "account"
  | "company"
  | "contact"
  | "preset"
  | "setting"
  | "attachment"

export interface SyncRecord<T = any> {
  id: string
  type: SyncRecordType
  version: number
  schemaVersion: number
  createdAt: string
  updatedAt: string
  updatedByDevice: string
  deleted: boolean
  checksum: string
  data: T
}

export interface SyncManifest {
  syncVersion: number
  schemaVersion: number
  lastUpdated: string
  deviceCount: number
  recordCounts: Partial<Record<SyncRecordType, number>>
  checksumIndex: Record<string, string> // recordId -> checksum
  activeDevices?: string[] // deviceIds
}

export interface SyncDevice {
  deviceId: string
  deviceName: string
  platform: "Windows" | "macOS" | "Linux" | "Web" | "Unknown"
  appVersion: string
  createdAt: string
  lastSeenAt: string
  isCurrentDevice?: boolean
}

export type SyncOperation = "create" | "update" | "delete"
export type SyncQueueItemStatus = "pending" | "uploading" | "synced" | "failed" | "conflict"

export interface SyncQueueItem {
  id: string
  recordId: string
  recordType: SyncRecordType
  operation: SyncOperation
  payload: any
  status: SyncQueueItemStatus
  attempts: number
  lastError?: string
  createdAt: string
  updatedAt: string
}

export type SyncStatusState =
  | "idle"
  | "checking"
  | "uploading"
  | "downloading"
  | "merging"
  | "conflict"
  | "offline"
  | "failed"
  | "complete"

export interface SyncConflict {
  id: string
  recordId: string
  recordType: SyncRecordType
  localRecord: SyncRecord
  cloudRecord: SyncRecord
  conflictingFields: string[]
  resolved: boolean
  resolutionStrategy?: "keep_local" | "keep_cloud" | "merge" | "keep_both"
  resolvedAt?: string
}

export type SyncIntervalOption = "5m" | "15m" | "30m" | "60m" | "manual"

export interface SyncCategorySelection {
  bols: boolean
  invoices: boolean
  packingLists: boolean
  cargoStickers: boolean
  accountLedgers: boolean
  companyAccounts: boolean
  shippers: boolean
  consignees: boolean
  notifyParties: boolean
  routePresets: boolean
  companySettings: boolean
  uploadedDocuments: boolean
  generatedPdfs: boolean
}

export interface SyncSettings {
  enabled: boolean
  autoSync: boolean
  syncOnStart: boolean
  syncOnClose: boolean
  syncAfterImportantChanges: boolean
  interval: SyncIntervalOption
  categories: SyncCategorySelection
  encryptionEnabled: boolean
  encryptionPassphrase?: string
  deviceName: string
  googleConnected?: boolean
  googleEmail?: string
  googleDriveFolderId?: string
}

export interface SyncAuditLogEntry {
  id: string
  timestamp: string
  recordId: string
  recordType: SyncRecordType
  action: string
  previousVersion?: number
  newVersion?: number
  deviceId: string
  syncResult: "success" | "failed" | "conflict" | "restored"
  details?: string
}

export interface Tombstone {
  recordId: string
  type: SyncRecordType
  deletedAt: string
  deletedByDevice: string
  version: number
  title?: string
  originalData?: any
}

export interface SyncDiagnosticsReport {
  timestamp: string
  connection: "OK" | "OFFLINE" | "ERROR"
  authentication: "AUTHENTICATED" | "NOT_CONFIGURED" | "EXPIRED"
  driveFolder: "OK" | "MISSING" | "PENDING"
  pendingQueueCount: number
  failedOperationsCount: number
  conflictsCount: number
  lastSuccessfulSync: string | null
  deviceId: string
  deviceName: string
  platform: string
  appVersion: string
  schemaVersion: number
  storageMetrics: {
    localRecordCount: number
    cloudRecordCount: number
    queueSize: number
  }
}

export const DEFAULT_SYNC_CATEGORIES: SyncCategorySelection = {
  bols: true,
  invoices: true,
  packingLists: true,
  cargoStickers: true,
  accountLedgers: true,
  companyAccounts: true,
  shippers: true,
  consignees: true,
  notifyParties: true,
  routePresets: true,
  companySettings: true,
  uploadedDocuments: false, // Large files sync separately
  generatedPdfs: false,     // Large files sync separately
}

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  enabled: false,
  autoSync: true,
  syncOnStart: true,
  syncOnClose: true,
  syncAfterImportantChanges: true,
  interval: "15m",
  categories: DEFAULT_SYNC_CATEGORIES,
  encryptionEnabled: true,
  deviceName: "Office PC",
  googleConnected: false,
}
