import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DRAFT_FILE = path.join(process.cwd(), ".local-cmr-draft.json")

export async function GET() {
  try {
    if (fs.existsSync(DRAFT_FILE)) {
      const data = fs.readFileSync(DRAFT_FILE, "utf-8")
      return NextResponse.json(JSON.parse(data))
    }
  } catch (e) {}
  return NextResponse.json({ draft: null })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const payload = {
      draft: body,
      updated_at: new Date().toISOString()
    }
    fs.writeFileSync(DRAFT_FILE, JSON.stringify(payload, null, 2), "utf-8")
    return NextResponse.json({ status: "draft_saved", updated_at: payload.updated_at })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to save draft" },
      { status: 500 }
    )
  }
}
