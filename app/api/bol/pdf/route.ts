import { NextRequest, NextResponse } from "next/server"
import { put, list, del } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"
import * as localStorage from "@/lib/services/local-storage-service"
import fs from "fs"
import path from "path"
import { getUploadPath } from "@/lib/server-paths"
import { logBolLifecycleAudit } from "@/lib/services/bol-audit-service"

const LOCAL_PDF_UPLOAD_DIR = getUploadPath("bol-pdfs")
const LOCAL_PDF_PUBLIC_PREFIX = "/uploads/bol-pdfs"

function getBlobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN?.trim()
}

function sanitizePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "BOL"
}

async function storePDFLocally(pdfBuffer: Buffer, bolNumber: string, fileName: string) {
  await fs.promises.mkdir(LOCAL_PDF_UPLOAD_DIR, { recursive: true })
  const safeBolNumber = sanitizePathPart(bolNumber)
  const safeFileName = sanitizePathPart(fileName)
  const localFileName = `${safeBolNumber}-${safeFileName}`
  const localPath = path.join(LOCAL_PDF_UPLOAD_DIR, localFileName)
  await fs.promises.writeFile(localPath, pdfBuffer)
  return `${LOCAL_PDF_PUBLIC_PREFIX}/${localFileName}`
}

async function removeLocalPDF(pdfUrl: string) {
  if (!pdfUrl.startsWith(LOCAL_PDF_PUBLIC_PREFIX)) return false
  const relativeFileName = decodeURIComponent(pdfUrl.slice(LOCAL_PDF_PUBLIC_PREFIX.length + 1))
  const localPath = path.resolve(LOCAL_PDF_UPLOAD_DIR, relativeFileName)
  const uploadRoot = path.resolve(LOCAL_PDF_UPLOAD_DIR)

  if (!localPath.startsWith(uploadRoot)) return false
  await fs.promises.rm(localPath, { force: true })
  return true
}

// POST: Store a PDF document
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = user.user_metadata?.role || user.app_metadata?.role || "user"
    if (role === "viewer") {
      return NextResponse.json({ error: "Forbidden: Viewer cannot upload PDFs" }, { status: 403 })
    }

    const formData = await request.formData()
    const pdfFile = formData.get("pdf") as File
    const bolId = formData.get("bolId") as string
    const bolNumber = formData.get("bolNumber") as string

    if (!pdfFile || !bolId || !bolNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: pdf, bolId, or bolNumber",
        },
        { status: 400 }
      )
    }

    if (pdfFile.size > 15 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "PDF file size exceeds 15MB limit" }, { status: 400 })
    }

    if (pdfFile.type !== "application/pdf" && !pdfFile.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        {
          success: false,
          error: "File must be a valid PDF",
        },
        { status: 400 }
      )
    }

    const arrayBuffer = await pdfFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Check %PDF- magic header
    if (buffer.length < 5 || buffer.toString("utf-8", 0, 5) !== "%PDF-") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid PDF file content: magic header mismatch",
        },
        { status: 400 }
      )
    }

    // Generate unique path for PDF storage
    const timestamp = Date.now()
    const safeBolNum = sanitizePathPart(bolNumber)
    const fileName = `${safeBolNum}-${timestamp}.pdf`
    const blobPath = `bol-documents/${safeBolNum}/${fileName}`

    let pdfUrl: string
    let storageTarget: "vercel-blob" | "local" = "vercel-blob"

    const blobToken = getBlobToken()

    if (blobToken) {
      const blob = await put(blobPath, buffer, {
        access: "private",
        contentType: "application/pdf",
        addRandomSuffix: false,
        token: blobToken,
      })
      pdfUrl = blob.url
    } else {
      storageTarget = "local"
      pdfUrl = await storePDFLocally(buffer, bolNumber, fileName)
    }

    // Update the BOL record in database with PDF URL
    let updated = null
    let updateError = null
    try {
      const result = await supabase
        .from("bill_of_lading")
        .update({
          pdf_url: pdfUrl,
          pdf_uploaded_at: new Date().toISOString(),
        })
        .eq("id", bolId)
        .select()
        .single()

      updated = result.data
      updateError = result.error
    } catch (supabaseErr) {
      updateError = supabaseErr instanceof Error ? supabaseErr.message : String(supabaseErr)
      console.error("Supabase error updating BOL with PDF URL:", updateError)
    }

    try {
      await localStorage.updateLocalBOL(bolId, {
        pdf_url: pdfUrl,
        pdf_uploaded_at: new Date().toISOString(),
        pdf_status: "ready",
      })
      if (bolNumber && bolNumber !== bolId) {
        await localStorage.updateLocalBOL(bolNumber, {
          pdf_url: pdfUrl,
          pdf_uploaded_at: new Date().toISOString(),
          pdf_status: "ready",
        })
      }
    } catch (localError) {
      console.error("Failed to update local BOL with PDF metadata:", localError)
    }

    void logBolLifecycleAudit({
      action: "FILE_ATTACHED",
      entityId: bolId,
      bolNumber,
      actor: user?.email || "user",
      metadata: { pdfUrl, fileName, storage: storageTarget },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updated?.id ?? bolId,
        bolNumber: updated?.bol_number ?? bolNumber,
        pdfUrl,
        pdf_status: "ready",
        uploadedAt: updated?.pdf_uploaded_at ?? new Date().toISOString(),
        storage: storageTarget,
      },
    })
  } catch (error) {
    console.error("Error storing PDF:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to store PDF",
      },
      { status: 500 }
    )
  }
}

