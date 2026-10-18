import path from 'path'
import { mutateJsonFile, readJsonFile } from '@/lib/services/blob-db'
import {
  WorkflowTask,
  TaskStatus,
  TaskPriority,
  TaskType,
  WorkflowRule,
  WorkflowTemplate,
  TaskHistoryItem,
  WorkflowSummaryMetrics,
  TaskChecklistItem,
  TaskComment,
} from '@/lib/types/workflow'
import {
  DEFAULT_WORKFLOW_RULES,
  DEFAULT_WORKFLOW_TEMPLATES,
  computeTaskFingerprint,
} from './workflow-rules'

const TASKS_FILE = path.join(process.cwd(), '.local-workflow-tasks.json')
const RULES_FILE = path.join(process.cwd(), '.local-workflow-rules.json')
const TEMPLATES_FILE = path.join(process.cwd(), '.local-workflow-templates.json')
const HISTORY_FILE = path.join(process.cwd(), '.local-workflow-history.json')

export interface TaskFilter {
  status?: TaskStatus | TaskStatus[]
  priority?: TaskPriority | TaskPriority[]
  type?: TaskType | TaskType[]
  assignedTo?: string
  assignedTeam?: string
  bolNumber?: string
  shipmentId?: string
  customerName?: string
  search?: string
  isOverdue?: boolean
  isBlocked?: boolean
}

// Generate human-friendly task numbering: TSK-2026-0001
function formatTaskNumber(seq: number): string {
  const year = new Date().getFullYear()
  const padded = String(seq).padStart(4, '0')
  return `TSK-${year}-${padded}`
}

export async function getWorkflowTasks(filter?: TaskFilter): Promise<WorkflowTask[]> {
  const tasks = await readJsonFile<WorkflowTask[]>(TASKS_FILE, [])
  const now = new Date().toISOString()
  const todayStr = now.split('T')[0]

  let results = tasks.map((task) => {
    // Check if task dependencies are completed
    let isBlocked = false
    let blockedReason = task.blockedReason

    if (task.dependencies && task.dependencies.length > 0) {
      const pendingDeps = tasks.filter(
        (t) => task.dependencies?.includes(t.id) && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
      )
      if (pendingDeps.length > 0) {
        isBlocked = true
        blockedReason = `Waiting on: ${pendingDeps.map((d) => d.taskNumber || d.title).join(', ')}`
      }
    }

    let status = task.status
    if (isBlocked && status === 'PENDING') {
      status = 'BLOCKED'
    } else if (!isBlocked && status === 'BLOCKED') {
      status = 'PENDING'
      blockedReason = undefined
    }

    return {
      ...task,
      status,
      blockedReason,
    }
  })

  if (!filter) return results

  if (filter.status) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status]
    results = results.filter((t) => statuses.includes(t.status))
  }

  if (filter.priority) {
    const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority]
    results = results.filter((t) => priorities.includes(t.priority))
  }

  if (filter.type) {
    const types = Array.isArray(filter.type) ? filter.type : [filter.type]
    results = results.filter((t) => types.includes(t.type))
  }

  if (filter.assignedTo) {
    const a = filter.assignedTo.toLowerCase()
    results = results.filter((t) => t.assignedTo && t.assignedTo.toLowerCase().includes(a))
  }

  if (filter.assignedTeam) {
    results = results.filter((t) => t.assignedTeam === filter.assignedTeam)
  }

  if (filter.bolNumber) {
    const b = filter.bolNumber.toLowerCase()
    results = results.filter((t) => t.bolNumber && t.bolNumber.toLowerCase().includes(b))
  }

  if (filter.shipmentId) {
    results = results.filter((t) => t.shipmentId === filter.shipmentId)
  }

  if (filter.customerName) {
    const c = filter.customerName.toLowerCase()
    results = results.filter((t) => t.customerName && t.customerName.toLowerCase().includes(c))
  }

  if (filter.isBlocked) {
    results = results.filter((t) => t.status === 'BLOCKED')
  }

  if (filter.isOverdue) {
    results = results.filter(
      (t) =>
        t.status !== 'COMPLETED' &&
        t.status !== 'CANCELLED' &&
        t.dueDate &&
        t.dueDate < todayStr
    )
  }

  if (filter.search) {
    const q = filter.search.toLowerCase().trim()
    results = results.filter(
      (t) =>
        t.taskNumber.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.bolNumber && t.bolNumber.toLowerCase().includes(q)) ||
        (t.containerNo && t.containerNo.toLowerCase().includes(q)) ||
        (t.customerName && t.customerName.toLowerCase().includes(q)) ||
        (t.assignedTo && t.assignedTo.toLowerCase().includes(q))
    )
  }

  return results
}

