import crypto from "node:crypto"
import { getDataPath } from "../server-paths"
import { readJsonFile, mutateJsonFile } from "../services/blob-db"
import { updateServerConfig } from "./config"

const ADMIN_FILE = getDataPath(".local-server-admin.json")
const SESSIONS_FILE = getDataPath(".local-server-sessions.json")
const PAIRING_FILE = getDataPath(".local-server-pairings.json")

export type ServerUserRole = "admin" | "accounting" | "operations" | "viewer"

export interface ServerAdminAccount {
  username: string
  passwordHash: string
  salt: string
  role: ServerUserRole
  createdAt: string
  lastLoginAt?: string
}

export interface ServerSession {
  token: string
  username: string
  role: ServerUserRole
  deviceId?: string
  deviceName?: string
  createdAt: string
  expiresAt: string
}

export interface PairingCodeRecord {
  code: string
  role: ServerUserRole
  createdAt: string
  expiresAt: string
  used: boolean
  usedByDevice?: string
  usedAt?: string
}

export interface AuthVerificationResult {
  authenticated: boolean
  role?: ServerUserRole
  username?: string
  deviceId?: string
  deviceName?: string
  error?: string
}

/**
 * Hashes a password using PBKDF2 with SHA-512 and a unique salt.
 */
export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString("hex")
  const hash = crypto.pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex")
  return { hash, salt }
}

/**
 * Verifies a plaintext password against a stored PBKDF2-SHA512 hash and salt.
 */
export function verifyPassword(password: string, expectedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt)
  return hash === expectedHash
}

/**
 * Checks whether the server administrator account has been set up.
 */
export async function isServerAdminSetup(): Promise<boolean> {
  try {
    const admin = await readJsonFile<ServerAdminAccount | null>(ADMIN_FILE, null)
    return Boolean(admin && admin.username && admin.passwordHash)
  } catch {
    return false
  }
}

/**
 * Sets up the first server administrator account with secure password hashing.
 * Rejects trivial passwords like 'admin', '123456', etc.
 */
export async function setupServerAdmin(options: {
  username: string
  password: string
}): Promise<{ success: boolean; username: string }> {
  const username = options.username.trim()
  const password = options.password

  if (username.length < 3) {
    throw new Error("Administrator username must be at least 3 characters long.")
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters long.")
  }

  const forbidden = ["admin", "password", "123456", "skyariana", "admin123"]
  if (forbidden.includes(password.toLowerCase()) && username.toLowerCase() === "admin") {
    throw new Error("Please choose a more secure password. Common default passwords like 'admin' are not permitted.")
  }

  const { hash, salt } = hashPassword(password)

  const adminAccount: ServerAdminAccount = {
    username,
    passwordHash: hash,
    salt,
    role: "admin",
    createdAt: new Date().toISOString(),
  }

  await mutateJsonFile<ServerAdminAccount>(ADMIN_FILE, adminAccount, () => adminAccount)
  await updateServerConfig({ adminConfigured: true, initialized: true })

  return { success: true, username }
}

/**
 * Authenticates user credentials and returns an active session token.
 */
export async function authenticateServerLogin(options: {
  username: string
  password: string
  deviceId?: string
  deviceName?: string
}): Promise<{ token: string; role: ServerUserRole; username: string }> {
  const admin = await readJsonFile<ServerAdminAccount | null>(ADMIN_FILE, null)
  if (!admin || !admin.username) {
    throw new Error("Server administrator account has not been created yet.")
  }

  const inputUser = options.username.trim().toLowerCase()
  const storedUser = admin.username.trim().toLowerCase()

  if (inputUser !== storedUser) {
    throw new Error("Invalid username or password.")
  }

  const { hash } = hashPassword(options.password, admin.salt)
  if (hash !== admin.passwordHash) {
    throw new Error("Invalid username or password.")
  }

  // Generate 64-char crypto session token
  const token = crypto.randomBytes(32).toString("hex")
  const session: ServerSession = {
    token,
    username: admin.username,
    role: admin.role,
    deviceId: options.deviceId,
    deviceName: options.deviceName,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  }

  await mutateJsonFile<Record<string, ServerSession>>(SESSIONS_FILE, {}, (current) => ({
    ...(current || {}),
    [token]: session,
  }))

  return { token, role: admin.role, username: admin.username }
}

