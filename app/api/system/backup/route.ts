import { NextResponse } from "next/server"
import { readJsonFile } from "@/lib/services/blob-db"
import { getDataPath } from "@/lib/server-paths"
import fs from "fs"
import path from "path"
import AdmZip from "adm-zip"
import crypto from "crypto"

function getChecksum(data: string | Buffer): string {
  return crypto.createHash("md5").update(data).digest("hex")
}

export async function GET() {
  try {
    const filesToBackup = [
      ".local-bols.json",
      ".local-invoices.json",
      ".local-bol-account-ledgers.json",
      ".local-settings.json"
    ]

    const zip = new AdmZip()
    const checksums: Record<string, string> = {}
    let bolsCount = 0
    let invoicesCount = 0
    let ledgersCount = 0
    let accountsCount = 0

    for (const filename of filesToBackup) {
      const p = getDataPath(filename)
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p)
        zip.addFile(filename, content)
        checksums[filename] = getChecksum(content)

        // Count records for manifest
        try {
          const parsed = JSON.parse(content.toString("utf8"))
          if (filename === ".local-bols.json") bolsCount = Array.isArray(parsed) ? parsed.length : 0
          if (filename === ".local-invoices.json") invoicesCount = Array.isArray(parsed) ? parsed.length : 0
          if (filename === ".local-bol-account-ledgers.json") {
            const records = parsed.ledgerRecords || {}
            ledgersCount = Object.values(records).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
            accountsCount = Object.keys(records).length
          }
        } catch (e) {}
      }
    }

    // Build Manifest
    let deviceId = "unknown"
    let deviceName = "Unknown Device"
    try {
      const deviceFile = getDataPath(".local-device.json")
      if (fs.existsSync(deviceFile)) {
        const deviceData = JSON.parse(fs.readFileSync(deviceFile, "utf-8"))
        deviceId = deviceData.deviceId || deviceId
        deviceName = deviceData.deviceName || deviceName
      }
    } catch (e) {}

    const manifest = {
      version: "5.1.0",
      schemaVersion: 3,
      createdAt: new Date().toISOString(),
      deviceId,
      deviceName,
      recordCounts: {
        bols: bolsCount,
        invoices: invoicesCount,
        ledgers: ledgersCount,
        accounts: accountsCount
      },
      checksums
    }

    zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2), "utf8"))

    const zipBuffer = zip.toBuffer()
    const filename = `Sky-Ariana-Backup-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`

    const response = new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    })

    return response
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
