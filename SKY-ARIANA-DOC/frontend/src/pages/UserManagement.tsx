import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  Archive,
  Check,
  CheckCircle2,
  Clock3,
  CircleUserRound,
  Copy,
  Edit3,
  FileDown,
  KeyRound,
  Laptop,
  LockKeyhole,
  MoreHorizontal,
  Network,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  ShieldQuestion,
  Smartphone,
  Trash2,
  UserCheck,
  UserPlus,
  UsersRound,
  X,
  Zap,
} from 'lucide-react'
import { userManagementApi } from '../services/api'
import SecuritySettingsPanel from '../components/SecuritySettingsPanel'
import './user-management.css'
import type {
  LoginActivityEntry,
  ManagedUser,
  PermissionDefinition,
  RoleDefinition,
  SecuritySettings,
  UserSession,
} from '../types'

type ManagementTab = 'users' | 'roles' | 'login-activity' | 'sessions' | 'security'

const TAB_LABELS: Array<{ id: ManagementTab; label: string; short: string; permission: string; icon: React.ElementType }> = [
  { id: 'users', label: 'Users', short: 'Users', permission: 'users.view', icon: UsersRound },
  { id: 'roles', label: 'Roles & Permissions', short: 'Roles', permission: 'roles.view', icon: ShieldCheck },
  { id: 'login-activity', label: 'Login Activity', short: 'Activity', permission: 'security.view_login_activity', icon: Activity },
  { id: 'sessions', label: 'Active Sessions', short: 'Sessions', permission: 'security.manage_sessions', icon: Laptop },
  { id: 'security', label: 'Security Settings', short: 'Security', permission: 'security.view', icon: LockKeyhole },
]

const EMPTY_USER_FORM = {
  first_name: '',
  last_name: '',
  display_name: '',
  username: '',
  email: '',
  phone: '',
  employee_id: '',
  job_title: '',
  department: '',
  role: 'Viewer',
  status: 'active',
  language: 'en',
  timezone: 'Asia/Kabul',
  require_password_change: true,
  send_invitation: false,
}

const DEFAULT_SECURITY_FORM: Omit<SecuritySettings, 'id' | 'updated_at'> = {
  minimum_password_length: 10,
  require_uppercase: true,
  require_lowercase: true,
  require_number: true,
  require_special: true,
  password_expiration_days: 0,
  password_history_count: 5,
  failed_login_limit: 5,
  lock_duration_minutes: 15,
  session_timeout_minutes: 480,
  require_password_change_on_first_login: true,
  require_two_factor: false,
  two_factor_roles: [],
  allow_multiple_sessions: true,
  invitation_expiration_hours: 72,
  password_reset_expiration_minutes: 30,
  login_notification: true,
  new_device_notification: true,
}

const formatDate = (value?: string | null, fallback = 'Never') => {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const getErrorMessage = (error: any) => {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (detail?.message) return detail.message
  return error?.message || 'Something went wrong. Please try again.'
}

const initials = (user?: Partial<ManagedUser> | null) => {
  const name = user?.display_name || user?.name || user?.email || 'User'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

const statusClass = (status?: string) => {
  if (status === 'active') return 'um-status um-status--active'
  if (status === 'suspended' || status === 'locked') return 'um-status um-status--danger'
  if (status === 'pending') return 'um-status um-status--warning'
  return 'um-status um-status--muted'
}

const statusLabel = (status?: string) => {
  if (!status) return 'Unknown'
  if (status === 'pending') return 'Pending invitation'
  if (status === 'locked') return 'Locked'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const Modal: React.FC<{
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ title, eyebrow, onClose, children, wide = false }) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    dialogRef.current?.focus()
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="um-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="um-dialog-title" className={`um-modal ${wide ? 'um-modal--wide' : ''}`}>
        <div className="um-modal__header">
          <div>
            {eyebrow && <span className="um-eyebrow">{eyebrow}</span>}
            <h2 id="um-dialog-title">{title}</h2>
          </div>
          <button className="um-icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </div>
        <div className="um-modal__body">{children}</div>
      </div>
    </div>
  )
}

const StatusBadge: React.FC<{ status?: string }> = ({ status }) => <span className={statusClass(status)}><span />{statusLabel(status)}</span>

const LoadingState: React.FC<{ label?: string }> = ({ label = 'Loading secure workspace…' }) => (
  <div className="um-state um-state--loading"><div className="um-spinner" /><strong>{label}</strong><span>Fetching the latest access data.</span></div>
)

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="um-state um-state--error"><AlertCircle size={26} /><strong>Unable to load this view</strong><span>{message}</span><button className="um-button um-button--secondary" onClick={onRetry}><RefreshCw size={14} /> Try again</button></div>
)

const EmptyState: React.FC<{ icon?: React.ElementType; title: string; copy: string; action?: React.ReactNode }> = ({ icon: Icon = Archive, title, copy, action }) => (
  <div className="um-state"><Icon size={28} /><strong>{title}</strong><span>{copy}</span>{action}</div>
)

const PermissionGate: React.FC<{ allowed: boolean; children: React.ReactNode }> = ({ allowed, children }) => allowed ? <>{children}</> : null

const UserManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (TAB_LABELS.some((tab) => tab.id === searchParams.get('tab')) ? searchParams.get('tab') : 'users') as ManagementTab
  const queryClient = useQueryClient()
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
  const isSuperAdmin = storedUser.role_name === 'Super Admin' || storedUser.role === 'Super Admin'
  const can = (permission: string) => isSuperAdmin || storedUser.permissions?.includes(permission)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [openActionUserId, setOpenActionUserId] = useState<number | null>(null)
  const [userModal, setUserModal] = useState<{ mode: 'create' | 'edit'; user?: ManagedUser } | null>(null)
  const [userForm, setUserForm] = useState({ ...EMPTY_USER_FORM })
  const [detailUserId, setDetailUserId] = useState<number | null>(null)
  const [permissionUser, setPermissionUser] = useState<ManagedUser | null>(null)
  const [permissionDraft, setPermissionDraft] = useState<string[]>([])
  const [permissionLoading, setPermissionLoading] = useState(false)
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null)
  const [resetPassword, setResetPassword] = useState<string | null>(null)
  const [resetRequireChange, setResetRequireChange] = useState(true)
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)
  const [roleModal, setRoleModal] = useState<RoleDefinition | 'new' | null>(null)
  const [roleForm, setRoleForm] = useState({ name: '', description: '', permissions: [] as string[] })
  const [loginResult, setLoginResult] = useState('')
  const [failedOnly, setFailedOnly] = useState(false)
  const [securityForm, setSecurityForm] = useState(DEFAULT_SECURITY_FORM)
  const [securityConfirm, setSecurityConfirm] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [confirm, setConfirm] = useState<{ title: string; message: string; label: string; danger?: boolean; run: () => Promise<void> } | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    window.setTimeout(() => setToast(null), 4200)
  }

  const usersQuery = useQuery({
    queryKey: ['management-users', search, roleFilter, statusFilter, sort, page, pageSize],
    queryFn: () => userManagementApi.listUsers({ search: search || undefined, role: roleFilter || undefined, status: statusFilter || undefined, sort, page, page_size: pageSize }),
    enabled: activeTab === 'users',
  })
  const rolesQuery = useQuery({
    queryKey: ['management-roles'],
    queryFn: userManagementApi.listRoles,
    enabled: activeTab === 'roles' || activeTab === 'users' || Boolean(userModal) || Boolean(permissionUser),
  })
  const permissionsQuery = useQuery({
    queryKey: ['management-permissions'],
    queryFn: userManagementApi.listPermissions,
    enabled: activeTab === 'roles' || Boolean(permissionUser),
  })
  const detailQuery = useQuery({
    queryKey: ['management-user', detailUserId],
    queryFn: () => userManagementApi.getUser(detailUserId as number),
    enabled: Boolean(detailUserId),
  })
  const activityQuery = useQuery({
    queryKey: ['management-login-activity', loginResult, failedOnly],
    queryFn: () => userManagementApi.listLoginActivity({ result: loginResult || undefined, failed_only: failedOnly, page_size: 100 }),
    enabled: activeTab === 'login-activity',
  })
  const sessionsQuery = useQuery({
    queryKey: ['management-sessions'],
    queryFn: () => userManagementApi.listSessions(),
    enabled: activeTab === 'sessions',
  })
  const securityQuery = useQuery({
    queryKey: ['management-security-settings'],
    queryFn: userManagementApi.getSecuritySettings,
    enabled: activeTab === 'security',
  })

  useEffect(() => {
    if (securityQuery.data) {
      const { id: _id, updated_at: _updatedAt, ...settings } = securityQuery.data as SecuritySettings
      setSecurityForm(settings)
    }
  }, [securityQuery.data])

  useEffect(() => {
    setPage(1)
  }, [search, roleFilter, statusFilter, sort, pageSize])

  const saveUserMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...userForm,
        username: userForm.username || undefined,
        display_name: userForm.display_name || undefined,
        phone: userForm.phone || undefined,
        employee_id: userForm.employee_id || undefined,
        job_title: userForm.job_title || undefined,
        department: userForm.department || undefined,
        ...(userModal?.mode === 'create' ? { generate_temporary_password: true, send_invitation: userForm.send_invitation } : {}),
      }
      return userModal?.mode === 'edit' && userModal.user ? userManagementApi.updateUser(userModal.user.id, payload) : userManagementApi.createUser(payload)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['management-users'] })
      if (userModal?.mode === 'create') {
        setCreatedPassword(data.temporary_password || null)
        showToast('success', 'User account created successfully.')
      } else {
        setUserModal(null)
        showToast('success', 'User profile updated successfully.')
      }
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: () => userManagementApi.resetPassword(resetUser?.id as number, { generate_temporary_password: true, require_password_change: resetRequireChange, revoke_sessions: true }),
    onSuccess: (data) => {
      setResetPassword(data.temporary_password || null)
      queryClient.invalidateQueries({ queryKey: ['management-users'] })
      showToast('success', 'A new temporary password has been created.')
    },
  })

  const savePermissionMutation = useMutation({
    mutationFn: () => userManagementApi.updatePermissions(permissionUser?.id as number, permissionDraft),
    onSuccess: () => {
      setPermissionUser(null)
      queryClient.invalidateQueries({ queryKey: ['management-users'] })
      showToast('success', 'Permission overrides saved.')
    },
  })

  const saveRoleMutation = useMutation({
    mutationFn: () => roleModal === 'new'
      ? userManagementApi.createRole(roleForm)
      : userManagementApi.updateRole((roleModal as RoleDefinition).id, roleForm),
    onSuccess: () => {
      setRoleModal(null)
      queryClient.invalidateQueries({ queryKey: ['management-roles'] })
      showToast('success', roleModal === 'new' ? 'Custom role created.' : 'Role permissions updated.')
    },
  })

  const saveSecurityMutation = useMutation({
    mutationFn: (confirmWeakening: boolean) => userManagementApi.updateSecuritySettings(securityForm, confirmWeakening),
    onSuccess: () => {
      setSecurityConfirm(false)
      queryClient.invalidateQueries({ queryKey: ['management-security-settings'] })
      showToast('success', 'Security policy updated.')
    },
    onError: (error: any) => {
      if (error?.response?.status === 409) {
        setSecurityConfirm(true)
      } else {
        showToast('error', getErrorMessage(error))
      }
    },
  })

  const setTab = (tab: ManagementTab) => setSearchParams(tab === 'users' ? {} : { tab })

  const openCreateUser = () => {
    setCreatedPassword(null)
    setUserForm({ ...EMPTY_USER_FORM })
    setUserModal({ mode: 'create' })
  }

  const openEditUser = (user: ManagedUser) => {
    setCreatedPassword(null)
    setUserForm({
      ...EMPTY_USER_FORM,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      display_name: user.display_name || user.name || '',
      username: user.username || '',
      email: user.email,
      phone: user.phone || '',
      employee_id: user.employee_id || '',
      job_title: user.job_title || '',
      department: user.department || '',
      role: user.role_name || user.role || 'Viewer',
      status: user.status || (user.is_active ? 'active' : 'suspended'),
      language: user.language || 'en',
      timezone: user.timezone || 'Asia/Kabul',
      require_password_change: Boolean(user.must_change_password),
    })
    setUserModal({ mode: 'edit', user })
  }

  const openPermissionEditor = async (user: ManagedUser) => {
    if (!can('permissions.manage')) return
    setPermissionUser(user)
    setPermissionLoading(true)
    try {
      const detail = await userManagementApi.getUser(user.id)
      setPermissionDraft(detail.permissions || [])
    } catch (error) {
      setPermissionUser(null)
      showToast('error', getErrorMessage(error))
    } finally {
      setPermissionLoading(false)
    }
  }

  const openRoleEditor = (role: RoleDefinition | 'new') => {
    setRoleModal(role)
    setRoleForm(role === 'new' ? { name: '', description: '', permissions: [] } : { name: role.name, description: role.description || '', permissions: [...role.permissions] })
  }

  const sendInvitation = async (user: ManagedUser) => {
    setOpenActionUserId(null)
    try {
      const result = await userManagementApi.sendInvitation(user.id)
      showToast('success', result.message || 'Invitation prepared for delivery.')
      queryClient.invalidateQueries({ queryKey: ['management-users'] })
    } catch (error) {
      showToast('error', getErrorMessage(error))
    }
  }

  const executeConfirmation = async () => {
    if (!confirm) return
    setConfirmLoading(true)
    try {
      await confirm.run()
      setConfirm(null)
      queryClient.invalidateQueries({ queryKey: ['management-users'] })
      queryClient.invalidateQueries({ queryKey: ['management-sessions'] })
      showToast('success', 'The requested security action is complete.')
    } catch (error) {
      showToast('error', getErrorMessage(error))
    } finally {
      setConfirmLoading(false)
    }
  }

  const requestUserAction = (user: ManagedUser, action: 'suspend' | 'activate' | 'delete' | 'sessions') => {
    const isDelete = action === 'delete'
    const isSuspend = action === 'suspend'
    setConfirm({
      title: isDelete ? 'Delete user account?' : isSuspend ? 'Suspend user account?' : action === 'activate' ? 'Activate user account?' : 'Revoke all sessions?',
      message: isDelete
        ? `${user.display_name || user.name} will be soft-deleted. Invoices, audit history, and relational records will remain preserved.`
        : isSuspend
          ? `${user.display_name || user.name} will be blocked from signing in and all active sessions will be revoked.`
          : action === 'activate'
            ? `${user.display_name || user.name} will be allowed to sign in again.`
            : `Every active session for ${user.display_name || user.name} will be revoked.`,
      label: isDelete ? 'Soft-delete account' : isSuspend ? 'Suspend account' : action === 'activate' ? 'Activate account' : 'Revoke sessions',
      danger: isDelete || isSuspend,
      run: async () => {
        if (action === 'delete') await userManagementApi.deleteUser(user.id)
        if (action === 'suspend') await userManagementApi.suspendUser(user.id)
        if (action === 'activate') await userManagementApi.activateUser(user.id)
        if (action === 'sessions') await userManagementApi.revokeAllSessions(user.id, false)
      },
    })
    setOpenActionUserId(null)
  }

  const exportUsers = () => {
    const items = (usersQuery.data?.items || []) as ManagedUser[]
    const header = ['Name', 'Username', 'Email', 'Role', 'Department', 'Status', 'Last login']
    const rows = items.map((item) => [item.display_name || item.name, item.username || '', item.email, item.role_name || item.role, item.department || '', item.status || '', item.last_login_at || ''])
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `sky-ariana-users-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const permissions = (permissionsQuery.data || []) as PermissionDefinition[]
  const permissionGroups = useMemo(() => ((permissionsQuery.data || []) as PermissionDefinition[]).reduce<Record<string, PermissionDefinition[]>>((groups, permission) => {
    groups[permission.module] = [...(groups[permission.module] || []), permission]
    return groups
  }, {}), [permissionsQuery.data])
  const users = (usersQuery.data?.items || []) as ManagedUser[]
  const roles = (rolesQuery.data || []) as RoleDefinition[]
  const activities = (activityQuery.data?.items || []) as LoginActivityEntry[]
  const sessions = (sessionsQuery.data?.items || []) as UserSession[]
  const detailUser = detailQuery.data as (ManagedUser & { sessions?: UserSession[]; recent_audit?: any[] }) | undefined

  const togglePermission = (key: string, checked: boolean) => setRoleForm((previous) => ({ ...previous, permissions: checked ? [...new Set([...previous.permissions, key])] : previous.permissions.filter((item) => item !== key) }))
  const toggleUserPermission = (key: string, checked: boolean) => setPermissionDraft((previous) => checked ? [...new Set([...previous, key])] : previous.filter((item) => item !== key))

  if (String(activeTab) === 'security') {
    return (
      <div className="um-page animate-fade-in um-page--security">
        <div className="um-tabs" role="tablist" aria-label="User management sections">
          {TAB_LABELS.map((tab) => {
            const allowed = can(tab.permission)
            if (!allowed) return null
            const Icon = tab.icon
            return <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} className={`um-tab ${activeTab === tab.id ? 'is-active' : ''}`} onClick={() => setTab(tab.id)}><Icon size={15} /><span className="um-tab__full">{tab.label}</span><span className="um-tab__short">{tab.short}</span></button>
          })}
        </div>
        <SecuritySettingsPanel />
      </div>
    )
  }

  return (
    <div className="um-page animate-fade-in">
      <div className="um-page-heading">
        <div>
          <span className="um-eyebrow">Administration / Access control</span>
          <h1>User Management</h1>
          <p>Manage users, roles, permissions, login security, and active sessions across your organization.</p>
        </div>
        <div className="um-heading-actions">
          {activeTab === 'users' && <PermissionGate allowed={Boolean(can('users.view'))}><button className="um-button um-button--secondary" onClick={exportUsers}><FileDown size={16} /> Export</button></PermissionGate>}
          {activeTab === 'users' && <PermissionGate allowed={Boolean(can('users.create'))}><button className="um-button um-button--primary" onClick={openCreateUser}><Plus size={17} /> Add user</button></PermissionGate>}
          {activeTab === 'roles' && <PermissionGate allowed={Boolean(can('roles.create'))}><button className="um-button um-button--primary" onClick={() => openRoleEditor('new')}><Plus size={17} /> Create role</button></PermissionGate>}
        </div>
      </div>

      <div className="um-tabs" role="tablist" aria-label="User management sections">
        {TAB_LABELS.map((tab) => {
          const allowed = can(tab.permission)
          if (!allowed) return null
          const Icon = tab.icon
          return <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} className={`um-tab ${activeTab === tab.id ? 'is-active' : ''}`} onClick={() => setTab(tab.id)}><Icon size={15} /><span className="um-tab__full">{tab.label}</span><span className="um-tab__short">{tab.short}</span></button>
        })}
      </div>

      {activeTab === 'users' && (
        <>
          <div className="um-summary-grid">
            {[
              { label: 'Total users', value: usersQuery.data?.summary?.total_users ?? '—', copy: 'Accounts in the workspace', icon: UsersRound, tone: 'blue' },
              { label: 'Active', value: usersQuery.data?.summary?.active_users ?? '—', copy: 'Ready to sign in', icon: UserCheck, tone: 'green' },
              { label: 'Suspended / locked', value: usersQuery.data?.summary?.suspended_users ?? '—', copy: 'Access currently blocked', icon: ShieldQuestion, tone: 'amber' },
              { label: 'Active sessions', value: usersQuery.data?.summary?.active_sessions ?? '—', copy: 'Live server-side sessions', icon: Zap, tone: 'purple' },
            ].map((card) => { const Icon = card.icon; return <div className={`um-stat-card um-stat-card--${card.tone}`} key={card.label}><div className="um-stat-card__icon"><Icon size={18} /></div><div><strong>{card.value}</strong><span>{card.label}</span><small>{card.copy}</small></div></div> })}
            <div className="um-stat-card um-stat-card--amber"><div className="um-stat-card__icon"><Clock3 size={18} /></div><div><strong>{usersQuery.data?.summary?.pending_invitations ?? '—'}</strong><span>Pending invitations</span><small>Awaiting first sign-in</small></div></div>
          </div>

          <div className="um-toolbar">
            <div className="um-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, username, or employee ID" aria-label="Search users" /></div>
            <div className="um-filter-row">
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter by role"><option value="">All roles</option>{roles.map((role) => <option key={role.id} value={role.name}>{role.name}</option>)}</select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="">All statuses</option><option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option><option value="locked">Locked</option></select>
              <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort users"><option value="newest">Newest first</option><option value="name">Name A–Z</option><option value="last_login">Last sign-in</option><option value="role">Role</option></select>
              {(search || roleFilter || statusFilter || sort !== 'newest') && <button className="um-reset" onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); setSort('newest') }}>Reset filters</button>}
            </div>
          </div>

          {usersQuery.data && usersQuery.data.total > pageSize && <div className="um-pagination"><span>Page {page} of {Math.ceil(usersQuery.data.total / pageSize)}</span><div><button className="um-button um-button--secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><button className="um-button um-button--secondary" disabled={page >= Math.ceil(usersQuery.data.total / pageSize)} onClick={() => setPage((current) => Math.min(Math.ceil(usersQuery.data.total / pageSize), current + 1))}>Next</button></div><label>Rows <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></label></div>}

          {usersQuery.isLoading ? <LoadingState label="Loading user directory…" /> : usersQuery.isError ? <ErrorState message={getErrorMessage(usersQuery.error)} onRetry={() => usersQuery.refetch()} /> : users.length === 0 ? <EmptyState icon={CircleUserRound} title={search || roleFilter || statusFilter ? 'No matching users' : 'No users yet'} copy={search || roleFilter || statusFilter ? 'Try a different filter or clear the search.' : 'Create the first team member account to begin.'} action={can('users.create') && <button className="um-button um-button--primary" onClick={openCreateUser}><UserPlus size={15} /> Add first user</button>} /> : (
            <div className="um-table-card">
              <div className="um-table-wrap">
                <table className="um-table"><thead><tr><th>User</th><th>Role</th><th>Department</th><th>Status</th><th>Last sign-in</th><th>Sessions</th><th aria-label="Actions" /></tr></thead>
                  <tbody>{users.map((item) => <tr key={item.id}>
                    <td><div className="um-user-cell"><div className="um-avatar">{initials(item)}</div><div><strong>{item.display_name || item.name}</strong><span>{item.email}</span><small>{item.employee_id || item.username || 'No employee ID'}</small></div></div></td>
                    <td><span className="um-role-pill">{item.role_name || item.role}</span></td>
                    <td><span className="um-muted-value">{item.department || '—'}</span></td>
                    <td><StatusBadge status={item.status} /></td>
                    <td><span className="um-date-value">{formatDate(item.last_login_at)}</span></td>
                    <td><span className="um-session-count"><span>{item.active_sessions ?? 0}</span> active</span></td>
                    <td className="um-actions-cell"><button className="um-icon-button" aria-label={`Actions for ${item.display_name || item.name}`} onClick={() => setOpenActionUserId(openActionUserId === item.id ? null : item.id)}><MoreHorizontal size={18} /></button>{openActionUserId === item.id && <div className="um-action-menu">
                      <button onClick={() => { setDetailUserId(item.id); setOpenActionUserId(null) }}><CircleUserRound size={14} /> View profile</button>
                      {can('users.edit') && <button onClick={() => openEditUser(item)}><Edit3 size={14} /> Edit profile</button>}
                      {can('permissions.manage') && <button onClick={() => openPermissionEditor(item)}><ShieldCheck size={14} /> Permissions</button>}
                      {can('users.reset_password') && <button onClick={() => { setResetUser(item); setResetPassword(null); setOpenActionUserId(null) }}><KeyRound size={14} /> Reset password</button>}
                      {can('users.edit') && item.status === 'pending' && <button onClick={() => sendInvitation(item)}><RefreshCw size={14} /> Resend invitation</button>}
                      {can('users.revoke_sessions') && <button onClick={() => requestUserAction(item, 'sessions')}><RefreshCw size={14} /> Revoke sessions</button>}
                      {item.status === 'active' && can('users.suspend') && <button className="is-danger" onClick={() => requestUserAction(item, 'suspend')}><LockKeyhole size={14} /> Suspend</button>}
                      {item.status !== 'active' && can('users.activate') && <button onClick={() => requestUserAction(item, 'activate')}><UserCheck size={14} /> Activate</button>}
                      {can('users.delete') && <button className="is-danger" onClick={() => requestUserAction(item, 'delete')}><Trash2 size={14} /> Soft-delete</button>}
                    </div>}</td>
                  </tr>)}</tbody>
                </table>
              </div>
              <div className="um-mobile-list">{users.map((item) => <article className="um-mobile-user" key={item.id}><div className="um-user-cell"><div className="um-avatar">{initials(item)}</div><div><strong>{item.display_name || item.name}</strong><span>{item.email}</span></div></div><div className="um-mobile-user__meta"><span className="um-role-pill">{item.role_name || item.role}</span><StatusBadge status={item.status} /><span>{item.department || 'No department'}</span></div><div className="um-mobile-user__footer"><span>Last sign-in: {formatDate(item.last_login_at, 'Never')}</span><button className="um-button um-button--ghost" onClick={() => setDetailUserId(item.id)}>View details</button></div></article>)}</div>
              <div className="um-table-footer"><span>Showing {users.length} of {usersQuery.data?.total ?? users.length} users</span><span>All changes are recorded in the audit trail.</span></div>
            </div>
          )}
        </>
      )}

      {activeTab === 'roles' && <section className="um-section-stack"><div className="um-section-intro"><div><span className="um-eyebrow">Authorization model</span><h2>Roles & permissions</h2><p>Use roles for predictable access and permission overrides only for carefully reviewed exceptions.</p></div><div className="um-info-chip"><ShieldCheck size={15} /> Backend-enforced access</div></div>{rolesQuery.isLoading || permissionsQuery.isLoading ? <LoadingState label="Loading access model…" /> : rolesQuery.isError || permissionsQuery.isError ? <ErrorState message={getErrorMessage(rolesQuery.error || permissionsQuery.error)} onRetry={() => { rolesQuery.refetch(); permissionsQuery.refetch() }} /> : <><div className="um-role-grid">{roles.map((role) => <article className={`um-role-card ${role.name === 'Super Admin' ? 'is-owner' : ''}`} key={role.id}><div className="um-role-card__top"><div className="um-role-symbol"><ShieldCheck size={18} /></div><div className="um-role-card__actions"><span className={role.is_system_role ? 'um-role-type' : 'um-role-type um-role-type--custom'}>{role.is_system_role ? 'Built-in' : 'Custom'}</span>{(can('roles.edit') || can('roles.delete')) && <button className="um-icon-button" aria-label={`Edit ${role.name}`} onClick={() => openRoleEditor(role)}><MoreHorizontal size={16} /></button>}</div></div><h3>{role.name}</h3><p>{role.description || 'Custom access profile for your organization.'}</p><div className="um-role-card__metrics"><span><strong>{role.user_count}</strong> users</span><span><strong>{role.permission_count}</strong> permissions</span></div><div className="um-role-card__footer"><span>{role.name === 'Super Admin' ? 'Protected ownership role' : 'Review access before assignment'}</span>{role.is_system_role && <LockKeyhole size={13} />}</div>{can('roles.delete') && !role.is_system_role && <button className="um-text-danger" onClick={() => setConfirm({ title: 'Delete custom role?', message: `The ${role.name} role will be deleted. Users must be reassigned first.`, label: 'Delete role', danger: true, run: async () => { await userManagementApi.deleteRole(role.id); queryClient.invalidateQueries({ queryKey: ['management-roles'] }) } })}><Trash2 size={13} /> Delete role</button>}</article>)}</div><div className="um-permission-overview"><div className="um-subsection-heading"><div><span className="um-eyebrow">Permission catalog</span><h3>Available capabilities</h3></div><span>{permissions.length} granular permissions</span></div><div className="um-permission-groups">{Object.entries(permissionGroups).map(([module, entries]) => <div className="um-permission-group" key={module}><strong>{module}</strong>{entries.map((permission) => <span key={permission.key}><Check size={13} />{permission.action.replaceAll('_', ' ')}<small>{permission.description}</small></span>)}</div>)}</div></div></>}</section>}

      {activeTab === 'login-activity' && <section className="um-section-stack"><div className="um-section-intro"><div><span className="um-eyebrow">Security monitoring</span><h2>Login activity</h2><p>Review successful, failed, and locked sign-in attempts without exposing credentials or tokens.</p></div><div className="um-filter-row"><select value={loginResult} onChange={(event) => setLoginResult(event.target.value)}><option value="">All results</option><option value="Successful">Successful</option><option value="Failed">Failed</option><option value="Locked">Locked</option></select><label className="um-check-label"><input type="checkbox" checked={failedOnly} onChange={(event) => setFailedOnly(event.target.checked)} /> Failures only</label></div></div>{activityQuery.isLoading ? <LoadingState label="Loading login activity…" /> : activityQuery.isError ? <ErrorState message={getErrorMessage(activityQuery.error)} onRetry={() => activityQuery.refetch()} /> : activities.length === 0 ? <EmptyState icon={Activity} title="No login activity found" copy="New sign-in attempts will appear here as the team uses the application." /> : <div className="um-table-card"><div className="um-table-wrap"><table className="um-table um-table--activity"><thead><tr><th>Time</th><th>User / email</th><th>Result</th><th>Device</th><th>IP address</th><th>Reason</th></tr></thead><tbody>{activities.map((entry) => <tr key={entry.id}><td><span className="um-date-value">{formatDate(entry.created_at)}</span></td><td><strong>{entry.user_name || 'Unknown account'}</strong><span className="um-table-secondary">{entry.email_attempted || '—'}</span></td><td><span className={`um-result-pill um-result-pill--${entry.result.toLowerCase()}`}>{entry.result}</span></td><td><span>{entry.browser || 'Unknown browser'}</span><span className="um-table-secondary">{entry.operating_system || entry.device || 'Unknown device'}</span></td><td><span className="um-code-value">{entry.ip_address || 'Not available'}</span></td><td><span className="um-muted-value">{entry.failure_reason || 'Successful authentication'}</span></td></tr>)}</tbody></table></div><div className="um-table-footer"><span>{activityQuery.data?.total ?? activities.length} recorded sign-in attempts</span><span>Passwords, hashes, and bearer tokens are never written to this log.</span></div></div>}</section>}

      {activeTab === 'sessions' && <section className="um-section-stack"><div className="um-section-intro"><div><span className="um-eyebrow">Session security</span><h2>Active sessions</h2><p>Revoke individual sessions or sign out every device when an account is compromised.</p></div><div className="um-info-chip"><Server size={15} /> Server-side session registry</div></div>{sessionsQuery.isLoading ? <LoadingState label="Loading active sessions…" /> : sessionsQuery.isError ? <ErrorState message={getErrorMessage(sessionsQuery.error)} onRetry={() => sessionsQuery.refetch()} /> : sessions.length === 0 ? <EmptyState icon={Laptop} title="No active sessions" copy="There are no sessions matching the current security policy." /> : <div className="um-table-card"><div className="um-table-wrap"><table className="um-table"><thead><tr><th>Account</th><th>Device</th><th>Location / IP</th><th>Last active</th><th>Expires</th><th>State</th><th /></tr></thead><tbody>{sessions.map((session) => <tr key={session.id}><td><div className="um-user-cell"><div className="um-avatar um-avatar--small">{initials({ display_name: session.user_name || session.username || 'User' })}</div><div><strong>{session.user_name || 'Current account'}</strong><span>{session.username || '—'}</span></div></div></td><td><span className="um-device-value"><Smartphone size={14} />{session.browser || session.device || 'Browser'}</span><span className="um-table-secondary">{session.operating_system || 'Unknown OS'}</span></td><td><span className="um-code-value">{session.ip_address || 'Not available'}</span><span className="um-table-secondary">{session.approximate_location || 'Location unavailable'}</span></td><td><span className="um-date-value">{formatDate(session.last_active_at)}</span></td><td><span className="um-date-value">{formatDate(session.expires_at)}</span></td><td>{session.is_current ? <span className="um-current-pill"><span />Current session</span> : <span className="um-muted-value">Active</span>}</td><td>{can('security.manage_sessions') && <button className="um-icon-button um-icon-button--danger" aria-label="Revoke session" onClick={() => setConfirm({ title: 'Revoke this session?', message: `The ${session.browser || 'browser'} session will be signed out immediately.`, label: 'Revoke session', danger: true, run: async () => { await userManagementApi.revokeSession(session.id) } })}><X size={15} /></button>}</td></tr>)}</tbody></table></div><div className="um-table-footer"><span>{sessions.length} active session{sessions.length === 1 ? '' : 's'}</span>{can('security.manage_sessions') && <button className="um-button um-button--danger-soft" onClick={() => setConfirm({ title: 'Revoke all active sessions?', message: 'Every active session in the organization will be signed out. You will need to log in again.', label: 'Revoke all sessions', danger: true, run: async () => { await userManagementApi.revokeAllSessions(storedUser.id, false) } })}><RefreshCw size={14} /> Revoke all sessions</button>}</div></div>}</section>}

      {activeTab === 'security' && <section className="um-section-stack"><div className="um-section-intro"><div><span className="um-eyebrow">Policy controls</span><h2>Security settings</h2><p>Set password, lockout, session, invitation, and notification rules for the entire workspace.</p></div><div className="um-info-chip"><LockKeyhole size={15} /> Changes are audited</div></div>{securityQuery.isLoading ? <LoadingState label="Loading security policy…" /> : securityQuery.isError ? <ErrorState message={getErrorMessage(securityQuery.error)} onRetry={() => securityQuery.refetch()} /> : <div className="um-security-layout"><div className="um-security-card"><div className="um-subsection-heading"><div><span className="um-eyebrow">Password protection</span><h3>Credential policy</h3></div><KeyRound size={19} /></div><div className="um-form-grid um-form-grid--three"><label><span>Minimum length</span><input type="number" min={8} max={128} value={securityForm.minimum_password_length} onChange={(event) => setSecurityForm({ ...securityForm, minimum_password_length: Number(event.target.value) })} /></label><label><span>Password history</span><input type="number" min={0} max={20} value={securityForm.password_history_count} onChange={(event) => setSecurityForm({ ...securityForm, password_history_count: Number(event.target.value) })} /></label><label><span>Expiration days</span><input type="number" min={0} max={3650} value={securityForm.password_expiration_days} onChange={(event) => setSecurityForm({ ...securityForm, password_expiration_days: Number(event.target.value) })} /></label></div><div className="um-toggle-grid">{([['require_uppercase', 'Uppercase letter'], ['require_lowercase', 'Lowercase letter'], ['require_number', 'Number'], ['require_special', 'Special character']] as const).map(([key, label]) => <label className="um-toggle" key={key}><input type="checkbox" checked={securityForm[key]} onChange={(event) => setSecurityForm({ ...securityForm, [key]: event.target.checked })} /><span className="um-toggle__visual" /><span>{label}</span></label>)}</div></div><div className="um-security-card"><div className="um-subsection-heading"><div><span className="um-eyebrow">Sign-in protection</span><h3>Lockout & sessions</h3></div><ShieldCheck size={19} /></div><div className="um-form-grid um-form-grid--two"><label><span>Failed attempts before lock</span><input type="number" min={3} max={20} value={securityForm.failed_login_limit} onChange={(event) => setSecurityForm({ ...securityForm, failed_login_limit: Number(event.target.value) })} /></label><label><span>Lock duration (minutes)</span><input type="number" min={1} max={1440} value={securityForm.lock_duration_minutes} onChange={(event) => setSecurityForm({ ...securityForm, lock_duration_minutes: Number(event.target.value) })} /></label><label><span>Session timeout (minutes)</span><input type="number" min={15} max={43200} value={securityForm.session_timeout_minutes} onChange={(event) => setSecurityForm({ ...securityForm, session_timeout_minutes: Number(event.target.value) })} /></label><label><span>Reset link lifetime (minutes)</span><input type="number" min={5} max={1440} value={securityForm.password_reset_expiration_minutes} onChange={(event) => setSecurityForm({ ...securityForm, password_reset_expiration_minutes: Number(event.target.value) })} /></label></div><div className="um-toggle-grid"><label className="um-toggle"><input type="checkbox" checked={securityForm.allow_multiple_sessions} onChange={(event) => setSecurityForm({ ...securityForm, allow_multiple_sessions: event.target.checked })} /><span className="um-toggle__visual" /><span>Allow multiple sessions per user</span></label><label className="um-toggle"><input type="checkbox" checked={securityForm.require_two_factor} onChange={(event) => setSecurityForm({ ...securityForm, require_two_factor: event.target.checked })} /><span className="um-toggle__visual" /><span>Require two-factor authentication</span></label><label className="um-toggle"><input type="checkbox" checked={securityForm.require_password_change_on_first_login} onChange={(event) => setSecurityForm({ ...securityForm, require_password_change_on_first_login: event.target.checked })} /><span className="um-toggle__visual" /><span>Require password change on first login</span></label></div></div><div className="um-security-card um-security-card--wide"><div className="um-subsection-heading"><div><span className="um-eyebrow">Account lifecycle</span><h3>Invitations & notifications</h3></div><Network size={19} /></div><div className="um-form-grid um-form-grid--three"><label><span>Invitation expires (hours)</span><input type="number" min={1} max={720} value={securityForm.invitation_expiration_hours} onChange={(event) => setSecurityForm({ ...securityForm, invitation_expiration_hours: Number(event.target.value) })} /></label></div><div className="um-toggle-grid"><label className="um-toggle"><input type="checkbox" checked={securityForm.login_notification} onChange={(event) => setSecurityForm({ ...securityForm, login_notification: event.target.checked })} /><span className="um-toggle__visual" /><span>Notify on successful login</span></label><label className="um-toggle"><input type="checkbox" checked={securityForm.new_device_notification} onChange={(event) => setSecurityForm({ ...securityForm, new_device_notification: event.target.checked })} /><span className="um-toggle__visual" /><span>Notify on a new device</span></label></div></div><div className="um-security-save"><div><strong>Review before saving</strong><span>Weakening a policy requires an explicit confirmation and is written to the audit trail.</span></div>{securityConfirm && <div className="um-security-warning"><AlertCircle size={15} /> This change reduces protection. Click save again to confirm.</div>}<button className="um-button um-button--primary" disabled={saveSecurityMutation.isPending} onClick={() => saveSecurityMutation.mutate(securityConfirm)}>{saveSecurityMutation.isPending ? 'Saving…' : securityConfirm ? 'Confirm & save' : 'Save security policy'}</button></div></div>}</section>}

      {userModal && <Modal title={userModal.mode === 'create' ? 'Add team member' : 'Edit user profile'} eyebrow={userModal.mode === 'create' ? 'New account' : 'Account profile'} onClose={() => setUserModal(null)} wide><form className="um-form" onSubmit={(event) => { event.preventDefault(); saveUserMutation.mutate() }}><div className="um-form-section"><div className="um-form-section__heading"><div><h3>Identity</h3><span>Use the person’s real work identity for reliable audit history.</span></div><CircleUserRound size={19} /></div><div className="um-form-grid um-form-grid--two"><label><span>First name *</span><input required value={userForm.first_name} onChange={(event) => setUserForm({ ...userForm, first_name: event.target.value })} /></label><label><span>Last name *</span><input required value={userForm.last_name} onChange={(event) => setUserForm({ ...userForm, last_name: event.target.value })} /></label><label><span>Display name</span><input value={userForm.display_name} onChange={(event) => setUserForm({ ...userForm, display_name: event.target.value })} placeholder="Defaults to first and last name" /></label><label><span>Work email *</span><input required type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} /></label><label><span>Username</span><input minLength={3} value={userForm.username} onChange={(event) => setUserForm({ ...userForm, username: event.target.value })} placeholder="Optional sign-in alias" /></label><label><span>Phone</span><input value={userForm.phone} onChange={(event) => setUserForm({ ...userForm, phone: event.target.value })} /></label></div></div><div className="um-form-section"><div className="um-form-section__heading"><div><h3>Organization</h3><span>Role assignment is checked again by the backend before it is saved.</span></div><ShieldCheck size={19} /></div><div className="um-form-grid um-form-grid--two"><label><span>Employee ID</span><input value={userForm.employee_id} onChange={(event) => setUserForm({ ...userForm, employee_id: event.target.value })} /></label><label><span>Job title</span><input value={userForm.job_title} onChange={(event) => setUserForm({ ...userForm, job_title: event.target.value })} /></label><label><span>Department</span><input value={userForm.department} onChange={(event) => setUserForm({ ...userForm, department: event.target.value })} /></label><label><span>Role *</span><select required value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}>{roles.map((role) => <option key={role.id} value={role.name}>{role.name}</option>)}</select></label><label><span>Status</span><select value={userForm.status} onChange={(event) => setUserForm({ ...userForm, status: event.target.value })}><option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option></select></label><label><span>Timezone</span><select value={userForm.timezone} onChange={(event) => setUserForm({ ...userForm, timezone: event.target.value })}><option value="Asia/Kabul">Asia / Kabul</option><option value="UTC">UTC</option><option value="Asia/Dubai">Asia / Dubai</option></select></label></div><label className="um-check-label"><input type="checkbox" checked={userForm.require_password_change} onChange={(event) => setUserForm({ ...userForm, require_password_change: event.target.checked })} /> Require a password change on next sign-in</label></div>{createdPassword && <div className="um-secret-panel"><div><CheckCircle2 size={20} /><div><strong>One-time temporary password</strong><span>Share this securely. It will not be shown again after this dialog closes.</span></div></div><div className="um-secret-value"><code>{createdPassword}</code><button type="button" className="um-button um-button--secondary" onClick={() => navigator.clipboard?.writeText(createdPassword)}><Copy size={14} /> Copy</button></div></div>}<div className="um-modal__footer"><button type="button" className="um-button um-button--ghost" onClick={() => setUserModal(null)}>Cancel</button>{!createdPassword && <button type="submit" className="um-button um-button--primary" disabled={saveUserMutation.isPending}>{saveUserMutation.isPending ? 'Saving…' : userModal.mode === 'create' ? 'Create account' : 'Save changes'}</button>}{createdPassword && <button type="button" className="um-button um-button--primary" onClick={() => setUserModal(null)}>Done</button>}</div>{saveUserMutation.isError && <div className="um-inline-error"><AlertCircle size={14} /> {getErrorMessage(saveUserMutation.error)}</div>}</form></Modal>}

      {resetUser && <Modal title={resetPassword ? 'Temporary password ready' : 'Reset user password'} eyebrow="Credential recovery" onClose={() => setResetUser(null)}><div className="um-reset-copy"><div className="um-warning-icon"><KeyRound size={20} /></div><div><strong>{resetUser.display_name || resetUser.name}</strong><p>{resetPassword ? 'Give this temporary password to the user through a trusted channel. The account will require a password change.' : 'A new password will invalidate the user’s active sessions and require a new sign-in.'}</p></div></div>{resetPassword ? <div className="um-secret-panel"><div><CheckCircle2 size={20} /><div><strong>One-time temporary password</strong><span>It will disappear when this dialog closes.</span></div></div><div className="um-secret-value"><code>{resetPassword}</code><button className="um-button um-button--secondary" onClick={() => navigator.clipboard?.writeText(resetPassword)}><Copy size={14} /> Copy</button></div></div> : <label className="um-check-label"><input type="checkbox" checked={resetRequireChange} onChange={(event) => setResetRequireChange(event.target.checked)} /> Require a password change on next sign-in</label>}<div className="um-modal__footer"><button className="um-button um-button--ghost" onClick={() => setResetUser(null)}>Close</button>{!resetPassword && <button className="um-button um-button--primary" disabled={resetPasswordMutation.isPending} onClick={() => resetPasswordMutation.mutate()}>{resetPasswordMutation.isPending ? 'Generating…' : 'Generate temporary password'}</button>}</div>{resetPasswordMutation.isError && <div className="um-inline-error"><AlertCircle size={14} /> {getErrorMessage(resetPasswordMutation.error)}</div>}</Modal>}

      {permissionUser && <Modal title={`Permissions · ${permissionUser.display_name || permissionUser.name}`} eyebrow="User override" onClose={() => setPermissionUser(null)} wide>{permissionLoading ? <LoadingState label="Loading effective permissions…" /> : <><p className="um-modal-lead">These are effective permissions for this account. Saving creates explicit allowed overrides; the role remains the source of default access.</p><div className="um-permission-editor">{Object.entries(permissionGroups).map(([module, entries]) => <div className="um-permission-editor__group" key={module}><div className="um-permission-editor__heading"><strong>{module}</strong><span>{entries.filter((entry) => permissionDraft.includes(entry.key)).length}/{entries.length} selected</span></div>{entries.map((permission) => <label key={permission.key} className="um-permission-row"><input type="checkbox" checked={permissionDraft.includes(permission.key)} onChange={(event) => toggleUserPermission(permission.key, event.target.checked)} /><span><strong>{permission.action.replaceAll('_', ' ')}</strong><small>{permission.description}</small></span></label>)}</div>)}</div><div className="um-modal__footer"><button className="um-button um-button--ghost" onClick={() => setPermissionUser(null)}>Cancel</button><button className="um-button um-button--primary" disabled={savePermissionMutation.isPending} onClick={() => savePermissionMutation.mutate()}>{savePermissionMutation.isPending ? 'Saving…' : 'Save permission overrides'}</button></div>{savePermissionMutation.isError && <div className="um-inline-error"><AlertCircle size={14} /> {getErrorMessage(savePermissionMutation.error)}</div>}</>}</Modal>}

      {roleModal && <Modal title={roleModal === 'new' ? 'Create custom role' : `Edit ${roleForm.name}`} eyebrow="Role designer" onClose={() => setRoleModal(null)} wide><form className="um-form" onSubmit={(event) => { event.preventDefault(); saveRoleMutation.mutate() }}><div className="um-form-grid um-form-grid--two"><label><span>Role name *</span><input required disabled={roleModal !== 'new' && (roleModal as RoleDefinition).is_system_role} value={roleForm.name} onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })} /></label><label><span>Description</span><input value={roleForm.description} onChange={(event) => setRoleForm({ ...roleForm, description: event.target.value })} placeholder="What is this role for?" /></label></div><div className="um-permission-editor"><div className="um-modal-lead"><strong>Permission matrix</strong><span>{roleForm.permissions.length} capabilities selected</span></div>{Object.entries(permissionGroups).map(([module, entries]) => { const allSelected = entries.every((entry) => roleForm.permissions.includes(entry.key)); return <div className="um-permission-editor__group" key={module}><div className="um-permission-editor__heading"><strong>{module}</strong><button type="button" className="um-reset" disabled={roleForm.name === 'Super Admin'} onClick={() => entries.forEach((entry) => togglePermission(entry.key, !allSelected))}>{allSelected ? 'Clear all' : 'Select all'}</button></div>{entries.map((permission) => <label key={permission.key} className="um-permission-row"><input type="checkbox" disabled={roleForm.name === 'Super Admin'} checked={roleForm.permissions.includes(permission.key)} onChange={(event) => togglePermission(permission.key, event.target.checked)} /><span><strong>{permission.action.replaceAll('_', ' ')}</strong><small>{permission.description}</small></span></label>)}</div>})}</div><div className="um-modal__footer"><button type="button" className="um-button um-button--ghost" onClick={() => setRoleModal(null)}>Cancel</button><button type="submit" className="um-button um-button--primary" disabled={saveRoleMutation.isPending}>{saveRoleMutation.isPending ? 'Saving…' : 'Save role'}</button></div>{saveRoleMutation.isError && <div className="um-inline-error"><AlertCircle size={14} /> {getErrorMessage(saveRoleMutation.error)}</div>}</form></Modal>}

      {detailUserId && <Modal title={detailUser ? detailUser.display_name || detailUser.name : 'User profile'} eyebrow="Account details" onClose={() => setDetailUserId(null)} wide>{detailQuery.isLoading ? <LoadingState label="Loading user profile…" /> : detailQuery.isError ? <ErrorState message={getErrorMessage(detailQuery.error)} onRetry={() => detailQuery.refetch()} /> : detailUser ? <div className="um-detail-layout"><div className="um-detail-hero"><div className="um-avatar um-avatar--large">{initials(detailUser)}</div><div><span className="um-eyebrow">{detailUser.role_name || detailUser.role}</span><h3>{detailUser.display_name || detailUser.name}</h3><p>{detailUser.email} · @{detailUser.username || 'no username'}</p></div><StatusBadge status={detailUser.status} /></div><div className="um-detail-grid">{[['Employee ID', detailUser.employee_id || 'Not assigned'], ['Department', detailUser.department || 'Not assigned'], ['Job title', detailUser.job_title || 'Not assigned'], ['Phone', detailUser.phone || 'Not provided'], ['Created', formatDate(detailUser.created_at)], ['Last sign-in', formatDate(detailUser.last_login_at)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="um-detail-section"><div className="um-subsection-heading"><div><span className="um-eyebrow">Session history</span><h3>Recent sessions</h3></div><span>{detailUser.sessions?.length || 0} records</span></div>{detailUser.sessions?.length ? <div className="um-mini-list">{detailUser.sessions.slice(0, 6).map((session) => <div key={session.id}><div><strong>{session.browser || session.device || 'Browser'} {session.is_current && <span className="um-current-pill">Current</span>}</strong><span>{session.ip_address || 'IP unavailable'} · {formatDate(session.last_active_at)}</span></div><span className={session.revoked_at ? 'um-muted-value' : 'um-status um-status--active'}>{session.revoked_at ? 'Revoked' : 'Active'}</span></div>)}</div> : <span className="um-muted-value">No session history available.</span>}</div><div className="um-detail-section"><div className="um-subsection-heading"><div><span className="um-eyebrow">Audit history</span><h3>Recent account changes</h3></div></div>{detailUser.recent_audit?.length ? <div className="um-mini-list">{detailUser.recent_audit.slice(0, 8).map((log: any) => <div key={log.id}><div><strong>{log.action}</strong><span>{log.description}</span></div><span className="um-date-value">{formatDate(log.created_at)}</span></div>)}</div> : <span className="um-muted-value">No account-specific audit events yet.</span>}</div></div> : null}</Modal>}

      {confirm && <Modal title={confirm.title} eyebrow="Confirm security action" onClose={() => !confirmLoading && setConfirm(null)}><div className={`um-confirm ${confirm.danger ? 'um-confirm--danger' : ''}`}><div className="um-warning-icon"><AlertCircle size={21} /></div><p>{confirm.message}</p></div><div className="um-modal__footer"><button className="um-button um-button--ghost" disabled={confirmLoading} onClick={() => setConfirm(null)}>Cancel</button><button className={`um-button ${confirm.danger ? 'um-button--danger' : 'um-button--primary'}`} disabled={confirmLoading} onClick={executeConfirmation}>{confirmLoading ? 'Working…' : confirm.label}</button></div></Modal>}

      {toast && <div className={`um-toast um-toast--${toast.type}`} role="status">{toast.type === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}<span>{toast.message}</span><button onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={14} /></button></div>}
    </div>
  )
}

export default UserManagement
