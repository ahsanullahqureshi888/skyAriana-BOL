import { NextResponse } from "next/server"
import { uploadDocumentToGoogleDrive } from "@/lib/google-drive/sync"
import type { DocumentCategory } from "@/lib/google-drive/types"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const fileName = (formData.get("fileName") as string) || "Sky-Ariana-Document.pdf"
    const category = ((formData.get("category") as string) || "document") as DocumentCategory
    const metadataRaw = (formData.get("metadata") as string) || "{}"

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let metadata: Record<string, string> = {}
    try {
      metadata = JSON.parse(metadataRaw)
    } catch {}

    const result = await uploadDocumentToGoogleDrive({
      buffer,
      fileName,
      category,
      metadata,
    })

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      fileName: result.fileName,
      folderName: result.folderName,
      message: `Saved ${result.fileName} to Google Drive folder '${result.folderName}'`,
    })
  } catch (error: any) {
    console.error("[gdrive-upload-doc] Upload document error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to upload document to Google Drive",
      },
      { status: 500 }
    )
  }
}
