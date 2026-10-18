import { NextResponse } from "next/server"
import { requireClientSession } from "@/lib/auth/client-auth"
import { getClientUserById, updateClientUser, verifyClientPassword } from "@/lib/data/client-users"

export async function GET() {
  try {
    const session = await requireClientSession()
    const user = getClientUserById(session.userId)

    return NextResponse.json({
      success: true,
      profile: {
        id: session.userId,
        username: session.username,
        companyId: session.companyId,
        companyName: session.companyName,
        role: session.role,
        email: user?.email || "",
        phone: user?.phone || "",
        contactName: user?.contactName || "",
        preferredLanguage: user?.preferredLanguage || "en",
        lastLogin: user?.lastLogin || "",
      }
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireClientSession()
    const body = await req.json()
    const { currentPassword, newPassword, email, phone, contactName, preferredLanguage } = body

    const user = getClientUserById(session.userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const updates: any = {}

    if (email) updates.email = email
    if (phone) updates.phone = phone
    if (contactName) updates.contactName = contactName
    if (preferredLanguage) updates.preferredLanguage = preferredLanguage

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password required to set new password" }, { status: 400 })
      }
      const isValid = verifyClientPassword(currentPassword, user.passwordHash, user.salt)
      if (!isValid) {
        return NextResponse.json({ error: "Incorrect current password" }, { status: 401 })
      }
      if (newPassword.length < 4) {
        return NextResponse.json({ error: "New password must be at least 4 characters" }, { status: 400 })
      }
      updates.passwordHash = newPassword
    }

    updateClientUser(session.userId, updates)

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
