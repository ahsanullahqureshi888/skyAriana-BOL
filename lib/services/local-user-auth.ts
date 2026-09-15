import type { User } from "@/lib/types"

/** Credential check for the local UI. Server authorization must be enforced separately. */
export function authenticateLocalUser(users: User[], username: string, password: string): User | null {
  const identity = username.trim().toLowerCase()
  if (!identity || !password) return null
  const user = users.find(candidate =>
    candidate.username.toLowerCase() === identity || candidate.email?.toLowerCase() === identity
  )
  if (!user || user.status === "disabled" || !user.password || user.password !== password) return null
  return user
}
