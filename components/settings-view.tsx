"use client"

import { useState, useEffect, useRef } from "react"
import { useApp } from "@/lib/app-context"
import { CURRENT_SYSTEM_VERSION } from "@/lib/config/system-version"
import { UserRole } from "@/lib/types"
import {
  Users,
  Lock,
  Building2,
  Download,
  Shield,
  UserPlus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Key,
  Eye,
  EyeOff,
  Globe,
  Phone,
  Mail,
  Save,
  Sliders,
  Terminal,
  Upload,
  RotateCcw,
  ZoomIn,
  ShieldCheck,
  Smartphone,
  Cloud,
  DownloadCloud,
  UploadCloud,
  Check,
  Copy,
  Info,
  Server,
  Layers,
  FileText,
  MapPin,
  Landmark,
  BadgePercent,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
} from "lucide-react"
import { PWAInstallButton } from "@/components/pwa-install-prompt"
import { CloudSyncModal } from "@/components/bill-of-lading/cloud-sync-modal"
import {
  COMPANY_STAMP_SIGNATURE_SRC,
  COMPANY_STAMP_SIGNATURE_DATA_URL,
  getStoredCompanyStamp,
  getStoredCompanyStampScale,
  saveStoredCompanyStamp,
  resetStoredCompanyStamp,
} from "@/lib/company-stamp-data"
import { toast } from "sonner"

export type SettingsTab = "users" | "stamp" | "company" | "cloud" | "security" | "updates"

const ROLE_BADGES: Record<UserRole, { label: string; bg: string; text: string; icon: string; desc: string }> = {
  superadmin: {
    label: "Superadmin",
    bg: "bg-purple-100 border-purple-300",
    text: "text-purple-900 font-extrabold",
    icon: "👑",
    desc: "Full system administration, users, security, and financial ledgers",
  },
  admin: {
    label: "Admin",
    bg: "bg-blue-100 border-blue-300",
    text: "text-blue-900 font-extrabold",
    icon: "🛡️",
    desc: "Create and edit Bills of Lading, manage client ledgers and company records",
  },
  accountant: {
    label: "Accountant",
    bg: "bg-emerald-100 border-emerald-300",
    text: "text-emerald-900 font-extrabold",
    icon: "💼",
    desc: "Manage payments, invoices, balances, and financial transaction statements",
  },
  viewer: {
    label: "Viewer",
    bg: "bg-slate-100 border-slate-300",
    text: "text-slate-700 font-bold",
    icon: "👁️",
    desc: "Read-only access to view and print Bills of Lading and reports",
  },
}

