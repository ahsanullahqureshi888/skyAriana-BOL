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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.toLowerCase()
  const tag = searchParams.get("tag")?.toLowerCase()

  let list = getDocuments()

  if (q) {
    list = list.filter((item: any) => {
      const haystack = (
        (item.cmr_number || "") + " " +
        (item.consignor || "") + " " +
        (item.consignee || "") + " " +
        (item.origin || "") + " " +
        (item.destination || "") + " " +
        (item.commodity || "")
      ).toLowerCase()
      return haystack.includes(q)
    })
  }

  if (tag) {
    if (tag === "kandahar") {
      list = list.filter((item: any) => ((item.origin || "") + (item.consignor || "")).toLowerCase().includes("kandahar"))
    } else if (tag === "india") {
      list = list.filter((item: any) => ((item.destination || "") + (item.consignee || "")).toLowerCase().includes("india") || (item.destination || "").toLowerCase().includes("delhi"))
    } else if (tag === "dispatched") {
      list = list.filter((item: any) => (item.status || "").toLowerCase().includes("dispatched"))
    }
  }

  return NextResponse.json(list)
}

export async function POST(request: Request) {
  try {
    const doc = await request.json()
    const list = getDocuments()
    const docId = doc.id || `doc_${Date.now()}`
    const nowStr = new Date().toLocaleString([], { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })

    const existingIndex = list.findIndex((d: any) => d.id === docId || (doc.cmr_number && d.cmr_number === doc.cmr_number))

    const docRecord = {
      ...doc,
      id: docId,
      saved_at: doc.saved_at || nowStr,
    }

    if (existingIndex !== -1) {
      list[existingIndex] = { ...list[existingIndex], ...docRecord }
    } else {
      list.unshift(docRecord)
    }

    saveDocuments(list)
    return NextResponse.json({ status: "success", id: docId, cmr_number: doc.cmr_number, saved_at: nowStr })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to save document" },
      { status: 500 }
    )
  }
}
