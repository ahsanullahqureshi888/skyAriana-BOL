import { NextRequest, NextResponse } from "next/server"
import { generateDailyStatusReport } from "@/lib/services/communication-service"
import type { MessageLanguage } from "@/lib/types/communication"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      scope = "all",
      customerName,
      route,
      bolIds,
      language = "en" as MessageLanguage,
    } = body

    const result = await generateDailyStatusReport({
      scope,
      customerName,
      route,
      bolIds,
      language,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[API Communications Daily Status] POST error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate daily status report" },
      { status: 500 }
    )
  }
}
