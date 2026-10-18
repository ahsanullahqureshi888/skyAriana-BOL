import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { getDataPath } from "@/lib/server-paths"
import { getLedgerSystemDb, saveLedgerSystemDb, syncToLegacyStorage } from "@/lib/services/ledger-db-service"

const BACKUP_DIR = getDataPath("backups")

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get("file")

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    if (fileName) {
      const sanitized = path.basename(fileName)
      const target = path.join(BACKUP_DIR, sanitized)
      if (!fs.existsSync(target)) {
        return NextResponse.json({ success: false, error: "Backup file not found" }, { status: 404 })
      }
      const content = fs.readFileSync(target, "utf-8")
      return new NextResponse(content, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${sanitized}"`,
        },
      })
    }

    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".json"))
    const backups = files.map((f) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f))
      return {
        filename: f,
        size: stat.size,
        created_at: stat.mtime.toISOString(),
      }
    })

    backups.sort((a, b) => b.created_at.localeCompare(a.created_at))

    return NextResponse.json({ success: true, backups })
  } catch (error: any) {
    console.error("[api/accounting/backup GET] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, filename, backup_payload } = body

    if (action === "create") {
      const db = await getLedgerSystemDb()
      const ts = new Date().toISOString().replace(/[:.]/g, "-")
      const fn = `manual-backup-${ts}.json`
      if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
      fs.writeFileSync(path.join(BACKUP_DIR, fn), JSON.stringify(db, null, 2))
      return NextResponse.json({ success: true, filename: fn, message: "Backup created successfully" })
    }

    if (action === "restore") {
      let payloadToRestore = backup_payload

      if (!payloadToRestore && filename) {
        const sanitized = path.basename(filename)
        const target = path.join(BACKUP_DIR, sanitized)
        if (!fs.existsSync(target)) {
          return NextResponse.json({ success: false, error: "Backup file not found" }, { status: 404 })
        }
        payloadToRestore = JSON.parse(fs.readFileSync(target, "utf-8"))
      }

      if (!payloadToRestore || !Array.isArray(payloadToRestore.accounts)) {
        return NextResponse.json({ success: false, error: "Invalid backup payload schema" }, { status: 400 })
      }

      // Create rollback backup first
      const current = await getLedgerSystemDb()
      const rollbackName = `rollback-before-restore-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
      fs.writeFileSync(path.join(BACKUP_DIR, rollbackName), JSON.stringify(current, null, 2))

      // Save restored database
      await saveLedgerSystemDb(payloadToRestore)
      await syncToLegacyStorage(payloadToRestore)

      return NextResponse.json({
        success: true,
        message: "Database restored successfully",
        accountsRestored: payloadToRestore.accounts.length,
        transactionsRestored: (payloadToRestore.ledger_transactions || []).length,
      })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("[api/accounting/backup POST] error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
