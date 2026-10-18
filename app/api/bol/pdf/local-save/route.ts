import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { getUploadPath } from "@/lib/server-paths"

export const runtime = "nodejs"

function sanitizeFileName(fileName: string): string {
  const cleaned = fileName
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()

  const withExtension = cleaned.toLowerCase().endsWith(".pdf")
    ? cleaned
    : `${cleaned}.pdf`

  return withExtension || "BOL.pdf"
}

export async function POST(request: NextRequest) {
    // Auto-injected Cloud Auth Check
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = require('@/lib/supabase/server');
      const supabaseAuth = await createClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

  try {
    const formData = await request.formData()
    const pdfFile = formData.get("pdf")
    const requestedFileName = formData.get("fileName")

    if (!(pdfFile instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Missing PDF file" },
        { status: 400 }
      )
    }

    const fileName = sanitizeFileName(
      typeof requestedFileName === "string" ? requestedFileName : pdfFile.name
    )
    const bytes = Buffer.from(await pdfFile.arrayBuffer())

    if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      return NextResponse.json(
        { success: false, error: "Uploaded file is not a valid PDF" },
        { status: 400 }
      )
    }

    const downloadsDir = getUploadPath("bol-pdfs")
    await mkdir(downloadsDir, { recursive: true })

    let targetPath = path.join(downloadsDir, fileName)
    const parsed = path.parse(fileName)
    let copyNumber = 1

    while (copyNumber < 100) {
      try {
        await writeFile(targetPath, bytes, { flag: "wx" })
        break
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
          throw error
        }

        targetPath = path.join(
          downloadsDir,
          `${parsed.name} (${copyNumber})${parsed.ext || ".pdf"}`
        )
        copyNumber += 1
      }
    }

    return NextResponse.json({
      success: true,
      path: targetPath,
    })
  } catch (error) {
    console.error("Error saving PDF locally:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save PDF",
      },
      { status: 500 }
    )
  }
}
