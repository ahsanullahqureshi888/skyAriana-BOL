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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user: any = null
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient()
    const { data, error: authError } = await supabase.auth.getUser()
    if (authError || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    user = data.user
  }

  const { id } = await params
  const list = await getDocuments()
  const found = list.find((d: any) => d.id === id || d.cmr_number === id)

  if (!found) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  const role = (user?.user_metadata?.role || user?.app_metadata?.role || request.headers.get("x-user-role") || "").toLowerCase()
  const shipperIdentity = user?.user_metadata?.shipper_name || user?.email || request.headers.get("x-shipper-name")

  if ((role === "shipper" || role === "client") && shipperIdentity) {
    const sFilter = shipperIdentity.trim().toLowerCase()
    const consignor = (found.consignor || found.shipper || found.shipper_name || "").toLowerCase()
    const cId = (found.client_id || "").toLowerCase()
    if (!consignor.includes(sFilter) && !sFilter.includes(consignor) && cId !== sFilter) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to access this document" }, { status: 403 })
    }
  }

  return NextResponse.json(found)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    return NextResponse.json({ error: "Forbidden: Unauthorized to delete documents" }, { status: 403 })
  }

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
