import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const SETTINGS_FILE = path.join(process.cwd(), ".local-cmr-settings.json")

function getCounter(): number {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8")
      const parsed = JSON.parse(data)
      if (parsed && typeof parsed.cmr_serial_counter === "number") {
        return parsed.cmr_serial_counter
      }
    }
  } catch (e) {}
  return 5
}

function saveCounter(val: number) {
  try {
    let settings: any = {}
    if (fs.existsSync(SETTINGS_FILE)) {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"))
    }
    settings.cmr_serial_counter = val
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8")
  } catch (e) {}
}

export async function GET() {
  const currentVal = getCounter()
  return NextResponse.json({
    counter: currentVal,
    current_formatted: `NO - ${String(currentVal).padStart(3, "0")}`,
    next_counter: currentVal + 1,
    next_formatted: `NO - ${String(currentVal + 1).padStart(3, "0")}`,
  })
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const qVal = searchParams.get("value")
    let value = qVal ? parseInt(qVal, 10) : null

    if (value === null || isNaN(value)) {
      const body = await request.json().catch(() => ({}))
      value = body.value ? parseInt(body.value, 10) : getCounter()
    }

    saveCounter(value)
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
