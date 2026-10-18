import { NextRequest, NextResponse } from "next/server"
import path from "node:path"
import fsSync from "node:fs"
import {
  getProtectionDashboardData,
  generateBackupHealthReport,
  getBackupAgePolicy,
  saveBackupAgePolicy,
  invalidateProtectionDashboardCache,
} from "@/lib/backup/backup-protection-service"
import {
  runQuickVerify,
  runDeepVerify,
  runPeriodicRecoveryDrill,
  rebuildBackupCatalogFromDisk,
  evaluateMissedBackupsAndCatchUp,
  cleanupStaleSandboxesAndInterruptedJobs,
} from "@/lib/backup/backup-audit-runner"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const data = await getProtectionDashboardData()
    const agePolicy = await getBackupAgePolicy()
    return NextResponse.json({ success: true, data, agePolicy })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load protection operations data" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = body.action
    const actor = body.actor || "Operations Operator"

    if (!action) {
      return NextResponse.json({ success: false, error: "Missing required 'action' field." }, { status: 400 })
    }

    // Invalidate cached protection dashboard on state-changing operations
    invalidateProtectionDashboardCache()

    switch (action) {
      case "drill": {
        const result = await runPeriodicRecoveryDrill(body.backupId || body.filePath, actor)
        return NextResponse.json({ success: result.success, result })
      }

      case "quick_verify": {
        const target = body.backupId || body.filePath
        if (!target) {
          return NextResponse.json({ success: false, error: "Target backupId or filePath is required." }, { status: 400 })
        }
        const result = await runQuickVerify(target, actor)
        return NextResponse.json({ success: result.valid, result })
      }

      case "deep_verify": {
        const target = body.backupId || body.filePath
        if (!target) {
          return NextResponse.json({ success: false, error: "Target backupId or filePath is required." }, { status: 400 })
        }
        const result = await runDeepVerify(target, actor)
        return NextResponse.json({ success: result.valid, result })
      }

      case "rebuild_catalog": {
        const result = await rebuildBackupCatalogFromDisk(body.customFolder)
        return NextResponse.json({ success: true, result })
      }

      case "catch_up": {
        const result = await evaluateMissedBackupsAndCatchUp()
        return NextResponse.json({ success: true, result })
      }

      case "report": {
        const result = await generateBackupHealthReport()
        return NextResponse.json({
          success: true,
          report: result.reportJson,
          savedJsonPath: result.savedJsonPath,
          savedHtmlPath: result.savedHtmlPath,
        })
      }

      case "age_policy": {
        const policy = await saveBackupAgePolicy(body.policy || {})
        return NextResponse.json({ success: true, policy })
      }

      case "cleanup_sandboxes": {
        const result = await cleanupStaleSandboxesAndInterruptedJobs()
        return NextResponse.json({ success: true, result })
      }

      case "open_folder": {
        let folderToOpen = path.join(process.cwd(), "data", "backups")
        if (body.filePath && typeof body.filePath === "string") {
          const abs = path.isAbsolute(body.filePath) ? body.filePath : path.join(process.cwd(), body.filePath)
          if (fsSync.existsSync(abs)) {
            const stat = fsSync.statSync(abs)
            folderToOpen = stat.isDirectory() ? abs : path.dirname(abs)
          }
        }
        if (process.platform === "win32") {
          try {
            const { spawn } = await import("node:child_process")
            spawn("explorer.exe", [folderToOpen], { detached: true, stdio: "ignore" }).unref()
          } catch (e) {
            console.error("Failed to spawn explorer:", e)
          }
        }
        return NextResponse.json({ success: true, openedFolder: folderToOpen })
      }

      default:
        return NextResponse.json({ success: false, error: `Unrecognized action '${action}'.` }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Operation action failed" },
      { status: 500 }
    )
  }
}
