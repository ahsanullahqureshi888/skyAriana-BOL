import fs from "fs"
import path from "path"
import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from "crypto"
import type { CustomerPortalUser } from "@/lib/types/customer-portal"

const DATA_DIR = path.join(process.cwd(), "data")
const CLIENT_USERS_FILE = path.join(DATA_DIR, ".local-customer-portal-users.json")

export function getClientUsers(): CustomerPortalUser[] {
  if (!fs.existsSync(CLIENT_USERS_FILE)) return []
  try {
    const data = fs.readFileSync(CLIENT_USERS_FILE, "utf-8")
    return JSON.parse(data) as CustomerPortalUser[]
  } catch (err) {
    console.error("Failed to read client users", err)
    return []
  }
}

export function saveClientUsers(users: CustomerPortalUser[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  const tmpFile = `${CLIENT_USERS_FILE}.tmp-${Date.now()}`
  fs.writeFileSync(tmpFile, JSON.stringify(users, null, 2))
  fs.renameSync(tmpFile, CLIENT_USERS_FILE)
}

export function getClientUserById(id: string): CustomerPortalUser | undefined {
  return getClientUsers().find(u => u.id === id)
}

export function getClientUserByUsername(username: string): CustomerPortalUser | undefined {
  const clean = (username || "").trim().toLowerCase()
  return getClientUsers().find(u => u.username.toLowerCase() === clean || (u.email && u.email.toLowerCase() === clean))
}

export function getClientUsersByCompanyId(companyId: string): CustomerPortalUser[] {
  const clean = (companyId || "").trim().toLowerCase()
  return getClientUsers().filter(u => (u.customerId || "").trim().toLowerCase() === clean)
}

export function hashClientPassword(plainPassword: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || randomBytes(16).toString("hex")
  const hash = scryptSync(plainPassword, salt, 64).toString("hex")
  return { hash, salt }
}

export function verifyClientPassword(plainPassword: string, storedHash: string, salt: string = ""): boolean {
  if (!plainPassword || !storedHash) return false
  // Direct match fallback for existing unhashed/mock seeds
  if (!salt) return plainPassword === storedHash
  try {
    const computed = scryptSync(plainPassword, salt, 64).toString("hex")
    const expected = Buffer.from(storedHash, "hex")
    const actual = Buffer.from(computed, "hex")
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

export function createClientUser(data: Omit<CustomerPortalUser, "id" | "createdAt" | "updatedAt">): CustomerPortalUser {
  const users = getClientUsers()
  
  if (users.some(u => u.username.toLowerCase() === data.username.toLowerCase())) {
    throw new Error("Username already exists")
  }

  const salt = data.salt || randomBytes(16).toString("hex")
  const passwordHash = data.passwordHash.length > 32 
    ? data.passwordHash 
    : hashClientPassword(data.passwordHash, salt).hash

  const newUser: CustomerPortalUser = {
    ...data,
    passwordHash,
    salt,
    id: `client-user-${randomUUID()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  users.push(newUser)
  saveClientUsers(users)
  return newUser
}

export function updateClientUser(id: string, updates: Partial<CustomerPortalUser>): CustomerPortalUser | null {
  const users = getClientUsers()
  const index = users.findIndex(u => u.id === id)
  if (index === -1) return null

  // If password is updated, hash it
  if (updates.passwordHash && updates.passwordHash.length < 32) {
    const salt = updates.salt || users[index].salt || randomBytes(16).toString("hex")
    updates.passwordHash = hashClientPassword(updates.passwordHash, salt).hash
    updates.salt = salt
  }

  users[index] = {
    ...users[index],
    ...updates,
    updatedAt: new Date().toISOString()
  }

  saveClientUsers(users)
  return users[index]
}

export function deleteClientUser(id: string): boolean {
  const users = getClientUsers()
  const filtered = users.filter(u => u.id !== id)
  if (filtered.length !== users.length) {
    saveClientUsers(filtered)
    return true
  }
  return false
}
