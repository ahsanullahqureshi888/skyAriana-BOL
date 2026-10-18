/**
 * Sky Ariana BOL — Deterministic Hashing & Checksum Engine
 * Computes deterministic canonical SHA-256 digests across operational records.
 */

import crypto from "crypto"

/**
 * Deterministically canonicalize an object by recursively sorting its keys
 * and normalizing primitive types so identical data produces identical JSON strings.
 */
export function canonicalizeJson(value: any): string {
  if (value === null || value === undefined) {
    return "null"
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "null"
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }

  if (typeof value === "string") {
    return JSON.stringify(value.trim())
  }

  if (Array.isArray(value)) {
    const elements = value.map((item) => canonicalizeJson(item))
    return `[${elements.join(",")}]`
  }

  if (typeof value === "object") {
    // Filter out undefined and transient fields like internal timestamps or temporary UI flags
    const keys = Object.keys(value)
      .filter((k) => value[k] !== undefined && !k.startsWith("_tmp_"))
      .sort()

    const entries = keys.map((key) => {
      const canonicalVal = canonicalizeJson(value[key])
      return `${JSON.stringify(key)}:${canonicalVal}`
    })

    return `{${entries.join(",")}}`
  }

  return JSON.stringify(String(value))
}

/**
 * Compute a deterministic SHA-256 hexadecimal checksum for any data payload.
 */
export function computeRecordChecksum(data: any): string {
  const canonicalString = canonicalizeJson(data)
  return crypto.createHash("sha256").update(canonicalString, "utf8").digest("hex")
}

/**
 * Safely compare two checksums with constant-time comparison to prevent timing attacks.
 */
export function isChecksumEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"))
  } catch {
    return a.toLowerCase() === b.toLowerCase()
  }
}
