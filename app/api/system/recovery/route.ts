import { NextResponse } from 'next/server'
import {
  runDeepDatabaseHealthScan,
  createDatabaseBackup,
  verifyBackupFile,
  compareCurrentWithBackup,
  executeGuidedRestore,
  findEmergencyRecoveryPoints,
  getRecoveryConfig,
  updateRecoveryConfig,
  getBackupCatalog,
  togglePinBackup,
  deleteBackupItem,
} from '@/lib/recovery/disaster-recovery-service'

export async function GET(req: Request) {
  try {
    const [healthReport, config, catalog, emergencyPoints] = await Promise.all([
      runDeepDatabaseHealthScan(),
      getRecoveryConfig(),
      getBackupCatalog(),
      findEmergencyRecoveryPoints(),
    ])

    return NextResponse.json({
      success: true,
      health: healthReport,
      config,
      backups: catalog,
      emergency: emergencyPoints,
    })
  } catch (error: any) {
    console.error('[Recovery API GET Error]:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch recovery data' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const role = (req.headers.get('x-user-role') || '').toLowerCase().trim()
    // Require admin access for recovery operations
    if (role && role !== 'admin' && role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin authorization required' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const action = body.action || 'health-scan'

    if (action === 'backup') {
      const backup = await createDatabaseBackup({
        type: body.type || 'QUICK',
        note: body.note,
        pinned: Boolean(body.pinned),
        actor: body.actor || 'Admin User',
      })
      return NextResponse.json({
        success: true,
        message: `Backup "${backup.fileName}" created successfully.`,
        backup,
      })
    }

    if (action === 'verify') {
      if (!body.backupId) {
        return NextResponse.json({ success: false, error: 'Missing backupId' }, { status: 400 })
      }
      const verification = await verifyBackupFile(body.backupId)
      return NextResponse.json({
        success: true,
        verification,
      })
    }

    if (action === 'compare') {
      if (!body.backupId) {
        return NextResponse.json({ success: false, error: 'Missing backupId' }, { status: 400 })
      }
      const comparison = await compareCurrentWithBackup(body.backupId)
      return NextResponse.json({
        success: true,
        comparison,
      })
    }

    if (action === 'restore') {
      if (!body.backupId || body.confirmationText !== 'RESTORE') {
        return NextResponse.json(
          { success: false, error: 'Missing backupId or confirmation was not "RESTORE"' },
          { status: 400 }
        )
      }
      const result = await executeGuidedRestore({
        backupId: body.backupId,
        confirmationText: body.confirmationText,
        actor: body.actor || 'Admin User',
      })
      return NextResponse.json({
        success: true,
        message: `Database successfully restored. Safety snapshot created: ${result.preRestoreBackupFile}`,
        result,
      })
    }

    if (action === 'health-scan') {
      const health = await runDeepDatabaseHealthScan()
      return NextResponse.json({
        success: true,
        health,
      })
    }

    if (action === 'pin') {
      if (!body.backupId) {
        return NextResponse.json({ success: false, error: 'Missing backupId' }, { status: 400 })
      }
      const isPinned = await togglePinBackup(body.backupId)
      return NextResponse.json({
        success: true,
        isPinned,
        message: isPinned ? 'Backup pinned' : 'Backup unpinned',
      })
    }

    if (action === 'delete') {
      if (!body.backupId) {
        return NextResponse.json({ success: false, error: 'Missing backupId' }, { status: 400 })
      }
      await deleteBackupItem(body.backupId)
      return NextResponse.json({
        success: true,
        message: 'Backup deleted',
      })
    }

    if (action === 'config') {
      const updated = await updateRecoveryConfig(body.updates || {})
      return NextResponse.json({
        success: true,
        config: updated,
      })
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error: any) {
    console.error('[Recovery API POST Error]:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Operation failed' },
      { status: 500 }
    )
  }
}
