"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  FileText,
  Box,
  Truck,
  Building,
  Ship,
  ArrowRight,
  Command,
} from "lucide-react"
import { executeOmniSearch } from "@/lib/control-tower/omni-search"
import type { LiveShipmentRow, OmniSearchResult } from "@/lib/control-tower/types"

interface OmniSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipments: LiveShipmentRow[]
  onSelectResult: (result: OmniSearchResult) => void
}

export function OmniSearchDialog({
  open,
  onOpenChange,
  shipments,
  onSelectResult,
}: OmniSearchDialogProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<OmniSearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery("")
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const timer = setTimeout(() => {
      const res = executeOmniSearch(query, shipments)
      setResults(res)
      setSelectedIndex(0)
    }, 150)

    return () => clearTimeout(timer)
  }, [query, shipments])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault()
      onSelectResult(results[selectedIndex])
      onOpenChange(false)
    }
  }

  const getIcon = (type: OmniSearchResult["type"]) => {
    switch (type) {
      case "bol":
        return <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      case "container":
        return <Box className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      case "truck":
        return <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      case "customer":
        return <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      case "vessel":
        return <Ship className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
      default:
        return <Search className="w-4 h-4 text-muted-foreground" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden shadow-2xl border-border">
        <DialogHeader className="sr-only">
          <DialogTitle>Omni-Search Everything</DialogTitle>
        </DialogHeader>

        {/* Input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-background">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type BOL, Container, Truck Plate, Driver, Shipper, Vessel, or Booking..."
            className="border-0 focus-visible:ring-0 text-sm shadow-none p-0 h-auto bg-transparent"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-border/30">
          {query.trim() && results.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">
              No matching records found for &quot;{query}&quot;
            </div>
          ) : results.length > 0 ? (
            results.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectResult(item)
                  onOpenChange(false)
                }}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  idx === selectedIndex ? "bg-muted text-foreground" : "hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-background border border-border/60 shrink-0">
                    {getIcon(item.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground font-mono truncate">{item.title}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-semibold ${item.badgeColor}`}>
                        {item.badgeText}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 text-muted-foreground text-xs">
                  <span className="hidden sm:inline">Open</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 px-4 text-center space-y-1">
              <Command className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs text-muted-foreground">
                Universal search across all active BOLs, containers, drivers, trucks, and accounts
              </p>
              <div className="flex justify-center gap-2 pt-2 text-[11px] text-muted-foreground">
                <span className="bg-muted px-2 py-0.5 rounded">↑↓ Navigate</span>
                <span className="bg-muted px-2 py-0.5 rounded">Enter Select</span>
                <span className="bg-muted px-2 py-0.5 rounded">Esc Close</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
