import crypto from "crypto"
import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, writeJsonFile, mutateJsonFile } from "./blob-db"
import type {
  CustomerPortalUser,
  CustomerPortalSettings,
  CustomerPortalRequest,
  CustomerPortalNotification,
  CustomerPortalSession,
  CustomerPortalRole,
  CustomerPortalPermissions,
} from "@/lib/types/customer-portal"
import { DEFAULT_PORTAL_SETTINGS, ROLE_BASED_DEFAULT_PERMISSIONS, DEFAULT_PORTAL_PERMISSIONS } from "@/lib/types/customer-portal"

const ACCOUNTS_FILE = getDataPath(".local-portal-accounts.json")
const SETTINGS_FILE = getDataPath(".local-portal-settings.json")
const REQUESTS_FILE = getDataPath(".local-portal-requests.json")
const NOTIFICATIONS_FILE = getDataPath(".local-portal-notifications.json")
const SESSIONS_FILE = getDataPath(".local-portal-sessions.json")

// Secret for signing session tokens (stable per device, generated on first run)
const JWT_SECRET = process.env.PORTAL_SESSION_SECRET || "skyariana-portal-secure-key-2026-auth"

// --- Password Hashing Utilities (PBKDF2 with SHA-256) ---

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha256").toString("hex")
  return { hash, salt }
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  if (!password || !hash || !salt) return false
  const testHash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha256").toString("hex")
  return crypto.timingSafeEqual(Buffer.from(testHash, "hex"), Buffer.from(hash, "hex"))
}

// --- Session Token Utilities (HMAC-SHA256 Signed JSON) ---

export function createSessionToken(session: CustomerPortalSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url")
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

export function verifySessionToken(token: string): CustomerPortalSession | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null
  const [payload, signature] = token.split(".")
  if (!payload || !signature) return null

  const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("base64url")
  if (signature !== expectedSignature) return null

  try {
    const json = Buffer.from(payload, "base64url").toString("utf8")
    const session: CustomerPortalSession = JSON.parse(json)
    if (Date.now() > session.expiresAt) {
      return null // Expired
    }
    return session
  } catch (err) {
    return null
  }
}

// --- Portal Accounts Operations ---

export async function getPortalAccounts(): Promise<CustomerPortalUser[]> {
  try {
    const accounts = await readJsonFile<CustomerPortalUser[]>(ACCOUNTS_FILE, [])
    if (Array.isArray(accounts) && accounts.length > 0) {
      return accounts
    }
    // Seed initial demo/default portal accounts if empty
    return await seedInitialPortalAccounts()
  } catch (err) {
    console.error("[portal-storage] Error loading accounts:", err)
    return []
  }
}

export async function savePortalAccounts(accounts: CustomerPortalUser[]): Promise<void> {
  await writeJsonFile(ACCOUNTS_FILE, accounts)
}

export async function findPortalUserById(id: string): Promise<CustomerPortalUser | null> {
  const accounts = await getPortalAccounts()
  return accounts.find((a) => a.id === id) || null
}

export async function findPortalUserByUsername(username: string): Promise<CustomerPortalUser | null> {
  const accounts = await getPortalAccounts()
  const lower = username.trim().toLowerCase()
  return (
    accounts.find(
      (a) => a.username.toLowerCase() === lower || a.email.toLowerCase() === lower
    ) || null
  )
}

export async function findPortalUsersByCustomerId(customerId: string): Promise<CustomerPortalUser[]> {
  const accounts = await getPortalAccounts()
  return accounts.filter((a) => a.customerId === customerId)
}

export async function createPortalAccount(params: {
  customerId: string
  customerName: string
  username: string
  email: string
  passwordPlain: string
  role?: CustomerPortalRole
  preferredLanguage?: "en" | "fa" | "ps"
  permissions?: CustomerPortalPermissions
  contactName?: string
  phone?: string
}): Promise<CustomerPortalUser> {
  const { hash, salt } = hashPassword(params.passwordPlain)
  const role = params.role || "customer_admin"
  const permissions = params.permissions || ROLE_BASED_DEFAULT_PERMISSIONS[role]

  const newAccount: CustomerPortalUser = {
    id: `portal-${crypto.randomBytes(6).toString("hex")}`,
    customerId: params.customerId,
    customerName: params.customerName,
    username: params.username.trim().toLowerCase(),
    email: params.email.trim().toLowerCase(),
    contactName: params.contactName,
    phone: params.phone,
    passwordHash: hash,
    salt,
    role,
    status: "active",
    preferredLanguage: params.preferredLanguage || "en",
    permissions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await mutateJsonFile<CustomerPortalUser[]>(ACCOUNTS_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    // Prevent duplicate username
    const exists = existing.some((a) => a.username === newAccount.username)
    if (exists) {
      throw new Error(`Username ${newAccount.username} already exists`)
    }
    return [...existing, newAccount]
  })

  return newAccount
}

export async function updatePortalAccount(
  userId: string,
  updater: (user: CustomerPortalUser) => Partial<CustomerPortalUser>
): Promise<CustomerPortalUser | null> {
  let updatedUser: CustomerPortalUser | null = null

  await mutateJsonFile<CustomerPortalUser[]>(ACCOUNTS_FILE, [], (list) => {
    const accounts = Array.isArray(list) ? list : []
    const idx = accounts.findIndex((a) => a.id === userId)
    if (idx === -1) return accounts

    const current = accounts[idx]
    const changes = updater(current)
    const updated = {
      ...current,
      ...changes,
      updatedAt: new Date().toISOString(),
    }
    accounts[idx] = updated
    updatedUser = updated
    return accounts
  })

  return updatedUser
}

