import { NextRequest, NextResponse } from 'next/server'
import {
  getDailyOperationsConfig,
  updateDailyOperationsConfig,
  getDailyTasks,
  createDailyTask,
  updateDailyTask,
  addCollectionNote,
  generateAutomaticDailyTasks,
  autoResolveDailyTasks,
  getAllDailyReports,
  generateDailyOperationsReport,
  finalizeDailyReport,
  generateDailyWhatsAppStatus,
} from '@/lib/daily-operations/daily-operations-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const department = searchParams.get('department')
    const assignedTo = searchParams.get('assignedTo')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')
    const carriedOverOnly = searchParams.get('carriedOverOnly') === 'true'
    const view = searchParams.get('view') // 'tasks' | 'summary' | 'reports' | 'config'

    const config = await getDailyOperationsConfig()

    if (view === 'config') {
      return NextResponse.json({ success: true, config })
    }

    if (view === 'reports') {
      const reports = await getAllDailyReports()
      return NextResponse.json({ success: true, reports })
    }

    const tasks = await getDailyTasks({
      status: status ? (status.includes(',') ? status.split(',') as any : status as any) : undefined,
      department: department as any,
      assignedTo: assignedTo || undefined,
      priority: priority as any,
      search: search || undefined,
      carriedOverOnly,
    })

    const reports = await getAllDailyReports()
    const latestReport = reports[0] || null

    return NextResponse.json({
      success: true,
      tasks,
      totalCount: tasks.length,
      latestReport,
      reportsCount: reports.length,
      config,
    })
  } catch (error: any) {
    console.error('[DAILY OPERATIONS GET ERROR]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, actor = 'Operations User' } = body

    // 1. Automatic Task Generation with Deduplication
    if (action === 'generate-tasks') {
      const autoGenResult = await generateAutomaticDailyTasks(actor)
      const resolvedCount = await autoResolveDailyTasks(actor)
      const tasks = await getDailyTasks()
      return NextResponse.json({
        success: true,
        createdCount: autoGenResult.createdCount,
        updatedCount: autoGenResult.updatedCount,
        resolvedCount,
        totalActiveTasks: autoGenResult.totalActiveTasks,
        tasks,
      })
    }

    // 2. Create Manual Task
    if (action === 'create-task') {
      const { taskData } = body
      if (!taskData || !taskData.title) {
        return NextResponse.json({ success: false, error: 'Task title is required' }, { status: 400 })
      }
      const task = await createDailyTask(taskData, actor)
      return NextResponse.json({ success: true, task })
    }

    // 3. Update Existing Task
    if (action === 'update-task') {
      const { id, updates } = body
      if (!id || !updates) {
        return NextResponse.json({ success: false, error: 'Task ID and updates are required' }, { status: 400 })
      }
      const task = await updateDailyTask(id, updates, actor)
      return NextResponse.json({ success: true, task })
    }

    // 4. Record Customer Collection Note / Follow-Up
    if (action === 'add-collection-note') {
      const { taskId, noteData } = body
      if (!taskId || !noteData) {
        return NextResponse.json({ success: false, error: 'Task ID and note data are required' }, { status: 400 })
      }
      const task = await addCollectionNote(taskId, noteData, actor)
      return NextResponse.json({ success: true, task })
    }

    // 5. Generate End-of-Day Status Report
    if (action === 'generate-report') {
      const { reportDate, managementNote, forceRegenerate } = body
      const report = await generateDailyOperationsReport(reportDate, actor, {
        managementNote,
        forceRegenerate: Boolean(forceRegenerate),
      })
      return NextResponse.json({ success: true, report })
    }

    // 6. Finalize Daily Status Report
    if (action === 'finalize-report') {
      const { reportId } = body
      if (!reportId) {
        return NextResponse.json({ success: false, error: 'Report ID is required' }, { status: 400 })
      }
      const report = await finalizeDailyReport(reportId, actor)
      return NextResponse.json({ success: true, report })
    }

    // 7. Update Daily Operations Settings
    if (action === 'update-config') {
      const { updates } = body
      if (!updates) {
        return NextResponse.json({ success: false, error: 'Updates object is required' }, { status: 400 })
      }
      const config = await updateDailyOperationsConfig(updates)
      return NextResponse.json({ success: true, config })
    }

    // 8. Generate WhatsApp Text
    if (action === 'whatsapp-status') {
      const { reportId, mode = 'SHORT', language = 'EN' } = body
      const allReports = await getAllDailyReports()
      const report = reportId ? allReports.find((r) => r.id === reportId) : allReports[0]
      if (!report) {
        return NextResponse.json({ success: false, error: 'No daily report available to format' }, { status: 404 })
      }
      const text = generateDailyWhatsAppStatus(report, mode, language)
      return NextResponse.json({ success: true, text })
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 })
  } catch (error: any) {
    console.error('[DAILY OPERATIONS POST ERROR]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
