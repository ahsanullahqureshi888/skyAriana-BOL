/**
 * Sky Ariana Logistics — Missing Document Checklist API
 * Phase 14: Document Upload, Automatic Attachment Organization & Digital Shipment Folder
 */

import { NextRequest, NextResponse } from "next/server"
import { getMissingDocumentChecklist } from "@/lib/files/shipment-file-service"

export async function GET(request: NextRequest, { params }: { params: Promise<{ bolNumber: string }> }) {
  try {
    const { bolNumber } = await params
    const decodedBol = decodeURIComponent(bolNumber)
    const checklist = await getMissingDocumentChecklist(decodedBol)
    return NextResponse.json({ success: true, checklist })
  } catch (error: any) {
    console.error("[Checklist API] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to load checklist" }, { status: 500 })
  }
}
