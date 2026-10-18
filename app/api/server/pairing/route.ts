import { NextResponse } from "next/server"
import { generatePairingCode, claimPairingCode, verifyServerToken } from "@/lib/server/auth"
import { registerDevice } from "@/lib/server/devices"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, role, code, deviceName, platform } = body

    if (action === "generate") {
      // Must be authenticated to generate pairing codes (or be on localhost)
      const host = request.headers.get("host") || ""
      const isLocalhost = host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || host.startsWith("[::1]:")
      
      if (!isLocalhost) {
        const authHeader = request.headers.get("authorization")
        const cookieToken = request.headers.get("cookie")?.split("; ").find(r => r.startsWith("sky_auth_token="))?.split("=")[1]
        const auth = await verifyServerToken(authHeader || cookieToken)

        if (!auth.authenticated || auth.role !== "admin") {
          return NextResponse.json(
            { success: false, error: "Only administrators can generate pairing codes." },
            { status: 403 }
          )
        }
      }

      const pairing = await generatePairingCode(role || "accounting")
      return NextResponse.json({ success: true, ...pairing })
    }

    if (action === "claim" || code) {
      if (!code || !deviceName) {
        return NextResponse.json(
          { success: false, error: "Pairing code and device name are required." },
          { status: 400 }
        )
      }

      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1"
      const result = await claimPairingCode({
        code,
        deviceName,
        platform,
        clientIp: ip,
      })

      // Register device in device manager
      await registerDevice({
        id: result.deviceId,
        name: deviceName,
        role: result.role,
        ip,
        platform: platform || "unknown",
      })

      return NextResponse.json({
        success: true,
        token: result.token,
        deviceId: result.deviceId,
        role: result.role,
        serverName: result.serverName,
      })
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Expected 'generate' or 'claim'." },
      { status: 400 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Pairing failed" },
      { status: 400 }
    )
  }
}
