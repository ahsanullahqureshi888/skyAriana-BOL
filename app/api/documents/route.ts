import { NextResponse } from "next/server"
import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, writeJsonFile } from "@/lib/services/blob-db"
import { createClient } from "@/lib/supabase/server"

const DOCS_FILE = getDataPath(".local-cmr-documents.json")

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

export async function GET(request: Request) {
  let user: any = null
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient()
    const { data, error: authError } = await supabase.auth.getUser()
    if (authError || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    user = data.user
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.toLowerCase()
  const tag = searchParams.get("tag")?.toLowerCase()

  let list = await getDocuments()

  const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || searchParams.get("role") || "").toLowerCase()
  const shipperIdentity = user?.user_metadata?.shipper_name || user?.email || request.headers.get("x-shipper-name") || searchParams.get("shipper_name")

  if ((role === "shipper" || role === "client") && shipperIdentity) {
    const sFilter = shipperIdentity.trim().toLowerCase()
    list = list.filter((item: any) => {
      const consignor = (item.consignor || item.shipper || item.shipper_name || "").toLowerCase()
      const cId = (item.client_id || "").toLowerCase()
      return consignor.includes(sFilter) || sFilter.includes(consignor) || cId === sFilter
    })
  }

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
  let user: any = null
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient()
    const { data, error: authError } = await supabase.auth.getUser()
    if (authError || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    user = data.user
  }

  const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || "").toLowerCase()
  if (role === "shipper" || role === "client" || role === "viewer") {
    return NextResponse.json({ error: "Forbidden: Clients cannot create consignment documents directly" }, { status: 403 })
  }

  try {
    const doc = await request.json()
    const list = await getDocuments()
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

    await saveDocuments(list)
    return NextResponse.json({ status: "success", id: docId, cmr_number: doc.cmr_number, saved_at: nowStr })
  } catch (error) {
    console.error("[documents API] POST error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to save document" },
      { status: 500 }
    )
  }
}
