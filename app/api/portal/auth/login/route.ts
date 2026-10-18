import { NextRequest, NextResponse } from "next/server"
import { authenticatePortalCredentials } from "@/lib/services/customer-portal-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body || {}

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      )
    }

    const result = await authenticatePortalCredentials(username, password)
    if (!result.success || !result.session || !result.token) {
      return NextResponse.json(
        { success: false, error: result.error || "Invalid login credentials" },
        { status: 401 }
      )
    }

    const response = NextResponse.json({
      success: true,
      token: result.token,
      session: result.session,
    })

    // Set secure HTTP-only session cookie for portal
    response.cookies.set("portal_session", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 1 day
      path: "/",
    })

    return response
  } catch (err: any) {
    console.error("[portal-login] Error:", err)
    return NextResponse.json(
      { success: false, error: "Authentication service error" },
      { status: 500 }
    )
  }
}
