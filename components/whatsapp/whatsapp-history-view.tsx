"use client"

import { useEffect, useState } from "react"
import { Check, Copy, ExternalLink, Eye, History, RefreshCw, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { WhatsAppHistoryEntry } from "@/lib/whatsapp/message-types"
import { formatDate } from "@/lib/whatsapp/message-builder"

interface WhatsAppHistoryViewProps {
  onSelectBol?: (bolNumber: string) => void
}

export function WhatsAppHistoryView({ onSelectBol }: WhatsAppHistoryViewProps) {
  const [history, setHistory] = useState<WhatsAppHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [viewedEntry, setViewedEntry] = useState<WhatsAppHistoryEntry | null>(null)

  const fetchHistory = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/whatsapp/history?limit=100")
      if (res.ok) {
        const data = await res.json()
        if (data.history && Array.isArray(data.history)) {
          setHistory(data.history)
        }
      }
    } catch {} finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-2xs">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-sm font-bold text-slate-800">Message Audit History</CardTitle>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchHistory}
            disabled={isLoading}
            className="h-7 text-xs font-semibold gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No WhatsApp updates recorded yet. Generated and copied messages will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Date & Time</th>
                    <th className="py-2.5 px-4">BOL Number</th>
                    <th className="py-2.5 px-4">Format</th>
                    <th className="py-2.5 px-4">Language</th>
                    <th className="py-2.5 px-4">Recipient</th>
                    <th className="py-2.5 px-4">Status / Action</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {history.map((entry) => {
                    const actionBadge =
                      entry.action === "opened_whatsapp" ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          Opened in WhatsApp
                        </Badge>
                      ) : entry.action === "copied" ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Copied to Clipboard
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                          Generated
                        </Badge>
                      )

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(entry.generatedAt).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-blue-700">
                          {entry.bolNumber}
                        </td>
                        <td className="py-2.5 px-4 capitalize text-slate-600">
                          {entry.messageType.replace(/_/g, " ")}
                        </td>
                        <td className="py-2.5 px-4 uppercase text-slate-500 font-mono text-[10px]">
                          {entry.language}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {entry.recipientPhone || "None"}
                        </td>
                        <td className="py-2.5 px-4">{actionBadge}</td>
                        <td className="py-2.5 px-4 text-right space-x-1">
                          {entry.messageText && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewedEntry(entry)}
                              className="h-6 px-2 text-[10px] text-slate-600 hover:text-slate-900"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              <span>View</span>
                            </Button>
                          )}
                          {onSelectBol && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onSelectBol(entry.bolNumber)}
                              className="h-6 px-2 text-[10px] font-bold text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              Regenerate
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Stored Message Dialog */}
      {viewedEntry && (
        <Dialog open={Boolean(viewedEntry)} onOpenChange={() => setViewedEntry(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">
                Original Generated Message — {viewedEntry.bolNumber}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-xs">
              <Textarea
                readOnly
                value={viewedEntry.messageText || "No text stored"}
                rows={10}
                className="font-mono text-xs bg-slate-50 border-slate-200"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
