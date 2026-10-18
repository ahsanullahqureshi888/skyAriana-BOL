import crypto from "node:crypto"
import {
  clearCachedFolders,
  clearStoredTokens,
  readStoredTokens,
  saveStoredTokens,
  updateDriveSettings,
} from "./storage-settings"
import type { GoogleDriveTokens, GoogleUserProfile } from "./types"

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

export const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ")

export interface OAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

// In-memory / ephemeral CSRF state cache (stores state -> creation time)
const activeOAuthStates = new Map<string, number>()

/**
 * Generates a cryptographically random OAuth state token for CSRF protection.
 * States expire after 15 minutes.
 */
export function generateOAuthState(): string {
  // Prune expired states (> 15m)
  const now = Date.now()
  for (const [state, timestamp] of activeOAuthStates.entries()) {
    if (now - timestamp > 15 * 60 * 1000) {
      activeOAuthStates.delete(state)
    }
  }

  const state = crypto.randomBytes(24).toString("hex")
  activeOAuthStates.set(state, now)
  return state
}

/**
 * Validates an incoming OAuth state parameter against registered active states.
 */
export function validateOAuthState(state: string | null | undefined): boolean {
  if (!state || typeof state !== "string") return false
  const timestamp = activeOAuthStates.get(state)
  if (!timestamp) return false
  const isValid = Date.now() - timestamp <= 15 * 60 * 1000
  activeOAuthStates.delete(state) // One-time use
  return isValid
}

/**
 * Resolves current OAuth credentials from environment variables.
 */
export function getOAuthConfig(customRedirectUri?: string): OAuthConfig {
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    ""
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ""
  const redirectUri =
    customRedirectUri ||
    process.env.GOOGLE_REDIRECT_URI ||
    "http://127.0.0.1:3001/api/google-drive/auth/callback"

  return { clientId, clientSecret, redirectUri }
}

/**
 * Checks whether Google OAuth is configured with valid Client ID & Secret.
 */
export function isGoogleOAuthConfigured(): { configured: boolean; missing: string[] } {
  const { clientId, clientSecret } = getOAuthConfig()
  const missing: string[] = []
  if (!clientId) missing.push("GOOGLE_CLIENT_ID")
  if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET")
  return {
    configured: missing.length === 0,
    missing,
  }
}

/**
 * Builds the Google OAuth consent URL with account chooser and offline access.
 */
export function buildAuthorizationUrl(redirectUri?: string, state?: string): string {
  const { clientId, redirectUri: resolvedRedirect } = getOAuthConfig(redirectUri)
  if (!clientId) {
    throw new Error(
      "GOOGLE_CLIENT_ID is not configured. Please set GOOGLE_CLIENT_ID in your environment or Settings."
    )
  }

  const resolvedState = state || generateOAuthState()

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: resolvedRedirect,
    response_type: "code",
    scope: DRIVE_SCOPES,
    access_type: "offline",
    prompt: "select_account consent", // Forces Google account chooser & consent
    include_granted_scopes: "true",
    state: resolvedState,
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/**
 * Exchanges authorization code for access and refresh tokens.
 * Also retrieves authenticated user profile (email, name, picture).
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri?: string
): Promise<GoogleDriveTokens> {
  const { clientId, clientSecret, redirectUri: resolvedRedirect } = getOAuthConfig(redirectUri)
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing.")
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: resolvedRedirect,
      grant_type: "authorization_code",
    }),
  })

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}))
    throw new Error(
      errJson.error_description || errJson.error || `OAuth token exchange failed (${response.status})`
    )
  }

  const json = await response.json()
  const expiryDate = Date.now() + (json.expires_in || 3600) * 1000

  // Fetch connected account user profile
  let userProfile: GoogleUserProfile = {}
  try {
    const userinfoRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${json.access_token}` },
    })
    if (userinfoRes.ok) {
      const userInfo = await userinfoRes.json()
      userProfile = {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      }
    }
  } catch {}

  const tokens: GoogleDriveTokens = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiryDate,
    tokenType: json.token_type || "Bearer",
    scope: json.scope || DRIVE_SCOPES,
    email: userProfile.email,
    name: userProfile.name,
    picture: userProfile.picture,
    updatedAt: new Date().toISOString(),
  }

  await saveStoredTokens(tokens)
  await updateDriveSettings({
    connectedAccountEmail: userProfile.email,
    connectedAccountName: userProfile.name,
    connectedAccountPicture: userProfile.picture,
  })

  return tokens
}

/**
 * Returns a valid access token, automatically refreshing it if expired or expiring soon.
 */
export async function getValidAccessToken(): Promise<string> {
  const tokens = await readStoredTokens()
  if (!tokens || !tokens.accessToken) {
    throw new Error("Google Drive is not connected. Please connect your account first.")
  }

  // If token is still valid for more than 4 minutes, use it
  if (tokens.expiryDate > Date.now() + 4 * 60 * 1000) {
    return tokens.accessToken
  }

  // Token is expired or expiring soon; refresh it
  if (!tokens.refreshToken) {
    throw new Error("Google Drive authorization expired and no refresh token is available. Please reconnect.")
  }

  const { clientId, clientSecret } = getOAuthConfig()
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are missing for token refresh.")
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refreshToken,
      grant_type: "refresh_token",
    }),
  })

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}))
    throw new Error(
      errJson.error_description || "Failed to refresh Google Drive access token. Please reconnect."
    )
  }

  const json = await response.json()
  const updatedTokens: GoogleDriveTokens = {
    ...tokens,
    accessToken: json.access_token,
    expiryDate: Date.now() + (json.expires_in || 3600) * 1000,
    refreshToken: json.refresh_token || tokens.refreshToken,
    updatedAt: new Date().toISOString(),
  }

  await saveStoredTokens(updatedTokens)
  return updatedTokens.accessToken
}

/**
 * Disconnects Google Drive, revokes authorization token, and clears local credentials.
 * Does NOT delete the user's files on Google Drive.
 */
export async function disconnectGoogleDrive(): Promise<void> {
  const tokens = await readStoredTokens()
  if (tokens?.accessToken) {
    try {
      await fetch(`${GOOGLE_REVOKE_URL}?token=${tokens.accessToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
    } catch {}
  }

  await clearStoredTokens()
  await clearCachedFolders()
  await updateDriveSettings({
    connectedAccountEmail: undefined,
    connectedAccountName: undefined,
    connectedAccountPicture: undefined,
  })
}
