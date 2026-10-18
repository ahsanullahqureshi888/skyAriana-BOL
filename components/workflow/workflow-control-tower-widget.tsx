"use client"

import React, { useState, useEffect } from 'react'
import { WorkflowSummaryMetrics, WorkflowTask } from '@/lib/types/workflow'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Zap, Clock, AlertTriangle, ArrowRight, Lock, CheckCircle2 } from 'lucide-react'

interface WorkflowControlTowerWidgetProps {
  onOpenWorkflow: () => void
}

export function WorkflowControlTowerWidget({ onOpenWorkflow }: WorkflowControlTowerWidgetProps) {
  const [metrics, setMetrics] = useState<WorkflowSummaryMetrics | null>(null)
  const [urgentTasks, setUrgentTasks] = useState<WorkflowTask[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const [sumRes, tasksRes] = await Promise.all([
          fetch('/api/workflow/summary', { cache: 'no-store' }),
          fetch('/api/workflow/tasks?priority=URGENT&status=PENDING&status=IN_PROGRESS&status=BLOCKED', { cache: 'no-store' }),
        ])
        if (sumRes.ok) {
          const body = await sumRes.json()
          if (body.success) setMetrics(body.metrics)
        }
        if (tasksRes.ok) {
          const body = await tasksRes.json()
          if (body.success) setUrgentTasks((body.tasks || []).slice(0, 3))
        }
      } catch {
        // Fallback silently
      }
    }
    load()
  }, [])

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
            <Zap className="h-4 w-4 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Operations Workflow
            </h4>
            <span className="text-[10px] text-slate-400">Milestone Deadlines & Tracking</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenWorkflow}
          className="h-7 text-xs font-bold text-blue-600 hover:text-blue-700 gap-1 px-2 cursor-pointer"
        >
          <span>Open</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* KPI 3-stat block */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
          <span className="text-[10px] font-bold text-amber-600 uppercase block">Due Today</span>
          <span className="text-base font-black text-amber-700 dark:text-amber-300">
            {metrics?.dueToday ?? '—'}
          </span>
        </div>
        <div className="p-2 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40">
          <span className="text-[10px] font-bold text-rose-600 uppercase block">Overdue</span>
          <span className="text-base font-black text-rose-700 dark:text-rose-300">
            {metrics?.overdue ?? '—'}
          </span>
        </div>
        <div className="p-2 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40">
          <span className="text-[10px] font-bold text-purple-600 uppercase block">Blocked</span>
          <span className="text-base font-black text-purple-700 dark:text-purple-300">
            {metrics?.blocked ?? '—'}
          </span>
        </div>
      </div>

      {/* Urgent Tasks Quick List */}
      {urgentTasks.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Critical Tasks
          </span>
          {urgentTasks.map((t) => (
            <div
              key={t.id}
              onClick={onOpenWorkflow}
              className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 hover:border-blue-400 text-xs cursor-pointer flex items-center justify-between gap-2 transition-all"
            >
              <div className="truncate flex-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {t.title}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {t.bolNumber || t.containerNo || t.taskNumber}
                </span>
              </div>
              <Badge variant="outline" className="text-[9px] font-bold shrink-0 bg-rose-50 text-rose-700 border-rose-200">
                {t.priority}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
