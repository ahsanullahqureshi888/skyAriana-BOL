import { NextRequest, NextResponse } from "next/server"
import { requirePortalSession } from "@/lib/auth/portal-auth-guard"
import {
  getPortalNotifications,
  markNotificationAsRead,
} from "@/lib/services/customer-portal-storage"

export async function GET(request: NextRequest) {
  const auth = requirePortalSession(request)
  if ("errorResponse" in auth) return auth.errorResponse

  try {
    const notifications = await getPortalNotifications(auth.session.customerId)
    return NextResponse.json({ success: true, notifications })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requirePortalSession(request)
  if ("errorResponse" in auth) return auth.errorResponse

  try {
    const { notificationId } = await request.json()
    if (!notificationId) {
      return NextResponse.json({ success: false, error: "Notification ID required" }, { status: 400 })
    }

    await markNotificationAsRead(notificationId, auth.session.customerId)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
