/**
 * Sky Ariana Logistics — Digital Shipment Folder API
 * Phase 14: Document Upload, Automatic Attachment Organization & Digital Shipment Folder
 */

import { NextRequest, NextResponse } from "next/server"
import { getDigitalShipmentFolder } from "@/lib/files/shipment-file-service"

export async function GET(request: NextRequest, { params }: { params: Promise<{ bolNumber: string }> }) {
  try {
    const { bolNumber } = await params
    const decodedBol = decodeURIComponent(bolNumber)
    const folder = await getDigitalShipmentFolder(decodedBol)
    return NextResponse.json({ success: true, folder })
  } catch (error: any) {
    console.error("[Digital Shipment Folder API] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to load shipment folder" }, { status: 500 })
  }
}
