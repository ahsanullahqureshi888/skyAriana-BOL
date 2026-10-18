"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { CommandCenterModal } from "@/components/search/command-center-modal"

interface GlobalSearchProps {
  className?: string
  mobileIconOnly?: boolean
}

export function GlobalSearch({ className, mobileIconOnly = false }: GlobalSearchProps) {
  const [open, setOpen] = React.useState(false)

  // Listen for Ctrl+K and Cmd+K globally
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  if (mobileIconOnly) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex md:hidden items-center justify-center h-8 w-8 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title="Global Search & Command Center (Ctrl+K)"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
        <CommandCenterModal open={open} onOpenChange={setOpen} />
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || "hidden md:flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700/80 transition-all rounded-xl border border-slate-200 dark:border-slate-700 w-56 lg:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs group"}
        title="Open Smart Search (Ctrl + K)"
      >
        <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
        <span className="truncate text-left flex-1 text-slate-500 dark:text-slate-400 font-medium">
          Search BOL, container, truck...
        </span>
        <kbd className="pointer-events-none inline-flex h-4.5 select-none items-center gap-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-1 font-mono text-[9.5px] font-bold text-slate-500 dark:text-slate-400 shadow-2xs shrink-0">
          <span className="text-[10px]">⌘</span>K
        </kbd>
      </button>

      <CommandCenterModal open={open} onOpenChange={setOpen} />
    </>
  )
}
