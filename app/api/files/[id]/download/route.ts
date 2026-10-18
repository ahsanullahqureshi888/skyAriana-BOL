/**
 * Sky Ariana Logistics — Secure Authenticated File Download API
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
      if (!matchCompany || !file.client_visible || !file.client_downloadable) {
        return NextResponse.json(
          { success: false, error: "Access Denied: You do not have permission to download this file" },
          { status: 403 }
        )
      }
    }

    const buffer = await FileStorageProvider.getFileBuffer(file.storage_path)

    const headers = new Headers()
    headers.set("Content-Type", file.mime_type || "application/octet-stream")
    headers.set("Content-Length", buffer.length.toString())
    // Safe encoded filename for download
    const safeName = encodeURIComponent(file.file_name)
    headers.set("Content-Disposition", `attachment; filename="${safeName}"; filename*=UTF-8''${safeName}`)
    headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate")

    return new NextResponse(buffer, {
      status: 200,
      headers,
    })
  } catch (error: any) {
    console.error("[File Download API] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to download file" }, { status: 500 })
  }
}
