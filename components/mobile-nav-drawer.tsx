"use client"

import React, { useState, useMemo } from "react"
import {
  X,
  Search,
  Check,
  LogOut,
  Settings,
  Truck,
  Landmark,
  Tag,
  ShieldCheck,
  Moon,
  Sun,
  LayoutGrid,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { ENTERPRISE_MODULES, EnterpriseModuleItem } from "@/components/header"
import { useApp } from "@/lib/app-context"
import { useTheme } from "next-themes"

interface MobileNavDrawerProps {
  open: boolean
  onClose: () => void
  currentView: string
  onNavigate: (viewId: string) => void
}

export function MobileNavDrawer({
  open,
  onClose,
  currentView,
  onNavigate,
}: MobileNavDrawerProps) {
  const { currentUser, logout } = useApp()
  const { theme, setTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<"all" | "ops" | "finance" | "commercial" | "system">("all")

  // Filter modules by search and category
  const filteredModules = useMemo(() => {
    let list = ENTERPRISE_MODULES
    if (activeCategory !== "all") {
      list = list.filter((m) => m.category === activeCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.shortLabel.toLowerCase().includes(q) ||
          m.subtitle.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q)
      )
    }
    return list
  }, [activeCategory, searchQuery])

  if (!open) return null

  const handleSelectModule = (modId: string) => {
    onNavigate(modId)
    onClose()
  }

  const categories = [
    { id: "all", label: "All Suites", icon: LayoutGrid, count: ENTERPRISE_MODULES.length },
    { id: "ops", label: "Operations", icon: Truck, count: ENTERPRISE_MODULES.filter((m) => m.category === "ops").length },
    { id: "finance", label: "Finance", icon: Landmark, count: ENTERPRISE_MODULES.filter((m) => m.category === "finance").length },
    { id: "commercial", label: "Commercial", icon: Tag, count: ENTERPRISE_MODULES.filter((m) => m.category === "commercial").length },
    { id: "system", label: "Compliance", icon: ShieldCheck, count: ENTERPRISE_MODULES.filter((m) => m.category === "system").length },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop tap to dismiss */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Drawer Card */}
      <div className="relative w-full sm:max-w-md sm:mx-auto max-h-[92vh] sm:max-h-[85vh] h-full sm:h-auto flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 transition-transform">
        
        {/* Mobile Pull Handle Indicator */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Top Header */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm font-black text-sm">
                AQ
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                  Enterprise Modules
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sky Ariana v5.1pro • 33 Live Modules
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Close Menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search 33 enterprise modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills (Horizontal Scroll on Mobile) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {categories.map((cat) => {
              const Icon = cat.icon
              const isSelected = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{cat.label}</span>
                  <span className={`text-[10px] ml-0.5 px-1 py-0.2 rounded-full font-mono ${isSelected ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
                    {cat.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Modules List (Scrollable Touch Area) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 overscroll-contain">
          {filteredModules.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                No modules match &quot;{searchQuery}&quot;
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setActiveCategory("all")
                }}
                className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 underline"
              >
                Clear search filters
              </button>
            </div>
          ) : (
            filteredModules.map((mod) => {
              const Icon = mod.icon
              const isActive = currentView === mod.id
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => handleSelectModule(mod.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer active:scale-98 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md font-bold"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-750"
                      }`}
                    >
                      <Icon className={`h-4.5 w-4.5 ${isActive ? "text-white" : mod.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate flex items-center gap-1.5">
                        <span>{mod.title}</span>
                      </div>
                      <div
                        className={`text-[10.5px] truncate leading-tight mt-0.5 ${
                          isActive ? "text-blue-100" : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {mod.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {isActive ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-600" />
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Bottom User Profile & Utility Bar */}
        {currentUser && (
          <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/60 shrink-0 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                {currentUser.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-500 capitalize">
                  {currentUser.role} • Sky Ariana
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Toggle Theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose()
                  logout()
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Exit</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
