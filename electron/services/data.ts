import { copyFile, mkdir, readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { atomicWriteFile } from "./atomic-file"

const DATA_FILE_PATTERN = /^(?:\.local-[a-z0-9-]+\.json|\.(?:bol|invoice)-counter)$/i

export async function initializeDataDirectory(dataDirectory: string, seedDirectory: string): Promise<void> {
  await mkdir(dataDirectory, { recursive: true })
  const seeds = await readdir(seedDirectory).catch(() => [])
  await Promise.all(
    seeds.filter((name) => DATA_FILE_PATTERN.test(name)).map(async (name) => {
      const destination = path.join(dataDirectory, name)
      try {
        await stat(destination)
      } catch {
        await copyFile(path.join(seedDirectory, name), destination)
      }
    }),
  )
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
