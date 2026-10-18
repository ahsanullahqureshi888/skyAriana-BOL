import { NextResponse } from "next/server"
import { ensureSkyArianaFolders, listBackupsFromDrive, deleteDriveFile } from "@/lib/google-drive/client"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = (searchParams.get("query") || "").trim().toLowerCase()
    const bol = (searchParams.get("bol") || "").trim().toLowerCase()
    const invoice = (searchParams.get("invoice") || "").trim().toLowerCase()
    const company = (searchParams.get("company") || "").trim().toLowerCase()

    const folders = await ensureSkyArianaFolders()
    let backups = await listBackupsFromDrive(folders.backupsFolderId)

    // Filter by query if supplied
    if (query || bol || invoice || company) {
      backups = backups.filter((item) => {
        const name = item.name.toLowerCase()
        const date = item.createdAt.toLowerCase()
        const manifest = item.manifest
        const idx = manifest?.metadataIndex

        if (bol) {
          const matchBol = idx?.bolNumbers?.some((b) => b.toLowerCase().includes(bol))
          if (!matchBol) return false
        }

        if (invoice) {
          const matchInv = idx?.invoiceNumbers?.some((i) => i.toLowerCase().includes(invoice))
          if (!matchInv) return false
        }

        if (company) {
          const matchCo =
            idx?.companyNames?.some((c) => c.toLowerCase().includes(company)) ||
            idx?.shipperNames?.some((s) => s.toLowerCase().includes(company))
          if (!matchCo) return false
        }

        if (query) {
          const matchGeneral =
            name.includes(query) ||
            date.includes(query) ||
            idx?.bolNumbers?.some((b) => b.toLowerCase().includes(query)) ||
            idx?.invoiceNumbers?.some((i) => i.toLowerCase().includes(query)) ||
            idx?.companyNames?.some((c) => c.toLowerCase().includes(query)) ||
            idx?.shipperNames?.some((s) => s.toLowerCase().includes(query))
          if (!matchGeneral) return false
        }

        return true
      })
    }

    return NextResponse.json({
      success: true,
      backups,
      count: backups.length,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to list Google Drive backups" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get("fileId")

    if (!fileId) {
      return NextResponse.json({ success: false, error: "fileId is required" }, { status: 400 })
    }

    await deleteDriveFile(fileId)
    return NextResponse.json({ success: true, deletedFileId: fileId })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete backup from Google Drive" },
      { status: 500 }
    )
  }
}
