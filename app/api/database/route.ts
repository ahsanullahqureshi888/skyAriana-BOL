import { NextResponse } from "next/server"
import {
  getDatabaseHealth,
  vacuumDatabase,
  exportFullDatabasePackage,
  restoreFullDatabasePackage,
} from "@/lib/services/database-manager"

export async function GET() {
  try {
    const health = await getDatabaseHealth()
    return NextResponse.json(health)
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to retrieve database health", details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const action = body.action || "vacuum"

    if (action === "vacuum") {
      const result = await vacuumDatabase()
      return NextResponse.json({
        success: true,
        message: "Database tables compacted and re-indexed successfully",
        result,
      })
    }

    if (action === "export") {
      const dump = await exportFullDatabasePackage()
      return NextResponse.json({
        success: true,
        data: dump,
      })
    }

    if (action === "restore") {
      const result = await restoreFullDatabasePackage(body.payload)
      return NextResponse.json({
        success: true,
        message: `Successfully restored ${result.restoredCount} database tables`,
        result,
      })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Database operation failed", details: error.message },
      { status: 500 }
    )
  }
}

