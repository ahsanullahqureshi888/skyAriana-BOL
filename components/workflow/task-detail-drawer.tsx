"use client"

import React, { useState } from 'react'
import {
  WorkflowTask,
  TaskStatus,
  TaskPriority,
  TaskHistoryItem,
} from '@/lib/types/workflow'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Ship,
  Truck,
  MessageSquare,
  ArrowRight,
  Plus,
  Send,
  History,
  CheckSquare,
  Square,
  User,
  Calendar,
  Lock,
  ExternalLink,
} from 'lucide-react'

interface TaskDetailDrawerProps {
  task: WorkflowTask | null
  open: boolean
  onClose: () => void
  onUpdateStatus: (taskId: string, status: TaskStatus, reason?: string) => Promise<void>
  onUpdatePriority: (taskId: string, priority: TaskPriority) => Promise<void>
  onToggleChecklist: (taskId: string, itemId: string, completed: boolean) => Promise<void>
  onAddComment: (taskId: string, content: string) => Promise<void>
  history?: TaskHistoryItem[]
  onOpenBol?: (bolNumber: string) => void
  onOpenTracking?: (bolNumber: string) => void
  onOpenWhatsApp?: (bolNumber: string) => void
  onOpenLedger?: (customerName: string) => void
  onOpenDocuments?: (bolNumber: string) => void
}

