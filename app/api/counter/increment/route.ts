import { NextResponse } from "next/server"
import { getDataPath } from "@/lib/server-paths"
import { mutateJsonFile } from "@/lib/services/blob-db"
import { createClient } from "@/lib/supabase/server"

const SETTINGS_FILE = getDataPath(".local-cmr-settings.json")

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = user.user_metadata?.role || user.app_metadata?.role || "user"
  if (role === "shipper" || role === "client" || role === "viewer") {
    return NextResponse.json({ error: "Forbidden: Unauthorized to increment counter" }, { status: 403 })
  }

  let nextVal = 5

  await mutateJsonFile(SETTINGS_FILE, {}, (settings: any) => {
    const current = typeof settings?.cmr_serial_counter === "number" ? settings.cmr_serial_counter : 5
    nextVal = current + 1
    return {
      ...(settings || {}),
      cmr_serial_counter: nextVal,
    }
  })

  return NextResponse.json({
    counter: nextVal,
    cmr_number: `NO - ${String(nextVal).padStart(3, "0")}`,
  })
}
