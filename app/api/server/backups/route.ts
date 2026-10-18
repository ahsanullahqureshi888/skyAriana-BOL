import { NextResponse } from "next/server"
import {
  createServerBackup,
  listServerBackups,
  restoreServerBackup,
  pruneServerBackups,
} from "@/lib/database/backup"
import { verifyServerToken, isServerAdminSetup } from "@/lib/server/auth"

export async function GET(request: Request) {
  try {
    const isSetup = await isServerAdminSetup()
    if (!isSetup) {
      return NextResponse.json({ success: true, backups: [] })
    }

    const authHeader = request.headers.get("authorization")
    const auth = await verifyServerToken(authHeader)

    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const backups = await listServerBackups()
    return NextResponse.json({ success: true, backups })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to list backups" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const auth = await verifyServerToken(authHeader)

    if (!auth.authenticated || (auth.role !== "admin" && auth.role !== "accounting")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized to create backups" },
        { status: 403 }
      )
    }

    const backup = await createServerBackup({
      actor: auth.username || "admin",
    })

    return NextResponse.json({ success: true, backup })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create backup" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const auth = await verifyServerToken(authHeader)

    if (!auth.authenticated || auth.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only administrators can restore backups" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { filename } = body

    if (!filename) {
      return NextResponse.json(
        { success: false, error: "Backup filename is required" },
        { status: 400 }
      )
    }

    const result = await restoreServerBackup(filename, {
      actor: auth.username || "admin",
    })

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to restore backup" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const auth = await verifyServerToken(authHeader)

    if (!auth.authenticated || auth.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const maxKeep = parseInt(searchParams.get("keep") || "10", 10)
    const deleted = await pruneServerBackups(maxKeep)

    return NextResponse.json({ success: true, deletedCount: deleted })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to prune backups" },
      { status: 500 }
    )
  }
}
