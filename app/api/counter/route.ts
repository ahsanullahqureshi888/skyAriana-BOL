import { NextResponse } from "next/server"
import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, mutateJsonFile } from "@/lib/services/blob-db"
import { createClient } from "@/lib/supabase/server"

const SETTINGS_FILE = getDataPath(".local-cmr-settings.json")

async function getCounter(): Promise<number> {
  try {
    const parsed = await readJsonFile<any>(SETTINGS_FILE, null)
    if (parsed && typeof parsed.cmr_serial_counter === "number") {
      return parsed.cmr_serial_counter
    }
  } catch (e) {}
  return 5
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const currentVal = await getCounter()
  return NextResponse.json({
    counter: currentVal,
    current_formatted: `NO - ${String(currentVal).padStart(3, "0")}`,
    next_counter: currentVal + 1,
    next_formatted: `NO - ${String(currentVal + 1).padStart(3, "0")}`,
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = user.user_metadata?.role || user.app_metadata?.role || "user"
  if (role === "shipper" || role === "client" || role === "viewer") {
    return NextResponse.json({ error: "Forbidden: Unauthorized to set counter" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const qVal = searchParams.get("value")
    let value = qVal ? parseInt(qVal, 10) : null

    if (value === null || isNaN(value)) {
      const body = await request.json().catch(() => ({}))
      value = body.value ? parseInt(body.value, 10) : await getCounter()
    }

    await mutateJsonFile(SETTINGS_FILE, {}, (settings: any) => {
      return {
        ...(settings || {}),
        cmr_serial_counter: value,
      }
    })

    return NextResponse.json({
      counter: value,
      cmr_number: `NO - ${String(value).padStart(3, "0")}`,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to set counter" },
      { status: 500 }
    )
  }
}
