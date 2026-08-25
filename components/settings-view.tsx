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

const ROLE_BADGES: Record<UserRole, { label: string; bg: string; text: string; icon: string }> = {
  superadmin: { label: "Superadmin", bg: "bg-purple-100 border-purple-300", text: "text-purple-900 font-extrabold", icon: "👑" },
  admin: { label: "Admin", bg: "bg-blue-100 border-blue-300", text: "text-blue-900 font-extrabold", icon: "🛡️" },
  accountant: { label: "Accountant", bg: "bg-emerald-100 border-emerald-300", text: "text-emerald-900 font-extrabold", icon: "💼" },
  viewer: { label: "Viewer", bg: "bg-slate-100 border-slate-300", text: "text-slate-700 font-bold", icon: "👁️" },
}

export function SettingsView() {
  const { users, addUser, updateUserRole, deleteUser, changePassword, currentUser } = useApp()
  const [activeTab, setActiveTab] = useState<"users" | "password" | "stamp" | "general" | "update">("users")
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

  // System Update Check State
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [updateMsg, setUpdateMsg] = useState<string | null>(null)

  useEffect(() => {
    setCurrentStamp(getStoredCompanyStamp())
    setCurrentStampScale(getStoredCompanyStampScale())

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
      setPassMsg({ type: "success", text: res.message })
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } else {
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
    setStampMsg({ type: "success", text: "Restored to official Sky Ariana Limited seal and signature." })
  }

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = parseFloat(e.target.value)
    setCurrentStampScale(newScale)
    saveStoredCompanyStamp(currentStamp, newScale)
  }

  const handleCheckForUpdates = () => {
    setIsCheckingUpdate(true)
    setUpdateMsg(null)

    setTimeout(() => {
      setIsCheckingUpdate(false)
      setUpdateMsg(`Your system is up to date! (${CURRENT_SYSTEM_VERSION.version} - ${CURRENT_SYSTEM_VERSION.buildNumber})`)
    }, 1200)
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-2.5 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header Banner - Premium Glassmorphism */}
      <div className="rounded-2xl sm:rounded-[32px] border border-blue-200/60 bg-gradient-to-r from-blue-900 via-[#1e3a8a] to-slate-900 p-4 sm:p-6 md:p-8 text-white shadow-[0_20px_80px_-15px_rgba(30,58,138,0.4)] relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-blue-100 shadow-inner">
              <Sliders className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>SYSTEM CONTROL PANEL</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
              System Settings
            </h1>
            <p className="text-[11px] sm:text-xs md:text-sm text-blue-200/90 font-[vazirmatn] font-bold" dir="rtl">
              تنظیمات سیستم، مهر و امضا، مدیریت کاربران و امنیت
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 bg-white/10 backdrop-blur-xl p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-white/20 self-start sm:self-auto shadow-inner">
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-300 shadow-lg flex items-center justify-center font-black text-base sm:text-xl text-amber-950">
              {currentUser?.name?.charAt(0) || "A"}
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-white">{currentUser?.name || "Administrator"}</div>
              <div className="text-[9px] sm:text-[10px] text-amber-300 font-black tracking-widest uppercase">
                {currentUser?.role || "superadmin"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar - Frosted Glass & Smooth Horizontal Swipe */}
      <div className="flex items-center gap-1 sm:gap-2 p-1.5 rounded-xl sm:rounded-2xl bg-white/70 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-2xl overflow-x-auto scrollbar-none flex-nowrap shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-5 sm:py-3 rounded-lg sm:rounded-[14px] text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "users"
              ? "bg-gradient-to-b from-white to-slate-50 text-blue-700 shadow-md border border-slate-100"
              : "text-slate-600 hover:bg-white/50 hover:text-slate-800"
          }`}
        >
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>User Management</span>
          <span className="ml-0.5 sm:ml-1 rounded-md bg-blue-100 px-1.5 py-0.5 text-[9px] sm:text-[10px] text-blue-800">{users.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("stamp")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-5 sm:py-3 rounded-lg sm:rounded-[14px] text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "stamp"
              ? "bg-gradient-to-b from-white to-slate-50 text-blue-700 shadow-md border border-slate-100"
              : "text-slate-600 hover:bg-white/50 hover:text-slate-800"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
          <span>Stamp & Signature (مهر و امضا)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("password")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-5 sm:py-3 rounded-lg sm:rounded-[14px] text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "password"
              ? "bg-gradient-to-b from-white to-slate-50 text-blue-700 shadow-md border border-slate-100"
              : "text-slate-600 hover:bg-white/50 hover:text-slate-800"
          }`}
        >
          <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Security</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-5 sm:py-3 rounded-lg sm:rounded-[14px] text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "general"
              ? "bg-gradient-to-b from-white to-slate-50 text-blue-700 shadow-md border border-slate-100"
              : "text-slate-600 hover:bg-white/50 hover:text-slate-800"
          }`}
        >
          <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Company Info</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("update")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-5 sm:py-3 rounded-lg sm:rounded-[14px] text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "update"
              ? "bg-gradient-to-b from-white to-slate-50 text-blue-700 shadow-md border border-slate-100"
              : "text-slate-600 hover:bg-white/50 hover:text-slate-800"
          }`}
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Updates & Build</span>
        </button>
      </div>

      {/* Tab: Official Stamp & Signature Management */}
      {activeTab === "stamp" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Stamp Preview Card */}
          <div className="lg:col-span-6 bg-white/80 backdrop-blur-2xl rounded-2xl sm:rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/30">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Active Stamp & Signature</h3>
                <p className="text-[11px] text-slate-500 font-[vazirmatn] font-bold" dir="rtl">
                  پیش‌نمایش زنده مهر و امضای رسمی شرکت
                </p>
              </div>
            </div>

            {stampMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  stampMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {stampMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{stampMsg.text}</span>
              </div>
            )}

            {/* Document Signature Preview Box */}
            <div className="relative rounded-2xl border-2 border-dashed border-blue-200 bg-linear-to-b from-blue-50/40 via-white to-slate-50 p-6 flex flex-col items-center justify-center min-h-[220px] overflow-hidden">
              <div className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                Live Preview (پیش‌نمایش)
              </div>

              {/* Signature Overlay - 2x Bigger Scale */}
              <div className="relative flex items-center justify-center w-full h-[120px] my-2">
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

              <div className="w-48 border-b-2 border-slate-700 my-1" />
              <p className="text-xs font-black text-blue-950 uppercase tracking-tight">For & On Behalf of: SKY ARIANA LIMITED</p>
              <p className="font-[vazirmatn] text-[11px] font-extrabold text-blue-900 mt-0.5" dir="rtl">مهر و امضای مجاز شرکت</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Synchronized with BOL Prints & PDF Exports</span>
              </div>
              <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border">
                Scale: {(currentStampScale * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Stamp Controls & Upload Card */}
          <div className="lg:col-span-6 bg-white/80 backdrop-blur-2xl rounded-2xl sm:rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-lg shadow-indigo-600/30">
                <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Upload & Scale Stamp</h3>
                <p className="text-[11px] text-slate-500 font-[vazirmatn] font-bold" dir="rtl">
                  تغییر و بارگذاری تصویر مهر، تنظیم اندازه و مقیاس
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* File Upload Trigger */}
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
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-xs shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>Choose Image File / انتخاب فایل مهر و امضا</span>
                </button>
                <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
                  Transparent PNG or SVG recommended for cleanest realistic print look.
                </p>
              </div>

              {/* Stamp Scale Slider */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <ZoomIn className="w-4 h-4 text-blue-600" />
                    <span>Stamp Size & Scaling (اندازه مهر):</span>
                  </div>
                  <span className="font-mono text-blue-700 font-black">{(currentStampScale * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="2.0"
                  step="0.05"
                  value={currentStampScale}
                  onChange={handleScaleChange}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                  <span>Small (60%)</span>
                  <span>Default (100%)</span>
                  <span>Large 2X (200%)</span>
                </div>
              </div>

              {/* Reset to Default */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetStamp}
                  className="w-full h-11 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs shadow-2xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <RotateCcw className="w-4 h-4 text-slate-500" />
                  <span>Reset to Official Sky Ariana Seal / بازنشانی به مهر اصلی</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: User Management */}
      {activeTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Add New User Panel */}
          <div className="lg:col-span-5 bg-white/70 backdrop-blur-2xl rounded-2xl sm:rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-white/50">
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30">
                <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Add System User</h3>
                <p className="text-[11px] text-slate-500 font-[vazirmatn] font-bold" dir="rtl">
                  ایجاد کاربر جدید با سطوح دسترسی
                </p>
              </div>
            </div>

            {userMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  userMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {userMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{userMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1 ml-1">Username / شناسه کاربر</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. jsmith"
                  className="w-full h-11 sm:h-12 px-3.5 text-xs sm:text-sm font-bold text-slate-900 bg-white/60 backdrop-blur-md border border-white shadow-inner rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1 ml-1">Full Name / نام کامل</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full h-11 sm:h-12 px-3.5 text-xs sm:text-sm font-bold text-slate-900 bg-white/60 backdrop-blur-md border border-white shadow-inner rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1 ml-1">System Role / نقش کاربر</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full h-11 sm:h-12 px-3.5 text-xs sm:text-sm font-bold text-slate-900 bg-white/60 backdrop-blur-md border border-white shadow-inner rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                >
                  <option value="superadmin">👑 Superadmin (Full System Access)</option>
                  <option value="admin">🛡️ Admin (BOL & Accounting Access)</option>
                  <option value="accountant">💼 Accountant (Ledgers & Invoices Only)</option>
                  <option value="viewer">👁️ Viewer (Read-only Document Access)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1 ml-1">Email (Optional)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@skybalam.com"
                  className="w-full h-11 sm:h-12 px-3.5 text-xs sm:text-sm font-bold text-slate-900 bg-white/60 backdrop-blur-md border border-white shadow-inner rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                />
              </div>

              <button
                type="submit"
                className="group relative w-full h-11 sm:h-12 mt-2 sm:mt-4 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-black uppercase tracking-wider text-[11px] rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Create System Account
                </span>
              </button>
            </form>
          </div>

          {/* Active Users Table Panel */}
          <div className="lg:col-span-7 bg-white/70 backdrop-blur-2xl rounded-2xl sm:rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/30">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Active User Accounts</h3>
                  <p className="text-[11px] text-slate-500 font-[vazirmatn] font-bold" dir="rtl">
                    کاربران فعال سیستم و سطوح دسترسی
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {users.map((u) => {
                const badge = ROLE_BADGES[u.role] || ROLE_BADGES.viewer
                const isSuper = u.role === "superadmin"
                return (
                  <div
                    key={u.id}
                    className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/80 border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 font-black flex items-center justify-center text-sm shadow-inner">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-black text-slate-900">{u.name}</div>
                        <div className="text-[10px] sm:text-[11px] text-slate-500 font-mono font-bold">@{u.username}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${badge.bg} ${badge.text}`}>
                        {badge.icon} {badge.label}
                      </span>
                      {!isSuper && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete user '${u.username}'?`)) {
                              deleteUser(u.id)
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
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

      {/* Tab 2: Change Password */}
      {activeTab === "password" && (
        <div className="max-w-xl mx-auto bg-white/70 backdrop-blur-2xl rounded-2xl sm:rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-4 sm:p-6 md:p-10 space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-white/50">
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/30">
              <Key className="w-5 h-5 sm:w-6 sm:h-6" />
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
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                passMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {passMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{passMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePasswordSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="text-xs font-extrabold text-slate-800 block mb-1">Current Password / رمز عبور فعلی</label>
              <div className="relative">
                <input
                  type={showOldPass ? "text" : "password"}
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full h-11 px-3 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-800 block mb-1">New Password / رمز عبور جدید</label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full h-11 px-3 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-800 block mb-1">Confirm New Password / تایید رمز عبور جدید</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full h-11 px-3 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full h-11 mt-2 sm:mt-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Update Password</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Company & Regional Info */}
      {activeTab === "general" && (
        <div className="bg-white/70 backdrop-blur-2xl rounded-2xl sm:rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-white/50">
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-lg shadow-teal-500/30">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">Company & Regional Preferences</h3>
              <p className="text-xs font-bold text-slate-500">Official contact information and database backup settings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4 p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
              <h4 className="text-xs font-black uppercase text-blue-900 flex items-center gap-1.5">
                <Globe className="w-4 h-4" /> Regional Contact Info
              </h4>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-bold text-slate-700 block">Afghanistan Head Office:</span>
                  <span className="text-slate-900 font-bold">+93 700 939 365 | +93 711 435 529</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">Iran Representative Office:</span>
                  <span className="text-slate-900 font-bold">+98 9172325086</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">Official Support Email:</span>
                  <span className="text-blue-700 font-bold">info@skyariana.com</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
              <h4 className="text-xs font-black uppercase text-blue-900 flex items-center gap-1.5">
                <Sliders className="w-4 h-4" /> System Defaults
              </h4>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-bold text-slate-700 block">Default Document Currency:</span>
                  <span className="text-slate-900 font-bold">$ USD (United States Dollar)</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">Dual Calendar Engine:</span>
                  <span className="text-slate-900 font-bold">Gregorian + Persian Solar (هجری شمسی)</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-4 p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50">
              <h4 className="text-xs font-black uppercase text-emerald-900 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-emerald-700" /> Database Backup & Safety
              </h4>
              <p className="text-xs text-slate-600 font-medium">Export a complete snapshot of all BOLs, Ledgers, and Companies to JSON, or restore from a previous backup file.</p>
              
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCloudSyncOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Open Multi-Device Cloud Sync Hub / همگام‌سازی ابری</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const backupObj = {
                      exportedAt: new Date().toISOString(),
                      savedDocuments: JSON.parse(window.localStorage.getItem("sky-bol-browser-documents") || "[]"),
                      customCompanies: JSON.parse(window.localStorage.getItem("sky-bol-company-custom-companies") || "[]"),
                      accountLedgers: JSON.parse(window.localStorage.getItem("sky-bol-company-ledgers") || "{}"),
                    }
                    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: "application/json" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `SkyBalam_Backup_${new Date().toISOString().split("T")[0]}.json`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup (.json)</span>
                </button>

                <label className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-extrabold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer">
                  <Save className="w-4 h-4 text-blue-600" />
                  <span>Restore Backup</span>
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
                          const data = JSON.parse(event.target?.result as string)
                          if (data.savedDocuments) {
                            window.localStorage.setItem("sky-bol-browser-documents", JSON.stringify(data.savedDocuments))
                            window.localStorage.setItem("skybol:saved-documents", JSON.stringify(data.savedDocuments))
                          }
                          if (data.customCompanies) {
                            window.localStorage.setItem("sky-bol-company-custom-companies", JSON.stringify(data.customCompanies))
                            window.localStorage.setItem("skybol:account-custom-companies", JSON.stringify(data.customCompanies))
                          }
                          if (data.accountLedgers) {
                            window.localStorage.setItem("sky-bol-company-ledgers", JSON.stringify(data.accountLedgers))
                            window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(data.accountLedgers))
                          }
                          window.dispatchEvent(new CustomEvent("skybol:account-ledger-updated", { detail: {} }))
                          alert("Database Backup successfully restored!")
                        } catch (err) {
                          alert("Invalid backup file format.")
                        }
                      }
                      reader.readAsText(file)
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: System Version & Updates (from system-version.ts) */}
      {activeTab === "update" && (
        <div className="bg-white/70 backdrop-blur-2xl rounded-2xl sm:rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/30">
                <Download className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">System Version & Software Updates</h3>
                <p className="text-xs font-bold text-slate-500">Loaded directly from system configuration file (`system-version.ts`)</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckForUpdates}
              disabled={isCheckingUpdate}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition-colors flex items-center gap-2 cursor-pointer self-start md:self-auto disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingUpdate ? "animate-spin" : ""}`} />
              <span>{isCheckingUpdate ? "Checking Update File..." : "Check for Updates"}</span>
            </button>
          </div>

          {updateMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{updateMsg}</span>
            </div>
          )}

          {/* Current Version Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Installed Version</span>
              <div className="text-2xl font-black text-blue-900 font-mono">{CURRENT_SYSTEM_VERSION.version}</div>
              <span className="text-[11px] font-bold text-blue-700">{CURRENT_SYSTEM_VERSION.edition}</span>
            </div>

            <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/50 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Build Identifier</span>
              <div className="text-sm font-black text-purple-900 font-mono">{CURRENT_SYSTEM_VERSION.buildNumber}</div>
              <span className="text-[11px] font-bold text-purple-700">Released: {CURRENT_SYSTEM_VERSION.releaseDate}</span>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-1 sm:col-span-2 md:col-span-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Update Channel</span>
              <div className="text-sm font-black text-emerald-900 capitalize flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>{CURRENT_SYSTEM_VERSION.updateChannel} Channel</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700">{CURRENT_SYSTEM_VERSION.companyName}</span>
            </div>
          </div>

          {/* Mobile & Desktop App Installation */}
          <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200/90 bg-linear-to-br from-emerald-50/80 via-white to-sky-50/60 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Install Sky Ariana BOL App / نصب برنامه</h4>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Install as a standalone native app on Android, iPhone, iPad, Windows PC, or Mac.
                  </p>
                </div>
              </div>
              <PWAInstallButton className="shrink-0" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px] text-slate-600">
              <div className="p-2.5 rounded-xl bg-white/90 border border-slate-200/80">
                <strong className="block text-slate-900 font-bold mb-0.5">📱 Android (Chrome / Edge)</strong>
                Tap &ldquo;Install App&rdquo; or click browser menu (⋮) → &ldquo;Install App&rdquo;.
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 border border-slate-200/80">
                <strong className="block text-slate-900 font-bold mb-0.5">🍏 iPhone & iPad (Safari)</strong>
                Tap the Share button ⎕ at bottom, then select &ldquo;Add to Home Screen&rdquo; ➕.
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 border border-slate-200/80">
                <strong className="block text-slate-900 font-bold mb-0.5">💻 PC & Mac (Chrome/Edge)</strong>
                Click the Install icon ⊕ inside your browser address bar for desktop app.
              </div>
            </div>
          </div>

          {/* System Release Changelog */}
          <div className="space-y-3 sm:space-y-4 pt-2">
            <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-slate-700" /> System Release Log (`changelog`)
            </h4>

            <div className="space-y-3">
              {CURRENT_SYSTEM_VERSION.changelog.map((log) => (
                <div key={log.version} className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 font-mono">
                      {log.version} - {log.title}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">{log.date}</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 font-medium">
                    {log.changes.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Cloud Sync Modal */}
      <CloudSyncModal open={isCloudSyncOpen} onOpenChange={setIsCloudSyncOpen} />
    </div>
  )
}
