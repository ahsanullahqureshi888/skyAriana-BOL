"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface AppShellProps {
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

/**
 * AppShell: Master Application Viewport Shell
 * 
 * Enforces strict viewport standards:
 * - height: 100dvh (full dynamic viewport height, zero body jumping)
 * - display: flex; flex-direction: column
 * - overflow: hidden (body/window never has a horizontal or vertical scrollbar)
 * - Header is flex-shrink: 0
 * - Children (MainWorkspace) flex: 1, min-height: 0, min-width: 0
 */
export function AppShell({ children, header, footer, className }: AppShellProps) {
  return (
    <div
      data-app-shell="true"
      className={cn(
        "liquid-workspace h-[100dvh] max-h-[100dvh] w-full max-w-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none",
        className
      )}
    >
      {header && <div className="shrink-0 z-40 w-full max-w-full">{header}</div>}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full max-w-full overflow-hidden relative">
        {children}
      </div>
      {footer && <div className="shrink-0 z-40 w-full max-w-full">{footer}</div>}
    </div>
  )
}

interface MainWorkspaceProps {
  children: React.ReactNode
  fluid?: boolean
  className?: string
  noPadding?: boolean
  fillViewport?: boolean
}

/**
 * MainWorkspace: Viewport Scroll Container
 * 
 * Owns vertical scrolling for pages while preventing accidental horizontal overflow.
 * When fillViewport is active (e.g. A4 Preview), vertical scrolling and bottom clearance
 * are yielded entirely to the internal viewer to prevent body-level scrollbar conflicts.
 */
export function MainWorkspace({
  children,
  fluid = false,
  noPadding = false,
  fillViewport = false,
  className,
}: MainWorkspaceProps) {
  return (
    <main
      data-main-workspace="true"
      className={cn(
        "flex-1 min-h-0 min-w-0 w-full max-w-full relative flex flex-col",
        fillViewport
          ? "overflow-hidden h-full max-h-full p-0 pb-0"
          : "overflow-y-auto overflow-x-hidden",
        // Responsive padding by device breakpoint unless explicitly disabled or fillViewport
        !noPadding && !fillViewport && (fluid ? "p-2 sm:p-3 md:p-4" : "p-2.5 sm:p-4 md:p-5 lg:p-6"),
        // Bottom padding to clear mobile navigation drawer/bottom-bar if present on small screens
        !noPadding && !fillViewport && "pb-20 md:pb-6",
        className
      )}
    >
      <div
        className={cn(
          "w-full min-w-0 flex-1 flex flex-col",
          fillViewport ? "min-h-0 h-full" : cn(!fluid && "max-w-[1780px] mx-auto", "min-h-full")
        )}
      >
        {children}
      </div>
    </main>
  )
}
