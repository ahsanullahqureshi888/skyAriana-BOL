import { NextRequest, NextResponse } from "next/server"
import {
  getAdminCustomerPortalOverview,
} from "@/lib/services/customer-portal-service"
import {
  createPortalAccount,
  updatePortalAccount,
} from "@/lib/services/customer-portal-storage"

export async function GET(request: NextRequest) {
  try {
    const overview = await getAdminCustomerPortalOverview()
    return NextResponse.json({ success: true, customers: overview })
  } catch (err: any) {
    console.error("[portal-admin-customers] Error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === "create_account") {
      const { customerId, customerName, username, email, password, role, permissions, contactName, phone } = body
      if (!customerId || !customerName || !username || !password) {
        return NextResponse.json(
          { success: false, error: "Customer, username, and password are required" },
          { status: 400 }
        )
      }

      const account = await createPortalAccount({
        customerId,
        customerName,
        username,
        email: email || `${username}@portal.skyariana.local`,
        passwordPlain: password,
        role: role || "customer_admin",
        permissions,
        contactName,
        phone,
      })

      return NextResponse.json({ success: true, account })
    }

    if (action === "update_status") {
      const { userId, status } = body
      if (!userId || !status) {
        return NextResponse.json({ success: false, error: "User ID and status required" }, { status: 400 })
      }
      const updated = await updatePortalAccount(userId, () => ({ status }))
      return NextResponse.json({ success: true, account: updated })
    }

    if (action === "update_permissions") {
      const { userId, permissions } = body
      if (!userId || !permissions) {
        return NextResponse.json({ success: false, error: "User ID and permissions required" }, { status: 400 })
      }
      const updated = await updatePortalAccount(userId, () => ({ permissions }))
      return NextResponse.json({ success: true, account: updated })
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 })
  } catch (err: any) {
    console.error("[portal-admin-customers-post] Error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
