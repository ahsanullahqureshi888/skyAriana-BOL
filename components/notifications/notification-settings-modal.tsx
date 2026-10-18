"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserNotificationSettings, getDefaultNotificationSettings } from '@/lib/types/notification'
import { Bell, Volume2, Moon, Monitor, Check, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface NotificationSettingsModalProps {
  open: boolean
  onClose: () => void
  userId: string
}

export function NotificationSettingsModal({
  open,
  onClose,
  userId,
}: NotificationSettingsModalProps) {
  const [settings, setSettings] = useState<UserNotificationSettings>(
    getDefaultNotificationSettings(userId)
  )
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open && userId) {
      fetch(`/api/notifications/settings?user=${encodeURIComponent(userId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.settings) {
            setSettings(data.settings)
          }
        })
        .catch(() => {})
    }
  }, [open, userId])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, settings }),
      })
      if (res.ok) {
        toast.success('Notification preferences saved')
        onClose()
      } else {
        toast.error('Failed to save preferences')
      }
    } catch {
      toast.error('Network error saving preferences')
    } finally {
      setIsSaving(false)
    }
  }

  // Audio test tone generator
  const handlePlayTestSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1) // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.35)
      toast.info('Played test alert sound')
    } catch {
      toast.error('Audio playback not supported in this browser')
    }
  }

  // Desktop notification test
  const handleTestDesktopNotification = async () => {
    if (!('Notification' in window)) {
      toast.error('Desktop notifications not supported in this browser')
      return
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error('Desktop notification permission denied')
        return
      }
    }

    new Notification('SKY ARIANA LIMITED — Test Alert', {
      body: 'This is a sample operational milestone notification.',
      icon: '/logo.png',
    })
    toast.success('Dispatched test desktop notification')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-950 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Bell className="h-4 w-4 text-blue-600" />
            Notification & Alert Preferences
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Configure sound alerts, quiet hours, desktop notifications, and department channels.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Audio Alert Settings */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-amber-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Alert Sound Level</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayTestSound}
                className="h-7 text-[11px] px-2"
              >
                Test Sound
              </Button>
            </div>
            <Select
              value={settings.soundLevel}
              onValueChange={(v: any) => setSettings({ ...settings, soundLevel: v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="off">Off (Silent)</SelectItem>
                <SelectItem value="critical_only">Critical Alerts Only</SelectItem>
                <SelectItem value="warnings_critical">Warnings & Critical Alerts</SelectItem>
                <SelectItem value="all">All Operational Notifications</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Notification Settings */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-blue-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Desktop Push Notifications</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestDesktopNotification}
                className="h-7 text-[11px] px-2"
              >
                Send Test
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Show system banners for critical cut-offs</span>
              <Button
                size="sm"
                variant={settings.desktopEnabled ? 'default' : 'outline'}
                onClick={() => setSettings({ ...settings, desktopEnabled: !settings.desktopEnabled })}
                className={`h-7 text-xs font-semibold ${
                  settings.desktopEnabled ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
                }`}
              >
                {settings.desktopEnabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-indigo-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Quiet Hours</span>
              </div>
              <Button
                size="sm"
                variant={settings.quietHoursEnabled ? 'default' : 'outline'}
                onClick={() => setSettings({ ...settings, quietHoursEnabled: !settings.quietHoursEnabled })}
                className={`h-7 text-xs font-semibold ${
                  settings.quietHoursEnabled ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''
                }`}
              >
                {settings.quietHoursEnabled ? 'Active' : 'Off'}
              </Button>
            </div>

            {settings.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Start Time</label>
                  <Input
                    type="time"
                    value={settings.quietHoursStart}
                    onChange={(e) => setSettings({ ...settings, quietHoursStart: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">End Time</label>
                  <Input
                    type="time"
                    value={settings.quietHoursEnd}
                    onChange={(e) => setSettings({ ...settings, quietHoursEnd: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            Save Preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
