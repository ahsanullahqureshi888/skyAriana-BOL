"use client"
import React, { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { 
  Building2, 
  LayoutDashboard, 
  Truck, 
  Box, 
  FileSpreadsheet, 
  Receipt, 
  CreditCard, 
  FileText, 
  UserCircle, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck 
} from "lucide-react"

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === "/client/login"
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [session, setSession] = useState<{ username?: string; companyName?: string } | null>(null)

  useEffect(() => {
    if (isLoginPage) return
    fetch("/api/client/auth/session")
      .then(res => {
        if (res.status === 401) {
          router.push("/client/login")
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data?.session) {
          setSession(data.session)
        }
      })
      .catch(() => {})
  }, [pathname, isLoginPage, router])

  if (isLoginPage) {
    return <div className="min-h-screen bg-slate-900 font-sans text-slate-100">{children}</div>
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/client/auth/logout", { method: "POST" })
    } finally {
      router.push("/client/login")
    }
  }

  const navItems = [
    { name: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard },
    { name: "Shipments & BOLs", href: "/client/shipments", icon: Truck },
    { name: "Containers", href: "/client/containers", icon: Box },
    { name: "Invoices", href: "/client/invoices", icon: Receipt },
    { name: "Ledger Statement", href: "/client/ledger", icon: FileSpreadsheet },
    { name: "Payments & Proofs", href: "/client/payments", icon: CreditCard },
    { name: "Documents", href: "/client/documents", icon: FileText },
    { name: "Company Profile", href: "/client/profile", icon: UserCircle },
  ]

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100 font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
        <div className="flex items-center gap-2 font-black text-lg">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black">
            SA
          </div>
          <div>
            <div className="text-sm font-black tracking-wide">SKY ARIANA</div>
            <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Client Portal</div>
          </div>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-slate-900 border-r border-slate-800 text-slate-200 shrink-0 flex flex-col z-30`}>
        {/* Company & Brand Header */}
        <div className="hidden md:flex items-center gap-3 p-6 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-md shadow-amber-500/20">
            SA
          </div>
          <div>
            <div className="font-black text-white text-base tracking-wide">SKY ARIANA</div>
            <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">Client Portal</div>
          </div>
        </div>

        {/* Current Client Badge */}
        {session && (
          <div className="px-5 py-3 mx-3 my-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-black text-white truncate">{session.companyName || "Authorized Client"}</div>
              <div className="text-[10px] text-slate-400 font-medium truncate">@{session.username}</div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== "/client/dashboard" && pathname.startsWith(item.href))
            return (
              <a 
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                {item.name}
              </a>
            )
          })}
        </nav>

        {/* Security & Logout Footer */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Encrypted Session</span>
          </div>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-3 px-3.5 py-2.5 w-full text-left rounded-xl font-bold text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
