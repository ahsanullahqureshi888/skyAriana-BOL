import { Redis } from '@upstash/redis'

let redis: Redis | null = null

// In-memory fallback for local development or offline execution
const memoryStore = new Map<string, { value: any; expiresAt: number }>()

function isRedisConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

function getRedis(): Redis | null {
  if (!isRedisConfigured()) {
    return null
  }
  if (!redis) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    })
  }
  return redis
}

// Cache management functions
export async function cacheDocument(docId: string, data: any, expirationSeconds = 86400) {
  const client = getRedis()
  if (client) {
    try {
      await client.set(`bol:${docId}`, JSON.stringify(data), { ex: expirationSeconds })
      return
    } catch (error) {
      console.warn(`[redis] Remote cache write failed for ${docId}, falling back to memory:`, error)
    }
  }

  // Memory fallback
  memoryStore.set(`bol:${docId}`, {
    value: data,
    expiresAt: Date.now() + expirationSeconds * 1000,
  })
}

export async function getCachedDocument(docId: string) {
  const client = getRedis()
  if (client) {
    try {
      const cached = await client.get(`bol:${docId}`)
      if (cached) {
        return typeof cached === "string" ? JSON.parse(cached) : cached
      }
    } catch (error) {
      console.warn(`[redis] Remote cache read failed for ${docId}, falling back to memory:`, error)
    }
  }

  // Memory fallback
  const entry = memoryStore.get(`bol:${docId}`)
  if (entry) {
    if (entry.expiresAt > Date.now()) {
      return entry.value
    }
    memoryStore.delete(`bol:${docId}`)
  }
  return null
}

export async function invalidateDocumentCache(docId: string) {
  const client = getRedis()
  if (client) {
    try {
      await client.del(`bol:${docId}`)
    } catch (error) {
      console.warn(`[redis] Remote cache delete failed for ${docId}:`, error)
    }
  }
  memoryStore.delete(`bol:${docId}`)
}

// Session management
export async function setSession(sessionId: string, userData: any, expirationSeconds = 3600) {
  const client = getRedis()
  if (client) {
    try {
      await client.set(`session:${sessionId}`, JSON.stringify(userData), { ex: expirationSeconds })
      return
    } catch (error) {
      console.warn(`[redis] Remote session write failed, falling back to memory:`, error)
    }
  }

  memoryStore.set(`session:${sessionId}`, {
    value: userData,
    expiresAt: Date.now() + expirationSeconds * 1000,
  })
}

export async function getSession(sessionId: string) {
  const client = getRedis()
  if (client) {
    try {
      const session = await client.get(`session:${sessionId}`)
      if (session) {
        return typeof session === "string" ? JSON.parse(session) : session
      }
    } catch (error) {
      console.warn(`[redis] Remote session read failed:`, error)
    }
  }

  const entry = memoryStore.get(`session:${sessionId}`)
  if (entry) {
    if (entry.expiresAt > Date.now()) {
      return entry.value
    }
    memoryStore.delete(`session:${sessionId}`)
  }
  return null
}

export async function deleteSession(sessionId: string) {
  const client = getRedis()
  if (client) {
    try {
      await client.del(`session:${sessionId}`)
    } catch (error) {
      console.warn(`[redis] Remote session delete failed:`, error)
    }
  }
  memoryStore.delete(`session:${sessionId}`)
}

// Rate limiting
export async function checkRateLimit(identifier: string, limit: number, windowSeconds: number) {
  const client = getRedis()
  if (client) {
    try {
      const key = `ratelimit:${identifier}`
      const current = await client.incr(key)
      if (current === 1) {
        await client.expire(key, windowSeconds)
      }
      return current <= limit
    } catch (error) {
      console.warn(`[redis] Rate limit error, permitting:`, error)
    }
  }

  const key = `ratelimit:${identifier}`
  const now = Date.now()
  const entry = memoryStore.get(key)
  if (!entry || entry.expiresAt <= now) {
    memoryStore.set(key, { value: 1, expiresAt: now + windowSeconds * 1000 })
    return true
  }
  entry.value += 1
  return entry.value <= limit
}

export { getRedis }
