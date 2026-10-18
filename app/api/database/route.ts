import { NextResponse } from "next/server"
import {
  getDatabaseHealth,
  vacuumDatabase,
  exportFullDatabasePackage,
  restoreFullDatabasePackage,
} from "@/lib/services/database-manager"

export async function GET() {
    // Auto-injected Cloud Auth Check
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = require('@/lib/supabase/server');
      const supabaseAuth = await createClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

  try {
    const health = await getDatabaseHealth()
    return NextResponse.json(health)
  } catch (error: any) {
    console.error("[database API] GET error:", error)
    return NextResponse.json(
      { error: "Failed to retrieve database health" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
    // Auto-injected Cloud Auth Check
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = require('@/lib/supabase/server');
      const supabaseAuth = await createClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
      if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

  try {
    const role = (req.headers.get("x-user-role") || "").toLowerCase().trim()
    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden: Admin privileges required for database operations" }, { status: 403 })
    }
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
      const result = await restoreFullDatabasePackage(body.payload, { forceZeroRecords: Boolean(body.forceZeroRecords) })
      return NextResponse.json({
        success: true,
        message: `Successfully restored ${result.restoredCount} database tables`,
        result,
      })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error: any) {
    console.error("[database API] POST error:", error)
    return NextResponse.json(
      { error: "Database operation failed" },
      { status: 500 }
    )
  }
}
