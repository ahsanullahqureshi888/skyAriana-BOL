"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"

export interface StatCardProps {
  label: string
  value: React.ReactNode
  change?: string | number
  trend?: "up" | "down" | "neutral"
  icon?: React.ElementType
  subtext?: string
  color?: string
  onClick?: () => void
  className?: string
}

/**
 * Standardized StatCard
 * Renders consistent enterprise KPI cards across desktop, laptop, tablet, and mobile.
 */
export function StatCard({
  label,
  value,
  change,
  trend,
  icon: Icon,
  subtext,
  color = "blue",
  onClick,
  className,
}: StatCardProps) {
  const isClickable = Boolean(onClick)

  const colorStyles: Record<string, { bg: string; text: string; border: string }> = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-950/60",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200/80 dark:border-blue-800/60",
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-950/60",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200/80 dark:border-emerald-800/60",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-950/60",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200/80 dark:border-amber-800/60",
    },
    rose: {
      bg: "bg-rose-50 dark:bg-rose-950/60",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-200/80 dark:border-rose-800/60",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-950/60",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200/80 dark:border-purple-800/60",
    },
  }

  const activeColor = colorStyles[color] || colorStyles.blue

  return (
    <div
      data-slot="stat-card"
      onClick={onClick}
      className={cn(
        "flex flex-col justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 shadow-2xs transition-all min-w-0 w-full",
        isClickable && "cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xs active:scale-99",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-xs sm:text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
          {label}
        </span>
        {Icon && (
          <div
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border",
              activeColor.bg,
              activeColor.text,
              activeColor.border
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="mt-2 sm:mt-3 flex items-baseline justify-between gap-2 min-w-0 flex-wrap">
        <div className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 truncate">
          {value}
        </div>

        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md shrink-0",
              trend === "up" && "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400",
              trend === "down" && "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400",
              trend === "neutral" && "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            )}
          >
            {trend === "up" && <ArrowUpRight className="h-3 w-3" />}
            {trend === "down" && <ArrowDownRight className="h-3 w-3" />}
            {trend === "neutral" && <Minus className="h-3 w-3" />}
            <span>{change}</span>
          </div>
        )}
      </div>

      {subtext && (
        <p className="mt-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
          {subtext}
        </p>
      )}
    </div>
  )
}

export interface ActionCardProps {
  title: string
  description: string
  button?: React.ReactNode
  icon?: React.ElementType
  badge?: string
  onClick?: () => void
  className?: string
}

/**
 * Standardized ActionCard
 * High-visibility callout or quick action launcher.
 */
export function ActionCard({
  title,
  description,
  button,
  icon: Icon,
  badge,
  onClick,
  className,
}: ActionCardProps) {
  return (
    <div
      data-slot="action-card"
      onClick={onClick}
      className={cn(
        "flex flex-col justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xs transition-all min-w-0 w-full",
        onClick && "cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xs",
        className
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {title}
            </h3>
            {badge && (
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      {button && <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">{button}</div>}
    </div>
  )
}

interface ResponsiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

/**
 * ResponsiveCard
 * Base card wrapper with consistent border, background, and dark mode handling.
 */
export function ResponsiveCard({
  children,
  className,
  noPadding = false,
  ...props
}: ResponsiveCardProps) {
  return (
    <div
      data-slot="responsive-card"
      className={cn(
        "rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 shadow-2xs transition-colors min-w-0 w-full overflow-hidden",
        !noPadding && "p-3 sm:p-4 md:p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface ResponsiveTableWrapperProps {
  children: React.ReactNode
  className?: string
  maxHeight?: string | number
}

/**
 * ResponsiveTableWrapper
 * 
 * CRITICAL RULE: Tables MUST own their own horizontal scrollbar.
 * The body/page must never scroll horizontally because of a wide table.
 * Wraps tables with an explicit touch-friendly horizontal scroll container.
 */
export function ResponsiveTableWrapper({
  children,
  className,
  maxHeight,
}: ResponsiveTableWrapperProps) {
  return (
    <div
      data-table-scroll="true"
      style={maxHeight ? { maxHeight } : undefined}
      className={cn(
        "table-scroll-container w-full max-w-full min-w-0 overflow-x-auto overflow-y-auto rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-2xs",
        "scrollbar-thin [scrollbar-color:rgba(148,163,184,0.3)_transparent] [scrollbar-width:thin]",
        className
      )}
    >
      {children}
    </div>
  )
}
