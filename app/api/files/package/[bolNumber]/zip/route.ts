/**
 * Sky Ariana Logistics — Download Complete Shipment Document Package ZIP API
 * Phase 14: Document Upload, Automatic Attachment Organization & Digital Shipment Folder
 */

import { NextRequest, NextResponse } from "next/server"
import { generateShipmentDocumentsZip } from "@/lib/files/shipment-file-service"
import type { DocumentCategoryCode } from "@/lib/types/shipment-file"

export async function GET(request: NextRequest, { params }: { params: Promise<{ bolNumber: string }> }) {
  try {
    const { bolNumber } = await params
    const decodedBol = decodeURIComponent(bolNumber)
    const { searchParams } = new URL(request.url)
    const scope = (searchParams.get("scope") as "all" | "official" | "client" | "category") || "all"
    const categoryCode = (searchParams.get("categoryCode") as DocumentCategoryCode) || undefined

    const { zipBuffer, fileName, fileCount } = await generateShipmentDocumentsZip(decodedBol, {
      scope,
      categoryCode,
    })

    const headers = new Headers()
    headers.set("Content-Type", "application/zip")
    headers.set("Content-Length", zipBuffer.length.toString())
    headers.set("Content-Disposition", `attachment; filename="${fileName}"`)
    headers.set("X-File-Count", fileCount.toString())

    return new NextResponse(zipBuffer, {
      status: 200,
      headers,
    })
  } catch (error: any) {
    console.error("[Zip Package API] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to generate zip package" }, { status: 500 })
  }
}
