import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { getUploadPath } from "@/lib/server-paths"

const COMPANY_PDF_UPLOAD_DIR = getUploadPath("account-company-pdfs")
const COMPANY_PDF_PUBLIC_PREFIX = "/uploads/account-company-pdfs"

function sanitizePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "company"
}

async function storeCompanyPDF(pdfFile: File, companyName: string) {
  await fs.promises.mkdir(COMPANY_PDF_UPLOAD_DIR, { recursive: true })
  const safeCompanyName = sanitizePathPart(companyName)
  const safeFileName = sanitizePathPart(pdfFile.name || "account.pdf")
  const localFileName = `${safeCompanyName}-${Date.now()}-${safeFileName}`
  const localPath = path.join(COMPANY_PDF_UPLOAD_DIR, localFileName)
  const bytes = Buffer.from(await pdfFile.arrayBuffer())

  await fs.promises.writeFile(localPath, bytes)

  return `${COMPANY_PDF_PUBLIC_PREFIX}/${localFileName}`
}

async function removeCompanyPDF(pdfUrl: string) {
  if (!pdfUrl.startsWith(COMPANY_PDF_PUBLIC_PREFIX)) return false

  const relativeFileName = decodeURIComponent(pdfUrl.slice(COMPANY_PDF_PUBLIC_PREFIX.length + 1))
  const localPath = path.resolve(COMPANY_PDF_UPLOAD_DIR, relativeFileName)
  const uploadRoot = path.resolve(COMPANY_PDF_UPLOAD_DIR)

  if (!localPath.startsWith(uploadRoot)) return false

  await fs.promises.rm(localPath, { force: true })
  return true
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
    const pdfFile = formData.get("pdf") as File | null
    const companyName = String(formData.get("companyName") || "").trim()

    if (!pdfFile || !companyName) {
      return NextResponse.json(
        { success: false, error: "Missing PDF file or company name" },
        { status: 400 }
      )
    }

    if (!pdfFile.type.includes("pdf") && !pdfFile.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { success: false, error: "File must be a PDF" },
        { status: 400 }
      )
    }

    const pdfUrl = await storeCompanyPDF(pdfFile, companyName)

    return NextResponse.json({
      success: true,
      data: {
        companyName,
        pdfUrl,
        uploadedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error storing account company PDF:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to store company PDF",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
    // Auto-injected Cloud Auth Check
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = require('@/lib/supabase/server');
      const supabaseAuth = await createClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

  try {
    const { searchParams } = new URL(request.url)
    const pdfUrl = searchParams.get("pdfUrl")

    if (!pdfUrl) {
      return NextResponse.json(
        { success: false, error: "Missing PDF URL" },
        { status: 400 }
      )
    }

    const deleted = await removeCompanyPDF(pdfUrl)

    return NextResponse.json({
      success: true,
      deleted,
    })
  } catch (error) {
    console.error("Error deleting account company PDF:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete company PDF",
      },
      { status: 500 }
    )
  }
}
