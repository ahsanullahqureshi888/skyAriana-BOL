import { NextResponse } from "next/server"
import {
  getDevices,
  renameDevice,
  updateDeviceRole,
  revokeDevice,
  unrevokeDevice,
  blockDevice,
  unblockDevice,
  deleteDevice,
} from "@/lib/server/devices"
import { verifyServerToken, isServerAdminSetup } from "@/lib/server/auth"

export async function GET(request: Request) {
  try {
    const isSetup = await isServerAdminSetup()
    if (!isSetup) {
      return NextResponse.json({ success: true, devices: [] })
    }

    const authHeader = request.headers.get("authorization")
    const auth = await verifyServerToken(authHeader)

    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const devices = await getDevices()
    return NextResponse.json({ success: true, devices })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to list devices" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const auth = await verifyServerToken(authHeader)

    if (!auth.authenticated || auth.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin privilege required" }, { status: 403 })
    }

    const body = await request.json()
    const { action, deviceId, name, role } = body

    if (!deviceId) {
      return NextResponse.json({ success: false, error: "Missing deviceId" }, { status: 400 })
    }

    switch (action) {
      case "revoke":
        await revokeDevice(deviceId)
        break
      case "unrevoke":
        await unrevokeDevice(deviceId)
        break
      case "block":
        await blockDevice(deviceId)
        break
      case "unblock":
        await unblockDevice(deviceId)
        break
      case "rename":
        if (!name) return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 })
        await renameDevice(deviceId, name)
        break
      case "updateRole":
        if (!role) return NextResponse.json({ success: false, error: "Role is required" }, { status: 400 })
        await updateDeviceRole(deviceId, role)
        break
      case "delete":
        await deleteDevice(deviceId)
        break
      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 })
    }

    const updatedDevices = await getDevices()
    return NextResponse.json({ success: true, devices: updatedDevices })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Operation failed" },
      { status: 500 }
    )
  }
}
