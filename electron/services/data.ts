import { copyFile, mkdir, readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { atomicWriteFile } from "./atomic-file"

const DATA_FILE_PATTERN = /^(?:\.local-[a-z0-9-]+\.json|\.(?:bol|invoice)-counter)$/i

export async function initializeDataDirectory(dataDirectory: string, seedDirectory: string): Promise<void> {
  await mkdir(dataDirectory, { recursive: true })
  const seeds = await readdir(seedDirectory).catch(() => [])
  await Promise.all(
    seeds.filter((name) => DATA_FILE_PATTERN.test(name)).map(async (name) => {
      const src = path.join(seedDirectory, name)
      const destination = path.join(dataDirectory, name)
      try {
        const destStat = await stat(destination)
        // If destination is an empty placeholder (< 50 bytes) but seed is populated (> 500 bytes), copy seed
        if (destStat.size < 50) {
          const srcStat = await stat(src).catch(() => null)
          if (srcStat && srcStat.size > 500) {
            await copyFile(src, destination)
          }
        }
      } catch {
        await copyFile(src, destination)
      }
    }),
  )

  // Synchronize SQLite database app.db if missing or unpopulated
  const destDb = path.join(dataDirectory, "app.db")
  const candidateSeeds = [
    path.join(seedDirectory, "data", "app.db"),
    path.join(seedDirectory, "app.db"),
    path.join(process.resourcesPath || "", "seed-data", "data", "app.db"),
    path.join(process.resourcesPath || "", "seed-data", "app.db"),
    path.join(process.resourcesPath || "", "data", "app.db"),
  ]

  for (const src of candidateSeeds) {
    try {
      const srcStat = await stat(src)
      if (srcStat.size > 100_000) {
        let needCopy = false
        try {
          const destStat = await stat(destDb)
          // If destination is empty skeleton (< 2MB) while source is populated (> 2MB)
          if (destStat.size < 2_000_000 && srcStat.size > 2_000_000) {
            needCopy = true
          }
        } catch {
          needCopy = true
        }
        if (needCopy) {
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
  return JSON.stringify({
    format: "sky-ariana-desktop-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    files,
  }, null, 2)
}

export async function restoreDataBackup(dataDirectory: string, payload: string): Promise<number> {
  const parsed = JSON.parse(payload) as { format?: string; files?: Record<string, unknown> }
  if (parsed.format !== "sky-ariana-desktop-backup" || !parsed.files || typeof parsed.files !== "object") {
    throw new Error("This is not a valid Sky Ariana desktop backup")
  }
  const entries = Object.entries(parsed.files).filter(([name]) => DATA_FILE_PATTERN.test(name))
  if (entries.length === 0) throw new Error("The backup contains no supported data files")
  for (const [name, value] of entries) {
    const serialized = name.endsWith(".json") ? JSON.stringify(value, null, 2) : String(value)
    await atomicWriteFile(path.join(dataDirectory, name), serialized)
  }
  return entries.length
}
