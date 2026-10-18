import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs/promises"
import fsSync from "node:fs"
import path from "node:path"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const reportName = searchParams.get("file")
    const format = searchParams.get("format") || "json"

    if (!reportName) {
      return NextResponse.json({ success: false, error: "Report file name is required" }, { status: 400 })
    }

    const cleanBase = path.basename(reportName)
    const reportsDir = path.join(process.cwd(), "data", "restore-reports")
    const targetFile = path.join(reportsDir, format === "html" ? cleanBase.replace(/\.json$/, ".html") : cleanBase)

    if (!fsSync.existsSync(targetFile)) {
      return NextResponse.json({ success: false, error: "Report file not found" }, { status: 404 })
    }

    const content = await fs.readFile(targetFile)
    const contentType = format === "html" ? "text/html; charset=utf-8" : "application/json; charset=utf-8"

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${path.basename(targetFile)}"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to download report" },
      { status: 500 }
    )
  }
}
