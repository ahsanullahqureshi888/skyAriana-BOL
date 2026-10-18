import path from "path"
import os from "os"
import fs from "fs"

/** 
 * Central configuration layer for all server paths (Phase 3).
 * Respects environment variables for strict file management.
 */

export function getDataRoot(): string {
  if (typeof window !== "undefined") return ""
  if (process.env.DATABASE_PATH) return path.resolve(process.env.DATABASE_PATH)
  
  const root = process.cwd()
  // Backwards compatibility: if data already exists in root, use it.
  if (fs.existsSync && fs.existsSync(path.join(root, ".local-bols.json"))) {
    return root
  }
  if (process.env.SKY_DATA_DIR) return path.resolve(process.env.SKY_DATA_DIR)
  return path.join(root, "data")
}

export function getBackupRoot(): string {
  if (process.env.BACKUP_PATH) return path.resolve(process.env.BACKUP_PATH)
  
  // 1. In serverless environments (Vercel / AWS Lambda), the deployment directory is strictly read-only.
  // Use os.tmpdir()/backups as the writable storage directory.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpBackups = path.join(os.tmpdir(), "backups")
    try { fs.mkdirSync(tmpBackups, { recursive: true }) } catch {}
    return tmpBackups
  }

  // 2. Check primary data/backups location where existing production archives reside
  const appDataBackups = path.join(process.cwd(), "data", "backups")
  if (fs.existsSync && fs.existsSync(appDataBackups)) return appDataBackups

  // 3. Check getDataRoot()/backups
  const dataRootBackups = path.join(getDataRoot(), "backups")
  if (fs.existsSync && fs.existsSync(dataRootBackups)) return dataRootBackups

  // 4. Check workspace root backups
  const cwdBackups = path.join(process.cwd(), "backups")
  if (fs.existsSync && fs.existsSync(cwdBackups)) return cwdBackups

  // Fallback: create appDataBackups if writable, otherwise use os.tmpdir()
  try {
    fs.mkdirSync(appDataBackups, { recursive: true })
    return appDataBackups
  } catch {
    const tmpBackups = path.join(os.tmpdir(), "backups")
    try { fs.mkdirSync(tmpBackups, { recursive: true }) } catch {}
    return tmpBackups
  }
}

export function getDataPath(fileName: string): string {
  const base = path.basename(fileName)
  const root = process.cwd()
  if (fs.existsSync && fs.existsSync(path.join(/*turbopackIgnore: true*/ root, base))) {
    return path.join(/*turbopackIgnore: true*/ root, base)
  }
  const dataDir = getDataRoot()
  return path.join(/*turbopackIgnore: true*/ dataDir, base)
}

export function getUploadPath(...segments: string[]): string {
  const root = process.env.UPLOAD_PATH 
    ? path.resolve(process.env.UPLOAD_PATH)
    : process.env.SKY_DATA_DIR
      ? path.join(path.resolve(process.env.SKY_DATA_DIR), "uploads")
      : path.join(process.cwd(), "public", "uploads")
      
  const names = segments.map((segment) => {
    const name = path.basename(segment)
    if (!name || name === "." || name === ".." || /[\u0000:]/.test(name)) {
      throw new Error("Invalid upload path segment")
    }
    return name
  })
  return path.join(root, ...names)
}

/**
 * Standardized cross-platform directory accessors (Phase 5).
 */
export function getAppDataDir(): string {
  return getDataRoot()
}

export function getDatabasePath(): string {
  if (process.env.SKY_DATA_DIR) {
    const p = path.join(path.resolve(process.env.SKY_DATA_DIR), "app.db")
    if (fs.existsSync(p)) return p
  }
  const root = getDataRoot()
  const candidateApp = path.join(root, "app.db")
  if (fs.existsSync(candidateApp)) return candidateApp
  const candidateData = path.join(root, "data", "app.db")
  if (fs.existsSync(candidateData)) return candidateData
  const candidateAq = path.join(root, "aq_companies.db")
  if (fs.existsSync(candidateAq)) return candidateAq
  const subDataApp = path.join(root, "Data", "app.db")
  if (fs.existsSync(subDataApp)) return subDataApp
  return candidateApp
}

export function getBackupDir(): string {
  return getBackupRoot()
}

export function getRecoveryDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpRecovery = path.join(os.tmpdir(), "recovery")
    try { fs.mkdirSync(tmpRecovery, { recursive: true }) } catch {}
    return tmpRecovery
  }
  const root = getDataRoot()
  const rec = path.join(root, "recovery")
  if (!fs.existsSync(rec)) {
    try {
      fs.mkdirSync(rec, { recursive: true })
    } catch {
      const tmpRecovery = path.join(os.tmpdir(), "recovery")
      try { fs.mkdirSync(tmpRecovery, { recursive: true }) } catch {}
      return tmpRecovery
    }
  }
  return rec
}

export function getLogsDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpLogs = path.join(os.tmpdir(), "logs")
    try { fs.mkdirSync(tmpLogs, { recursive: true }) } catch {}
    return tmpLogs
  }
  const root = getDataRoot()
  const lg = path.join(root, "logs")
  if (!fs.existsSync(lg)) {
    try {
      fs.mkdirSync(lg, { recursive: true })
    } catch {
      const tmpLogs = path.join(os.tmpdir(), "logs")
      try { fs.mkdirSync(tmpLogs, { recursive: true }) } catch {}
      return tmpLogs
    }
  }
  return lg
}

export function getDocumentsDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDoc = path.join(os.tmpdir(), "Documents")
    try { fs.mkdirSync(tmpDoc, { recursive: true }) } catch {}
    return tmpDoc
  }
  const root = getDataRoot()
  const doc = path.join(root, "Documents")
  if (!fs.existsSync(doc)) {
    try {
      fs.mkdirSync(doc, { recursive: true })
    } catch {
      const tmpDoc = path.join(os.tmpdir(), "Documents")
      try { fs.mkdirSync(tmpDoc, { recursive: true }) } catch {}
      return tmpDoc
    }
  }
  return doc
}

export function getExportsDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpExp = path.join(os.tmpdir(), "exports")
    try { fs.mkdirSync(tmpExp, { recursive: true }) } catch {}
    return tmpExp
  }
  const root = getDataRoot()
  const exp = path.join(root, "exports")
  if (!fs.existsSync(exp)) {
    try {
      fs.mkdirSync(exp, { recursive: true })
    } catch {
      const tmpExp = path.join(os.tmpdir(), "exports")
      try { fs.mkdirSync(tmpExp, { recursive: true }) } catch {}
      return tmpExp
    }
  }
  return exp
}

export function getTempDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpTmp = path.join(os.tmpdir(), "temp")
    try { fs.mkdirSync(tmpTmp, { recursive: true }) } catch {}
    return tmpTmp
  }
  const root = getDataRoot()
  const tmp = path.join(root, "temp")
  if (!fs.existsSync(tmp)) {
    try {
      fs.mkdirSync(tmp, { recursive: true })
    } catch {
      const tmpTmp = path.join(os.tmpdir(), "temp")
      try { fs.mkdirSync(tmpTmp, { recursive: true }) } catch {}
      return tmpTmp
    }
  }
  return tmp
}

