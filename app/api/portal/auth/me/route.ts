import { NextRequest, NextResponse } from "next/server"
import { requirePortalSession } from "@/lib/auth/portal-auth-guard"
import { findPortalUserById } from "@/lib/services/customer-portal-storage"

export async function GET(request: NextRequest) {
  const auth = requirePortalSession(request)
  if ("errorResponse" in auth) return auth.errorResponse

  const user = await findPortalUserById(auth.session.userId)
  return NextResponse.json({
    success: true,
    session: auth.session,
    user: user
      ? {
          id: user.id,
          customerId: user.customerId,
          customerName: user.customerName,
          username: user.username,
          email: user.email,
          contactName: user.contactName,
          phone: user.phone,
          role: user.role,
          preferredLanguage: user.preferredLanguage,
          permissions: user.permissions,
        }
      : null,
  })
}
