"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import {
  Bell,
  LogOut,
  LayoutDashboard,
  Package,
  FileText,
  CreditCard,
  BarChart3,
  HelpCircle,
  User,
  Eye,
  Check,
  Globe,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CustomerPortalSession, CustomerPortalNotification } from "@/lib/types/customer-portal"

interface CustomerPortalHeaderProps {
  session: CustomerPortalSession
  activeTab: string
  onSelectTab: (tab: string) => void
  onSignOut: () => void
  currentLanguage: "en" | "fa" | "ps"
  onChangeLanguage: (lang: "en" | "fa" | "ps") => void
}

export function CustomerPortalHeader({
  session,
  activeTab,
  onSelectTab,
  onSignOut,
  currentLanguage,
  onChangeLanguage,
}: CustomerPortalHeaderProps) {
  const [notifications, setNotifications] = useState<CustomerPortalNotification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)

  // Fetch notifications
  useEffect(() => {
    let isMounted = true
    const fetchNotifs = async () => {
      try {
        const res = await fetch("/api/portal/notifications")
        if (res.ok) {
          const data = await res.json()
          if (isMounted && Array.isArray(data.notifications)) {
            setNotifications(data.notifications)
          }
        }
      } catch {}
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markRead = async (id: string) => {
    try {
      await fetch("/api/portal/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch {}
  }

  const navItems = [
    { id: "dashboard", label: currentLanguage === "fa" ? "داشبورد" : currentLanguage === "ps" ? "ډشبورډ" : "Dashboard", icon: LayoutDashboard },
    { id: "shipments", label: currentLanguage === "fa" ? "محموله‌ها" : currentLanguage === "ps" ? "بارونه" : "Shipments", icon: Package, show: session.permissions.viewShipments },
    { id: "documents", label: currentLanguage === "fa" ? "اسناد" : currentLanguage === "ps" ? "اسناد" : "Documents", icon: FileText, show: session.permissions.viewDocuments || session.permissions.viewBol },
    { id: "ledger", label: currentLanguage === "fa" ? "حساب مالی" : currentLanguage === "ps" ? "مالي حساب" : "Account Ledger", icon: CreditCard, show: session.permissions.viewAccountLedger },
    { id: "reports", label: currentLanguage === "fa" ? "گزارشات" : currentLanguage === "ps" ? "راپورونه" : "Reports", icon: BarChart3, show: session.permissions.viewReports },
    { id: "requests", label: currentLanguage === "fa" ? "درخواست‌ها" : currentLanguage === "ps" ? "غوښتنې" : "Requests", icon: HelpCircle },
    { id: "profile", label: currentLanguage === "fa" ? "پروفایل" : currentLanguage === "ps" ? "پېژندنه" : "Profile", icon: User },
  ].filter((item) => item.show !== false)

  return (
    <div className="w-full sticky top-0 z-50">
      {/* ⚠️ ADMIN PREVIEW WARNING BANNER */}
      {session.isAdminPreview && (
        <div className="w-full bg-amber-500 text-slate-950 font-bold text-xs py-2 px-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-slate-950 animate-pulse shrink-0" />
            <span>
              ADMIN PREVIEW MODE — You are viewing the live portal view for <strong>{session.customerName}</strong>. Actions are sandboxed.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs bg-slate-950 text-white hover:bg-slate-900 border-none cursor-pointer"
            onClick={onSignOut}
          >
            Exit Preview
          </Button>
        </div>
      )}

      {/* Main Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
          {/* Brand & Customer Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-950/70 border border-blue-500/30 flex items-center justify-center p-1.5 shrink-0">
              <Image src="/logo.png" alt="AQ Companies Logo" width={32} height={32} className="object-contain" priority />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold tracking-tight text-white truncate">
                  AQ COMPANIES
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                  Portal
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-300 truncate max-w-xs sm:max-w-md">
                {session.customerName}
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id || (item.id === "shipments" && activeTab === "shipment-detail")
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* User Controls & Bell */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                title="Switch Language"
              >
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span className="uppercase">{currentLanguage}</span>
              </button>

              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in">
                  <button
                    onClick={() => { onChangeLanguage("en"); setShowLangMenu(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 flex items-center justify-between"
                  >
                    <span>English</span>
                    {currentLanguage === "en" && <Check className="w-3 h-3 text-blue-400" />}
                  </button>
                  <button
                    onClick={() => { onChangeLanguage("fa"); setShowLangMenu(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 flex items-center justify-between font-farsi"
                  >
                    <span>دری / فارسی</span>
                    {currentLanguage === "fa" && <Check className="w-3 h-3 text-blue-400" />}
                  </button>
                  <button
                    onClick={() => { onChangeLanguage("ps"); setShowLangMenu(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 flex items-center justify-between font-farsi"
                  >
                    <span>پښتو</span>
                    {currentLanguage === "ps" && <Check className="w-3 h-3 text-blue-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-800 mb-1">
                    <span className="text-xs font-bold text-white">Notifications</span>
                    <span className="text-[10px] text-slate-400">{unreadCount} unread</span>
                  </div>

                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">No notifications yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => { markRead(n.id); if (n.shipmentId) onSelectTab("shipments") }}
                          className={`p-2.5 rounded-lg text-xs transition-colors cursor-pointer ${
                            n.read ? "bg-slate-950/40 text-slate-400" : "bg-blue-950/40 text-slate-200 border border-blue-900/50"
                          }`}
                        >
                          <div className="font-semibold text-white text-[11px] mb-0.5">{n.title}</div>
                          <p className="text-[11px] text-slate-300">{n.message}</p>
                          <span className="text-[9px] text-slate-500 mt-1 block">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sign Out */}
            <Button
              variant="outline"
              size="sm"
              onClick={onSignOut}
              className="h-8 text-xs border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="lg:hidden border-t border-slate-800 px-2 py-2 overflow-x-auto flex items-center gap-1.5 no-scrollbar bg-slate-950/60">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id || (item.id === "shipments" && activeTab === "shipment-detail")
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </header>
    </div>
  )
}
