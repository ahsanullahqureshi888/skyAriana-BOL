import { NextResponse } from "next/server"
import { getAllAccounts, saveAccounts } from "@/lib/services/invoice-storage-service"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({ data: await getAllAccounts(), source: "local" })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const accounts = Array.isArray(body.accounts) ? body.accounts : []
    const saved = await saveAccounts(accounts)
    return NextResponse.json({ success: true, data: saved })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to save accounts" },
      { status: 400 }
    )
  }
}
