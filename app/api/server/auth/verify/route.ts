import { NextResponse } from "next/server"
import { verifyServerToken } from "@/lib/server/auth"

export async function GET(request: Request) {
  try {
    // Check Authorization header or Cookie
    const authHeader = request.headers.get("authorization")
    const cookieToken = request.headers.get("cookie")?.split("; ").find(r => r.startsWith("sky_auth_token="))?.split("=")[1]
    
    const tokenToVerify = authHeader || cookieToken

    const result = await verifyServerToken(tokenToVerify)

    if (!result.authenticated) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      role: result.role,
      username: result.username,
      deviceName: result.deviceName
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Verification error" },
      { status: 500 }
    )
  }
}
