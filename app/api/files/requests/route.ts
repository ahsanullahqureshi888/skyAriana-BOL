/**
 * Sky Ariana Logistics — Document Requests API
 * Phase 14: Document Upload, Automatic Attachment Organization & Digital Shipment Folder
 */

import { NextRequest, NextResponse } from "next/server"
import {
  getDocumentRequests,
  createDocumentRequest,
  generateWhatsAppDocumentRequestMessage,
} from "@/lib/files/shipment-file-service"

export async function GET() {
  try {
    const requests = await getDocumentRequests()
    return NextResponse.json({ success: true, requests })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const reqRecord = await createDocumentRequest(body)

    const whatsappMessage = generateWhatsAppDocumentRequestMessage(
      body.documentTypeName || body.documentType,
      body.bolNumber,
      body.containerNumber,
      body.dueDate,
      body.contactName
    )

    return NextResponse.json({
      success: true,
      request: reqRecord,
      whatsappMessage,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