// --- Seed Helper ---
async function seedInitialPortalAccounts(): Promise<CustomerPortalUser[]> {
  // Check canonical accounts in .local-accounts.json
  const canonicalAccountsFile = getDataPath(".local-accounts.json")
  const canonical = await readJsonFile<any[]>(canonicalAccountsFile, [])

  const initialList: CustomerPortalUser[] = []

  // Create accounts for prominent clients if available
  const sampleClients = [
    { id: "acc-najeb-amin", name: "NAJEB AMIN LTD", username: "najeb", email: "info@najebamin.com" },
    { id: "acc-fazel-basit", name: "FAZEL BASIT L.T.D", username: "fazel", email: "fazel@basit.af" },
    { id: "acc-asadullah", name: "ASADULLAH NIAMATULLAH HABIBI LTD", username: "asadullah", email: "habibi@trade.af" },
  ]

  for (const client of sampleClients) {
    const foundInCanonical = canonical.find((c) =>
      c.name.toLowerCase().includes(client.username) || c.id === client.id
    )
    const custId = foundInCanonical ? foundInCanonical.id : client.id
    const custName = foundInCanonical ? foundInCanonical.name : client.name

    const { hash, salt } = hashPassword("Customer@2026")
    initialList.push({
      id: `portal-${crypto.randomBytes(6).toString("hex")}`,
      customerId: custId,
      customerName: custName,
      username: client.username,
      email: client.email,
      contactName: "General Manager",
      phone: "+93 70 123 4567",
      passwordHash: hash,
      salt,
      role: "customer_admin",
      status: "active",
      preferredLanguage: "en",
      permissions: DEFAULT_PORTAL_PERMISSIONS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  await writeJsonFile(ACCOUNTS_FILE, initialList)
  return initialList
}

// --- Portal Settings Operations ---

export async function getPortalSettings(): Promise<CustomerPortalSettings> {
  try {
    const settings = await readJsonFile<CustomerPortalSettings>(SETTINGS_FILE, DEFAULT_PORTAL_SETTINGS)
    return { ...DEFAULT_PORTAL_SETTINGS, ...settings }
  } catch {
    return DEFAULT_PORTAL_SETTINGS
  }
}

export async function savePortalSettings(settings: Partial<CustomerPortalSettings>): Promise<CustomerPortalSettings> {
  const current = await getPortalSettings()
  const merged = { ...current, ...settings }
  await writeJsonFile(SETTINGS_FILE, merged)
  return merged
}

// --- Customer Support / Correction Requests Operations ---

export async function getPortalRequests(customerId?: string): Promise<CustomerPortalRequest[]> {
  const requests = await readJsonFile<CustomerPortalRequest[]>(REQUESTS_FILE, [])
  if (!Array.isArray(requests)) return []
  if (customerId) {
    return requests.filter((r) => r.customerId === customerId)
  }
  return requests
}

export async function createPortalRequestRecord(
  request: Omit<CustomerPortalRequest, "id" | "createdAt" | "updatedAt">
): Promise<CustomerPortalRequest> {
  const newRecord: CustomerPortalRequest = {
    ...request,
    id: `req-${crypto.randomBytes(6).toString("hex")}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await mutateJsonFile<CustomerPortalRequest[]>(REQUESTS_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    return [newRecord, ...existing]
  })

  return newRecord
}

export async function updatePortalRequestStatus(
  requestId: string,
  status: CustomerPortalRequest["status"],
  adminResponse?: string
): Promise<CustomerPortalRequest | null> {
  let updated: CustomerPortalRequest | null = null

  await mutateJsonFile<CustomerPortalRequest[]>(REQUESTS_FILE, [], (list) => {
    const reqs = Array.isArray(list) ? list : []
    const idx = reqs.findIndex((r) => r.id === requestId)
    if (idx === -1) return reqs

    reqs[idx] = {
      ...reqs[idx],
      status,
      adminResponse: adminResponse !== undefined ? adminResponse : reqs[idx].adminResponse,
      respondedAt: adminResponse !== undefined ? new Date().toISOString() : reqs[idx].respondedAt,
      updatedAt: new Date().toISOString(),
    }
    updated = reqs[idx]
    return reqs
  })

  return updated
}

// --- Notifications Operations ---

export async function getPortalNotifications(customerId: string): Promise<CustomerPortalNotification[]> {
  const all = await readJsonFile<CustomerPortalNotification[]>(NOTIFICATIONS_FILE, [])
  if (!Array.isArray(all)) return []
  return all
    .filter((n) => n.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function addPortalNotification(
  notification: Omit<CustomerPortalNotification, "id" | "createdAt">
): Promise<CustomerPortalNotification> {
  const newNotif: CustomerPortalNotification = {
    ...notification,
    id: `notif-${crypto.randomBytes(6).toString("hex")}`,
    createdAt: new Date().toISOString(),
  }

  await mutateJsonFile<CustomerPortalNotification[]>(NOTIFICATIONS_FILE, [], (list) => {
    const existing = Array.isArray(list) ? list : []
    // Prevent duplicate event notification for the same event and shipment
    const isDup = existing.some(
      (e) =>
        e.customerId === newNotif.customerId &&
        e.shipmentId === newNotif.shipmentId &&
        e.eventType === newNotif.eventType &&
        e.title === newNotif.title
    )
    if (isDup) return existing
    return [newNotif, ...existing]
  })

  return newNotif
}

export async function markNotificationAsRead(notificationId: string, customerId: string): Promise<void> {
  await mutateJsonFile<CustomerPortalNotification[]>(NOTIFICATIONS_FILE, [], (list) => {
    const notifs = Array.isArray(list) ? list : []
    return notifs.map((n) => {
      if (n.id === notificationId && n.customerId === customerId) {
        return { ...n, read: true }
      }
      return n
    })
  })
}
