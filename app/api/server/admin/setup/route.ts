import { NextResponse } from "next/server"
import { isServerAdminSetup, setupServerAdmin } from "@/lib/server/auth"

export async function GET() {
  try {
    const isSetup = await isServerAdminSetup()
    return NextResponse.json({ success: true, isSetup })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to check admin status" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const isAlreadySetup = await isServerAdminSetup()
    if (isAlreadySetup) {
      return NextResponse.json(
        { success: false, error: "Server administrator account is already set up." },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required." },
        { status: 400 }
      )
    }

    const result = await setupServerAdmin({ username, password })
    return NextResponse.json({ success: true, user: result })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to setup admin" },
      { status: 400 }
    )
  }
}
