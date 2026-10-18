export type GoogleDriveConnectionState =
  | "not_connected"
  | "connecting"
  | "connected"
  | "backing_up"
  | "backup_complete"
  | "syncing"
  | "offline"
  | "expired"
  | "failed"

export type AutoBackupInterval =
  | "15m"
  | "30m"
  | "1h"
  | "3h"
  | "6h"
  | "daily"
  | "manual"

export type BackupRetentionOption = 5 | 10 | 30 | "all"

export type RestoreMode = "merge" | "replace"

export type DocumentCategory =
  | "bol"
  | "invoice"
  | "packing-list"
  | "cargo-sticker"
  | "ledger"
  | "document"
  | "export"

export interface GoogleUserProfile {
  name?: string
  email?: string
  picture?: string
}

export interface GoogleDriveTokens {
  accessToken: string
  refreshToken?: string
  expiryDate: number
  tokenType: string
  scope: string
  email?: string
  name?: string
  picture?: string
  updatedAt: string
}

export interface GoogleDriveFolderConfig {
  rootFolderId: string
  databaseFolderId: string
  backupsFolderId: string
  bolFolderId: string
  invoicesFolderId: string
  packingListsFolderId: string
  cargoStickersFolderId: string
  ledgersFolderId: string
  documentsFolderId: string
  systemFolderId: string
  exportsFolderId: string
  updatedAt: string
}

export interface GoogleDriveSettings {
  autoBackupEnabled: boolean
  autoBackupInterval: AutoBackupInterval
  retentionLimit: BackupRetentionOption
  includePdfs: boolean
  includeDocuments: boolean
  autoUploadPdfs: boolean
  wifiOnly: boolean
  lastBackupTime?: string
  lastSyncTime?: string
  connectedAccountEmail?: string
  connectedAccountName?: string
  connectedAccountPicture?: string
}

export interface GoogleDriveRecordCounts {
  bols: number
  invoices: number
  companies: number
  ledgerEntries: number
  accounts?: number
  shipments?: number
}

export interface GoogleDriveStatus {
  state: GoogleDriveConnectionState
  configured: boolean
  connected: boolean
  user?: GoogleUserProfile
  connectedEmail?: string
  rootFolderName: string
  databaseRevision?: number
  localCounts?: GoogleDriveRecordCounts
  cloudCounts?: GoogleDriveRecordCounts
  lastBackup?: string
  lastSync?: string
  settings: GoogleDriveSettings
  pendingOfflineBackup: boolean
  conflictDetected?: boolean
  zeroRecordAlert?: boolean
  error?: string
  storageStats?: {
    totalSpaceBytes?: number
    usedSpaceBytes?: number
    trashSpaceBytes?: number
  }
}

export interface GoogleDriveDocumentCounts {
  bolPdfs: number
  invoicePdfs: number
  packingListPdfs: number
  stickerPdfs: number
  otherDocs: number
}

export interface GoogleDriveBackupManifest {
  application?: string
  app?: string
  backupVersion?: number
  appVersion: string
  schemaVersion: string | number
  backupFormatVersion: string | number
  createdAt: string
  deviceId: string
  databaseRevision?: number
  googleAccount?: string
  checksum: string
  encrypted: boolean
  encryptionAlgorithm?: string
  recordCounts?: GoogleDriveRecordCounts
  counts?: GoogleDriveRecordCounts
  documentCounts?: GoogleDriveDocumentCounts
  metadataIndex?: {
    bolNumbers: string[]
    invoiceNumbers: string[]
    companyNames: string[]
    shipperNames?: string[]
  }
}

export interface GoogleDriveBackupItem {
  id: string
  name: string
  sizeBytes: number
  createdAt: string
  modifiedAt: string
  appVersion?: string
  databaseRevision?: number
  bolCount?: number
  invoiceCount?: number
  companyCount?: number
  ledgerCount?: number
  checksum?: string
  encrypted?: boolean
  manifest?: GoogleDriveBackupManifest
}

export interface RestorePreview {
  backupId: string
  name: string
  createdAt: string
  appVersion: string
  databaseRevision?: number
  recordCounts: GoogleDriveRecordCounts
  currentRecordCounts: GoogleDriveRecordCounts
  checksum: string
  isValid: boolean
  encrypted: boolean
  isNewerVersion?: boolean
}

export interface RestoreResult {
  success: boolean
  mode: RestoreMode
  preRestoreBackupFile: string
  restoredCounts: GoogleDriveRecordCounts
  invarianceValid: boolean
  rolledBack?: boolean
  error?: string
}

export interface BackupProgressUpdate {
  stage:
    | "preparing"
    | "collecting_bols"
    | "collecting_accounting"
    | "collecting_documents"
    | "compressing"
    | "encrypting"
    | "uploading"
    | "verifying"
    | "completed"
    | "failed"
  percent: number
  message: string
  recordCounts?: GoogleDriveRecordCounts
  fileName?: string
  fileId?: string
  error?: string
}
