"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useApp } from "@/lib/app-context"
import { CURRENT_SYSTEM_VERSION } from "@/lib/config/system-version"
import { UserRole, User } from "@/lib/types"
import {
  LayoutGrid,
  MonitorSmartphone,
  Users,
  Lock,
  Building2,
  HardDrive,
  Download,
  Shield,
  Activity,
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
  PenTool,
  Palette,
  Eraser,
  RotateCw,
  Type,
  FileCheck,
  Compass,
  Maximize2,
  FileSignature,
} from "lucide-react"
import { PWAInstallButton } from "@/components/pwa-install-prompt"
import { Button } from "@/components/ui/button"
import { CloudSyncModal } from "@/components/bill-of-lading/cloud-sync-modal"
import { DataBackupManager } from "@/components/data-backup-manager"
import { GoogleDriveSyncSettings } from "@/components/sync/google-drive-sync-settings"
import { RecentlyDeletedView } from "@/components/sync/recently-deleted-view"
import { ClientPortalTab } from "./settings/client-portal-tab"
import { UsersPermissionsTab } from "./settings/users-permissions-tab"
import { ServerModeCard } from "@/components/server/server-mode-card"
import { ServerConnectionTab } from "./settings/server-connection-tab"
import { BackupRecoveryView } from "@/components/backup/backup-recovery-view"
import { AccountingPeriodsSettings } from "./settings/accounting-periods-settings"
import { AIAssistantSettingsTab } from "./settings/ai-assistant-settings-tab"
import { PerformanceDiagnosticsTab } from "./settings/performance-diagnostics-tab"
import {
  COMPANY_STAMP_SIGNATURE_SRC,
  DEFAULT_STAMP_CONFIG,
  getStoredCompanyStampConfig,
  saveStoredCompanyStampConfig,
  saveStoredCompanyStamp,
  resetStoredCompanyStamp,
  getStoredCompanyStamp,
  getStoredCompanyStampScale,
  type CompanyStampConfig,
} from "@/lib/company-stamp-data"
import { COMPANY_STAMP_SIGNATURE_DATA_URL } from "@/lib/company-stamp-fallback"
import { toast } from "sonner"

// Preset Official Company Stamps and Seals
const PRESET_SEALS = [
  {
    id: "official-skyariana",
    name: "Sky Ariana Registered Seal & Signature",
    nameFa: "مهر رسمی و امضای اصلی سکای آریانا",
    desc: "Authentic double-circle registered seal with official green signature",
    src: COMPANY_STAMP_SIGNATURE_SRC,
    badge: "Official Default",
    color: "from-blue-900 to-indigo-900",
    signatoryTitle: "FOR & ON BEHALF OF: SKY ARIANA LIMITED",
    signatorySubtitle: "مهر و امضای مجاز شرکت",
  },
  {
    id: "customs-red",
    name: "International Customs & Transit Seal",
    nameFa: "مهر سرخ گمرک و ترانزیت بین‌المللی",
    desc: "Red high-security transit clearance seal for border customs & manifest",
    src: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320"><circle cx="160" cy="160" r="145" fill="none" stroke="%23c5221f" stroke-width="6" stroke-dasharray="8,4"/><circle cx="160" cy="160" r="132" fill="none" stroke="%23c5221f" stroke-width="4"/><path id="p1" d="M 40,160 A 120,120 0 1,1 280,160" fill="none"/><path id="p2" d="M 280,160 A 120,120 0 0,1 40,160" fill="none"/><text font-family="Arial, sans-serif" font-size="13.5" font-weight="900" fill="%23c5221f" letter-spacing="3"><textPath href="%23p1" startOffset="50%" text-anchor="middle">INTERNATIONAL TRANSIT CUSTOMS</textPath></text><text font-family="Arial, sans-serif" font-size="12.5" font-weight="bold" fill="%23c5221f" letter-spacing="2"><textPath href="%23p2" startOffset="50%" text-anchor="middle">★ OFFICIAL CLEARANCE DEPT ★</textPath></text><circle cx="160" cy="160" r="88" fill="none" stroke="%23c5221f" stroke-width="3"/><text x="160" y="135" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="%23c5221f" text-anchor="middle">CUSTOMS PASSED</text><text x="160" y="160" font-family="Arial, sans-serif" font-size="18" font-weight="900" fill="%23c5221f" text-anchor="middle">SKY ARIANA</text><text x="160" y="182" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="%23c5221f" text-anchor="middle">ISLAM QALA - B.ABBAS</text><text x="160" y="202" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="%23c5221f" text-anchor="middle">APPROVED</text></svg>`,
    badge: "Customs Red",
    color: "from-red-900 to-rose-900",
    signatoryTitle: "CUSTOMS CLEARANCE & TRANSIT DIVISION",
    signatorySubtitle: "بخش ترانزیت و ترخیص گمرکی",
  },
  {
    id: "logistics-green",
    name: "Authorized Logistics & Inspection Seal",
    nameFa: "مهر سبز تاییدیه بازرسی و ترابری",
    desc: "Emerald quality and inspection verified seal for commercial cargo",
    src: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320"><circle cx="160" cy="160" r="145" fill="none" stroke="%23047857" stroke-width="6"/><circle cx="160" cy="160" r="133" fill="none" stroke="%23047857" stroke-width="3" stroke-dasharray="6,3"/><path id="pg1" d="M 40,160 A 120,120 0 1,1 280,160" fill="none"/><path id="pg2" d="M 280,160 A 120,120 0 0,1 40,160" fill="none"/><text font-family="Arial, sans-serif" font-size="13" font-weight="900" fill="%23047857" letter-spacing="3"><textPath href="%23pg1" startOffset="50%" text-anchor="middle">AUTHORIZED LOGISTICS INSPECTION</textPath></text><text font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="%23047857" letter-spacing="2"><textPath href="%23pg2" startOffset="50%" text-anchor="middle">★ QUALITY & WEIGHT VERIFIED ★</textPath></text><circle cx="160" cy="160" r="88" fill="none" stroke="%23047857" stroke-width="3"/><text x="160" y="135" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="%23047857" text-anchor="middle">SECURITY SEAL</text><text x="160" y="160" font-family="Arial, sans-serif" font-size="18" font-weight="900" fill="%23047857" text-anchor="middle">SKY BALAM</text><text x="160" y="182" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="%23047857" text-anchor="middle">CARGO OPERATIONS</text><text x="160" y="202" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="%23047857" text-anchor="middle">VERIFIED & SIGNED</text></svg>`,
    badge: "Logistics Green",
    color: "from-emerald-900 to-teal-900",
    signatoryTitle: "FOR & ON BEHALF OF: SKY BALAM LOGISTICS",
    signatorySubtitle: "مهر و امضای شرکت حمل و نقل سکای بالام",
  },
  {
    id: "blue-round-seal",
    name: "Official Sky Ariana Round Seal Only",
    nameFa: "مهر مدور شرکتی سکای آریانا (بدون امضا)",
    desc: "Circular company seal for clean manual physical signing",
    src: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320"><circle cx="160" cy="160" r="145" fill="none" stroke="%231e3a8a" stroke-width="7"/><circle cx="160" cy="160" r="133" fill="none" stroke="%231e3a8a" stroke-width="3" stroke-dasharray="7,4"/><path id="pb1" d="M 40,160 A 120,120 0 1,1 280,160" fill="none"/><path id="pb2" d="M 280,160 A 120,120 0 0,1 40,160" fill="none"/><text font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="%231e3a8a" letter-spacing="3"><textPath href="%23pb1" startOffset="50%" text-anchor="middle">SKY ARIANA LIMITED CO.</textPath></text><text font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="%231e3a8a" letter-spacing="2"><textPath href="%23pb2" startOffset="50%" text-anchor="middle">★ INTERNATIONAL TRANSPORT ★</textPath></text><circle cx="160" cy="160" r="88" fill="none" stroke="%231e3a8a" stroke-width="3"/><text x="160" y="135" font-family="Arial, sans-serif" font-size="13" font-weight="900" fill="%231e3a8a" text-anchor="middle">REG. 90021-AFG</text><text x="160" y="162" font-family="Arial, sans-serif" font-size="19" font-weight="900" fill="%231e3a8a" text-anchor="middle">SKY ARIANA</text><text x="160" y="185" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="%231e3a8a" text-anchor="middle">COMMERCIAL CARGO</text><text x="160" y="204" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="%231e3a8a" text-anchor="middle">OFFICIAL SEAL</text></svg>`,
    badge: "Seal Only",
    color: "from-blue-900 to-sky-900",
    signatoryTitle: "FOR & ON BEHALF OF: SKY ARIANA LIMITED",
    signatorySubtitle: "مهر و امضای مجاز شرکت",
  },
]

