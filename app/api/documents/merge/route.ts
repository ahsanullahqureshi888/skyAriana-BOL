import { NextRequest, NextResponse } from "next/server"
import { mergeShipmentDocuments } from "@/lib/services/pdf-merge-service"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { bolNumber, bolData, items } = body

    if (!bolNumber || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { pdfBuffer, mergedFileName } = await mergeShipmentDocuments(bolNumber, bolData, items)

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${mergedFileName}"`,
      },
    })
  } catch (err: any) {
    console.error("[POST /api/documents/merge] Error:", err)
    return NextResponse.json({ error: "Failed to merge PDF files", details: err.message }, { status: 500 })
  }
}
