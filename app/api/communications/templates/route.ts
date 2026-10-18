import { NextRequest, NextResponse } from "next/server"
import {
  getAllTemplates,
  saveTemplate,
  deleteTemplate,
} from "@/lib/services/communication-service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const templates = await getAllTemplates()
    return NextResponse.json({ success: true, templates })
  } catch (error: any) {
    console.error("[API Communications Templates] GET error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load templates" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.name || !body.category || !body.content) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: name, category, content" },
        { status: 400 }
      )
    }

    const saved = await saveTemplate(body)
    return NextResponse.json({ success: true, template: saved })
  } catch (error: any) {
    console.error("[API Communications Templates] POST error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save template" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing template id" }, { status: 400 })
    }

    await deleteTemplate(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API Communications Templates] DELETE error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete template" },
      { status: 400 }
    )
  }
}
