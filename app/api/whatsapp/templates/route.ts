import { NextRequest, NextResponse } from "next/server"
import {
  deleteCustomTemplate,
  getAllTemplates,
  saveCustomTemplate,
} from "@/lib/whatsapp/whatsapp-storage"

export async function GET() {
  try {
    const templates = await getAllTemplates()
    return NextResponse.json({ success: true, templates })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to read templates" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.name || !body.templateText) {
      return NextResponse.json({ success: false, error: "Name and templateText are required" }, { status: 400 })
    }

    const template = {
      id: body.id || `tpl-${Date.now()}`,
      name: body.name,
      category: body.category || "custom",
      language: body.language || "en",
      messageType: body.messageType || "custom",
      templateText: body.templateText,
      statusCode: body.statusCode,
      isBuiltIn: false,
      isFavorite: Boolean(body.isFavorite),
      updatedAt: new Date().toISOString(),
    }

    const templates = await saveCustomTemplate(template)
    return NextResponse.json({ success: true, template, templates })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to save template" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ success: false, error: "Template ID is required" }, { status: 400 })
    }
    const templates = await deleteCustomTemplate(id)
    return NextResponse.json({ success: true, templates })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to delete template" }, { status: 500 })
  }
}
