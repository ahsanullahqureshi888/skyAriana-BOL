import { NextResponse } from "next/server"
import { verifyAuditChainIntegrity } from "@/lib/audit/audit-trail-service"

export async function GET() {
  try {
    const report = verifyAuditChainIntegrity()
    return NextResponse.json({
      success: true,
      report,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
