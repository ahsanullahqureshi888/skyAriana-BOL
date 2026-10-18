import { NextRequest, NextResponse } from "next/server"
import { generateEmergencyDataExport } from "@/lib/backup/emergency-export-service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const data = await generateEmergencyDataExport()
    const jsonStr = JSON.stringify(data, null, 2)
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    const fileName = `SKY-ARIANA-EMERGENCY-DATA-EXPORT-${timestamp}.json`

    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to generate emergency export" },
      { status: 500 }
    )
  }
}
