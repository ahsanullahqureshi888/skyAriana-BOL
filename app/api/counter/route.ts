import { NextResponse } from "next/server"
import path from "path"
import { readJsonFile, writeJsonFile } from "@/lib/services/blob-db"

const SETTINGS_FILE = path.join(process.cwd(), ".local-cmr-settings.json")

async function getCounter(): Promise<number> {
  try {
    const parsed = await readJsonFile<any>(SETTINGS_FILE, null)
    if (parsed && typeof parsed.cmr_serial_counter === "number") {
      return parsed.cmr_serial_counter
    }
  } catch (e) {}
  return 5
}

async function saveCounter(val: number): Promise<void> {
  try {
    const settings = await readJsonFile<any>(SETTINGS_FILE, {})
    settings.cmr_serial_counter = val
    await writeJsonFile(SETTINGS_FILE, settings)
  } catch (e) {}
}

export async function GET() {
  const currentVal = await getCounter()
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
      value = body.value ? parseInt(body.value, 10) : await getCounter()
    }

    await saveCounter(value)
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
