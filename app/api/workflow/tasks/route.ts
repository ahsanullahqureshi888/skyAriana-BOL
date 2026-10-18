import { NextRequest, NextResponse } from 'next/server'
import {
  getWorkflowTasks,
  createWorkflowTask,
  TaskFilter,
} from '@/lib/workflows/task-service'
import { emitWorkflowEvent } from '@/lib/workflows/workflow-engine'
import { TaskStatus, TaskPriority, TaskType } from '@/lib/types/workflow'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.getAll('status') as TaskStatus[]
    const priority = searchParams.getAll('priority') as TaskPriority[]
    const type = searchParams.getAll('type') as TaskType[]
    const assignedTo = searchParams.get('assignedTo') || undefined
    const assignedTeam = searchParams.get('assignedTeam') || undefined
    const bolNumber = searchParams.get('bolNumber') || undefined
    const shipmentId = searchParams.get('shipmentId') || undefined
    const customerName = searchParams.get('customerName') || undefined
    const search = searchParams.get('search') || undefined
    const isOverdue = searchParams.get('isOverdue') === 'true'
    const isBlocked = searchParams.get('isBlocked') === 'true'

    const filter: TaskFilter = {
      status: status.length > 0 ? status : undefined,
      priority: priority.length > 0 ? priority : undefined,
      type: type.length > 0 ? type : undefined,
      assignedTo,
      assignedTeam,
      bolNumber,
      shipmentId,
      customerName,
      search,
      isOverdue,
      isBlocked,
    }

    const tasks = await getWorkflowTasks(filter)
    return NextResponse.json({ success: true, tasks })
  } catch (error: any) {
    console.error('[API Workflow Tasks] GET error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Event emission trigger
    if (body.action === 'emitEvent' && body.event) {
      const result = await emitWorkflowEvent(body.event)
      return NextResponse.json({ success: true, result })
    }

    // Manual or rule-based task creation
    const { task, actor } = body
    if (!task || !task.title) {
      return NextResponse.json({ success: false, error: 'Task title is required' }, { status: 400 })
    }

    const result = await createWorkflowTask(task, actor || 'User')
    return NextResponse.json({ success: true, task: result.task, created: result.created })
  } catch (error: any) {
    console.error('[API Workflow Tasks] POST error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
