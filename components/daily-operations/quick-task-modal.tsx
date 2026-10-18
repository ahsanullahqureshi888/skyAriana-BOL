'use client'

import React, { useState } from 'react'
import {
  DailyTaskType,
  DailyTaskPriority,
  DailyTaskDepartment,
  TaskEntityType,
} from '@/lib/types/daily-operations'
import {
  CheckCircle2,
  Calendar,
  AlertCircle,
  Tag,
  Building2,
  X,
  UserCheck,
} from 'lucide-react'

interface QuickTaskModalProps {
  isOpen: boolean
  onClose: () => void
  initialEntity?: {
    type: TaskEntityType
    id: string
    title?: string
    bolNumber?: string
    accountName?: string
    containerNumber?: string
    supplierName?: string
  }
  onTaskCreated?: () => void
}

export function QuickTaskModal({
  isOpen,
  onClose,
  initialEntity,
  onTaskCreated,
}: QuickTaskModalProps) {
  const [title, setTitle] = useState(
    initialEntity?.title ||
      (initialEntity?.bolNumber ? `Follow-up for BOL ${initialEntity.bolNumber}` : '')
  )
  const [description, setDescription] = useState('')
  const [taskType, setTaskType] = useState<DailyTaskType>('MANUAL')
  const [department, setDepartment] = useState<DailyTaskDepartment>('Operations')
  const [priority, setPriority] = useState<DailyTaskPriority>('NORMAL')
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setFeedback({ type: 'error', text: 'Task title is required.' })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/operations/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-task',
          taskData: {
            task_type: taskType,
            title: title.trim(),
            description: description.trim() || undefined,
            entity_type: initialEntity?.type || 'general',
            entity_id: initialEntity?.id || `manual-${Date.now()}`,
            bol_number: initialEntity?.bolNumber,
            account_name: initialEntity?.accountName,
            container_number: initialEntity?.containerNumber,
            supplier_name: initialEntity?.supplierName,
            assigned_department: department,
            priority,
            status: 'OPEN',
            source: initialEntity?.type === 'bol' ? 'BOL' : initialEntity?.type === 'customer' ? 'ACCOUNT' : 'MANUAL',
            due_date: dueDate,
          },
        }),
      })

      const data = await res.json()
      if (data.success) {
        setFeedback({ type: 'success', text: `Task created: ${data.task.id}` })
        setTimeout(() => {
          onTaskCreated?.()
          onClose()
        }, 800)
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to create task.' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Network error.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                Add Operations Task / ایجاد وظیفه جدید
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Connect action item to real system record with auto-reminders
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Related Record Context Chip */}
          {(initialEntity?.bolNumber || initialEntity?.accountName || initialEntity?.containerNumber) && (
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs flex flex-wrap gap-3 items-center">
              <span className="font-bold text-slate-500">Linked:</span>
              {initialEntity.bolNumber && (
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-300 font-mono font-bold">
                  BOL: {initialEntity.bolNumber}
                </span>
              )}
              {initialEntity.accountName && (
                <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-300 font-bold">
                  Client: {initialEntity.accountName}
                </span>
              )}
              {initialEntity.containerNumber && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-300 font-mono font-bold">
                  Ctr: {initialEntity.containerNumber}
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Task Title / عنوان وظیفه <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Call Bandar Abbas agent about container loading"
              className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-hidden transition-all text-slate-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Description & Action Plan / توضیحات
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specific notes or instructions for the team..."
              className="w-full p-3 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-hidden transition-all text-slate-900 dark:text-white resize-none"
            />
          </div>

          {/* Department & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Department / بخش
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as DailyTaskDepartment)}
                className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
              >
                <option value="Operations">Operations / عملیات</option>
                <option value="Tracking">Tracking / رهگیری</option>
                <option value="Documents">Documents / اسناد</option>
                <option value="Accounting">Accounting / حسابداری</option>
                <option value="Management">Management / مدیریت</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Priority / اولویت
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as DailyTaskPriority)}
                className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
              >
                <option value="LOW">Low (عادی)</option>
                <option value="NORMAL">Normal (متوسط)</option>
                <option value="HIGH">High (مهم)</option>
                <option value="URGENT">Urgent (فوری و اضطراری)</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Due Date / تاریخ سررسید
            </label>
            <div className="relative">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-9 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancel / انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 h-9 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Task / ثبت وظیفه'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
