import { NextRequest, NextResponse } from "next/server"

const FASTAPI_URL = process.env.FASTAPI_BACKEND_URL || "http://127.0.0.1:8000"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ category: string; filename: string }> }
) {
  try {
    const { category, filename } = await params
    if (!category || !filename) {
      return NextResponse.json({ error: "Missing category or filename" }, { status: 400 })
    }

    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
    const cleanCategory = category.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase()

    const targetUrl = `${FASTAPI_URL}/api/v1/documents/${encodeURIComponent(cleanCategory)}/${encodeURIComponent(cleanFilename)}`

    const fastRes = await fetch(targetUrl, {
      signal: AbortSignal.timeout(30000), // 30s streaming timeout
    })

    if (!fastRes.ok) {
      return NextResponse.json(
        { error: "Requested document not found on server", status: fastRes.status },
        { status: fastRes.status }
      )
    }

    const blob = await fastRes.blob()
    const contentType = fastRes.headers.get("content-type") || (cleanFilename.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf")
    const contentDisposition = fastRes.headers.get("content-disposition") || `attachment; filename="${cleanFilename}"`

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        "Cache-Control": "public, max-age=3600, immutable",
      },
    })
  } catch (err: any) {
    console.error("[GET /api/documents/download] Error:", err)
    return NextResponse.json({ error: "Failed to download document" }, { status: 500 })
  }
}
