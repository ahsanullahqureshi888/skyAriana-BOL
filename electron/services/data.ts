import { copyFile, mkdir, readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { atomicWriteFile } from "./atomic-file"

const DATA_FILE_PATTERN = /^(?:\.local-[a-z0-9-]+\.json|\.(?:bol|invoice)-counter)$/i

export async function initializeDataDirectory(dataDirectory: string, seedDirectory: string): Promise<void> {
  await mkdir(dataDirectory, { recursive: true })

  // Check local project directory if available on host machine
  const localProjectDir = "D:\\SOFTWARES-APPS\\BOL-SOFTWARE-V5"
  const candidateDirs = [seedDirectory]
  try {
    const s = await stat(path.join(localProjectDir, ".local-bols.json"))
    if (s.size > 500) candidateDirs.unshift(localProjectDir)
  } catch {}

  for (const dir of candidateDirs) {
    const seeds = await readdir(dir).catch(() => [])
    await Promise.all(
      seeds.filter((name) => DATA_FILE_PATTERN.test(name)).map(async (name) => {
        const src = path.join(dir, name)
        const destination = path.join(dataDirectory, name)
        try {
          const destStat = await stat(destination)
          const srcStat = await stat(src).catch(() => null)
          if (!srcStat) return

          // If destination is a stub (< 500 bytes) but seed is populated (>= 500 bytes), copy seed
          if (destStat.size < 500 && srcStat.size >= 500) {
            await copyFile(src, destination)
          } else if (srcStat.size > destStat.size && srcStat.mtimeMs > destStat.mtimeMs) {
            // Backup destination before replacing with richer source
            const backupDir = path.join(dataDirectory, "backups", "pre-seed-sync")
            await mkdir(backupDir, { recursive: true })
            await copyFile(destination, path.join(backupDir, `${name}.${Date.now()}.bak`)).catch(() => {})
            await copyFile(src, destination)
          }
        } catch {
          await copyFile(src, destination)
        }
      }),
    )
  }

  // Synchronize SQLite database app.db if missing or unpopulated
  const destDb = path.join(dataDirectory, "app.db")
  const candidateSeeds = [
    path.join(localProjectDir, "data", "app.db"),
    path.join(seedDirectory, "data", "app.db"),
    path.join(seedDirectory, "app.db"),
    path.join(process.resourcesPath || "", "seed-data", "data", "app.db"),
    path.join(process.resourcesPath || "", "seed-data", "app.db"),
    path.join(process.resourcesPath || "", "backend", "data", "app.db"),
    path.join(process.resourcesPath || "", "data", "app.db"),
  ]

  for (const src of candidateSeeds) {
    try {
      const srcStat = await stat(src)
      if (srcStat.size > 100_000) {
        let needCopy = false
        try {
          const destStat = await stat(destDb)
          if (destStat.size < 2_000_000 && srcStat.size > 2_000_000) {
            needCopy = true
          } else if (srcStat.size > destStat.size && srcStat.mtimeMs > destStat.mtimeMs) {
            needCopy = true
          }
        } catch {
          needCopy = true
        }
        if (needCopy) {
          if (await stat(destDb).catch(() => null)) {
            const backupDb = path.join(dataDirectory, `app.db.bak.${Date.now()}`)
            await copyFile(destDb, backupDb).catch(() => {})
          }
          await copyFile(src, destDb)
          break
        }
      }
    } catch {}
  }
}

export async function createDataBackup(dataDirectory: string): Promise<string> {
  const names = (await readdir(dataDirectory)).filter((name) => DATA_FILE_PATTERN.test(name))
  const files: Record<string, unknown> = {}
  for (const name of names) {
    const raw = await readFile(path.join(dataDirectory, name), "utf8")
    files[name] = name.endsWith(".json") ? JSON.parse(raw) : raw.trim()
  }

  // Calculate quick record counts
  const bols = Array.isArray(files[".local-bols.json"]) ? (files[".local-bols.json"] as any[]).length : 0
  const shipments = Array.isArray(files[".local-shipments.json"]) ? (files[".local-shipments.json"] as any[]).length : 0
  const accounts = Array.isArray(files[".local-accounts.json"]) ? (files[".local-accounts.json"] as any[]).length : 0
  const invoices = Array.isArray(files[".local-invoices.json"]) ? (files[".local-invoices.json"] as any[]).length : 0

  return JSON.stringify({
    backupMetadata: {
      application: "AQ COMPANIES",
      backupFormatVersion: "2.0",
      applicationVersion: "5.2.0",
      createdAt: new Date().toISOString(),
      backupId: `AQ-DESKTOP-${Date.now()}`,
      backupType: "full",
      schemaVersion: "2.0",
      recordCounts: { bols, shipments, accounts, invoices, totalRecords: bols + shipments + accounts + invoices },
    },
    format: "sky-ariana-desktop-backup",
    version: 2,
    createdAt: new Date().toISOString(),
    files,
    data: files,
  }, null, 2)
}

export async function restoreDataBackup(dataDirectory: string, payload: string): Promise<number> {
  const parsed = JSON.parse(payload) as {
    format?: string
    backupMetadata?: any
    files?: Record<string, unknown>
    data?: Record<string, unknown>
  }

  const fileMap = parsed.files || parsed.data
  if (!fileMap || typeof fileMap !== "object") {
    throw new Error("This is not a valid AQ Companies desktop backup")
  }

  // Pre-restore safety snapshot in dataDirectory/backups/pre-restore
  const preRestoreDir = path.join(dataDirectory, "backups", "pre-restore")
  await mkdir(preRestoreDir, { recursive: true })
  const snapshotTimestamp = Date.now()

  const existingFiles = (await readdir(dataDirectory)).filter((name) => DATA_FILE_PATTERN.test(name))
  for (const name of existingFiles) {
    await copyFile(path.join(dataDirectory, name), path.join(preRestoreDir, `${name}.${snapshotTimestamp}.bak`)).catch(() => {})
  }

  const entries = Object.entries(fileMap).filter(([name]) => DATA_FILE_PATTERN.test(name))
  if (entries.length === 0) throw new Error("The backup contains no supported data files")

  for (const [name, value] of entries) {
    const serialized = name.endsWith(".json") ? JSON.stringify(value, null, 2) : String(value)
    await atomicWriteFile(path.join(dataDirectory, name), serialized)
  }
  return entries.length
}

