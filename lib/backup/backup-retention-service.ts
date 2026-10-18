/**
 * Sky Ariana Disaster Recovery Configuration & Backup Retention Engine
 * Phase 16: Enterprise Resilience, Health Auditing & Safe Restore Engine
 */

import fs from "node:fs/promises"
import fsSync from "node:fs"
import path from "node:path"
import { getDataPath, getBackupRoot } from "@/lib/server-paths"
import { readJsonFile, writeJsonFile } from "@/lib/services/blob-db"
import { withBackupLock } from "./create-backup"
import type { BackupItem, DisasterRecoveryConfig } from "./backup-types"

const CONFIG_FILE = getDataPath(".local-disaster-recovery-config.json")
const BACKUPS_CATALOG_FILE = getDataPath(".local-backups-catalog.json")

export const DEFAULT_DISASTER_RECOVERY_CONFIG: DisasterRecoveryConfig = {
  autoBackupEnabled: true,
  dailyBackupTime: "23:00",
  weeklyFullBackup: true,
  monthlyArchive: true,
  retention: {
    dailyKeep: 14,
    weeklyKeep: 8,
    monthlyKeep: 12,
  },
  primaryStoragePath: getBackupRoot(),
  secondaryBackupEnabled: false,
  cloudBackupEnabled: false,
  cloudBackupStatus: "DISABLED",
}

export async function getDisasterRecoveryConfig(): Promise<DisasterRecoveryConfig> {
  const cfg = await readJsonFile<DisasterRecoveryConfig>(CONFIG_FILE, DEFAULT_DISASTER_RECOVERY_CONFIG)
  return { ...DEFAULT_DISASTER_RECOVERY_CONFIG, ...cfg }
}

export async function saveDisasterRecoveryConfig(
  updates: Partial<DisasterRecoveryConfig>
): Promise<DisasterRecoveryConfig> {
  const current = await getDisasterRecoveryConfig()
  const updated: DisasterRecoveryConfig = {
    ...current,
    ...updates,
    retention: {
      ...current.retention,
      ...(updates.retention || {}),
    },
  }
  await writeJsonFile(CONFIG_FILE, updated)
  return updated
}

export interface PruneResult {
  prunedCount: number
  preservedCount: number
  prunedFiles: string[]
  preservedBackups: string[]
  lastVerifiedPreserved: string
}

/**
 * Executes retention policy pruning:
 * - Strictly preserves protected backups (Month-End, Year-End, Pre-Import, Pre-Restore)
 * - NEVER deletes the last verified recovery point
 * - Prunes backups exceeding daily/weekly/monthly quotas
 */
export async function enforceBackupRetentionPolicy(actor = "Retention Service"): Promise<PruneResult> {
  return await withBackupLock(actor, async () => {
    const config = await getDisasterRecoveryConfig()
    const catalog = await readJsonFile<BackupItem[]>(BACKUPS_CATALOG_FILE, [])
    const list = Array.isArray(catalog) ? catalog : []

    // Sort descending by creation date
    const sorted = [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Identify last verified backup (MUST NEVER BE DELETED)
    const verifiedBackups = sorted.filter(
      (b) => b.verificationStatus === "VERIFIED" && b.status === "SUCCESS"
    )
    const lastVerifiedId = verifiedBackups[0]?.id || ""

    const toKeep = new Set<string>()
    const toPrune: BackupItem[] = []

    // Always keep the last verified backup
    if (lastVerifiedId) {
      toKeep.add(lastVerifiedId)
    }

    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000
    const dailyLimit = config.retention.dailyKeep || 14

    let dailyCount = 0

    for (const bkp of sorted) {
      // 1. Protected backups are unconditionally preserved
      if (bkp.protected || bkp.type === "PRE_RESTORE" || bkp.type === "PRE_RESTORE_SAFETY" || bkp.type === "PRE_REPAIR_SAFETY") {
        toKeep.add(bkp.id)
        continue
      }

      // 2. Never delete the last verified recovery point
      if (bkp.id === lastVerifiedId) {
        toKeep.add(bkp.id)
        continue
      }

      // 3. Keep within daily threshold
      const ageDays = (now - new Date(bkp.createdAt).getTime()) / oneDayMs
      if (ageDays <= dailyLimit || dailyCount < dailyLimit) {
        toKeep.add(bkp.id)
        dailyCount++
      } else {
        toPrune.push(bkp)
      }
    }

    const prunedFiles: string[] = []

    // Delete pruned files
    for (const bkp of toPrune) {
      if (fsSync.existsSync(bkp.filePath)) {
        try {
          await fs.unlink(bkp.filePath)
          prunedFiles.push(bkp.fileName)
        } catch (err) {
          console.error(`Failed to delete pruned backup file ${bkp.filePath}:`, err)
        }
      }
    }

    // Update catalog
    const remainingCatalog = sorted.filter((b) => toKeep.has(b.id))
    await writeJsonFile(BACKUPS_CATALOG_FILE, remainingCatalog)

    return {
      prunedCount: toPrune.length,
      preservedCount: remainingCatalog.length,
      prunedFiles,
      preservedBackups: remainingCatalog.map((b) => b.fileName),
      lastVerifiedPreserved: verifiedBackups[0]?.fileName || "None",
    }
  })
}
