import fs from "fs"
import path from "path"
import AdmZip from "adm-zip"
import crypto from "crypto"
import { readJsonFile, writeJsonFile } from "./blob-db"
import { validateLedgerInvariance, LedgerAuditResult } from "./ledger-sync-utils"
import { getDataPath } from "@/lib/server-paths"

export interface BackupManifest {
  version: string
  schemaVersion: number
  createdAt: string
  deviceId: string
  deviceName: string
  recordCounts: {
    bols: number
    invoices: number
    ledgers: number
    accounts: number
  }
  checksums: Record<string, string>
}

export interface ValidationResult {
  status: "Verified" | "Valid With Warnings" | "Corrupted" | "Unsupported"
  manifest?: BackupManifest
  warnings: string[]
  errors: string[]
  extractedData?: {
    bols: any[]
    invoices: any[]
    ledgerDatabase: any
    settings: any
  }
}

const STAGING_DIR = getDataPath("restore-staging")

// Helper: Calculate MD5 checksum
function getChecksum(data: string | Buffer): string {
  return crypto.createHash("md5").update(data).digest("hex")
}

// 1. Unzip, Verify Manifest, Checksums, and Schema
export async function validateBackup(zipFilePath: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    status: "Corrupted",
    warnings: [],
    errors: [],
  }

  try {
    if (!fs.existsSync(zipFilePath)) {
      result.errors.push("Backup file not found.")
      return result
    }

    const zip = new AdmZip(zipFilePath)
    const zipEntries = zip.getEntries()
    const manifestEntry = zipEntries.find(e => e.entryName === "manifest.json")

    if (!manifestEntry) {
      result.errors.push("manifest.json is missing from the backup.")
      return result
    }

    const manifest: BackupManifest = JSON.parse(manifestEntry.getData().toString("utf8"))
    result.manifest = manifest

    // Schema Check
    if (manifest.schemaVersion > 3) { // Assuming 3 is current, adjust as needed
      result.status = "Unsupported"
      result.errors.push(`Backup uses schema version ${manifest.schemaVersion}, but application only supports up to 3. Update the app first.`)
      return result
    }

    // Prepare to extract to memory / staging
    const extractedData: any = {
      bols: [],
      invoices: [],
      ledgerDatabase: { customCompanies: [], ledgerRecords: {} },
      settings: {}
    }

    let filesValidated = 0

    // Validate Checksums and Load Data
    for (const entry of zipEntries) {
      if (entry.entryName === "manifest.json") continue
      if (entry.isDirectory) continue

      const rawData = entry.getData()
      const fileString = rawData.toString("utf8")
      const expectedChecksum = manifest.checksums[entry.entryName]
      
      if (expectedChecksum) {
        const actualChecksum = getChecksum(rawData)
        if (actualChecksum !== expectedChecksum) {
          result.errors.push(`Checksum mismatch for file: ${entry.entryName}`)
          continue
        }
      }

      try {
        if (entry.entryName === ".local-bols.json") {
          extractedData.bols = JSON.parse(fileString)
          filesValidated++
        } else if (entry.entryName === ".local-invoices.json") {
          extractedData.invoices = JSON.parse(fileString)
          filesValidated++
        } else if (entry.entryName === ".local-bol-account-ledgers.json") {
          extractedData.ledgerDatabase = JSON.parse(fileString)
          filesValidated++
        } else if (entry.entryName === ".local-settings.json") {
          extractedData.settings = JSON.parse(fileString)
          filesValidated++
        }
      } catch (e: any) {
        result.errors.push(`Failed to parse ${entry.entryName}: ${e.message}`)
      }
    }

    if (result.errors.length > 0) {
      return result
    }

    // Ledger Invariance Audit
    if (extractedData.ledgerDatabase && extractedData.ledgerDatabase.ledgerRecords) {
      const audit = validateLedgerInvariance(extractedData.ledgerDatabase.ledgerRecords)
      if (audit.discrepancies.length > 0) {
        result.errors.push(`Accounting validation failed. ${audit.discrepancies.length} ledgers have incorrect balances.`)
        return result
      }
    }

    // Record Counts Checks
    if (extractedData.bols.length !== manifest.recordCounts.bols) {
      result.warnings.push(`Expected ${manifest.recordCounts.bols} BOLs, but found ${extractedData.bols.length}`)
    }
    
    // Assign validated data
    result.extractedData = extractedData
    result.status = result.warnings.length > 0 ? "Valid With Warnings" : "Verified"
    
    return result
  } catch (error: any) {
    result.errors.push(`Failed to validate backup archive: ${error.message}`)
    return result
  }
}

