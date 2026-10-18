"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useApp } from "@/lib/app-context"
import { usePermissions } from "@/lib/hooks/use-permissions"
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  Search,
  Download,
  Filter,
  RefreshCw,
  Copy,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  Building,
  UserCheck,
  UserX,
  Sliders,
  History,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  ExtendedUser,
  RoleDefinition,
  PermissionCategory,
  ApprovalRule,
  ApprovalRequest,
  AuditLog,
  StaffRole,
  UserStatus,
  ApprovalActionType,
} from "@/lib/rbac/rbac-types"
import { ALL_PERMISSIONS, DEFAULT_SYSTEM_ROLES, DEFAULT_APPROVAL_RULES } from "@/lib/rbac/permissions-config"
import { getStoredRoles, saveRole, cloneRole, validateSuperAdminProtection } from "@/lib/rbac/rbac-service"
import {
  getApprovalRules,
  saveApprovalRule,
  getApprovalRequests,
  processApprovalAction,
} from "@/lib/rbac/approval-service"
import { getAuditLogs, exportAuditLogsToCsv, logAuditEvent } from "@/lib/rbac/audit-service"
import { UserRole } from "@/lib/types"

type SubTab = "users" | "roles" | "permissions" | "approval_rules" | "approval_inbox" | "audit_log"

