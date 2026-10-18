"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Lock,
  ShieldCheck,
  Database,
  Save,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import type { AccountingPeriod, AccountingPeriodSettings } from "@/lib/accounting/period-closing/period-types"

export function AccountingPeriodsSettings() {
  const [settings, setSettings] = useState<AccountingPeriodSettings>({
    enablePeriodLock: true,
    currentPeriodId: "period-2026-09",
    requireBackupBeforeClose: true,
    requireReconciliationBeforeClose: true,
    allowWarningsOnClose: true,
    requireApprovalToReopen: true,
    allowCurrentPeriodAdjustment: true,
  })
  const [periods, setPeriods] = useState<AccountingPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadSettingsAndPeriods = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/accounting/period")
      const json = await res.json()
      if (json.success) {
        setPeriods(json.periods || [])
        if (json.settings) {
          setSettings(json.settings)
        }
      }
    } catch (err: any) {
      toast.error("Failed to load period settings: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettingsAndPeriods()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await fetch("/api/accounting/period/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings,
          actor: "Administrator",
        }),
      })
      const json = await res.json()
      if (json.success) {
        setSettings(json.settings)
        toast.success("Accounting period policies saved successfully.")
      } else {
        toast.error(json.error || "Failed to save settings.")
      }
    } catch (err: any) {
      toast.error("Network error: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        Loading Accounting Period Policies...
      </div>
    )
  }

  const activePeriod = periods.find((p) => p.id === settings.currentPeriodId)

  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Accounting Period Controls & Lock Policies
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-300">
                  SERVER-ENFORCED
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Configure monthly closure rules, pre-close backup requirements, and multi-currency safeguards
              </CardDescription>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="text-xs gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving Policies...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Period Policies
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-5 text-xs">
        {/* Active Period Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Designated Active Posting Period:
            </Label>
            <p className="text-[11px] text-slate-500">
              New financial transactions default to this period if posting date falls within its range.
            </p>
          </div>
          <div>
            <Select
              value={settings.currentPeriodId}
              onValueChange={(val) => setSettings({ ...settings, currentPeriodId: val })}
            >
              <SelectTrigger className="h-9 text-xs font-mono font-bold bg-white dark:bg-slate-950">
                <SelectValue placeholder="Select active period..." />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs font-mono">
                    {p.name} ({p.code}) — {p.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Toggles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Toggle 1: Server-Side Period Lock */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-rose-600" />
                Enforce Server-Side Period Lock
              </Label>
              <p className="text-[11px] text-slate-500">
                Reject any transaction post, modification, or deletion targeting a CLOSED or ARCHIVED period on the server.
              </p>
            </div>
            <Switch
              checked={settings.enablePeriodLock}
              onCheckedChange={(checked) => setSettings({ ...settings, enablePeriodLock: checked })}
            />
          </div>

          {/* Toggle 2: Mandatory Pre-Close Backup */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-blue-600" />
                Mandatory Pre-Close Backup
              </Label>
              <p className="text-[11px] text-slate-500">
                Automatically generate and verify a standalone backup archive before committing monthly lock.
              </p>
            </div>
            <Switch
              checked={settings.requireBackupBeforeClose}
              onCheckedChange={(checked) => setSettings({ ...settings, requireBackupBeforeClose: checked })}
            />
          </div>

          {/* Toggle 3: Mandatory Pre-Close Reconciliation */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Mandatory Checklist Verification
              </Label>
              <p className="text-[11px] text-slate-500">
                Require 100% mathematical invariance (Debit - Credit) and chronological sequence check before close.
              </p>
            </div>
            <Switch
              checked={settings.requireReconciliationBeforeClose}
              onCheckedChange={(checked) => setSettings({ ...settings, requireReconciliationBeforeClose: checked })}
            />
          </div>

          {/* Toggle 4: Allow Warnings on Close */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Allow Closing with Non-Blocking Warnings
              </Label>
              <p className="text-[11px] text-slate-500">
                Permit authorized close when only non-critical warnings (e.g. unreferenced bank slips) are present.
              </p>
            </div>
            <Switch
              checked={settings.allowWarningsOnClose}
              onCheckedChange={(checked) => setSettings({ ...settings, allowWarningsOnClose: checked })}
            />
          </div>

          {/* Toggle 5: Require Approval to Reopen */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                Require Justification to Reopen
              </Label>
              <p className="text-[11px] text-slate-500">
                Mandate a minimum 10-character business justification and take a safeguard backup prior to reopening.
              </p>
            </div>
            <Switch
              checked={settings.requireApprovalToReopen}
              onCheckedChange={(checked) => setSettings({ ...settings, requireApprovalToReopen: checked })}
            />
          </div>

          {/* Toggle 6: Allow Current Period Adjustments */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Allow Prior Period Adjustment References
              </Label>
              <p className="text-[11px] text-slate-500">
                Enable posting adjustments in the open period that link back to closed period invoices or BOLs.
              </p>
            </div>
            <Switch
              checked={settings.allowCurrentPeriodAdjustment}
              onCheckedChange={(checked) => setSettings({ ...settings, allowCurrentPeriodAdjustment: checked })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
