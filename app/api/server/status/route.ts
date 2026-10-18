import { NextResponse } from "next/server"
import { getServerConfig, getServerHostInfo } from "@/lib/server/config"
import { getDevices } from "@/lib/server/devices"
import { getFullHealthReport } from "@/lib/database/health"
import { isServerAdminSetup, verifyServerToken } from "@/lib/server/auth"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const authResult = await verifyServerToken(authHeader)

    const config = await getServerConfig()
    const hostInfo = getServerHostInfo(config.port)
    const adminConfigured = await isServerAdminSetup()
    const devices = await getDevices()
    const health = await getFullHealthReport()

    // Active devices in the last 10 minutes
    const now = Date.now()
    const tenMinutesAgo = now - 10 * 60 * 1000
    const activeDevices = devices.filter(
      (d) => !d.revoked && !d.blocked && new Date(d.lastSeenAt).getTime() > tenMinutesAgo
    )

    return NextResponse.json({
      success: true,
      mode: config.mode,
      serverName: config.serverName,
      host: config.host,
      port: config.port,
      serverUrl: config.serverUrl || `http://${hostInfo.primaryIp}:${config.port}`,
      hostInfo,
      adminConfigured,
      authenticated: authResult.authenticated,
      userRole: authResult.role,
      devicesCount: {
        total: devices.length,
        active: activeDevices.length,
        revoked: devices.filter((d) => d.revoked).length,
      },
      health,
    })
  } catch (err) {
    console.error("[Server Status API] Error:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to retrieve status" },
      { status: 500 }
    )
  }
}
