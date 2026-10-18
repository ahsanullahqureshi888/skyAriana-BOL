import { NextRequest, NextResponse } from 'next/server'
import {
  getWorkflowTaskById,
  updateWorkflowTask,
  deleteWorkflowTask,
  getTaskHistory,
  addWorkflowTaskComment,
  toggleWorkflowTaskChecklistItem,
} from '@/lib/workflows/task-service'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const task = await getWorkflowTaskById(id)
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })
    }

    const history = await getTaskHistory(id)
    return NextResponse.json({ success: true, task, history })
  } catch (error: any) {
    console.error('[API Workflow Task ID] GET error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const body = await req.json()
    const { updates, actor, reason, action, comment, checklistItem } = body

    // 1. Comment sub-action
    if (action === 'addComment' && comment) {
      const updated = await addWorkflowTaskComment(id, comment)
      return NextResponse.json({ success: !!updated, task: updated })
    }

    // 2. Checklist sub-action
    if (action === 'toggleChecklist' && checklistItem) {
      const updated = await toggleWorkflowTaskChecklistItem(
        id,
        checklistItem.itemId,
        checklistItem.completed,
        actor || 'User'
      )
      return NextResponse.json({ success: !!updated, task: updated })
    }

    // 3. Regular task update (status, assignment, priority, dueDate, etc.)
    const result = await updateWorkflowTask(id, updates || {}, actor || 'User', reason)
    return NextResponse.json({ success: result.updated, task: result.task })
  } catch (error: any) {
    console.error('[API Workflow Task ID] PATCH error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 409 })
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const { searchParams } = new URL(req.url)
    const hardDelete = searchParams.get('hard') === 'true'
    const actor = searchParams.get('actor') || 'User'

    const result = await deleteWorkflowTask(id, actor, hardDelete)
    return NextResponse.json({ success: result.success })
  } catch (error: any) {
    console.error('[API Workflow Task ID] DELETE error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
