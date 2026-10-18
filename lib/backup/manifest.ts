import os from "node:os"
import { CURRENT_SYSTEM_VERSION } from "@/lib/config/system-version"
import type { BackupRecordCounts } from "./collect-data"

export interface DatabaseBackupManifest {
  application: string
  backupFormatVersion: number
  schemaVersion: number
  appVersion: string
  createdAt: string
  deviceId: string
  databaseRevision: number
  googleAccount?: string
  counts: BackupRecordCounts
  recordCounts?: BackupRecordCounts
  checksum: string
  encrypted: boolean
  encryptionAlgorithm?: string
  metadataIndex?: {
    bolNumbers: string[]
    invoiceNumbers: string[]
    companyNames: string[]
  }
}

export function getLocalDeviceId(): string {
  const host = os.hostname() || "desktop"
  const platform = os.platform()
  return `${platform}-${host}`.toLowerCase().replace(/[^a-z0-9_-]/g, "_")
}

export function createDatabaseManifest(params: {
  databaseRevision: number
  recordCounts: BackupRecordCounts
  checksum: string
  googleAccount?: string
  encrypted?: boolean
  encryptionAlgorithm?: string
  metadataIndex?: {
    bolNumbers?: string[]
    invoiceNumbers?: string[]
    companyNames?: string[]
  }
}): DatabaseBackupManifest {
  return {
    application: "Sky Ariana BOL",
    backupFormatVersion: 1,
    schemaVersion: 1,
    appVersion: CURRENT_SYSTEM_VERSION.version || "5.1.0",
    createdAt: new Date().toISOString(),
    deviceId: getLocalDeviceId(),
    databaseRevision: params.databaseRevision,
    googleAccount: params.googleAccount,
    counts: params.recordCounts,
    recordCounts: params.recordCounts,
    checksum: params.checksum,
    encrypted: Boolean(params.encrypted),
    encryptionAlgorithm: params.encrypted ? (params.encryptionAlgorithm || "aes-256-gcm") : undefined,
    metadataIndex: {
      bolNumbers: params.metadataIndex?.bolNumbers || [],
      invoiceNumbers: params.metadataIndex?.invoiceNumbers || [],
      companyNames: params.metadataIndex?.companyNames || [],
    },
  }
}
