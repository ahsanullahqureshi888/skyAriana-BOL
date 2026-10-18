import path from "node:path"
import fs from "node:fs/promises"
import { existsSync, mkdirSync } from "node:fs"

/**
 * Resolves the primary root directory for Sky Ariana Server data.
 * Priority:
 * 1. Process environment override: DATABASE_PATH, SKY_SERVER_DATA_DIR or SKY_DATA_DIR
 * 2. Windows standard: C:\ProgramData\SkyArianaBOL
 * 3. Fallback: <workspace>/data
 */
export function getServerDataRoot(): string {
  if (process.env.DATABASE_PATH) return path.resolve(process.env.DATABASE_PATH)
  if (process.env.SKY_SERVER_DATA_DIR) return path.resolve(process.env.SKY_SERVER_DATA_DIR)
  if (process.env.SKY_DATA_DIR) return path.resolve(process.env.SKY_DATA_DIR)
  
  if (process.platform === "win32" && process.env.ProgramData) {
    return path.join(process.env.ProgramData, "SkyArianaBOL")
  }
  
  const root = process.cwd()
  if (existsSync(path.join(root, ".local-bols.json"))) {
    return root
  }
  return path.join(root, "data")
}

export interface ServerDirectoryStructure {
  root: string
  database: string
  documents: string
  pdf: {
    root: string
    bol: string
    invoices: string
    packingLists: string
    stickers: string
    ledgers: string
  }
  uploads: string
  backups: string
  logs: string
  config: string
}

/**
 * Returns absolute paths to all standard server subdirectories.
 */
export function getServerPaths(): ServerDirectoryStructure {
  const root = getServerDataRoot()
  const pdfRoot = path.join(root, "pdf")

  return {
    root,
    database: path.join(root, "database"),
    documents: path.join(root, "documents"),
    pdf: {
      root: pdfRoot,
      bol: path.join(pdfRoot, "bol"),
      invoices: path.join(pdfRoot, "invoices"),
      packingLists: path.join(pdfRoot, "packing-lists"),
      stickers: path.join(pdfRoot, "stickers"),
      ledgers: path.join(pdfRoot, "ledgers"),
    },
    uploads: process.env.UPLOAD_PATH ? path.resolve(process.env.UPLOAD_PATH) : path.join(root, "uploads"),
    backups: process.env.BACKUP_PATH ? path.resolve(process.env.BACKUP_PATH) : path.join(root, "backups"),
    logs: path.join(root, "logs"),
    config: path.join(root, "config"),
  }
}

/**
 * Synchronously ensures all required server directories exist.
 */
export function ensureServerDirectoriesSync(): ServerDirectoryStructure {
  const paths = getServerPaths()
  const dirs = [
    paths.root,
    paths.database,
    paths.documents,
    paths.pdf.root,
    paths.pdf.bol,
    paths.pdf.invoices,
    paths.pdf.packingLists,
    paths.pdf.stickers,
    paths.pdf.ledgers,
    paths.uploads,
    paths.backups,
    paths.logs,
    paths.config,
  ]

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  return paths
}

/**
 * Asynchronously ensures all required server directories exist.
 */
export async function ensureServerDirectories(): Promise<ServerDirectoryStructure> {
  const paths = getServerPaths()
  const dirs = [
    paths.root,
    paths.database,
    paths.documents,
    paths.pdf.root,
    paths.pdf.bol,
    paths.pdf.invoices,
    paths.pdf.packingLists,
    paths.pdf.stickers,
    paths.pdf.ledgers,
    paths.uploads,
    paths.backups,
    paths.logs,
    paths.config,
  ]

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true })
  }

  return paths
}
