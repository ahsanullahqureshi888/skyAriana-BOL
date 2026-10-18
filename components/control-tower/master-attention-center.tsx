"use client"

import React, { useState } from "react"
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BellOff,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { AttentionItem, AttentionSeverity } from "@/lib/control-tower/types"
import { setAttentionSnooze } from "@/lib/control-tower/attention-engine"
import { toast } from "sonner"

interface MasterAttentionCenterProps {
  attentionItems: AttentionItem[]
  onNavigate: (view: any, param?: string) => void
  onRefresh: () => void
}

export function MasterAttentionCenter({
  attentionItems,
  onNavigate,
  onRefresh,
}: MasterAttentionCenterProps) {
  const [severityFilter, setSeverityFilter] = useState<"all" | AttentionSeverity>("all")
  const [isExpanded, setIsExpanded] = useState(true)

  const filteredItems = attentionItems.filter((item) => {
    if (severityFilter === "all") return true
    return item.severity === severityFilter
  })

  const criticalCount = attentionItems.filter((a) => a.severity === "critical").length
  const warningCount = attentionItems.filter((a) => a.severity === "warning").length
  const infoCount = attentionItems.filter((a) => a.severity === "info").length

  const handleSnooze = (itemId: string, hours: number) => {
    setAttentionSnooze(itemId, hours * 60 * 60 * 1000)
    toast.success(`Alert snoozed for ${hours} hour(s)`)
    onRefresh()
  }

  const handleAcknowledge = (itemId: string) => {
    setAttentionSnooze(itemId, null, true)
    toast.success("Alert acknowledged and cleared")
    onRefresh()
  }

  if (attentionItems.length === 0) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">Operational Clear — No Urgent Attention Required</h4>
            <p className="text-xs text-muted-foreground">All border stations, port gates, cut-offs, and documents are operating within schedule.</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold">
          100% On-Track
        </Badge>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Header Bar */}
      <div className="p-3.5 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${criticalCount > 0 ? "bg-red-500/20 text-red-600 dark:text-red-400 animate-pulse" : "bg-amber-500/20 text-amber-600 dark:text-amber-400"}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-tight uppercase text-foreground">Master Attention Center</h3>
              <Badge variant="destructive" className="h-5 px-1.5 text-[11px] font-bold">
                {attentionItems.length} Issues
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Prioritized by urgency: Imminent cut-offs, border holds, detention limits, and missing compliance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Severity filter pills */}
          <div className="flex items-center bg-background border border-border/80 rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSeverityFilter("all")}
              className={`px-2 py-1 rounded font-medium cursor-pointer transition-colors ${
                severityFilter === "all" ? "bg-muted font-bold text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({attentionItems.length})
            </button>
            <button
              type="button"
              onClick={() => setSeverityFilter("critical")}
              className={`px-2 py-1 rounded font-medium cursor-pointer transition-colors ${
                severityFilter === "critical" ? "bg-red-500/20 text-red-700 dark:text-red-300 font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Critical ({criticalCount})
            </button>
            <button
              type="button"
              onClick={() => setSeverityFilter("warning")}
              className={`px-2 py-1 rounded font-medium cursor-pointer transition-colors ${
                severityFilter === "warning" ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Warnings ({warningCount})
            </button>
            <button
              type="button"
              onClick={() => setSeverityFilter("info")}
              className={`px-2 py-1 rounded font-medium cursor-pointer transition-colors ${
                severityFilter === "info" ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Info ({infoCount})
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse attention center" : "Expand attention center"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Cards List */}
      {isExpanded && (
        <div className="p-3 space-y-2 max-h-80 overflow-y-auto divide-y divide-border/40">
          {filteredItems.map((item) => {
            const isCritical = item.severity === "critical"
            const isWarning = item.severity === "warning"

            return (
              <div
                key={item.id}
                className={`pt-2 first:pt-0 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-lg transition-colors ${
                  isCritical
                    ? "bg-red-500/5 hover:bg-red-500/10 border-l-4 border-l-red-500"
                    : isWarning
                    ? "bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-500"
                    : "bg-blue-500/5 hover:bg-blue-500/10 border-l-4 border-l-blue-500"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">
                    {isCritical ? (
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">{item.title}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                        {item.category.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  {/* Action Link Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs font-semibold gap-1 bg-background hover:bg-muted cursor-pointer"
                    onClick={() => onNavigate(item.targetView, item.targetParam)}
                  >
                    <span>{item.actionLabel}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Button>

                  {/* Snooze 1h / 24h buttons */}
                  <div className="flex items-center rounded border border-border/70 overflow-hidden text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleSnooze(item.id, 1)}
                      className="px-1.5 py-1 bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Snooze for 1 hour"
                    >
                      1h
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSnooze(item.id, 24)}
                      className="px-1.5 py-1 bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-l border-border/70 cursor-pointer"
                      title="Snooze for 24 hours"
                    >
                      24h
                    </button>
                  </div>

                  {/* Acknowledge Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => handleAcknowledge(item.id)}
                    title="Acknowledge & dismiss alert"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
