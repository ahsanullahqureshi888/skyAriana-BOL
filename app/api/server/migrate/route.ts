import { NextResponse } from "next/server"
import { migrateToLocalServer } from "@/lib/server/migration"
import { verifyServerToken } from "@/lib/server/auth"

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const auth = await verifyServerToken(authHeader)

    if (!auth.authenticated || auth.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only administrators can trigger server data migration." },
        { status: 403 }
      )
    }

    const result = await migrateToLocalServer(auth.username || "admin")
    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[Server Migration API] Error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Migration failed" },
      { status: 500 }
    )
  }
}