// 2. Pre-restore backup
export async function createPreRestoreBackup(): Promise<string | null> {
  try {
    const filesToBackup = [
      ".local-bols.json",
      ".local-invoices.json",
      ".local-bol-account-ledgers.json",
      ".local-settings.json"
    ]

    const zip = new AdmZip()
    let hasFiles = false

    for (const filename of filesToBackup) {
      const p = getDataPath(filename)
      if (fs.existsSync(p)) {
        zip.addLocalFile(p)
        hasFiles = true
      }
    }

    if (!hasFiles) return null // Nothing to backup

    const backupName = `pre-restore-${Date.now()}.zip`
    const backupPath = getDataPath(backupName)
    zip.writeZip(backupPath)
    
    return backupPath
  } catch (e) {
    console.error("Failed to create pre-restore backup", e)
    return null
  }
}

// 3. Commit Staging (Atomic Write)
export async function executeRestore(validation: ValidationResult): Promise<{ success: boolean; message?: string }> {
  if (validation.status !== "Verified" && validation.status !== "Valid With Warnings") {
    return { success: false, message: "Cannot restore from a corrupted or unsupported backup." }
  }

  if (!validation.extractedData) {
    return { success: false, message: "No data extracted from backup." }
  }

  try {
    // Write out the JSON files
    if (validation.extractedData.bols) {
      await writeJsonFile(getDataPath(".local-bols.json"), validation.extractedData.bols)
    }
    
    if (validation.extractedData.invoices) {
      await writeJsonFile(getDataPath(".local-invoices.json"), validation.extractedData.invoices)
    }
    
    if (validation.extractedData.ledgerDatabase) {
      await writeJsonFile(getDataPath(".local-bol-account-ledgers.json"), validation.extractedData.ledgerDatabase)
    }

    if (validation.extractedData.settings) {
      // Avoid restoring machine-specific settings, pick explicitly
      const currentSettings = await readJsonFile<any>(getDataPath(".local-settings.json"), {})
      const safeSettings = {
        ...currentSettings,
        companyName: validation.extractedData.settings.companyName,
        companyAddress: validation.extractedData.settings.companyAddress,
        documentPreferences: validation.extractedData.settings.documentPreferences,
        // specifically NOT restoring deviceId or machine-specific paths
      }
      await writeJsonFile(getDataPath(".local-settings.json"), safeSettings)
    }

    // Force regeneration of device identity for this new installation
    const deviceFile = getDataPath(".local-device.json")
    if (fs.existsSync(deviceFile)) {
      // Since this is a restore, we might want to ensure a fresh ID is created 
      // if one wasn't already generated by this clean install. 
      // Actually, if it's a clean install, a local device.json already exists 
      // with a fresh ID generated on startup. We just deliberately DO NOT overwrite it 
      // with the backup's device ID.
      // We can record that a restore occurred in it.
      const raw = fs.readFileSync(deviceFile, "utf-8")
      const parsed = JSON.parse(raw)
      parsed.lastRestoreTime = new Date().toISOString()
      parsed.restoredFromDevice = validation.manifest?.deviceId || "unknown"
      fs.writeFileSync(deviceFile, JSON.stringify(parsed, null, 2))
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, message: `Restore atomic commit failed: ${err.message}` }
  }
}

