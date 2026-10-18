/**
 * Sky Ariana Logistics — File Metadata & Actions API
 * Phase 14: Document Upload, Automatic Attachment Organization & Digital Shipment Folder
 */

import { NextRequest, NextResponse } from "next/server"
import {
  getFileById,
  updateFileMetadata,
  reviewFile,
  releaseFileToClient,
  archiveFile,
  restoreArchivedFile,
  deleteShipmentFile,
  addFileInternalNote,
} from "@/lib/files/shipment-file-service"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const file = await getFileById(id)
    if (!file) {
      return NextResponse.json({ success: false, error: "File not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, file })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, userId = "Staff User", ...payload } = body

    let updatedFile

    if (action === "REVIEW") {
      updatedFile = await reviewFile(id, payload.reviewAction, payload.details, userId)
    } else if (action === "RELEASE_TO_CLIENT") {
      updatedFile = await releaseFileToClient(id, userId)
    } else if (action === "ARCHIVE") {
      updatedFile = await archiveFile(id, payload.reason || "Manual archive", userId)
    } else if (action === "RESTORE") {
      updatedFile = await restoreArchivedFile(id, userId)
    } else if (action === "ADD_NOTE") {
      updatedFile = await addFileInternalNote(id, payload.text, userId)
    } else {
      // General metadata update
      updatedFile = await updateFileMetadata(id, payload, userId)
    }

    return NextResponse.json({ success: true, file: updatedFile })
  } catch (error: any) {
    console.error("[Files [id] API] PATCH Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const reason = searchParams.get("reason") || "Deleted via API"
    const userId = searchParams.get("userId") || "Staff User"
    const force = searchParams.get("force") === "true"

    await deleteShipmentFile(id, reason, userId, force)

    return NextResponse.json({ success: true, message: `File ${id} deleted successfully` })
  } catch (error: any) {
    console.error("[Files [id] API] DELETE Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}
