import { NextResponse } from "next/server"
import { getClientUserByUsername, updateClientUser, verifyClientPassword } from "@/lib/data/client-users"
import { createSession } from "@/lib/data/client-sessions"
import { CLIENT_SESSION_COOKIE } from "@/lib/auth/client-auth"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 })
    }

    const user = getClientUserByUsername(username)
    
    if (!user) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
    }

    const statusNorm = (user.status || "active").toLowerCase()
    if (statusNorm === "suspended" || statusNorm === "disabled") {
      return NextResponse.json({ 
        error: `Account is ${statusNorm}. Please contact Sky Ariana administration.` 
      }, { status: 403 })
    }

    const isValid = verifyClientPassword(password, user.passwordHash, user.salt)
    if (!isValid) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
    }

    // Create session with companyName and username
    const session = createSession(
      user.id, 
      user.customerId, 
      user.role, 
      user.customerName || user.customerId, 
      user.username
    )

    // Update last login
    updateClientUser(user.id, { lastLogin: new Date().toISOString() })

    // Set HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set({
      name: CLIENT_SESSION_COOKIE,
      value: session.token,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 // 24 hours
    })

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        username: user.username,
        companyId: user.customerId,
        companyName: user.customerName,
        role: user.role
      } 
    })
  } catch (error) {
    console.error("Client Login Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