/**
 * Generates a cryptographically secure random pairing code for client device enrollment.
 * Format: SKY-XXXX-XXXX (e.g. SKY-7N4X-92KD)
 * Expires after 15 minutes and is single-use.
 */
export async function generatePairingCode(
  role: ServerUserRole = "accounting"
): Promise<{ code: string; expiresAt: string; role: ServerUserRole }> {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ" // Exclude confusing chars 0, 1, I, O
  let part1 = ""
  let part2 = ""
  const randomBytes = crypto.randomBytes(8)

  for (let i = 0; i < 4; i++) {
    part1 += chars[randomBytes[i] % chars.length]
    part2 += chars[randomBytes[i + 4] % chars.length]
  }

  const code = `SKY-${part1}-${part2}`
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes

  const record: PairingCodeRecord = {
    code,
    role,
    createdAt: new Date().toISOString(),
    expiresAt,
    used: false,
  }

  await mutateJsonFile<Record<string, PairingCodeRecord>>(PAIRING_FILE, {}, (current) => ({
    ...(current || {}),
    [code]: record,
  }))

  return { code, expiresAt, role }
}

/**
 * Validates and consumes a pairing code to register a client device.
 * Returns a permanent device auth token upon successful enrollment.
 */
export async function claimPairingCode(options: {
  code: string
  deviceName: string
  platform?: string
  clientIp?: string
}): Promise<{ token: string; deviceId: string; role: ServerUserRole; serverName: string }> {
  const cleanCode = options.code.trim().toUpperCase()
  const pairings = await readJsonFile<Record<string, PairingCodeRecord>>(PAIRING_FILE, {})
  const record = pairings[cleanCode]

  if (!record) {
    throw new Error("Invalid pairing code. Please generate a new pairing code on the Sky Ariana Server.")
  }

  if (record.used) {
    throw new Error("This pairing code has already been used.")
  }

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    throw new Error("This pairing code has expired. Please generate a fresh pairing code on the server.")
  }

  // Mark pairing code as used
  await mutateJsonFile<Record<string, PairingCodeRecord>>(PAIRING_FILE, {}, (current) => ({
    ...(current || {}),
    [cleanCode]: {
      ...record,
      used: true,
      usedByDevice: options.deviceName,
      usedAt: new Date().toISOString(),
    },
  }))

  // Generate trusted device token
  const deviceId = `dev_${crypto.randomBytes(12).toString("hex")}`
  const token = `skydev_${crypto.randomBytes(32).toString("hex")}`

  const session: ServerSession = {
    token,
    username: options.deviceName,
    role: record.role,
    deviceId,
    deviceName: options.deviceName,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year trusted device
  }

  await mutateJsonFile<Record<string, ServerSession>>(SESSIONS_FILE, {}, (current) => ({
    ...(current || {}),
    [token]: session,
  }))

  return {
    token,
    deviceId,
    role: record.role,
    serverName: "Sky Ariana Office Server",
  }
}

/**
 * Verifies an incoming authorization token.
 */
export async function verifyServerToken(tokenString?: string | null): Promise<AuthVerificationResult> {
  if (!tokenString) {
    return { authenticated: false, error: "No authorization token provided" }
  }

  const token = tokenString.startsWith("Bearer ") ? tokenString.slice(7).trim() : tokenString.trim()
  if (!token) {
    return { authenticated: false, error: "Empty token" }
  }

  const sessions = await readJsonFile<Record<string, ServerSession>>(SESSIONS_FILE, {})
  const session = sessions[token]

  if (!session) {
    return { authenticated: false, error: "Invalid or revoked token" }
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    return { authenticated: false, error: "Session token has expired" }
  }

  return {
    authenticated: true,
    role: session.role,
    username: session.username,
    deviceId: session.deviceId,
    deviceName: session.deviceName,
  }
}

/**
 * Revokes all active sessions associated with a specific device ID.
 */
export async function revokeDeviceSessions(deviceId: string): Promise<void> {
  if (!deviceId) return
  await mutateJsonFile<Record<string, ServerSession>>(SESSIONS_FILE, {}, (current) => {
    const next = { ...(current || {}) }
    for (const [token, session] of Object.entries(next)) {
      if (session.deviceId === deviceId) {
        delete next[token]
      }
    }
    return next
  })
}
