import { NextRequest, NextResponse } from "next/server"
import { requirePortalSession } from "@/lib/auth/portal-auth-guard"
import {
  findPortalUserById,
  verifyPassword,
  hashPassword,
  updatePortalAccount,
} from "@/lib/services/customer-portal-storage"

export async function POST(request: NextRequest) {
  const auth = requirePortalSession(request)
  if ("errorResponse" in auth) return auth.errorResponse

  if (auth.session.isAdminPreview) {
    return NextResponse.json(
      { success: false, error: "Password change is disabled in admin preview mode" },
      { status: 403 }
    )
  }

  try {
    const { currentPassword, newPassword } = await request.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Current and new password are required" },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const user = await findPortalUserById(auth.session.userId)
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const isValid = verifyPassword(currentPassword, user.passwordHash, user.salt)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 400 }
      )
    }

    const { hash, salt } = hashPassword(newPassword)
    await updatePortalAccount(user.id, () => ({
      passwordHash: hash,
      salt,
      updatedAt: new Date().toISOString(),
    }))

    return NextResponse.json({ success: true, message: "Password updated successfully" })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