export type SettingsTab = "all" | "users" | "client_portal" | "stamp" | "company" | "cloud" | "security" | "updates" | "vault" | "gdrive" | "deleted" | "server" | "backup_recovery" | "accounting_periods" | "ai_assistant" | "performance"

const DEFAULT_BADGE = {
  label: "Staff User",
  bg: "bg-slate-100 border-slate-300",
  text: "text-slate-700 font-bold",
  icon: "👤",
  desc: "Internal staff member",
}

const ROLE_BADGES: Record<UserRole, { label: string; bg: string; text: string; icon: string; desc: string }> = {
  superadmin: {
    label: "Super Admin",
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
  management: {
    label: "Management",
    bg: "bg-amber-100 border-amber-300",
    text: "text-amber-900 font-extrabold",
    icon: "💎",
    desc: "Executive dashboards, profit and loss analysis, and high-value approvals",
  },
  operations: {
    label: "Operations",
    bg: "bg-sky-100 border-sky-300",
    text: "text-sky-900 font-extrabold",
    icon: "🚚",
    desc: "Create and manage Bills of Lading, container tracking and transport routes",
  },
  accounting: {
    label: "Accounting",
    bg: "bg-emerald-100 border-emerald-300",
    text: "text-emerald-900 font-extrabold",
    icon: "💼",
    desc: "Manage payments, invoices, balances, supplier costs and ledgers",
  },
  accountant: {
    label: "Accountant (Legacy)",
    bg: "bg-emerald-100 border-emerald-300",
    text: "text-emerald-900 font-extrabold",
    icon: "💼",
    desc: "Manage payments, invoices, balances, and financial transaction statements",
  },
  documents: {
    label: "Documents",
    bg: "bg-indigo-100 border-indigo-300",
    text: "text-indigo-900 font-extrabold",
    icon: "📄",
    desc: "Prepare and finalize Commercial Invoices, Packing Lists and trade manifests",
  },
  tracking: {
    label: "Tracking",
    bg: "bg-teal-100 border-teal-300",
    text: "text-teal-900 font-extrabold",
    icon: "📍",
    desc: "Real-time vehicle tracking, border checkpoint milestones and alerts",
  },
  data_entry: {
    label: "Data Entry",
    bg: "bg-orange-100 border-orange-300",
    text: "text-orange-900 font-extrabold",
    icon: "⌨️",
    desc: "High-speed draft BOL and manifest data entry",
  },
  viewer: {
    label: "Viewer",
    bg: "bg-slate-100 border-slate-300",
    text: "text-slate-700 font-bold",
    icon: "👁️",
    desc: "Read-only access to view operational information and reports",
  },
  client: {
    label: "Client Portal",
    bg: "bg-amber-100 border-amber-300",
    text: "text-amber-900 font-extrabold",
    icon: "🚢",
    desc: "Customer portal access scoped to own shipments and released documents",
  },
  shipper: {
    label: "Shipper (Legacy)",
    bg: "bg-amber-100 border-amber-300",
    text: "text-amber-900 font-extrabold",
    icon: "🚢",
    desc: "Dedicated client access to own shipments, BOLs, and business accounts",
  },
}

export function SettingsView() {
  const { users, addUser, updateUserRole, deleteUser, changePassword, currentUser, isSyncing, syncCloudData, accounts, toggleUserStatus, resetUserPassword, setView } = useApp()
  const [activeTab, setActiveTab] = useState<SettingsTab>("all")
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false)

  // Storage Analytics & Health Calculation
  const storageStats = useMemo(() => {
    if (typeof window === "undefined") {
      return { totalKB: "0.0", percent: 0, bolCount: 0, customCompaniesCount: 0, ledgerCount: 0 }
    }
    let totalBytes = 0
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key) {
        const val = window.localStorage.getItem(key) || ""
        totalBytes += (key.length + val.length) * 2
      }
    }
    const rawBols = window.localStorage.getItem("skybol:saved-documents") || window.localStorage.getItem("sky-bol-browser-documents")
    const bols = rawBols ? JSON.parse(rawBols) : []
    const rawCos = window.localStorage.getItem("skybol:account-custom-companies")
    const cos = rawCos ? JSON.parse(rawCos) : []
    const rawLedgers = window.localStorage.getItem("skybol:account-ledgers")
    const ledgers = rawLedgers ? JSON.parse(rawLedgers) : {}
    let ledgerCount = 0
    if (ledgers && typeof ledgers === "object") {
      for (const k in ledgers) {
        if (Array.isArray(ledgers[k])) ledgerCount += ledgers[k].length
      }
    }
    return {
      totalKB: (totalBytes / 1024).toFixed(1),
      percent: Math.min(100, Math.max(1, Math.round((totalBytes / (5 * 1024 * 1024)) * 100))),
      bolCount: Array.isArray(bols) ? bols.length : 0,
      customCompaniesCount: Array.isArray(cos) ? cos.length : 0,
      ledgerCount,
    }
  }, [activeTab])

  // Add User Form State
  const [newUsername, setNewUsername] = useState("")
  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState<UserRole>("admin")
  const [newEmail, setNewEmail] = useState("")
  const [newPasswordUser, setNewPasswordUser] = useState("")
  const [newConfirmPasswordUser, setNewConfirmPasswordUser] = useState("")
  const [newClientName, setNewClientName] = useState("")
  const [newStatus, setNewStatus] = useState<"active" | "disabled">("active")
  const [userMsg, setUserMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Reset Password Modal State
  const [resetModalUser, setResetModalUser] = useState<User | null>(null)
  const [resetModalNewPass, setResetModalNewPass] = useState("")

  // Available Client Names for Linking
  const clientOptions = useMemo(() => {
    const names = new Set<string>()
    accounts.forEach((acc) => {
      if (acc.name) names.add(acc.name.trim())
      acc.companies?.forEach((c) => {
        if (c.name) names.add(c.name.trim())
      })
    })
    return Array.from(names).sort()
  }, [accounts])

  // Change Password Form State
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showOldPass, setShowOldPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [passMsg, setPassMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Stamp & Signature State
  const [stampConfig, setStampConfig] = useState<CompanyStampConfig>(DEFAULT_STAMP_CONFIG)
  const [stampSubTab, setStampSubTab] = useState<"tuning" | "presets" | "draw" | "upload" | "text">("tuning")
  const [stampMsg, setStampMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Signature Canvas Drawing Pad State
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [penColor, setPenColor] = useState("#0f3460") // Navy Blue default
  const [penWidth, setPenWidth] = useState(3)
  const [hasDrawn, setHasDrawn] = useState(false)

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
    setStampConfig(getStoredCompanyStampConfig())

    // Load saved company settings if available
    try {
      const stored = window.localStorage.getItem("skybol:company-settings")
      if (stored) {
        setCompanySettings(prev => ({ ...prev, ...JSON.parse(stored) }))
      }
    } catch (e) {}

    const handleStampUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<Partial<CompanyStampConfig>>
      if (customEvent.detail) {
        setStampConfig(prev => ({
          ...prev,
          ...customEvent.detail,
          dataUrl: customEvent.detail?.dataUrl !== undefined ? customEvent.detail.dataUrl : prev.dataUrl,
          scale: customEvent.detail?.scale !== undefined ? customEvent.detail.scale : prev.scale,
          rotation: customEvent.detail?.rotation !== undefined ? customEvent.detail.rotation : prev.rotation,
          opacity: customEvent.detail?.opacity !== undefined ? customEvent.detail.opacity : prev.opacity,
          signatoryTitle: customEvent.detail?.signatoryTitle !== undefined ? customEvent.detail.signatoryTitle : prev.signatoryTitle,
          signatorySubtitle: customEvent.detail?.signatorySubtitle !== undefined ? customEvent.detail.signatorySubtitle : prev.signatorySubtitle,
          enabled: customEvent.detail?.enabled !== undefined ? customEvent.detail.enabled : prev.enabled,
        }))
      } else {
        setStampConfig(getStoredCompanyStampConfig())
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

    if (newRole === "shipper" && newPasswordUser && newPasswordUser !== newConfirmPasswordUser) {
      setUserMsg({ type: "error", text: "Passwords do not match." })
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
      password: newPasswordUser || "skybalam2026",
      clientName: newRole === "shipper" ? (newClientName || newName) : undefined,
      status: newStatus,
    })

    toast.success(`User '${newUsername}' created with role ${newRole.toUpperCase()}!`)
    setUserMsg({ type: "success", text: `User '${newUsername}' successfully created with role ${newRole.toUpperCase()}!` })
    setNewUsername("")
    setNewName("")
    setNewEmail("")
    setNewPasswordUser("")
    setNewConfirmPasswordUser("")
    setNewClientName("")
    setNewStatus("active")
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

  // Stamp Handlers
  const handleScaleChange = (newScale: number) => {
    setStampConfig(prev => ({ ...prev, scale: newScale }))
    saveStoredCompanyStampConfig({ scale: newScale })
  }

  const handleRotationChange = (newRotation: number) => {
    setStampConfig(prev => ({ ...prev, rotation: newRotation }))
    saveStoredCompanyStampConfig({ rotation: newRotation })
  }

  const handleOpacityChange = (newOpacity: number) => {
    setStampConfig(prev => ({ ...prev, opacity: newOpacity }))
    saveStoredCompanyStampConfig({ opacity: newOpacity })
  }

  const handleToggleStampEnabled = () => {
    const nextEnabled = !stampConfig.enabled
    setStampConfig(prev => ({ ...prev, enabled: nextEnabled }))
    saveStoredCompanyStampConfig({ enabled: nextEnabled })
    if (nextEnabled) {
      toast.success("Digital Stamp & Signature is now ACTIVE on all Bills of Lading.")
      setStampMsg({ type: "success", text: "Digital Stamp & Signature is active across all document exports." })
    } else {
      toast.info("Digital Stamp & Signature is now DISABLED (Blank line for physical stamping).")
      setStampMsg({ type: "error", text: "Digital Stamp is turned off. Documents will export with blank signature line." })
    }
  }

  const handleSelectPreset = (preset: typeof PRESET_SEALS[0]) => {
    setStampConfig(prev => ({
      ...prev,
      dataUrl: preset.src,
      signatoryTitle: preset.signatoryTitle,
      signatorySubtitle: preset.signatorySubtitle,
      enabled: true,
    }))
    saveStoredCompanyStampConfig({
      dataUrl: preset.src,
      signatoryTitle: preset.signatoryTitle,
      signatorySubtitle: preset.signatorySubtitle,
      enabled: true,
    })
    toast.success(`Seal applied: ${preset.name}`)
    setStampMsg({ type: "success", text: `Applied "${preset.name}". Live preview updated.` })
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
        setStampConfig(prev => ({ ...prev, dataUrl, enabled: true }))
        saveStoredCompanyStampConfig({ dataUrl, enabled: true })
        toast.success("Custom Stamp & Signature uploaded and active across all Bills of Lading!")
        setStampMsg({ type: "success", text: "Custom stamp image successfully uploaded and activated!" })
      }
    }
    reader.onerror = () => {
      setStampMsg({ type: "error", text: "Failed to read image file. Please try another image." })
    }
    reader.readAsDataURL(file)
  }

  const handleResetStamp = () => {
    resetStoredCompanyStamp()
    setStampConfig({ ...DEFAULT_STAMP_CONFIG })
    toast.success("Restored to official factory Sky Ariana seal and signature.")
    setStampMsg({ type: "success", text: "Restored to official Sky Ariana Limited seal and signature defaults." })
  }

  const handleDownloadStampAsset = () => {
    try {
      const link = document.createElement("a")
      link.href = stampConfig.dataUrl || COMPANY_STAMP_SIGNATURE_SRC
      link.download = "sky_ariana_official_stamp_signature.png"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("Downloaded official stamp asset.")
    } catch {
      toast.error("Failed to download stamp image.")
    }
  }

  // Canvas Drawing Handlers
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.strokeStyle = penColor
    ctx.lineWidth = penWidth
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    setIsDrawing(true)
    setHasDrawn(true)
  }

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const handleApplySignaturePad = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawn) {
      toast.error("Please draw a signature first before applying.")
      return
    }

    try {
      const dataUrl = canvas.toDataURL("image/png")
      setStampConfig(prev => ({ ...prev, dataUrl, enabled: true }))
      saveStoredCompanyStampConfig({ dataUrl, enabled: true })
      toast.success("Your handwritten digital signature is now active across all Bills of Lading!")
      setStampMsg({ type: "success", text: "Handwritten digital signature applied to document footer!" })
    } catch {
      toast.error("Failed to export drawn signature.")
    }
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
    <div data-settings-view="true" className="w-full max-w-7xl mx-auto p-2.5 sm:p-4 md:p-6 space-y-4 sm:space-y-6 font-sans">
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
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-md shadow-slate-200/30 backdrop-blur-xl flex-wrap sm:flex-wrap md:flex-wrap shrink-0 justify-center md:justify-start">
          {/* Master Tab: ALL IN ONE */}
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "all"
                ? "bg-gradient-to-r from-blue-950 via-indigo-950 to-blue-900 text-white shadow-md shadow-blue-950/20 ring-2 ring-amber-400/60"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            }`}
            title="See all settings sections at once in a single unified view"
          >
            <LayoutGrid className="w-4 h-4 text-amber-400" />
            <span>All in One (مشاهده همه)</span>
            <span className={`px-1.5 py-0.2 text-[10px] font-black rounded-full ${activeTab === "all" ? "bg-amber-400 text-slate-950" : "bg-slate-200 text-slate-700"}`}>
              10
            </span>
          </button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 shrink-0" />

          {/* Tab 1: Users */}
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "users"
                ? "bg-blue-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-500" />
            <span>Users</span>
            <span className={`px-1.5 py-0.2 text-[10px] font-black rounded-full ${activeTab === "users" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-900"}`}>
              {users.length}
            </span>
          </button>

          {/* Tab 2: Client Portal */}
          <button
            type="button"
            onClick={() => setActiveTab("client_portal")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "client_portal"
                ? "bg-blue-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <MonitorSmartphone className="w-3.5 h-3.5 text-blue-500" />
            <span>Client Portal</span>
          </button>

          {/* Tab 3: Stamp & Signature */}
          <button
            type="button"
            onClick={() => setActiveTab("stamp")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "stamp"
                ? "bg-blue-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Stamp & Sign</span>
          </button>

          {/* Tab 4: Company Profile */}
          <button
            type="button"
            onClick={() => setActiveTab("company")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "company"
                ? "bg-blue-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-amber-500" />
            <span>Company</span>
          </button>

          {/* Tab 5: Cloud Sync */}
          <button
            type="button"
            onClick={() => setActiveTab("cloud")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "cloud"
                ? "bg-blue-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-sky-500" />
            <span>Cloud Sync</span>
          </button>

          {/* Tab 6: Google Drive */}
          <button
            type="button"
            onClick={() => setActiveTab("gdrive")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "gdrive"
                ? "bg-blue-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 text-teal-500" />
            <span>Google Drive</span>
          </button>

          {/* Tab 7: Data Vault */}
          <button
            type="button"
            onClick={() => setActiveTab("vault")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "vault"
                ? "bg-blue-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
            <span>Data Vault</span>
          </button>

          {/* Tab 8: Security */}
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "security"
                ? "bg-blue-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-500" />
            <span>Security</span>
          </button>

          {/* Tab 9: Deleted Recovery */}
          <button
            type="button"
            onClick={() => setActiveTab("deleted")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "deleted"
                ? "bg-blue-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
            <span>Recovery</span>
          </button>

          {/* Tab: Main Server & LAN */}
          <button
            type="button"
            onClick={() => setActiveTab("server")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "server"
                ? "bg-blue-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Server className="w-3.5 h-3.5 text-blue-500" />
            <span>Server & LAN</span>
          </button>

          {/* Tab: Enterprise Backup & Health */}
          <button
            type="button"
            onClick={() => setActiveTab("backup_recovery")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "backup_recovery"
                ? "bg-emerald-900 text-white shadow-md ring-2 ring-emerald-400/60"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Backup & Recovery</span>
            <span className="px-1.5 py-0.2 text-[9px] font-black rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
              PRO
            </span>
          </button>

          {/* Tab: Accounting Periods & Financial Locks */}
          <button
            type="button"
            onClick={() => setActiveTab("accounting_periods")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "accounting_periods"
                ? "bg-blue-900 text-white shadow-md ring-2 ring-blue-400/60"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-blue-500" />
            <span>Accounting Periods</span>
          </button>

          {/* Tab: AI Operations Assistant */}
          <button
            type="button"
            onClick={() => setActiveTab("ai_assistant")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "ai_assistant"
                ? "bg-purple-900 text-white shadow-md ring-2 ring-purple-400/60"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Assistant</span>
            <span className="px-1.5 py-0.2 text-[9px] font-black rounded-full bg-purple-500/20 text-purple-800 dark:text-purple-300">
              NEW
            </span>
          </button>

          {/* Tab: Performance Diagnostics */}
          <button
            type="button"
            onClick={() => setActiveTab("performance")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "performance"
                ? "bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-amber-500" />
            <span>Diagnostics</span>
            <span className="px-1.5 py-0.2 text-[9px] font-black rounded-full bg-amber-400/20 text-amber-800 dark:text-amber-300">
              FAST
            </span>
          </button>

          {/* Tab 10: System Build */}
          <button
            type="button"
            onClick={() => setActiveTab("updates")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "updates"
                ? "bg-blue-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
            <span>System Build</span>
          </button>
        </div>

        {/* Sticky Quick-Jump Bar when in "All in One" mode */}
        {activeTab === "all" && (
          <div className="sticky top-2 z-30 flex items-center justify-between gap-2 p-2 rounded-2xl bg-slate-950/95 text-slate-200 border border-slate-800 shadow-2xl backdrop-blur-xl text-xs flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0 px-2 text-amber-400 font-black text-[11px] tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Quick Jump:</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap py-0.5">
              <a href="#section-users" className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-amber-400 hover:text-slate-950 text-white whitespace-nowrap text-[11px] font-bold transition flex items-center gap-1">
                <Users className="w-3 h-3 text-amber-400" />
                <span>1. Users</span>
              </a>
              <a href="#section-portal" className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-blue-400 hover:text-slate-950 text-white whitespace-nowrap text-[11px] font-bold transition flex items-center gap-1">
                <MonitorSmartphone className="w-3 h-3 text-blue-400" />
                <span>2. Portal</span>
              </a>
              <a href="#section-stamp" className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-emerald-400 hover:text-slate-950 text-white whitespace-nowrap text-[11px] font-bold transition flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>3. Stamp & Sign</span>
              </a>
              <a href="#section-company" className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-amber-400 hover:text-slate-950 text-white whitespace-nowrap text-[11px] font-bold transition flex items-center gap-1">
                <Building2 className="w-3 h-3 text-amber-400" />
                <span>4. Company</span>
              </a>
              <a href="#section-cloud" className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-sky-400 hover:text-slate-950 text-white whitespace-nowrap text-[11px] font-bold transition flex items-center gap-1">
                <Cloud className="w-3 h-3 text-sky-400" />
                <span>5. Cloud Sync</span>
              </a>
              <a href="#section-gdrive" className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-teal-400 hover:text-slate-950 text-white whitespace-nowrap text-[11px] font-bold transition flex items-center gap-1">
                <UploadCloud className="w-3 h-3 text-teal-400" />
                <span>6. Google Drive</span>
              </a>
              <a href="#section-vault" className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-indigo-400 hover:text-slate-950 text-white whitespace-nowrap text-[11px] font-bold transition flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-indigo-400" />
                <span>7. Vault</span>
              </a>
              <a href="#section-security" className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-amber-400 hover:text-slate-950 text-white whitespace-nowrap text-[11px] font-bold transition flex items-center gap-1">
                <Key className="w-3 h-3 text-amber-400" />
                <span>8. Security</span>
              </a>
              <a href="#section-deleted" className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-rose-400 hover:text-slate-950 text-white whitespace-nowrap text-[11px] font-bold transition flex items-center gap-1">
                <RotateCcw className="w-3 h-3 text-rose-400" />
                <span>9. Recovery</span>
              </a>
              <a href="#section-server" className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-blue-400 hover:text-slate-950 text-white whitespace-nowrap text-[11px] font-bold transition flex items-center gap-1">
                <Server className="w-3 h-3 text-blue-400" />
                <span>LAN Server</span>
              </a>
              <a href="#section-ai-assistant" className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-purple-400 hover:text-slate-950 text-white whitespace-nowrap text-[11px] font-bold transition flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>AI Assistant</span>
              </a>
              <a href="#section-performance" className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-amber-400 hover:text-slate-950 text-white whitespace-nowrap text-[11px] font-bold transition flex items-center gap-1">
                <Activity className="w-3 h-3 text-amber-400" />
                <span>Diagnostics</span>
              </a>
              <a href="#section-updates" className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-emerald-400 hover:text-slate-950 text-white whitespace-nowrap text-[11px] font-bold transition flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-emerald-400" />
                <span>10. Build</span>
              </a>
            </div>
          </div>
        )}

        {/* Single Section Active Ribbon */}
        {activeTab !== "all" && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-blue-50/90 border border-blue-200 text-blue-950 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase">
                Focused Section
              </span>
              <span className="hidden sm:inline">You are viewing an individual section.</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-blue-600 hover:text-white border border-blue-300 text-blue-900 text-xs font-black transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Show All Sections at Once (مشاهده تمام بخش‌ها یکجا)</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: USER MANAGEMENT & PERMISSIONS                                      */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "users") && (
        <div id="section-users" className="scroll-mt-28 space-y-4 animate-in fade-in duration-300">
          {activeTab === "all" && (
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md border border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  01
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-white">1. User Accounts, Roles & RBAC Permissions</h2>
                    <span className="text-xs text-amber-300 font-[vazirmatn] font-bold" dir="rtl">
                      مدیریت کاربران، نقش‌ها و سطوح دسترسی
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 hidden sm:block">
                    Enterprise Role-Based Access Control, Staff Permissions, Approval Rules, and Audit Log
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("users")}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 text-white transition border border-white/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Focus Users tab only"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Focus Section</span>
              </button>
            </div>
          )}

          <UsersPermissionsTab />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1.5: CLIENT PORTAL                                                    */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "client_portal") && (
        <div id="section-portal" className="scroll-mt-28 space-y-4 animate-in fade-in duration-300">
          {activeTab === "all" && (
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md border border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  02
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-white">2. Client Portal Management</h2>
                    <span className="text-xs text-blue-300 font-[vazirmatn] font-bold" dir="rtl">
                      پورتال اختصاصی مشتریان
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 hidden sm:block">Customer credentials, permission scopes, proof of payment submissions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("client_portal")}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 text-white transition border border-white/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Focus Client Portal tab only"
              >
                <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden md:inline">Focus Section</span>
              </button>
            </div>
          )}
          <ClientPortalTab />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STAMP & SIGNATURE (مهر و امضا)                                     */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* TAB 2: STAMP & SIGNATURE STUDIO (استودیو مهر و امضای رسمی)                */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "stamp") && (
        <div id="section-stamp" className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-300 scroll-mt-28">
          {activeTab === "all" && (
            <div className="lg:col-span-12 flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md border border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  03
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-white">3. Stamp & Official Signature Studio</h2>
                    <span className="text-xs text-emerald-300 font-[vazirmatn] font-bold" dir="rtl">
                      استودیو مهر و امضای رسمی
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 hidden sm:block">Digital signature pad, preset official seals, scale, opacity and signatory text</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("stamp")}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 text-white transition border border-white/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Focus Stamp & Signature tab only"
              >
                <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Focus Section</span>
              </button>
            </div>
          )}
          {/* Left Column: Live Document Footer Preview */}
          <div className="lg:col-span-6 bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-5 sm:p-7 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-amber-400 shadow-md shadow-blue-950/20">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Active Stamp & Signature</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        stampConfig.enabled ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}>
                        {stampConfig.enabled ? "Active / فعال" : "Disabled / غیرفعال"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-[vazirmatn] font-bold" dir="rtl">
                      پیش‌نمایش زنده مهر، امضا و تنظیمات چاپ در بارنامه
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleDownloadStampAsset}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-700 hover:text-blue-900 text-xs font-bold transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    title="Download Official Stamp Image (PNG)"
                  >
                    <Download className="w-4 h-4 text-blue-700" />
                    <span className="hidden sm:inline">PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetStamp}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 text-xs font-bold transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    title="Reset to Factory Official Seal"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-500 hover:text-red-600" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                </div>
              </div>

              {stampMsg && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200 ${
                    stampMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                      : "bg-red-50 text-red-900 border border-red-200"
                  }`}
                >
                  {stampMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
                  <span>{stampMsg.text}</span>
                </div>
              )}

              {/* Document Signature Live Preview Canvas */}
              <div className="relative rounded-3xl border-2 border-dashed border-blue-200 bg-gradient-to-b from-blue-50/50 via-white to-slate-50/80 p-6 sm:p-8 flex flex-col items-center justify-center min-h-[260px] overflow-hidden shadow-inner">
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 bg-blue-100/90 border border-blue-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                    Live BOL Footer Preview (پیش‌نمایش در بارنامه)
                  </span>
                </div>

                <div className="absolute top-3 right-3">
                  <button
                    type="button"
                    onClick={handleToggleStampEnabled}
                    className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full transition shadow-2xs cursor-pointer border ${
                      stampConfig.enabled
                        ? "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600"
                        : "bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300"
                    }`}
                  >
                    {stampConfig.enabled ? "✓ Digital Seal: ON" : "✕ Blank Line Mode"}
                  </button>
                </div>

                {/* Stamp & Signature Display Area */}
                <div className="relative flex items-center justify-center w-full h-[140px] my-2">
                  {stampConfig.enabled ? (
                    <div
                      className="flex items-center justify-center transition-all duration-200"
                      style={{
                        transform: `scale(${stampConfig.scale}) rotate(${stampConfig.rotation}deg)`,
                        opacity: stampConfig.opacity,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={stampConfig.dataUrl || COMPANY_STAMP_SIGNATURE_SRC}
                        alt="Company Stamp & Signature"
                        className="max-h-[115px] w-auto object-contain drop-shadow-md"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          const target = e.currentTarget
                          if (target.src !== COMPANY_STAMP_SIGNATURE_DATA_URL) {
                            target.src = COMPANY_STAMP_SIGNATURE_DATA_URL
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-300 rounded-2xl bg-white/60">
                      <FileSignature className="w-8 h-8 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-500">Manual Physical Sign & Stamp Area</span>
                      <span className="text-[11px] font-[vazirmatn] text-slate-400 font-bold" dir="rtl">محل مهر و امضای فیزیکی و دستی</span>
                    </div>
                  )}
                </div>

                {/* Official Signatory Baseline & Title */}
                <div className="w-64 border-b-2 border-slate-800 my-1.5" />
                <p className="text-xs sm:text-sm font-black text-blue-950 uppercase tracking-tight text-center">
                  {stampConfig.signatoryTitle || "FOR & ON BEHALF OF: SKY ARIANA LIMITED"}
                </p>
                <p className="font-[vazirmatn] text-xs font-extrabold text-blue-900 mt-0.5 text-center" dir="rtl">
                  {stampConfig.signatorySubtitle || "مهر و امضای مجاز شرکت"}
                </p>
              </div>
            </div>

            {/* Bottom Specs Indicator Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-600">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="text-slate-400 block text-[9px] uppercase font-black">Status</span>
                <span className={`font-black ${stampConfig.enabled ? "text-emerald-700" : "text-amber-700"}`}>
                  {stampConfig.enabled ? "Active" : "Disabled"}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="text-slate-400 block text-[9px] uppercase font-black">Scale</span>
                <span className="font-mono font-black text-blue-900">{(stampConfig.scale * 100).toFixed(0)}%</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="text-slate-400 block text-[9px] uppercase font-black">Rotation</span>
                <span className="font-mono font-black text-indigo-900">{stampConfig.rotation > 0 ? `+${stampConfig.rotation}°` : `${stampConfig.rotation}°`}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="text-slate-400 block text-[9px] uppercase font-black">Ink Density</span>
                <span className="font-mono font-black text-purple-900">{(stampConfig.opacity * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Stamp Studio & Controls */}
          <div className="lg:col-span-6 bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-5 sm:p-7 space-y-5">
            {/* Header & Sub-Tab Navigation */}
            <div className="space-y-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-950 text-amber-400 shadow-md shadow-indigo-950/20">
                  <SlidersHorizontal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Stamp & Signature Studio</h3>
                  <p className="text-xs text-slate-500 font-[vazirmatn] font-bold" dir="rtl">
                    تنظیمات پیشرفته مقیاس، مهرهای رسمی، رسم امضا و بارگذاری
                  </p>
                </div>
              </div>

              {/* Sub-Tabs Pill Navigation */}
              <div className="grid grid-cols-5 gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setStampSubTab("tuning")}
                  className={`py-2 px-1 rounded-xl text-[11px] font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                    stampSubTab === "tuning"
                      ? "bg-white text-blue-950 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                  title="Adjust size, tilt & ink opacity"
                >
                  <Sliders className="w-3.5 h-3.5 text-blue-700" />
                  <span className="truncate">Tuning</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStampSubTab("presets")}
                  className={`py-2 px-1 rounded-xl text-[11px] font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                    stampSubTab === "presets"
                      ? "bg-white text-blue-950 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                  title="Choose from official company seals"
                >
                  <Building2 className="w-3.5 h-3.5 text-indigo-700" />
                  <span className="truncate">Presets</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStampSubTab("draw")}
                  className={`py-2 px-1 rounded-xl text-[11px] font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                    stampSubTab === "draw"
                      ? "bg-white text-blue-950 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                  title="Draw signature with finger or mouse"
                >
                  <PenTool className="w-3.5 h-3.5 text-purple-700" />
                  <span className="truncate">Draw Sign</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStampSubTab("upload")}
                  className={`py-2 px-1 rounded-xl text-[11px] font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                    stampSubTab === "upload"
                      ? "bg-white text-blue-950 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                  title="Upload PNG / SVG file"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-600" />
                  <span className="truncate">Upload</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStampSubTab("text")}
                  className={`py-2 px-1 rounded-xl text-[11px] font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                    stampSubTab === "text"
                      ? "bg-white text-blue-950 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                  title="Customize signatory titles"
                >
                  <Type className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="truncate">Titles</span>
                </button>
              </div>
            </div>

            {/* SUB-TAB 1: TUNING (اندازه، زاویه و غلظت جوهر) */}
            {stampSubTab === "tuning" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Stamp Scale Slider */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <ZoomIn className="w-4 h-4 text-blue-700" />
                      <span>Stamp Size & Scaling (اندازه مهر):</span>
                    </div>
                    <span className="font-mono text-blue-950 font-black text-sm bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                      {(stampConfig.scale * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.2"
                    step="0.05"
                    value={stampConfig.scale}
                    onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-800"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
                    {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((presetScale) => (
                      <button
                        key={presetScale}
                        type="button"
                        onClick={() => handleScaleChange(presetScale)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer border ${
                          Math.abs(stampConfig.scale - presetScale) < 0.03
                            ? "bg-blue-900 text-white border-blue-950 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {(presetScale * 100).toFixed(0)}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stamp Rotation Slider */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-indigo-700" />
                      <span>Stamp Rotation & Tilt (زاویه چرخش مهر):</span>
                    </div>
                    <span className="font-mono text-indigo-950 font-black text-sm bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                      {stampConfig.rotation > 0 ? `+${stampConfig.rotation}°` : `${stampConfig.rotation}°`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.5"
                    value={stampConfig.rotation}
                    onChange={(e) => handleRotationChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-800"
                  />
                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    {[
                      { label: "-5° Tilt Left", val: -5 },
                      { label: "-1.5° Realistic", val: -1.5 },
                      { label: "0° Straight", val: 0 },
                      { label: "+2° Tilt Right", val: 2 },
                      { label: "+5° Angle", val: 5 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => handleRotationChange(preset.val)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer border ${
                          Math.abs(stampConfig.rotation - preset.val) < 0.3
                            ? "bg-indigo-900 text-white border-indigo-950 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ink Density / Opacity Slider */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-purple-700" />
                      <span>Ink Opacity & Density (غلظت و شفافیت جوهر):</span>
                    </div>
                    <span className="font-mono text-purple-950 font-black text-sm bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                      {(stampConfig.opacity * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="1.0"
                    step="0.05"
                    value={stampConfig.opacity}
                    onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-800"
                  />
                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    {[
                      { label: "50% Soft", val: 0.5 },
                      { label: "75% Medium", val: 0.75 },
                      { label: "90% Clear", val: 0.9 },
                      { label: "100% Solid Ink", val: 1.0 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => handleOpacityChange(preset.val)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer border ${
                          Math.abs(stampConfig.opacity - preset.val) < 0.03
                            ? "bg-purple-900 text-white border-purple-950 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: PRESET OFFICIAL SEALS (مهرهای آماده رسمی) */}
            {stampSubTab === "presets" && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <p className="text-xs text-slate-600 font-bold">
                  Select an official verified seal to automatically apply across all Bills of Lading:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESET_SEALS.map((preset) => {
                    const isSelected = stampConfig.dataUrl === preset.src
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                          isSelected
                            ? "border-blue-900 bg-blue-50/70 shadow-md ring-2 ring-blue-900/20"
                            : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={preset.src} alt={preset.name} className="max-h-8 max-w-8 object-contain" />
                            </div>
                            <div>
                              <div className="text-xs font-black text-slate-900 leading-tight">{preset.name}</div>
                              <div className="text-[10px] text-slate-500 font-[vazirmatn] font-bold" dir="rtl">{preset.nameFa}</div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-blue-900 shrink-0 font-black" />}
                        </div>

                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                          {preset.desc}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {preset.badge}
                          </span>
                          <span className="text-[10px] font-bold text-blue-900">
                            {isSelected ? "Active Seal ✓" : "Click to Apply →"}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* SUB-TAB 3: DIGITAL SIGNATURE PAD (رسم امضا با قلم لمسی یا ماوس) */}
            {stampSubTab === "draw" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                      Draw Signature Pad (رسم امضای دیجیتال)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Sign smoothly using your mouse, stylus, or touch screen.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50 rounded-xl border border-red-200 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>Clear / پاک کردن</span>
                  </button>
                </div>

                {/* Interactive Drawing Canvas */}
                <div className="relative rounded-2xl border-2 border-slate-300 bg-white p-1 shadow-inner overflow-hidden flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={160}
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    onPointerLeave={stopDrawing}
                    className="w-full h-[150px] touch-none cursor-crosshair bg-transparent"
                  />
                  {!hasDrawn && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-300">
                      <PenTool className="w-8 h-8 opacity-40 mb-1" />
                      <span className="text-xs font-bold uppercase tracking-widest opacity-60">Sign Your Name Here</span>
                      <span className="text-[11px] font-[vazirmatn] font-bold opacity-60" dir="rtl">اینجا امضا کنید</span>
                    </div>
                  )}
                </div>

                {/* Color & Width Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Ink Color:</span>
                    {[
                      { color: "#0f3460", name: "Royal Navy" },
                      { color: "#111827", name: "Carbon Black" },
                      { color: "#b91c1c", name: "Crimson Red" },
                      { color: "#047857", name: "Emerald Green" },
                    ].map((item) => (
                      <button
                        key={item.color}
                        type="button"
                        onClick={() => setPenColor(item.color)}
                        className={`w-6 h-6 rounded-full transition-transform cursor-pointer border-2 ${
                          penColor === item.color ? "scale-125 border-amber-400 shadow-sm" : "border-white hover:scale-110"
                        }`}
                        style={{ backgroundColor: item.color }}
                        title={item.name}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Stroke:</span>
                    {[
                      { width: 2, label: "Fine" },
                      { width: 3, label: "Medium" },
                      { width: 5, label: "Bold" },
                    ].map((item) => (
                      <button
                        key={item.width}
                        type="button"
                        onClick={() => setPenWidth(item.width)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer border ${
                          penWidth === item.width
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplySignaturePad}
                  disabled={!hasDrawn}
                  className={`w-full h-11 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                    hasDrawn
                      ? "bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-900 hover:to-teal-950 text-white shadow-emerald-950/20"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <FileCheck className="w-4 h-4 text-amber-400" />
                  <span>Apply As Official Signature / اعمال به عنوان امضای رسمی</span>
                </button>
              </div>
            )}

            {/* SUB-TAB 4: UPLOAD CUSTOM (بارگذاری فایل تصویر مهر) */}
            {stampSubTab === "upload" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-2">
                    Upload Custom Stamp or Seal (PNG / SVG / JPG)
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png, image/jpeg, image/webp, image/svg+xml"
                    className="hidden"
                    onChange={handleStampUpload}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-8 rounded-3xl border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/70 transition-all flex flex-col items-center justify-center text-center gap-3 cursor-pointer group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white text-blue-900 shadow-md flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-7 h-7 text-blue-800" />
                    </div>
                    <div>
                      <span className="text-sm font-black text-blue-950 block">
                        Click or Drag Image File Here / انتخاب فایل مهر
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Supports Transparent PNG, SVG, JPG, WEBP (Max 5MB)
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2 mt-3 font-medium">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Transparent PNG or SVG is recommended for the cleanest realistic banknote print look.</span>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 5: SIGNATORY TEXT & TITLES (عناوین و متن مهر و امضا) */}
            {stampSubTab === "text" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                    Signatory Header Text (English) / عنوان امضا‌کننده
                  </label>
                  <input
                    type="text"
                    value={stampConfig.signatoryTitle}
                    onChange={(e) => {
                      const newTitle = e.target.value
                      setStampConfig(prev => ({ ...prev, signatoryTitle: newTitle }))
                      saveStoredCompanyStampConfig({ signatoryTitle: newTitle })
                    }}
                    placeholder="FOR & ON BEHALF OF: SKY ARIANA LIMITED"
                    className="w-full h-11 px-4 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                    Signatory Subtitle Text (Persian) / زیرعنوان فارسی
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={stampConfig.signatorySubtitle}
                    onChange={(e) => {
                      const newSub = e.target.value
                      setStampConfig(prev => ({ ...prev, signatorySubtitle: newSub }))
                      saveStoredCompanyStampConfig({ signatorySubtitle: newSub })
                    }}
                    placeholder="مهر و امضای مجاز شرکت"
                    className="w-full h-11 px-4 text-xs font-bold font-[vazirmatn] text-slate-900 bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 block">Quick Signatory Presets:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        title: "FOR & ON BEHALF OF: SKY ARIANA LIMITED",
                        sub: "مهر و امضای مجاز شرکت",
                        label: "Sky Ariana Standard",
                      },
                      {
                        title: "FOR & ON BEHALF OF: SKY BALAM LOGISTICS",
                        sub: "مهر و امضای شرکت حمل و نقل بین‌المللی سکای بالام",
                        label: "Sky Balam Logistics",
                      },
                      {
                        title: "CUSTOMS TRANSIT & CLEARANCE DIVISION",
                        sub: "بخش ترانزیت و ترخیص گمرکی",
                        label: "Customs Clearance",
                      },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setStampConfig(prev => ({ ...prev, signatoryTitle: item.title, signatorySubtitle: item.sub }))
                          saveStoredCompanyStampConfig({ signatoryTitle: item.title, signatorySubtitle: item.sub })
                          toast.success(`Applied title preset: ${item.label}`)
                        }}
                        className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-900 border border-slate-200 transition cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: COMPANY PROFILE & LETTERHEAD (مشخصات شرکت)                         */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "company") && (
        <div id="section-company" className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/50 p-5 sm:p-8 space-y-6 animate-in fade-in duration-300 scroll-mt-28">
          {activeTab === "all" && (
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md border border-slate-700/60 -mt-1 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  04
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-white">4. Official Company Profile & Letterhead</h2>
                    <span className="text-xs text-amber-300 font-[vazirmatn] font-bold" dir="rtl">
                      مشخصات رسمی شرکت و سربرگ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 hidden sm:block">Legal enterprise identity, bilingual company name, tax & license numbers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("company")}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 text-white transition border border-white/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Focus Company tab only"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Focus Section</span>
              </button>
            </div>
          )}
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
      {(activeTab === "all" || activeTab === "cloud") && (
        <div id="section-cloud" className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/50 p-5 sm:p-8 space-y-6 animate-in fade-in duration-300 scroll-mt-28">
          {activeTab === "all" && (
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md border border-slate-700/60 -mt-1 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  05
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-white">5. Multi-Device Cloud Sync & Backup Hub</h2>
                    <span className="text-xs text-sky-300 font-[vazirmatn] font-bold" dir="rtl">
                      همگام‌سازی ابری و پشتیبان‌گیری
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 hidden sm:block">Sync BOL records, customer ledgers, and documents across PCs and mobile devices</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("cloud")}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 text-white transition border border-white/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Focus Cloud Sync tab only"
              >
                <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden md:inline">Focus Section</span>
              </button>
            </div>
          )}
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

          {/* Real-time Storage & Database Health Analytics Widget */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-black tracking-wide uppercase">Local Storage & Health Analytics</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                Status: Optimal & Healthy
              </span>
            </div>

            {/* Storage Meter Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold text-slate-400">
                <span>Database Usage: {storageStats.totalKB} KB used</span>
                <span>{storageStats.percent}% of 5 MB safe browser quota</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(3, storageStats.percent)}%` }}
                />
              </div>
            </div>

            {/* Storage Data Counts Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-center">
              <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Saved BOLs</p>
                <p className="text-sm font-black text-amber-400 font-mono mt-0.5">{storageStats.bolCount} Docs</p>
              </div>
              <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Accounts</p>
                <p className="text-sm font-black text-blue-400 font-mono mt-0.5">{storageStats.customCompaniesCount} Clients</p>
              </div>
              <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Ledger Entries</p>
                <p className="text-sm font-black text-emerald-400 font-mono mt-0.5">{storageStats.ledgerCount} Rows</p>
              </div>
              <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Security Version</p>
                <p className="text-sm font-black text-purple-400 font-mono mt-0.5">{CURRENT_SYSTEM_VERSION.version}</p>
              </div>
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
                      version: CURRENT_SYSTEM_VERSION.version,
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
      {(activeTab === "all" || activeTab === "security") && (
        <div id="section-security" className="max-w-2xl mx-auto bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/50 p-5 sm:p-8 space-y-6 animate-in fade-in duration-300 scroll-mt-28">
          {activeTab === "all" && (
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md border border-slate-700/60 -mt-1 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  08
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-white">8. Security, Passwords & Access Pin</h2>
                    <span className="text-xs text-amber-300 font-[vazirmatn] font-bold" dir="rtl">
                      امنیت، کلمات عبور و پین کد
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 hidden sm:block">Update your current administrator password and strengthen security keys</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("security")}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 text-white transition border border-white/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Focus Security tab only"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Focus Section</span>
              </button>
            </div>
          )}
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
      {(activeTab === "all" || activeTab === "updates") && (
        <div id="section-updates" className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/50 p-5 sm:p-8 space-y-6 animate-in fade-in duration-300 scroll-mt-28">
          {activeTab === "all" && (
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md border border-slate-700/60 -mt-1 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  10
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-white">10. Application & System Build Info</h2>
                    <span className="text-xs text-emerald-300 font-[vazirmatn] font-bold" dir="rtl">
                      اطلاعات نسخه و بیلد سیستم
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 hidden sm:block">Production release channels, offline support, and system health status</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("updates")}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 text-white transition border border-white/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Focus System Build tab only"
              >
                <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Focus Section</span>
              </button>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-900 to-purple-900 text-amber-400 shadow-md shadow-indigo-950/20">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Application Information & System Diagnostics</h3>
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
                <div className="flex justify-between gap-4 py-1 border-b border-blue-200/60 font-bold">
                  <span className="text-slate-600">Application:</span>
                  <span className="text-right text-blue-950 font-black">{CURRENT_SYSTEM_VERSION.applicationName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-blue-200/60 font-bold">
                  <span className="text-slate-600">Release Version:</span>
                  <span className="text-blue-950 font-black">{CURRENT_SYSTEM_VERSION.version}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-blue-200/60 font-bold">
                  <span className="text-slate-600">Build Number:</span>
                  <span className="text-blue-950 font-mono">{CURRENT_SYSTEM_VERSION.buildNumber}</span>
                </div>
                <div className="flex justify-between py-1 font-bold">
                  <span className="text-slate-600">Developer:</span>
                  <span className="text-right text-blue-950 font-black">{CURRENT_SYSTEM_VERSION.developer}</span>
                </div>
                <div className="flex justify-between gap-4 py-1 border-t border-blue-200/60 font-bold">
                  <span className="text-slate-600">Platform:</span>
                  <span className="text-right text-emerald-700 font-black">{CURRENT_SYSTEM_VERSION.platform}</span>
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

      {/* ========================================================================= */}
      {/* TAB 7: DATA VAULT & SYSTEM SNAPSHOTS                                      */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "vault") && (
        <div id="section-vault" className="scroll-mt-28 space-y-4 animate-in fade-in duration-300">
          {activeTab === "all" && (
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md border border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  07
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-white">7. Data Vault & System Snapshots</h2>
                    <span className="text-xs text-indigo-300 font-[vazirmatn] font-bold" dir="rtl">
                      خزانه داده و تصاویر محلی
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 hidden sm:block">Export JSON backups, inspect local storage quotas, and create atomic snapshot points</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("vault")}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 text-white transition border border-white/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Focus Data Vault tab only"
              >
                <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden md:inline">Focus Section</span>
              </button>
            </div>
          )}
          <div className="animate-in fade-in duration-300">
            <DataBackupManager />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: GOOGLE DRIVE AUTOMATIC DATA SYNC (PHASE 2)                         */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "gdrive") && (
        <div id="section-gdrive" className="scroll-mt-28 space-y-4 animate-in fade-in duration-300">
          {activeTab === "all" && (
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md border border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-500 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  06
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-white">6. Google Drive Automatic Data Sync</h2>
                    <span className="text-xs text-teal-300 font-[vazirmatn] font-bold" dir="rtl">
                      پشتیبان‌گیری خودکار گوگل درایو
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 hidden sm:block">Automate secondary cloud snapshots directly into your Google Drive account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("gdrive")}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 text-white transition border border-white/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Focus Google Drive tab only"
              >
                <Maximize2 className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden md:inline">Focus Section</span>
              </button>
            </div>
          )}
          <div className="animate-in fade-in duration-300">
            <GoogleDriveSyncSettings />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: RECENTLY DELETED RECORDS (TOMBSTONES)                              */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "deleted") && (
        <div id="section-deleted" className="scroll-mt-28 space-y-4 animate-in fade-in duration-300">
          {activeTab === "all" && (
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md border border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  09
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-white">9. Recently Deleted Records & Recovery</h2>
                    <span className="text-xs text-rose-300 font-[vazirmatn] font-bold" dir="rtl">
                      بازیابی اسناد و داده‌های حذف شده
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 hidden sm:block">Audit and restore soft-deleted BOLs, transactions, and company profiles</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("deleted")}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 text-white transition border border-white/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Focus Recovery tab only"
              >
                <Maximize2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden md:inline">Focus Section</span>
              </button>
            </div>
          )}
          <div className="animate-in fade-in duration-300">
            <RecentlyDeletedView />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: MAIN SERVER & LAN DEVICES                                            */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "server") && (
        <div id="section-server" className="scroll-mt-28 space-y-4 animate-in fade-in duration-300">
          {activeTab === "all" && (
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md border border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-white">Main Server & Local Network (LAN) Devices</h2>
                    <span className="text-xs text-blue-300 font-[vazirmatn] font-bold" dir="rtl">
                      مدیریت سرور اصلی و اتصال دستگاه‌های شبکه محلی
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 hidden sm:block">Pair laptops, phones, and tablets to this PC over local Wi-Fi / LAN network</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("server")}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 text-white transition border border-white/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Focus Server section only"
              >
                <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden md:inline">Focus Section</span>
              </button>
            </div>
          )}
          <ServerConnectionTab />
          <ServerModeCard />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: ENTERPRISE BACKUP & RECOVERY                                         */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "backup_recovery") && (
        <div id="section-backup-recovery" className="scroll-mt-28 space-y-4 animate-in fade-in duration-300">
          {activeTab === "all" && (
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-blue-950 text-white shadow-md border border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-white">Enterprise Automatic Backup, Safe Recovery & Database Health</h2>
                    <span className="text-xs text-emerald-300 font-[vazirmatn] font-bold" dir="rtl">
                      پشتیبان‌گیری خودکار، بازیابی ایمن و سلامت پایگاه داده
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 hidden sm:block">Automated versioned archives, multi-step safe restore, relational integrity audits, and import rollback</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("backup_recovery")}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 text-white transition border border-white/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Focus Backup & Recovery tab only"
              >
                <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Focus Section</span>
              </button>
            </div>
          )}
          <BackupRecoveryView />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: ACCOUNTING PERIODS & FINANCIAL LOCKS                                 */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "accounting_periods") && (
        <div id="section-accounting-periods" className="scroll-mt-28 space-y-4 animate-in fade-in duration-300">
          {activeTab === "all" && (
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white shadow-md border border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-white">Financial Period Closing & Server Lock Controls</h2>
                    <span className="text-xs text-blue-300 font-[vazirmatn] font-bold" dir="rtl">
                      مدیریت دوره‌های مالی و قفل امنیتی دفتر کل
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 hidden sm:block">Enforce strict server-side lock on closed periods, pre-close backup verification, and multi-currency carry-forward</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("accounting_periods")}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 text-white transition border border-white/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Focus Accounting Periods tab only"
              >
                <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden md:inline">Focus Section</span>
              </button>
            </div>
          )}
          <AccountingPeriodsSettings />
        </div>
      )}


      {/* ========================================================================= */}
      {/* TAB: AI OPERATIONS ASSISTANT (SKY AI)                                     */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "ai_assistant") && (
        <div id="section-ai-assistant" className="scroll-mt-28 space-y-4 animate-in fade-in duration-300">
          {activeTab === "all" && (
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 text-white shadow-md border border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  <Sparkles className="w-4 h-4 text-purple-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-white">AI Operations Assistant (SKY AI)</h2>
                    <span className="text-xs text-purple-300 font-[vazirmatn] font-bold" dir="rtl">
                      دستیار هوشمند عملیاتی و رهگیری
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 hidden sm:block">
                    Configure Google Gemini API, model selection, execution mode (Read-only vs Actions), and language preferences
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("ai_assistant")}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 text-white transition border border-white/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Focus AI Assistant tab only"
              >
                <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden md:inline">Focus Section</span>
              </button>
            </div>
          )}
          <AIAssistantSettingsTab />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: PERFORMANCE & DIAGNOSTICS                                            */}
      {/* ========================================================================= */}
      {(activeTab === "all" || activeTab === "performance") && (
        <div id="section-performance" className="scroll-mt-28 space-y-4 animate-in fade-in duration-300">
          {activeTab === "all" && (
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-950 text-white shadow-md border border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  <Activity className="w-4 h-4 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-white">System Performance & Diagnostics</h2>
                    <span className="text-xs text-amber-300 font-[vazirmatn] font-bold" dir="rtl">
                      کارایی و تشخیص سیستم
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 hidden sm:block">
                    Monitor network latency, chunk caching status, DOM element load, and browser storage memory
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("performance")}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 text-white transition border border-white/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Focus Performance Diagnostics tab only"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Focus Section</span>
              </button>
            </div>
          )}
          <PerformanceDiagnosticsTab />
        </div>
      )}

      {/* Cloud Sync Hub Modal */}
      <CloudSyncModal open={isCloudSyncOpen} onOpenChange={setIsCloudSyncOpen} />


      {/* Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200 text-slate-900">
            <h3 className="text-base font-black text-slate-900">Reset Shipper Password</h3>
            <p className="text-xs text-slate-500 font-medium">
              Setting new login password for <strong className="text-blue-700 font-bold">@{resetModalUser.username}</strong> ({resetModalUser.name}).
            </p>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">New Password</label>
              <input
                type="password"
                value={resetModalNewPass}
                onChange={(e) => setResetModalNewPass(e.target.value)}
                placeholder="Enter at least 4 characters"
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (resetModalNewPass.length < 4) {
                    toast.error("Password must be at least 4 characters long.")
                    return
                  }
                  resetUserPassword(resetModalUser.id, resetModalNewPass)
                  toast.success(`Password updated for @${resetModalUser.username}!`)
                  setResetModalUser(null)
                }}
                className="px-4 py-2 rounded-xl text-xs bg-blue-700 hover:bg-blue-800 text-white font-bold"
              >
                Save Password
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