// GET: List all PDF documents
export async function GET(request: NextRequest) {
  try {
    let user: any = null
    let supabase: any = null

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        supabase = await createClient()
        const { data } = await supabase.auth.getUser()
        user = data?.user || null
      } catch (err) {
        console.warn("[v0] Supabase auth check error:", err)
      }
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action") || (searchParams.get("download") === "true" ? "download" : null)
    const bolId = searchParams.get("bolId") || searchParams.get("bol_id")

    if (action === "list") {
      const blobToken = getBlobToken()

      if (!blobToken) {
        let localFiles: string[] = []
        try {
          localFiles = await fs.promises.readdir(LOCAL_PDF_UPLOAD_DIR)
        } catch {
          localFiles = []
        }

        return NextResponse.json({
          success: true,
          data: localFiles.map((fileName) => ({
            pathname: `${LOCAL_PDF_PUBLIC_PREFIX}/${fileName}`,
            url: `${LOCAL_PDF_PUBLIC_PREFIX}/${fileName}`,
          })),
        })
      }

      const blobs = await list({
        prefix: "bol-documents/",
        token: blobToken,
      })

      return NextResponse.json({
        success: true,
        data: blobs.blobs,
      })
    }

    if (action === "download" && bolId) {
      let resolvedPdfUrl: string | null = null
      let resolvedBolNumber = bolId

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("bill_of_lading")
            .select("id, bol_number, pdf_url")
            .eq("id", bolId)
            .single()
          if (!error && data?.pdf_url) {
            resolvedPdfUrl = data.pdf_url
            resolvedBolNumber = data.bol_number || bolId
          }
        } catch {}
      }

      if (!resolvedPdfUrl) {
        const localBol = await localStorage.getLocalBOL(bolId)
        if (localBol?.pdf_url) {
          resolvedPdfUrl = localBol.pdf_url
          resolvedBolNumber = localBol.bol_number || localBol.id || bolId
        }
      }

      if (!resolvedPdfUrl) {
        return NextResponse.json(
          {
            success: false,
            status: "none",
            error: "PDF not found for this document",
          },
          { status: 404 }
        )
      }

      // Physical file existence check for local storage
      if (resolvedPdfUrl.startsWith(LOCAL_PDF_PUBLIC_PREFIX)) {
        const relativeFileName = decodeURIComponent(resolvedPdfUrl.slice(LOCAL_PDF_PUBLIC_PREFIX.length + 1))
        const localPath = path.resolve(LOCAL_PDF_UPLOAD_DIR, relativeFileName)
        if (!fs.existsSync(localPath)) {
          // File missing! Mark pdf_status: "missing"
          await localStorage.updateLocalBOL(bolId, { pdf_status: "missing" })
          return NextResponse.json(
            {
              success: false,
              status: "missing",
              pdf_status: "missing",
              error: "Physical PDF file missing from storage.",
              canRegenerate: true,
            },
            { status: 404 }
          )
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          bolNumber: resolvedBolNumber,
          pdfUrl: resolvedPdfUrl,
        },
      })
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action parameter",
    })
  } catch (error) {
    console.error("Error fetching PDFs:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch PDFs",
      },
      { status: 500 }
    )
  }
}

// DELETE: Remove a PDF document
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = user.user_metadata?.role || user.app_metadata?.role || "user"
    if (role === "shipper" || role === "viewer") {
      return NextResponse.json({ error: "Forbidden: Unauthorized to delete PDFs" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const bolId = searchParams.get("bolId")

    if (!bolId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing bolId parameter",
        },
        { status: 400 }
      )
    }

    const { data, error: fetchError } = await supabase
      .from("bill_of_lading")
      .select("pdf_url")
      .eq("id", bolId)
      .single()

    let pdfUrl = data?.pdf_url
    if (fetchError || !pdfUrl) {
      const localBol = await localStorage.getLocalBOL(bolId)
      pdfUrl = localBol?.pdf_url || null
    }

    if (!pdfUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "PDF not found for this document",
        },
        { status: 404 }
      )
    }

    const deletedLocal = await removeLocalPDF(pdfUrl)
    if (!deletedLocal) {
      const blobToken = getBlobToken()
      if (!blobToken) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot delete a Vercel Blob PDF because BLOB_READ_WRITE_TOKEN is not configured.",
          },
          { status: 500 }
        )
      }

      await del(pdfUrl, { token: blobToken })
    }

    // Clear the PDF URL from database
    await supabase
      .from("bill_of_lading")
      .update({
        pdf_url: null,
        pdf_uploaded_at: null,
      })
      .eq("id", bolId)

    try {
      await localStorage.updateLocalBOL(bolId, {
        pdf_url: null,
        pdf_uploaded_at: null,
        pdf_status: "none",
      })
    } catch (localUpdateError) {
      console.error("Failed to clear local PDF metadata:", localUpdateError)
    }

    void logBolLifecycleAudit({
      action: "FILE_DELETED",
      entityId: bolId,
      bolNumber: bolId,
      actor: user?.email || "user",
      metadata: { deletedPdfUrl: pdfUrl },
    })

    return NextResponse.json({
      success: true,
      message: "PDF deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting PDF:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete PDF",
      },
      { status: 500 }
    )
  }
}
