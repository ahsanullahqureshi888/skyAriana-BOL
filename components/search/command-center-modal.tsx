"use client"

import React, { useState, useEffect, useRef, useTransition } from "react"
import {
  Search,
  X,
  Clock,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  Filter,
  FileText,
  Box,
  Building,
  Receipt,
  BookOpen,
  DollarSign,
  Truck,
  User,
  Ship,
  Files,
  Activity,
  Compass,
  AlertTriangle,
  Layers,
  Plus,
  CalendarCheck,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react"
import { useApp } from "@/lib/app-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { SearchResultItem, GlobalSearchResponse, SearchResultType } from "@/lib/search/search-types"

const RECENT_SEARCHES_KEY = "skyariana_recent_searches_v1"

interface CommandCenterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialQuery?: string
}

export function CommandCenterModal({
  open,
  onOpenChange,
  initialQuery = "",
}: CommandCenterModalProps) {
  const { setView, currentUser } = useApp()
  const [query, setQuery] = useState(initialQuery)
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [topMatch, setTopMatch] = useState<SearchResultItem | undefined>()
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [previewItem, setPreviewItem] = useState<SearchResultItem | null>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const inputRef = useRef<HTMLInputElement>(null)
  const resultsContainerRef = useRef<HTMLDivElement>(null)

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 8))
      }
    } catch {}
  }, [])

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60)
      if (initialQuery) {
        setQuery(initialQuery)
      }
    }
  }, [open, initialQuery])

  // Save query to recents
  const saveRecentSearch = (term: string) => {
    if (!term || term.trim().length < 2) return
    const clean = term.trim()
    const updated = [clean, ...recentSearches.filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, 8)
    setRecentSearches(updated)
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch {}
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY)
    } catch {}
    toast.success("Search history cleared")
  }

  // Live search query effect with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const headers: Record<string, string> = {}
        if (currentUser) {
          headers["x-user-role"] = currentUser.role || "admin"
          headers["x-user-id"] = currentUser.id || "staff"
          headers["x-user-name"] = currentUser.name || "Staff User"
          if ((currentUser as any).clientId) headers["x-client-id"] = (currentUser as any).clientId
          if ((currentUser as any).clientName) headers["x-client-name"] = (currentUser as any).clientName
        }

        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { headers })
        if (res.ok) {
          const data: GlobalSearchResponse = await res.json()
          setResults(data.results || [])
          setTopMatch(data.topMatch)
          setCategoryCounts(data.categoryCounts || {})
          setSelectedIndex(0)
          setPreviewItem(data.topMatch || data.results?.[0] || null)
        }
      } catch (err) {
        console.error("Failed to execute search:", err)
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => clearTimeout(timer)
  }, [query, currentUser])

  // Filter results by active tab
  const displayedResults = results.filter((item) => {
    if (activeCategory === "all") return true
    if (activeCategory === "bols") return item.type === "bol"
    if (activeCategory === "containers") return item.type === "container"
    if (activeCategory === "companies") return item.type === "company"
    if (activeCategory === "invoices") return item.type === "invoice"
    if (activeCategory === "ledgers") return item.type === "ledger"
    if (activeCategory === "payments") return item.type === "payment"
    if (activeCategory === "documents") return item.type === "document"
    if (activeCategory === "tracking") return item.type === "tracking" || item.type === "route"
    if (activeCategory === "actions") return item.type === "command"
    return true
  })

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = selectedIndex < displayedResults.length - 1 ? selectedIndex + 1 : 0
      setSelectedIndex(next)
      setPreviewItem(displayedResults[next] || null)
      scrollSelectedIntoView(next)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const prev = selectedIndex > 0 ? selectedIndex - 1 : displayedResults.length - 1
      setSelectedIndex(prev)
      setPreviewItem(displayedResults[prev] || null)
      scrollSelectedIntoView(prev)
    } else if (e.key === "Enter" && displayedResults[selectedIndex]) {
      e.preventDefault()
      executeItemPrimaryAction(displayedResults[selectedIndex])
    }
  }

  const scrollSelectedIntoView = (index: number) => {
    const container = resultsContainerRef.current
    if (!container) return
    const elements = container.querySelectorAll("[data-search-item]")
    const target = elements[index] as HTMLElement
    if (target) {
      target.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }

  // Execute primary quick action on item
  const executeItemPrimaryAction = (item: SearchResultItem) => {
    saveRecentSearch(query || item.title)
    onOpenChange(false)

    const primaryAction = item.quickActions.find((a) => a.primary) || item.quickActions[0]
    if (!primaryAction) {
      // Default navigation fallback
      if (item.targetView) setView(item.targetView as any)
      return
    }

    if (primaryAction.actionType === "navigate") {
      if (primaryAction.payload?.view) {
        setView(primaryAction.payload.view)
        if (primaryAction.payload.id) {
          window.dispatchEvent(new CustomEvent("load-bol-draft", { detail: { id: primaryAction.payload.id } }))
        }
      }
    } else if (primaryAction.actionType === "copy") {
      navigator.clipboard.writeText(String(primaryAction.payload))
      toast.success(`Copied: ${primaryAction.payload}`)
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success(`Copied: ${text}`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getTypeIcon = (type: SearchResultType) => {
    switch (type) {
      case "container":
        return <Box className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      case "bol":
        return <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      case "company":
        return <Building className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      case "invoice":
        return <Receipt className="h-4 w-4 text-teal-600 dark:text-teal-400" />
      case "ledger":
        return <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
      case "payment":
        return <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      case "truck":
        return <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      case "driver":
        return <User className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      case "vessel":
      case "voyage":
        return <Ship className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
      case "document":
        return <Files className="h-4 w-4 text-rose-600 dark:text-rose-400" />
      case "tracking":
      case "route":
        return <Compass className="h-4 w-4 text-blue-500 dark:text-blue-300" />
      case "command":
        return <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500" />
      default:
        return <Search className="h-4 w-4 text-slate-400" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[min(92dvh,850px)] h-auto flex flex-col p-0 gap-0 overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900">
        <DialogHeader className="sr-only">
          <DialogTitle>Sky Ariana Global Search & Command Center</DialogTitle>
        </DialogHeader>

        {/* ----------------------------------------------------------------- */}
        {/* TOP SEARCH BAR                                                    */}
        {/* ----------------------------------------------------------------- */}
        <div className="relative flex items-center border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3.5 bg-slate-50/50 dark:bg-slate-950/40">
          <Search className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search BOL, container, company, invoice, truck, vessel, phone..."
            className="flex-1 bg-transparent text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          />
          {loading && (
            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin shrink-0 mx-2" />
          )}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                inputRef.current?.focus()
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 mr-2 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-500 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md shadow-2xs">
            ESC to close
          </kbd>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* CATEGORY TABS STRIP                                               */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 overflow-x-auto no-scrollbar bg-white dark:bg-slate-900 shrink-0 text-xs">
          {[
            { id: "all", label: "All", count: categoryCounts.all || 0 },
            { id: "bols", label: "BOLs", count: categoryCounts.bols || 0 },
            { id: "containers", label: "Containers", count: categoryCounts.containers || 0 },
            { id: "companies", label: "Companies", count: categoryCounts.companies || 0 },
            { id: "invoices", label: "Invoices", count: categoryCounts.invoices || 0 },
            { id: "ledgers", label: "Ledgers", count: categoryCounts.ledgers || 0 },
            { id: "payments", label: "Payments", count: categoryCounts.payments || 0 },
            { id: "documents", label: "Documents", count: categoryCounts.documents || 0 },
            { id: "tracking", label: "Tracking", count: categoryCounts.tracking || 0 },
            { id: "actions", label: "Actions", count: categoryCounts.commands || 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveCategory(tab.id)
                setSelectedIndex(0)
              }}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeCategory === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeCategory === tab.id ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* MAIN BODY: 2-COLUMN LAYOUT (Results List + Live Preview)          */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          
          {/* LEFT: RESULTS COLUMN */}
          <div
            ref={resultsContainerRef}
            className="flex-1 overflow-y-auto p-3 space-y-2 border-r border-slate-200/80 dark:border-slate-800/80 min-h-[300px] max-h-[520px]"
          >
            {/* Top Exact Match Hero Banner */}
            {topMatch && topMatch.matchType === "exact_id" && (
              <div
                onClick={() => executeItemPrimaryAction(topMatch)}
                className="p-3.5 rounded-2xl bg-linear-to-r from-blue-900 via-indigo-950 to-slate-900 text-white shadow-md border border-blue-500/30 cursor-pointer hover:border-blue-400 transition mb-3 group"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-blue-500/20 border border-blue-400/40 text-blue-300">
                      {getTypeIcon(topMatch.type)}
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                      Exact Match Found
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                    Press Enter ↵
                  </span>
                </div>
                <div className="font-black text-base text-white group-hover:text-blue-200 transition">
                  {topMatch.title}
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  {topMatch.subtitle}
                </div>
              </div>
            )}

            {/* Empty state & Recent searches */}
            {!query && recentSearches.length > 0 && (
              <div className="mb-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Recent Searches</span>
                  </span>
                  <button
                    type="button"
                    onClick={clearRecentSearches}
                    className="text-[10.5px] font-bold text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  >
                    Clear History
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setQuery(term)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Results Fallback */}
            {query.length >= 2 && !loading && displayedResults.length === 0 && (
              <div className="text-center py-10 px-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
                    No matching records found for &ldquo;{query}&rdquo;
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Try checking spelling, searching by container code (e.g. 4440 or TCLU), or use the Advanced Search panel.
                  </p>
                </div>
                <div className="flex justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false)
                      setView("search")
                    }}
                    className="text-xs font-bold gap-1.5 rounded-xl cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                    <span>Open Advanced Search</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Results Items List */}
            {displayedResults.map((item, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={`${item.type}-${item.id}-${idx}`}
                  data-search-item
                  onMouseEnter={() => {
                    setSelectedIndex(idx)
                    setPreviewItem(item)
                  }}
                  onClick={() => executeItemPrimaryAction(item)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-400/80 shadow-xs"
                      : "bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                          {item.title}
                        </span>
                        {item.badgeText && (
                          <span className={`text-[10px] font-black px-2 py-0.2 rounded-full border ${item.badgeColor || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                            {item.badgeText}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 block mt-0.5">
                        {item.matchedField}
                      </span>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-1 shrink-0 text-slate-400 group-hover:text-blue-600">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              )
            })}
          </div>

          {/* RIGHT: LIVE ENTITY PREVIEW PANEL */}
          <div className="hidden md:flex w-80 lg:w-96 flex-col p-4 bg-slate-50/60 dark:bg-slate-950/40 border-t md:border-t-0 overflow-y-auto space-y-3.5">
            {previewItem ? (
              <>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                      Entity Preview
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {previewItem.type.toUpperCase()}
                    </Badge>
                  </div>
                  <h3 className="text-base font-black text-slate-950 dark:text-slate-100">
                    {previewItem.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {previewItem.subtitle}
                  </p>
                </div>

                {/* Connected Records Breakdown */}
                {previewItem.connectedSummary && (
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block">
                      Connected Module Graph
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {previewItem.connectedSummary.bolNumber && (
                        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 text-blue-950 dark:text-blue-200">
                          <span className="text-[10px] font-bold text-blue-600 block">BOL</span>
                          <span className="font-black text-xs truncate block">{previewItem.connectedSummary.bolNumber}</span>
                        </div>
                      )}
                      {previewItem.connectedSummary.containerCount !== undefined && previewItem.connectedSummary.containerCount > 0 && (
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 text-emerald-950 dark:text-emerald-200">
                          <span className="text-[10px] font-bold text-emerald-600 block">Containers</span>
                          <span className="font-black text-xs truncate block">{previewItem.connectedSummary.containerCount} Registered</span>
                        </div>
                      )}
                      {previewItem.connectedSummary.invoiceCount !== undefined && (
                        <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200/60 text-teal-950 dark:text-teal-200">
                          <span className="text-[10px] font-bold text-teal-600 block">Invoices</span>
                          <span className="font-black text-xs truncate block">{previewItem.connectedSummary.invoiceCount} Generated</span>
                        </div>
                      )}
                      {previewItem.connectedSummary.documentCount !== undefined && (
                        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/60 text-indigo-950 dark:text-indigo-200">
                          <span className="text-[10px] font-bold text-indigo-600 block">Documents</span>
                          <span className="font-black text-xs truncate block">{previewItem.connectedSummary.documentCount} Ready</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Actions List */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block px-1">
                    Quick Actions
                  </span>
                  {previewItem.quickActions.map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => {
                        if (act.actionType === "copy") {
                          handleCopy(String(act.payload), act.id)
                        } else {
                          executeItemPrimaryAction(previewItem)
                        }
                      }}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between gap-2 transition cursor-pointer"
                    >
                      <span>{act.label}</span>
                      {act.actionType === "copy" && copiedId === act.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                <Search className="w-8 h-8 opacity-40" />
                <p className="text-xs font-medium">Select or hover an item to see its complete connected record graph</p>
              </div>
            )}
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* FOOTER BAR                                                        */}
        {/* ----------------------------------------------------------------- */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-semibold">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border text-[10px]">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1 font-semibold">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border text-[10px]">Enter</kbd> Open
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onOpenChange(false)
              setView("search")
            }}
            className="h-7 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
            <span>Advanced Search Mode</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
