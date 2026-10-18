import { NextResponse } from "next/server"
import { validateBackup, executeRestore, createPreRestoreBackup, ValidationResult } from "@/lib/services/restore-engine"
import { downloadBinaryFile } from "@/lib/sync/gdrive-client"
import { getDataPath } from "@/lib/server-paths"
import fs from "fs"
import path from "path"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const fileId = formData.get("fileId") as string
    const action = formData.get("action") as string // "validate" or "commit"

    if (!file && !fileId) {
      return NextResponse.json({ success: false, error: "No backup file or fileId provided." }, { status: 400 })
    }

    let buffer: Buffer

    if (file) {
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else {
      const downloaded = await downloadBinaryFile(fileId)
      if (!downloaded) {
        return NextResponse.json({ success: false, error: "Failed to download backup from Google Drive." }, { status: 500 })
      }
      buffer = downloaded
    }
    
    // Ensure staging dir exists
    const stagingDir = getDataPath("restore-staging")
    if (!fs.existsSync(stagingDir)) {
      fs.mkdirSync(stagingDir, { recursive: true })
    }

    const tempZipPath = path.join(stagingDir, `upload-${Date.now()}.zip`)
    fs.writeFileSync(tempZipPath, buffer)

    // Validate the backup
    const validationResult: ValidationResult = await validateBackup(tempZipPath)

    if (action === "validate") {
      // Return validation results without committing
      // We don't need to keep the file if it's just validation
      fs.unlinkSync(tempZipPath)
      return NextResponse.json({ success: true, validation: { ...validationResult, extractedData: undefined } })
    }

    if (action === "commit") {
      if (validationResult.status === "Corrupted" || validationResult.status === "Unsupported") {
        fs.unlinkSync(tempZipPath)
        return NextResponse.json({ success: false, error: "Backup is corrupted or unsupported.", validation: validationResult }, { status: 400 })
      }

      // Pre-Restore Backup
      const preRestorePath = await createPreRestoreBackup()

      // Execute Restore
      const commitResult = await executeRestore(validationResult)

      fs.unlinkSync(tempZipPath)

      if (commitResult.success) {
        return NextResponse.json({ 
          success: true, 
          message: "Restore completed successfully.",
          preRestorePath 
        })
      } else {
        return NextResponse.json({ success: false, error: commitResult.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
