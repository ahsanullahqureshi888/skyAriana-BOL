import { NextResponse } from "next/server"
import { getPublicHealth } from "@/lib/database/health"

export async function GET() {
  const health = await getPublicHealth()
  const statusCode = health.status === "unhealthy" ? 503 : 200
  return NextResponse.json(health, { status: statusCode })
}
