import { NextResponse } from "next/server"
import { authenticateServerLogin } from "@/lib/server/auth"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password, deviceName, deviceId } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required." },
        { status: 400 }
      )
    }

    const session = await authenticateServerLogin({
      username,
      password,
      deviceName,
      deviceId,
    })

    return NextResponse.json({
      success: true,
      token: session.token,
      role: session.role,
      username: session.username,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Authentication failed" },
      { status: 401 }
    )
  }
}
