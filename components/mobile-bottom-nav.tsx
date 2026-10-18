"use client"

import React, { useState, useEffect } from "react"
import { useApp } from "@/lib/app-context"
import {
  FileText,
  Activity,
  Landmark,
  Users,
  LayoutGrid,
  Sparkles,
} from "lucide-react"
import { MobileNavDrawer } from "@/components/mobile-nav-drawer"

export function MobileBottomNav() {
  const { view, setView, currentUser } = useApp()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Listen for open mobile drawer events (e.g. from Header mobile button)
  useEffect(() => {
    const handleOpen = () => setIsDrawerOpen(true)
    window.addEventListener("skybol:open-mobile-drawer", handleOpen)
    return () => window.removeEventListener("skybol:open-mobile-drawer", handleOpen)
  }, [])

  if (!currentUser) return null

  const isShipper = currentUser.role === "shipper"

  // Check which primary category the current view belongs to
  const isBolActive = view === "bol"
  const isOpsActive =
    view === "shipments" ||
    view === "daily-operations" ||
    view === "ocean-operations" ||
    view === "air-freight" ||
    view === "fleet-operations" ||
    view === "warehouse-cargo" ||
    view === "customs-transit" ||
    view === "booking-containers" ||
    view === "claims-incidents"
  const isFinanceActive =
    view === "accounts" ||
    view === "companies" ||
    view === "ledger" ||
    view === "invoice" ||
    view === "period-closing" ||
    view === "treasury" ||
    view === "reports" ||
    view === "analytics" ||
    view === "export-calculator"
  const isCrmActive =
    view === "crm-sales" ||
    view === "rates-quotations" ||
    view === "routes-locations" ||
    view === "procurement"

  const navItems = isShipper
    ? [
        {
          id: "shipper-portal",
          label: "My Cargo",
          icon: Activity,
          isActive: view === "shipper-portal",
          onClick: () => setView("shipper-portal"),
        },
        {
          id: "documents",
          label: "Documents",
          icon: FileText,
          isActive: view === "document-compliance",
          onClick: () => setView("document-compliance"),
        },
        {
          id: "menu",
          label: "Suites",
          icon: LayoutGrid,
          isActive: isDrawerOpen,
          onClick: () => setIsDrawerOpen(true),
        },
      ]
    : [
        {
          id: "bol",
          label: "BOL",
          icon: FileText,
          isActive: isBolActive,
          color: "text-blue-600 dark:text-blue-400",
          onClick: () => setView("bol"),
        },
        {
          id: "shipments",
          label: "Ops",
          icon: Activity,
          isActive: isOpsActive && !isBolActive,
          color: "text-emerald-600 dark:text-emerald-400",
          onClick: () => setView("shipments"),
        },
        {
          id: "ledger",
          label: "Finance",
          icon: Landmark,
          isActive: isFinanceActive && !isBolActive,
          color: "text-amber-600 dark:text-amber-400",
          onClick: () => setView("ledger"),
        },
        {
          id: "crm-sales",
          label: "CRM",
          icon: Users,
          isActive: isCrmActive,
          color: "text-purple-600 dark:text-purple-400",
          onClick: () => setView("crm-sales"),
        },
        {
          id: "menu",
          label: "Suites",
          icon: LayoutGrid,
          isActive: isDrawerOpen || (!isBolActive && !isOpsActive && !isFinanceActive && !isCrmActive),
          color: "text-indigo-600 dark:text-indigo-400",
          onClick: () => setIsDrawerOpen(true),
        },
      ]

  return (
    <>
      {/* Fixed Ergonomic Bottom Bar on Mobile/Tablet */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800/90 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] no-print select-none transition-all"
      >
        <div className="flex items-center justify-around gap-1 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.isActive

            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-150 cursor-pointer select-none active:scale-95 ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400 font-black bg-blue-50/80 dark:bg-blue-950/40"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`h-5 w-5 transition-transform duration-200 ease-out ${
                      isActive ? "scale-110 -translate-y-0.5 text-blue-600 dark:text-blue-400" : ""
                    }`}
                  />
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 ring-2 ring-white dark:ring-slate-900 shadow-xs" />
                  )}
                </div>
                <span className="text-[10.5px] leading-tight mt-1 tracking-tight truncate max-w-full">
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* 33-Module Mobile Navigation Drawer */}
      <MobileNavDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentView={view}
        onNavigate={(modId) => setView(modId as any)}
      />
    </>
  )
}