export function UsersPermissionsTab() {
  const { users, addUser, updateUser, updateUserRole, toggleUserStatus, deleteUser, resetUserPassword, currentUser } =
    useApp()
  const { isSuperAdmin, isAdmin, isManagement, hasPermission } = usePermissions()

  const [activeSubTab, setActiveSubTab] = useState<SubTab>("users")
  const [roles, setRoles] = useState<RoleDefinition[]>(DEFAULT_SYSTEM_ROLES)
  const [approvalRules, setApprovalRules] = useState<ApprovalRule[]>(DEFAULT_APPROVAL_RULES)
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])

  // Search & Filter States
  const [userSearch, setUserSearch] = useState("")
  const [userRoleFilter, setUserRoleFilter] = useState("all")
  const [permissionSearch, setPermissionSearch] = useState("")
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState("operations")
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

  // Modals
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [isCloneRoleModalOpen, setIsCloneRoleModalOpen] = useState(false)
  const [cloningSourceRoleId, setCloningSourceRoleId] = useState("operations")
  const [cloneRoleName, setCloneRoleName] = useState("")
  const [cloneRoleDesc, setCloneRoleDesc] = useState("")
  const [approvalModalRequest, setApprovalModalRequest] = useState<ApprovalRequest | null>(null)
  const [approvalComment, setApprovalComment] = useState("")

  // New User Form State
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    role: "operations" as UserRole,
    department: "Operations",
    branch: "Main Headquarters (Kabul)",
    password: "",
    status: "active" as UserStatus,
  })

  // Load Data
  const refreshData = useCallback(() => {
    setRoles(getStoredRoles())
    setApprovalRules(getApprovalRules())
    setApprovalRequests(getApprovalRequests())
    setAuditLogs(getAuditLogs({ limit: 300 }))
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Count pending approvals
  const pendingApprovalsCount = useMemo(() => {
    return approvalRequests.filter((r) => r.status === "PENDING").length
  }, [approvalRequests])

  // ---------------------------------------------------------------------------
  // User Actions
  // ---------------------------------------------------------------------------
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserForm.name || !newUserForm.username) {
      toast.error("Name and username are required")
      return
    }

    try {
      addUser({
        name: newUserForm.name,
        username: newUserForm.username,
        email: newUserForm.email,
        phone: newUserForm.phone,
        role: newUserForm.role,
        department: newUserForm.department,
        branch: newUserForm.branch,
        password: newUserForm.password || "skybalam2026",
        status: newUserForm.status,
      })
      toast.success(`User @${newUserForm.username} created successfully`)
      setIsAddUserModalOpen(false)
      setNewUserForm({
        name: "",
        username: "",
        email: "",
        phone: "",
        role: "operations",
        department: "Operations",
        branch: "Main Headquarters (Kabul)",
        password: "",
        status: "active",
      })
      refreshData()
    } catch (err: any) {
      toast.error(err.message || "Failed to create user")
    }
  }

  const handleUpdateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    try {
      validateSuperAdminProtection(users, editingUser.id, editingUser.role, editingUser.status)
      updateUser(editingUser.id, {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        department: editingUser.department,
        branch: editingUser.branch,
        role: editingUser.role,
        status: editingUser.status,
      })
      toast.success(`User @${editingUser.username} updated`)
      setIsEditUserModalOpen(false)
      refreshData()
    } catch (err: any) {
      toast.error(err.message || "Cannot update user")
    }
  }

  const handleDeleteUserSafely = (userId: string, userName: string) => {
    try {
      validateSuperAdminProtection(users, userId, undefined, "disabled")
      if (confirm(`Are you sure you want to deactivate and remove user ${userName}?`)) {
        deleteUser(userId)
        toast.success(`User ${userName} deleted`)
        refreshData()
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // ---------------------------------------------------------------------------
  // Permission Matrix Toggle
  // ---------------------------------------------------------------------------
  const handleTogglePermission = (roleId: string, permKey: string) => {
    const role = roles.find((r) => r.id === roleId)
    if (!role) return

    if (role.id === "superadmin") {
      toast.info("Super Admin permanently retains all permissions to prevent system lockout.")
      return
    }

    const hasIt = role.permissions.includes(permKey)
    const newPerms = hasIt ? role.permissions.filter((p) => p !== permKey) : [...role.permissions, permKey]

    const updatedRole: RoleDefinition = {
      ...role,
      permissions: newPerms,
      updated_at: new Date().toISOString(),
    }

    const updatedRoles = saveRole(updatedRole, currentUser?.id, currentUser?.name)
    setRoles(updatedRoles)
    toast.success(`Updated ${role.name}: ${permKey} is now ${hasIt ? "disabled" : "enabled"}`)
  }

  const handleToggleCategory = (roleId: string, category: PermissionCategory, selectAll: boolean) => {
    const role = roles.find((r) => r.id === roleId)
    if (!role || role.id === "superadmin") return

    const categoryPermKeys = ALL_PERMISSIONS.filter((p) => p.category === category).map((p) => p.permission_key)
    let newPerms: string[]

    if (selectAll) {
      newPerms = Array.from(new Set([...role.permissions, ...categoryPermKeys]))
    } else {
      newPerms = role.permissions.filter((p) => !categoryPermKeys.includes(p))
    }

    const updatedRole: RoleDefinition = {
      ...role,
      permissions: newPerms,
      updated_at: new Date().toISOString(),
    }
    const updatedRoles = saveRole(updatedRole, currentUser?.id, currentUser?.name)
    setRoles(updatedRoles)
    toast.success(`${selectAll ? "Granted" : "Revoked"} all ${category} permissions for ${role.name}`)
  }

  // ---------------------------------------------------------------------------
  // Role Cloning
  // ---------------------------------------------------------------------------
  const handleCloneRole = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cloneRoleName.trim()) {
      toast.error("Role name is required")
      return
    }

    try {
      const newRoleId = cloneRoleName.toLowerCase().replace(/[^a-z0-9_-]/g, "-")
      const cloned = cloneRole(
        cloningSourceRoleId,
        newRoleId,
        cloneRoleName,
        cloneRoleDesc || `Custom role cloned from ${cloningSourceRoleId}`,
        currentUser?.id,
        currentUser?.name
      )
      toast.success(`Role '${cloned.name}' created with ${cloned.permissions.length} permissions`)
      setIsCloneRoleModalOpen(false)
      setCloneRoleName("")
      setCloneRoleDesc("")
      refreshData()
    } catch (err: any) {
      toast.error(err.message || "Failed to clone role")
    }
  }

  // ---------------------------------------------------------------------------
  // Approval Processing
  // ---------------------------------------------------------------------------
  const handleApprovalAction = (action: "APPROVE" | "REJECT") => {
    if (!approvalModalRequest) return

    try {
      processApprovalAction({
        requestId: approvalModalRequest.id,
        userId: currentUser?.id || "guest",
        userName: currentUser?.name || "Manager",
        userRole: currentUser?.role || "management",
        action,
        comment: approvalComment.trim() || (action === "APPROVE" ? "Approved per review" : "Rejected"),
      })

      toast.success(`Request ${action === "APPROVE" ? "approved" : "rejected"} successfully`)
      setApprovalModalRequest(null)
      setApprovalComment("")
      refreshData()
    } catch (err: any) {
      toast.error(err.message || "Approval action failed")
    }
  }

  // ---------------------------------------------------------------------------
  // Audit CSV Export
  // ---------------------------------------------------------------------------
  const handleExportAuditCsv = () => {
    const csv = exportAuditLogsToCsv(auditLogs)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `skyariana-audit-log-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Audit log exported to CSV")
  }

  // Categories list
  const categories: PermissionCategory[] = useMemo(() => {
    const cats = new Set<PermissionCategory>()
    ALL_PERMISSIONS.forEach((p) => cats.add(p.category))
    return Array.from(cats)
  }, [])

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = userSearch.toLowerCase()
      const matchesSearch =
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        ((u as any).department && (u as any).department.toLowerCase().includes(q))
      const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter
      return matchesSearch && matchesRole
    })
  }, [users, userSearch, userRoleFilter])

  return (
    <div className="space-y-6">
      {/* Executive Header Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 flex items-center justify-center font-black text-xl shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Staff Roles & Enterprise Permissions</h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-[vazirmatn] font-bold" dir="rtl">
                  مدیریت دسترسی کارمندان، اختیارات و تاییدات
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Four-eyes authorization, multi-currency approval rules, and immutable audit logs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setIsAddUserModalOpen(true)}
              className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              Add User (کاربر جدید)
            </Button>
            <Button
              onClick={() => setIsCloneRoleModalOpen(true)}
              variant="outline"
              className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs h-9 px-3 rounded-xl cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
              Clone Role
            </Button>
          </div>
        </div>
      </div>

      {/* Subpage Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 shadow-xs backdrop-blur-md overflow-x-auto scrollbar-none touch-pan-y overscroll-x-contain">
        <button
          type="button"
          onClick={() => setActiveSubTab("users")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "users" ? "bg-blue-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Users className="w-3.5 h-3.5 text-amber-400" />
          <span>Staff Users</span>
          <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-blue-100 text-blue-900">
            {users.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("roles")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "roles" ? "bg-blue-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Roles & Scopes</span>
          <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-slate-100 text-slate-700">
            {roles.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("permissions")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "permissions" ? "bg-blue-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Key className="w-3.5 h-3.5 text-amber-400" />
          <span>Permission Matrix (ماتریس اختیارات)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("approval_rules")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "approval_rules" ? "bg-blue-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-sky-400" />
          <span>Approval Rules</span>
          <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-slate-100 text-slate-700">
            {approvalRules.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("approval_inbox")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "approval_inbox" ? "bg-blue-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Approval Inbox</span>
          {pendingApprovalsCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-amber-400 text-slate-950 animate-pulse">
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("audit_log")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "audit_log" ? "bg-blue-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <History className="w-3.5 h-3.5 text-indigo-400" />
          <span>Audit Log (گزارش تغییرات)</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* SUBPAGE 1: USERS                                                      */}
      {/* ===================================================================== */}
      {activeSubTab === "users" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name, @username, email, or department..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-700"
              >
                <option value="all">All Roles (همه نقش‌ها)</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => setIsAddUserModalOpen(true)}
                className="bg-blue-900 hover:bg-blue-800 text-white font-black text-xs px-3.5 rounded-xl h-9 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u) => {
              const roleDef = roles.find((r) => r.id === u.role)
              const isSuper = u.role === "superadmin"
              const isActive = u.status === "active" || !u.status

              return (
                <div
                  key={u.id}
                  className={`p-4 rounded-2xl border transition-all shadow-xs flex flex-col justify-between gap-3 ${
                    isActive ? "bg-white border-slate-200 hover:border-blue-400" : "bg-slate-50 border-slate-300 opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-amber-400 font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500 font-mono font-bold">@{u.username}</div>
                        {(u as any).department && (
                          <div className="text-[11px] text-blue-800 font-semibold">
                            📂 {(u as any).department}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          isSuper
                            ? "bg-purple-100 text-purple-900 border border-purple-200"
                            : u.role === "admin"
                            ? "bg-blue-100 text-blue-900 border border-blue-200"
                            : u.role === "management"
                            ? "bg-amber-100 text-amber-900 border border-amber-200"
                            : "bg-slate-100 text-slate-800 border border-slate-200"
                        }`}
                      >
                        {roleDef?.name || u.role}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                          isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {u.status || "active"}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-2">
                    {u.email && <div>✉️ {u.email}</div>}
                    {(u as any).phone && <div>📞 {(u as any).phone}</div>}
                    {(u as any).branch && <div>🏢 {(u as any).branch}</div>}
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUser({ ...u })
                          setIsEditUserModalOpen(true)
                        }}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-blue-900 transition cursor-pointer"
                        title="Edit profile & role"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const newPass = prompt(`Enter new password for @${u.username}:`)
                          if (newPass) {
                            const res = resetUserPassword(u.id, newPass)
                            if (res.success) toast.success(res.message)
                            else toast.error(res.message)
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-amber-800 transition cursor-pointer"
                        title="Reset password"
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            toggleUserStatus(u.id)
                            toast.success(`Status updated for @${u.username}`)
                            refreshData()
                          } catch (err: any) {
                            toast.error(err.message)
                          }
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          u.status === "disabled" || u.status === "suspended"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                        }`}
                      >
                        {u.status === "disabled" || u.status === "suspended" ? "Reactivate" : "Suspend"}
                      </button>

                      {!isSuper && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUserSafely(u.id, u.name)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBPAGE 2: ROLES                                                      */}
      {/* ===================================================================== */}
      {activeSubTab === "roles" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((r) => {
              const userCount = users.filter((u) => u.role === r.id).length

              return (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-400 transition-all flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-black">
                        {r.name}
                      </span>
                      {r.system_role ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                          System Role
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                          Custom Role
                        </span>
                      )}
                    </div>
                    {r.nameFa && (
                      <div className="text-xs text-slate-500 font-[vazirmatn] font-bold mb-1" dir="rtl">
                        {r.nameFa}
                      </div>
                    )}
                    <p className="text-xs text-slate-600 line-clamp-2">{r.description}</p>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">
                      👥 {userCount} assigned staff
                    </span>
                    <span className="font-mono text-slate-500 font-bold">
                      🔑 {r.permissions.length} perms
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <Button
                      onClick={() => {
                        setSelectedRoleForMatrix(r.id)
                        setActiveSubTab("permissions")
                      }}
                      variant="outline"
                      className="flex-1 text-xs font-bold h-8 rounded-xl cursor-pointer"
                    >
                      Configure Permissions
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setCloningSourceRoleId(r.id)
                        setCloneRoleName(`${r.name} Copy`)
                        setIsCloneRoleModalOpen(true)
                      }}
                      className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                      title="Clone role"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBPAGE 3: PERMISSION MATRIX                                         */}
      {/* ===================================================================== */}
      {activeSubTab === "permissions" && (
        <div className="space-y-4">
          {/* Role Selector Header */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Configuring Role:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoleForMatrix(r.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      selectedRoleForMatrix === r.id
                        ? "bg-blue-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search permissions..."
                value={permissionSearch}
                onChange={(e) => setPermissionSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Matrix Accordions */}
          <div className="space-y-3">
            {categories.map((category) => {
              const catPerms = ALL_PERMISSIONS.filter((p) => {
                const matchesCat = p.category === category
                if (!permissionSearch) return matchesCat
                const q = permissionSearch.toLowerCase()
                return (
                  matchesCat &&
                  (p.name.toLowerCase().includes(q) ||
                    p.permission_key.toLowerCase().includes(q) ||
                    p.description.toLowerCase().includes(q))
                )
              })

              if (catPerms.length === 0) return null

              const selectedRole = roles.find((r) => r.id === selectedRoleForMatrix)
              const isCollapsed = collapsedCategories[category]

              const grantedCount = catPerms.filter((p) => selectedRole?.permissions.includes(p.permission_key)).length
              const allGranted = grantedCount === catPerms.length

              return (
                <div key={category} className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="p-3.5 bg-slate-50/80 flex items-center justify-between gap-3 border-b border-slate-200/60">
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedCategories((prev) => ({ ...prev, [category]: !prev[category] }))
                      }
                      className="flex items-center gap-2 font-black text-xs text-slate-800 hover:text-blue-900 cursor-pointer"
                    >
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <span>{category}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-950">
                        {grantedCount} / {catPerms.length}
                      </span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleCategory(selectedRoleForMatrix, category, true)}
                        className="text-[10px] h-7 px-2 font-bold cursor-pointer"
                        disabled={selectedRoleForMatrix === "superadmin"}
                      >
                        Select All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleCategory(selectedRoleForMatrix, category, false)}
                        className="text-[10px] h-7 px-2 font-bold cursor-pointer"
                        disabled={selectedRoleForMatrix === "superadmin"}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100">
                      {catPerms.map((perm) => {
                        const isGranted = selectedRole?.permissions.includes(perm.permission_key) || selectedRoleForMatrix === "superadmin"

                        return (
                          <div
                            key={perm.permission_key}
                            className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900">{perm.name}</span>
                                <code className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                  {perm.permission_key}
                                </code>
                                {perm.nameFa && (
                                  <span className="text-[11px] text-amber-700 font-[vazirmatn] font-bold" dir="rtl">
                                    {perm.nameFa}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">{perm.description}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleTogglePermission(selectedRoleForMatrix, perm.permission_key)}
                              disabled={selectedRoleForMatrix === "superadmin"}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition shadow-xs cursor-pointer ${
                                isGranted
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                              }`}
                              title={isGranted ? "Permission granted (click to revoke)" : "Permission denied (click to grant)"}
                            >
                              {isGranted ? <Check className="w-5 h-5 stroke-[3]" /> : <XCircle className="w-5 h-5" />}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBPAGE 4: APPROVAL RULES                                             */}
      {/* ===================================================================== */}
      {activeSubTab === "approval_rules" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                <strong>Four-Eyes Financial Governance:</strong> High-value transactions exceeding the thresholds below will remain in <strong>PENDING</strong> status and cannot be committed to the ledger until an authorized manager approves them. Self-approval is blocked by default.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvalRules.map((rule) => (
              <div
                key={rule.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-950 font-black text-xs border border-blue-200">
                      {rule.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rule.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {rule.active ? "Active Rule" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-3">{rule.description}</p>

                  <div className="space-y-1.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Threshold:</span>
                      <span className="font-mono font-black text-blue-900">
                        {rule.min_amount === 0 ? "Any Amount (All Transactions)" : `${rule.min_amount.toLocaleString()} ${rule.currency}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Authorized Approvers:</span>
                      <span className="font-bold text-slate-800">{rule.approver_roles.join(", ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Self-Approval:</span>
                      <span className={`font-bold ${rule.allow_self_approval ? "text-amber-700" : "text-emerald-700"}`}>
                        {rule.allow_self_approval ? "Allowed" : "Prohibited (Four-Eyes Required)"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">{rule.id}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newAmount = prompt(`Enter new threshold for ${rule.name} (${rule.currency}):`, String(rule.min_amount))
                      if (newAmount !== null && !isNaN(Number(newAmount))) {
                        const updated = saveApprovalRule(
                          { ...rule, min_amount: Number(newAmount) },
                          currentUser?.id,
                          currentUser?.name
                        )
                        setApprovalRules(updated)
                        toast.success("Approval threshold updated")
                      }
                    }}
                    className="text-xs font-bold h-8 rounded-xl cursor-pointer"
                  >
                    Adjust Threshold
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBPAGE 5: APPROVAL INBOX                                             */}
      {/* ===================================================================== */}
      {activeSubTab === "approval_inbox" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700 uppercase">Requests Queue:</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-950 font-bold text-xs">
                {approvalRequests.length} Total
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={refreshData}
              className="text-xs font-bold h-8 rounded-xl cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </div>

          {approvalRequests.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200/80 text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500/50" />
              <p className="text-sm font-bold text-slate-600">No approval requests currently in queue</p>
              <p className="text-xs text-slate-400">Transactions exceeding threshold amounts will appear here for management sign-off.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
              {approvalRequests.map((req) => {
                const isPending = req.status === "PENDING"
                const isApproved = req.status === "APPROVED"

                return (
                  <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900">{req.request_type}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            isPending
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : isApproved
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                              : "bg-red-100 text-red-900 border border-red-200"
                          }`}
                        >
                          {req.status}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">Ref: {req.entity_ref}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">{req.reason}</p>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>By: {req.requested_by_name}</span>
                        <span>•</span>
                        <span>{new Date(req.requested_at).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                      <div className="text-right">
                        <div className="text-base font-black font-mono text-blue-900">
                          {req.amount.toLocaleString()} {req.currency}
                        </div>
                        <div className="text-[10px] text-slate-400">Financial Impact</div>
                      </div>

                      {isPending && (
                        <Button
                          onClick={() => {
                            setApprovalModalRequest(req)
                            setApprovalComment("")
                          }}
                          className="bg-blue-900 hover:bg-blue-800 text-white font-black text-xs h-8 px-3 rounded-xl cursor-pointer"
                        >
                          Review & Decide
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBPAGE 6: AUDIT LOG                                                  */}
      {/* ===================================================================== */}
      {activeSubTab === "audit_log" && (
        <div className="space-y-4">
          <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-black text-slate-800">Immutable Audit Trail</span>
              <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {auditLogs.length} events logged
              </span>
            </div>

            <Button
              onClick={handleExportAuditCsv}
              variant="outline"
              className="text-xs font-bold h-8 px-3 rounded-xl cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Export to CSV (اکسل)
            </Button>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/60 text-slate-500 font-bold">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.slice(0, 100).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 font-bold text-slate-800">{log.user_name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 font-mono text-[10px] font-bold border border-blue-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">
                      {log.entity_type} ({log.entity_id})
                    </td>
                    <td className="p-3 text-slate-600 max-w-md truncate">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: ADD USER                                                       */}
      {/* --------------------------------------------------------------------- */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-black text-slate-900">Add Staff User (ثبت کارمند جدید)</h3>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name (نام و تخلص)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ahmad Qasimi"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Username (نام کاربری)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ahmad.ops"
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role (نقش سازمانی)</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department (بخش)</label>
                  <select
                    value={newUserForm.department}
                    onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Operations">Operations</option>
                    <option value="Accounting">Accounting & Finance</option>
                    <option value="Management">Management</option>
                    <option value="Documents">Documents</option>
                    <option value="Tracking">Tracking</option>
                    <option value="Administration">Administration</option>
                    <option value="Logistics">Logistics</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Branch / Office (شعبه)</label>
                <select
                  value={newUserForm.branch}
                  onChange={(e) => setNewUserForm({ ...newUserForm, branch: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="Main Headquarters (Kabul)">Main Headquarters (Kabul)</option>
                  <option value="Kandahar Office">Kandahar Office</option>
                  <option value="Bandar Abbas Office">Bandar Abbas Office</option>
                  <option value="Dubai Hub Office">Dubai Hub Office</option>
                  <option value="Herat / Islam Qala Border">Herat / Islam Qala Border</option>
                  <option value="Mazar / Hairatan Border">Mazar / Hairatan Border</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email (اختیاری)</label>
                  <input
                    type="email"
                    placeholder="email@skybalam.com"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone (تلفن)</label>
                  <input
                    type="text"
                    placeholder="+93 79 000 0000"
                    value={newUserForm.phone}
                    onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Password (رمز عبور)</label>
                <input
                  type="password"
                  placeholder="Defaults to: skybalam2026"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="h-9 px-4 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-9 px-4 rounded-xl text-xs font-black bg-blue-900 text-white hover:bg-blue-800 cursor-pointer"
                >
                  Create User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: EDIT USER                                                      */}
      {/* --------------------------------------------------------------------- */}
      {isEditUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-black text-slate-900">Edit User @{editingUser.username}</h3>
              <button
                type="button"
                onClick={() => setIsEditUserModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUserSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editingUser.status || "active"}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as UserStatus })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="locked">Locked</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={editingUser.department || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Branch</label>
                  <input
                    type="text"
                    value={editingUser.branch || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, branch: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="h-9 px-4 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-9 px-4 rounded-xl text-xs font-black bg-blue-900 text-white hover:bg-blue-800 cursor-pointer"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: CLONE ROLE                                                     */}
      {/* --------------------------------------------------------------------- */}
      {isCloneRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-black text-slate-900">Clone Staff Role (کپی نقش سازمانی)</h3>
              <button
                type="button"
                onClick={() => setIsCloneRoleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloneRole} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Source Template Role</label>
                <select
                  value={cloningSourceRoleId}
                  onChange={(e) => setCloningSourceRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.permissions.length} perms)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">New Role Name (e.g. Operations Supervisor)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Accountant"
                  value={cloneRoleName}
                  onChange={(e) => setCloneRoleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Responsibilities and access scope of this role..."
                  value={cloneRoleDesc}
                  onChange={(e) => setCloneRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCloneRoleModalOpen(false)}
                  className="h-9 px-4 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-9 px-4 rounded-xl text-xs font-black bg-blue-900 text-white hover:bg-blue-800 cursor-pointer"
                >
                  Create Cloned Role
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: APPROVAL DECISION                                              */}
      {/* --------------------------------------------------------------------- */}
      {approvalModalRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-900" />
                <h3 className="text-sm font-black text-slate-900">Authorize Financial Request</h3>
              </div>
              <button
                type="button"
                onClick={() => setApprovalModalRequest(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Action:</span>
                <span className="font-black text-blue-950">{approvalModalRequest.request_type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Amount / Value:</span>
                <span className="font-black font-mono text-base text-blue-900">
                  {approvalModalRequest.amount.toLocaleString()} {approvalModalRequest.currency}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Requested By:</span>
                <span className="font-semibold text-slate-800">{approvalModalRequest.requested_by_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Reason:</span>
                <span className="text-slate-800">{approvalModalRequest.reason}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Approver Comment (توضیحات و دلیل تصمیم):
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Approved — supplier invoice and bank details verified."
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleApprovalAction("REJECT")}
                className="h-9 px-4 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer"
              >
                Reject Request
              </Button>
              <Button
                type="button"
                onClick={() => handleApprovalAction("APPROVE")}
                className="h-9 px-4 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer"
              >
                Authorize & Commit (تایید نهایی)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
