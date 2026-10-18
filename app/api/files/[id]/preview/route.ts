/**
 * Sky Ariana Logistics — Secure Authenticated File Inline Preview API
 * Phase 14: Document Upload, Automatic Attachment Organization & Digital Shipment Folder
 */

import { NextRequest, NextResponse } from "next/server"
import { getFileById } from "@/lib/files/shipment-file-service"
import { FileStorageProvider } from "@/lib/files/storage-provider"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const file = await getFileById(id)
    if (!file) {
      return NextResponse.json({ success: false, error: "File record not found" }, { status: 404 })
    }

    // Client Portal Authorization Check
    const { searchParams } = new URL(request.url)
    const clientCompanyId = searchParams.get("clientCompanyId")
    if (clientCompanyId) {
      const matchCompany =
        file.company_id === clientCompanyId ||
        file.company_name?.toLowerCase() === clientCompanyId.toLowerCase()
      if (!matchCompany || !file.client_visible) {
        return NextResponse.json(
          { success: false, error: "Access Denied: You do not have permission to view this file" },
          { status: 403 }
        )
      }
    }

    const buffer = await FileStorageProvider.getFileBuffer(file.storage_path)

    const headers = new Headers()
    headers.set("Content-Type", file.mime_type || "application/octet-stream")
    headers.set("Content-Length", buffer.length.toString())
    const safeName = encodeURIComponent(file.file_name)
    headers.set("Content-Disposition", `inline; filename="${safeName}"`)
    headers.set("Cache-Control", "private, max-age=3600")

    return new NextResponse(buffer, {
      status: 200,
      headers,
    })
  } catch (error: any) {
    console.error("[File Preview API] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to preview file" }, { status: 500 })
  }
}
