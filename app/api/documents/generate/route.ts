import { NextRequest, NextResponse } from "next/server"

const FASTAPI_URL = process.env.FASTAPI_BACKEND_URL || "http://127.0.0.1:8000"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, async_job = false, ...docPayload } = body

    if (!type) {
      return NextResponse.json(
        { success: false, error: "Missing document type ('bol', 'invoice', 'packing-list', 'transit', 'phytosanitary', 'stickers', 'excel-export')" },
        { status: 400 }
      )
    }

    const endpointMap: Record<string, string> = {
      bol: "/api/v1/documents/bol",
      invoice: "/api/v1/documents/invoice",
      "packing-list": "/api/v1/documents/packing-list",
      transit: "/api/v1/documents/transit",
      phytosanitary: "/api/v1/documents/phytosanitary",
      phyto: "/api/v1/documents/phytosanitary",
      stickers: "/api/v1/documents/stickers",
      sticker: "/api/v1/documents/stickers",
      excel: "/api/v1/documents/excel-export",
      "excel-export": "/api/v1/documents/excel-export",
    }

    const endpoint = endpointMap[type.toLowerCase()]
    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: `Unsupported document type: ${type}` },
        { status: 400 }
      )
    }

    const targetUrl = `${FASTAPI_URL}${endpoint}`
    const payload = {
      ...docPayload,
      async_job: Boolean(async_job),
    }

    const fastRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000), // 15s timeout for heavy generation
    })

    if (!fastRes.ok) {
      const errData = await fastRes.json().catch(() => ({}))
      return NextResponse.json(
        {
          success: false,
          error: errData.detail || errData.message || `Backend returned status ${fastRes.status}`,
          status: fastRes.status,
        },
        { status: fastRes.status }
      )
    }

    const data = await fastRes.json()
    return NextResponse.json(data)
  } catch (err: any) {
    console.error("[POST /api/documents/generate] Error:", err)
    return NextResponse.json(
      {
        success: false,
        error: err.name === "AbortError" ? "Document generation timed out" : (err.message || "Failed to reach document engine"),
      },
      { status: 503 }
    )
  }
}
