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

export async function POST() {
  const currentVal = await getCounter()
  const nextVal = currentVal + 1
  await saveCounter(nextVal)

  return NextResponse.json({
    counter: nextVal,
    cmr_number: `NO - ${String(nextVal).padStart(3, "0")}`,
  })
}
