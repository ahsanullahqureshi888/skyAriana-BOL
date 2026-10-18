import { NextResponse } from "next/server"
import { getClientSession } from "@/lib/auth/client-auth"
import { getClientUserById } from "@/lib/data/client-users"

export async function GET() {
  try {
    const session = await getClientSession()
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const user = getClientUserById(session.userId)

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        username: session.username,
        companyId: session.companyId,
        companyName: session.companyName,
        role: session.role,
        email: user?.email || "",
        phone: user?.phone || "",
        contactName: user?.contactName || "",
      }
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