export function TaskDetailDrawer({
  task,
  open,
  onClose,
  onUpdateStatus,
  onUpdatePriority,
  onToggleChecklist,
  onAddComment,
  history = [],
  onOpenBol,
  onOpenTracking,
  onOpenWhatsApp,
  onOpenLedger,
  onOpenDocuments,
}: TaskDetailDrawerProps) {
  const [commentText, setCommentText] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'checklist' | 'history'>('details')

  if (!task) return null

  const isCompleted = task.status === 'COMPLETED'
  const isCancelled = task.status === 'CANCELLED'
  const isBlocked = task.status === 'BLOCKED'

  const priorityColors: Record<TaskPriority, string> = {
    URGENT: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    HIGH: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    NORMAL: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    LOW: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
  }

  const statusColors: Record<TaskStatus, string> = {
    PENDING: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
    IN_PROGRESS: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-300',
    WAITING: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-300',
    BLOCKED: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-300',
    COMPLETED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300',
    CANCELLED: 'bg-slate-100 text-slate-400 line-through border-slate-200',
  }

  const handleSendComment = async () => {
    if (!commentText.trim()) return
    setIsSubmittingComment(true)
    try {
      await onAddComment(task.id, commentText.trim())
      setCommentText('')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto p-0 flex flex-col bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
        {/* Top Header */}
        <div className="p-5 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {task.taskNumber}
              </span>
              <Badge variant="outline" className={`text-[11px] font-semibold ${priorityColors[task.priority]}`}>
                {task.priority}
              </Badge>
              <Badge variant="outline" className={`text-[11px] font-semibold ${statusColors[task.status]}`}>
                {task.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              v{task.version}
            </div>
          </div>

          <SheetTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {task.title}
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-500 mt-1">
            Created by {task.createdBy} on {new Date(task.createdAt).toLocaleDateString()}
          </SheetDescription>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            {task.bolNumber && onOpenBol && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenBol(task.bolNumber!)}
                className="h-7 text-xs gap-1 font-semibold text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-950"
              >
                <FileText className="h-3.5 w-3.5" />
                BOL {task.bolNumber}
              </Button>
            )}
            {task.bolNumber && onOpenTracking && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenTracking(task.bolNumber!)}
                className="h-7 text-xs gap-1 font-semibold text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950"
              >
                <Ship className="h-3.5 w-3.5" />
                Live Tracking
              </Button>
            )}
            {task.bolNumber && onOpenDocuments && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenDocuments(task.bolNumber!)}
                className="h-7 text-xs gap-1 font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900 dark:hover:bg-indigo-950"
              >
                <FileText className="h-3.5 w-3.5" />
                Documents
              </Button>
            )}
            {task.bolNumber && onOpenWhatsApp && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenWhatsApp(task.bolNumber!)}
                className="h-7 text-xs gap-1 font-semibold text-green-600 border-green-200 hover:bg-green-50 dark:border-green-900 dark:hover:bg-green-950"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                WhatsApp Update
              </Button>
            )}
            {task.customerName && onOpenLedger && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenLedger(task.customerName!)}
                className="h-7 text-xs gap-1 font-semibold text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-900 dark:hover:bg-amber-950"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ledger
              </Button>
            )}
          </div>
        </div>

        {/* Status Transition Control Bar */}
        <div className="px-5 py-3 bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Change Status:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {!isCompleted ? (
              <>
                <Button
                  size="sm"
                  variant={task.status === 'IN_PROGRESS' ? 'default' : 'outline'}
                  onClick={() => onUpdateStatus(task.id, 'IN_PROGRESS')}
                  className="h-7 text-xs font-semibold"
                >
                  In Progress
                </Button>
                <Button
                  size="sm"
                  variant={task.status === 'WAITING' ? 'default' : 'outline'}
                  onClick={() => onUpdateStatus(task.id, 'WAITING')}
                  className="h-7 text-xs font-semibold"
                >
                  Waiting
                </Button>
                <Button
                  size="sm"
                  onClick={() => onUpdateStatus(task.id, 'COMPLETED')}
                  className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Complete Task
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateStatus(task.id, 'PENDING', 'Reopened by user')}
                className="h-7 text-xs font-semibold text-amber-600 border-amber-300 hover:bg-amber-50"
              >
                Reopen Task
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Details & Context
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'checklist'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Checklist</span>
            {task.checklist && task.checklist.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600">
                {task.checklist.filter((i) => i.completed).length}/{task.checklist.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Audit History</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600">
              {history.length}
            </span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'details' && (
            <>
              {/* Blocked Warning */}
              {isBlocked && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg flex items-start gap-2.5">
                  <Lock className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-rose-900 dark:text-rose-200">Prerequisite Dependency Block</p>
                    <p className="text-rose-700 dark:text-rose-300 mt-0.5">
                      {task.blockedReason || 'This task is blocked until prerequisite milestones are completed.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {task.description || 'No detailed description provided.'}
                </p>
              </div>

              {/* Core Information Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <User className="h-3.5 w-3.5" />
                    <span>Assigned Person / Team</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {task.assignedTo || 'Unassigned'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Team: {task.assignedTeam || 'Operations'}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Due Deadline</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {task.dueDate || 'No date set'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Module: {task.sourceModule}
                  </div>
                </div>
              </div>

              {/* Shipment Relational Context */}
              <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Shipment Links</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">BOL Number</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{task.bolNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Container No</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{task.containerNo || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Customer / Account</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{task.customerName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Carrier Booking</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{task.bookingNo || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Internal Comments Feed */}
              <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Internal Notes & Comments</h4>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {task.comments && task.comments.length > 0 ? (
                    task.comments.map((comment) => (
                      <div key={comment.id} className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{comment.userName}</span>
                          <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{comment.content}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No notes added yet.</p>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Input
                    placeholder="Add an operational note..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendComment())}
                    className="h-8 text-xs bg-slate-50 dark:bg-slate-900"
                  />
                  <Button
                    size="sm"
                    disabled={!commentText.trim() || isSubmittingComment}
                    onClick={handleSendComment}
                    className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'checklist' && (
            <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Execution Checklist</h4>
              {task.checklist && task.checklist.length > 0 ? (
                <div className="space-y-2">
                  {task.checklist.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onToggleChecklist(task.id, item.id, !item.completed)}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors"
                    >
                      {item.completed ? (
                        <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                      <span className={`text-xs ${item.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 font-medium'}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No checklist items defined for this task.</p>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Audit History</h4>
              {history.length > 0 ? (
                <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {history.map((h) => (
                    <div key={h.id} className="relative pl-6 text-xs space-y-0.5">
                      <div className="absolute left-1 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-950" />
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{h.actorName}</span>
                        <span>{new Date(h.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 font-medium">{h.details}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No history logs recorded yet.</p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
