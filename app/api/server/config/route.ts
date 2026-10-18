import { NextResponse } from "next/server"
import { getServerConfig, updateServerConfig, type ServerModeConfig } from "@/lib/server/config"
import { verifyServerToken } from "@/lib/server/auth"

export async function GET() {
  try {
    const config = await getServerConfig()
    return NextResponse.json({ success: true, config })
  } catch (err) {
    console.error("[Server Config API] Error getting config:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load config" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { mode, serverName, host, port, serverUrl, autoStart } = body

    const updates: Partial<ServerModeConfig> = {}
    if (mode === "server" || mode === "client") updates.mode = mode
    if (typeof serverName === "string" && serverName.trim()) updates.serverName = serverName.trim()
    if (typeof host === "string") updates.host = host
    if (typeof port === "number" && port > 0 && port < 65536) updates.port = port
    if (typeof serverUrl === "string") updates.serverUrl = serverUrl.trim()
    if (typeof autoStart === "boolean") updates.autoStart = autoStart

    const updated = await updateServerConfig(updates)
    return NextResponse.json({ success: true, config: updated })
  } catch (err) {
    console.error("[Server Config API] Error updating config:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to update config" },
      { status: 500 }
    )
  }
}
