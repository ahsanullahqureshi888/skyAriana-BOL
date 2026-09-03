import { NextResponse } from "next/server"
import path from "path"
import { readJsonFile, writeJsonFile } from "@/lib/services/blob-db"

const CMR_DRAFT_FILE = path.join(process.cwd(), ".local-cmr-draft.json")
const BOL_DRAFT_FILE = path.join(process.cwd(), ".local-bol-draft.json")

function getDraftFilePath(type?: string | null): string {
  if (type === "bol") return BOL_DRAFT_FILE
  return CMR_DRAFT_FILE
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "cmr"
    const filePath = getDraftFilePath(type)

    const data = await readJsonFile<any>(filePath, null)
    if (data && data.draft) {
      return NextResponse.json(data)
    }
    return NextResponse.json({ draft: null })
  } catch (error) {
    return NextResponse.json({ draft: null })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const type = body.type || searchParams.get("type") || "cmr"
    const filePath = getDraftFilePath(type)

    const draftData = body.draft !== undefined ? body.draft : body
    const payload = {
      type,
      draft: draftData,
      updated_at: new Date().toISOString(),
    }

    await writeJsonFile(filePath, payload)
    return NextResponse.json({ 
      success: true, 
      status: "draft_saved", 
      type,
      updated_at: payload.updated_at,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to save draft" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "cmr"
    const filePath = getDraftFilePath(type)

    await writeJsonFile(filePath, { draft: null, updated_at: new Date().toISOString() })
    return NextResponse.json({ success: true, status: "draft_cleared", type })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to clear draft" },
      { status: 500 }
    )
  }
}
