"use client"

import React from "react"
import { cn } from "@/lib/utils"

export interface PageHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  badge?: React.ReactNode
  icon?: React.ElementType
  actions?: React.ReactNode
  breadcrumbs?: React.ReactNode
  backButton?: React.ReactNode
  className?: string
}

/**
 * Standardized PageHeader component
 * 
 * Provides responsive title, subtitle, icon, status badges, and action buttons.
 * Guarantees zero text truncation blowout and wraps actions gracefully on tablet & mobile.
 */
export function PageHeader({
  title,
  subtitle,
  badge,
  icon: Icon,
  actions,
  breadcrumbs,
  backButton,
  className,
}: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn(
        "flex flex-col gap-2.5 sm:gap-3 py-2 sm:py-3.5 mb-2 sm:mb-4 border-b border-slate-200/80 dark:border-slate-800/80 w-full min-w-0 shrink-0",
        className
      )}
    >
      {breadcrumbs && (
        <div className="text-xs text-slate-500 dark:text-slate-400 min-w-0 truncate">
          {breadcrumbs}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4 min-w-0">
        {/* Left / Title Block */}
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          {backButton && <div className="shrink-0 pt-0.5 sm:pt-0">{backButton}</div>}
          
          {Icon && (
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
              <Icon className="h-5 w-5" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 truncate">
                {title}
              </h1>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-2">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right / Actions Block */}
        {actions && (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0 justify-start sm:justify-end min-w-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
