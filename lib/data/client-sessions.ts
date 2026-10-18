import fs from "fs"
import path from "path"
import { randomUUID } from "crypto"
import type { ClientPortalRole } from "@/lib/types/client-portal"

export interface ClientSession {
  token: string
  userId: string
  companyId: string
  companyName: string
  username: string
  role: ClientPortalRole | string
  expiresAt: string
}

const DATA_DIR = path.join(process.cwd(), "data")
const SESSIONS_FILE = path.join(DATA_DIR, ".local-client-sessions.json")

function getSessions(): ClientSession[] {
  if (!fs.existsSync(SESSIONS_FILE)) return []
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"))
  } catch {
    return []
  }
}

function saveSessions(sessions: ClientSession[]) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmpFile = `${SESSIONS_FILE}.tmp-${Date.now()}`
  fs.writeFileSync(tmpFile, JSON.stringify(sessions, null, 2))
  fs.renameSync(tmpFile, SESSIONS_FILE)
}

function cleanupSessions(sessions: ClientSession[]) {
  const now = new Date()
  return sessions.filter(s => new Date(s.expiresAt) > now)
}

export function createSession(
  userId: string,
  companyId: string,
  role: string,
  companyName: string = "",
  username: string = ""
): ClientSession {
  let sessions = getSessions()
  sessions = cleanupSessions(sessions)

  const token = randomUUID() + "-" + randomUUID()

  const newSession: ClientSession = {
    token,
    userId,
    companyId,
    companyName: companyName || companyId,
    username: username || userId,
    role,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }

  sessions.push(newSession)
  saveSessions(sessions)
  return newSession
}

export function getSession(token: string): ClientSession | undefined {
  const sessions = getSessions()
  const session = sessions.find(s => s.token === token)
  if (!session) return undefined
  if (new Date(session.expiresAt) < new Date()) {
    saveSessions(sessions.filter(s => s.token !== token))
    return undefined
  }
  return session
}

export function deleteSession(token: string) {
  const sessions = getSessions()
  const filtered = sessions.filter(s => s.token !== token)
  if (filtered.length !== sessions.length) {
    saveSessions(filtered)
  }
}
