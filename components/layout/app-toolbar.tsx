"use client"

import React from "react"
import { cn } from "@/lib/utils"

export interface AppToolbarProps {
  left?: React.ReactNode
  center?: React.ReactNode
  right?: React.ReactNode
  sticky?: boolean
  className?: string
}

/**
 * Standardized AppToolbar
 * 
 * Reusable toolbar providing left (search/filters), center (counts/segmented controls),
 * and right (export/actions) slots.
 * Features automated wrapping and containment so toolbar buttons never overflow the screen.
 */
export function AppToolbar({
  left,
  center,
  right,
  sticky = false,
  className,
}: AppToolbarProps) {
  return (
    <div
      data-slot="app-toolbar"
      className={cn(
        "w-full min-w-0 bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 shadow-2xs backdrop-blur-md mb-3 sm:mb-4 transition-colors",
        sticky && "sticky top-0 z-30 shadow-xs",
        className
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 sm:gap-2.5 w-full min-w-0">
        {/* Left: Filters & Search */}
        {left && (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0 flex-1">
            {left}
          </div>
        )}

        {/* Center: Indicators, View Toggles & Badges */}
        {center && (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0 justify-start lg:justify-center min-w-0">
            {center}
          </div>
        )}

        {/* Right: Actions, Export & Create */}
        {right && (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0 justify-start lg:justify-end min-w-0">
            {right}
          </div>
        )}
      </div>
    </div>
  )
}
