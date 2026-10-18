import { NextResponse } from "next/server"
import { getClientUsers, createClientUser, updateClientUser, deleteClientUser } from "@/lib/data/client-users"
import { DEFAULT_PORTAL_PERMISSIONS, ROLE_BASED_DEFAULT_PERMISSIONS, type CustomerPortalRole } from "@/lib/types/customer-portal"

export async function GET() {
  try {
    const users = getClientUsers().map(u => ({
      id: u.id,
      customerId: u.customerId,
      companyName: u.customerName,
      username: u.username,
      name: u.contactName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.status,
      permissions: u.permissions,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLogin,
    }))
    return NextResponse.json({ success: true, users })
  } catch (error: any) {
    console.error("Admin Client Users GET Error:", error)
    return NextResponse.json({ error: "Failed to fetch client users" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { username, password, companyId, companyName, role, status, email, name, phone, permissions } = body

    if (!username || !password || !companyId) {
      return NextResponse.json({ error: "Username, password, and Company are required" }, { status: 400 })
    }

    const assignedRole: CustomerPortalRole = (role?.toLowerCase() as CustomerPortalRole) || "customer_admin"
    const basePermissions = ROLE_BASED_DEFAULT_PERMISSIONS[assignedRole] || DEFAULT_PORTAL_PERMISSIONS

    const newUser = createClientUser({
      customerId: companyId,
      customerName: companyName || companyId,
      username,
      passwordHash: password,
      salt: "",
      role: assignedRole,
      status: (status?.toLowerCase() as any) || "active",
      email: email || "",
      contactName: name || "",
      phone: phone || "",
      preferredLanguage: "en",
      permissions: permissions ? { ...basePermissions, ...permissions } : basePermissions,
      lastLogin: undefined,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        customerId: newUser.customerId,
        companyName: newUser.customerName,
        username: newUser.username,
        role: newUser.role,
        status: newUser.status,
      }
    })
  } catch (error: any) {
    console.error("Admin Client Users POST Error:", error)
    return NextResponse.json({ error: error.message || "Failed to create client user" }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const success = deleteClientUser(id)
    return NextResponse.json({ success })
  } catch (error: any) {
    console.error("Admin Client Users DELETE Error:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
