import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DOCS_FILE = path.join(process.cwd(), ".local-cmr-documents.json")

function getDocuments(): any[] {
  try {
    if (fs.existsSync(DOCS_FILE)) {
      const data = fs.readFileSync(DOCS_FILE, "utf-8")
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {}
  return []
}

function saveDocuments(docs: any[]) {
  try {
    fs.writeFileSync(DOCS_FILE, JSON.stringify(docs, null, 2), "utf-8")
  } catch (e) {}
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const list = getDocuments()
  const found = list.find((d: any) => d.id === id || d.cmr_number === id)

  if (!found) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }
  return NextResponse.json(found)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  let list = getDocuments()
  const initialLen = list.length
  list = list.filter((d: any) => d.id !== id && d.cmr_number !== id)

  if (list.length === initialLen) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  saveDocuments(list)
  return NextResponse.json({ status: "deleted", id })
}