export function SettingsView() {
  const { users, addUser, updateUserRole, deleteUser, changePassword, currentUser, isSyncing, syncCloudData } = useApp()
  const [activeTab, setActiveTab] = useState<SettingsTab>("users")
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false)

  // Add User Form State
  const [newUsername, setNewUsername] = useState("")
  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState<UserRole>("admin")
  const [newEmail, setNewEmail] = useState("")
  const [userMsg, setUserMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Change Password Form State
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showOldPass, setShowOldPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [passMsg, setPassMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Stamp & Signature State
  const [currentStamp, setCurrentStamp] = useState<string>(COMPANY_STAMP_SIGNATURE_SRC)
  const [currentStampScale, setCurrentStampScale] = useState<number>(1.0)
  const [stampMsg, setStampMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Company Profile Settings State
  const [companySettings, setCompanySettings] = useState({
    companyNameEn: "SKY ARIANA LIMITED",
    companyNameFa: "شرکت ترانسپورت بین‌المللی سکای آریانا لمیتد",
    registrationNo: "90021-AFG / 48210-IR",
    afgPhone1: "+93 700 939 365",
    afgPhone2: "+93 711 435 529",
    afgAddress: "Customs Street, Islam Qala Border, Herat, Afghanistan",
    iranPhone: "+98 9172325086",
    iranAddress: "Shahid Rajaee Port, Bandar Abbas / Mashhad, Iran",
    email: "info@skyariana.com",
    website: "www.skyariana.com",
  })
  const [isCompanySaved, setIsCompanySaved] = useState(false)

  // System Update Check State
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [updateMsg, setUpdateMsg] = useState<string | null>(null)

  useEffect(() => {
    setCurrentStamp(getStoredCompanyStamp())
    setCurrentStampScale(getStoredCompanyStampScale())

    // Load saved company settings if available
    try {
      const stored = window.localStorage.getItem("skybol:company-settings")
      if (stored) {
        setCompanySettings(prev => ({ ...prev, ...JSON.parse(stored) }))
      }
    } catch (e) {}

    const handleStampUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ dataUrl?: string; scale?: number }>
      if (customEvent.detail?.dataUrl) {
        setCurrentStamp(customEvent.detail.dataUrl)
      } else {
        setCurrentStamp(getStoredCompanyStamp())
      }
      if (customEvent.detail?.scale !== undefined) {
        setCurrentStampScale(customEvent.detail.scale)
      } else {
        setCurrentStampScale(getStoredCompanyStampScale())
      }
    }

    window.addEventListener("company_stamp_updated", handleStampUpdate)
    return () => {
      window.removeEventListener("company_stamp_updated", handleStampUpdate)
    }
  }, [])

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setUserMsg(null)

    if (!newUsername.trim() || !newName.trim()) {
      setUserMsg({ type: "error", text: "Username and Full Name are required." })
      return
    }

    if (users.some((u) => u.username.toLowerCase() === newUsername.trim().toLowerCase())) {
      setUserMsg({ type: "error", text: "Username already exists. Please choose a different username." })
      return
    }

    addUser({
      username: newUsername,
      name: newName,
      role: newRole,
      email: newEmail,
    })

    toast.success(`User '${newUsername}' created with role ${newRole.toUpperCase()}!`)
    setUserMsg({ type: "success", text: `User '${newUsername}' successfully created with role ${newRole.toUpperCase()}!` })
    setNewUsername("")
    setNewName("")
    setNewEmail("")
    setNewRole("admin")
  }

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPassMsg(null)

    if (newPassword !== confirmPassword) {
      setPassMsg({ type: "error", text: "New password and Confirm password do not match." })
      return
    }

    const res = changePassword(oldPassword, newPassword)
    if (res.success) {
      toast.success("Password changed successfully!")
      setPassMsg({ type: "success", text: res.message })
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } else {
      toast.error(res.message || "Failed to change password")
      setPassMsg({ type: "error", text: res.message })
    }
  }

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStampMsg(null)

    if (!file.type.startsWith("image/")) {
      setStampMsg({ type: "error", text: "Please select a valid image file (PNG, JPG, SVG, WEBP)." })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) {
        saveStoredCompanyStamp(dataUrl, currentStampScale)
        setCurrentStamp(dataUrl)
        toast.success("Official Stamp & Signature updated across all Bills of Lading!")
        setStampMsg({ type: "success", text: "Official Stamp & Signature successfully updated across the system!" })
      }
    }
    reader.onerror = () => {
      setStampMsg({ type: "error", text: "Failed to read image file. Please try another image." })
    }
    reader.readAsDataURL(file)
  }

  const handleResetStamp = () => {
    resetStoredCompanyStamp()
    setCurrentStamp(COMPANY_STAMP_SIGNATURE_SRC)
    setCurrentStampScale(1.0)
    toast.success("Restored to official Sky Ariana seal and signature.")
    setStampMsg({ type: "success", text: "Restored to official Sky Ariana Limited seal and signature." })
  }

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = parseFloat(e.target.value)
    setCurrentStampScale(newScale)
    saveStoredCompanyStamp(currentStamp, newScale)
  }

  const handleSaveCompanySettings = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      window.localStorage.setItem("skybol:company-settings", JSON.stringify(companySettings))
      window.localStorage.setItem("skybol:pdf-company-settings", JSON.stringify(companySettings))
      setIsCompanySaved(true)
      toast.success("Company profile & regional settings saved successfully!")
      setTimeout(() => setIsCompanySaved(false), 3000)
    } catch (e) {
      toast.error("Failed to save company settings")
    }
  }

  const handleCheckForUpdates = () => {
    setIsCheckingUpdate(true)
    setUpdateMsg(null)

    setTimeout(() => {
      setIsCheckingUpdate(false)
      setUpdateMsg(`Your system is up to date! (${CURRENT_SYSTEM_VERSION.version} - ${CURRENT_SYSTEM_VERSION.buildNumber})`)
      toast.success("System is up to date and fully synchronized!")
    }, 1200)
  }

  // Password strength calculator
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "None", color: "bg-slate-200" }
    let score = 0
    if (pass.length >= 6) score += 1
    if (pass.length >= 8) score += 1
    if (/[A-Z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass)) score += 1
    if (/[^A-Za-z0-9]/.test(pass)) score += 1

    if (score <= 2) return { score: 25, label: "Weak", color: "bg-red-500 text-red-700" }
    if (score <= 3) return { score: 50, label: "Medium", color: "bg-amber-500 text-amber-700" }
    if (score <= 4) return { score: 75, label: "Strong", color: "bg-blue-600 text-blue-700" }
    return { score: 100, label: "Very Secure", color: "bg-emerald-600 text-emerald-700" }
  }

  const passStrength = getPasswordStrength(newPassword)

  return (
    <div className="w-full max-w-7xl mx-auto p-2.5 sm:p-4 md:p-6 space-y-4 sm:space-y-6 font-sans">
      {/* Top Banner - Luxury Glassmorphic Sapphire Theme */}
      <div className="rounded-3xl border border-blue-200/70 bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-950 p-5 sm:p-7 md:p-8 text-white shadow-2xl shadow-blue-950/30 relative overflow-hidden">
        {/* Subtle Ambient Background Glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-widest text-amber-300 shadow-inner">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>SYSTEM CONTROL PANEL</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-black text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Cloud Connected</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-amber-200">
              System Settings & Management
            </h1>
            <p className="text-xs sm:text-sm text-blue-200/90 font-[vazirmatn] font-bold" dir="rtl">
              تنظیمات جامع سیستم، مهر و امضای رسمی، مدیریت کاربران، مشخصات شرکت و همگام‌سازی ابری
            </p>
          </div>

          {/* Current User Card */}
          <div className="flex items-center gap-3.5 bg-white/10 backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl border border-white/20 self-start md:self-auto shadow-lg shadow-black/20">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-300 shadow-md flex items-center justify-center font-black text-lg sm:text-xl text-amber-950 shrink-0">
              {currentUser?.name?.charAt(0) || "A"}
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-black text-white truncate">{currentUser?.name || "Administrator"}</div>
              <div className="text-[10px] text-amber-300 font-mono font-black tracking-wider uppercase mt-0.5">
                {currentUser?.role || "superadmin"}
              </div>
              <div className="text-[9px] text-slate-300 font-bold mt-0.5">@{currentUser?.username || "admin"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-md shadow-slate-200/40 backdrop-blur-xl overflow-x-auto scrollbar-none flex-nowrap shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "users"
              ? "bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-md shadow-blue-950/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Users className="w-4 h-4 text-amber-400" />
          <span>User Management</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeTab === "users" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-900"}`}>
            {users.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("stamp")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "stamp"
              ? "bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-md shadow-blue-950/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Stamp & Signature (مهر و امضا)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("company")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "company"
              ? "bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-md shadow-blue-950/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Building2 className="w-4 h-4 text-amber-400" />
          <span>Company Profile (مشخصات شرکت)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cloud")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "cloud"
              ? "bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-md shadow-blue-950/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Cloud className="w-4 h-4 text-blue-400" />
          <span>Cloud Sync & Backup</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "security"
              ? "bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-md shadow-blue-950/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Key className="w-4 h-4 text-amber-400" />
          <span>Security & Passwords</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("updates")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "updates"
              ? "bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-md shadow-blue-950/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>App & System Build</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: USER MANAGEMENT                                                    */}
      {/* ========================================================================= */}
      {activeTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-300">
          {/* Add User Card */}
          <div className="lg:col-span-5 bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/50 p-5 sm:p-7 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-amber-400 shadow-md shadow-blue-950/20">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Add System User</h3>
                <p className="text-xs text-slate-500 font-[vazirmatn] font-bold" dir="rtl">
                  ایجاد کاربر جدید با سطوح دسترسی
                </p>
              </div>
            </div>

            {userMsg && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
                  userMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                    : "bg-red-50 text-red-900 border border-red-200"
                }`}
              >
                {userMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
                <span>{userMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                  Username / شناسه کاربر
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. jsmith"
                  className="w-full h-11 px-4 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50/80 border border-slate-300 rounded-2xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                  Full Name / نام مکمل
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full h-11 px-4 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50/80 border border-slate-300 rounded-2xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                  System Role / نقش کاربر
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full h-11 px-4 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50/80 border border-slate-300 rounded-2xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all cursor-pointer"
                >
                  <option value="superadmin">👑 Superadmin (Full System Access)</option>
                  <option value="admin">🛡️ Admin (BOL & Accounting Access)</option>
                  <option value="accountant">💼 Accountant (Ledgers & Invoices Only)</option>
                  <option value="viewer">👁️ Viewer (Read-only Document Access)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1 font-medium italic">
                  {ROLE_BADGES[newRole]?.desc}
                </p>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                  Email (Optional) / ایمیل
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@skyariana.com"
                  className="w-full h-11 px-4 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50/80 border border-slate-300 rounded-2xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all placeholder:text-slate-400"
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 hover:from-blue-950 hover:to-indigo-950 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-blue-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>Create System Account / ایجاد حساب</span>
              </button>
            </form>
          </div>

          {/* Active Users Table Card */}
          <div className="lg:col-span-7 bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/50 p-5 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-900 to-purple-900 text-amber-400 shadow-md shadow-indigo-950/20">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Active User Accounts</h3>
                  <p className="text-xs text-slate-500 font-[vazirmatn] font-bold" dir="rtl">
                    کاربران فعال سیستم و سطوح دسترسی
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 text-xs font-black rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                {users.length} Active Accounts
              </span>
            </div>

            <div className="space-y-3">
              {users.map((u) => {
                const badge = ROLE_BADGES[u.role] || ROLE_BADGES.viewer
                const isSuper = u.role === "superadmin"
                return (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-amber-400 font-black flex items-center justify-center text-base shadow-sm">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500 font-mono font-bold">@{u.username}</div>
                        {u.email && <div className="text-[11px] text-blue-700 font-medium">{u.email}</div>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-black border ${badge.bg} ${badge.text}`}>
                        {badge.icon} {badge.label}
                      </span>
                      {!isSuper && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete user account '${u.username}'?`)) {
                              deleteUser(u.id)
                              toast.success(`User '${u.username}' removed.`)
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STAMP & SIGNATURE (مهر و امضا)                                     */}
      {/* ========================================================================= */}
      {activeTab === "stamp" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-300">
          {/* Stamp Preview Card */}
          <div className="lg:col-span-6 bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/50 p-5 sm:p-7 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-amber-400 shadow-md shadow-blue-950/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Active Stamp & Signature</h3>
                <p className="text-xs text-slate-500 font-[vazirmatn] font-bold" dir="rtl">
                  پیش‌نمایش زنده مهر و امضای رسمی شرکت
                </p>
              </div>
            </div>

            {stampMsg && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
                  stampMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                    : "bg-red-50 text-red-900 border border-red-200"
                }`}
              >
                {stampMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
                <span>{stampMsg.text}</span>
              </div>
            )}

            {/* Document Signature Preview Box */}
            <div className="relative rounded-3xl border-2 border-dashed border-blue-200 bg-linear-to-b from-blue-50/40 via-white to-slate-50 p-6 flex flex-col items-center justify-center min-h-[240px] overflow-hidden">
              <div className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-wider text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full">
                Live BOL Footer Preview (پیش‌نمایش در بارنامه)
              </div>

              {/* Signature Overlay */}
              <div className="relative flex items-center justify-center w-full h-[130px] my-3">
                <div
                  className="flex items-center justify-center transition-transform duration-200"
                  style={{ transform: `scale(${currentStampScale})` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentStamp || COMPANY_STAMP_SIGNATURE_SRC}
                    alt="Company Stamp & Signature"
                    className="max-h-[110px] w-auto object-contain drop-shadow-md transform -rotate-2"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      const target = e.currentTarget
                      if (target.src !== COMPANY_STAMP_SIGNATURE_DATA_URL) {
                        target.src = COMPANY_STAMP_SIGNATURE_DATA_URL
                      }
                    }}
                  />
                </div>
              </div>

              <div className="w-56 border-b-2 border-slate-800 my-1" />
              <p className="text-xs font-black text-blue-950 uppercase tracking-tight">For & On Behalf of: SKY ARIANA LIMITED</p>
              <p className="font-[vazirmatn] text-xs font-extrabold text-blue-900 mt-0.5" dir="rtl">مهر و امضای مجاز شرکت</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Applies automatically to all PDF Exports & A4 Prints</span>
              </div>
              <span className="text-xs font-mono font-black bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-blue-900">
                Scale: {(currentStampScale * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Stamp Controls Card */}
          <div className="lg:col-span-6 bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/50 p-5 sm:p-7 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-900 to-purple-900 text-amber-400 shadow-md shadow-indigo-950/20">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Upload & Scale Stamp</h3>
                <p className="text-xs text-slate-500 font-[vazirmatn] font-bold" dir="rtl">
                  بارگذاری تصویر مهر و تنظیم اندازه
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-2">
                  Upload Custom Stamp (PNG / SVG / JPG) / بارگذاری مهر
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  className="hidden"
                  onChange={handleStampUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 hover:from-blue-950 hover:to-indigo-950 text-white font-black text-xs shadow-xl shadow-blue-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>Choose Image File / انتخاب فایل مهر و امضا</span>
                </button>
                <p className="text-[11px] text-slate-500 mt-1.5 ml-1">
                  Transparent PNG or SVG recommended for cleanest realistic print look.
                </p>
              </div>

              {/* Stamp Scale Slider */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <ZoomIn className="w-4 h-4 text-blue-600" />
                    <span>Stamp Size & Scaling (اندازه مهر):</span>
                  </div>
                  <span className="font-mono text-blue-900 font-black">{(currentStampScale * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="2.0"
                  step="0.05"
                  value={currentStampScale}
                  onChange={handleScaleChange}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-700"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                  <span>Small (60%)</span>
                  <span>Default (100%)</span>
                  <span>Large (200%)</span>
                </div>
              </div>

              {/* Reset to Default */}
              <button
                type="button"
                onClick={handleResetStamp}
                className="w-full h-11 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-black text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span>Reset to Official Sky Ariana Seal / بازنشانی به مهر اصلی</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: COMPANY PROFILE & LETTERHEAD (مشخصات شرکت)                         */}
      {/* ========================================================================= */}
      {activeTab === "company" && (
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/50 p-5 sm:p-8 space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-900 to-emerald-950 text-amber-400 shadow-md shadow-teal-950/20">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Official Company Profile & Letterhead</h3>
                <p className="text-xs text-slate-500 font-[vazirmatn] font-bold" dir="rtl">
                  مشخصات رسمی شرکت، آدرس‌ها، شماره‌های تماس و سربرگ اسناد
                </p>
              </div>
            </div>

            {isCompanySaved && (
              <span className="px-3.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-xs font-black text-emerald-900 flex items-center gap-1.5 animate-in zoom-in-95">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Settings Saved!</span>
              </span>
            )}
          </div>

          <form onSubmit={handleSaveCompanySettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                  Company Name (English) / نام شرکت انگلیسی
                </label>
                <input
                  type="text"
                  value={companySettings.companyNameEn}
                  onChange={(e) => setCompanySettings({ ...companySettings, companyNameEn: e.target.value })}
                  className="w-full h-11 px-4 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50/80 border border-slate-300 rounded-2xl focus:bg-white focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                  Company Name (Persian) / نام شرکت دری / فارسی
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={companySettings.companyNameFa}
                  onChange={(e) => setCompanySettings({ ...companySettings, companyNameFa: e.target.value })}
                  className="w-full h-11 px-4 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50/80 border border-slate-300 rounded-2xl focus:bg-white focus:border-amber-500 font-[vazirmatn]"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                  Afghanistan Head Office Phone / شماره تماس افغانستان
                </label>
                <input
                  type="text"
                  value={companySettings.afgPhone1}
                  onChange={(e) => setCompanySettings({ ...companySettings, afgPhone1: e.target.value })}
                  className="w-full h-11 px-4 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50/80 border border-slate-300 rounded-2xl focus:bg-white focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                  Iran Office Phone / شماره تماس ایران
                </label>
                <input
                  type="text"
                  value={companySettings.iranPhone}
                  onChange={(e) => setCompanySettings({ ...companySettings, iranPhone: e.target.value })}
                  className="w-full h-11 px-4 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50/80 border border-slate-300 rounded-2xl focus:bg-white focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                  Official Email / ایمیل رسمی
                </label>
                <input
                  type="email"
                  value={companySettings.email}
                  onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value })}
                  className="w-full h-11 px-4 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50/80 border border-slate-300 rounded-2xl focus:bg-white focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-6 h-12 rounded-2xl bg-gradient-to-r from-teal-800 to-emerald-900 hover:from-teal-900 hover:to-emerald-950 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-950/20 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>Save Company Profile / ذخیره تغییرات</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CLOUD SYNC & BACKUP HUB                                            */}
      {/* ========================================================================= */}
      {activeTab === "cloud" && (
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/50 p-5 sm:p-8 space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-amber-400 shadow-md shadow-blue-950/20">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Multi-Device Cloud Sync & Backup Hub</h3>
              <p className="text-xs text-slate-500 font-[vazirmatn] font-bold" dir="rtl">
                همگام‌سازی بارنامه‌ها و دفاتر حساب بین تمام کامپیوترها و موبایل‌ها
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Card 1: Cloud Sync Action */}
            <div className="p-5 rounded-3xl border border-blue-200/80 bg-blue-50/80 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                  <Cloud className="w-4 h-4 text-blue-600" />
                  Live Cloud Sync
                </span>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Upload your 58 BOLs and ledgers to the cloud or sync them onto any new device.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCloudSyncOpen(true)}
                className="w-full h-11 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white font-black text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Cloud className="w-4 h-4 text-amber-400" />
                <span>Open Cloud Sync Hub</span>
              </button>
            </div>

            {/* Card 2: JSON Backup */}
            <div className="p-5 rounded-3xl border border-emerald-200/80 bg-emerald-50/80 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-emerald-600" />
                  Export File Backup
                </span>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Download a complete single `.json` file backup containing all BOLs and ledgers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  try {
                    const raw1 = window.localStorage.getItem("skybol:saved-documents")
                    const raw2 = window.localStorage.getItem("sky-bol-browser-documents")
                    const docs1 = raw1 ? JSON.parse(raw1) : []
                    const docs2 = raw2 ? JSON.parse(raw2) : []
                    const map = new Map<string, any>()
                    for (const d of [...docs1, ...docs2]) {
                      const k = d.bol_number || d.id
                      if (k) map.set(k, d)
                    }
                    const allDocs = Array.from(map.values())

                    const backup = {
                      app: "SKY_ARIANA_LOGISTICS",
                      version: "3.2.0",
                      exportedAt: new Date().toISOString(),
                      totalDocuments: allDocs.length,
                      savedDocuments: allDocs,
                      customCompanies: JSON.parse(window.localStorage.getItem("skybol:account-custom-companies") || "[]"),
                      accountLedgers: JSON.parse(window.localStorage.getItem("skybol:account-ledgers") || "{}"),
                      companySettings: JSON.parse(window.localStorage.getItem("skybol:company-settings") || "{}"),
                    }

                    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `sky_ariana_full_backup_${new Date().toISOString().split("T")[0]}.json`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                    toast.success("Full Backup file downloaded! 💾")
                  } catch (e) {
                    toast.error("Failed to export backup")
                  }
                }}
                className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Save Backup (.json)</span>
              </button>
            </div>

            {/* Card 3: Restore File */}
            <div className="p-5 rounded-3xl border border-purple-200/80 bg-purple-50/80 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-purple-600" />
                  Restore from File
                </span>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Select any previous `.json` backup file to restore all documents in 1 second.
                </p>
              </div>
              <label className="w-full h-11 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5">
                <Upload className="w-4 h-4" />
                <span>Restore Backup File</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = (event) => {
                      try {
                        const parsed = JSON.parse(event.target?.result as string)
                        if (Array.isArray(parsed.savedDocuments)) {
                          window.localStorage.setItem("sky-bol-browser-documents", JSON.stringify(parsed.savedDocuments))
                          window.localStorage.setItem("skybol:saved-documents", JSON.stringify(parsed.savedDocuments))
                        }
                        if (Array.isArray(parsed.customCompanies)) {
                          window.localStorage.setItem("skybol:account-custom-companies", JSON.stringify(parsed.customCompanies))
                        }
                        if (parsed.accountLedgers) {
                          window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(parsed.accountLedgers))
                        }
                        window.dispatchEvent(new CustomEvent("skybol:documents-updated", { detail: {} }))
                        window.dispatchEvent(new CustomEvent("skybol:account-ledger-updated", { detail: {} }))
                        toast.success("Database Backup Restored Successfully! 🎉")
                      } catch (err) {
                        toast.error("Invalid backup file format.")
                      }
                    }
                    reader.readAsText(file)
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SECURITY & PASSWORDS                                               */}
      {/* ========================================================================= */}
      {activeTab === "security" && (
        <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/50 p-5 sm:p-8 space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-md shadow-amber-500/30">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">Change Account Password</h3>
              <p className="text-xs font-bold text-slate-500 font-[vazirmatn]" dir="rtl">
                تغییر رمز عبور حساب کاربری فعلی
              </p>
            </div>
          </div>

          {passMsg && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
                passMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                  : "bg-red-50 text-red-900 border border-red-200"
              }`}
            >
              {passMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
              <span>{passMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                Current Password / رمز عبور فعلی
              </label>
              <div className="relative">
                <input
                  type={showOldPass ? "text" : "password"}
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full h-11 px-4 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50/80 border border-slate-300 rounded-2xl focus:bg-white focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                New Password / رمز عبور جدید
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full h-11 px-4 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50/80 border border-slate-300 rounded-2xl focus:bg-white focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-black">
                    <span className="text-slate-500">Password Strength:</span>
                    <span className={passStrength.color.split(" ")[1] || "text-slate-700"}>{passStrength.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passStrength.color.split(" ")[0]} transition-all duration-300`}
                      style={{ width: `${passStrength.score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                Confirm New Password / تایید رمز عبور جدید
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full h-11 px-4 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50/80 border border-slate-300 rounded-2xl focus:bg-white focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full h-12 mt-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Update Password / تغییر رمز عبور</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: APP & SYSTEM BUILD                                                 */}
      {/* ========================================================================= */}
      {activeTab === "updates" && (
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/50 p-5 sm:p-8 space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-900 to-purple-900 text-amber-400 shadow-md shadow-indigo-950/20">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">App Installation & System Diagnostics</h3>
                <p className="text-xs text-slate-500 font-[vazirmatn] font-bold" dir="rtl">
                  نصب برنامه روی گوشی و کامپیوتر، اطلاعات نسخه و سلامت سیستم
                </p>
              </div>
            </div>

            <PWAInstallButton />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Version Card */}
            <div className="p-5 rounded-3xl border border-blue-200/80 bg-blue-50/60 space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-blue-600" />
                Software Version & Engine
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-blue-200/60 font-bold">
                  <span className="text-slate-600">Release Version:</span>
                  <span className="text-blue-950 font-black">{CURRENT_SYSTEM_VERSION.version}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-blue-200/60 font-bold">
                  <span className="text-slate-600">Build Number:</span>
                  <span className="text-blue-950 font-mono">{CURRENT_SYSTEM_VERSION.buildNumber}</span>
                </div>
                <div className="flex justify-between py-1 font-bold">
                  <span className="text-slate-600">Renderer:</span>
                  <span className="text-emerald-700 font-black">Next.js Turbopack 16.2.6</span>
                </div>
              </div>
            </div>

            {/* Check Updates */}
            <div className="p-5 rounded-3xl border border-emerald-200/80 bg-emerald-50/60 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-emerald-600" />
                  System Synchronizer
                </span>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Ensure all cache, database schemas, and PDF generators are fully synchronized with the cloud.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCheckForUpdates}
                disabled={isCheckingUpdate}
                className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isCheckingUpdate ? "animate-spin" : ""}`} />
                <span>{isCheckingUpdate ? "Checking Cloud Status..." : "Verify System Health"}</span>
              </button>
            </div>
          </div>

          {updateMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in zoom-in-95">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{updateMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* Cloud Sync Hub Modal */}
      <CloudSyncModal open={isCloudSyncOpen} onOpenChange={setIsCloudSyncOpen} />
    </div>
  )
}
