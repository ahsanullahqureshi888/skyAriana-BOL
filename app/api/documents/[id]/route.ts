import { NextResponse } from "next/server"
import path from "path"
import { readJsonFile, writeJsonFile } from "@/lib/services/blob-db"

const DOCS_FILE = path.join(process.cwd(), ".local-cmr-documents.json")

async function getDocuments(): Promise<any[]> {
  try {
    const parsed = await readJsonFile<any[]>(DOCS_FILE, [])
    if (Array.isArray(parsed)) return parsed
  } catch (e) {}
  return []
}

async function saveDocuments(docs: any[]): Promise<void> {
  try {
    await writeJsonFile(DOCS_FILE, docs)
  } catch (e) {}
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const list = await getDocuments()
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
  let list = await getDocuments()
  const initialLen = list.length
  list = list.filter((d: any) => d.id !== id && d.cmr_number !== id)

  if (list.length === initialLen) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  await saveDocuments(list)
  return NextResponse.json({ status: "deleted", id })
}
