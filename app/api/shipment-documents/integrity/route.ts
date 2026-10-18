import { NextResponse } from "next/server"
import { checkDocumentIntegrity } from "@/lib/services/shipment-document-service"
import * as localStorage from "@/lib/services/local-storage-service"

export async function GET() {
  try {
    const allBols = await localStorage.getAllLocalBOLs()
    const allIssues = []
    for (const bol of allBols) {
      if (!bol || !bol.bol_number) continue
      const issues = await checkDocumentIntegrity(bol)
      if (issues && issues.length > 0) {
        allIssues.push(...issues)
      }
    }
    return NextResponse.json({
      success: true,
      issues: allIssues,
      count: allIssues.length,
      totalBolsAudited: allBols.length,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    
    // Check if an array of BOLs was provided
    if (Array.isArray(body.bols)) {
      const allIssues = []
      for (const bol of body.bols) {
        if (!bol || !bol.bol_number) continue
        const issues = await checkDocumentIntegrity(bol)
        if (issues && issues.length > 0) {
          allIssues.push(...issues)
        }
      }
      return NextResponse.json({
        success: true,
        issues: allIssues,
        count: allIssues.length,
        totalBolsAudited: body.bols.length,
      })
    }

    const bol = body.bol
    if (bol && bol.bol_number) {
      const issues = await checkDocumentIntegrity(bol)
      return NextResponse.json({
        success: true,
        issues,
        count: issues.length,
        totalBolsAudited: 1,
      })
    }

    // Default: scan all stored BOLs
    const allBols = await localStorage.getAllLocalBOLs()
    const allIssues = []
    for (const b of allBols) {
      if (!b || !b.bol_number) continue
      const issues = await checkDocumentIntegrity(b)
      if (issues && issues.length > 0) {
        allIssues.push(...issues)
      }
    }
    return NextResponse.json({
      success: true,
      issues: allIssues,
      count: allIssues.length,
      totalBolsAudited: allBols.length,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
