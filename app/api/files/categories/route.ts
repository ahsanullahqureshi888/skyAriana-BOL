/**
 * Sky Ariana Logistics — Document Categories API
 * Phase 14: Document Upload, Automatic Attachment Organization & Digital Shipment Folder
 */

import { NextRequest, NextResponse } from "next/server"
import { getDocumentCategories, saveDocumentCategory } from "@/lib/files/shipment-file-service"

export async function GET() {
  try {
    const categories = await getDocumentCategories()
    return NextResponse.json({ success: true, categories })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const saved = await saveDocumentCategory(body)
    return NextResponse.json({ success: true, category: saved })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
