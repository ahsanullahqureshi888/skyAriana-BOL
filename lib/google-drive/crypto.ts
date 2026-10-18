import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import { getDataPath } from "@/lib/server-paths"

const VAULT_KEY_FILE = getDataPath(".local-gdrive-vault.key")
const ALGORITHM = "aes-256-gcm"

/**
 * Calculates a standard SHA-256 hex checksum.
 */
export function computeSha256(data: Buffer | string): string {
  const hash = crypto.createHash("sha256")
  hash.update(data)
  return hash.digest("hex")
}

/**
 * Derives a 32-byte AES-256 key from a passphrase or raw key string using SHA-256.
 */
export function deriveKey(rawKeyOrPassphrase: string): Buffer {
  return crypto.createHash("sha256").update(rawKeyOrPassphrase, "utf8").digest()
}

/**
 * Retrieves the local machine's persistent encryption key or creates one.
 * Stored only on the local machine and never committed or uploaded to Google Drive.
 */
export async function getOrCreateVaultKey(): Promise<string> {
  try {
    const raw = await fs.readFile(VAULT_KEY_FILE, "utf8")
    const trimmed = raw.trim()
    if (trimmed.length >= 32) {
      return trimmed
    }
  } catch {
    // Key file does not exist yet
  }

  const generated = crypto.randomBytes(32).toString("hex")
  await fs.mkdir(path.dirname(VAULT_KEY_FILE), { recursive: true })
  await fs.writeFile(VAULT_KEY_FILE, generated, { mode: 0o600 })
  return generated
}

export interface EncryptedPackage {
  format: "sky-ariana-vault-v1"
  iv: string
  authTag: string
  salt: string
  ciphertextBase64: string
}

/**
 * Encrypts a binary payload with AES-256-GCM.
 */
export function encryptPayload(data: Buffer, keyString: string): EncryptedPackage {
  const iv = crypto.randomBytes(12)
  const salt = crypto.randomBytes(16)
  const key = crypto.pbkdf2Sync(keyString, salt, 100_000, 32, "sha256")

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    format: "sky-ariana-vault-v1",
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    salt: salt.toString("hex"),
    ciphertextBase64: encrypted.toString("base64"),
  }
}

/**
 * Decrypts an AES-256-GCM encrypted package.
 */
export function decryptPayload(pkg: EncryptedPackage, keyString: string): Buffer {
  if (pkg.format !== "sky-ariana-vault-v1") {
    throw new Error("Unsupported encryption format or package version")
  }

  const iv = Buffer.from(pkg.iv, "hex")
  const authTag = Buffer.from(pkg.authTag, "hex")
  const salt = Buffer.from(pkg.salt, "hex")
  const key = crypto.pbkdf2Sync(keyString, salt, 100_000, 32, "sha256")

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const ciphertext = Buffer.from(pkg.ciphertextBase64, "base64")
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}
