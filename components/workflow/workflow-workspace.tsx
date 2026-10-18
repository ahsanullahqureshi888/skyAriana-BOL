"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  WorkflowTask,
  TaskStatus,
  TaskPriority,
  TaskType,
  WorkflowRule,
  WorkflowTemplate,
  WorkflowSummaryMetrics,
  TaskHistoryItem,
} from '@/lib/types/workflow'
import { useApp } from '@/lib/app-context'
import { TaskDetailDrawer } from './task-detail-drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Ship,
  Truck,
  Plus,
  Search,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  Calendar,
  Lock,
  ArrowRight,
  MoreVertical,
  CheckSquare,
  Sparkles,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

export function WorkflowWorkspace() {
  const { currentUser, setView } = useApp()

  // Data states
  const [tasks, setTasks] = useState<WorkflowTask[]>([])
  const [metrics, setMetrics] = useState<WorkflowSummaryMetrics | null>(null)
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // View & Filter states
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'calendar'>('kanban')
  const [quickFilter, setQuickFilter] = useState<'all' | 'my' | 'today' | 'overdue' | 'blocked'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [selectedTeam, setSelectedTeam] = useState<string>('all')

  // Task Drawer states
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null)
  const [taskHistory, setTaskHistory] = useState<TaskHistoryItem[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // New Task Modal states
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskType, setNewTaskType] = useState<TaskType>('DOCUMENT_PREPARATION')
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('NORMAL')
  const [newTaskTeam, setNewTaskTeam] = useState<'Operations' | 'Documentation' | 'Finance' | 'Customs' | 'Border'>('Operations')
  const [newTaskAssignee, setNewTaskAssignee] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [newTaskBol, setNewTaskBol] = useState('')
  const [newTaskContainer, setNewTaskContainer] = useState('')
  const [newTaskCustomer, setNewTaskCustomer] = useState('')

  // Rules Manager Modal state
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false)

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [tasksRes, metricsRes, rulesRes] = await Promise.all([
        fetch('/api/workflow/tasks', { cache: 'no-store' }),
        fetch(`/api/workflow/summary${currentUser ? `?user=${encodeURIComponent(currentUser.name)}` : ''}`, { cache: 'no-store' }),
        fetch('/api/workflow/rules', { cache: 'no-store' }),
      ])

      if (tasksRes.ok) {
        const body = await tasksRes.json()
        if (body.success) setTasks(body.tasks || [])
      }

      if (metricsRes.ok) {
        const body = await metricsRes.json()
        if (body.success) setMetrics(body.metrics)
      }

      if (rulesRes.ok) {
        const body = await rulesRes.json()
        if (body.success) {
          setRules(body.rules || [])
          setTemplates(body.templates || [])
        }
      }
    } catch (err) {
      toast.error('Failed to load workflow data')
    } finally {
      setIsLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Open task in drawer with history
  const handleOpenTask = async (task: WorkflowTask) => {
    setSelectedTask(task)
    setIsDrawerOpen(true)
    try {
      const res = await fetch(`/api/workflow/tasks/${task.id}`, { cache: 'no-store' })
      if (res.ok) {
        const body = await res.json()
        if (body.success) {
          setSelectedTask(body.task)
          setTaskHistory(body.history || [])
        }
      }
    } catch {
      // Keep existing task if history fetch fails
    }
  }

  // Update status handler
  const handleUpdateStatus = async (taskId: string, status: TaskStatus, reason?: string) => {
    try {
      const res = await fetch(`/api/workflow/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: { status },
          actor: currentUser?.name || 'User',
          reason,
        }),
      })

      if (res.ok) {
        const body = await res.json()
        if (body.success) {
          toast.success(`Task status updated to ${status.replace('_', ' ')}`)
          fetchData()
          if (selectedTask && selectedTask.id === taskId) {
            setSelectedTask(body.task)
          }
        }
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to update task')
      }
    } catch {
      toast.error('Network error updating task')
    }
  }

  // Update priority handler
  const handleUpdatePriority = async (taskId: string, priority: TaskPriority) => {
    try {
      const res = await fetch(`/api/workflow/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: { priority },
          actor: currentUser?.name || 'User',
        }),
      })

      if (res.ok) {
        const body = await res.json()
        if (body.success) {
          toast.success(`Task priority set to ${priority}`)
          fetchData()
          if (selectedTask && selectedTask.id === taskId) {
            setSelectedTask(body.task)
          }
        }
      }
    } catch {
      toast.error('Failed to update priority')
    }
  }

  // Toggle checklist
  const handleToggleChecklist = async (taskId: string, itemId: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/workflow/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggleChecklist',
          checklistItem: { itemId, completed },
          actor: currentUser?.name || 'User',
        }),
      })

      if (res.ok) {
        const body = await res.json()
        if (body.success) {
          fetchData()
          if (selectedTask && selectedTask.id === taskId) {
            setSelectedTask(body.task)
          }
        }
      }
    } catch {
      toast.error('Failed to update checklist item')
    }
  }

  // Add comment
  const handleAddComment = async (taskId: string, content: string) => {
    try {
      const res = await fetch(`/api/workflow/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addComment',
          comment: {
            userName: currentUser?.name || 'Operations Agent',
            userRole: currentUser?.role || 'Staff',
            content,
          },
        }),
      })

      if (res.ok) {
        const body = await res.json()
        if (body.success) {
          toast.success('Note recorded')
          fetchData()
          if (selectedTask && selectedTask.id === taskId) {
            setSelectedTask(body.task)
          }
        }
      }
    } catch {
      toast.error('Failed to record comment')
    }
  }

  // Create new manual task
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      toast.error('Task title is required')
      return
    }

    try {
      const res = await fetch('/api/workflow/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: {
            title: newTaskTitle.trim(),
            description: newTaskDescription.trim(),
            type: newTaskType,
            priority: newTaskPriority,
            assignedTeam: newTaskTeam,
            assignedTo: newTaskAssignee.trim() || undefined,
            dueDate: newTaskDueDate || undefined,
            bolNumber: newTaskBol.trim() || undefined,
            containerNo: newTaskContainer.trim() || undefined,
            customerName: newTaskCustomer.trim() || undefined,
          },
          actor: currentUser?.name || 'User',
        }),
      })

      if (res.ok) {
        const body = await res.json()
        if (body.success) {
          toast.success('Task created successfully')
          setIsNewTaskModalOpen(false)
          // Reset fields
          setNewTaskTitle('')
          setNewTaskDescription('')
          setNewTaskAssignee('')
          setNewTaskDueDate('')
          setNewTaskBol('')
          setNewTaskContainer('')
          setNewTaskCustomer('')
          fetchData()
        }
      } else {
        toast.error('Failed to create task')
      }
    } catch {
      toast.error('Network error creating task')
    }
  }

  // Toggle rule enabled
  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch('/api/workflow/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ruleId,
          updates: { enabled: !currentEnabled },
        }),
      })

      if (res.ok) {
        const body = await res.json()
        if (body.success) {
          toast.success(`Rule ${!currentEnabled ? 'enabled' : 'disabled'}`)
          fetchData()
        }
      }
    } catch {
      toast.error('Failed to update rule')
    }
  }

  // Filtered tasks computation
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    return tasks.filter((t) => {
      // Quick filter
      if (quickFilter === 'my') {
        if (!currentUser || !t.assignedTo || t.assignedTo.toLowerCase() !== currentUser.name.toLowerCase()) return false
      } else if (quickFilter === 'today') {
        if (t.dueDate !== todayStr || t.status === 'COMPLETED' || t.status === 'CANCELLED') return false
      } else if (quickFilter === 'overdue') {
        if (!t.dueDate || t.dueDate >= todayStr || t.status === 'COMPLETED' || t.status === 'CANCELLED') return false
      } else if (quickFilter === 'blocked') {
        if (t.status !== 'BLOCKED') return false
      }

      // Dropdown filters
      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false
      if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false
      if (selectedTeam !== 'all' && t.assignedTeam !== selectedTeam) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matches =
          t.taskNumber.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.bolNumber && t.bolNumber.toLowerCase().includes(q)) ||
          (t.containerNo && t.containerNo.toLowerCase().includes(q)) ||
          (t.customerName && t.customerName.toLowerCase().includes(q)) ||
          (t.assignedTo && t.assignedTo.toLowerCase().includes(q))
        if (!matches) return false
      }

      return true
    })
  }, [tasks, quickFilter, selectedStatus, selectedPriority, selectedTeam, searchQuery, currentUser])

  // Grouped tasks for Kanban
  const kanbanColumns: { status: TaskStatus; title: string; color: string }[] = [
    { status: 'PENDING', title: 'Pending', color: 'border-slate-300 dark:border-slate-700' },
    { status: 'IN_PROGRESS', title: 'In Progress', color: 'border-blue-400 dark:border-blue-600' },
    { status: 'WAITING', title: 'Waiting', color: 'border-amber-400 dark:border-amber-600' },
    { status: 'BLOCKED', title: 'Blocked', color: 'border-rose-400 dark:border-rose-600' },
    { status: 'COMPLETED', title: 'Completed', color: 'border-emerald-400 dark:border-emerald-600' },
  ]

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner / Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Zap className="h-6 w-6 text-amber-500 fill-amber-500" />
              Operations Workflow Engine
            </h1>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200">
              Phase 12
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time event automation, shipment task management, milestone deadlines, and dependency coordination.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRulesModalOpen(true)}
            className="h-9 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="hidden sm:inline">Automation Rules ({rules.filter((r) => r.enabled).length})</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="h-9 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setIsNewTaskModalOpen(true)}
            className="h-9 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div
            onClick={() => setQuickFilter('all')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
              quickFilter === 'all'
                ? 'bg-blue-50/80 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800 ring-2 ring-blue-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Active Tasks</span>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 block">
              {metrics.totalOpen}
            </span>
          </div>

          <div
            onClick={() => setQuickFilter('today')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
              quickFilter === 'today'
                ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 ring-2 ring-amber-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Due Today</span>
            <span className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1 block">
              {metrics.dueToday}
            </span>
          </div>

          <div
            onClick={() => setQuickFilter('overdue')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
              quickFilter === 'overdue'
                ? 'bg-rose-50/80 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 ring-2 ring-rose-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Overdue</span>
            <span className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1 block">
              {metrics.overdue}
            </span>
          </div>

          <div
            onClick={() => setQuickFilter('blocked')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
              quickFilter === 'blocked'
                ? 'bg-purple-50/80 border-purple-300 dark:bg-purple-950/40 dark:border-purple-800 ring-2 ring-purple-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">Blocked</span>
            <span className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1 block">
              {metrics.blocked}
            </span>
          </div>

          <div
            onClick={() => setQuickFilter('my')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
              quickFilter === 'my'
                ? 'bg-indigo-50/80 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-800 ring-2 ring-indigo-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">My Assigned</span>
            <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1 block">
              {metrics.myTasks}
            </span>
          </div>

          <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Completed (7d)</span>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1 block">
              {metrics.completedLast7Days}
            </span>
          </div>
        </div>
      )}

      {/* Filter and View Mode Switcher Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search bar */}
          <div className="relative min-w-[220px] sm:min-w-[280px] flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search tasks, BOL, container, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-slate-50 dark:bg-slate-950"
            />
          </div>

          {/* Status filter */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-8 text-xs w-[125px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="WAITING">Waiting</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority filter */}
          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="h-8 text-xs w-[125px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="NORMAL">Normal</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>

          {/* Team filter */}
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem value="Operations">Operations</SelectItem>
              <SelectItem value="Documentation">Documentation</SelectItem>
              <SelectItem value="Finance">Finance</SelectItem>
              <SelectItem value="Customs">Customs</SelectItem>
              <SelectItem value="Border">Border</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Switcher Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg shrink-0 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Kanban</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span>Table</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Timeline</span>
          </button>
        </div>
      </div>

      {/* MAIN VIEW CONTENTS */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kanbanColumns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.status)
            return (
              <div
                key={col.status}
                className={`flex flex-col bg-slate-100/70 dark:bg-slate-900/60 rounded-xl p-3 border-t-4 ${col.color} border-slate-200 dark:border-slate-800 min-h-[500px] shadow-xs`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    {col.title}
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0.2">
                    {colTasks.length}
                  </Badge>
                </div>

                {/* Task Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-2.5">
                  {colTasks.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-xs text-slate-400 italic">
                      No tasks
                    </div>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleOpenTask(t)}
                        className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
                            {t.taskNumber}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              t.priority === 'URGENT'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                                : t.priority === 'HIGH'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {t.priority}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {t.title}
                        </h4>

                        {/* Relational badges */}
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {t.bolNumber && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-mono font-semibold">
                              {t.bolNumber}
                            </span>
                          )}
                          {t.containerNo && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                              {t.containerNo}
                            </span>
                          )}
                        </div>

                        {/* Card Footer: Due Date & Assignee */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{t.dueDate || 'No date'}</span>
                          </div>
                          <span className="font-medium text-slate-600 dark:text-slate-400 truncate max-w-[90px]">
                            {t.assignedTo || t.assignedTeam || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="p-3">Task Number</th>
                  <th className="p-3">Title & Context</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Assigned</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                      No matching tasks found.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => handleOpenTask(t)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer transition-colors"
                    >
                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {t.taskNumber}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{t.title}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          {t.bolNumber && <span className="font-mono">BOL: {t.bolNumber}</span>}
                          {t.containerNo && <span className="font-mono">CTR: {t.containerNo}</span>}
                          {t.customerName && <span>• {t.customerName}</span>}
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {t.type.replace('_', ' ')}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {t.priority}
                        </Badge>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge variant="secondary" className="text-[10px] font-semibold">
                          {t.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {t.dueDate || '—'}
                      </td>
                      <td className="p-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                        {t.assignedTo || t.assignedTeam || 'Unassigned'}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenTask(t)
                          }}
                          className="h-7 text-xs font-semibold text-blue-600"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="space-y-6">
          {/* Overdue Section */}
          {(() => {
            const todayStr = new Date().toISOString().split('T')[0]
            const overdueTasks = filteredTasks.filter(
              (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.dueDate && t.dueDate < todayStr
            )
            if (overdueTasks.length === 0) return null
            return (
              <div className="bg-rose-50/60 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <h3 className="text-xs font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wider">
                    Overdue Milestones ({overdueTasks.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {overdueTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleOpenTask(t)}
                      className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-rose-300 dark:border-rose-800 hover:shadow-xs transition-all cursor-pointer space-y-1"
                    >
                      <div className="flex justify-between text-[10px]">
                        <span className="font-mono font-bold text-rose-600">{t.taskNumber}</span>
                        <span className="font-semibold text-rose-500">Due: {t.dueDate}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Due Today Section */}
          {(() => {
            const todayStr = new Date().toISOString().split('T')[0]
            const todayTasks = filteredTasks.filter(
              (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.dueDate === todayStr
            )
            return (
              <div className="bg-amber-50/60 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                    Due Today ({todayTasks.length})
                  </h3>
                </div>
                {todayTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No tasks scheduled for today.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {todayTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleOpenTask(t)}
                        className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-300 dark:border-amber-800 hover:shadow-xs transition-all cursor-pointer space-y-1"
                      >
                        <div className="flex justify-between text-[10px]">
                          <span className="font-mono font-bold text-amber-600">{t.taskNumber}</span>
                          <span className="font-semibold text-amber-500">{t.priority}</span>
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.title}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Upcoming Section */}
          {(() => {
            const todayStr = new Date().toISOString().split('T')[0]
            const upcomingTasks = filteredTasks.filter(
              (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && (!t.dueDate || t.dueDate > todayStr)
            )
            return (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Upcoming Milestones ({upcomingTasks.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {upcomingTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleOpenTask(t)}
                      className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer space-y-1"
                    >
                      <div className="flex justify-between text-[10px]">
                        <span className="font-mono font-bold text-blue-600">{t.taskNumber}</span>
                        <span className="font-semibold text-slate-400">Due: {t.dueDate || 'Open'}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdateStatus={handleUpdateStatus}
        onUpdatePriority={handleUpdatePriority}
        onToggleChecklist={handleToggleChecklist}
        onAddComment={handleAddComment}
        history={taskHistory}
        onOpenBol={(bol) => setView('bol')}
        onOpenTracking={(bol) => setView('shipments')}
        onOpenWhatsApp={(bol) => setView('whatsapp')}
        onOpenDocuments={(bol) => setView('document-compliance')}
        onOpenLedger={(customer) => setView('accounting')}
      />

      {/* New Task Creation Modal */}
      <Dialog open={isNewTaskModalOpen} onOpenChange={setIsNewTaskModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Create New Operations Task</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Schedule an operational milestone, documentation request, or shipment follow-up.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Task Title *
              </label>
              <Input
                placeholder="e.g. Inspect Container Seal & Weight Bridge"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Type
                </label>
                <Select value={newTaskType} onValueChange={(v: any) => setNewTaskType(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="DOCUMENT_PREPARATION">Document Preparation</SelectItem>
                    <SelectItem value="DOCUMENT_REVIEW">Document Review</SelectItem>
                    <SelectItem value="TRACKING_UPDATE">Tracking Update</SelectItem>
                    <SelectItem value="CUSTOMER_UPDATE">Customer WhatsApp</SelectItem>
                    <SelectItem value="CONTAINER_ASSIGNMENT">Container Assignment</SelectItem>
                    <SelectItem value="STUFFING">Cargo Stuffing</SelectItem>
                    <SelectItem value="VGM_SUBMISSION">VGM Submission</SelectItem>
                    <SelectItem value="GATE_IN">Port Gate-In</SelectItem>
                    <SelectItem value="PAYMENT_FOLLOWUP">Payment Follow-up</SelectItem>
                    <SelectItem value="EMPTY_RETURN">Empty Return</SelectItem>
                    <SelectItem value="CUSTOMS_FOLLOWUP">Customs / Border</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Priority
                </label>
                <Select value={newTaskPriority} onValueChange={(v: any) => setNewTaskPriority(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Department / Team
                </label>
                <Select value={newTaskTeam} onValueChange={(v: any) => setNewTaskTeam(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Documentation">Documentation</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Customs">Customs</SelectItem>
                    <SelectItem value="Border">Border</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Due Deadline
                </label>
                <Input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  BOL Number
                </label>
                <Input
                  placeholder="BOL-2026-..."
                  value={newTaskBol}
                  onChange={(e) => setNewTaskBol(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Container No
                </label>
                <Input
                  placeholder="MSCU..."
                  value={newTaskContainer}
                  onChange={(e) => setNewTaskContainer(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Customer
                </label>
                <Input
                  placeholder="Company Name"
                  value={newTaskCustomer}
                  onChange={(e) => setNewTaskCustomer(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Description & Instructions
              </label>
              <Textarea
                placeholder="Details on what needs to be verified..."
                value={newTaskDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTaskDescription(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsNewTaskModalOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateTask} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold">
              Save Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rules Manager Dialog */}
      <Dialog open={isRulesModalOpen} onOpenChange={setIsRulesModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-950 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Operational Automation Rules
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Active rules that auto-create tasks upon shipment events and auto-resolve them upon verified actions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-start justify-between gap-3"
              >
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{rule.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {rule.eventType}
                    </Badge>
                  </div>
                  <p className="text-slate-500 text-[11px]">{rule.description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1">
                    <span>Priority: <b>{rule.defaultPriority}</b></span>
                    <span>Deadline: <b>+{rule.dueOffsetHours}h</b></span>
                    {rule.autoCompleteOn && <span>Auto-Complete: <b>{rule.autoCompleteOn}</b></span>}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={rule.enabled ? 'default' : 'outline'}
                  onClick={() => handleToggleRule(rule.id, rule.enabled)}
                  className={`h-7 text-xs font-semibold shrink-0 ${
                    rule.enabled ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                  }`}
                >
                  {rule.enabled ? 'Active' : 'Disabled'}
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setIsRulesModalOpen(false)} className="h-8 text-xs font-bold">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