export async function getWorkflowTaskById(id: string): Promise<WorkflowTask | null> {
  const tasks = await readJsonFile<WorkflowTask[]>(TASKS_FILE, [])
  const found = tasks.find((t) => t.id === id)
  return found ? structuredClone(found) : null
}

export async function logTaskHistory(item: Omit<TaskHistoryItem, 'id' | 'timestamp'>): Promise<void> {
  const entry: TaskHistoryItem = {
    ...item,
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  }
  await mutateJsonFile<TaskHistoryItem[]>(HISTORY_FILE, [], (hist) => {
    return [...hist, entry]
  })
}

export async function getTaskHistory(taskId: string): Promise<TaskHistoryItem[]> {
  const history = await readJsonFile<TaskHistoryItem[]>(HISTORY_FILE, [])
  return history
    .filter((h) => h.taskId === taskId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export async function createWorkflowTask(
  input: Partial<WorkflowTask>,
  actor = 'System'
): Promise<{ task: WorkflowTask; created: boolean }> {
  let createdTask: WorkflowTask | null = null
  let isNew = false

  await mutateJsonFile<WorkflowTask[]>(TASKS_FILE, [], (tasks) => {
    // 1. Check idempotency fingerprint if present
    if (input.fingerprint) {
      const existing = tasks.find((t) => t.fingerprint === input.fingerprint)
      if (existing) {
        createdTask = existing
        return tasks // No-op, zero duplicates!
      }
    }

    // 2. Generate new task identity
    const now = new Date().toISOString()
    const taskNumber = input.taskNumber || formatTaskNumber(tasks.length + 1)
    const id = input.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    // Evaluate initial blocked status
    let initialStatus: TaskStatus = input.status || 'PENDING'
    let blockedReason: string | undefined = undefined

    if (input.dependencies && input.dependencies.length > 0) {
      const blockingDeps = tasks.filter(
        (t) => input.dependencies?.includes(t.id) && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
      )
      if (blockingDeps.length > 0) {
        initialStatus = 'BLOCKED'
        blockedReason = `Waiting on: ${blockingDeps.map((d) => d.taskNumber || d.title).join(', ')}`
      }
    }

    const newTask: WorkflowTask = {
      id,
      taskNumber,
      fingerprint: input.fingerprint,
      title: input.title || 'Untitled Task',
      description: input.description || '',
      type: input.type || 'OTHER',
      priority: input.priority || 'NORMAL',
      status: initialStatus,
      sourceModule: input.sourceModule || 'MANUAL',
      assignedTo: input.assignedTo,
      assignedTeam: input.assignedTeam || 'Operations',
      dueDate: input.dueDate,
      dueTime: input.dueTime,
      bolNumber: input.bolNumber,
      shipmentId: input.shipmentId,
      bookingNo: input.bookingNo,
      containerNo: input.containerNo,
      companyId: input.companyId,
      customerName: input.customerName,
      destination: input.destination,
      route: input.route,
      dependencies: input.dependencies || [],
      blockedReason,
      autoCompleteRule: input.autoCompleteRule,
      checklist: input.checklist || [],
      comments: input.comments || [],
      version: 1,
      ruleId: input.ruleId,
      createdBy: actor,
      createdAt: now,
      updatedAt: now,
    }

    tasks.unshift(newTask)
    createdTask = newTask
    isNew = true
    return tasks
  })

  if (isNew && createdTask) {
    await logTaskHistory({
      taskId: (createdTask as WorkflowTask).id,
      action: 'CREATED',
      actorName: actor,
      details: `Created task ${(createdTask as WorkflowTask).taskNumber}: ${(createdTask as WorkflowTask).title}`,
      newValue: JSON.stringify({ priority: (createdTask as WorkflowTask).priority, status: (createdTask as WorkflowTask).status }),
    })
  }

  return { task: createdTask!, created: isNew }
}

export async function updateWorkflowTask(
  id: string,
  updates: Partial<WorkflowTask>,
  actor = 'System',
  reason?: string
): Promise<{ task: WorkflowTask; updated: boolean }> {
  let updatedTask: WorkflowTask | null = null
  let isUpdated = false

  await mutateJsonFile<WorkflowTask[]>(TASKS_FILE, [], (tasks) => {
    const index = tasks.findIndex((t) => t.id === id)
    if (index === -1) return tasks

    const prev = tasks[index]

    // Optimistic locking version validation: if updates has version and doesn't match prev.version, reject
    if (typeof updates.version === 'number' && updates.version !== prev.version) {
      throw new Error(`Conflict error: Task was modified by another user (current version: ${prev.version}, incoming: ${updates.version})`)
    }

    const now = new Date().toISOString()
    const isNowCompleted = updates.status === 'COMPLETED' && prev.status !== 'COMPLETED'
    const isNowCancelled = updates.status === 'CANCELLED' && prev.status !== 'CANCELLED'
    const isReopened =
      prev.status === 'COMPLETED' &&
      updates.status &&
      updates.status !== 'COMPLETED'

    const updated: WorkflowTask = {
      ...prev,
      ...updates,
      version: prev.version + 1,
      updatedAt: now,
      completedAt: isNowCompleted ? now : updates.completedAt !== undefined ? updates.completedAt : prev.completedAt,
      completedBy: isNowCompleted ? actor : updates.completedBy !== undefined ? updates.completedBy : prev.completedBy,
      cancelledAt: isNowCancelled ? now : prev.cancelledAt,
      cancellationReason: isNowCancelled ? reason || prev.cancellationReason : prev.cancellationReason,
      reopenedAt: isReopened ? now : prev.reopenedAt,
      reopenReason: isReopened ? reason || 'Reopened' : prev.reopenReason,
    }

    tasks[index] = updated
    updatedTask = updated
    isUpdated = true

    // If this task was just completed, unblock dependent tasks that were waiting on it!
    if (isNowCompleted) {
      for (let i = 0; i < tasks.length; i++) {
        const dependent = tasks[i]
        if (dependent.dependencies && dependent.dependencies.includes(id) && dependent.status === 'BLOCKED') {
          // Check if all its other dependencies are also satisfied
          const remainingPending = tasks.filter(
            (t) => dependent.dependencies?.includes(t.id) && t.id !== id && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
          )
          if (remainingPending.length === 0) {
            tasks[i] = {
              ...dependent,
              status: 'PENDING',
              blockedReason: undefined,
              updatedAt: now,
            }
          }
        }
      }
    }

    return tasks
  })

  if (isUpdated && updatedTask) {
    const taskRef = updatedTask as WorkflowTask
    if (updates.status && updates.status !== (updates as any)._prevStatus) {
      await logTaskHistory({
        taskId: taskRef.id,
        action: updates.status === 'COMPLETED' ? 'STATUS_CHANGED' : updates.status === 'CANCELLED' ? 'CANCELLED' : 'STATUS_CHANGED',
        actorName: actor,
        details: reason ? `Status changed to ${taskRef.status} (${reason})` : `Status changed to ${taskRef.status}`,
        newValue: taskRef.status,
      })
    }
  }

  return { task: updatedTask!, updated: isUpdated }
}

export async function deleteWorkflowTask(
  id: string,
  actor = 'System',
  hardDelete = false
): Promise<{ success: boolean }> {
  let success = false

  if (hardDelete) {
    await mutateJsonFile<WorkflowTask[]>(TASKS_FILE, [], (tasks) => {
      const filtered = tasks.filter((t) => t.id !== id)
      success = filtered.length !== tasks.length
      return filtered
    })
  } else {
    const res = await updateWorkflowTask(id, { status: 'CANCELLED' }, actor, 'Cancelled by user')
    success = res.updated
  }

  return { success }
}

export async function addWorkflowTaskComment(
  taskId: string,
  comment: { userName: string; userRole?: string; content: string }
): Promise<WorkflowTask | null> {
  let result: WorkflowTask | null = null
  const newComment: TaskComment = {
    id: `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    taskId,
    userName: comment.userName,
    userRole: comment.userRole,
    content: comment.content,
    createdAt: new Date().toISOString(),
  }

  await mutateJsonFile<WorkflowTask[]>(TASKS_FILE, [], (tasks) => {
    const idx = tasks.findIndex((t) => t.id === taskId)
    if (idx === -1) return tasks
    const cur = tasks[idx]
    const comments = [...(cur.comments || []), newComment]
    tasks[idx] = {
      ...cur,
      comments,
      updatedAt: new Date().toISOString(),
    }
    result = tasks[idx]
    return tasks
  })

  if (result) {
    await logTaskHistory({
      taskId,
      action: 'COMMENT_ADDED',
      actorName: comment.userName,
      details: `Added note: "${comment.content.slice(0, 50)}${comment.content.length > 50 ? '...' : ''}"`,
    })
  }

  return result
}

export async function toggleWorkflowTaskChecklistItem(
  taskId: string,
  itemId: string,
  completed: boolean,
  actor = 'System'
): Promise<WorkflowTask | null> {
  let result: WorkflowTask | null = null

  await mutateJsonFile<WorkflowTask[]>(TASKS_FILE, [], (tasks) => {
    const idx = tasks.findIndex((t) => t.id === taskId)
    if (idx === -1) return tasks
    const cur = tasks[idx]
    const list = (cur.checklist || []).map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          completed,
          completedAt: completed ? new Date().toISOString() : undefined,
          completedBy: completed ? actor : undefined,
        }
      }
      return item
    })

    tasks[idx] = {
      ...cur,
      checklist: list,
      updatedAt: new Date().toISOString(),
    }
    result = tasks[idx]
    return tasks
  })

  return result
}

export async function getWorkflowRules(): Promise<WorkflowRule[]> {
  const existing = await readJsonFile<WorkflowRule[]>(RULES_FILE, [])
  if (!existing || existing.length === 0) {
    // Seed defaults
    await mutateJsonFile<WorkflowRule[]>(RULES_FILE, [], () => DEFAULT_WORKFLOW_RULES)
    return DEFAULT_WORKFLOW_RULES
  }
  return existing
}

export async function updateWorkflowRule(
  id: string,
  updates: Partial<WorkflowRule>
): Promise<WorkflowRule | null> {
  let updatedRule: WorkflowRule | null = null
  await mutateJsonFile<WorkflowRule[]>(RULES_FILE, [], (rules) => {
    const idx = rules.findIndex((r) => r.id === id)
    if (idx === -1) return rules
    rules[idx] = { ...rules[idx], ...updates }
    updatedRule = rules[idx]
    return rules
  })
  return updatedRule
}

export async function getWorkflowTemplates(): Promise<WorkflowTemplate[]> {
  const existing = await readJsonFile<WorkflowTemplate[]>(TEMPLATES_FILE, [])
  if (!existing || existing.length === 0) {
    await mutateJsonFile<WorkflowTemplate[]>(TEMPLATES_FILE, [], () => DEFAULT_WORKFLOW_TEMPLATES)
    return DEFAULT_WORKFLOW_TEMPLATES
  }
  return existing
}

export async function getWorkflowMetrics(user?: string): Promise<WorkflowSummaryMetrics> {
  const tasks = await getWorkflowTasks()
  const todayStr = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  let totalOpen = 0
  let myTasks = 0
  let dueToday = 0
  let overdue = 0
  let blocked = 0
  let inProgress = 0
  let completedLast7Days = 0

  const byPriority = { URGENT: 0, HIGH: 0, NORMAL: 0, LOW: 0 }
  const byStatus: Record<TaskStatus, number> = {
    PENDING: 0,
    IN_PROGRESS: 0,
    WAITING: 0,
    BLOCKED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  }

  for (const t of tasks) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1

    if (t.status !== 'COMPLETED' && t.status !== 'CANCELLED') {
      totalOpen++
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1

      if (user && t.assignedTo && t.assignedTo.toLowerCase() === user.toLowerCase()) {
        myTasks++
      }

      if (t.status === 'BLOCKED') {
        blocked++
      }

      if (t.status === 'IN_PROGRESS') {
        inProgress++
      }

      if (t.dueDate) {
        if (t.dueDate === todayStr) {
          dueToday++
        } else if (t.dueDate < todayStr) {
          overdue++
        }
      }
    }

    if (t.status === 'COMPLETED' && t.completedAt && t.completedAt >= sevenDaysAgo) {
      completedLast7Days++
    }
  }

  const totalClosed = byStatus.COMPLETED + byStatus.CANCELLED
  const allTasksCount = totalOpen + totalClosed
  const completionRatePercent = allTasksCount > 0 ? Math.round((byStatus.COMPLETED / allTasksCount) * 100) : 100

  return {
    totalOpen,
    myTasks,
    dueToday,
    overdue,
    blocked,
    inProgress,
    completedLast7Days,
    completionRatePercent,
    byPriority,
    byStatus,
  }
}
