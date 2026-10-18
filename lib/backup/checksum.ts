import crypto from "node:crypto"

/**
 * Computes a standard SHA-256 hex checksum.
 */
export function computeSha256(data: Buffer | string): string {
  const hash = crypto.createHash("sha256")
  hash.update(data)
  return hash.digest("hex")
}

/**
 * Computes a deterministic checksum for an object or collection by recursively sorting keys.
 */
export function canonicalJsonString(obj: unknown): string {
  if (obj === null || obj === undefined) return "null"
  if (typeof obj !== "object") return JSON.stringify(obj)
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJsonString).join(",") + "]"
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort()
  const entries = keys.map((k) => `${JSON.stringify(k)}:${canonicalJsonString((obj as Record<string, unknown>)[k])}`)
  return "{" + entries.join(",") + "}"
}

/**
 * Computes deterministic hash across all backup dataset entries.
 */
export function computeBackupChecksum(
  entries: Array<{ path: string; data: Buffer | string }>
): string {
  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path))
  const hash = crypto.createHash("sha256")
  for (const entry of sorted) {
    const dataHash = typeof entry.data === "string"
      ? computeSha256(Buffer.from(entry.data, "utf8"))
      : computeSha256(entry.data)
    hash.update(`${entry.path}:${dataHash};`)
  }
  return hash.digest("hex")
}
