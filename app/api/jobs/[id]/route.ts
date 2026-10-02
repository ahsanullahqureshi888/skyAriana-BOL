import { NextRequest, NextResponse } from "next/server"

const FASTAPI_URL = process.env.FASTAPI_BACKEND_URL || "http://127.0.0.1:8000"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing job ID" }, { status: 400 })
    }

    const targetUrl = `${FASTAPI_URL}/api/v1/jobs/${encodeURIComponent(id)}`
    const fastRes = await fetch(targetUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    })

    if (!fastRes.ok) {
      return NextResponse.json(
        { success: false, error: `Job not found or expired (status ${fastRes.status})` },
        { status: fastRes.status }
      )
    }

    const data = await fastRes.json()
    return NextResponse.json(data)
  } catch (err: any) {
    console.error("[GET /api/jobs/[id]] Error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch job status" },
      { status: 503 }
    )
  }
}
