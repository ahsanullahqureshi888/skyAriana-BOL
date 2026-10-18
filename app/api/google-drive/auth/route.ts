import { NextResponse } from "next/server"
import { buildAuthorizationUrl, getOAuthConfig } from "@/lib/google-drive/auth"
import { readStoredTokens } from "@/lib/google-drive/storage-settings"

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const action = searchParams.get("action")

    if (action === "status") {
      const tokens = await readStoredTokens()
      return NextResponse.json({
        connected: Boolean(tokens?.accessToken),
        email: tokens?.email,
      })
    }

    const redirectUri = `${origin}/api/google-drive/auth/callback`
    const { clientId } = getOAuthConfig(redirectUri)

    if (!clientId) {
      return NextResponse.json(
        {
          error: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment.",
          configured: false,
        },
        { status: 400 }
      )
    }

    const authUrl = buildAuthorizationUrl(redirectUri)
    return NextResponse.json({ url: authUrl, configured: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to initialize Google authorization" },
      { status: 500 }
    )
  }
}
