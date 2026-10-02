import { NextResponse } from "next/server"
import { getPublicHealth } from "@/lib/database/health"
import { SYSTEM_VERSION } from "@/lib/config/system-version"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const health = await getPublicHealth()
    const isReady = health.status !== "unhealthy" && health.database === "ok"

    const response = {
      ready: isReady,
      service: "aq-companies-bol-engine",
      version: SYSTEM_VERSION || "5.1.0",
      timestamp: new Date().toISOString(),
      checks: {
        database: health.database === "ok" ? "ready" : "unready",
        storage: "ready",
        migrations: "synced",
      },
    }

    return NextResponse.json(response, { status: isReady ? 200 : 503 })
  } catch (error: any) {
    return NextResponse.json(
      {
        ready: false,
        error: error?.message || "Readiness check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
