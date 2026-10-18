"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Bell, Check, ExternalLink, Settings, ShieldAlert, AlertTriangle, Info, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserNotificationView, NotificationMetrics } from '@/lib/types/notification'
import { useApp } from '@/lib/app-context'
import { toast } from 'sonner'

interface NotificationBellProps {
  onOpenCenter: () => void
  onOpenSettings?: () => void
}

export function NotificationBell({ onOpenCenter, onOpenSettings }: NotificationBellProps) {
  const { currentUser, setView } = useAppContextSafe()
  const [notifications, setNotifications] = useState<UserNotificationView[]>([])
  const [metrics, setMetrics] = useState<NotificationMetrics | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const currentUserName = currentUser?.username || currentUser?.name
  const currentUserRole = currentUser?.role
  const currentClientId = currentUser?.clientId
  const currentClientName = currentUser?.clientName

  const fetchNotifications = useCallback(async () => {
    if (!currentUserName || !currentUserRole) return
    try {
      const q = new URLSearchParams({
        user: currentUserName,
        role: currentUserRole,
        ...(currentClientId ? { clientId: currentClientId } : {}),
        ...(currentClientName ? { clientName: currentClientName } : {}),
        activeOnly: 'true',
      })
      const res = await fetch(`/api/notifications?${q.toString()}`, { cache: 'no-store' })
      if (res.ok) {
        const body = await res.json()
        if (body.success) {
          setNotifications((body.notifications || []).slice(0, 7))
          setMetrics(body.metrics)
        }
      }
    } catch {
      // Background poll failure is silent
    }
  }, [currentUserName, currentUserRole, currentClientId, currentClientName])

  useEffect(() => {
    fetchNotifications()
    // Poll every 30 seconds for live updates
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleMarkAllRead = async () => {
    if (!currentUser) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': currentUser.username || currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({ action: 'markAllRead' }),
      })
      if (res.ok) {
        toast.success('All notifications marked as read')
        fetchNotifications()
      }
    } catch {
      toast.error('Failed to mark all as read')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationClick = async (notif: UserNotificationView) => {
    if (!notif.read && currentUser) {
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': currentUser.username || currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          action: 'markRead',
          deliveryId: notif.deliveryId,
        }),
      }).catch(() => {})
    }

    setIsOpen(false)

    // Deep link routing
    if (notif.actionContext?.targetView) {
      setView(notif.actionContext.targetView as any)
    } else if (notif.category === 'DOCUMENTS') {
      setView('document-compliance')
    } else if (notif.category === 'FINANCE') {
      setView('accounting')
    } else if (notif.category === 'TRACKING') {
      setView('shipments')
    } else if (notif.category === 'WORKFLOW') {
      setView('workflow')
    } else {
      onOpenCenter()
    }
  }

  const unreadCount = metrics?.totalUnread ?? 0
  const hasCritical = (metrics?.totalCritical ?? 0) > 0

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open notifications"
          className="relative flex items-center justify-center h-7.5 w-7.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0"
        >
          <Bell className={`h-4 w-4 ${hasCritical ? 'text-rose-600 dark:text-rose-400 animate-bounce' : ''}`} />
          {unreadCount > 0 && (
            <span
              className={`absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[9px] font-black text-white ${
                hasCritical ? 'bg-rose-600' : 'bg-blue-600'
              } shadow-xs`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 sm:w-96 text-xs p-0 shadow-xl border-slate-200 dark:border-slate-800">
        {/* Dropdown Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 dark:text-slate-100">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={isLoading}
                className="h-6 text-[11px] px-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            {onOpenSettings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsOpen(false)
                  onOpenSettings()
                }}
                className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700"
                title="Notification Settings"
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Notifications Preview List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-slate-400 italic">
              No new alerts or active issues.
            </div>
          ) : (
            notifications.map((n) => {
              const isUrgent = n.severity === 'CRITICAL'
              const isWarning = n.severity === 'WARNING'
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 transition-colors cursor-pointer flex items-start gap-2.5 ${
                    !n.read
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {isUrgent ? (
                      <ShieldAlert className="h-4 w-4 text-rose-600" />
                    ) : isWarning ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Info className="h-4 w-4 text-blue-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[11px] font-bold truncate block ${!n.read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                        {n.title}
                      </span>
                      {!n.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>{n.relatedBol || n.relatedContainer || n.category}</span>
                      <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Dropdown Footer */}
        <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsOpen(false)
              onOpenCenter()
            }}
            className="w-full h-7 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer"
          >
            View All in Notification Center
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function useAppContextSafe() {
  try {
    return useApp()
  } catch {
    return { currentUser: null, setView: () => {} }
  }
}
