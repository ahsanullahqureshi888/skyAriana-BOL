import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { CLIENT_SESSION_COOKIE, getClientSession } from "@/lib/auth/client-auth"
import { deleteSession } from "@/lib/data/client-sessions"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(CLIENT_SESSION_COOKIE)?.value
    
    if (token) {
      deleteSession(token)
    }

    cookieStore.delete(CLIENT_SESSION_COOKIE)

    return NextResponse.json({ success: true, message: "Logged out successfully" })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
