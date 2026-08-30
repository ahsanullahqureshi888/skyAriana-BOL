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

export async function POST() {
  const currentVal = getCounter()
  const nextVal = currentVal + 1
  saveCounter(nextVal)

  return NextResponse.json({
    counter: nextVal,
    cmr_number: `NO - ${String(nextVal).padStart(3, "0")}`,
  })
}
