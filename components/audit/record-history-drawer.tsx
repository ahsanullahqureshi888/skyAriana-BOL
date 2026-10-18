"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  History,
  X,
  User,
  Clock,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  FileText,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuditEvent, AuditEntityType } from "@/lib/audit/audit-types"
import { queryAuditEvents } from "@/lib/audit/audit-trail-service"

interface RecordHistoryDrawerProps {
  entityType: AuditEntityType
  entityId: string
  entityReference?: string
  title?: string
  triggerButtonText?: string
  triggerVariant?: "default" | "outline" | "secondary" | "ghost"
  triggerSize?: "sm" | "default"
  className?: string
}

export function RecordHistoryDrawer({
  entityType,
  entityId,
  entityReference,
  title,
  triggerButtonText,
  triggerVariant = "outline",
  triggerSize = "sm",
  className = "",
}: RecordHistoryDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline")

  useEffect(() => {
    if (isOpen) {
      const res = queryAuditEvents({
        entityType,
        entityId,
        limit: 100,
      })
      // Also query by entityReference if provided and different
      if (entityReference && entityReference !== entityId) {
        const refRes = queryAuditEvents({
          entityType,
          entityId: entityReference,
          limit: 100,
        })
        const combined = [...res.events, ...refRes.events]
        // Deduplicate by eventId
        const seen = new Set()
        const unique = combined.filter((e) => {
          if (seen.has(e.eventId)) return false
          seen.add(e.eventId)
          return true
        })
        setEvents(unique)
      } else {
        setEvents(res.events)
      }
    }
  }, [isOpen, entityType, entityId, entityReference])

  const filteredEvents = useMemo(() => {
    if (!searchTerm.trim()) return events
    const q = searchTerm.toLowerCase()
    return events.filter(
      (e) =>
        e.action.toLowerCase().includes(q) ||
        e.actor.userName.toLowerCase().includes(q) ||
        (e.reason && e.reason.toLowerCase().includes(q)) ||
        e.changedFields.some(
          (cf) =>
            cf.friendlyLabel.toLowerCase().includes(q) ||
            String(cf.oldValue).toLowerCase().includes(q) ||
            String(cf.newValue).toLowerCase().includes(q)
        )
    )
  }, [events, searchTerm])

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        onClick={() => setIsOpen(true)}
        className={`font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs ${className}`}
        title="View complete chronological change history for this record"
      >
        <History className="w-3.5 h-3.5 text-blue-600" />
        <span>{triggerButtonText || "Who Changed This?"}</span>
        {events.length > 0 && (
          <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-blue-100 text-blue-900 ml-0.5">
            {events.length}
          </span>
        )}
      </Button>

      {/* Slide-Over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-amber-400 flex items-center justify-center font-black text-sm border border-blue-400/30">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase text-amber-400 tracking-wider">Change History & Audit</div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {title || `${entityType}: ${entityReference || entityId}`}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter & View Switcher */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter changes by user, field, or action..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode("timeline")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    viewMode === "timeline" ? "bg-white text-slate-900 shadow-xs font-black" : "text-slate-600"
                  }`}
                >
                  Timeline
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    viewMode === "table" ? "bg-white text-slate-900 shadow-xs font-black" : "text-slate-600"
                  }`}
                >
                  Table
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {filteredEvents.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 space-y-2">
                  <Clock className="w-10 h-10 mx-auto text-slate-300" />
                  <div className="text-xs font-bold text-slate-700">No recorded changes matching filter</div>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    For legacy records created before the Audit Center activation, history is recorded from first edit forward.
                  </p>
                </div>
              ) : viewMode === "timeline" ? (
                /* Timeline View */
                <div className="relative border-l-2 border-blue-200 ml-4 pl-5 space-y-6">
                  {filteredEvents.map((event) => {
                    const isCreate = event.action === "CREATE"
                    const isUpdate = event.action === "UPDATE"
                    const isStatus = event.action === "STATUS_CHANGE"
                    const isReverse = event.action === "REVERSE"

                    return (
                      <div key={event.eventId} className="relative group">
                        {/* Timeline Node */}
                        <div
                          className={`absolute -left-[29px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                            isCreate
                              ? "bg-emerald-500 ring-4 ring-emerald-100"
                              : isReverse
                              ? "bg-rose-500 ring-4 ring-rose-100"
                              : isStatus
                              ? "bg-amber-500 ring-4 ring-amber-100"
                              : "bg-blue-600 ring-4 ring-blue-100"
                          }`}
                        />

                        {/* Event Card */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-blue-400 transition-all space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                                  isCreate
                                    ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                                    : isReverse
                                    ? "bg-rose-100 text-rose-900 border border-rose-200"
                                    : "bg-blue-100 text-blue-900 border border-blue-200"
                                }`}
                              >
                                {event.action}
                              </span>
                              <span className="text-xs font-black text-slate-900">{event.actor.userName}</span>
                              <span className="text-[10px] font-mono text-slate-400">({event.actor.userRole})</span>
                            </div>

                            <div className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                              {event.businessTimestamp || event.timestamp.slice(0, 16).replace("T", " ")}
                            </div>
                          </div>

                          {event.reason && (
                            <div className="text-xs text-slate-600 bg-amber-50/70 border border-amber-200/60 p-2 rounded-xl">
                              <span className="font-bold text-amber-900">Reason: </span>
                              {event.reason}
                            </div>
                          )}

                          {/* Changed Fields List */}
                          {event.changedFields.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              {event.changedFields.map((cf, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs p-2 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                                >
                                  <span className="font-bold text-slate-700">{cf.friendlyLabel}:</span>
                                  <div className="flex items-center gap-2 text-slate-900 font-mono text-[11px] overflow-x-auto">
                                    <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 line-through">
                                      {String(cf.oldValue)}
                                    </span>
                                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-black">
                                      {String(cf.newValue)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Footer metadata */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 font-mono">
                            <span>Source: {event.source}</span>
                            {event.actor.deviceId && <span>Device: {event.actor.deviceId}</span>}
                            <span>Hash: {event.eventHash.slice(0, 10)}...</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Table View */
                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <tr>
                        <th className="p-2.5">Date / Time</th>
                        <th className="p-2.5">User</th>
                        <th className="p-2.5">Action</th>
                        <th className="p-2.5">Changes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEvents.map((e) => (
                        <tr key={e.eventId} className="hover:bg-slate-50/50">
                          <td className="p-2.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                            {e.businessTimestamp}
                          </td>
                          <td className="p-2.5 font-bold text-slate-800">{e.actor.userName}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 font-black text-[10px]">
                              {e.action}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600">
                            {e.changedFields.map((c) => `${c.friendlyLabel}: ${c.oldValue} → ${c.newValue}`).join(", ") ||
                              e.reason ||
                              "Record action committed"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono">Total Recorded Events: {events.length}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="font-bold text-xs h-8 rounded-xl cursor-pointer"
              >
                Close History
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
