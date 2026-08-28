"use client"

import { useApp } from "@/lib/app-context"
import { Building2, FileText, Landmark, Settings as SettingsIcon, Cloud, Receipt, Truck, TrendingUp } from "lucide-react"
import { useState } from "react"
import { CloudSyncModal } from "@/components/bill-of-lading/cloud-sync-modal"

export function MobileBottomNav() {
  const { view, setView, currentUser } = useApp()
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false)

  const isShipper = currentUser?.role === 'shipper'

  const navItems = [
    {
      id: "accounts",
      label: isShipper ? "My Portal" : "Accounts",
      icon: Building2,
      activeClass: "text-blue-600 bg-blue-50 border-blue-200",
      activeIndicator: "bg-blue-600",
      onClick: () => setView("accounts")
    },
    {
      id: "bol",
      label: "BOL",
      icon: FileText,
      activeClass: "text-amber-600 bg-amber-50 border-amber-200",
      activeIndicator: "bg-amber-500",
      onClick: () => setView("bol")
    },
    {
      id: "sky-cmr",
      label: "Sky CMR",
      icon: Truck,
      activeClass: "text-blue-600 bg-blue-50 border-blue-200",
      activeIndicator: "bg-blue-600",
      onClick: () => setView("sky-cmr")
    },
    {
      id: "invoice-pad",
      label: "Invoice",
      icon: Receipt,
      activeClass: "text-indigo-600 bg-indigo-50 border-indigo-200",
      activeIndicator: "bg-indigo-600",
      onClick: () => setView("invoice-pad")
    },
    {
      id: "bank",
      label: "Bank",
      icon: Landmark,
      activeClass: "text-emerald-600 bg-emerald-50 border-emerald-200",
      activeIndicator: "bg-emerald-600",
      onClick: () => setView("bank")
    },
    {
      id: "reports",
      label: "Reports",
      icon: TrendingUp,
      activeClass: "text-blue-700 bg-blue-50 border-blue-200",
      activeIndicator: "bg-blue-600",
      onClick: () => setView("reports")
    },
    ...(!isShipper ? [{
      id: "settings",
      label: "Settings",
      icon: SettingsIcon,
      activeClass: "text-purple-600 bg-purple-50 border-purple-200",
      activeIndicator: "bg-purple-600",
      onClick: () => setView("settings")
    }] : [])
  ]

  return (
    <>
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-2xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-2 py-1.5 pb-safe no-print transition-all">
        <div className="flex items-center justify-around gap-1 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = view === item.id || (item.id === "accounts" && (view === "companies" || view === "ledger"))
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer select-none active:scale-90 ${
                  isActive ? item.activeClass + " font-black shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <div className="relative">
                  <Icon className={`h-4.5 w-4.5 ${isActive ? "scale-110" : ""}`} />
                  {isActive && (
                    <span className={`absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full ${item.activeIndicator} animate-ping`} />
                  )}
                </div>
                <span className="text-[10px] font-black leading-tight mt-0.5 tracking-tight truncate max-w-[58px]">
                  {item.label}
                </span>
              </button>
            )
          })}

          {/* Quick Cloud Sync Action */}
          <button
            type="button"
            onClick={() => setIsCloudSyncOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-blue-900 bg-blue-50/70 border border-blue-200/60 shadow-2xs transition-all cursor-pointer select-none active:scale-90"
          >
            <div className="relative">
              <Cloud className="h-4.5 w-4.5 text-blue-600" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <span className="text-[10px] font-black leading-tight mt-0.5 text-blue-950 truncate max-w-[58px]">
              Sync
            </span>
          </button>
        </div>
      </nav>

      <CloudSyncModal open={isCloudSyncOpen} onOpenChange={setIsCloudSyncOpen} />
    </>
  )
}
