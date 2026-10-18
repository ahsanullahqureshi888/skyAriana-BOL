/**
 * Sky Ariana BOL — Authenticated Payload Cryptography
 * Implements AES-256-GCM authenticated encryption for sensitive business & financial data.
 */

import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const SALT_LENGTH = 16
const KEY_LENGTH = 32
const ITERATIONS = 100000

// Default internal system key material (fallback when no custom passphrase provided)
const SYSTEM_ENTROPY = "SKY-ARIANA-LOGISTICS-SECURE-SYNC-VAULT-2026"

interface EncryptedEnvelope {
  alg: "aes-256-gcm"
  v: 1
  salt: string
  iv: string
  tag: string
  ciphertext: string
}

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(passphrase, salt, ITERATIONS, KEY_LENGTH, "sha256")
}

/**
 * Encrypt any JSON-serializable object using AES-256-GCM.
 */
export function encryptPayload(data: any, customPassphrase?: string): string {
  const plaintext = JSON.stringify(data)
  const passphrase = customPassphrase?.trim() || SYSTEM_ENTROPY
  const salt = crypto.randomBytes(SALT_LENGTH)
  const key = deriveKey(passphrase, salt)
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let ciphertext = cipher.update(plaintext, "utf8", "base64")
  ciphertext += cipher.final("base64")
  const tag = cipher.getAuthTag()

  const envelope: EncryptedEnvelope = {
    alg: "aes-256-gcm",
    v: 1,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext,
  }

  return JSON.stringify(envelope)
}

/**
 * Decrypt an AES-256-GCM envelope and return the original parsed data.
 */
export function decryptPayload(envelopeString: string, customPassphrase?: string): any {
  let envelope: EncryptedEnvelope
  try {
    envelope = JSON.parse(envelopeString)
  } catch {
    throw new Error("Invalid encrypted envelope format")
  }

  if (envelope.alg !== "aes-256-gcm" || !envelope.ciphertext || !envelope.iv || !envelope.tag || !envelope.salt) {
    throw new Error("Incompatible or corrupted encrypted payload")
  }

  const passphrase = customPassphrase?.trim() || SYSTEM_ENTROPY
  const salt = Buffer.from(envelope.salt, "base64")
  const iv = Buffer.from(envelope.iv, "base64")
  const tag = Buffer.from(envelope.tag, "base64")
  const key = deriveKey(passphrase, salt)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(envelope.ciphertext, "base64", "utf8")
  decrypted += decipher.final("utf8")

  return JSON.parse(decrypted)
}

/**
 * Checks whether a given string is an authenticated encrypted envelope.
 */
export function isEncryptedEnvelope(value: any): boolean {
  if (typeof value !== "string") return false
  try {
    const parsed = JSON.parse(value)
    return parsed && parsed.alg === "aes-256-gcm" && typeof parsed.ciphertext === "string"
  } catch {
    return false
  }
}
