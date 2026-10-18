import { NextRequest, NextResponse } from "next/server"
import { createAdminPreviewSession } from "@/lib/services/customer-portal-service"

export async function POST(request: NextRequest) {
  try {
    const { customerId, adminName } = await request.json()
    if (!customerId) {
      return NextResponse.json({ success: false, error: "Customer ID required" }, { status: 400 })
    }

    const { session, token } = await createAdminPreviewSession(customerId, adminName || "Administrator")

    const response = NextResponse.json({
      success: true,
      token,
      session,
    })

    // Set preview cookie
    response.cookies.set("portal_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 2 * 60 * 60, // 2 hours
      path: "/",
    })

    return response
  } catch (err: any) {
    console.error("[portal-admin-preview] Error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
