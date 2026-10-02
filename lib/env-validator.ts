/**
 * AQ COMPANIES — Production Environment Validation Engine
 * Phase 3: Production Release Hardening (Requirements 18 & 19)
 */

export interface EnvValidationResult {
  valid: boolean
  mode: "desktop" | "lan" | "cloud"
  warnings: string[]
  errors: string[]
}

export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Security check: ensure no private secrets leaked to NEXT_PUBLIC_*
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("NEXT_PUBLIC_")) {
      const lower = key.toLowerCase()
      if (
        lower.includes("secret") ||
        lower.includes("password") ||
        lower.includes("token") ||
        lower.includes("privkey") ||
        lower.includes("credential")
      ) {
        errors.push(`SECURITY VIOLATION: Sensitive environment key exposed via NEXT_PUBLIC prefix: ${key}`)
      }
    }
  }

  // Detect deployment mode
  const lanMode = process.env.LAN_MODE === "true" || process.env.LAN_MODE === "1"
  const isCloud = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL)
  const mode: "desktop" | "lan" | "cloud" = isCloud ? "cloud" : (lanMode ? "lan" : "desktop")

  // Mode-specific requirements
  if (isCloud && !process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    errors.push("Missing required cloud database connection string: DATABASE_URL")
  }

  if (process.env.NODE_ENV === "production") {
    if (!process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
      warnings.push("NEXTAUTH_SECRET is unset in production. Session state will use local persistent auth key.")
    }
  }

  return {
    valid: errors.length === 0,
    mode,
    warnings,
    errors,
  }
}
