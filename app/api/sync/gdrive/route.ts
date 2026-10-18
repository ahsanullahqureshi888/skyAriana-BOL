/**
 * Sky Ariana BOL — Google Drive Automatic Sync API Route
 * Provides REST endpoints for live status, queue management, conflict resolution, and diagnostics.
 */

import { NextResponse } from "next/server"
import { runSyncCycle } from "@/lib/sync/sync-engine"
import { getSyncProgress, getSyncSettings, saveSyncSettings } from "@/lib/sync/sync-state"
import { getQueueStats, retryAllFailedItems } from "@/lib/sync/sync-queue"
import { getDeviceProfile, updateDeviceName } from "@/lib/sync/device"
import { getConflicts, resolveConflict } from "@/lib/sync/conflict-resolver"
import { getTombstones, restoreRecord, permanentlyDelete } from "@/lib/sync/tombstones"
import { isGoogleDriveConnected, saveGDriveCredentials } from "@/lib/sync/gdrive-client"
import type { SyncDiagnosticsReport } from "@/lib/sync/types"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action") || "status"

    const device = getDeviceProfile()
    const progress = getSyncProgress()
    const queueStats = getQueueStats()
    const conflicts = getConflicts()
    const settings = getSyncSettings()

    if (action === "status") {
      return NextResponse.json({
        success: true,
        connected: isGoogleDriveConnected(),
        device,
        progress,
        queueStats,
        conflictsCount: conflicts.length,
        settings,
      })
    }

    if (action === "conflicts") {
      return NextResponse.json({
        success: true,
        conflicts,
      })
    }

    if (action === "tombstones") {
      const tombstones = getTombstones()
      return NextResponse.json({
        success: true,
        tombstones,
      })
    }

    if (action === "settings") {
      return NextResponse.json({
        success: true,
        settings,
      })
    }

    if (action === "diagnostics") {
      const report: SyncDiagnosticsReport = {
        timestamp: new Date().toISOString(),
        connection: isGoogleDriveConnected() ? "OK" : "OFFLINE",
        authentication: isGoogleDriveConnected() ? "AUTHENTICATED" : "NOT_CONFIGURED",
        driveFolder: "OK",
        pendingQueueCount: queueStats.pending,
        failedOperationsCount: queueStats.failed,
        conflictsCount: conflicts.length,
        lastSuccessfulSync: progress.lastSyncTime || null,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        platform: device.platform,
        appVersion: device.appVersion,
        schemaVersion: 2,
        storageMetrics: {
          localRecordCount: 0,
          cloudRecordCount: 0,
          queueSize: queueStats.pending + queueStats.failed,
        },
      }

      return NextResponse.json({
        success: true,
        report,
      })
    }

    return NextResponse.json({ success: false, error: `Unknown GET action: ${action}` }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const action = body.action || "trigger"

    if (action === "trigger") {
      const force = !!body.force
      const result = await runSyncCycle(force)
      return NextResponse.json({
        success: result.success,
        message: result.message,
        conflictsCount: result.conflictsCount,
        uploadedCount: result.uploadedCount,
        downloadedCount: result.downloadedCount,
      })
    }

    if (action === "settings") {
      const updated = saveSyncSettings(body.settings || {})
      return NextResponse.json({
        success: true,
        settings: updated,
      })
    }

    if (action === "rename-device") {
      const newName = body.deviceName || ""
      const updatedDevice = updateDeviceName(newName)
      return NextResponse.json({
        success: true,
        device: updatedDevice,
      })
    }

    if (action === "resolve-conflict") {
      const { conflictId, strategy, customData } = body
      const device = getDeviceProfile()
      const resolved = resolveConflict(conflictId, {
        strategy,
        customData,
        resolvedByDevice: device.deviceId,
      })
      return NextResponse.json({
        success: true,
        resolved,
      })
    }

    if (action === "restore-tombstone") {
      const { recordId } = body
      const restoredData = restoreRecord(recordId)
      return NextResponse.json({
        success: !!restoredData,
        data: restoredData,
      })
    }

    if (action === "delete-tombstone") {
      const { recordId } = body
      permanentlyDelete(recordId)
      return NextResponse.json({ success: true })
    }

    if (action === "retry-failed") {
      const count = retryAllFailedItems()
      return NextResponse.json({ success: true, retriedCount: count })
    }

    if (action === "save-credentials") {
      saveGDriveCredentials(body.credentials || {})
      return NextResponse.json({ success: true, connected: isGoogleDriveConnected() })
    }

    return NextResponse.json({ success: false, error: `Unknown POST action: ${action}` }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
